# Módulo 3 — Treinamento de Rede Neural e Sistema de Recomendação

## 📋 Visão Geral do Projeto

Este projeto é um **laboratório de recomendação de filmes e séries** que utiliza **Redes Neurais** e **TensorFlow.js** para gerar embeddings vetoriais e recomendar conteúdo com base em **similaridade de cosseno**. O sistema processa a base de dados da Netflix (~8.800 títulos), vetoriza cada título e permite buscas semânticas em tempo real.

---

## 🧠 Classe Principal: Treinamento da Rede Neural

### Arquitetura da Rede Neural

A rede neural é construída usando **TensorFlow.js** diretamente no navegador do usuário, sem necessidade de servidor GPU. A arquitetura segue o padrão **Encoder/Bottleneck**, semelhante a um Autoencoder:

```
Entrada [256] → Dense 512 (ReLU) → Dense 256 (ReLU) → Dense 128 (Sigmoid) → Embedding [128]
```

| Camada | Neurônios | Ativação | Parâmetros | Função |
|--------|-----------|----------|------------|--------|
| 1 (Entrada → Oculta) | 256 → 512 | ReLU | 131.584 | Expande a representação para capturar padrões complexos |
| 2 (Oculta → Compressão) | 512 → 256 | ReLU | 131.328 | Comprime, retendo apenas features relevantes |
| 3 (Saída — Embedding) | 256 → 128 | Sigmoid | 32.896 | Produz o embedding final normalizado entre 0 e 1 |
| **Total** | | | **295.808** | Parâmetros treináveis |

### Pré-processamento: Vetorização do Texto

Antes de alimentar a rede neural, o texto de cada filme (título + gênero + descrição + diretor + país + rating) é convertido em um **vetor numérico de 256 dimensões** usando a técnica **Bag-of-Characters**:

```typescript
const textToInputVector = (text: string): number[] => {
  const vec = new Array(256).fill(0);
  const clean = text.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ\s0-9]/g, "");
  for (let i = 0; i < clean.length; i++) {
    vec[clean.charCodeAt(i) % 256] += 1;  // histograma de frequência de caracteres
  }
  const max = Math.max(...vec, 1);
  return vec.map(v => v / max);  // normalização Min-Max entre 0 e 1
};
```

**Como funciona:**
1. O texto é limpo e convertido para minúsculas
2. Cada caractere incrementa a posição correspondente ao seu código ASCII no vetor
3. O vetor resultante é normalizado entre 0 e 1 (Min-Max Scaling)
4. Resultado: vetor de 256 dimensões representando a distribuição de caracteres do texto

### Construção do Modelo com TensorFlow.js

```typescript
const buildModel = async (tf) => {
  const model = tf.sequential();  // Modelo sequencial: camadas empilhadas

  // Camada 1: 256→512 neurônios, ativação ReLU
  model.add(tf.layers.dense({ inputShape: [256], units: 512, activation: "relu" }));

  // Camada 2: 512→256 neurônios, ativação ReLU (gargalo/compressão)
  model.add(tf.layers.dense({ units: 256, activation: "relu" }));

  // Camada 3: 256→128 neurônios, ativação Sigmoid (embedding final)
  model.add(tf.layers.dense({ units: 128, activation: "sigmoid" }));

  model.compile({ optimizer: "adam", loss: "meanSquaredError" });
  return model;
};
```

**Métodos TensorFlow.js utilizados:**
- `tf.sequential()` — Cria modelo sequencial
- `tf.layers.dense()` — Camada totalmente conectada
- `model.compile()` — Configura otimizador (Adam) e função de perda (MSE)
- `model.predict()` — Forward pass para gerar embedding
- `tf.tensor2d()` — Cria tensor 2D a partir de array
- `tensor.data()` — Extrai dados do tensor
- `tensor.dispose()` — Libera memória (previne memory leak)

### Geração do Embedding

```typescript
const generateEmbedding = async (tf, text) => {
  const inputVec = textToInputVector(text);         // Texto → vetor 256-dim
  const inputTensor = tf.tensor2d([inputVec], [1, 256]); // Array → Tensor
  const outputTensor = model.predict(inputTensor);   // Forward pass: 256→512→256→128
  const embedding = Array.from(await outputTensor.data()); // Tensor → Array

  inputTensor.dispose();  // Libera memória GPU/CPU
  outputTensor.dispose();

  // Normaliza para vetor unitário (norma L2 = 1)
  const mag = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  return mag > 0 ? embedding.map(v => v / mag) : embedding;
};
```

### Processo de Treinamento (Batch Processing)

O treinamento processa todos os títulos em lotes de 50 registros:

1. **Inicialização**: Carrega TensorFlow.js e constrói a rede neural
2. **Busca**: Recupera registros da tabela `netflix_titles` do banco externo
3. **Vetorização**: Para cada título, concatena metadados e gera embedding de 128-dim
4. **Armazenamento**: Salva embeddings na tabela `netflix_embeddings` via Edge Function
5. **Progresso**: Atualiza barra de progresso e logs em tempo real

---

## 🔍 Método de Recomendação: Similaridade de Cosseno

### Como Funciona a Recomendação

O sistema de recomendação usa **Content-Based Filtering** com **similaridade de cosseno** para encontrar títulos semelhantes às preferências do usuário:

```
cos(A, B) = (A · B) / (||A|| × ||B||)
```

Onde:
- `A · B` = produto escalar dos vetores
- `||A||` e `||B||` = normas L2 (magnitudes) dos vetores
- Resultado: valor entre 0 e 1, onde **1 = idêntico** e **0 = sem relação**

