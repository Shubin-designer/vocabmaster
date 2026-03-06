// @ts-nocheck - Deno runtime types
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // TODO: restrict to vocabmaster.vercel.app in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RootWord {
  word: string;
  type?: string;
  ipa?: string;
  ru?: string;
}

serve(async (req: Request): Promise<Response> => {
  console.log('=== fill-fields started ===');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const word = typeof body?.word === 'string' ? body.word.trim() : '';
    const fieldName = typeof body?.fieldName === 'string' ? body.fieldName : '';

    if (!word || word.length > 100) {
      return new Response(JSON.stringify({ error: 'Invalid word parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!['singleRootWords', 'synonyms'].includes(fieldName)) {
      return new Response(JSON.stringify({ error: 'Invalid fieldName' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Word:', word, 'Field:', fieldName);

    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    let prompt = '';

    if (fieldName === 'singleRootWords') {
      prompt = `Generate 5-10 words that share the SAME ROOT as "${word}".
Examples:
- For "teach" → teacher, teaching, taught, teachable (same root "teach")
- For "strange" → stranger, strangely, strangeness, estranged (same root "strange")

DO NOT provide synonyms! Only words with the same morphological root.

Return ONLY valid JSON (no markdown, no extra text):
{
  "words": [
    {"word": "teacher", "type": "noun", "ipa": "/ˈtiːtʃər/", "ru": "учитель"},
    {"word": "teaching", "type": "noun", "ipa": "/ˈtiːtʃɪŋ/", "ru": "обучение"}
  ]
}

If the word "${word}" is misspelled or doesn't exist:
- Try to find the correct spelling and use that
- If you can identify the intended word, generate roots for it
- Add "corrected": "correct_spelling" to the response

CRITICAL:
- "ru" field = ONE Russian word only (no commas, no newlines, no multiple translations)
- "ipa" field = IPA transcription in slashes
- "type" field = noun/verb/adjective/adverb`;
    } else {
      prompt = `List 5-8 synonyms for "${word}". Return JSON: {"synonyms":"syn1, syn2, syn3"}`;
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
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    let text: string = data.choices?.[0]?.message?.content || '';

    console.log('Raw response:', text);

    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.log('No JSON found in response:', text);
      return new Response(JSON.stringify({ error: 'No valid JSON in response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let parsed: { words?: string | RootWord[]; synonyms?: string; corrected?: string };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      console.log('JSON parse error, Text:', jsonMatch[0]);
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Convert array of objects to formatted string
    if (fieldName === 'singleRootWords' && Array.isArray(parsed.words)) {
      parsed.words = parsed.words
        .map((w: RootWord | string) => {
          if (typeof w === 'string') return w.replace(/\n/g, ' ').trim();
          if (!w || !w.word) return null;
          // Clean newlines and take only first translation word
          const ruClean = (w.ru || '').replace(/\n/g, ' ').split(',')[0].trim();
          const ipaClean = (w.ipa || '').replace(/\n/g, '').trim();
          return `${w.word} (${w.type || 'word'}) /${ipaClean}/ - ${ruClean}`;
        })
        .filter((w): w is string => w !== null)
        .join(', ');
    }

    console.log('Parsed:', parsed);
    console.log('Original word:', word);

    // Remove original word from list
    if (fieldName === 'singleRootWords' && typeof parsed.words === 'string') {
      const wordsArray = parsed.words.split(',').map((w: string) => w.trim());
      const filtered = wordsArray.filter((w: string) => !w.toLowerCase().startsWith(word.toLowerCase()));
      parsed.words = filtered.join(', ');
    }

    if (fieldName === 'synonyms' && parsed.synonyms) {
      const synsArray = parsed.synonyms.split(',').map((w: string) => w.trim());
      const filtered = synsArray.filter((w: string) => w.toLowerCase() !== word.toLowerCase());
      parsed.synonyms = filtered.join(', ');
    }

    return new Response(JSON.stringify(parsed), {
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
