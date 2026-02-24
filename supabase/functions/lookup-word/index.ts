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
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: `Analyze the word "${word}". Return ONLY valid JSON (no markdown):
        {
          "type": "noun/verb/adjective/etc",
          "level": "A1/A2/B1/B2/C1/C2",
          "phonetic": "/ipa_transcription/",
          "meaningEn": "brief main definition",
          "meanings": [
            {"ru": "перевод 1", "meaningEn": "definition 1", "example": "natural example (10-15 words)"},
            {"ru": "перевод 2", "meaningEn": "definition 2", "example": "natural example (10-15 words)"}
          ],
          "singleRootWords": [
            {"word": "teacher", "type": "noun", "ipa": "/ˈtiːtʃər/", "ru": "учитель"},
            {"word": "teaching", "type": "noun", "ipa": "/ˈtiːtʃɪŋ/", "ru": "обучение"}
          ],
          "synonyms": "synonym1, synonym2, synonym3"
        }
        CRITICAL: singleRootWords MUST be an array of objects with word, type, ipa, ru fields!
        IMPORTANT: ru field must be ONE word only, no commas!`

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


    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('ERROR: No JSON found in response');
      console.log('Full text:', text);
      throw new Error('No valid JSON found in response');
    }

    console.log('JSON extracted, parsing...');

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('Parsed successfully:', Object.keys(parsed));


    // Конвертируем массив в строку нужного формата
    if (Array.isArray(parsed.singleRootWords)) {
      parsed.singleRootWords = parsed.singleRootWords
        .map(w => `${w.word} (${w.type}) /${w.ipa}/ - ${w.ru}`)
        .join(', ');
    }

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