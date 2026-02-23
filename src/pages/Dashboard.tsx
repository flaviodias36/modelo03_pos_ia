import { useState, useEffect } from "react";
import { Film, Database, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Header } from "@/components/Header";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const CHART_COLORS = [
  "hsl(0, 85%, 52%)",
  "hsl(0, 0%, 40%)",
  "hsl(30, 80%, 55%)",
  "hsl(200, 70%, 50%)",
  "hsl(120, 50%, 45%)",
];

interface DashboardData {
  total: number;
  embedded: number;
  pending: number;
  distribution: { name: string; count: number }[];
  latest: { title: string; type: string; listed_in: string }[];
}

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/external-db?action=dashboard-stats`, {
          headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        });
        const json = await res.json();
        if (json.success) setData(json);
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalAll = data?.distribution.reduce((s, d) => s + d.count, 0) || 1;
  const chartData = (data?.distribution || []).map((d, i) => ({
    name: d.name || "Outro",
    value: Math.round((d.count / totalAll) * 100),
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Dashboard" subtitle="Visão geral do laboratório de recomendação — dados em tempo real" />
      <main className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-40 gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Carregando dados do banco externo...</span>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total de Títulos" value={(data?.total || 0).toLocaleString("pt-BR")} icon={Film} variant="primary" delay={0} />
              <StatCard title="Com Embedding" value={(data?.embedded || 0).toLocaleString("pt-BR")} icon={Database} variant="success" delay={0.1} />
              <StatCard title="Pendentes" value={(data?.pending || 0).toLocaleString("pt-BR")} icon={AlertTriangle} variant="warning" delay={0.2} />
              <StatCard title="Dimensões do Vetor" value="128" suffix="dim" icon={Clock} delay={0.3} />
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
                {chartData.length > 0 ? (
                  <div className="h-56 flex items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {chartData.map((entry, i) => (
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
                      {chartData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                          <span className="text-sm text-muted-foreground">{item.name}</span>
                          <span className="text-sm font-medium text-foreground ml-auto">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
                )}
              </motion.div>

              {/* Latest Embeddings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass-card p-6 border border-border"
              >
                <h2 className="font-display font-semibold text-foreground mb-4">Últimos Embeddings Gerados</h2>
                <div className="space-y-3">
                  {(data?.latest || []).length > 0 ? (
                    data!.latest.map((rec, i) => (
                      <div
                        key={`${rec.title}-${i}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-md gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                            {i + 1}
                          </span>
                          <div>
                            <span className="font-medium text-foreground text-sm">{rec.title}</span>
                            <p className="text-xs text-muted-foreground">{rec.listed_in}</p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium">
                          {rec.type}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum embedding gerado ainda. Vá para "Treinar Modelo" para começar.</p>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
