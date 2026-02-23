import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number;
  label?: string;
  variant?: "primary" | "success";
  showPercentage?: boolean;
  className?: string;
}

export function ProgressBar({ progress, label, variant = "primary", showPercentage = true, className }: ProgressBarProps) {
  return (
    <div className={cn("w-full", className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm text-muted-foreground">{label}</span>}
          {showPercentage && <span className="text-sm font-medium text-foreground">{Math.round(progress)}%</span>}
        </div>
      )}
      <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            variant === "primary" ? "gradient-primary" : "bg-success"
          )}
        />
      </div>
    </div>
  );
}
