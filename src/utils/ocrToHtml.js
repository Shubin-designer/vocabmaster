import { supabase } from '../supabaseClient';

/**
 * Get clean text content from a cell
 * Returns empty string if cell is effectively empty
 */
function getCellText(cell) {
  if (!cell) return '';

  const text = cell.textContent || '';
  // Remove all whitespace and special invisible chars
  const cleaned = text
    .replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF\n\r\t]+/g, ' ')
    .trim();

  // If only punctuation/separators, treat as empty
  if (/^[|_\-—–\s]*$/.test(cleaned)) return '';

  return cleaned;
}

/**
 * Get clean HTML content from a cell (preserving formatting like <b>, <i>)
 */
function getCellHtml(cell) {
  if (!cell) return '';

  const text = getCellText(cell);
  if (!text) return '';

  // Return innerHTML but clean up extra whitespace
  return cell.innerHTML
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Rebuild table keeping only non-empty rows and columns
 * @param {HTMLTableElement} table
 */
function rebuildTable(table) {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0) return;

  // Get max columns
  const maxCols = Math.max(...rows.map(row => row.querySelectorAll('td, th').length), 0);
  if (maxCols === 0) return;

  // Build matrix of cell HTML content
  const matrix = rows.map(row => {
    const cells = Array.from(row.querySelectorAll('td, th'));
    const rowData = [];
    for (let i = 0; i < maxCols; i++) {
      rowData.push({
        html: getCellHtml(cells[i]),
        isHeader: cells[i]?.tagName === 'TH'
      });
    }
    return rowData;
  });

  // Find which columns have any content
  const colHasContent = [];
  for (let col = 0; col < maxCols; col++) {
    colHasContent[col] = matrix.some(row => row[col]?.html);
  }

  // Find which rows have any content
  const rowHasContent = matrix.map(row => row.some(cell => cell?.html));

  // Count non-empty columns and rows
  const nonEmptyCols = colHasContent.filter(Boolean).length;
  const nonEmptyRows = rowHasContent.filter(Boolean).length;

  // If nothing to keep, remove table
  if (nonEmptyCols === 0 || nonEmptyRows === 0) {
    table.remove();
    return;
  }

  // Clear existing rows
  while (table.firstChild) {
    table.removeChild(table.firstChild);
  }

  // Rebuild with only non-empty rows and columns
  const tbody = document.createElement('tbody');

  matrix.forEach((row, rowIdx) => {
    if (!rowHasContent[rowIdx]) return; // Skip empty rows

    const tr = document.createElement('tr');

    row.forEach((cell, colIdx) => {
      if (!colHasContent[colIdx]) return; // Skip empty columns

      const td = document.createElement(cell.isHeader ? 'th' : 'td');
      td.innerHTML = cell.html || '';
      tr.appendChild(td);
    });

    if (tr.children.length > 0) {
      tbody.appendChild(tr);
    }
  });

  if (tbody.children.length > 0) {
    table.appendChild(tbody);
  } else {
    table.remove();
  }
}

/**
 * Clean up tables in HTML - rebuild tables with only non-empty rows/columns
 * @param {string} html - HTML content with tables
 * @returns {string} Cleaned HTML
 */
function cleanTableHtml(html) {
  if (!html || !html.includes('<table')) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');

  tables.forEach(table => rebuildTable(table));

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
