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

    // 1. Free Dictionary API
    const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const dictData = await dictRes.json();

    // 2. Datamuse для синонимов
    const synoRes = await fetch(`https://api.datamuse.com/words?rel_syn=${word}&max=10`);
    const synoData = await synoRes.json();

    // 3. LibreTranslate для перевода
    const definition = dictData[0]?.meanings[0]?.definitions[0]?.definition || word;
    const transRes = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      body: JSON.stringify({
        q: definition,
        source: 'en',
        target: 'ru'
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    const transData = await transRes.json();

    // Формируем ответ
    const result = {
      type: dictData[0]?.meanings[0]?.partOfSpeech || 'word',
      phonetic: dictData[0]?.phonetic || '',
      meaningEn: definition,
      meanings: dictData[0]?.meanings[0]?.definitions?.slice(0, 3).map(d => ({
        ru: transData.translatedText || '',
        example: d.example || ''
      })) || [],
      synonyms: synoData.map(s => s.word).join(', ')
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});