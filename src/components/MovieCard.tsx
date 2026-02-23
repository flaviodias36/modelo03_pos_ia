import { motion } from "framer-motion";
import type { MovieRecommendation } from "@/mock/movies";

interface MovieCardProps {
  movie: MovieRecommendation;
  index: number;
}

export function MovieCard({ movie, index }: MovieCardProps) {
  const similarityPct = Math.round(movie.similarity * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="glass-card p-5 border border-border hover:border-primary/40 transition-all duration-300 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
            {movie.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {movie.type} • {movie.year}
          </p>
        </div>
        <span className="text-sm font-bold text-primary">{similarityPct}%</span>
      </div>

      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{movie.description}</p>

      <div className="flex items-center gap-2 mb-3">
        {movie.genre.split(", ").map((g) => (
          <span key={g} className="px-2 py-0.5 text-xs rounded-md bg-secondary text-secondary-foreground">
            {g}
          </span>
        ))}
      </div>

      {/* Similarity bar */}
      <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${similarityPct}%` }}
          transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
          className="h-full rounded-full gradient-primary"
        />
      </div>
    </motion.div>
  );
}
