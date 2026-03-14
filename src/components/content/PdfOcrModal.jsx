import { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, ScanText, Check } from 'lucide-react';
import { loadPdfFromUrl, renderPageToCanvas, renderPageToBlob, generateThumbnail } from '../../utils/pdfUtils';
import { ocrBlobToHtml } from '../../utils/ocrToHtml';
import PdfPageThumbnail from './PdfPageThumbnail';

export default function PdfOcrModal({ pdf, isDark, onComplete, onClose }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [ocrProgress, setOcrProgress] = useState({ status: 'idle', current: 0, total: 0 });
  const [ocrText, setOcrText] = useState('');

  const canvasRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const doc = await loadPdfFromUrl(pdf.signedUrl);
        setPdfDoc(doc);

        const thumbs = [];
        for (let i = 1; i <= doc.numPages; i++) {
          thumbs.push({ pageNum: i, dataUrl: null, status: 'pending' });
        }
        setThumbnails(thumbs);

        for (let i = 1; i <= doc.numPages; i++) {
          const dataUrl = await generateThumbnail(doc, i);
          setThumbnails(prev => prev.map(t => t.pageNum === i ? { ...t, dataUrl } : t));
        }
      } catch (err) {
        console.error('Failed to load PDF:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pdf.signedUrl]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    renderPageToCanvas(pdfDoc, currentPage, canvasRef.current, 1.2);
  }, [pdfDoc, currentPage]);

  const togglePageSelection = (pageNum) => {
    setSelectedPages(prev =>
      prev.includes(pageNum) ? prev.filter(p => p !== pageNum) : [...prev, pageNum].sort((a, b) => a - b)
    );
  };

  const runOcr = async () => {
    if (selectedPages.length === 0 || !pdfDoc) return;

    setOcrProgress({ status: 'processing', current: 0, total: selectedPages.length });
    setOcrText('');
    setThumbnails(prev => prev.map(t => selectedPages.includes(t.pageNum) ? { ...t, status: 'processing' } : t));

    const textParts = [];
    try {
      for (let i = 0; i < selectedPages.length; i++) {
        const pageNum = selectedPages[i];
        setOcrProgress(prev => ({ ...prev, current: i + 1 }));
        const blob = await renderPageToBlob(pdfDoc, pageNum, 2.0);
        const html = await ocrBlobToHtml(blob);
        // Extract text from HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const text = doc.body.textContent || '';
        textParts.push(text);
        setThumbnails(prev => prev.map(t => t.pageNum === pageNum ? { ...t, status: 'done' } : t));
      }
      setOcrText(textParts.join('\n\n'));
      setOcrProgress({ status: 'done', current: selectedPages.length, total: selectedPages.length });
    } catch (err) {
      setOcrProgress({ status: 'error', current: 0, total: selectedPages.length });
      setThumbnails(prev => prev.map(t => selectedPages.includes(t.pageNum) && t.status === 'processing' ? { ...t, status: 'error' } : t));
    }
  };

  const handleComplete = () => {
    onComplete(ocrText);
  };

  const isProcessing = ocrProgress.status === 'processing';
  const hasOcrContent = ocrText.trim().length > 0;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <Loader2 size={40} className="animate-spin text-pink-vibrant" />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div
        className={`rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col ${
          isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {pdf.title} - OCR
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Thumbnails */}
          <div className={`w-20 flex-shrink-0 overflow-y-auto border-r p-2 space-y-2 ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
            {thumbnails.map(thumb => (
              <PdfPageThumbnail
                key={thumb.pageNum}
                pageNum={thumb.pageNum}
                thumbnail={thumb.dataUrl}
                isSelected={selectedPages.includes(thumb.pageNum)}
                isActive={currentPage === thumb.pageNum}
                status={thumb.status}
                onSelect={() => togglePageSelection(thumb.pageNum)}
                onClick={() => setCurrentPage(thumb.pageNum)}
                isDark={isDark}
              />
            ))}
          </div>

          {/* Page view */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-auto bg-gray-400 flex items-start justify-center p-4">
              <canvas ref={canvasRef} className="shadow-xl" style={{ maxWidth: '100%' }} />
            </div>
            <div className={`flex items-center justify-between p-3 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <button onClick={() => currentPage > 1 && setCurrentPage(p => p - 1)} disabled={currentPage <= 1} className={`p-1.5 rounded disabled:opacity-30 ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 text-gray-700'}`}>
                  <ChevronLeft size={18} />
                </button>
                <span className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}>{currentPage} / {pdfDoc?.numPages || 0}</span>
                <button onClick={() => currentPage < (pdfDoc?.numPages || 0) && setCurrentPage(p => p + 1)} disabled={currentPage >= (pdfDoc?.numPages || 0)} className={`p-1.5 rounded disabled:opacity-30 ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 text-gray-700'}`}>
                  <ChevronRight size={18} />
                </button>
              </div>
              <button onClick={runOcr} disabled={selectedPages.length === 0 || isProcessing} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${selectedPages.length === 0 || isProcessing ? isDark ? 'bg-white/5 text-white/30' : 'bg-gray-200 text-gray-400' : 'bg-pink-vibrant text-white'}`}>
                {isProcessing ? <><Loader2 size={16} className="animate-spin" />{ocrProgress.current}/{ocrProgress.total}</> : <><ScanText size={16} />OCR {selectedPages.length > 0 && `(${selectedPages.length})`}</>}
              </button>
            </div>
          </div>

          {/* OCR Result */}
          <div className={`w-1/3 flex flex-col border-l ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <div className={`p-3 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <span className={`text-sm font-medium ${isDark ? 'text-white/70' : 'text-gray-700'}`}>OCR Result</span>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {hasOcrContent ? (
                <textarea
                  value={ocrText}
                  onChange={e => setOcrText(e.target.value)}
                  className={`w-full h-full resize-none rounded-lg p-3 text-sm font-mono ${
                    isDark
                      ? 'bg-white/[0.03] border border-white/10 text-white'
                      : 'bg-gray-50 border border-gray-200 text-gray-900'
                  }`}
                />
              ) : (
                <div className={`h-full flex flex-col items-center justify-center ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                  <ScanText size={40} className="mb-3" />
                  <p className="text-sm text-center">Select pages and run OCR</p>
                </div>
              )}
            </div>
            {hasOcrContent && (
              <div className={`p-3 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <button
                  onClick={handleComplete}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-green-600 text-white hover:bg-green-500"
                >
                  <Check size={18} /> Use This Text
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
