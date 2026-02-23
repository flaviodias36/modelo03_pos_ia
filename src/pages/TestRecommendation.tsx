import { useState, useCallback } from "react";
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

// Same vectorization used in training — must match exactly
const textToInputVector = (text: string): number[] => {
  const vec = new Array(256).fill(0);
  const clean = text.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ\s0-9]/g, "");
  for (let i = 0; i < clean.length; i++) {
    vec[clean.charCodeAt(i) % 256] += 1;
  }
  const max = Math.max(...vec, 1);
  return vec.map(v => v / max);
};

// TF.js model for embedding generation (same architecture as training)
let tfModel: any = null;

const buildModel = async (tf: any) => {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [256], units: 512, activation: "relu" }));
  model.add(tf.layers.dense({ units: 256, activation: "relu" }));
  model.add(tf.layers.dense({ units: 128, activation: "sigmoid" }));
  model.compile({ optimizer: "adam", loss: "meanSquaredError" });
  return model;
};

const generateQueryEmbedding = async (text: string): Promise<number[]> => {
  const tf = await import("@tensorflow/tfjs");
  await tf.ready();
  if (!tfModel) tfModel = await buildModel(tf);

  const inputVec = textToInputVector(text);
  const inputTensor = tf.tensor2d([inputVec], [1, 256]);
  const outputTensor = tfModel.predict(inputTensor) as any;
  const embedding = Array.from(await outputTensor.data()) as number[];
  inputTensor.dispose();
  outputTensor.dispose();

  const mag = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  return mag > 0 ? embedding.map(v => v / mag) : embedding;
};

const TestRecommendation = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MovieRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState("");

  // Filter state
  const [typeFilter, setTypeFilter] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [toneFilter, setToneFilter] = useState("");
  const [durationFilter, setDurationFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setResults([]);
    setError(null);

    try {
      // Build a text query from the selected filters
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

      setProcessingStep("Carregando TensorFlow.js e gerando embedding da consulta...");
      const queryEmbedding = await generateQueryEmbedding(queryText);

      setProcessingStep("Calculando similaridade de cosseno contra todos os vetores do banco...");
      const data = await apiCall({ action: "recommend" }, {
        method: "POST",
        body: JSON.stringify({
          embedding: queryEmbedding,
          limit: 12,
          type_filter: typeFilter,
          genre_filter: genreFilter,
        }),
      });

      const recommendations: MovieRecommendation[] = (data.recommendations || []).map((r: any) => ({
        title: r.title || "Sem título",
        type: r.type || "Movie",
        year: 0,
        genre: r.listed_in || "N/A",
        similarity: parseFloat(r.similarity) || 0,
        description: r.description || "",
      }));

      setResults(recommendations);
      setProcessingStep("");
    } catch (err: any) {
      setError(err.message);
      setProcessingStep("");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, genreFilter, toneFilter, durationFilter, countryFilter]);

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
            {processingStep && (
              <span className="text-xs text-muted-foreground animate-pulse">{processingStep}</span>
            )}
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 border border-destructive/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-destructive font-medium text-sm">{error}</span>
          </motion.div>
        )}

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
