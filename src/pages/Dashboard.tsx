import { Film, Database, Clock, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Header } from "@/components/Header";
import { dashboardStats, contentDistribution, lastRecommendations } from "@/mock/stats";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const Dashboard = () => {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Dashboard" subtitle="Visão geral do laboratório de recomendação" />
      <main className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total de Filmes" value={dashboardStats.totalFilmes.toLocaleString()} icon={Film} variant="primary" delay={0} />
          <StatCard title="Com Embedding" value={dashboardStats.comEmbedding.toLocaleString()} icon={Database} variant="success" delay={0.1} />
          <StatCard title="Pendentes" value={dashboardStats.pendentes.toLocaleString()} icon={AlertTriangle} variant="warning" delay={0.2} />
          <StatCard title="Tempo Médio de Busca" value={dashboardStats.tempoMedioBusca} suffix="ms" icon={Clock} delay={0.3} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6 border border-border"
          >
            <h2 className="font-display font-semibold text-foreground mb-4">Distribuição de Conteúdo</h2>
            <div className="h-56 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contentDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {contentDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0 0% 10%)",
                      border: "1px solid hsl(0 0% 18%)",
                      borderRadius: "8px",
                      color: "hsl(0 0% 95%)",
                    }}
                    formatter={(value: number) => [`${value}%`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {contentDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                    <span className="text-sm font-medium text-foreground ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Last Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6 border border-border"
          >
            <h2 className="font-display font-semibold text-foreground mb-4">Últimas Recomendações</h2>
            <div className="space-y-3">
              {lastRecommendations.map((rec, i) => (
                <div
                  key={rec.title}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-md gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="font-medium text-foreground">{rec.title}</span>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {(rec.similarity * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
