// @ts-nocheck - Deno runtime types
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // TODO: restrict to vocabmaster.vercel.app in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SingleRootWord {
  word: string;
  type: string;
  ipa: string;
  ru: string;
}

interface LookupResponse {
  level?: string;
  phonetic?: string;
  meanings?: Array<{ type: string; ru: string; meaningEn: string; example: string }>;
  singleRootWords?: SingleRootWord[] | string;
  synonyms?: string;
  error?: string;
  suggestions?: string[];
}

serve(async (req: Request): Promise<Response> => {
  console.log('=== Function started ===');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const word = typeof body?.word === 'string' ? body.word.trim() : '';

    if (!word || word.length > 100) {
      return new Response(JSON.stringify({ error: 'Invalid word parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Looking up word:', word);

    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      throw new Error('API key not configured');
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
        messages: [{
          role: 'user',
          content: `Analyze the English word "${word}". Return ONLY valid JSON (no markdown):
{
  "level": "A1/A2/B1/B2/C1/C2",
  "phonetic": "/ipa_transcription/",
  "meanings": [
    {"type": "verb", "ru": "основной перевод", "meaningEn": "definition in English", "example": "example sentence 10-15 words"},
    {"type": "verb", "ru": "другой перевод", "meaningEn": "another definition", "example": "another example"},
    {"type": "noun", "ru": "перевод как сущ.", "meaningEn": "noun definition", "example": "noun example"}
  ],
  "singleRootWords": [
    {"word": "related1", "type": "noun", "ipa": "/ipa/", "ru": "перевод"},
    {"word": "related2", "type": "verb", "ipa": "/ipa/", "ru": "перевод"}
  ],
  "synonyms": "synonym1, synonym2, synonym3"
}

CRITICAL REQUIREMENTS:
1. MEANINGS - provide 4-8 meanings covering:
   - ALL common Russian translations (e.g. for "spear": копьё, пронзить, пронзить копьём)
   - Include BOTH single-word AND phrase translations where appropriate
   - ALL parts of speech the word can be (verb, noun, adjective, etc.)
   - Each meaning = separate object with its own type, ru, meaningEn, example
   - "ru" field = ONE translation (can be a word OR short phrase, but no commas)
   - Start with most common/basic translations first!

2. TYPE field is REQUIRED for each meaning (noun/verb/adjective/adverb/phrasal verb/idiom/phrase/preposition/conjunction/interjection)

3. singleRootWords = array of objects with word, type, ipa, ru fields

4. Provide REAL, NATURAL examples (not artificial)

5. IF THE WORD IS MISSPELLED OR DOESN'T EXIST:
   - Add "error": "Word not found or misspelled"
   - Add "suggestions": ["correct1", "correct2", "correct3"] with possible correct spellings
   - Still try to provide meanings if you can guess the intended word`
        }]
      })
    });

    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('OpenRouter response:', JSON.stringify(data));

    if (!res.ok) {
      throw new Error(`OpenRouter error: ${JSON.stringify(data)}`);
    }

    let text: string = data.choices?.[0]?.message?.content || '';
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('ERROR: No JSON found in response');
      throw new Error('No valid JSON found in response');
    }

    console.log('JSON extracted, parsing...');

    const parsed: LookupResponse = JSON.parse(jsonMatch[0]);
    console.log('Parsed successfully:', Object.keys(parsed));

    // Convert array to formatted string
    if (Array.isArray(parsed.singleRootWords)) {
      parsed.singleRootWords = parsed.singleRootWords
        .map((w: SingleRootWord) => `${w.word} (${w.type}) /${w.ipa}/ - ${w.ru}`)
        .join(', ');
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err: unknown) {
    console.error('=== ERROR in lookup-word ===');
    const message = err instanceof Error ? err.message : 'Unknown error';
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('Error:', message);
    if (stack) console.error('Stack:', stack);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
