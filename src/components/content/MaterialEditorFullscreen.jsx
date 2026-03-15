import { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Highlight from '@tiptap/extension-highlight';
import {
  X, Check, Loader2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Upload, ScanText, FileText, ArrowRight,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Quote,
  Table as TableIcon, Minus, Pilcrow, Heading1, Heading2, Heading3, Trash2, Plus, RowsIcon, ColumnsIcon, FolderOpen,
  Sparkles, Settings, GripVertical
} from 'lucide-react';
import { loadPdf, loadPdfFromUrl, renderPageToCanvas, renderPageToBlob, generateThumbnail } from '../../utils/pdfUtils';
import { ocrBlobToHtml } from '../../utils/ocrToHtml';
import PdfPageThumbnail from './PdfPageThumbnail';
import PdfLibraryModal from './PdfLibraryModal';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function MaterialEditorFullscreen({
  material,
  topicName,
  teacherId,
  onSave,
  onClose,
  isDark,
}) {
  const [formData, setFormData] = useState({
    title: material?.title || '',
    content: material?.content || '',
    level: material?.level || 'B1',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // PDF state
  const [pdf, setPdf] = useState(null);
  const [fileName, setFileName] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Image state (for direct image upload)
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  // OCR state
  const [ocrProgress, setOcrProgress] = useState({ status: 'idle', current: 0, total: 0, error: null });
  const [ocrHtml, setOcrHtml] = useState('');
  const [hasTextSelected, setHasTextSelected] = useState(false);

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const ocrContentRef = useRef(null);

  // Library modal state
  const [showLibraryModal, setShowLibraryModal] = useState(false);

  // Table state
  const [inTable, setInTable] = useState(false);

  // Color picker state
  const [showColorPicker, setShowColorPicker] = useState(false); // false | 'text' | 'highlight'
  const colorPickerRef = useRef(null);

  // Style presets
  const PRESET_STORAGE_KEY = `vocabmaster_style_presets_${teacherId}`;
  const DEFAULT_PRESETS = [
    { id: '1', name: 'Important', textColor: '#ef4444', highlightColor: '', bold: true, italic: false, underline: false },
    { id: '2', name: 'Key Term', textColor: '', highlightColor: '#eab308', bold: true, italic: false, underline: false },
    { id: '3', name: 'Example', textColor: '#22c55e', highlightColor: '', bold: false, italic: true, underline: false },
    { id: '4', name: 'Note', textColor: '#3b82f6', highlightColor: '#3b82f6', bold: false, italic: false, underline: false },
    { id: '5', name: 'Rule', textColor: '#8b5cf6', highlightColor: '#8b5cf6', bold: true, italic: false, underline: true },
  ];

  const loadPresets = () => {
    try {
      const stored = localStorage.getItem(PRESET_STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_PRESETS;
    } catch { return DEFAULT_PRESETS; }
  };

  const [stylePresets, setStylePresets] = useState(loadPresets);
  const [showPresets, setShowPresets] = useState(false);
  const [showPresetEditor, setShowPresetEditor] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const presetsRef = useRef(null);

  const savePresets = (presets) => {
    setStylePresets(presets);
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  };

  const applyPreset = (preset) => {
    if (!editor) return;
    let chain = editor.chain().focus();

    // Clear existing formatting first
    chain = chain.unsetColor().unsetHighlight();
    if (editor.isActive('bold')) chain = chain.toggleBold();
    if (editor.isActive('italic')) chain = chain.toggleItalic();
    if (editor.isActive('underline')) chain = chain.toggleUnderline();

    // Apply preset styles
    if (preset.textColor) chain = chain.setColor(preset.textColor);
    if (preset.highlightColor) chain = chain.toggleHighlight({ color: preset.highlightColor + '33' });
    if (preset.bold) chain = chain.toggleBold();
    if (preset.italic) chain = chain.toggleItalic();
    if (preset.underline) chain = chain.toggleUnderline();

    chain.run();
    setShowPresets(false);
  };

  const isEditing = !!material;

  // Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: formData.content || '',
    onUpdate: ({ editor }) => {
      setFormData(prev => ({ ...prev, content: editor.getHTML() }));
    },
  });

  // Track if cursor is in table
  useEffect(() => {
    if (!editor) return;
    const update = () => setInTable(editor.isActive('table'));
    editor.on('selectionUpdate', update);
    return () => editor.off('selectionUpdate', update);
  }, [editor]);

  useEffect(() => {
    if (editor && material?.content && material.content !== editor.getHTML()) {
      editor.commands.setContent(material.content, false);
    }
  }, [material?.content]);

  // Close popups on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
        setShowColorPicker(false);
      }
      if (presetsRef.current && !presetsRef.current.contains(e.target)) {
        setShowPresets(false);
      }
    };
    if (showColorPicker || showPresets) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker, showPresets]);

  // Load PDF or Image from file input
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    renderPageToCanvas(pdf, currentPage, canvasRef.current, 1.0);
  }, [pdf, currentPage]);

  // Track selection in OCR
  useEffect(() => {
    const checkSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setHasTextSelected(false);
        return;
      }
      const ocrEl = ocrContentRef.current;
      if (!ocrEl) { setHasTextSelected(false); return; }
      const range = selection.getRangeAt(0);
      setHasTextSelected(ocrEl.contains(range.commonAncestorContainer));
    };
    document.addEventListener('selectionchange', checkSelection);
    return () => document.removeEventListener('selectionchange', checkSelection);
  }, []);

  const togglePageSelection = (pageNum) => {
    setSelectedPages(prev =>
      prev.includes(pageNum) ? prev.filter(p => p !== pageNum) : [...prev, pageNum].sort((a, b) => a - b)
    );
  };

  const runOcr = async () => {
    // For images, selectedPages will be [1] and imageFile will be set
    if (selectedPages.length === 0) return;
    if (!pdf && !imageFile) return;

    setOcrProgress({ status: 'processing', current: 0, total: selectedPages.length, error: null });
    setOcrHtml('');

    if (pdf) {
      setThumbnails(prev => prev.map(t => selectedPages.includes(t.pageNum) ? { ...t, status: 'processing' } : t));
    }

    const htmlParts = [];
    try {
      if (imageFile) {
        // OCR single image
        setOcrProgress(prev => ({ ...prev, current: 1 }));
        const html = await ocrBlobToHtml(imageFile);
        htmlParts.push(html);
      } else {
        // OCR PDF pages
        for (let i = 0; i < selectedPages.length; i++) {
          const pageNum = selectedPages[i];
          setOcrProgress(prev => ({ ...prev, current: i + 1 }));
          const blob = await renderPageToBlob(pdf, pageNum, 2.0);
          const html = await ocrBlobToHtml(blob);
          htmlParts.push(html);
          setThumbnails(prev => prev.map(t => t.pageNum === pageNum ? { ...t, status: 'done' } : t));
        }
      }
      setOcrHtml(htmlParts.join('<hr>'));
      setOcrProgress({ status: 'done', current: selectedPages.length, total: selectedPages.length, error: null });
    } catch (err) {
      setOcrProgress({ status: 'error', current: 0, total: selectedPages.length, error: err.message });
      if (pdf) {
        setThumbnails(prev => prev.map(t => selectedPages.includes(t.pageNum) && t.status === 'processing' ? { ...t, status: 'error' } : t));
      }
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

  const insertToEditor = (html) => {
    if (!html || !editor) return;
    editor.chain().focus().insertContent(html).run();
  };

  const handleInsertSelection = () => {
    const html = getSelectionHtml();
    if (html) insertToEditor(html);
  };

  const handleInsertAll = () => {
    if (ocrHtml) insertToEditor(ocrHtml);
  };

  const handleSave = async () => {
    const content = editor?.getHTML();
    if (!content || content === '<p></p>') return;
    setSaving(true);
    await onSave({ ...formData, content });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const closeFile = () => {
    setPdf(null);
    setImageFile(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setFileName('');
    setThumbnails([]);
    setSelectedPages([]);
    setTotalPages(0);
    setOcrHtml('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Load PDF from library
  const handleLibrarySelect = async (libraryPdf) => {
    setShowLibraryModal(false);
    setLoadingPdf(true);
    setFileName(libraryPdf.title);
    setOcrHtml('');
    setSelectedPages([]);
    setPdf(null);
    setImageFile(null);
    setImageUrl(null);
    setThumbnails([]);

    try {
      const pdfDoc = await loadPdfFromUrl(libraryPdf.signedUrl);
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
        setThumbnails(prev => prev.map(t => t.pageNum === i ? { ...t, dataUrl } : t));
      }
    } catch (err) {
      console.error('Failed to load PDF from library:', err);
    } finally {
      setLoadingPdf(false);
    }
  };

  // Handle paste from clipboard (Ctrl+V)
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/') || item.type === 'application/pdf') {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await processFile(file);
        }
        return;
      }
    }
  };

  // Handle drag & drop
  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      await processFile(file);
    }
  };

  // Process file (shared logic for file input, paste, and drop)
  const processFile = async (file) => {
    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) return;

    setLoadingPdf(true);
    setFileName(file.name || (isImage ? 'pasted-image.png' : 'document.pdf'));
    setOcrHtml('');
    setSelectedPages([]);

    // Reset both states
    setPdf(null);
    setImageFile(null);
    setImageUrl(null);
    setThumbnails([]);

    try {
      if (isPdf) {
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
          setThumbnails(prev => prev.map(t => t.pageNum === i ? { ...t, dataUrl } : t));
        }
      } else {
        // Image file
        setImageFile(file);
        const url = URL.createObjectURL(file);
        setImageUrl(url);
        setTotalPages(1);
        setCurrentPage(1);
        setSelectedPages([1]); // Auto-select the image
      }
    } catch (err) {
      console.error('Failed to load file:', err);
    } finally {
      setLoadingPdf(false);
    }
  };

  const isProcessing = ocrProgress.status === 'processing';
  const hasOcrContent = ocrHtml && ocrHtml.trim().length > 0;

  // Toolbar button helper
  const ToolBtn = ({ active, onClick, title, children, danger }) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`p-2 rounded-lg transition-colors ${
        danger
          ? isDark
            ? 'text-red-400 hover:text-red-300 hover:bg-red-500/20'
            : 'text-red-500 hover:text-red-600 hover:bg-red-50'
          : active
            ? 'bg-pink-vibrant text-white'
            : isDark
              ? 'text-white/60 hover:text-white hover:bg-white/10'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen z-50 flex flex-col"
      style={{ background: isDark ? '#0f0f12' : '#f5f5f5' }}
      onPaste={handlePaste}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'bg-[#1a1a1e] border-white/10' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {isEditing ? 'Edit Material' : 'New Material'}
            </h2>
            {topicName && <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{topicName}</p>}
          </div>
          <input
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            className={`px-3 py-1.5 rounded-lg text-sm border w-48 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            placeholder="Title..."
          />
          <div className="flex gap-1">
            {LEVELS.map(l => (
              <button
                key={l}
                onClick={() => setFormData({ ...formData, level: l })}
                className={`px-2 py-1 rounded text-xs font-medium ${formData.level === l ? 'bg-pink-vibrant text-white' : isDark ? 'bg-white/5 text-white/60' : 'bg-gray-100 text-gray-600'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-green-600 text-white hover:bg-green-500 disabled:opacity-50'
            }`}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saved ? 'Saved!' : 'Save'}
          </button>
          <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main: 25% PDF/Image | 25% OCR | 50% Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF/Image Column - 25% */}
        <div className={`w-1/4 flex flex-col border-r ${isDark ? 'bg-[#1a1a1e] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
          {!pdf && !imageFile ? (
            <div className="flex-1 flex flex-col m-2">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className={`flex-1 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed rounded-xl transition-colors ${
                  isDark
                    ? 'border-white/20 hover:border-white/40 hover:bg-white/[0.02]'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-100'
                }`}
              >
                {loadingPdf ? (
                  <Loader2 className="w-8 h-8 animate-spin text-pink-vibrant mb-2" />
                ) : (
                  <Upload className={`w-8 h-8 mb-2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                )}
                <p className={`text-sm text-center ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                  {loadingPdf ? 'Loading...' : 'Drop PDF/Image here'}
                </p>
                <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  or click to browse, or Ctrl+V
                </p>
              </div>
              {teacherId && (
                <button
                  onClick={() => setShowLibraryModal(true)}
                  className={`mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                    isDark
                      ? 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  <FolderOpen size={18} />
                  From Library
                </button>
              )}
            </div>
          ) : imageFile ? (
            /* Image display */
            <>
              <div className={`flex items-center justify-between p-2 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span className={`text-xs truncate ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{fileName}</span>
                </div>
                <button onClick={closeFile} className={`p-1 rounded ${isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-gray-200 text-gray-400'}`}>
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-gray-300 flex items-center justify-center p-2">
                <img src={imageUrl} alt="Preview" className="max-w-full max-h-full object-contain shadow" />
              </div>
              <div className={`flex items-center justify-end p-2 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <button onClick={runOcr} disabled={isProcessing} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${isProcessing ? isDark ? 'bg-white/5 text-white/30' : 'bg-gray-200 text-gray-400' : 'bg-pink-vibrant text-white'}`}>
                  {isProcessing ? <><Loader2 className="w-3 h-3 animate-spin" /> OCR...</> : <><ScanText className="w-3 h-3" /> Run OCR</>}
                </button>
              </div>
            </>
          ) : (
            /* PDF display */
            <>
              <div className={`flex items-center justify-between p-2 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                  <span className={`text-xs truncate ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{fileName}</span>
                </div>
                <button onClick={closeFile} className={`p-1 rounded ${isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-gray-200 text-gray-400'}`}>
                  <X size={14} />
                </button>
              </div>
              <div className={`flex gap-1 p-2 border-b overflow-x-auto ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                {thumbnails.map((thumb) => (
                  <div key={thumb.pageNum} className="flex-shrink-0 w-12">
                    <PdfPageThumbnail pageNum={thumb.pageNum} thumbnail={thumb.dataUrl} isSelected={selectedPages.includes(thumb.pageNum)} isActive={currentPage === thumb.pageNum} status={thumb.status} onSelect={() => togglePageSelection(thumb.pageNum)} onClick={() => setCurrentPage(thumb.pageNum)} isDark={isDark} />
                  </div>
                ))}
              </div>
              <div className="flex-1 overflow-auto bg-gray-300 flex items-start justify-center p-2">
                <canvas ref={canvasRef} className="max-w-full shadow" />
              </div>
              <div className={`flex items-center justify-between p-2 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="flex items-center gap-1">
                  <button onClick={() => currentPage > 1 && setCurrentPage(p => p - 1)} disabled={currentPage <= 1} className={`p-1 rounded disabled:opacity-30 ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 text-gray-700'}`}><ChevronLeft size={16} /></button>
                  <span className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{currentPage}/{totalPages}</span>
                  <button onClick={() => currentPage < totalPages && setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages} className={`p-1 rounded disabled:opacity-30 ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 text-gray-700'}`}><ChevronRight size={16} /></button>
                </div>
                <button onClick={runOcr} disabled={selectedPages.length === 0 || isProcessing} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${selectedPages.length === 0 || isProcessing ? isDark ? 'bg-white/5 text-white/30' : 'bg-gray-200 text-gray-400' : 'bg-pink-vibrant text-white'}`}>
                  {isProcessing ? <><Loader2 className="w-3 h-3 animate-spin" /> {ocrProgress.current}/{ocrProgress.total}</> : <><ScanText className="w-3 h-3" /> OCR{selectedPages.length > 0 && ` (${selectedPages.length})`}</>}
                </button>
              </div>
            </>
          )}
          <input ref={fileInputRef} type="file" accept="application/pdf,image/*" onChange={handleFileSelect} className="hidden" />
        </div>

        {/* OCR Column - 25% */}
        <div className={`w-1/4 flex flex-col border-r ${isDark ? 'bg-[#16161a] border-white/10' : 'bg-white border-gray-200'}`}>
          <div className={`flex items-center justify-between p-2 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <span className={`text-sm font-medium ${isDark ? 'text-white/70' : 'text-gray-700'}`}>OCR Result</span>
            {hasOcrContent && (
              <div className="flex gap-1">
                <button onClick={handleInsertSelection} disabled={!hasTextSelected} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${!hasTextSelected ? isDark ? 'bg-white/5 text-white/30' : 'bg-gray-100 text-gray-400' : isDark ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  <ArrowRight size={12} />
                </button>
                <button onClick={handleInsertAll} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-600 text-white">
                  <ArrowRight size={12} /> All
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto p-3" ref={ocrContentRef}>
            {hasOcrContent ? (
              <div className={`prose prose-sm max-w-none select-text ${isDark ? 'prose-invert' : ''}`} style={{ fontSize: '13px' }} dangerouslySetInnerHTML={{ __html: ocrHtml }} />
            ) : (
              <div className={`h-full flex flex-col items-center justify-center ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                <ScanText className="w-8 h-8 mb-2" />
                <p className="text-xs text-center">Select PDF pages<br/>and run OCR</p>
              </div>
            )}
          </div>
        </div>

        {/* Editor Column - 50% */}
        <div className="w-1/2 flex flex-col relative">
          {/* Editor area */}
          <div className="flex-1 overflow-auto p-4 pb-24">
            <EditorContent editor={editor} className={`material-editor min-h-full ${isDark ? 'dark' : 'light'}`} />
          </div>

          {/* Floating Toolbars Container */}
          {editor && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
              {/* Table Toolbar - appears above main toolbar when in table */}
              {inTable && (
                <div className={`flex items-center gap-0.5 px-2 py-1.5 rounded-xl shadow-xl border backdrop-blur-xl ${
                  isDark
                    ? 'bg-[#2a2a30]/95 border-white/10 shadow-black/40'
                    : 'bg-white/95 border-gray-200 shadow-gray-200/60'
                }`}>
                  <ToolBtn onClick={() => editor.chain().focus().addRowBefore().run()} title="Row above"><ChevronUp size={16} /></ToolBtn>
                  <ToolBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Row below"><ChevronDown size={16} /></ToolBtn>
                  <ToolBtn onClick={() => editor.chain().focus().deleteRow().run()} title="Delete row" danger><Trash2 size={14} /></ToolBtn>
                  <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                  <ToolBtn onClick={() => editor.chain().focus().addColumnBefore().run()} title="Column left"><ChevronLeft size={16} /></ToolBtn>
                  <ToolBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Column right"><ChevronRight size={16} /></ToolBtn>
                  <ToolBtn onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete column" danger><Trash2 size={14} /></ToolBtn>
                  <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                  <ToolBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete table" danger><X size={16} /></ToolBtn>
                </div>
              )}

              {/* Main Text Toolbar */}
              <div className={`flex items-center gap-1 px-3 py-2 rounded-2xl shadow-2xl border backdrop-blur-xl ${
                isDark
                  ? 'bg-[#2a2a30]/90 border-white/10 shadow-black/50'
                  : 'bg-white/90 border-gray-200 shadow-gray-300/50'
              }`}>
                <ToolBtn active={!editor.isActive('heading')} onClick={() => editor.chain().focus().setParagraph().run()} title="Paragraph"><Pilcrow size={18} /></ToolBtn>
                <ToolBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1"><Heading1 size={18} /></ToolBtn>
                <ToolBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2"><Heading2 size={18} /></ToolBtn>
                <ToolBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="H3"><Heading3 size={18} /></ToolBtn>

                <div className={`w-px h-6 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

                <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold size={18} /></ToolBtn>
                <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic size={18} /></ToolBtn>
                <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon size={18} /></ToolBtn>
                <ToolBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strike"><Strikethrough size={18} /></ToolBtn>

                {/* Text Color & Highlight */}
                <div className="relative flex items-center" ref={colorPickerRef}>
                  <button
                    type="button"
                    title="Text Color"
                    onMouseDown={e => { e.preventDefault(); setShowColorPicker(showColorPicker === 'text' ? false : 'text'); }}
                    className={`p-2 rounded-lg transition-colors ${
                      showColorPicker === 'text'
                        ? 'bg-pink-vibrant text-white'
                        : isDark
                          ? 'text-white/60 hover:text-white hover:bg-white/10'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-sm font-bold leading-none">A</span>
                      <div className="w-4 h-1 rounded-full" style={{ background: editor.getAttributes('textStyle').color || (isDark ? '#fff' : '#000') }} />
                    </div>
                  </button>
                  <button
                    type="button"
                    title="Highlight"
                    onMouseDown={e => { e.preventDefault(); setShowColorPicker(showColorPicker === 'highlight' ? false : 'highlight'); }}
                    className={`p-2 rounded-lg transition-colors ${
                      showColorPicker === 'highlight'
                        ? 'bg-pink-vibrant text-white'
                        : isDark
                          ? 'text-white/60 hover:text-white hover:bg-white/10'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-sm font-bold leading-none px-1 rounded" style={{
                      background: editor.isActive('highlight') ? (editor.getAttributes('highlight').color || '#eab308') : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
                      color: editor.isActive('highlight') ? '#000' : 'inherit',
                    }}>A</span>
                  </button>

                  {showColorPicker && (
                    <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 rounded-xl shadow-xl border backdrop-blur-xl ${
                      isDark ? 'bg-[#2a2a30]/95 border-white/10' : 'bg-white/95 border-gray-200'
                    }`}>
                      <div className="flex gap-1.5">
                        {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000', '#ffffff'].map(color => (
                          <button
                            key={color}
                            type="button"
                            onMouseDown={e => {
                              e.preventDefault();
                              if (showColorPicker === 'text') {
                                editor.chain().focus().setColor(color).run();
                              } else {
                                editor.chain().focus().toggleHighlight({ color }).run();
                              }
                              setShowColorPicker(false);
                            }}
                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-125 ${
                              (showColorPicker === 'text'
                                ? editor.getAttributes('textStyle').color === color
                                : editor.getAttributes('highlight').color === color && editor.isActive('highlight'))
                                ? 'border-pink-vibrant scale-110'
                                : color === '#ffffff'
                                  ? 'border-gray-300'
                                  : isDark ? 'border-white/20' : 'border-gray-300'
                            }`}
                            style={{ background: color }}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onMouseDown={e => {
                          e.preventDefault();
                          if (showColorPicker === 'text') {
                            editor.chain().focus().unsetColor().run();
                          } else {
                            editor.chain().focus().unsetHighlight().run();
                          }
                          setShowColorPicker(false);
                        }}
                        className={`mt-2 w-full text-xs py-1 rounded-lg font-medium ${
                          isDark ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {showColorPicker === 'text' ? 'Reset color' : 'Remove highlight'}
                      </button>
                    </div>
                  )}
                </div>

                <div className={`w-px h-6 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

                <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List"><List size={18} /></ToolBtn>
                <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List"><ListOrdered size={18} /></ToolBtn>
                <ToolBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote"><Quote size={18} /></ToolBtn>

                <div className={`w-px h-6 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

                <ToolBtn active={inTable} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Table"><TableIcon size={18} /></ToolBtn>
                <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus size={18} /></ToolBtn>

                <div className={`w-px h-6 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

                {/* Style Presets */}
                <div className="relative" ref={presetsRef}>
                  <button
                    type="button"
                    title="Style Presets"
                    onMouseDown={e => { e.preventDefault(); setShowPresets(!showPresets); }}
                    className={`p-2 rounded-lg transition-colors ${
                      showPresets
                        ? 'bg-pink-vibrant text-white'
                        : isDark
                          ? 'text-white/60 hover:text-white hover:bg-white/10'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Sparkles size={18} />
                  </button>
                  {showPresets && (
                    <div className={`absolute bottom-full mb-2 right-0 w-56 rounded-xl shadow-xl border backdrop-blur-xl ${
                      isDark ? 'bg-[#2a2a30]/95 border-white/10' : 'bg-white/95 border-gray-200'
                    }`}>
                      <div className={`px-3 py-2 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                        <span className={`text-xs font-semibold ${isDark ? 'text-white/70' : 'text-gray-600'}`}>Style Presets</span>
                        <button
                          type="button"
                          onMouseDown={e => { e.preventDefault(); setShowPresets(false); setShowPresetEditor(true); setEditingPreset(null); }}
                          className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'}`}
                          title="Edit presets"
                        >
                          <Settings size={14} />
                        </button>
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        {stylePresets.map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); applyPreset(preset); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                            }`}
                          >
                            <span
                              style={{
                                color: preset.textColor || 'inherit',
                                background: preset.highlightColor ? preset.highlightColor + '33' : 'none',
                                fontWeight: preset.bold ? 700 : 400,
                                fontStyle: preset.italic ? 'italic' : 'normal',
                                textDecoration: preset.underline ? 'underline' : 'none',
                                borderRadius: '3px',
                                padding: preset.highlightColor ? '1px 4px' : '0',
                              }}
                            >
                              {preset.name}
                            </span>
                          </button>
                        ))}
                        {stylePresets.length === 0 && (
                          <p className={`text-xs text-center py-3 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>No presets yet</p>
                        )}
                      </div>
                      <div className={`px-1.5 pb-1.5`}>
                        <button
                          type="button"
                          onMouseDown={e => {
                            e.preventDefault();
                            // Clear all formatting
                            editor.chain().focus().unsetColor().unsetHighlight().unsetBold().unsetItalic().unsetUnderline().unsetStrike().run();
                            setShowPresets(false);
                          }}
                          className={`w-full text-xs py-1.5 rounded-lg font-medium ${
                            isDark ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Clear formatting
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .material-editor .ProseMirror {
          min-height: 100%;
          padding: 0;
          outline: none;
          font-size: 15px;
          line-height: 1.7;
          color: ${isDark ? 'rgba(255,255,255,0.85)' : '#1e293b'};
        }
        .material-editor .ProseMirror p { margin: 0 0 0.75em; }
        .material-editor .ProseMirror h1 { font-size: 1.75em; font-weight: 700; margin: 0.5em 0; }
        .material-editor .ProseMirror h2 { font-size: 1.35em; font-weight: 600; margin: 0.5em 0; }
        .material-editor .ProseMirror h3 { font-size: 1.1em; font-weight: 600; margin: 0.5em 0; }
        .material-editor .ProseMirror ul { list-style: disc; padding-left: 1.5em; }
        .material-editor .ProseMirror ol { list-style: decimal; padding-left: 1.5em; }
        .material-editor .ProseMirror blockquote {
          border-left: 3px solid ${isDark ? 'rgba(139,92,246,0.6)' : '#8b5cf6'};
          padding: 0.4em 1em;
          margin: 0.75em 0;
          background: ${isDark ? 'rgba(139,92,246,0.08)' : '#f5f3ff'};
          border-radius: 0 8px 8px 0;
        }
        .material-editor .ProseMirror hr { border: none; border-top: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}; margin: 1em 0; }
        .material-editor .ProseMirror mark { border-radius: 3px; padding: 1px 3px; }
        .material-editor .ProseMirror table { border-collapse: collapse; width: 100%; margin: 0.75em 0; }
        .material-editor .ProseMirror th, .material-editor .ProseMirror td { border: 1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}; padding: 6px 10px; }
        .material-editor .ProseMirror th { background: ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}; font-weight: 600; }
      `}</style>

      {showLibraryModal && teacherId && (
        <PdfLibraryModal
          teacherId={teacherId}
          isDark={isDark}
          onSelect={handleLibrarySelect}
          onClose={() => setShowLibraryModal(false)}
        />
      )}

      {/* Preset Editor Modal */}
      {showPresetEditor && (
        <PresetEditorModal
          presets={stylePresets}
          onSave={(p) => { savePresets(p); setShowPresetEditor(false); }}
          onClose={() => setShowPresetEditor(false)}
          isDark={isDark}
        />
      )}
    </div>
  );
}

const PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000', '#ffffff'];

function PresetEditorModal({ presets, onSave, onClose, isDark }) {
  const [items, setItems] = useState(presets.map(p => ({ ...p })));
  const [editing, setEditing] = useState(null);

  const addPreset = () => {
    const np = { id: Date.now().toString(), name: 'New Style', textColor: '', highlightColor: '', bold: false, italic: false, underline: false };
    setItems([...items, np]);
    setEditing(items.length);
  };

  const updateItem = (idx, field, value) => {
    const u = [...items];
    u[idx] = { ...u[idx], [field]: value };
    setItems(u);
  };

  const removeItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
    if (editing === idx) setEditing(null);
  };

  const moveItem = (idx, dir) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= items.length) return;
    const u = [...items];
    [u[idx], u[ni]] = [u[ni], u[idx]];
    setItems(u);
    if (editing === idx) setEditing(ni);
  };

  const border = isDark ? 'border-white/10' : 'border-gray-200';
  const textMuted = isDark ? 'text-white/60' : 'text-gray-500';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl border ${border} ${isDark ? 'bg-[#1a1a1e]' : 'bg-white'}`}>
        <div className={`flex items-center justify-between p-4 border-b ${border}`}>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Edit Style Presets</h3>
          <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.map((preset, idx) => (
            <div key={preset.id} className={`rounded-xl border ${border} ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 p-3">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveItem(idx, -1)} className={`p-0.5 rounded ${isDark ? 'hover:bg-white/10 text-white/30' : 'hover:bg-gray-200 text-gray-400'}`}><ChevronUp size={12} /></button>
                  <button onClick={() => moveItem(idx, 1)} className={`p-0.5 rounded ${isDark ? 'hover:bg-white/10 text-white/30' : 'hover:bg-gray-200 text-gray-400'}`}><ChevronDown size={12} /></button>
                </div>
                <span
                  className="flex-1 text-sm"
                  style={{
                    color: preset.textColor || (isDark ? '#fff' : '#000'),
                    background: preset.highlightColor ? preset.highlightColor + '33' : 'none',
                    fontWeight: preset.bold ? 700 : 400,
                    fontStyle: preset.italic ? 'italic' : 'normal',
                    textDecoration: preset.underline ? 'underline' : 'none',
                    borderRadius: '3px',
                    padding: preset.highlightColor ? '2px 6px' : '0',
                    display: 'inline-block',
                  }}
                >
                  {preset.name || 'Untitled'}
                </span>
                <button
                  onClick={() => setEditing(editing === idx ? null : idx)}
                  className={`p-1.5 rounded-lg ${editing === idx ? 'bg-pink-vibrant text-white' : isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-200 text-gray-500'}`}
                >
                  <Settings size={14} />
                </button>
                <button onClick={() => removeItem(idx)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}>
                  <Trash2 size={14} />
                </button>
              </div>

              {editing === idx && (
                <div className={`px-3 pb-3 pt-2 border-t ${border} space-y-3`}>
                  <div>
                    <label className={`text-xs font-medium ${textMuted}`}>Name</label>
                    <input
                      value={preset.name}
                      onChange={e => updateItem(idx, 'name', e.target.value)}
                      className={`w-full mt-1 px-3 py-1.5 rounded-lg border text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${textMuted}`}>Text Color</label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <button onClick={() => updateItem(idx, 'textColor', '')} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${!preset.textColor ? 'border-pink-vibrant' : isDark ? 'border-white/20' : 'border-gray-300'}`} title="Default">
                        <X size={10} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                      </button>
                      {PALETTE.map(c => (
                        <button key={c} onClick={() => updateItem(idx, 'textColor', c)} className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${preset.textColor === c ? 'border-pink-vibrant scale-110' : c === '#ffffff' ? 'border-gray-300' : isDark ? 'border-white/20' : 'border-gray-300'}`} style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${textMuted}`}>Highlight</label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <button onClick={() => updateItem(idx, 'highlightColor', '')} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${!preset.highlightColor ? 'border-pink-vibrant' : isDark ? 'border-white/20' : 'border-gray-300'}`} title="None">
                        <X size={10} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                      </button>
                      {PALETTE.filter(c => c !== '#ffffff' && c !== '#000000').map(c => (
                        <button key={c} onClick={() => updateItem(idx, 'highlightColor', c)} className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${preset.highlightColor === c ? 'border-pink-vibrant scale-110' : isDark ? 'border-white/20' : 'border-gray-300'}`} style={{ background: c + '33' }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${textMuted}`}>Formatting</label>
                    <div className="flex gap-1.5 mt-1">
                      {[
                        { key: 'bold', label: 'B', style: { fontWeight: 700 } },
                        { key: 'italic', label: 'I', style: { fontStyle: 'italic' } },
                        { key: 'underline', label: 'U', style: { textDecoration: 'underline' } },
                      ].map(opt => (
                        <button key={opt.key} onClick={() => updateItem(idx, opt.key, !preset[opt.key])} className={`w-8 h-8 rounded-lg text-sm font-medium ${preset[opt.key] ? 'bg-pink-vibrant text-white' : isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} style={opt.style}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={`flex items-center justify-between p-4 border-t ${border}`}>
          <button onClick={addPreset} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-white/10 text-white/80 hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <Plus size={16} /> Add Preset
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-white/5 text-white/70 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Cancel</button>
            <button onClick={() => onSave(items)} className="px-4 py-2 rounded-lg text-sm font-medium bg-pink-vibrant text-white hover:brightness-110">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
