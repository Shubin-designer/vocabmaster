import { supabase } from '../supabaseClient';

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

  return data.html;
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

  return data.html;
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
