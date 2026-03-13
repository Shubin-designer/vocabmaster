import * as pdfjsLib from 'pdfjs-dist';

// Set worker path to CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Load a PDF file and return the document
 * @param {File} file - PDF file to load
 * @returns {Promise<PDFDocumentProxy>}
 */
export async function loadPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf;
}

/**
 * Render a PDF page to a canvas element
 * @param {PDFDocumentProxy} pdf - PDF document
 * @param {number} pageNum - Page number (1-indexed)
 * @param {HTMLCanvasElement} canvas - Target canvas
 * @param {number} scale - Scale factor (default 1.5)
 */
export async function renderPageToCanvas(pdf, pageNum, canvas, scale = 1.5) {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  return { width: viewport.width, height: viewport.height };
}

/**
 * Render a PDF page to a Blob (PNG)
 * @param {PDFDocumentProxy} pdf - PDF document
 * @param {number} pageNum - Page number (1-indexed)
 * @param {number} scale - Scale factor (default 2.0 for OCR quality)
 * @returns {Promise<Blob>}
 */
export async function renderPageToBlob(pdf, pageNum, scale = 2.0) {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
}

/**
 * Generate a thumbnail for a PDF page
 * @param {PDFDocumentProxy} pdf - PDF document
 * @param {number} pageNum - Page number (1-indexed)
 * @param {number} maxHeight - Maximum height in pixels (default 120)
 * @returns {Promise<string>} Data URL for thumbnail
 */
export async function generateThumbnail(pdf, pageNum, maxHeight = 120) {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });

  const scale = maxHeight / viewport.height;
  const scaledViewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  const ctx = canvas.getContext('2d');

  await page.render({
    canvasContext: ctx,
    viewport: scaledViewport,
  }).promise;

  return canvas.toDataURL('image/jpeg', 0.7);
}

/**
 * Convert Blob to base64 string (without data URL prefix)
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
