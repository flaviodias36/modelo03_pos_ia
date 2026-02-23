import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getConnection = async () => {
  const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.5/mod.js");
  
  const sql = postgres({
    hostname: Deno.env.get("EXTERNAL_DB_HOST")!,
    database: Deno.env.get("EXTERNAL_DB_NAME")!,
    username: Deno.env.get("EXTERNAL_DB_USER")!,
    password: Deno.env.get("EXTERNAL_DB_PASSWORD")!,
    port: 5432,
    ssl: false,
  });
  
  return sql;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let sql;
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    sql = await getConnection();

    if (action === "create-table") {
      // Drop and recreate to ensure correct schema
      await sql`DROP TABLE IF EXISTS netflix_titles`;
      await sql`
        CREATE TABLE netflix_titles (
          show_id TEXT PRIMARY KEY,
          type TEXT,
          title TEXT,
          director TEXT,
          "cast" TEXT,
          country TEXT,
          date_added TEXT,
          release_year INTEGER,
          rating TEXT,
          duration TEXT,
          listed_in TEXT,
          description TEXT
        )
      `;
      await sql.end();
      return new Response(JSON.stringify({ success: true, message: "Tabela criada com sucesso" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "import" && req.method === "POST") {
      const { records } = await req.json();
      
      // Auto-fix schema: alter VARCHAR columns to TEXT if needed
      try {
        await sql`ALTER TABLE netflix_titles ALTER COLUMN show_id TYPE TEXT`;
        await sql`ALTER TABLE netflix_titles ALTER COLUMN type TYPE TEXT`;
        await sql`ALTER TABLE netflix_titles ALTER COLUMN rating TYPE TEXT`;
        await sql`ALTER TABLE netflix_titles ALTER COLUMN duration TYPE TEXT`;
      } catch (_) { /* columns may already be TEXT */ }
      
      // Batch insert using a transaction
      let imported = 0;
      await sql.begin(async (tx: any) => {
        for (const r of records) {
          await tx`
            INSERT INTO netflix_titles (show_id, type, title, director, "cast", country, date_added, release_year, rating, duration, listed_in, description)
            VALUES (${r.show_id || ''}, ${r.type || ''}, ${r.title || ''}, ${r.director || ''}, ${r.cast || ''}, ${r.country || ''}, ${r.date_added || ''}, ${r.release_year ? parseInt(String(r.release_year)) : null}, ${r.rating || ''}, ${r.duration || ''}, ${r.listed_in || ''}, ${r.description || ''})
            ON CONFLICT (show_id) DO UPDATE SET
              type = EXCLUDED.type,
              title = EXCLUDED.title,
              director = EXCLUDED.director,
              "cast" = EXCLUDED."cast",
              country = EXCLUDED.country,
              date_added = EXCLUDED.date_added,
              release_year = EXCLUDED.release_year,
              rating = EXCLUDED.rating,
              duration = EXCLUDED.duration,
              listed_in = EXCLUDED.listed_in,
              description = EXCLUDED.description
          `;
          imported++;
        }
      });
      
      await sql.end();
      return new Response(JSON.stringify({ success: true, imported }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "count") {
      const result = await sql`SELECT COUNT(*) as total FROM netflix_titles`;
      await sql.end();
      return new Response(JSON.stringify({ success: true, total: Number(result[0].total) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "preview") {
      const limit = url.searchParams.get("limit") || "10";
      const offset = url.searchParams.get("offset") || "0";
      const result = await sql`SELECT * FROM netflix_titles ORDER BY show_id LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
      await sql.end();
      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-embeddings-table") {
      await sql`
        CREATE TABLE IF NOT EXISTS netflix_embeddings (
          id SERIAL PRIMARY KEY,
          show_id TEXT NOT NULL UNIQUE,
          title TEXT,
          type TEXT,
          listed_in TEXT,
          description TEXT,
          embedding DOUBLE PRECISION[] NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await sql.end();
      return new Response(JSON.stringify({ success: true, message: "Tabela netflix_embeddings criada no banco externo" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "store-embeddings" && req.method === "POST") {
      const { embeddings } = await req.json();
      let stored = 0;
      await sql.begin(async (tx: any) => {
        for (const e of embeddings) {
          await tx`
            INSERT INTO netflix_embeddings (show_id, title, type, listed_in, description, embedding)
            VALUES (${e.show_id}, ${e.title || ''}, ${e.type || ''}, ${e.listed_in || ''}, ${e.description || ''}, ${e.embedding})
            ON CONFLICT (show_id) DO UPDATE SET
              title = EXCLUDED.title,
              type = EXCLUDED.type,
              listed_in = EXCLUDED.listed_in,
              description = EXCLUDED.description,
              embedding = EXCLUDED.embedding,
              created_at = NOW()
          `;
          stored++;
        }
      });
      await sql.end();
      return new Response(JSON.stringify({ success: true, stored }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "embedding-count") {
      try {
        const result = await sql`SELECT COUNT(*) as total FROM netflix_embeddings`;
        await sql.end();
        return new Response(JSON.stringify({ success: true, count: Number(result[0].total) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (_) {
        await sql.end();
        return new Response(JSON.stringify({ success: true, count: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    await sql.end();
    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    if (sql) try { await sql.end(); } catch (_) {}
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
