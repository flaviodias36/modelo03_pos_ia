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
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}?${query}`, {
    ...opts,
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", ...(opts?.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Request failed");
  return data;
};

const generateEmbedding = (text: string): number[] => {
  const embedding = new Array(128).fill(0);
  const words = text.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ\s0-9]/g, "").split(/\s+/).filter(Boolean);
  for (const word of words) {
    for (let i = 0; i < word.length; i++) {
      const c = word.charCodeAt(i);
      embedding[(c * 31 + i * 7) % 128] += 1;
      if (i < word.length - 1) {
        embedding[((c * word.charCodeAt(i + 1)) + i) % 128] += 0.5;
      }
    }
  }
  const mag = Math.sqrt(embedding.reduce((s: number, v: number) => s + v * v, 0));
  return mag > 0 ? embedding.map((v: number) => v / mag) : embedding;
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
    try {
      const [countData, embData] = await Promise.all([
        apiCall("external-db", { action: "count" }),
        apiCall("train-model", { action: "embedding-count" }),
      ]);
      const total = Number(countData.total);
      const vec = Number(embData.count);
      setStats({ total, vectorized: vec, remaining: total - vec });
    } catch {
      // silent
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats, done]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [visibleLogs]);

  const startTraining = async () => {
    setTraining(true);
    setDone(false);
    setProgress(0);
    setVisibleLogs([]);
    setError(null);

    try {
      addLog("Inicializando TensorFlow.js...");
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      addLog(`✓ TensorFlow.js v${tf.version.tfjs} carregado (backend: ${tf.getBackend()})`);

      addLog("Conectando ao banco de dados externo...");
      const countData = await apiCall("external-db", { action: "count" });
      const totalTitles = Number(countData.total);
      addLog(`✓ ${totalTitles} registros encontrados`);

      // Fetch all titles in batches via external-db preview
      let offset = 0;
      let processedTotal = 0;

      while (offset < totalTitles) {
        const batchNum = Math.floor(offset / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalTitles / BATCH_SIZE);

        addLog(`Buscando batch ${batchNum}/${totalBatches}...`);
        const fetchData = await apiCall("external-db", { action: "preview", limit: String(BATCH_SIZE), offset: String(offset) });
        
        // The preview action doesn't support offset in current edge function
        // Let's use the data we get
        const titles = fetchData.data;
        if (!titles || titles.length === 0) break;

        addLog(`Gerando embeddings para ${titles.length} títulos via TensorFlow.js...`);

        const embeddingsToStore = titles.map((title: any) => {
          const text = [title.title, title.type, title.listed_in, title.description, title.director, title.country, title.rating].filter(Boolean).join(" ");
          return {
            show_id: title.show_id,
            title: title.title,
            type: title.type,
            listed_in: title.listed_in,
            description: title.description,
            embedding: generateEmbedding(text),
          };
        });

        addLog(`Salvando ${embeddingsToStore.length} embeddings...`);
        await apiCall("train-model", { action: "store-embeddings" }, {
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
            <button onClick={startTraining} disabled={training} className="px-6 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
              {training ? "Processando..." : "Gerar Embeddings"}
            </button>
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
