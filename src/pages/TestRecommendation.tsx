import { useState, useCallback, useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { MovieCard } from "@/components/MovieCard";
import { filterOptions, type MovieRecommendation } from "@/mock/movies";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Search, Sparkles, AlertCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const apiCall = async (params: Record<string, string>, opts?: RequestInit) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/external-db?${query}`, {
    ...opts,
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Request failed");
  return data;
};

const textToInputVector = (text: string): number[] => {
  const vec = new Array(256).fill(0);
  const clean = text.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ\s0-9]/g, "");
  for (let i = 0; i < clean.length; i++) {
    vec[clean.charCodeAt(i) % 256] += 1;
  }
  const max = Math.max(...vec, 1);
  return vec.map(v => v / max);
};

let tfModel: any = null;

const buildModel = async (tf: any) => {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [256], units: 512, activation: "relu" }));
  model.add(tf.layers.dense({ units: 256, activation: "relu" }));
  model.add(tf.layers.dense({ units: 128, activation: "sigmoid" }));
  model.compile({ optimizer: "adam", loss: "meanSquaredError" });
  return model;
};

const TestRecommendation = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MovieRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const [typeFilter, setTypeFilter] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [toneFilter, setToneFilter] = useState("");
  const [durationFilter, setDurationFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, msg]);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setResults([]);
    setError(null);
    setLogs([]);

    try {
      const queryParts: string[] = [];
      if (typeFilter) queryParts.push(typeFilter);
      if (genreFilter) queryParts.push(genreFilter);
      if (toneFilter) queryParts.push(toneFilter);
      if (durationFilter) queryParts.push(durationFilter);
      if (countryFilter) queryParts.push(countryFilter);

      if (queryParts.length === 0) {
        setError("Selecione pelo menos um critério de busca.");
        setLoading(false);
        return;
      }

      const queryText = queryParts.join(" ");
      addLog(`Critérios selecionados: ${queryParts.join(", ")}`);
      addLog(`Texto de consulta gerado: "${queryText}"`);

      addLog("Inicializando TensorFlow.js...");
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      addLog(`✓ TensorFlow.js v${tf.version.tfjs} carregado (backend: ${tf.getBackend()})`);

      if (!tfModel) {
        addLog("Construindo rede neural: 256→512→256→128...");
        tfModel = await buildModel(tf);
        addLog("✓ Modelo sequential criado (3 camadas Dense)");
      } else {
        addLog("✓ Modelo reutilizado da sessão anterior");
      }

      addLog("Vetorizando texto de consulta (bag-of-characters 256-dim)...");
      const inputVec = textToInputVector(queryText);
      const nonZero = inputVec.filter(v => v > 0).length;
      addLog(`✓ Vetor de entrada gerado — ${nonZero} dimensões ativas de 256`);

      addLog("Gerando embedding de 128-dim via forward pass na rede neural...");
      const inputTensor = tf.tensor2d([inputVec], [1, 256]);
      const outputTensor = tfModel.predict(inputTensor) as any;
      const embedding = Array.from(await outputTensor.data()) as number[];
      inputTensor.dispose();
      outputTensor.dispose();

      const mag = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
      const queryEmbedding = mag > 0 ? embedding.map(v => v / mag) : embedding;
      addLog(`✓ Embedding normalizado (norma L2 = ${mag.toFixed(4)} → 1.0)`);
      addLog(`  Primeiros 5 valores: [${queryEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(", ")}...]`);

      addLog("Enviando embedding ao banco externo para cálculo de similaridade de cosseno...");
      addLog(`  Filtros SQL: ${typeFilter ? `type='${typeFilter}'` : "sem filtro de tipo"} | ${genreFilter ? `listed_in ILIKE '%${genreFilter}%'` : "sem filtro de gênero"}`);
      
      const t0 = performance.now();
      const data = await apiCall({ action: "recommend" }, {
        method: "POST",
        body: JSON.stringify({
          embedding: queryEmbedding,
          limit: 12,
          type_filter: typeFilter,
          genre_filter: genreFilter,
        }),
      });
      const elapsed = Math.round(performance.now() - t0);

      const recommendations: MovieRecommendation[] = (data.recommendations || []).map((r: any) => ({
        title: r.title || "Sem título",
        type: r.type || "Movie",
        year: 0,
        genre: r.listed_in || "N/A",
        similarity: parseFloat(r.similarity) || 0,
        description: r.description || "",
      }));

      addLog(`✓ Consulta concluída em ${elapsed}ms — ${recommendations.length} resultados retornados`);
      
      if (recommendations.length > 0) {
        addLog(`  🏆 Melhor match: "${recommendations[0].title}" (${Math.round(recommendations[0].similarity * 100)}%)`);
        addLog(`  📊 Faixa de similaridade: ${Math.round(recommendations[recommendations.length - 1].similarity * 100)}% — ${Math.round(recommendations[0].similarity * 100)}%`);
        addLog(`  📐 Média: ${Math.round((recommendations.reduce((s, r) => s + r.similarity, 0) / recommendations.length) * 100)}%`);
        recommendations.forEach((r, i) => {
          addLog(`  ${i + 1}. ${r.title} — ${Math.round(r.similarity * 100)}% (${r.genre})`);
        });
      }

      addLog("✓ Processo de recomendação finalizado com sucesso!");
      setResults(recommendations);
    } catch (err: any) {
      addLog(`✗ Erro: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, genreFilter, toneFilter, durationFilter, countryFilter, addLog]);

  const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
      >
        <option value="">Selecionar...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Testar Recomendação" subtitle="Configure seus critérios e gere recomendações com similaridade de cosseno" />
      <main className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 border border-border"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-foreground">Critérios de Busca</h2>
              <p className="text-xs text-muted-foreground">Os filtros são convertidos em embedding via TensorFlow.js e comparados por similaridade de cosseno</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <SelectField label="Tipo Preferido" value={typeFilter} onChange={setTypeFilter} options={filterOptions.types} />
            <SelectField label="Gênero" value={genreFilter} onChange={setGenreFilter} options={filterOptions.genres} />
            <SelectField label="Tom" value={toneFilter} onChange={setToneFilter} options={filterOptions.tones} />
            <SelectField label="Duração" value={durationFilter} onChange={setDurationFilter} options={filterOptions.durations} />
            <SelectField label="País" value={countryFilter} onChange={setCountryFilter} options={filterOptions.countries} />
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? "Processando..." : "Gerar Recomendações"}
          </button>
        </div>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 border border-destructive/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-destructive font-medium text-sm">{error}</span>
          </motion.div>
        )}

        {/* Logs */}
        <AnimatePresence>
          {logs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${loading ? "bg-primary animate-pulse" : "bg-success"}`} />
                <h3 className="font-display font-semibold text-foreground text-sm">Log do Processo de Recomendação</h3>
              </div>
              <div ref={logRef} className="p-4 max-h-60 overflow-y-auto scrollbar-thin font-mono text-xs space-y-1">
                {logs.map((log, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`py-0.5 ${log.startsWith("✓") ? "text-success" : log.startsWith("✗") ? "text-destructive" : log.startsWith("  🏆") || log.startsWith("  📊") || log.startsWith("  📐") ? "text-primary" : "text-muted-foreground"}`}>
                    <span className="text-primary/60 mr-2">[{new Date().toLocaleTimeString()}]</span>
                    {log}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <h2 className="font-display font-semibold text-foreground">
                  Resultados
                </h2>
                <span className="text-muted-foreground text-sm">
                  {results.length} filmes encontrados • ordenados por similaridade de cosseno
                </span>
              </div>

              {/* Accuracy summary */}
              <div className="glass-card p-4 border border-border">
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Maior similaridade: </span>
                    <span className="font-bold text-primary">{Math.round(results[0].similarity * 100)}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Menor: </span>
                    <span className="font-bold text-muted-foreground">{Math.round(results[results.length - 1].similarity * 100)}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Média: </span>
                    <span className="font-bold text-foreground">
                      {Math.round((results.reduce((s, r) => s + r.similarity, 0) / results.length) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((movie, i) => (
                  <MovieCard key={`${movie.title}-${i}`} movie={movie} index={i} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default TestRecommendation;
