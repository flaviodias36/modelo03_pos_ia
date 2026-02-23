import { useState } from "react";
import { Header } from "@/components/Header";
import { MovieCard } from "@/components/MovieCard";
import { mockRecommendations, filterOptions } from "@/mock/movies";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

const TestRecommendation = () => {
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleGenerate = () => {
    setLoading(true);
    setShowResults(false);
    setTimeout(() => {
      setLoading(false);
      setShowResults(true);
    }, 2000);
  };

  const SelectField = ({ label, options }: { label: string; options: string[] }) => (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1.5">{label}</label>
      <select className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all">
        <option value="">Selecionar...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Testar Recomendação" subtitle="Configure seus critérios e gere recomendações" />
      <main className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 border border-border"
        >
          <h2 className="font-display font-semibold text-foreground mb-4">Critérios de Busca</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <SelectField label="Tipo Preferido" options={filterOptions.types} />
            <SelectField label="Gênero" options={filterOptions.genres} />
            <SelectField label="Tom" options={filterOptions.tones} />
            <SelectField label="Duração" options={filterOptions.durations} />
            <SelectField label="País" options={filterOptions.countries} />
          </div>
          <div className="mt-5">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Gerando..." : "Gerar Recomendações"}
            </button>
          </div>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <h2 className="font-display font-semibold text-foreground">
                Resultados <span className="text-muted-foreground font-normal text-sm ml-2">({mockRecommendations.length} filmes encontrados)</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockRecommendations.map((movie, i) => (
                  <MovieCard key={movie.title} movie={movie} index={i} />
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
