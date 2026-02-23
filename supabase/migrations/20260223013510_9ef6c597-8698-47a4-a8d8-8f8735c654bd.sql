
-- Table to store TF.js generated embeddings for recommendation
CREATE TABLE public.netflix_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  show_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type TEXT,
  listed_in TEXT,
  description TEXT,
  embedding FLOAT8[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster lookups by show_id
CREATE INDEX idx_netflix_embeddings_show_id ON public.netflix_embeddings (show_id);

-- Disable RLS since this is public knowledge data (movie catalog), not user-specific
ALTER TABLE public.netflix_embeddings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read embeddings (public catalog data)
CREATE POLICY "Anyone can read embeddings"
  ON public.netflix_embeddings
  FOR SELECT
  USING (true);

-- Allow service role to insert/update (from edge functions)
CREATE POLICY "Service role can manage embeddings"
  ON public.netflix_embeddings
  FOR ALL
  USING (true)
  WITH CHECK (true);
