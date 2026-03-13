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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
