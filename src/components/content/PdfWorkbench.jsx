import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, ChevronLeft, ChevronRight, Loader2, X, FileText } from 'lucide-react';
import { loadPdf, renderPageToCanvas, renderPageToBlob, generateThumbnail } from '../../utils/pdfUtils';
import { ocrBlobToHtml } from '../../utils/ocrToHtml';
import PdfPageThumbnail from './PdfPageThumbnail';
import PdfOcrPanel from './PdfOcrPanel';
import PdfSaveModal from './PdfSaveModal';

export default function PdfWorkbench({ teacherId, isDark = true }) {
  const [pdf, setPdf] = useState(null);
  const [fileName, setFileName] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [thumbnails, setThumbnails] = useState([]); // Array of { pageNum, dataUrl, status }
  const [selectedPages, setSelectedPages] = useState([]); // Array of page numbers
  const [loading, setLoading] = useState(false);

  // OCR state
  const [ocrProgress, setOcrProgress] = useState({ status: 'idle', current: 0, total: 0, error: null });
  const [ocrHtml, setOcrHtml] = useState('');

  // Save modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveContentType, setSaveContentType] = useState('material');

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

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

      // Generate thumbnails for all pages
      const thumbs = [];
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        thumbs.push({ pageNum: i, dataUrl: null, status: 'pending' });
      }
      setThumbnails(thumbs);

      // Generate thumbnails asynchronously
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

  // Handle page navigation
  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  // Toggle page selection
  const togglePageSelection = (pageNum) => {
    setSelectedPages(prev =>
      prev.includes(pageNum)
        ? prev.filter(p => p !== pageNum)
        : [...prev, pageNum].sort((a, b) => a - b)
    );
  };

  // Run OCR on selected pages
  const runOcr = async () => {
    if (selectedPages.length === 0 || !pdf) {
      console.log('runOcr: no pages selected or no pdf');
      return;
    }

    console.log('runOcr: starting with pages', selectedPages);
    setOcrProgress({ status: 'processing', current: 0, total: selectedPages.length, error: null });
    setOcrHtml('');

    // Update thumbnail statuses to processing
    setThumbnails(prev => prev.map(t =>
      selectedPages.includes(t.pageNum) ? { ...t, status: 'processing' } : t
    ));

    const htmlParts = [];

    try {
      for (let i = 0; i < selectedPages.length; i++) {
        const pageNum = selectedPages[i];
        console.log(`runOcr: processing page ${pageNum}`);
        setOcrProgress(prev => ({ ...prev, current: i + 1 }));

        // Render page to blob
        console.log('runOcr: rendering page to blob...');
        const blob = await renderPageToBlob(pdf, pageNum, 2.0);
        console.log('runOcr: blob created', blob?.size, 'bytes');

        // Run OCR
        console.log('runOcr: calling OCR...');
        const html = await ocrBlobToHtml(blob);
        console.log('runOcr: OCR result length', html?.length);
        htmlParts.push(html);

        // Update thumbnail status to done
        setThumbnails(prev => prev.map(t =>
          t.pageNum === pageNum ? { ...t, status: 'done' } : t
        ));
      }

      // Combine HTML from all pages
      const combinedHtml = htmlParts.join('<hr style="margin: 2em 0; border: none; border-top: 1px solid #ccc;">');
      setOcrHtml(combinedHtml);
      setOcrProgress({ status: 'done', current: selectedPages.length, total: selectedPages.length, error: null });
      console.log('runOcr: completed successfully');
    } catch (err) {
      console.error('OCR failed:', err);
      setOcrProgress({ status: 'error', current: 0, total: selectedPages.length, error: err.message });

      // Update thumbnail statuses to error
      setThumbnails(prev => prev.map(t =>
        selectedPages.includes(t.pageNum) && t.status === 'processing' ? { ...t, status: 'error' } : t
      ));
    }
  };

  // Handle save
  const handleSave = (contentType) => {
    setSaveContentType(contentType);
    setShowSaveModal(true);
  };

  // Close PDF
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup is handled by garbage collection
      setPdf(null);
      setThumbnails([]);
    };
  }, []);

  // No PDF loaded - show upload UI
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

  // PDF loaded - show workbench
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
              {totalPages} pages
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

      {/* Main layout */}
      <div className={`grid grid-cols-[180px_1fr_320px] gap-4 rounded-2xl border ${
        isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200'
      }`}>
        {/* Left: Thumbnails */}
        <div className={`p-3 border-r overflow-y-auto max-h-[600px] ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <div className="space-y-2">
            {thumbnails.map((thumb) => (
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
        </div>

        {/* Center: Page view */}
        <div className="p-4 flex flex-col items-center">
          <div className={`flex-1 overflow-auto rounded-lg border ${
            isDark ? 'border-white/10 bg-white' : 'border-gray-200 bg-white'
          }`}>
            <canvas ref={canvasRef} className="max-w-full" />
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              className={`p-2 rounded-lg transition-colors disabled:opacity-30 ${
                isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <ChevronLeft size={20} />
            </button>
            <span className={`text-sm font-medium ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
              Page {currentPage} of {totalPages}
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
        </div>

        {/* Right: OCR Panel */}
        <div className={`border-l ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <PdfOcrPanel
            selectedPages={selectedPages}
            onRunOcr={runOcr}
            ocrProgress={ocrProgress}
            ocrHtml={ocrHtml}
            onHtmlChange={setOcrHtml}
            onSave={handleSave}
            isDark={isDark}
          />
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <PdfSaveModal
          contentType={saveContentType}
          htmlContent={ocrHtml}
          teacherId={teacherId}
          onClose={() => setShowSaveModal(false)}
          onSuccess={() => {
            setShowSaveModal(false);
            // Optionally reset state after save
            setOcrHtml('');
            setSelectedPages([]);
            setThumbnails(prev => prev.map(t => ({ ...t, status: 'pending' })));
          }}
          isDark={isDark}
        />
      )}
    </div>
  );
}
