import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Loader2, ScanText, FileText,
  BookOpen, ClipboardList, Check, X
} from 'lucide-react';
import { loadPdfFromUrl, renderPageToCanvas, renderPageToBlob, generateThumbnail } from '../../utils/pdfUtils';
import { ocrBlobToHtml } from '../../utils/ocrToHtml';
import PdfPageThumbnail from './PdfPageThumbnail';

export default function PdfLibraryWorkbench({ pdf, teacherId, isDark, onBack }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [thumbnails, setThumbnails] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);

  const [ocrProgress, setOcrProgress] = useState({ status: 'idle', current: 0, total: 0 });
  const [ocrHtml, setOcrHtml] = useState('');

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveType, setSaveType] = useState('material');
  const [saving, setSaving] = useState(false);
  const [saveForm, setSaveForm] = useState({ title: '', topicId: null });
  const [topics, setTopics] = useState([]);

  const canvasRef = useRef(null);
  const ocrContentRef = useRef(null);

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
    renderPageToCanvas(pdfDoc, currentPage, canvasRef.current, 1.5);
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    const loadTopics = async () => {
      const { data } = await supabase
        .from('topics')
        .select('id, name')
        .eq('teacher_id', teacherId)
        .order('name');
      setTopics(data || []);
    };
    loadTopics();
  }, [teacherId]);

  const togglePageSelection = (pageNum) => {
    setSelectedPages(prev =>
      prev.includes(pageNum) ? prev.filter(p => p !== pageNum) : [...prev, pageNum].sort((a, b) => a - b)
    );
  };

  const runOcr = async () => {
    if (selectedPages.length === 0 || !pdfDoc) return;

    setOcrProgress({ status: 'processing', current: 0, total: selectedPages.length });
    setOcrHtml('');
    setThumbnails(prev => prev.map(t => selectedPages.includes(t.pageNum) ? { ...t, status: 'processing' } : t));

    const htmlParts = [];
    try {
      for (let i = 0; i < selectedPages.length; i++) {
        const pageNum = selectedPages[i];
        setOcrProgress(prev => ({ ...prev, current: i + 1 }));
        const blob = await renderPageToBlob(pdfDoc, pageNum, 2.0);
        const html = await ocrBlobToHtml(blob);
        htmlParts.push(html);
        setThumbnails(prev => prev.map(t => t.pageNum === pageNum ? { ...t, status: 'done' } : t));
      }
      setOcrHtml(htmlParts.join('<hr>'));
      setOcrProgress({ status: 'done', current: selectedPages.length, total: selectedPages.length });
    } catch (err) {
      setOcrProgress({ status: 'error', current: 0, total: selectedPages.length });
      setThumbnails(prev => prev.map(t => selectedPages.includes(t.pageNum) && t.status === 'processing' ? { ...t, status: 'error' } : t));
    }
  };

  const openSaveModal = (type) => {
    setSaveType(type);
    setSaveForm({ title: pdf.title, topicId: topics[0]?.id || null });
    setShowSaveModal(true);
  };

  const handleSave = async () => {
    if (!saveForm.topicId || !ocrHtml) return;
    setSaving(true);

    try {
      if (saveType === 'material') {
        await supabase.from('materials').insert({
          topic_id: saveForm.topicId,
          teacher_id: teacherId,
          title: saveForm.title || pdf.title,
          content: ocrHtml,
          level: 'B1',
        });
      } else {
        const { data: test } = await supabase
          .from('tests')
          .insert({
            topic_id: saveForm.topicId,
            teacher_id: teacherId,
            title: saveForm.title || pdf.title,
          })
          .select('id')
          .single();

        if (test) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(ocrHtml, 'text/html');
          const text = doc.body.textContent || '';
          const lines = text.split(/\n/).filter(l => l.trim());
          const questions = [];
          lines.forEach((line) => {
            const match = line.match(/^\d+[.)]\s*(.+)/);
            if (match) {
              questions.push({
                test_id: test.id,
                question: match[1].trim(),
                type: 'fill_blank',
                correct_answer: '',
                sort_order: questions.length,
              });
            }
          });
          if (questions.length > 0) {
            await supabase.from('test_questions').insert(questions);
          }
        }
      }
      setShowSaveModal(false);
      alert('Saved!');
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const isProcessing = ocrProgress.status === 'processing';
  const hasOcrContent = ocrHtml && ocrHtml.trim().length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={40} className="animate-spin text-pink-vibrant" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
            <FileText size={20} />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{pdf.title}</h2>
            <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{pdf.page_count} pages</p>
          </div>
        </div>
      </div>

      <div className={`flex rounded-2xl overflow-hidden border ${isDark ? 'bg-[#1a1a1e] border-white/10' : 'bg-white border-gray-200'}`} style={{ height: 'calc(100vh - 240px)' }}>
        <div className={`w-24 flex-shrink-0 overflow-y-auto border-r p-2 space-y-2 ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
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

        <div className={`w-1/3 flex flex-col border-l ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className={`flex items-center justify-between p-3 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <span className={`text-sm font-medium ${isDark ? 'text-white/70' : 'text-gray-700'}`}>OCR Result</span>
            {hasOcrContent && (
              <div className="flex gap-2">
                <button onClick={() => openSaveModal('material')} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                  <BookOpen size={12} /> Material
                </button>
                <button onClick={() => openSaveModal('test')} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                  <ClipboardList size={12} /> Test
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4" ref={ocrContentRef}>
            {hasOcrContent ? (
              <div className={`prose prose-sm max-w-none select-text ${isDark ? 'prose-invert' : ''}`} style={{ fontSize: '13px' }} dangerouslySetInnerHTML={{ __html: ocrHtml }} />
            ) : (
              <div className={`h-full flex flex-col items-center justify-center ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                <ScanText size={40} className="mb-3" />
                <p className="text-sm text-center">Select pages and run OCR</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowSaveModal(false)}>
          <div className={`rounded-2xl p-6 w-full max-w-md ${isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Save as {saveType === 'material' ? 'Material' : 'Test'}</h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>Title</label>
                <input value={saveForm.title} onChange={e => setSaveForm({ ...saveForm, title: e.target.value })} className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>Topic</label>
                <select value={saveForm.topicId || ''} onChange={e => setSaveForm({ ...saveForm, topicId: e.target.value })} className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                  <option value="">Select topic...</option>
                  {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={() => setShowSaveModal(false)} className={`px-4 py-2 rounded-lg font-medium ${isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-gray-100 text-gray-600'}`}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !saveForm.topicId} className="px-4 py-2 rounded-lg font-medium bg-pink-vibrant text-white hover:brightness-110 disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