### Fluxo da Recomendação

```
Usuário seleciona filtros (tipo, gênero, tom, duração, país)
        ↓
Filtros são concatenados em texto de consulta
        ↓
TensorFlow.js gera embedding de 128-dim da consulta (mesma rede neural do treinamento)
        ↓
Embedding é enviado ao banco PostgreSQL externo via Edge Function
        ↓
SQL calcula similaridade de cosseno contra todos os vetores armazenados
        ↓
Resultados ordenados por maior similaridade são retornados
        ↓
Interface exibe títulos com porcentagem de acurácia (similaridade)
```

### Cálculo SQL da Similaridade

A similaridade de cosseno é calculada diretamente no PostgreSQL para máxima eficiência:

```sql
SELECT
  title, type, listed_in, description,
  (SUM(a * b)) / (SQRT(SUM(a*a)) * SQRT(SUM(b*b))) AS similarity
FROM netflix_embeddings,
  UNNEST(embedding, query_embedding) AS t(a, b)
GROUP BY show_id
ORDER BY similarity DESC
LIMIT 12;
```

### Interpretação dos Resultados

| Similaridade | Significado |
|--------------|-------------|
| 90-100% | Conteúdo muito similar ao critério buscado |
| 70-89% | Boa correspondência, conteúdo relacionado |
| 50-69% | Correspondência moderada |
| < 50% | Pouca relação com os critérios |

---

## 🏗️ Estrutura do Projeto

```
src/
├── pages/
│   ├── Dashboard.tsx          # Visão geral com dados reais do banco externo
│   ├── ImportCSV.tsx          # Importação de dados CSV para o banco
│   ├── TrainModel.tsx         # Treinamento da rede neural (classe principal)
│   ├── TestRecommendation.tsx # Teste de recomendações com logs detalhados
│   └── TechnicalExplanation.tsx # Explicação técnica do sistema
├── components/
│   ├── Sidebar.tsx            # Navegação lateral
│   ├── Header.tsx             # Cabeçalho das páginas
│   ├── MovieCard.tsx          # Card de exibição de filme/série
│   ├── StatCard.tsx           # Card de estatística
│   └── ProgressBar.tsx        # Barra de progresso
└── mock/
    ├── movies.ts              # Tipos e opções de filtro
    └── stats.ts               # Dados estáticos (fallback)

supabase/functions/
├── external-db/index.ts       # Edge Function: ponte com banco PostgreSQL externo
└── train-model/index.ts       # Edge Function: treinamento (backup)
```

## 🗄️ Banco de Dados Externo (PostgreSQL)

### Tabela `netflix_titles`
Armazena os dados brutos importados do CSV (~8.809 registros):

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| show_id | TEXT (PK) | Identificador único |
| type | TEXT | "Movie" ou "TV Show" |
| title | TEXT | Nome do título |
| director | TEXT | Diretor(es) |
| cast | TEXT | Elenco |
| country | TEXT | País de origem |
| release_year | INTEGER | Ano de lançamento |
| rating | TEXT | Classificação etária |
| duration | TEXT | Duração (minutos ou temporadas) |
| listed_in | TEXT | Gêneros/categorias |
| description | TEXT | Sinopse |

### Tabela `netflix_embeddings`
Armazena os vetores gerados pela rede neural:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | SERIAL (PK) | ID auto-incremento |
| show_id | TEXT (UNIQUE) | Referência ao título |
| title | TEXT | Nome do título |
| type | TEXT | Tipo do conteúdo |
| listed_in | TEXT | Gêneros |
| description | TEXT | Sinopse |
| embedding | DOUBLE PRECISION[] | Vetor de 128 dimensões |
| created_at | TIMESTAMP | Data de criação |

## ⚙️ Tecnologias Utilizadas

| Tecnologia | Uso |
|-----------|-----|
| **React 18** | Interface do usuário (SPA) |
| **TypeScript** | Tipagem estática |
| **TensorFlow.js** | Rede neural no navegador |
| **Tailwind CSS** | Estilização |
| **Framer Motion** | Animações |
| **Recharts** | Gráficos (dashboard) |
| **PostgreSQL** | Banco de dados externo |
| **Supabase Edge Functions** | Backend serverless (ponte com banco externo) |
| **Vite** | Bundler e dev server |

## 🚀 Como Executar

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure as variáveis de ambiente (`.env`)
4. Inicie o servidor de desenvolvimento: `npm run dev`

### Fluxo de Uso

1. **Importar CSV** — Carregue o arquivo `netflix_titles.csv` na página de importação
2. **Treinar Modelo** — Gere os embeddings vetoriais clicando em "Gerar Embeddings"
3. **Testar Recomendação** — Selecione critérios e gere recomendações com similaridade de cosseno
4. **Dashboard** — Visualize estatísticas em tempo real do banco de dados
5. **Explicação Técnica** — Consulte a documentação detalhada do sistema

---

## 📚 Conceitos-Chave

- **Embedding**: Representação numérica densa de dados em espaço vetorial de alta dimensão
- **Bag-of-Characters**: Técnica de vetorização baseada na frequência de caracteres
- **Similaridade de Cosseno**: Medida do ângulo entre dois vetores (0 a 1)
- **Content-Based Filtering**: Recomendação baseada nas características do próprio conteúdo
- **Forward Pass**: Propagação dos dados através das camadas da rede neural
- **ReLU (Rectified Linear Unit)**: Função de ativação f(x) = max(0, x)
- **Sigmoid**: Função de ativação que mapeia valores entre 0 e 1
- **Adam Optimizer**: Algoritmo de otimização com taxa de aprendizado adaptativa
