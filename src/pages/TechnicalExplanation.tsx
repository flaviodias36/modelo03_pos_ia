import { Header } from "@/components/Header";
import { motion } from "framer-motion";
import { Brain, Database, BarChart3, GitCompare, Sparkles } from "lucide-react";

const sections = [
  {
    icon: Brain,
    title: "O que são Embeddings?",
    content:
      "Embeddings são representações numéricas densas de dados (texto, imagens, etc.) em um espaço vetorial de alta dimensão. Cada item é convertido em um vetor de números reais que captura seu significado semântico. Itens semelhantes ficam próximos no espaço vetorial, permitindo comparações matemáticas de similaridade. Modelos como OpenAI text-embedding-ada-002 ou Sentence Transformers geram esses vetores a partir de descrições textuais.",
  },
  {
    icon: Database,
    title: "O que é pgvector?",
    content:
      "pgvector é uma extensão open-source do PostgreSQL que permite armazenar e consultar vetores diretamente no banco de dados. Suporta tipos de dados vetoriais, índices HNSW e IVFFlat para busca aproximada de vizinhos mais próximos (ANN), e operadores de distância como cosseno, L2 e produto interno. Com pgvector, você faz buscas vetoriais com SQL puro, sem precisar de bancos de dados especializados.",
  },
  {
    icon: BarChart3,
    title: "Similaridade Vetorial",
    content:
      "A similaridade vetorial mede o quão parecidos dois vetores são no espaço multidimensional. A métrica mais comum é a similaridade por cosseno, que calcula o ângulo entre dois vetores (valores de 0 a 1, onde 1 = idênticos). Outras métricas incluem distância euclidiana (L2) e produto interno. No contexto de recomendação, comparamos o vetor da consulta do usuário com os vetores dos filmes para encontrar os mais similares.",
  },
  {
    icon: GitCompare,
    title: "Content-based vs Collaborative Filtering",
    content:
      "Content-based filtering recomenda itens baseados nas características do próprio conteúdo (gênero, descrição, elenco). Collaborative filtering usa o comportamento de outros usuários similares para recomendar ('quem viu X também viu Y'). Sistemas híbridos combinam ambos. Nosso laboratório usa content-based filtering com embeddings semânticos, transformando metadados de filmes em vetores e comparando com as preferências do usuário.",
  },
  {
    icon: Sparkles,
    title: "Aplicações Reais",
    content:
      "Netflix usa deep learning e collaborative filtering para personalizar 80% do conteúdo assistido. Amazon combina item-to-item collaborative filtering com análise de histórico de compras. Spotify usa embeddings de áudio (CNN) e análise de playlists colaborativas para Discover Weekly. YouTube emprega um modelo de duas torres (candidato + ranking) com billions de parâmetros. Todas essas plataformas investem pesadamente em representações vetoriais para melhorar recomendações.",
  },
];

const TechnicalExplanation = () => {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="Explicação Técnica" subtitle="Entenda os conceitos por trás do sistema" />
      <main className="flex-1 p-6 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto space-y-5">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6 border border-border hover:border-primary/30 transition-all duration-300 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center text-primary flex-shrink-0 group-hover:glow-red transition-shadow">
                  <section.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground text-lg mb-2 group-hover:text-primary transition-colors">
                    {section.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {section.content}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default TechnicalExplanation;
