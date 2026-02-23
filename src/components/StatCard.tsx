import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  suffix?: string;
  variant?: "default" | "primary" | "success" | "warning";
  delay?: number;
}

const variantStyles = {
  default: "border-border",
  primary: "border-primary/30 glow-red",
  success: "border-success/30",
  warning: "border-warning/30",
};

const iconVariantStyles = {
  default: "bg-secondary text-muted-foreground",
  primary: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
};

export function StatCard({ title, value, icon: Icon, suffix, variant = "default", delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn("glass-card p-5 border", variantStyles[variant])}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-display font-bold text-foreground">
            {value}
            {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconVariantStyles[variant])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}
