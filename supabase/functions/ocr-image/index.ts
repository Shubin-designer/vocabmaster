// @ts-nocheck - Deno runtime types
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROMPT = `You are an OCR tool. Convert the textbook page image to clean HTML for a rich-text editor (TipTap).

Rules:
- Output ONLY HTML content, no wrapping <html>/<body> tags, no markdown code fences
- Use <h1> for main chapter titles, <h2> for section titles (like "1. Артикль"), <h3> for subsections (like "1.1. Неопределенный артикль")
- Use <p> for paragraphs
- Use <strong> for bold text, <em> for italic text
- Use <blockquote> ONLY for remarks, notes, and "Примечание" blocks that have a visible sidebar/indent in the original image. Do NOT use blockquote for examples or word pairs.
- Use <table> with <tbody>/<tr>/<td> for ANY data in two or more columns — word pairs (English + Russian translation), vocabulary lists with translations, conjugation tables, etc. If you see aligned columns of text, it MUST be a <table>, never plain text or blockquote.
- CRITICAL table rules: use ONLY as many columns as there are actual data columns (usually 2 for word pairs: English | Translation). Do NOT add empty cells or extra columns. Do NOT add empty rows between data rows. Do NOT use <thead>/<th> for simple word pair tables — just <tbody> with <td>. Every cell must contain text.
- Use <ul>/<ol> and <li> for lists
- Preserve the original language (Russian/English mix)
- Keep all examples, translations and explanations
- CRITICAL: Remove hyphenation artifacts — when a word is split across lines with a hyphen (e.g. "яблo-\\nко" or "исчисля-\\nемыми"), join it back into one word ("яблоко", "исчисляемыми"). Do NOT keep mid-word line-break hyphens.
- Merge text that belongs to the same paragraph into one <p> — do NOT split a single paragraph into multiple <p> tags just because of line breaks in the image
- Page numbers, running headers like "Часть I" — skip them entirely
- Do NOT add any commentary, just the HTML`;

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { base64, mimeType } = await req.json();

    if (!base64 || !mimeType) {
      return new Response(JSON.stringify({ error: 'Missing base64 or mimeType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    console.log('Processing OCR request, image size:', base64.length);

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://vocabmaster.vercel.app',
        'X-Title': 'VocabMaster'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
          ]
        }]
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API error: ${res.status} ${err}`);
    }

    const data = await res.json();
    let html = data.choices?.[0]?.message?.content || '';

    // Strip markdown code fences if present
    html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

    // Clean up tables
    html = cleanTables(html);

    console.log('OCR completed, HTML length:', html.length);

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err: unknown) {
    console.error('OCR error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function cleanTables(html: string): string {
  // Simple server-side table cleanup
  // Remove empty table rows
  html = html.replace(/<tr>\s*(<td>\s*<\/td>\s*)+<\/tr>/gi, '');
  // Remove empty tables
  html = html.replace(/<table>\s*(<tbody>\s*)?<\/tbody>?\s*<\/table>/gi, '');
  return html;
}
