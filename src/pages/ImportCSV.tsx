import { useState } from "react";
import { Header } from "@/components/Header";
import { UploadArea } from "@/components/UploadArea";
import { ProgressBar } from "@/components/ProgressBar";
import { csvPreviewData } from "@/mock/stats";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, FileSpreadsheet } from "lucide-react";

const ImportCSV = () => {
  const [fileSelected, setFileSelected] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const handleFileSelect = () => {
    setFileSelected(true);
    setDone(false);
    setProgress(0);
  };

  const handleImport = () => {
    setImporting(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setImporting(false);
          setDone(true);
          return 100;
        }
        return prev + 2;
      });
    }, 60);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Importar CSV" subtitle="Importe sua base de dados de filmes" />
      <main className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin">
        {!fileSelected && <UploadArea onFileSelect={handleFileSelect} />}

        <AnimatePresence>
          {fileSelected && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* File info */}
              <div className="glass-card p-4 border border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">netflix_titles.csv</p>
                  <p className="text-xs text-muted-foreground">8.807 registros • 2.4 MB</p>
                </div>
                {!importing && !done && (
                  <button
                    onClick={handleImport}
                    className="px-5 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Importar
                  </button>
                )}
              </div>

              {/* Progress */}
              {importing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <ProgressBar progress={progress} label="Importando registros..." />
                </motion.div>
              )}

              {/* Success */}
              {done && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-4 border border-success/30 flex items-center gap-3"
                >
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="text-success font-medium text-sm">8.807 registros importados com sucesso</span>
                </motion.div>
              )}

              {/* Preview Table */}
              <div className="glass-card border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <h3 className="font-display font-semibold text-foreground text-sm">Preview dos Dados</h3>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {Object.keys(csvPreviewData[0]).map((key) => (
                          <th key={key} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreviewData.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-4 py-2 text-foreground whitespace-nowrap max-w-[200px] truncate">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ImportCSV;
