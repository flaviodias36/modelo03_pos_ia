import { Upload, FileSpreadsheet } from "lucide-react";
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface UploadAreaProps {
  onFileSelect: () => void;
}

export function UploadArea({ onFileSelect }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onFileSelect();
  }, [onFileSelect]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 cursor-pointer",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground"
      )}
      onClick={onFileSelect}
    >
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
            ou clique para selecionar
          </p>
        </div>
        <button
          className="mt-2 px-5 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onFileSelect(); }}
        >
          Selecionar Arquivo
        </button>
      </div>
    </motion.div>
  );
}
