import { supabase } from '../supabaseClient';

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

    // Build matrix of cell contents
    const matrix = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      // Pad to maxCols
      const contents = [];
      for (let i = 0; i < maxCols; i++) {
        const cell = cells[i];
        const text = cell ? cell.textContent.trim() : '';
        contents.push(text);
      }
      return contents;
    });

    // Find empty columns (all cells in column are empty)
    const emptyColIndices = [];
    for (let col = 0; col < maxCols; col++) {
      const allEmpty = matrix.every(row => !row[col]);
      if (allEmpty) emptyColIndices.push(col);
    }

    // Find empty rows (all cells in row are empty)
    const emptyRowIndices = [];
    matrix.forEach((row, idx) => {
      const allEmpty = row.every(cell => !cell);
      if (allEmpty) emptyRowIndices.push(idx);
    });

    // Remove empty columns (in reverse order to preserve indices)
    emptyColIndices.reverse().forEach(colIdx => {
      rows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        if (cells[colIdx]) {
          cells[colIdx].remove();
        }
      });
    });

    // Remove empty rows (in reverse order)
    emptyRowIndices.reverse().forEach(rowIdx => {
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
