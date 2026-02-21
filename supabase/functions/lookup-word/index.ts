import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== Function started ===');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { word } = await req.json();
    console.log('Looking up word:', word);

    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    console.log('API key exists:', !!apiKey);
    console.log('API key length:', apiKey?.length || 0);


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
        messages: [{
          role: 'user',
          content: `Analyze the word "${word}". Return ONLY valid JSON (no markdown):
{
  "type": "noun/verb/adjective/etc",
  "phonetic": "/ipa_transcription/",
  "meaningEn": "brief main definition",
  "meanings": [
    {"ru": "перевод 1", "meaningEn": "definition 1", "example": "example sentence 1"},
    {"ru": "перевод 2", "meaningEn": "definition 2", "example": "example sentence 2"}
  ],
  "synonyms": "synonym1, synonym2, synonym3"
}`
        }]
      })
    });


    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('OpenRouter response:', JSON.stringify(data));

    if (!res.ok) {
      throw new Error(`OpenRouter error: ${JSON.stringify(data)}`);
    }

    let text = data.choices?.[0]?.message?.content || '';
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Пытаемся извлечь JSON из текста
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});