import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('Set GEMINI_API_KEY environment variable');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const PROMPT = `You are an OCR tool that converts textbook page images to clean HTML for a rich-text editor (TipTap).

Rules:
- Output ONLY the HTML content, no wrapping <html>/<body> tags
- Use: <h1> for main chapter titles, <h2> for section titles (like "1. Артикль"), <h3> for subsections (like "1.1. Неопределенный артикль")
- Use <p> for paragraphs
- Use <strong> for bold text, <em> for italic text
- Use <table> with <thead>/<tbody>/<tr>/<th>/<td> for any tables
- Use <ul>/<ol> and <li> for lists
- Preserve the original language (Russian/English mix)
- Keep all examples, translations and explanations
- For numbered items within text (like "1. С существительным..."), use <ol> or keep as part of paragraph with the number
- Page numbers and headers like "Часть I" — include as <p><em>...</em></p>
- Do NOT add any commentary, just the HTML
- Do NOT wrap in markdown code blocks`;

const materialsDir = path.resolve('materials');
const outputDir = path.resolve('materials/html');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const files = fs.readdirSync(materialsDir)
  .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
  .sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
    return numA - numB;
  });

console.log(`Found ${files.length} pages to process\n`);

// Process specific pages or all
const args = process.argv.slice(2);
const pagesToProcess = args.length
  ? files.filter(f => args.some(a => f.includes(a)))
  : files;

for (const file of pagesToProcess) {
  const outFile = path.join(outputDir, file.replace(/\.(jpg|png)$/, '.html'));

  if (fs.existsSync(outFile)) {
    console.log(`⏭ ${file} — already done, skipping`);
    continue;
  }

  console.log(`Processing ${file}...`);

  const imgData = fs.readFileSync(path.join(materialsDir, file));
  const base64 = imgData.toString('base64');
  const mimeType = file.endsWith('.png') ? 'image/png' : 'image/jpeg';

  try {
    const result = await model.generateContent([
      PROMPT,
      { inlineData: { data: base64, mimeType } },
    ]);

    let html = result.response.text();
    // Strip markdown code fences if present
    html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

    fs.writeFileSync(outFile, html, 'utf-8');
    console.log(`  -> ${outFile} (${html.length} chars)`);
  } catch (err) {
    console.error(`  ERROR on ${file}: ${err.message}`);
  }

  // Small delay to respect rate limits
  await new Promise(r => setTimeout(r, 1000));
}

console.log('\nDone!');
