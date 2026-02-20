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

    // Free Dictionary API
    const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const dictData = await dictRes.json();

    // Перевод через MyMemory (бесплатно, без ключа)
    const definition = dictData[0]?.meanings[0]?.definitions[0]?.definition || word;
    const transRes = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(definition)}&langpair=en|ru`
    );
    const transData = await transRes.json();

    const result = {
      type: dictData[0]?.meanings[0]?.partOfSpeech || 'word',
      level: 'B1',
      meaningEn: definition,
      meaningRu: transData.responseData?.translatedText || '',
      phonetic: dictData[0]?.phonetic || '',
      example: dictData[0]?.meanings[0]?.definitions[0]?.example || ''
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