import { supabase } from '../supabaseClient';

/**
 * Check if cell content is effectively empty
 * Strips ALL whitespace, special chars, and checks for meaningful content
 */
function isCellEmpty(cell) {
  if (!cell) return true;

  // Get text content and innerHTML
  const text = cell.textContent || '';
  const html = cell.innerHTML || '';

  // Strip absolutely everything that's not a letter, number, or common punctuation
  const cleanedText = text.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF\n\r\t]+/g, '');
  const cleanedHtml = html.replace(/<[^>]*>/g, '').replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF\n\r\t&nbsp;]+/g, '');

  // Cell is empty if both cleaned versions are empty or just punctuation like "|"
  const finalText = cleanedText.replace(/^[|_\-—–]+$/, '');
  return finalText.length === 0 && cleanedHtml.length === 0;
}

/**
 * Clean up tables in HTML - aggressively remove empty rows and columns
 * @param {string} html - HTML content with tables
 * @returns {string} Cleaned HTML
 */
function cleanTableHtml(html) {
  if (!html || !html.includes('<table')) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');

  tables.forEach(table => {
    // Keep cleaning until no more empty rows/columns found
    let changed = true;
    while (changed) {
      changed = false;

      const rows = Array.from(table.querySelectorAll('tr'));
      if (rows.length === 0) return;

      // Get max columns count
      const maxCols = Math.max(...rows.map(row => row.querySelectorAll('td, th').length), 0);
      if (maxCols === 0) return;

      // Build matrix of cell references
      const cellMatrix = rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td, th'));
        // Pad array to maxCols
        while (cells.length < maxCols) cells.push(null);
        return cells;
      });

      // Find and remove empty columns (check each column)
      for (let col = maxCols - 1; col >= 0; col--) {
        const allEmpty = cellMatrix.every(cells => isCellEmpty(cells[col]));
        if (allEmpty) {
          // Remove this column from all rows
          cellMatrix.forEach(cells => {
            if (cells[col] && cells[col].parentNode) {
              cells[col].remove();
            }
          });
          changed = true;
        }
      }

      // Find and remove empty rows
      for (let rowIdx = rows.length - 1; rowIdx >= 0; rowIdx--) {
        const row = rows[rowIdx];
        const cells = Array.from(row.querySelectorAll('td, th'));
        const allEmpty = cells.length === 0 || cells.every(cell => isCellEmpty(cell));
        if (allEmpty) {
          row.remove();
          changed = true;
        }
      }
    }

    // If table now has no content rows, remove it
    const remainingRows = table.querySelectorAll('tr');
    if (remainingRows.length === 0) {
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
