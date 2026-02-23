import { Header } from "@/components/Header";
import { motion } from "framer-motion";
import { Brain, Database, BarChart3, GitCompare, Sparkles, Code2 } from "lucide-react";

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

const codeLines = [
  {
    code: `const generateEmbedding = (text: string): number[] => {`,
    comment: "Função principal que recebe um texto e retorna um vetor numérico (embedding) de 128 dimensões",
  },
  {
    code: `  const embedding = new Array(128).fill(0);`,
    comment: "Cria um vetor com 128 posições preenchidas com zero — esse será nosso embedding final",
  },
  {
    code: `  const words = text.toLowerCase()`,
    comment: "Converte todo o texto para minúsculas para normalizar a comparação",
  },
  {
    code: `    .replace(/[^a-záàâãéèêíïóôõöúçñ\\s0-9]/g, "")`,
    comment: "Remove caracteres especiais, mantendo apenas letras, números e espaços",
  },
  {
    code: `    .split(/\\s+/).filter(Boolean);`,
    comment: "Divide o texto em palavras individuais e remove strings vazias",
  },
  {
    code: `  for (const word of words) {`,
    comment: "Itera sobre cada palavra do texto para extrair suas características",
  },
  {
    code: `    for (let i = 0; i < word.length; i++) {`,
    comment: "Percorre cada caractere da palavra para gerar features posicionais",
  },
  {
    code: `      const c = word.charCodeAt(i);`,
    comment: "Obtém o código numérico Unicode do caractere (ex: 'a' = 97, 'b' = 98)",
  },
  {
    code: `      embedding[(c * 31 + i * 7) % 128] += 1;`,
    comment: "Usa hashing com primos (31, 7) para mapear cada caractere+posição a uma dimensão do vetor, incrementando o valor — isso captura a frequência dos padrões de caracteres",
  },
  {
    code: `      if (i < word.length - 1) {`,
    comment: "Verifica se existe um próximo caractere para formar um bigrama (par de caracteres consecutivos)",
  },
  {
    code: `        embedding[((c * word.charCodeAt(i+1)) + i) % 128] += 0.5;`,
    comment: "Gera uma feature de bigrama — multiplica os códigos de dois caracteres adjacentes para capturar padrões de sequência, com peso menor (0.5) que unigrama",
  },
  {
    code: `      }`,
    comment: "Fecha o bloco do bigrama",
  },
  {
    code: `    }`,
    comment: "Fecha o loop de caracteres da palavra",
  },
  {
    code: `  }`,
    comment: "Fecha o loop de palavras",
  },
  {
    code: `  const mag = Math.sqrt(`,
    comment: "Calcula a magnitude (norma L2) do vetor — é a raiz quadrada da soma dos quadrados",
  },
  {
    code: `    embedding.reduce((s, v) => s + v * v, 0)`,
    comment: "Soma o quadrado de cada valor do vetor para calcular a norma euclidiana",
  },
  {
    code: `  );`,
    comment: "Fecha o cálculo da magnitude",
  },
  {
    code: `  return mag > 0`,
    comment: "Se a magnitude é maior que zero (vetor não nulo)...",
  },
  {
    code: `    ? embedding.map(v => v / mag)`,
    comment: "...normaliza dividindo cada valor pela magnitude, criando um vetor unitário (norma = 1) — essencial para similaridade por cosseno funcionar corretamente",
  },
  {
    code: `    : embedding;`,
    comment: "Se o vetor é nulo (texto vazio), retorna o vetor de zeros como está",
  },
  {
    code: `};`,
    comment: "Fecha a função — o vetor retornado pode ser comparado com outros usando produto interno (cosseno)",
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

          {/* Código Fonte com Explicação */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sections.length * 0.1 }}
            className="glass-card border border-border overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center text-primary flex-shrink-0">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground text-lg">
                  Função de Geração de Embeddings
                </h3>
                <p className="text-sm text-muted-foreground">
                  Código real usado no treinamento com TensorFlow.js — cada linha explicada
                </p>
              </div>
            </div>

            <div className="divide-y divide-border/50">
              {codeLines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: sections.length * 0.1 + i * 0.03 }}
                  className="flex flex-col sm:flex-row gap-0 sm:gap-4 hover:bg-secondary/50 transition-colors"
                >
                  {/* Número da linha */}
                  <div className="flex items-start gap-2 px-4 pt-3 sm:py-3">
                    <span className="text-xs text-muted-foreground/50 font-mono w-5 text-right flex-shrink-0 select-none">
                      {i + 1}
                    </span>
                  </div>

                  {/* Código */}
                  <div className="flex-1 min-w-0 px-4 sm:px-0 sm:py-3">
                    <pre className="text-xs font-mono text-primary whitespace-pre-wrap break-all">
                      {line.code}
                    </pre>
                  </div>

                  {/* Explicação */}
                  <div className="flex-1 min-w-0 px-4 pb-3 sm:py-3 sm:pr-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="text-primary/40 mr-1">//</span>
                      {line.comment}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Resumo */}
            <div className="px-6 py-4 border-t border-border bg-secondary/30">
              <h4 className="font-display font-semibold text-foreground text-sm mb-2">Como funciona o processo completo:</h4>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>O sistema busca todos os títulos da tabela <code className="text-primary bg-primary/10 px-1 rounded">netflix_titles</code> no banco externo em batches de 50</li>
                <li>Para cada título, combina os campos <code className="text-primary bg-primary/10 px-1 rounded">title + type + listed_in + description + director + country + rating</code> em um único texto</li>
                <li>A função <code className="text-primary bg-primary/10 px-1 rounded">generateEmbedding()</code> transforma esse texto em um vetor numérico de 128 dimensões</li>
                <li>Usa hashing de caracteres e bigramas para mapear padrões textuais às dimensões do vetor</li>
                <li>Normaliza o vetor para ter magnitude 1 (vetor unitário), permitindo comparação por cosseno</li>
                <li>Os embeddings são salvos na tabela <code className="text-primary bg-primary/10 px-1 rounded">netflix_embeddings</code> no banco externo</li>
                <li>Na recomendação, o mesmo processo é aplicado à busca do usuário e os vetores mais similares são retornados</li>
              </ol>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default TechnicalExplanation;
