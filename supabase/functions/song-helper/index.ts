import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, word, title, text } = await req.json();

    let prompt = '';
    let maxTokens = 500;

    if (action === 'explain') {
      prompt = `Explain this song in Russian:\n"${title}"\n${text}\n\nInclude: main theme, metaphors, slang, cultural context. Write in Russian.`;
      maxTokens = 2000;
    } else if (action === 'translate') {
      prompt = `Translate "${word}" to Russian. ONLY the Russian translation, nothing else.`;
      maxTokens = 50;
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'HTTP-Referer': 'https://vocabmaster.vercel.app',
        'X-Title': 'VocabMaster'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const result = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});