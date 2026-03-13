import { useState, useRef, useEffect } from 'react';
import { Upload, ChevronLeft, ChevronRight, Loader2, X, FileText, ScanText, Save, TextSelect, FileDown, BookOpen, ClipboardList } from 'lucide-react';
import { loadPdf, renderPageToCanvas, renderPageToBlob, generateThumbnail } from '../../utils/pdfUtils';
import { ocrBlobToHtml } from '../../utils/ocrToHtml';
import PdfPageThumbnail from './PdfPageThumbnail';
import PdfSaveModal from './PdfSaveModal';
import RichTextEditor from '../common/RichTextEditor';

const CONTENT_TYPES = [
  { key: 'material', label: 'Material', icon: FileText },
  { key: 'reading', label: 'Reading', icon: BookOpen },
  { key: 'test', label: 'Test', icon: ClipboardList },
];

export default function PdfWorkbench({ teacherId, isDark = true }) {
  const [pdf, setPdf] = useState(null);
  const [fileName, setFileName] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [loading, setLoading] = useState(false);

  // OCR state
  const [ocrProgress, setOcrProgress] = useState({ status: 'idle', current: 0, total: 0, error: null });
  const [ocrHtml, setOcrHtml] = useState('');

  // Save state
  const [contentType, setContentType] = useState('material');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMode, setSaveMode] = useState('all');
  const [selectedHtml, setSelectedHtml] = useState('');
  const [hasTextSelected, setHasTextSelected] = useState(false);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const editorContainerRef = useRef(null);

  // Load PDF file
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

  // Render current page to main canvas
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    renderPageToCanvas(pdf, currentPage, canvasRef.current, 1.5);
  }, [pdf, currentPage]);

  // Track text selection in editor
  useEffect(() => {
    const checkSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setHasTextSelected(false);
        return;
      }
      const editorEl = editorContainerRef.current?.querySelector('.rich-editor');
      if (!editorEl) {
        setHasTextSelected(false);
        return;
      }
      const range = selection.getRangeAt(0);
      setHasTextSelected(editorEl.contains(range.commonAncestorContainer));
    };
    document.addEventListener('selectionchange', checkSelection);
    return () => document.removeEventListener('selectionchange', checkSelection);
  }, []);

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  const togglePageSelection = (pageNum) => {
    setSelectedPages(prev =>
      prev.includes(pageNum)
        ? prev.filter(p => p !== pageNum)
        : [...prev, pageNum].sort((a, b) => a - b)
    );
  };

  // Run OCR
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

      const combinedHtml = htmlParts.join('<hr style="margin: 2em 0; border: none; border-top: 2px solid #e5e7eb;">');
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

  // Get selected HTML
  const getSelectionHtml = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

    const editorEl = editorContainerRef.current?.querySelector('.rich-editor');
    if (!editorEl) return null;

    const range = selection.getRangeAt(0);
    if (!editorEl.contains(range.commonAncestorContainer)) return null;

    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    return container.innerHTML;
  };

  const handleSaveAll = () => {
    setSaveMode('all');
    setShowSaveModal(true);
  };

  const handleSaveSelection = () => {
    const html = getSelectionHtml();
    if (html && html.trim()) {
      setSelectedHtml(html);
      setSaveMode('selection');
      setShowSaveModal(true);
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

  useEffect(() => {
    return () => {
      setPdf(null);
      setThumbnails([]);
    };
  }, []);

  const isProcessing = ocrProgress.status === 'processing';
  const hasOcrContent = ocrHtml && ocrHtml.trim().length > 0;

  // No PDF loaded
  if (!pdf) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            PDF Workbench
          </h2>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Extract text from PDF textbooks using OCR
          </p>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
            isDark
              ? 'border-white/20 hover:border-pink-vibrant/50 bg-white/[0.02] hover:bg-white/[0.05]'
              : 'border-gray-300 hover:border-pink-vibrant/50 bg-gray-50 hover:bg-gray-100'
          }`}
        >
          {loading ? (
            <Loader2 className="w-12 h-12 animate-spin text-pink-vibrant mb-4" />
          ) : (
            <Upload className={`w-12 h-12 mb-4 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
          )}
          <p className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {loading ? 'Loading PDF...' : 'Upload PDF'}
          </p>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Click or drag a PDF file here
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

  // PDF loaded - 50/50 layout
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
          }`}>
            <FileText size={20} />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {fileName}
            </h2>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              {totalPages} pages • {selectedPages.length} selected
            </p>
          </div>
        </div>
        <button
          onClick={closePdf}
          className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
        >
          <X size={20} />
        </button>
      </div>

      {/* Progress bar */}
      {isProcessing && (
        <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-pink-vibrant transition-all duration-300"
            style={{ width: `${(ocrProgress.current / ocrProgress.total) * 100}%` }}
          />
        </div>
      )}

      {/* Error */}
      {ocrProgress.status === 'error' && (
        <div className={`p-4 rounded-xl ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
          OCR Error: {ocrProgress.error}
        </div>
      )}

      {/* Main 50/50 layout */}
      <div className="grid grid-cols-2 gap-4" style={{ height: 'calc(100vh - 220px)' }}>
        {/* LEFT: PDF Viewer */}
        <div className={`flex flex-col rounded-2xl border overflow-hidden ${
          isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200'
        }`}>
          {/* Thumbnails row */}
          <div className={`flex gap-2 p-3 border-b overflow-x-auto ${
            isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'
          }`}>
            {thumbnails.map((thumb) => (
              <div key={thumb.pageNum} className="flex-shrink-0 w-16">
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
          <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-gray-100">
            <canvas ref={canvasRef} className="max-w-full shadow-lg" />
          </div>

          {/* Navigation + OCR button */}
          <div className={`flex items-center justify-between p-3 border-t ${
            isDark ? 'border-white/10' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
                className={`p-2 rounded-lg transition-colors disabled:opacity-30 ${
                  isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <ChevronLeft size={20} />
              </button>
              <span className={`text-sm font-medium min-w-[80px] text-center ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
                className={`p-2 rounded-lg transition-colors disabled:opacity-30 ${
                  isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <button
              onClick={runOcr}
              disabled={selectedPages.length === 0 || isProcessing}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                selectedPages.length === 0 || isProcessing
                  ? isDark
                    ? 'bg-white/5 text-white/30 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-pink-vibrant text-white hover:bg-pink-vibrant/90'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {ocrProgress.current}/{ocrProgress.total}
                </>
              ) : (
                <>
                  <ScanText className="w-4 h-4" />
                  OCR {selectedPages.length > 0 && `(${selectedPages.length})`}
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT: OCR Editor */}
        <div className={`flex flex-col rounded-2xl border overflow-hidden ${
          isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200'
        }`}>
          {/* Toolbar */}
          <div className={`flex items-center justify-between p-3 border-b ${
            isDark ? 'border-white/10' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Save as:
              </span>
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type.key}
                  onClick={() => setContentType(type.key)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    contentType === type.key
                      ? 'bg-pink-vibrant text-white'
                      : isDark
                        ? 'bg-white/5 text-white/60 hover:bg-white/10'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <type.icon className="w-3.5 h-3.5" />
                  {type.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveSelection}
                disabled={!hasTextSelected}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  !hasTextSelected
                    ? isDark
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isDark
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <TextSelect className="w-3.5 h-3.5" />
                Selection
              </button>
              <button
                onClick={handleSaveAll}
                disabled={!hasOcrContent}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  !hasOcrContent
                    ? isDark
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-500'
                }`}
              >
                <FileDown className="w-3.5 h-3.5" />
                Save All
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-auto p-4" ref={editorContainerRef}>
            {hasOcrContent ? (
              <RichTextEditor
                content={ocrHtml}
                onChange={setOcrHtml}
                isDark={isDark}
              />
            ) : (
              <div className={`flex flex-col items-center justify-center h-full text-center ${
                isDark ? 'text-white/30' : 'text-gray-400'
              }`}>
                <ScanText className="w-12 h-12 mb-4" />
                <p className="text-lg font-medium mb-2">No OCR result yet</p>
                <p className="text-sm">Select pages and click OCR to extract text</p>
              </div>
            )}
          </div>

          {/* Hint */}
          {hasOcrContent && (
            <div className={`px-4 py-2 border-t text-xs text-center ${
              isDark ? 'border-white/10 text-white/40' : 'border-gray-200 text-gray-500'
            }`}>
              Select text to save only that portion, or Save All for entire content
            </div>
          )}
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <PdfSaveModal
          contentType={contentType}
          htmlContent={saveMode === 'selection' ? selectedHtml : ocrHtml}
          teacherId={teacherId}
          onClose={() => setShowSaveModal(false)}
          onSuccess={() => setShowSaveModal(false)}
          isDark={isDark}
        />
      )}
    </div>
  );
}
