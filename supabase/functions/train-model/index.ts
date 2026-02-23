import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Store embeddings batch
    if (action === "store-embeddings" && req.method === "POST") {
      const { embeddings } = await req.json();

      const { error } = await supabase
        .from("netflix_embeddings")
        .upsert(
          embeddings.map((e: any) => ({
            show_id: e.show_id,
            title: e.title,
            type: e.type,
            listed_in: e.listed_in,
            description: e.description,
            embedding: e.embedding,
          })),
          { onConflict: "show_id" }
        );

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, stored: embeddings.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get embedding count
    if (action === "embedding-count") {
      const { count } = await supabase
        .from("netflix_embeddings")
        .select("*", { count: "exact", head: true });

      return new Response(JSON.stringify({ success: true, count: count || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
