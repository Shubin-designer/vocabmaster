const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

// Debug: check if env vars are loaded
console.log('ENV check:', {
  hasKey: !!OPENROUTER_API_KEY,
  keyPrefix: OPENROUTER_API_KEY?.substring(0, 10),
  allViteEnv: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'))
});

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

export async function ocrImageToHtml(file) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('VITE_OPENROUTER_API_KEY not set');
  }

  const base64 = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  let html = data.choices?.[0]?.message?.content || '';
  // Strip markdown code fences if present
  html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();
  // Clean up tables: remove empty rows/columns
  html = cleanTables(html);
  return html;
}

/**
 * Post-process HTML: remove empty table rows and columns
 */
function cleanTables(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const wrapper = doc.body.firstChild;

  for (const table of wrapper.querySelectorAll('table')) {
    const rows = [...table.querySelectorAll('tr')];
    if (rows.length === 0) continue;

    // 1. Remove completely empty rows
    for (const row of rows) {
      const cells = [...row.querySelectorAll('td, th')];
      if (cells.every(c => !c.textContent.trim())) {
        row.remove();
      }
    }

    // 2. Remove empty columns
    const remainingRows = [...table.querySelectorAll('tr')];
    if (remainingRows.length === 0) { table.remove(); continue; }

    const colCount = Math.max(...remainingRows.map(r => r.children.length));
    // Find which columns are entirely empty
    const emptyCols = [];
    for (let col = colCount - 1; col >= 0; col--) {
      const allEmpty = remainingRows.every(r => {
        const cell = r.children[col];
        return !cell || !cell.textContent.trim();
      });
      if (allEmpty) emptyCols.push(col);
    }
    // Remove empty columns (iterate in reverse order so indices stay valid)
    for (const col of emptyCols) {
      for (const row of remainingRows) {
        if (row.children[col]) row.children[col].remove();
      }
    }

    // 3. Remove empty tbody/thead wrappers
    for (const section of table.querySelectorAll('thead, tbody')) {
      if (!section.querySelector('tr')) section.remove();
    }

    // 4. If table has no rows left, remove it
    if (!table.querySelector('tr')) table.remove();
  }

  return wrapper.innerHTML;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
