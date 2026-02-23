export interface MovieRecommendation {
  title: string;
  type: string;
  year: number;
  genre: string;
  similarity: number;
  description: string;
}

export const mockRecommendations: MovieRecommendation[] = [
  {
    title: "Inception",
    type: "Movie",
    year: 2010,
    genre: "Sci-Fi, Action",
    similarity: 0.93,
    description: "A thief who steals corporate secrets through dream-sharing technology.",
  },
  {
    title: "Interstellar",
    type: "Movie",
    year: 2014,
    genre: "Sci-Fi, Drama",
    similarity: 0.91,
    description: "A team of explorers travel through a wormhole in space.",
  },
  {
    title: "The Matrix",
    type: "Movie",
    year: 1999,
    genre: "Sci-Fi, Action",
    similarity: 0.88,
    description: "A computer programmer discovers reality is a simulation.",
  },
  {
    title: "Dark",
    type: "TV Show",
    year: 2017,
    genre: "Sci-Fi, Thriller",
    similarity: 0.87,
    description: "A missing child sets four families on a frantic hunt for answers.",
  },
  {
    title: "Arrival",
    type: "Movie",
    year: 2016,
    genre: "Sci-Fi, Drama",
    similarity: 0.85,
    description: "A linguist works with the military to communicate with alien lifeforms.",
  },
];

export const filterOptions = {
  types: ["Movie", "TV Show"],
  genres: ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Thriller", "Documentary", "Romance"],
  tones: ["Sério", "Leve", "Sombrio", "Inspirador", "Tenso"],
  durations: ["Curto (< 90 min)", "Médio (90-120 min)", "Longo (> 120 min)", "Série curta (1-2 temporadas)", "Série longa (3+ temporadas)"],
  countries: ["United States", "United Kingdom", "South Korea", "Japan", "Brazil", "India", "France", "Germany"],
};
