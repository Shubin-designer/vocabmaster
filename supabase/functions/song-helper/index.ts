// @ts-nocheck - Deno runtime types
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // TODO: restrict to vocabmaster.vercel.app in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = typeof body?.action === 'string' ? body.action : '';
    const word = typeof body?.word === 'string' ? body.word.trim() : '';
    const title = typeof body?.title === 'string' ? body.title : '';
    const text = typeof body?.text === 'string' ? body.text : '';

    if (!action || !['explain', 'translate'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    let prompt = '';
    let maxTokens = 500;

    if (action === 'explain') {
      if (!title || !text) {
        return new Response(JSON.stringify({ error: 'Title and text required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      prompt = `Explain this song in Russian:\n"${title}"\n${text.slice(0, 5000)}\n\nInclude: main theme, metaphors, slang, cultural context. Write in Russian.`;
      maxTokens = 2000;
    } else if (action === 'translate') {
      if (!word || word.length > 100) {
        return new Response(JSON.stringify({ error: 'Invalid word' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      prompt = `Translate "${word}" to Russian. ONLY the Russian translation, nothing else.`;
      maxTokens = 50;
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://vocabmaster.vercel.app',
        'X-Title': 'VocabMaster'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        temperature: 0.3,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const result = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
