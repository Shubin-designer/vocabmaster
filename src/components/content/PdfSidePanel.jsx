import { useState, useRef, useEffect } from 'react';
import { Upload, ChevronLeft, ChevronRight, Loader2, X, ScanText, FileText, Plus } from 'lucide-react';
import { loadPdf, renderPageToCanvas, renderPageToBlob, generateThumbnail } from '../../utils/pdfUtils';
import { ocrBlobToHtml } from '../../utils/ocrToHtml';
import PdfPageThumbnail from './PdfPageThumbnail';

export default function PdfSidePanel({ onInsert, isDark }) {
  const [pdf, setPdf] = useState(null);
  const [fileName, setFileName] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [ocrProgress, setOcrProgress] = useState({ status: 'idle', current: 0, total: 0, error: null });
  const [ocrHtml, setOcrHtml] = useState('');
  const [hasTextSelected, setHasTextSelected] = useState(false);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const ocrContentRef = useRef(null);

  // Load PDF
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setLoading(true);
    setFileName(file.name);
    setOcrHtml('');
    setSelectedPages([]);
    setOcrProgress({ status: 'idle', current: 0, total: 0, error: null });

    try {
      const pdfDoc = await loadPdf(file);
      setPdf(pdfDoc);
      setTotalPages(pdfDoc.numPages);
      setCurrentPage(1);

      const thumbs = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        thumbs.push({ pageNum: i, dataUrl: null, status: 'pending' });
      }
      setThumbnails(thumbs);

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const dataUrl = await generateThumbnail(pdfDoc, i);
        setThumbnails(prev => prev.map(t =>
          t.pageNum === i ? { ...t, dataUrl } : t
        ));
      }
    } catch (err) {
      console.error('Failed to load PDF:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    renderPageToCanvas(pdf, currentPage, canvasRef.current, 1.2);
  }, [pdf, currentPage]);

  // Track selection in OCR content
  useEffect(() => {
    const checkSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setHasTextSelected(false);
        return;
      }
      const ocrEl = ocrContentRef.current;
      if (!ocrEl) {
        setHasTextSelected(false);
        return;
      }
      const range = selection.getRangeAt(0);
      setHasTextSelected(ocrEl.contains(range.commonAncestorContainer));
    };
    document.addEventListener('selectionchange', checkSelection);
    return () => document.removeEventListener('selectionchange', checkSelection);
  }, []);

  const togglePageSelection = (pageNum) => {
    setSelectedPages(prev =>
      prev.includes(pageNum)
        ? prev.filter(p => p !== pageNum)
        : [...prev, pageNum].sort((a, b) => a - b)
    );
  };

  const runOcr = async () => {
    if (selectedPages.length === 0 || !pdf) return;

    setOcrProgress({ status: 'processing', current: 0, total: selectedPages.length, error: null });
    setOcrHtml('');

    setThumbnails(prev => prev.map(t =>
      selectedPages.includes(t.pageNum) ? { ...t, status: 'processing' } : t
    ));

    const htmlParts = [];

    try {
      for (let i = 0; i < selectedPages.length; i++) {
        const pageNum = selectedPages[i];
        setOcrProgress(prev => ({ ...prev, current: i + 1 }));

        const blob = await renderPageToBlob(pdf, pageNum, 2.0);
        const html = await ocrBlobToHtml(blob);
        htmlParts.push(html);

        setThumbnails(prev => prev.map(t =>
          t.pageNum === pageNum ? { ...t, status: 'done' } : t
        ));
      }

      const combinedHtml = htmlParts.join('<hr>');
      setOcrHtml(combinedHtml);
      setOcrProgress({ status: 'done', current: selectedPages.length, total: selectedPages.length, error: null });
    } catch (err) {
      console.error('OCR failed:', err);
      setOcrProgress({ status: 'error', current: 0, total: selectedPages.length, error: err.message });

      setThumbnails(prev => prev.map(t =>
        selectedPages.includes(t.pageNum) && t.status === 'processing' ? { ...t, status: 'error' } : t
      ));
    }
  };

  const getSelectionHtml = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

    const ocrEl = ocrContentRef.current;
    if (!ocrEl) return null;

    const range = selection.getRangeAt(0);
    if (!ocrEl.contains(range.commonAncestorContainer)) return null;

    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    return container.innerHTML;
  };

  const handleInsertSelection = () => {
    const html = getSelectionHtml();
    if (html && html.trim()) {
      onInsert?.(html);
    }
  };

  const handleInsertAll = () => {
    if (ocrHtml && ocrHtml.trim()) {
      onInsert?.(ocrHtml);
    }
  };

  const closePdf = () => {
    setPdf(null);
    setFileName('');
    setTotalPages(0);
    setCurrentPage(1);
    setThumbnails([]);
    setSelectedPages([]);
    setOcrHtml('');
    setOcrProgress({ status: 'idle', current: 0, total: 0, error: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isProcessing = ocrProgress.status === 'processing';
  const hasOcrContent = ocrHtml && ocrHtml.trim().length > 0;

  // No PDF loaded
  if (!pdf) {
    return (
      <div className="h-full flex flex-col">
        <div className={`p-3 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            PDF Import
          </h3>
        </div>
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 flex flex-col items-center justify-center p-6 cursor-pointer transition-all ${
            isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'
          }`}
        >
          {loading ? (
            <Loader2 className="w-10 h-10 animate-spin text-pink-vibrant mb-3" />
          ) : (
            <Upload className={`w-10 h-10 mb-3 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
          )}
          <p className={`text-sm font-medium mb-1 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
            {loading ? 'Loading...' : 'Load PDF'}
          </p>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
            Click to select file
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={`flex items-center justify-between p-2 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <FileText className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
          <span className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {fileName}
          </span>
        </div>
        <button
          onClick={closePdf}
          className={`p-1 rounded ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
        >
          <X size={14} />
        </button>
      </div>

      {/* Thumbnails */}
      <div className={`flex gap-1 p-2 border-b overflow-x-auto ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
        {thumbnails.map((thumb) => (
          <div key={thumb.pageNum} className="flex-shrink-0 w-12">
            <PdfPageThumbnail
              pageNum={thumb.pageNum}
              thumbnail={thumb.dataUrl}
              isSelected={selectedPages.includes(thumb.pageNum)}
              isActive={currentPage === thumb.pageNum}
              status={thumb.status}
              onSelect={() => togglePageSelection(thumb.pageNum)}
              onClick={() => setCurrentPage(thumb.pageNum)}
              isDark={isDark}
            />
          </div>
        ))}
      </div>

      {/* Page view */}
      <div className="flex-1 overflow-auto bg-gray-200 flex items-start justify-center p-2" style={{ minHeight: '200px', maxHeight: '35%' }}>
        <canvas ref={canvasRef} className="max-w-full max-h-full shadow" />
      </div>

      {/* Navigation + OCR */}
      <div className={`flex items-center justify-between p-2 border-y ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => currentPage > 1 && setCurrentPage(p => p - 1)}
            disabled={currentPage <= 1}
            className={`p-1 rounded disabled:opacity-30 ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
          >
            <ChevronLeft size={16} />
          </button>
          <span className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
            {currentPage}/{totalPages}
          </span>
          <button
            onClick={() => currentPage < totalPages && setCurrentPage(p => p + 1)}
            disabled={currentPage >= totalPages}
            className={`p-1 rounded disabled:opacity-30 ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <button
          onClick={runOcr}
          disabled={selectedPages.length === 0 || isProcessing}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
            selectedPages.length === 0 || isProcessing
              ? isDark ? 'bg-white/5 text-white/30' : 'bg-gray-100 text-gray-400'
              : 'bg-pink-vibrant text-white'
          }`}
        >
          {isProcessing ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> {ocrProgress.current}/{ocrProgress.total}</>
          ) : (
            <><ScanText className="w-3 h-3" /> OCR {selectedPages.length > 0 && `(${selectedPages.length})`}</>
          )}
        </button>
      </div>

      {/* OCR Result */}
      <div className="flex-1 overflow-auto p-2" style={{ minHeight: '150px' }}>
        {hasOcrContent ? (
          <div
            ref={ocrContentRef}
            className={`prose prose-sm max-w-none select-text ${isDark ? 'prose-invert' : ''}`}
            dangerouslySetInnerHTML={{ __html: ocrHtml }}
          />
        ) : (
          <div className={`h-full flex flex-col items-center justify-center text-center ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
            <ScanText className="w-8 h-8 mb-2" />
            <p className="text-xs">Select pages and run OCR</p>
          </div>
        )}
      </div>

      {/* Insert buttons */}
      {hasOcrContent && (
        <div className={`flex gap-2 p-2 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <button
            onClick={handleInsertSelection}
            disabled={!hasTextSelected}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium ${
              !hasTextSelected
                ? isDark ? 'bg-white/5 text-white/30' : 'bg-gray-100 text-gray-400'
                : isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Plus className="w-3 h-3" /> Selection
          </button>
          <button
            onClick={handleInsertAll}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-500"
          >
            <Plus className="w-3 h-3" /> Insert All
          </button>
        </div>
      )}

      {/* Error */}
      {ocrProgress.status === 'error' && (
        <div className={`p-2 text-xs ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
          {ocrProgress.error}
        </div>
      )}
    </div>
  );
}
