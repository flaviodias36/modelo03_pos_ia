import { useState, useRef } from "react";
import { Header } from "@/components/Header";
import { ProgressBar } from "@/components/ProgressBar";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, FileSpreadsheet, Upload, AlertCircle, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CSV_COLUMNS = ["show_id", "type", "title", "director", "cast", "country", "date_added", "release_year", "rating", "duration", "listed_in", "description"];

function parseCSV(text: string) {
  const lines = text.split("\n");
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  
  const records: Record<string, string | number | null>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle CSV with quoted fields containing commas
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const record: Record<string, string | number | null> = {};
    headers.forEach((h, idx) => {
      const val = values[idx] || "";
      if (h === "release_year") {
        record[h] = val ? parseInt(val) : null;
      } else {
        record[h] = val;
      }
    });
    records.push(record);
  }
  return records;
}

const BATCH_SIZE = 100;

const ImportCSV = () => {
  const [file, setFile] = useState<File | null>(null);
  const [records, setRecords] = useState<Record<string, string | number | null>[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingTable, setCreatingTable] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setDone(false);
    setError(null);
    setProgress(0);
    const text = await f.text();
    const parsed = parseCSV(text);
    setRecords(parsed);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".csv")) handleFile(f);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const createTable = async () => {
    setCreatingTable(true);
    setError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-db?action=create-table`,
        {
          method: "GET",
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao criar tabela");
      toast({ title: "Tabela criada!", description: result.message });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingTable(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);
    setError(null);
    setDone(false);

    try {
      const totalBatches = Math.ceil(records.length / BATCH_SIZE);
      let imported = 0;

      for (let i = 0; i < totalBatches; i++) {
        const batch = records.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-db?action=import`,
          {
            method: "POST",
            headers: {
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ records: batch }),
          }
        );
        
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Erro na importação");
        
        imported += result.imported;
        setProgress(Math.round(((i + 1) / totalBatches) * 100));
      }

      setDone(true);
      toast({ title: "Importação concluída!", description: `${imported} registros importados` });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const previewData = records.slice(0, 10);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Importar CSV" subtitle="Importe sua base de dados de filmes para o banco externo" />
      <main className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin">
        {/* Create Table Button */}
        <div className="glass-card p-4 border border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Estrutura do Banco</p>
              <p className="text-xs text-muted-foreground">Crie a tabela netflix_titles no banco externo</p>
            </div>
          </div>
          <button
            onClick={createTable}
            disabled={creatingTable}
            className="px-5 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {creatingTable ? "Criando..." : "Criar Tabela"}
          </button>
        </div>

        {/* Upload Area */}
        {!file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 cursor-pointer",
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
            )}
          >
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
            <div className="flex flex-col items-center gap-3">
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center transition-colors",
                isDragging ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
              )}>
                {isDragging ? <FileSpreadsheet className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
              </div>
              <div>
                <p className="text-foreground font-medium">
                  {isDragging ? "Solte o arquivo aqui" : "Arraste seu arquivo CSV aqui"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Colunas esperadas: show_id, type, title, director, cast, country, date_added, release_year, rating, duration, listed_in, description
                </p>
              </div>
              <button
                className="mt-2 px-5 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                Selecionar Arquivo
              </button>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {file && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* File info */}
              <div className="glass-card p-4 border border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {records.length.toLocaleString()} registros • {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                {!importing && !done && (
                  <button
                    onClick={handleImport}
                    className="px-5 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Importar para DB
                  </button>
                )}
              </div>

              {/* Progress */}
              {importing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <ProgressBar progress={progress} label={`Importando registros... ${progress}%`} />
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 border border-destructive/30 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <span className="text-destructive font-medium text-sm">{error}</span>
                </motion.div>
              )}

              {/* Success */}
              {done && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-4 border border-success/30 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="text-success font-medium text-sm">{records.length.toLocaleString()} registros importados com sucesso</span>
                </motion.div>
              )}

              {/* Preview Table */}
              {previewData.length > 0 && (
                <div className="glass-card border border-border overflow-hidden">
                  <div className="px-5 py-3 border-b border-border">
                    <h3 className="font-display font-semibold text-foreground text-sm">Preview dos Dados ({previewData.length} de {records.length.toLocaleString()})</h3>
                  </div>
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {CSV_COLUMNS.map((key) => (
                            <th key={key} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                            {CSV_COLUMNS.map((col) => (
                              <td key={col} className="px-4 py-2 text-foreground whitespace-nowrap max-w-[200px] truncate">
                                {String(row[col] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ImportCSV;
