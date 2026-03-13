import { supabase } from '../supabaseClient';

/**
 * Check if cell content is effectively empty
 * (empty string, only whitespace, or non-breaking spaces)
 */
function isCellEmpty(text) {
  if (!text) return true;
  // Remove all whitespace including nbsp
  const cleaned = text.replace(/[\s\u00A0\u200B]+/g, '');
  return cleaned.length === 0;
}

/**
 * Clean up tables in HTML - remove empty rows and columns
 * @param {string} html - HTML content with tables
 * @returns {string} Cleaned HTML
 */
function cleanTableHtml(html) {
  if (!html || !html.includes('<table')) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');

  tables.forEach(table => {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return;

    // Get max columns count
    const maxCols = Math.max(...rows.map(row => row.querySelectorAll('td, th').length));
    if (maxCols === 0) return;

    // Build matrix of cell contents and references
    const cellMatrix = rows.map(row => Array.from(row.querySelectorAll('td, th')));
    const textMatrix = cellMatrix.map(cells =>
      Array.from({ length: maxCols }, (_, i) =>
        cells[i] ? cells[i].textContent : ''
      )
    );

    // Find empty columns (all cells in column are empty)
    const emptyColIndices = [];
    for (let col = 0; col < maxCols; col++) {
      const allEmpty = textMatrix.every(row => isCellEmpty(row[col]));
      if (allEmpty) emptyColIndices.push(col);
    }

    // Find empty rows (all cells in row are empty)
    const emptyRowIndices = [];
    textMatrix.forEach((row, idx) => {
      const allEmpty = row.every(cell => isCellEmpty(cell));
      if (allEmpty) emptyRowIndices.push(idx);
    });

    // Remove empty columns (in reverse order to preserve indices)
    emptyColIndices.sort((a, b) => b - a).forEach(colIdx => {
      cellMatrix.forEach(cells => {
        if (cells[colIdx]) {
          cells[colIdx].remove();
        }
      });
    });

    // Remove empty rows (in reverse order)
    emptyRowIndices.sort((a, b) => b - a).forEach(rowIdx => {
      if (rows[rowIdx]) {
        rows[rowIdx].remove();
      }
    });

    // If table now has no rows, remove it
    if (table.querySelectorAll('tr').length === 0) {
      table.remove();
    }
  });

  return doc.body.innerHTML;
}

export async function ocrImageToHtml(file) {
  const base64 = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';

  const { data, error } = await supabase.functions.invoke('ocr-image', {
    body: { base64, mimeType }
  });

  if (error) {
    throw new Error(error.message || 'OCR failed');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return cleanTableHtml(data.html);
}

/**
 * OCR a Blob (e.g., from canvas) to HTML
 * @param {Blob} blob - Image blob
 * @returns {Promise<string>} HTML content
 */
export async function ocrBlobToHtml(blob) {
  const base64 = await blobToBase64(blob);
  const mimeType = blob.type || 'image/png';

  const { data, error } = await supabase.functions.invoke('ocr-image', {
    body: { base64, mimeType }
  });

  if (error) {
    throw new Error(error.message || 'OCR failed');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return cleanTableHtml(data.html);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
