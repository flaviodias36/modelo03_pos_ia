import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { ProgressBar } from "@/components/ProgressBar";
import { trainingLogs } from "@/mock/logs";
import { motion, AnimatePresence } from "framer-motion";
import { Database, CheckCircle, Layers, Clock } from "lucide-react";

const TrainModel = () => {
  const [training, setTraining] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const startTraining = () => {
    setTraining(true);
    setDone(false);
    setProgress(0);
    setVisibleLogs([]);

    let logIndex = 0;
    const totalLogs = trainingLogs.length;

    const interval = setInterval(() => {
      if (logIndex >= totalLogs) {
        clearInterval(interval);
        setTraining(false);
        setDone(true);
        setProgress(100);
        return;
      }
      setVisibleLogs((prev) => [...prev, trainingLogs[logIndex]]);
      setProgress(((logIndex + 1) / totalLogs) * 100);
      logIndex++;
    }, 900);
  };

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [visibleLogs]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Treinar Modelo" subtitle="Gere embeddings vetoriais para sua base" />
      <main className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Registros" value="8.807" icon={Database} delay={0} />
          <StatCard title="Já Vetorizados" value="6.320" icon={Layers} variant="success" delay={0.1} />
          <StatCard title="Restantes" value="2.487" icon={Clock} variant="warning" delay={0.2} />
        </div>

        {/* Action */}
        <div className="glass-card p-6 border border-border space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-semibold text-foreground">Geração de Embeddings</h2>
              <p className="text-sm text-muted-foreground mt-1">Tempo estimado: ~25 segundos</p>
            </div>
            <button
              onClick={startTraining}
              disabled={training}
              className="px-6 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {training ? "Processando..." : "Gerar Embeddings"}
            </button>
          </div>

          {(training || done) && (
            <ProgressBar progress={progress} variant={done ? "success" : "primary"} label={done ? "Concluído" : "Processando embeddings..."} />
          )}
        </div>

        {/* Logs */}
        <AnimatePresence>
          {visibleLogs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card border border-border overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <h3 className="font-display font-semibold text-foreground text-sm">Logs de Treinamento</h3>
              </div>
              <div ref={logRef} className="p-4 max-h-72 overflow-y-auto scrollbar-thin font-mono text-xs space-y-1">
                {visibleLogs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`py-0.5 ${log.includes("sucesso") || log.includes("concluído") ? "text-success" : "text-muted-foreground"}`}
                  >
                    <span className="text-primary/60 mr-2">[{new Date().toLocaleTimeString()}]</span>
                    {log}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success */}
        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-4 border border-success/30 flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-success" />
            <span className="text-success font-medium text-sm">Treinamento concluído com sucesso</span>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default TrainModel;
