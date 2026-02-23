import { Header } from "@/components/Header";
import { motion } from "framer-motion";
import { Brain, Database, BarChart3, GitCompare, Sparkles, Code2, Search } from "lucide-react";

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
  {
    icon: Search,
    title: "Função de Recomendação por Similaridade",
    content:
      "A função de recomendação recebe os critérios do usuário (tipo, gênero, tom, duração, país), concatena-os em uma string de consulta e gera um embedding de 128 dimensões usando a mesma rede neural TensorFlow.js treinada anteriormente. Esse vetor de consulta é então enviado ao banco de dados PostgreSQL externo, onde a similaridade de cosseno é calculada diretamente em SQL contra todos os vetores armazenados na tabela netflix_embeddings. A fórmula cos(A,B) = (A·B) / (||A|| × ||B||) retorna valores entre 0 e 1, onde 1 significa conteúdo idêntico. Os resultados são ordenados pela maior similaridade e retornados com a porcentagem de acurácia de cada indicação, permitindo ao usuário avaliar a relevância de cada recomendação.",
  },
];

const codeLines = [
  { section: "Pré-processamento — Vetorização do Texto", lines: [
    {
      code: `const textToInputVector = (text: string): number[] => {`,
      comment: "Função que converte texto bruto em um vetor numérico de 256 dimensões para alimentar a rede neural",
    },
    {
      code: `  const vec = new Array(256).fill(0);`,
      comment: "Cria vetor de 256 posições (uma para cada código ASCII possível) — será a entrada da rede neural",
    },
    {
      code: `  const clean = text.toLowerCase().replace(/[^a-z...\\s0-9]/g, "");`,
      comment: "Normaliza o texto: converte para minúsculas e remove caracteres especiais",
    },
    {
      code: `  for (let i = 0; i < clean.length; i++) {`,
      comment: "Percorre cada caractere do texto limpo",
    },
    {
      code: `    vec[clean.charCodeAt(i) % 256] += 1;`,
      comment: "Incrementa a posição correspondente ao código do caractere — cria um histograma de frequência de caracteres (Bag-of-Characters)",
    },
    {
      code: `  }`,
      comment: "Fecha o loop de caracteres",
    },
    {
      code: `  const max = Math.max(...vec, 1);`,
      comment: "Encontra o valor máximo no vetor para normalização (mínimo 1 para evitar divisão por zero)",
    },
    {
      code: `  return vec.map(v => v / max);`,
      comment: "Normaliza todos os valores entre 0 e 1 (Min-Max Scaling) — essencial para a rede neural convergir bem",
    },
    {
      code: `};`,
      comment: "Retorna vetor de 256 dimensões normalizado — pronto para ser a entrada da rede neural",
    },
  ]},
  { section: "Construção da Rede Neural — tf.sequential()", lines: [
    {
      code: `const buildModel = async (tf) => {`,
      comment: "Função que constrói a arquitetura da rede neural usando a API do TensorFlow.js",
    },
    {
      code: `  const model = tf.sequential();`,
      comment: "tf.sequential() — Cria um modelo sequencial onde as camadas são empilhadas uma sobre a outra, da entrada à saída",
    },
    {
      code: `  // Camada 1: Entrada → Camada Oculta`,
      comment: "─── CAMADA 1: 256 → 512 neurônios ───",
    },
    {
      code: `  model.add(tf.layers.dense({`,
      comment: "tf.layers.dense() — Adiciona uma camada totalmente conectada (cada neurônio conecta a todos da camada anterior)",
    },
    {
      code: `    inputShape: [256],`,
      comment: "inputShape: [256] — Define que a entrada tem 256 dimensões (nosso vetor bag-of-characters)",
    },
    {
      code: `    units: 512,`,
      comment: "units: 512 — Esta camada tem 512 neurônios. Cada um aprende um padrão diferente do texto. São 256×512 + 512 = 131.584 parâmetros (pesos + biases)",
    },
    {
      code: `    activation: "relu"`,
      comment: 'activation: "relu" — ReLU (Rectified Linear Unit): f(x) = max(0, x). Introduz não-linearidade, permitindo à rede aprender padrões complexos. Neurônios negativos são zerados.',
    },
    {
      code: `  }));`,
      comment: "Fecha a definição da primeira camada oculta",
    },
    {
      code: `  // Camada 2: Camada Oculta → Compressão`,
      comment: "─── CAMADA 2: 512 → 256 neurônios ───",
    },
    {
      code: `  model.add(tf.layers.dense({`,
      comment: "Segunda camada densa — comprime a representação de 512 para 256 dimensões",
    },
    {
      code: `    units: 256, activation: "relu"`,
      comment: "256 neurônios com ReLU. São 512×256 + 256 = 131.328 parâmetros. Essa compressão força a rede a reter apenas as features mais importantes",
    },
    {
      code: `  }));`,
      comment: "Fecha a segunda camada — funciona como um 'gargalo' que filtra informação irrelevante",
    },
    {
      code: `  // Camada 3: Saída — Embedding Final`,
      comment: "─── CAMADA 3 (SAÍDA): 256 → 128 neurônios ───",
    },
    {
      code: `  model.add(tf.layers.dense({`,
      comment: "Camada final — produz o embedding de 128 dimensões que representa o filme",
    },
    {
      code: `    units: 128, activation: "sigmoid"`,
      comment: 'units: 128 — Cada dimensão do embedding. activation: "sigmoid" — Garante valores entre 0 e 1. São 256×128 + 128 = 32.896 parâmetros',
    },
    {
      code: `  }));`,
      comment: "Fecha a camada de saída — o vetor de 128 valores é o embedding do filme",
    },
    {
      code: `  model.compile({`,
      comment: "model.compile() — Configura o otimizador e a função de perda para treinamento",
    },
    {
      code: `    optimizer: "adam", loss: "meanSquaredError"`,
      comment: 'optimizer: "adam" — Algoritmo Adam (Adaptive Moment Estimation): ajusta a taxa de aprendizado automaticamente. loss: "MSE" — Erro quadrático médio entre saída prevista e esperada',
    },
    {
      code: `  });`,
      comment: "Modelo compilado com total de 295.808 parâmetros treináveis na rede neural",
    },
    {
      code: `  return model;`,
      comment: "Retorna o modelo pronto para gerar embeddings via model.predict()",
    },
    {
      code: `};`,
      comment: "Arquitetura: 256→512→256→128 (Encoder/Bottleneck pattern — similar a um Autoencoder)",
    },
  ]},
  { section: "Geração do Embedding — model.predict()", lines: [
    {
      code: `const generateEmbedding = async (tf, text) => {`,
      comment: "Função principal que gera o embedding de 128-dim para um texto usando a rede neural",
    },
    {
      code: `  const inputVec = textToInputVector(text);`,
      comment: "Converte o texto (título + gênero + descrição etc.) no vetor de 256 dimensões",
    },
    {
      code: `  const inputTensor = tf.tensor2d([inputVec], [1, 256]);`,
      comment: "tf.tensor2d() — Cria um tensor 2D (matriz) de shape [1, 256]: 1 amostra, 256 features. Tensores são a estrutura de dados fundamental do TensorFlow",
    },
    {
      code: `  const outputTensor = tfModel.predict(inputTensor);`,
      comment: "model.predict() — Passa o tensor pela rede neural (forward pass): 256→512→256→128. Cada neurônio aplica: output = activation(W·input + bias)",
    },
    {
      code: `  const embedding = Array.from(await outputTensor.data());`,
      comment: "outputTensor.data() — Extrai os 128 valores do tensor de saída como um array JavaScript",
    },
    {
      code: `  inputTensor.dispose(); outputTensor.dispose();`,
      comment: "tensor.dispose() — Libera a memória GPU/CPU dos tensores. Sem isso, ocorre memory leak (o garbage collector do JS não limpa tensores TF)",
    },
    {
      code: `  const mag = Math.sqrt(embedding.reduce((s,v) => s+v*v, 0));`,
      comment: "Calcula a norma L2 (magnitude) do vetor — raiz quadrada da soma dos quadrados",
    },
    {
      code: `  return mag > 0 ? embedding.map(v => v / mag) : embedding;`,
      comment: "Normaliza para vetor unitário (norma=1). Essencial para similaridade por cosseno: cos(A,B) = A·B quando ||A||=||B||=1",
    },
    {
      code: `};`,
      comment: "Retorna o embedding normalizado de 128 dimensões — pronto para comparação por similaridade",
    },
  ]},
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

            {codeLines.map((section, si) => (
              <div key={si}>
                {/* Section header */}
                <div className="px-6 py-3 bg-primary/5 border-y border-border">
                  <h4 className="font-display font-semibold text-primary text-sm">{section.section}</h4>
                </div>

                <div className="divide-y divide-border/50">
                  {section.lines.map((line, i) => (
                    <motion.div
                      key={`${si}-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: sections.length * 0.1 + (si * 10 + i) * 0.02 }}
                      className="flex flex-col sm:flex-row gap-0 sm:gap-4 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-start gap-2 px-4 pt-3 sm:py-3">
                        <span className="text-xs text-muted-foreground/50 font-mono w-5 text-right flex-shrink-0 select-none">
                          {i + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 px-4 sm:px-0 sm:py-3">
                        <pre className="text-xs font-mono text-primary whitespace-pre-wrap break-all">
                          {line.code}
                        </pre>
                      </div>
                      <div className="flex-1 min-w-0 px-4 pb-3 sm:py-3 sm:pr-4">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="text-primary/40 mr-1">//</span>
                          {line.comment}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}

            {/* Resumo */}
            <div className="px-6 py-4 border-t border-border bg-secondary/30">
              <h4 className="font-display font-semibold text-foreground text-sm mb-2">Arquitetura da Rede Neural:</h4>
              <div className="text-xs text-muted-foreground space-y-3 leading-relaxed">
                <div className="flex items-center gap-2 flex-wrap font-mono">
                  <span className="px-2 py-1 rounded bg-primary/10 text-primary">Entrada [256]</span>
                  <span>→</span>
                  <span className="px-2 py-1 rounded bg-primary/10 text-primary">Dense 512 (ReLU)</span>
                  <span>→</span>
                  <span className="px-2 py-1 rounded bg-primary/10 text-primary">Dense 256 (ReLU)</span>
                  <span>→</span>
                  <span className="px-2 py-1 rounded bg-primary/10 text-primary">Dense 128 (Sigmoid)</span>
                  <span>→</span>
                  <span className="px-2 py-1 rounded bg-success/20 text-success">Embedding [128]</span>
                </div>
                <ol className="space-y-1.5 list-decimal list-inside">
                  <li><strong>Entrada (256 neurônios):</strong> Vetor bag-of-characters normalizado do texto do filme</li>
                  <li><strong>Camada Oculta 1 (512 neurônios, ReLU):</strong> Expande a representação para capturar padrões complexos — 131.584 parâmetros</li>
                  <li><strong>Camada Oculta 2 (256 neurônios, ReLU):</strong> Comprime a representação, forçando a rede a reter apenas features relevantes — 131.328 parâmetros</li>
                  <li><strong>Saída (128 neurônios, Sigmoid):</strong> Produz o embedding final normalizado entre 0 e 1 — 32.896 parâmetros</li>
                  <li><strong>Total:</strong> 295.808 parâmetros treináveis na rede</li>
                </ol>
                <p className="mt-2">
                  <strong>Métodos TensorFlow.js utilizados:</strong>{" "}
                  <code className="text-primary bg-primary/10 px-1 rounded">tf.sequential()</code>,{" "}
                  <code className="text-primary bg-primary/10 px-1 rounded">tf.layers.dense()</code>,{" "}
                  <code className="text-primary bg-primary/10 px-1 rounded">model.compile()</code>,{" "}
                  <code className="text-primary bg-primary/10 px-1 rounded">model.predict()</code>,{" "}
                  <code className="text-primary bg-primary/10 px-1 rounded">tf.tensor2d()</code>,{" "}
                  <code className="text-primary bg-primary/10 px-1 rounded">tensor.data()</code>,{" "}
                  <code className="text-primary bg-primary/10 px-1 rounded">tensor.dispose()</code>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default TechnicalExplanation;
