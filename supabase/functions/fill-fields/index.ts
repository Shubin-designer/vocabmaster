import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== fill-fields started ===');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { word, fieldName } = await req.json();
    console.log('Word:', word, 'Field:', fieldName);

    let prompt = '';

    if (fieldName === 'singleRootWords') {
      prompt = `Generate 5-10 single-root words for "${word}". CRITICAL FORMAT - each word MUST have ALL 4 parts: word (part_of_speech) /IPA/ - Russian_translation. EXAMPLE for "teach": {"words":"teacher (noun) /ˈtiːtʃər/ - учитель, teaching (noun) /ˈtiːtʃɪŋ/ - обучение, taught (verb) /tɔːt/ - научил, teachable (adjective) /ˈtiːtʃəbl/ - обучаемый"}. RULES: Every word MUST have: word (type) /ipa/ - translation. Use British English IPA. Separate entries with commas. Return ONLY JSON.`;
    } else {
      prompt = `List 5-8 synonyms for "${word}". Return JSON: {"synonyms":"syn1, syn2, syn3"}`;
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
    let text = data.choices?.[0]?.message?.content || '';

    console.log('Raw response:', text);


    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch[0]);

    console.log('Parsed:', parsed);
    console.log('Original word:', word);


    // Убираем исходное слово из списка
    if (fieldName === 'singleRootWords' && parsed.words) {
      const wordsArray = parsed.words.split(',').map(w => w.trim());
      const filtered = wordsArray.filter(w => w.toLowerCase() !== word.toLowerCase());
      parsed.words = filtered.join(', ');
    }

    if (fieldName === 'synonyms' && parsed.synonyms) {
      const synsArray = parsed.synonyms.split(',').map(w => w.trim());
      const filtered = synsArray.filter(w => w.toLowerCase() !== word.toLowerCase());
      parsed.synonyms = filtered.join(', ');
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
