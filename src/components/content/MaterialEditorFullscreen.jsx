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
import {
  X, Check, Loader2, ChevronLeft, ChevronRight, Upload, ScanText, FileText, ArrowRight,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Quote,
  Table as TableIcon, Minus, Pilcrow, Heading1, Heading2, Heading3
} from 'lucide-react';
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

  // Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
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

  useEffect(() => {
    if (editor && material?.content && material.content !== editor.getHTML()) {
      editor.commands.setContent(material.content, false);
    }
  }, [material?.content]);

  // Load PDF
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setLoadingPdf(true);
    setFileName(file.name);
    setOcrHtml('');
    setSelectedPages([]);

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
        setThumbnails(prev => prev.map(t => t.pageNum === i ? { ...t, dataUrl } : t));
      }
    } catch (err) {
      console.error('Failed to load PDF:', err);
    } finally {
      setLoadingPdf(false);
    }
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
    if (selectedPages.length === 0 || !pdf) return;
    setOcrProgress({ status: 'processing', current: 0, total: selectedPages.length, error: null });
    setOcrHtml('');
    setThumbnails(prev => prev.map(t => selectedPages.includes(t.pageNum) ? { ...t, status: 'processing' } : t));

    const htmlParts = [];
    try {
      for (let i = 0; i < selectedPages.length; i++) {
        const pageNum = selectedPages[i];
        setOcrProgress(prev => ({ ...prev, current: i + 1 }));
        const blob = await renderPageToBlob(pdf, pageNum, 2.0);
        const html = await ocrBlobToHtml(blob);
        htmlParts.push(html);
        setThumbnails(prev => prev.map(t => t.pageNum === pageNum ? { ...t, status: 'done' } : t));
      }
      setOcrHtml(htmlParts.join('<hr>'));
      setOcrProgress({ status: 'done', current: selectedPages.length, total: selectedPages.length, error: null });
    } catch (err) {
      setOcrProgress({ status: 'error', current: 0, total: selectedPages.length, error: err.message });
      setThumbnails(prev => prev.map(t => selectedPages.includes(t.pageNum) && t.status === 'processing' ? { ...t, status: 'error' } : t));
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
  };

  const closePdf = () => {
    setPdf(null);
    setFileName('');
    setThumbnails([]);
    setSelectedPages([]);
    setOcrHtml('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isProcessing = ocrProgress.status === 'processing';
  const hasOcrContent = ocrHtml && ocrHtml.trim().length > 0;

  // Toolbar button helper
  const ToolBtn = ({ active, onClick, title, children }) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`p-2 rounded-lg transition-colors ${
        active
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
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: isDark ? '#0f0f12' : '#f5f5f5' }}>
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
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save
          </button>
          <button onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main: 25% PDF | 25% OCR | 50% Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Column - 25% */}
        <div className={`w-1/4 flex flex-col border-r ${isDark ? 'bg-[#1a1a1e] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
          {!pdf ? (
            <div onClick={() => fileInputRef.current?.click()} className={`flex-1 flex flex-col items-center justify-center cursor-pointer ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-100'}`}>
              {loadingPdf ? <Loader2 className="w-8 h-8 animate-spin text-pink-vibrant mb-2" /> : <Upload className={`w-8 h-8 mb-2 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />}
              <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{loadingPdf ? 'Loading...' : 'Load PDF'}</p>
            </div>
          ) : (
            <>
              <div className={`flex items-center justify-between p-2 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                  <span className={`text-xs truncate ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{fileName}</span>
                </div>
                <button onClick={closePdf} className={`p-1 rounded ${isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-gray-200 text-gray-400'}`}>
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
          <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileSelect} className="hidden" />
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
          <div className="flex-1 overflow-auto p-4 pb-20">
            <EditorContent editor={editor} className={`material-editor min-h-full ${isDark ? 'dark' : 'light'}`} />
          </div>

          {/* Floating Dock Toolbar */}
          {editor && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
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

                <div className={`w-px h-6 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

                <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List"><List size={18} /></ToolBtn>
                <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List"><ListOrdered size={18} /></ToolBtn>
                <ToolBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote"><Quote size={18} /></ToolBtn>

                <div className={`w-px h-6 mx-1 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

                <ToolBtn active={false} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Table"><TableIcon size={18} /></ToolBtn>
                <ToolBtn active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus size={18} /></ToolBtn>
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
        .material-editor .ProseMirror table { border-collapse: collapse; width: 100%; margin: 0.75em 0; }
        .material-editor .ProseMirror th, .material-editor .ProseMirror td { border: 1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}; padding: 6px 10px; }
        .material-editor .ProseMirror th { background: ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}; font-weight: 600; }
      `}</style>
    </div>
  );
}
