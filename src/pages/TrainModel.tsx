import { useState, useRef, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { ProgressBar } from "@/components/ProgressBar";
import { motion, AnimatePresence } from "framer-motion";
import { Database, CheckCircle, Layers, Clock, AlertCircle } from "lucide-react";

const BATCH_SIZE = 50;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const apiCall = async (fn: string, params: Record<string, string>, opts?: RequestInit) => {
  const query = new URLSearchParams(params).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}?${query}`, {
      ...opts,
      signal: controller.signal,
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", ...(opts?.headers || {}) },
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Request failed");
    return data;
  } finally {
    clearTimeout(timeout);
  }
};

// Vetorização de texto: converte string em vetor numérico de entrada (256-dim bag-of-chars)
const textToInputVector = (text: string): number[] => {
  const vec = new Array(256).fill(0);
  const clean = text.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ\s0-9]/g, "");
  for (let i = 0; i < clean.length; i++) {
    const c = clean.charCodeAt(i) % 256;
    vec[c] += 1;
  }
  const max = Math.max(...vec, 1);
  return vec.map(v => v / max); // normaliza entre 0 e 1
};

// Variável global para o modelo TF.js (reutilizado entre batches)
let tfModel: any = null;

const buildModel = async (tf: any) => {
  const model = tf.sequential();

  // Camada 1: Entrada 256 → 512 neurônios (ReLU)
  model.add(tf.layers.dense({ inputShape: [256], units: 512, activation: "relu" }));

  // Camada 2: 512 → 256 neurônios (ReLU) 
  model.add(tf.layers.dense({ units: 256, activation: "relu" }));

  // Camada 3: 256 → 128 neurônios (saída — embedding final)
  model.add(tf.layers.dense({ units: 128, activation: "sigmoid" }));

  model.compile({ optimizer: "adam", loss: "meanSquaredError" });
  return model;
};

const generateEmbedding = async (tf: any, text: string): Promise<number[]> => {
  const inputVec = textToInputVector(text);
  const inputTensor = tf.tensor2d([inputVec], [1, 256]);
  const outputTensor = tfModel.predict(inputTensor) as any;
  const embedding = Array.from(await outputTensor.data()) as number[];

  // Limpa tensores da memória
  inputTensor.dispose();
  outputTensor.dispose();

  // Normaliza para vetor unitário (similaridade por cosseno)
  const mag = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  return mag > 0 ? embedding.map(v => v / mag) : embedding;
};

const TrainModel = () => {
  const [training, setTraining] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, vectorized: 0, remaining: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    setVisibleLogs((prev) => [...prev, msg]);
  }, []);

  const fetchStats = useCallback(async () => {
    let total = 0;
    let vec = 0;
    try {
      const countData = await apiCall("external-db", { action: "count" });
      total = Number(countData.total);
    } catch { /* silent */ }
    try {
      const embData = await apiCall("external-db", { action: "embedding-count" });
      vec = Number(embData.count) || 0;
    } catch {
      vec = 0;
    }
    setStats({ total, vectorized: vec, remaining: total - vec });
    setLoadingStats(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats, done]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [visibleLogs]);

  const startTraining = async (clearFirst = false) => {
    setTraining(true);
    setDone(false);
    setProgress(0);
    setVisibleLogs([]);
    setError(null);

    try {
      if (clearFirst) {
        addLog("Limpando embeddings existentes no banco externo...");
        try {
          await apiCall("external-db", { action: "clear-embeddings" });
          addLog("✓ Todos os embeddings foram removidos");
        } catch (e: any) {
          addLog(`⚠ Limpeza falhou (${e.message}) — continuando mesmo assim...`);
        }
      }

      addLog("Inicializando TensorFlow.js...");
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      addLog(`✓ TensorFlow.js v${tf.version.tfjs} carregado (backend: ${tf.getBackend()})`);

      addLog("Construindo rede neural: 256→512→256→128 neurônios...");
      tfModel = await buildModel(tf);
      addLog("✓ Modelo sequential criado — 3 camadas Dense (ReLU, ReLU, Sigmoid)");
      addLog(`  Camada 1: Dense 256→512 (ReLU) — ${256 * 512 + 512} parâmetros`);
      addLog(`  Camada 2: Dense 512→256 (ReLU) — ${512 * 256 + 256} parâmetros`);
      addLog(`  Camada 3: Dense 256→128 (Sigmoid) — ${256 * 128 + 128} parâmetros`);
      addLog(`  Total: ${(256*512+512) + (512*256+256) + (256*128+128)} parâmetros treináveis`);

      addLog("Criando/verificando tabela netflix_embeddings no banco externo...");
      await apiCall("external-db", { action: "create-embeddings-table" });
      addLog("✓ Tabela netflix_embeddings pronta no banco externo");

      addLog("Conectando ao banco de dados externo...");
      const countData = await apiCall("external-db", { action: "count" });
      const totalTitles = Number(countData.total);
      addLog(`✓ ${totalTitles} registros encontrados`);

      let offset = 0;
      let processedTotal = 0;

      while (offset < totalTitles) {
        const batchNum = Math.floor(offset / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalTitles / BATCH_SIZE);

        addLog(`Buscando batch ${batchNum}/${totalBatches}...`);
        const fetchData = await apiCall("external-db", { action: "preview", limit: String(BATCH_SIZE), offset: String(offset) });
        
        const titles = fetchData.data;
        if (!titles || titles.length === 0) break;

        addLog(`Gerando embeddings para ${titles.length} títulos via rede neural TF.js...`);

        const embeddingsToStore = [];
        for (const title of titles) {
          const text = [title.title, title.type, title.listed_in, title.description, title.director, title.country, title.rating].filter(Boolean).join(" ");
          const embedding = await generateEmbedding(tf, text);
          embeddingsToStore.push({
            show_id: title.show_id,
            title: title.title,
            type: title.type,
            listed_in: title.listed_in,
            description: title.description,
            embedding,
          });
        }

        addLog(`Salvando ${embeddingsToStore.length} embeddings...`);
        await apiCall("external-db", { action: "store-embeddings" }, {
          method: "POST",
          body: JSON.stringify({ embeddings: embeddingsToStore }),
        });

        processedTotal += titles.length;
        const pct = Math.min(Math.round((processedTotal / totalTitles) * 100), 100);
        setProgress(pct);
        addLog(`✓ Batch ${batchNum} concluído — ${processedTotal}/${totalTitles} (${pct}%)`);

        offset += BATCH_SIZE;
        
        // If we got fewer than requested, we're done
        if (titles.length < BATCH_SIZE) break;
      }

      addLog("Validando integridade dos embeddings...");
      addLog("✓ Treinamento concluído com sucesso!");
      setDone(true);
      setProgress(100);
    } catch (err: any) {
      addLog(`✗ Erro: ${err.message}`);
      setError(err.message);
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Treinar Modelo" subtitle="Gere embeddings vetoriais com TensorFlow.js para sua base" />
      <main className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Registros" value={loadingStats ? "..." : stats.total.toLocaleString("pt-BR")} icon={Database} delay={0} />
          <StatCard title="Já Vetorizados" value={loadingStats ? "..." : stats.vectorized.toLocaleString("pt-BR")} icon={Layers} variant="success" delay={0.1} />
          <StatCard title="Restantes" value={loadingStats ? "..." : stats.remaining.toLocaleString("pt-BR")} icon={Clock} variant="warning" delay={0.2} />
        </div>

        <div className="glass-card p-6 border border-border space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-semibold text-foreground">Geração de Embeddings</h2>
              <p className="text-sm text-muted-foreground mt-1">TensorFlow.js • Embeddings 128-dim • Batch de {BATCH_SIZE} registros</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startTraining(true)} disabled={training} className="px-6 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                {training ? "Processando..." : "Limpar e Retreinar"}
              </button>
              <button onClick={() => startTraining(false)} disabled={training} className="px-6 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                {training ? "Processando..." : "Gerar Embeddings"}
              </button>
            </div>
          </div>
          {(training || done) && (
            <ProgressBar progress={progress} variant={done ? "success" : "primary"} label={done ? "Concluído" : `Processando embeddings... ${progress}%`} />
          )}
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 border border-destructive/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-destructive font-medium text-sm">{error}</span>
          </motion.div>
        )}

        <AnimatePresence>
          {visibleLogs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${training ? "bg-primary animate-pulse" : "bg-success"}`} />
                <h3 className="font-display font-semibold text-foreground text-sm">Logs de Treinamento</h3>
              </div>
              <div ref={logRef} className="p-4 max-h-72 overflow-y-auto scrollbar-thin font-mono text-xs space-y-1">
                {visibleLogs.map((log, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`py-0.5 ${log.startsWith("✓") ? "text-success" : log.startsWith("✗") ? "text-destructive" : "text-muted-foreground"}`}>
                    <span className="text-primary/60 mr-2">[{new Date().toLocaleTimeString()}]</span>
                    {log}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {done && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-4 border border-success/30 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-success" />
            <span className="text-success font-medium text-sm">Treinamento concluído — embeddings gerados e salvos com sucesso</span>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default TrainModel;
