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
    const synRes = await fetch(`https://api.datamuse.com/words?rel_syn=${word}&max=6`);
    const synData = await synRes.json();

    // Берем ВСЕ meanings (все части речи)
    const allMeanings = dictData[0]?.meanings || [];

    // Для КАЖДОГО meaning берем первое definition
    const meanings = [];
    for (let i = 0; i < allMeanings.length; i++) {
      const meaning = allMeanings[i];
      const definitions = meaning.definitions.slice(0, 2);

      for (const def of definitions) {
        let cleanDef = def.definition.split(/\.\s*Example:/i)[0].trim();

        // Берём первые 3 слова из definition как подсказку
        const hint = cleanDef.split(' ').slice(0, 3).join(' ');

        // Переводим: "word (hint)"
        const transRes = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|ru&context=${encodeURIComponent(hint)}`
        );
        const transData = await transRes.json();

        meanings.push({
          ru: transData.responseData?.translatedText || word,
          meaningEn: cleanDef,
          example: def.example || '',
          partOfSpeech: meaning.partOfSpeech
        });
      }
    }

    // Первое определение
    const firstMeaning = allMeanings[0]?.definitions[0];
    let mainDef = firstMeaning?.definition || '';
    mainDef = mainDef.split(/\.\s*Example:/i)[0].trim();

    // Формируем ответ
    const result = {
      type: allMeanings[0]?.partOfSpeech || 'word',
      phonetic: dictData[0]?.phonetic || '',
      meaningEn: mainDef,
      meanings: meanings,
      synonyms: synData.map(s => s.word).slice(0, 5).join(', ')
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