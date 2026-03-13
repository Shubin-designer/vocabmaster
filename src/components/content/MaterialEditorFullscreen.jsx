import { useState, useRef, useEffect } from 'react';
import { X, Check, Loader2, ChevronLeft, ChevronRight, Upload, ScanText, FileText, Plus, ArrowRight } from 'lucide-react';
import RichTextEditor from '../common/RichTextEditor';
import { loadPdf, renderPageToCanvas, renderPageToBlob, generateThumbnail } from '../../utils/pdfUtils';
import { ocrBlobToHtml } from '../../utils/ocrToHtml';
import PdfPageThumbnail from './PdfPageThumbnail';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function MaterialEditorFullscreen({
  material,
  topicName,
  onSave,
  onClose,
  isDark,
}) {
  // Material form
  const [formData, setFormData] = useState({
    title: material?.title || '',
    content: material?.content || '',
    level: material?.level || 'B1',
  });
  const [saving, setSaving] = useState(false);

  // PDF state
  const [pdf, setPdf] = useState(null);
  const [fileName, setFileName] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // OCR state
  const [ocrProgress, setOcrProgress] = useState({ status: 'idle', current: 0, total: 0, error: null });
  const [ocrHtml, setOcrHtml] = useState('');
  const [hasTextSelected, setHasTextSelected] = useState(false);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const ocrContentRef = useRef(null);

  const isEditing = !!material;

  // Load PDF
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setLoadingPdf(true);
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
      setLoadingPdf(false);
    }
  };

  // Render page
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    renderPageToCanvas(pdf, currentPage, canvasRef.current, 1.0);
  }, [pdf, currentPage]);

  // Track selection
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

  // OCR
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

      setOcrHtml(htmlParts.join('<hr style="margin: 1.5em 0; border: none; border-top: 1px solid #ddd;">'));
      setOcrProgress({ status: 'done', current: selectedPages.length, total: selectedPages.length, error: null });
    } catch (err) {
      console.error('OCR failed:', err);
      setOcrProgress({ status: 'error', current: 0, total: selectedPages.length, error: err.message });
      setThumbnails(prev => prev.map(t =>
        selectedPages.includes(t.pageNum) && t.status === 'processing' ? { ...t, status: 'error' } : t
      ));
    }
  };

  // Get selection HTML
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

  // Insert into material
  const insertToMaterial = (html) => {
    if (!html) return;
    setFormData(prev => ({
      ...prev,
      content: prev.content + html
    }));
  };

  const handleInsertSelection = () => {
    const html = getSelectionHtml();
    if (html) insertToMaterial(html);
  };

  const handleInsertAll = () => {
    if (ocrHtml) insertToMaterial(ocrHtml);
  };

  const handleSave = async () => {
    if (!formData.content || formData.content === '<p></p>') return;
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  const closePdf = () => {
    setPdf(null);
    setFileName('');
    setTotalPages(0);
    setThumbnails([]);
    setSelectedPages([]);
    setOcrHtml('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isProcessing = ocrProgress.status === 'processing';
  const hasOcrContent = ocrHtml && ocrHtml.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: isDark ? '#0f0f12' : '#f5f5f5' }}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isDark ? 'bg-[#1a1a1e] border-white/10' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-4">
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {isEditing ? 'Edit Material' : 'New Material'}
            </h2>
            {topicName && (
              <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{topicName}</p>
            )}
          </div>

          {/* Title & Level inline */}
          <div className="flex items-center gap-3">
            <input
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                isDark
                  ? 'bg-white/[0.05] border-white/10 text-white placeholder-white/30'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="Title..."
              style={{ width: '200px' }}
            />
            <div className="flex gap-1">
              {LEVELS.map(l => (
                <button
                  key={l}
                  onClick={() => setFormData({ ...formData, level: l })}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    formData.level === l
                      ? 'bg-pink-vibrant text-white'
                      : isDark ? 'bg-white/[0.05] text-white/60' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !formData.content || formData.content === '<p></p>'}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save
          </button>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main: 3 columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: PDF */}
        <div className={`w-64 flex-shrink-0 flex flex-col border-r ${
          isDark ? 'bg-[#1a1a1e] border-white/10' : 'bg-gray-50 border-gray-200'
        }`}>
          {!pdf ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 flex flex-col items-center justify-center p-4 cursor-pointer ${
                isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-100'
              }`}
            >
              {loadingPdf ? (
                <Loader2 className="w-8 h-8 animate-spin text-pink-vibrant mb-2" />
              ) : (
                <Upload className={`w-8 h-8 mb-2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
              )}
              <p className={`text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                {loadingPdf ? 'Loading...' : 'Load PDF'}
              </p>
            </div>
          ) : (
            <>
              {/* PDF Header */}
              <div className={`flex items-center justify-between p-2 border-b ${
                isDark ? 'border-white/10' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                  <span className={`text-xs truncate ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                    {fileName}
                  </span>
                </div>
                <button
                  onClick={closePdf}
                  className={`p-1 rounded ${isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-gray-200 text-gray-400'}`}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Thumbnails */}
              <div className={`flex gap-1 p-2 border-b overflow-x-auto ${
                isDark ? 'border-white/10' : 'border-gray-200'
              }`}>
                {thumbnails.map((thumb) => (
                  <div key={thumb.pageNum} className="flex-shrink-0 w-10">
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
              <div className="flex-1 overflow-auto bg-gray-300 flex items-start justify-center p-2">
                <canvas ref={canvasRef} className="max-w-full shadow" />
              </div>

              {/* Navigation + OCR */}
              <div className={`flex items-center justify-between p-2 border-t ${
                isDark ? 'border-white/10' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => currentPage > 1 && setCurrentPage(p => p - 1)}
                    disabled={currentPage <= 1}
                    className={`p-1 rounded disabled:opacity-30 ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 text-gray-700'}`}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className={`text-xs min-w-[50px] text-center ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                    {currentPage}/{totalPages}
                  </span>
                  <button
                    onClick={() => currentPage < totalPages && setCurrentPage(p => p + 1)}
                    disabled={currentPage >= totalPages}
                    className={`p-1 rounded disabled:opacity-30 ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 text-gray-700'}`}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <button
                  onClick={runOcr}
                  disabled={selectedPages.length === 0 || isProcessing}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                    selectedPages.length === 0 || isProcessing
                      ? isDark ? 'bg-white/5 text-white/30' : 'bg-gray-200 text-gray-400'
                      : 'bg-pink-vibrant text-white'
                  }`}
                >
                  {isProcessing ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> {ocrProgress.current}/{ocrProgress.total}</>
                  ) : (
                    <><ScanText className="w-3 h-3" /> OCR{selectedPages.length > 0 && ` (${selectedPages.length})`}</>
                  )}
                </button>
              </div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Column 2: OCR Result */}
        <div className={`w-80 flex-shrink-0 flex flex-col border-r ${
          isDark ? 'bg-[#16161a] border-white/10' : 'bg-white border-gray-200'
        }`}>
          <div className={`flex items-center justify-between p-2 border-b ${
            isDark ? 'border-white/10' : 'border-gray-200'
          }`}>
            <span className={`text-sm font-medium ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
              OCR Result
            </span>
            {hasOcrContent && (
              <div className="flex gap-1">
                <button
                  onClick={handleInsertSelection}
                  disabled={!hasTextSelected}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                    !hasTextSelected
                      ? isDark ? 'bg-white/5 text-white/30' : 'bg-gray-100 text-gray-400'
                      : isDark ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <ArrowRight size={12} /> Sel
                </button>
                <button
                  onClick={handleInsertAll}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-600 text-white"
                >
                  <ArrowRight size={12} /> All
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-3" ref={ocrContentRef}>
            {hasOcrContent ? (
              <div
                className={`prose prose-sm max-w-none select-text ${isDark ? 'prose-invert' : ''}`}
                style={{ fontSize: '13px', lineHeight: '1.6' }}
                dangerouslySetInnerHTML={{ __html: ocrHtml }}
              />
            ) : (
              <div className={`h-full flex flex-col items-center justify-center text-center ${
                isDark ? 'text-white/30' : 'text-gray-400'
              }`}>
                <ScanText className="w-8 h-8 mb-2" />
                <p className="text-xs">Select PDF pages</p>
                <p className="text-xs">and run OCR</p>
              </div>
            )}
          </div>

          {ocrProgress.status === 'error' && (
            <div className={`p-2 text-xs ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
              {ocrProgress.error}
            </div>
          )}
        </div>

        {/* Column 3: Material Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className={`p-2 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <span className={`text-sm font-medium ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
              Material Content
            </span>
          </div>
          <div className="flex-1 overflow-auto p-3">
            <RichTextEditor
              content={formData.content}
              onChange={html => setFormData({ ...formData, content: html })}
              isDark={isDark}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
