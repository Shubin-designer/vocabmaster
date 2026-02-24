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
    const { word } = await req.json();
    console.log('Translating word:', word);

    // Используем AI для перевода
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
        messages: [{
          role: 'user',
          content: `Translate the English word/phrase "${word}" to Russian.
Return ONLY valid JSON:
{
  "type": "noun/verb/adjective/etc",
  "level": "A1/A2/B1/B2/C1/C2",
  "meaningEn": "English definition",
  "meaningRu": "Russian translation (one word)",
  "phonetic": "/IPA/",
  "example": "Example sentence in English"
}

CRITICAL: meaningRu = ONE Russian word only, no commas!`
        }]
      })
    });

    const data = await res.json();
    let text = data.choices?.[0]?.message?.content || '';
    console.log('AI response:', text);

    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No valid JSON in response');
    }

    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Translation error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
