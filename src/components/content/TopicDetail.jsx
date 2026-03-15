import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import {
  ArrowLeft, BookOpen, ClipboardList,
  Plus, Edit2, Trash2, X, Check, Loader,
  ChevronDown, ChevronUp, GripVertical, ClipboardPaste, Image, Upload, FolderOpen
} from 'lucide-react';
import RichTextEditor from '../common/RichTextEditor';
import ConfirmDeleteModal from '../common/ConfirmDeleteModal';
import MaterialEditorFullscreen from './MaterialEditorFullscreen';
import PdfLibraryModal from './PdfLibraryModal';
import PdfOcrModal from './PdfOcrModal';
import { parseTestText } from '../../utils/testParser';
import { ocrBlobToHtml } from '../../utils/ocrToHtml';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'true_false', label: 'True / False' },
];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const inp = (isDark, extra = '') =>
  `w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50 ${extra} ${
    isDark
      ? 'bg-white/[0.05] border-white/10 text-white placeholder-white/30'
      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
  }`;

const card = (isDark) =>
  `rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-gray-200'}`;

const lbl = (isDark) =>
  `block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`;

export default function TopicDetail({ topic, teacherId, isDark, onBack }) {
  const [activeTab, setActiveTab] = useState('theory');

  // ── Materials (multiple per topic) ────────────────────
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [editingMaterial, setEditingMaterial] = useState(null); // null = new, object = editing
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materialForm, setMaterialForm] = useState({ title: '', content: '', level: 'B1' });
  const [initialMaterialForm, setInitialMaterialForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [expandedMaterial, setExpandedMaterial] = useState(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  const loadMaterials = async () => {
    setLoadingMaterials(true);
    const { data } = await supabase
      .from('materials')
      .select('*')
      .eq('topic_id', topic.id)
      .eq('teacher_id', teacherId)
      .order('sort_order', { ascending: true });
    setMaterials(data || []);
    setLoadingMaterials(false);
  };

  useEffect(() => { loadMaterials(); }, [topic.id]);

  const openMaterialForm = (mat = null) => {
    let newForm;
    if (mat) {
      setEditingMaterial(mat);
      newForm = { title: mat.title, content: mat.content, level: mat.level || 'B1' };
    } else {
      setEditingMaterial(null);
      newForm = { title: '', content: '', level: 'B1' };
    }
    setMaterialForm(newForm);
    setInitialMaterialForm(newForm);
    setShowMaterialForm(true);
  };

  const hasMaterialChanges = () => {
    if (!initialMaterialForm) return false;
    return (
      materialForm.title !== initialMaterialForm.title ||
      materialForm.content !== initialMaterialForm.content ||
      materialForm.level !== initialMaterialForm.level
    );
  };

  const closeMaterialForm = () => {
    setShowMaterialForm(false);
    setInitialMaterialForm(null);
  };

  const handleMaterialBackdropClick = () => {
    if (hasMaterialChanges()) {
      setShowUnsavedConfirm(true);
    } else {
      closeMaterialForm();
    }
  };

  const confirmDiscardChanges = () => {
    setShowUnsavedConfirm(false);
    closeMaterialForm();
  };

  const saveMaterial = async () => {
    if (!materialForm.content.trim() || materialForm.content === '<p></p>') return;
    setSavingMaterial(true);
    const payload = {
      title: materialForm.title || topic.name,
      content: materialForm.content,
      level: materialForm.level,
      topic_id: topic.id,
      teacher_id: teacherId,
      updated_at: new Date().toISOString(),
    };
    if (editingMaterial) {
      await supabase.from('materials').update(payload).eq('id', editingMaterial.id);
    } else {
      payload.sort_order = materials.length;
      await supabase.from('materials').insert(payload);
    }
    await loadMaterials();
    closeMaterialForm();
    setSavingMaterial(false);
  };

  const deleteMaterial = (mat) => setDeleteTarget({ type: 'material', item: mat });

  const executeDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'material') {
      await supabase.from('materials').delete().eq('id', deleteTarget.item.id);
      loadMaterials();
    } else if (deleteTarget.type === 'test') {
      await supabase.from('tests').delete().eq('id', deleteTarget.item.id);
      loadTests();
    }
    setDeleteTarget(null);
  };

  // ── Tests ────────────────────────────────────────────────
  const [tests, setTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [expandedTest, setExpandedTest] = useState(null);
  const [savingTest, setSavingTest] = useState(false);
  const [testForm, setTestForm] = useState({ title: '', description: '', questions: [] });
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteImage, setPasteImage] = useState(null); // { file, url }
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const pasteImageInputRef = useRef(null);
  const [showTestLibraryModal, setShowTestLibraryModal] = useState(false);
  const [testLibraryPdf, setTestLibraryPdf] = useState(null);

  // Drag state
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [dragType, setDragType] = useState(null); // 'material' or 'test'

  const emptyQ = () => ({
    question_text: '', question_type: 'multiple_choice',
    options: ['', '', '', ''], correct_answer: '',
    explanation_correct: '', explanation_wrong: '', hint: '',
  });

  // Helper to process parsed result and update test form
  const applyParsedQuestions = (result) => {
    // Handle both new format (object with title/description/questions) and old format (just array)
    const parsedQuestions = Array.isArray(result) ? result : (result.questions || []);
    const parsedTitle = Array.isArray(result) ? '' : (result.title || '');
    const parsedDescription = Array.isArray(result) ? '' : (result.description || '');

    if (parsedQuestions.length > 0) {
      setTestForm(prev => {
        // Check if the existing questions array has only one empty question
        const hasOnlyEmptyQuestion = prev.questions.length === 1 && !prev.questions[0].question_text.trim();

        const newQuestions = parsedQuestions.map(q => {
          const opts = q.options || [];
          const finalOpts = q.type === 'fill_blank' && opts.length === 0
            ? []
            : opts.length > 0 ? opts : ['', ''];
          return {
            question_text: q.question || '',
            question_type: q.type || 'fill_blank',
            options: finalOpts,
            correct_answer: q.answer || '',
            explanation_correct: '', explanation_wrong: '', hint: '',
          };
        });

        return {
          title: prev.title || parsedTitle,
          description: prev.description || parsedDescription,
          questions: hasOnlyEmptyQuestion ? newQuestions : [...prev.questions, ...newQuestions],
        };
      });
    }
  };

  // Handle OCR text from PDF library
  const handleLibraryOcrComplete = (text) => {
    setTestLibraryPdf(null);
    if (!text.trim()) return;

    const result = parseTestText(text);
    applyParsedQuestions(result);
  };

  const handlePasteQuestions = async () => {
    // If image is present, run OCR first
    if (pasteImage) {
      setOcrProcessing(true);
      try {
        const html = await ocrBlobToHtml(pasteImage.file);
        // Extract text from HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const text = doc.body.textContent || '';
        const result = parseTestText(text);
        applyParsedQuestions(result);
      } catch (err) {
        console.error('OCR error:', err);
        alert('OCR error: ' + err.message);
      }
      setOcrProcessing(false);
      setPasteImage(null);
      setShowPasteModal(false);
      return;
    }

    // Otherwise parse text
    if (!pasteText.trim()) return;
    const result = parseTestText(pasteText);
    applyParsedQuestions(result);
    setPasteText('');
    setShowPasteModal(false);
  };

  const handlePasteModalPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          setPasteImage({ file, url: URL.createObjectURL(file) });
          setPasteText(''); // Clear text when image is pasted
        }
        return;
      }
    }
  };

  const handlePasteImageDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setPasteImage({ file, url: URL.createObjectURL(file) });
      setPasteText('');
    }
  };

  const handlePasteImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPasteImage({ file, url: URL.createObjectURL(file) });
      setPasteText('');
    }
  };

  const clearPasteImage = () => {
    if (pasteImage?.url) URL.revokeObjectURL(pasteImage.url);
    setPasteImage(null);
  };

  const loadTests = async () => {
    setLoadingTests(true);
    let { data } = await supabase
      .from('tests')
      .select('*')
      .eq('topic_id', topic.id)
      .eq('teacher_id', teacherId);

    // Sort by sort_order if exists, otherwise by created_at
    if (data) {
      data.sort((a, b) => {
        if (a.sort_order != null && b.sort_order != null) {
          return a.sort_order - b.sort_order;
        }
        if (a.sort_order != null) return -1;
        if (b.sort_order != null) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    }
    if (data?.length) {
      const { data: qData } = await supabase
        .from('test_questions')
        .select('*')
        .in('test_id', data.map(t => t.id));
      const qMap = {};
      qData?.forEach(q => {
        if (!qMap[q.test_id]) qMap[q.test_id] = [];
        qMap[q.test_id].push(q);
      });
      data.forEach(t => { t.test_questions = qMap[t.id] || []; });
    }
    setTests(data || []);
    setLoadingTests(false);
  };

  useEffect(() => { if (activeTab === 'tests') loadTests(); }, [activeTab, topic.id]);

  const openTestModal = async (test = null) => {
    if (test) {
      setEditingTest(test);
      const { data: qs } = await supabase
        .from('test_questions').select('*').eq('test_id', test.id).order('sort_order');
      setTestForm({
        title: test.title,
        description: test.description || '',
        questions: qs?.map(q => {
          const questionType = q.type || q.question_type || 'multiple_choice';
          const opts = q.options || [];

          // For fill_blank without stored options, keep empty array
          // For multiple_choice, pad to 4 options
          let finalOpts;
          if (questionType === 'fill_blank' && opts.length === 0) {
            finalOpts = [];
          } else if (questionType === 'multiple_choice' || questionType === 'true_false') {
            finalOpts = [...opts, '', '', '', ''].slice(0, 4);
          } else {
            // fill_blank with options - keep as is
            finalOpts = opts;
          }

          return {
            id: q.id,
            question_text: q.question || q.question_text || '',
            question_type: questionType,
            options: finalOpts,
            correct_answer: q.correct_answer || '',
            explanation_correct: q.explanation_correct || '',
            explanation_wrong: q.explanation_wrong || '',
            hint: q.hint || '',
          };
        }) || [emptyQ()],
      });
    } else {
      setEditingTest(null);
      setTestForm({ title: '', description: '', questions: [emptyQ()] });
    }
    setShowTestModal(true);
  };

  const saveTest = async (e) => {
    e.preventDefault();
    setSavingTest(true);
    const payload = {
      title: testForm.title,
      description: testForm.description || null,
      topic_id: topic.id,
      teacher_id: teacherId,
      updated_at: new Date().toISOString(),
    };
    let testId = editingTest?.id;
    if (editingTest) {
      await supabase.from('tests').update(payload).eq('id', testId);
      await supabase.from('test_questions').delete().eq('test_id', testId);
    } else {
      const { data } = await supabase.from('tests').insert(payload).select('id').single();
      testId = data?.id;
    }
    const qs = testForm.questions.filter(q => q.question_text.trim()).map((q, i) => {
      // Save options for both multiple_choice and fill_blank (if has options)
      const hasOptions = q.options?.some(o => o?.trim());
      return {
        test_id: testId,
        question: q.question_text,
        type: q.question_type,
        options: hasOptions ? q.options.filter(o => o?.trim()) : null,
        correct_answer: q.correct_answer,
        explanation_correct: q.explanation_correct || null,
        explanation_wrong: q.explanation_wrong || null,
        hint: q.hint || null,
        sort_order: i,
      };
    });
    if (qs.length) await supabase.from('test_questions').insert(qs);
    await loadTests();
    setShowTestModal(false);
    setSavingTest(false);
  };

  const updateQ = (qi, field, value) => {
    const qs = [...testForm.questions];
    qs[qi] = { ...qs[qi], [field]: value };
    setTestForm({ ...testForm, questions: qs });
  };

  const updateQOption = (qi, oi, value) => {
    const qs = [...testForm.questions];
    const opts = [...qs[qi].options];
    opts[oi] = value;
    qs[qi] = { ...qs[qi], options: opts };
    setTestForm({ ...testForm, questions: qs });
  };

  const addQOption = (qi) => {
    const qs = [...testForm.questions];
    if (qs[qi].options.length >= 8) return; // Max 8 options
    qs[qi] = { ...qs[qi], options: [...qs[qi].options, ''] };
    setTestForm({ ...testForm, questions: qs });
  };

  const removeQOption = (qi, oi) => {
    const qs = [...testForm.questions];
    const newOpts = qs[qi].options.filter((_, i) => i !== oi);
    // If removed option was the correct answer, clear it
    const removedLetter = String.fromCharCode(65 + oi);
    let newCorrect = qs[qi].correct_answer;
    if (newCorrect === removedLetter) {
      newCorrect = '';
    } else if (newCorrect.length === 1 && newCorrect >= 'A' && newCorrect <= 'H') {
      // Shift letter if needed
      const removedIdx = oi;
      const correctIdx = newCorrect.charCodeAt(0) - 65;
      if (correctIdx > removedIdx) {
        newCorrect = String.fromCharCode(64 + correctIdx); // Shift down by 1
      }
    }
    qs[qi] = { ...qs[qi], options: newOpts, correct_answer: newCorrect };
    setTestForm({ ...testForm, questions: qs });
  };

  const deleteTest = (test) => setDeleteTarget({ type: 'test', item: test });

  // Drag handlers for reordering
  const handleDragStart = (e, item, type) => {
    setDraggedItem(item);
    setDragType(type);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    // Add dragging class after a small delay to allow drag image to capture
    setTimeout(() => e.target.classList.add('opacity-50'), 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('opacity-50');
    setDraggedItem(null);
    setDragOverItem(null);
    setDragType(null);
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();
    if (draggedItem && draggedItem.id !== item.id) {
      setDragOverItem(item);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = async (e, targetItem, type) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id || dragType !== type) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const items = type === 'material' ? [...materials] : [...tests];
    const dragIdx = items.findIndex(i => i.id === draggedItem.id);
    const targetIdx = items.findIndex(i => i.id === targetItem.id);

    if (dragIdx === -1 || targetIdx === -1) return;

    // Reorder
    const [removed] = items.splice(dragIdx, 1);
    items.splice(targetIdx, 0, removed);

    // Update state immediately for responsiveness
    if (type === 'material') {
      setMaterials(items);
    } else {
      setTests(items);
    }

    setDraggedItem(null);
    setDragOverItem(null);

    // Update sort_order in database (silently fail if column doesn't exist)
    try {
      const table = type === 'material' ? 'materials' : 'tests';
      for (let idx = 0; idx < items.length; idx++) {
        await supabase.from(table).update({ sort_order: idx }).eq('id', items[idx].id);
      }
    } catch (err) {
      console.error('Failed to save sort order:', err);
    }
  };

  const tabBtn = (key, label, Icon) => (
    <button
      key={key}
      onClick={() => setActiveTab(key)}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        activeTab === key
          ? 'bg-pink-vibrant text-white shadow-lg'
          : isDark
            ? 'text-white/60 hover:text-white hover:bg-white/[0.05]'
            : 'text-gray-600 hover:text-gray-900 hover:bg-white'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <>
    <div className="space-y-6">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{topic.name}</h2>
          {topic.name_ru && (
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{topic.name_ru}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 p-1.5 rounded-2xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-100'}`}>
        {tabBtn('theory', 'Materials', BookOpen)}
        {tabBtn('tests', 'Tests', ClipboardList)}
      </div>

      {/* ── Materials ── */}
      {activeTab === 'theory' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => openMaterialForm()}
              className="flex items-center gap-2 px-4 py-2.5 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110"
            >
              <Plus size={18} /> Add Material
            </button>
          </div>

          {loadingMaterials ? (
            <div className="flex justify-center py-8">
              <Loader size={28} className="animate-spin text-pink-vibrant" />
            </div>
          ) : materials.length === 0 ? (
            <div className={`text-center py-12 rounded-2xl ${isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-gray-200'}`}>
              <BookOpen size={40} className={`mx-auto mb-3 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
              <p className={`mb-4 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>No materials yet for this topic</p>
              <button
                onClick={() => openMaterialForm()}
                className="inline-flex items-center gap-2 px-5 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110"
              >
                <Plus size={18} /> Add Material
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map((mat) => (
                <div
                  key={mat.id}
                  className={`${card(isDark)} overflow-hidden transition-all group ${dragOverItem?.id === mat.id && dragType === 'material' ? 'ring-2 ring-pink-vibrant' : ''} ${isDark ? 'hover:bg-white/[0.06] hover:border-white/20' : 'hover:shadow-md hover:border-gray-300'}`}
                  draggable
                  onDragStart={e => handleDragStart(e, mat, 'material')}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => handleDragOver(e, mat)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, mat, 'material')}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`cursor-grab active:cursor-grabbing p-1 -ml-1 rounded ${isDark ? 'text-white/30 hover:text-white/60' : 'text-gray-300 hover:text-gray-500'}`}>
                          <GripVertical size={18} />
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                          <BookOpen size={20} />
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openMaterialForm(mat)}
                          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'}`}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteMaterial(mat)}
                          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{mat.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {mat.level && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'}`}>
                          {mat.level}
                        </span>
                      )}
                      <span className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                        {new Date(mat.updated_at || mat.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => setExpandedMaterial(expandedMaterial === mat.id ? null : mat.id)}
                      className={`mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isDark
                          ? 'bg-white/[0.05] text-white/80 hover:bg-white/[0.1]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {expandedMaterial === mat.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      {expandedMaterial === mat.id ? 'Collapse' : 'Preview'}
                    </button>
                  </div>
                  {expandedMaterial === mat.id && (
                    <div className={`px-5 pb-4 pt-3 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                      <div
                        className={`rich-content ${isDark ? 'dark' : 'light'}`}
                        dangerouslySetInnerHTML={{ __html: mat.content }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <style>{`
            .rich-content { font-size: 15px; line-height: 1.7; color: ${isDark ? 'rgba(255,255,255,0.82)' : '#1e293b'}; }
            .rich-content p { margin: 0 0 0.75em; }
            .rich-content p:last-child { margin-bottom: 0; }
            .rich-content h1 { font-size: 1.75em; font-weight: 700; margin: 0.75em 0 0.4em; }
            .rich-content h2 { font-size: 1.35em; font-weight: 600; margin: 0.75em 0 0.4em; }
            .rich-content h3 { font-size: 1.1em; font-weight: 600; margin: 0.75em 0 0.4em; }
            .rich-content ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
            .rich-content ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
            .rich-content li { margin: 0.25em 0; }
            .rich-content strong { font-weight: 700; }
            .rich-content em { font-style: italic; }
            .rich-content u { text-decoration: underline; }
            .rich-content s { text-decoration: line-through; }
            .rich-content blockquote {
              border-left: 3px solid ${isDark ? 'rgba(139,92,246,0.6)' : '#8b5cf6'};
              padding: 0.4em 0 0.4em 1em; margin: 0.75em 0;
              background: ${isDark ? 'rgba(139,92,246,0.08)' : '#f5f3ff'};
              border-radius: 0 8px 8px 0;
            }
            .rich-content hr { border: none; border-top: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}; margin: 1em 0; }
            .rich-content table { border-collapse: collapse; width: 100%; margin: 0.75em 0; table-layout: fixed; }
            .rich-content th, .rich-content td { border: 1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}; padding: 6px 10px; text-align: left; }
            .rich-content th { background: ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}; font-weight: 600; }
          `}</style>
        </div>
      )}

      {/* ── Tests ── */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => openTestModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110"
            >
              <Plus size={18} /> Add Test
            </button>
          </div>

          {loadingTests ? (
            <div className="flex justify-center py-8">
              <Loader size={28} className="animate-spin text-pink-vibrant" />
            </div>
          ) : tests.length === 0 ? (
            <div className={`text-center py-12 rounded-2xl ${isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-gray-200'}`}>
              <ClipboardList size={40} className={`mx-auto mb-3 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
              <p className={isDark ? 'text-white/50' : 'text-gray-500'}>No tests for this topic yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tests.map(test => (
                <div
                  key={test.id}
                  className={`${card(isDark)} overflow-hidden transition-all group ${dragOverItem?.id === test.id && dragType === 'test' ? 'ring-2 ring-pink-vibrant' : ''} ${isDark ? 'hover:bg-white/[0.06] hover:border-white/20' : 'hover:shadow-md hover:border-gray-300'}`}
                  draggable
                  onDragStart={e => handleDragStart(e, test, 'test')}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => handleDragOver(e, test)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, test, 'test')}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`cursor-grab active:cursor-grabbing p-1 -ml-1 rounded ${isDark ? 'text-white/30 hover:text-white/60' : 'text-gray-300 hover:text-gray-500'}`}>
                          <GripVertical size={18} />
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                          <ClipboardList size={20} />
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openTestModal(test)}
                          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'}`}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteTest(test)}
                          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{test.title}</h4>
                    <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      {test.test_questions?.length || 0} question{test.test_questions?.length !== 1 ? 's' : ''}
                    </p>
                    {test.test_questions?.length > 0 && (
                      <button
                        onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
                        className={`mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                          isDark
                            ? 'bg-white/[0.05] text-white/80 hover:bg-white/[0.1]'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {expandedTest === test.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        {expandedTest === test.id ? 'Collapse' : 'Preview'}
                      </button>
                    )}
                  </div>
                  {expandedTest === test.id && test.test_questions?.length > 0 && (
                    <div className={`px-5 pb-4 pt-3 border-t ${isDark ? 'border-white/5' : 'border-gray-100'} space-y-2`}>
                      {test.test_questions.map((q, i) => (
                        <div key={q.id} className={`p-3 rounded-xl text-sm ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                          <span className={`font-medium mr-2 ${isDark ? 'text-white/50' : 'text-gray-400'}`}>{i + 1}.</span>
                          <span className={isDark ? 'text-white/80' : 'text-gray-800'}>{q.question || q.question_text}</span>
                          <span className={`ml-2 text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>→ {q.correct_answer}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>

      {/* ── Material Fullscreen Editor ── */}
      {showMaterialForm && (
        <MaterialEditorFullscreen
          material={editingMaterial}
          topicName={topic.name}
          teacherId={teacherId}
          onSave={async (formData) => {
            const payload = {
              title: formData.title || topic.name,
              content: formData.content,
              level: formData.level,
              topic_id: topic.id,
              teacher_id: teacherId,
              updated_at: new Date().toISOString(),
            };
            if (editingMaterial) {
              await supabase.from('materials').update(payload).eq('id', editingMaterial.id);
              // Update editingMaterial with new data
              setEditingMaterial({ ...editingMaterial, ...payload });
            } else {
              payload.sort_order = materials.length;
              const { data } = await supabase.from('materials').insert(payload).select().single();
              // Set editingMaterial to the newly created material so user can continue editing
              if (data) setEditingMaterial(data);
            }
            await loadMaterials();
            // Update both forms to current state (so no "unsaved changes" warning)
            setInitialMaterialForm(formData);
            setMaterialForm(formData);
            // Don't close - user closes manually
          }}
          onClose={handleMaterialBackdropClick}
          isDark={isDark}
        />
      )}

      {/* ── Test Modal ── */}
      {showTestModal && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen flex items-center justify-center p-4 z-50 bg-black/60 backdrop-blur-sm"
        >
          <div
            className={`relative rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col ${isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-gray-200'}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-6 pb-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingTest ? 'Edit Test' : 'New Test'}
              </h3>
              <button
                onClick={() => setShowTestModal(false)}
                className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable content */}
            <form onSubmit={saveTest} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className={lbl(isDark)}>Title *</label>
                <input
                  value={testForm.title}
                  onChange={e => setTestForm({ ...testForm, title: e.target.value })}
                  placeholder="e.g., Present Simple Quiz"
                  className={inp(isDark)}
                  required
                />
              </div>
              <div>
                <label className={lbl(isDark)}>Description</label>
                <input
                  value={testForm.description}
                  onChange={e => setTestForm({ ...testForm, description: e.target.value })}
                  placeholder="Brief description..."
                  className={inp(isDark)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className={lbl(isDark).replace('mb-2', '')}>Questions</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTestForm({ ...testForm, questions: [...testForm.questions, emptyQ()] })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      <Plus size={14} /> Add Question
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasteModal(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
                    >
                      <ClipboardPaste size={14} /> Paste Questions
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTestLibraryModal(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                    >
                      <FolderOpen size={14} /> From Library
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {testForm.questions.map((q, qi) => (
                    <div
                      key={qi}
                      className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-gray-50 border border-gray-100'}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Question {qi + 1}</span>
                        {testForm.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setTestForm({ ...testForm, questions: testForm.questions.filter((_, j) => j !== qi) })}
                            className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <input
                        value={q.question_text}
                        onChange={e => updateQ(qi, 'question_text', e.target.value)}
                        placeholder="Enter question..."
                        className={inp(isDark, 'py-2.5 mb-3')}
                      />
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {QUESTION_TYPES.map(t => (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => updateQ(qi, 'question_type', t.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              q.question_type === t.value
                                ? 'bg-pink-vibrant text-white'
                                : isDark ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                      {/* Multiple Choice: always show options */}
                      {q.question_type === 'multiple_choice' && (
                        <div className="space-y-2 mb-3">
                          <div className="grid grid-cols-2 gap-2">
                            {q.options.map((opt, oi) => {
                              const letter = String.fromCharCode(65 + oi);
                              const isSelected = q.correct_answer === letter || q.correct_answer === opt;
                              return (
                                <div key={oi} className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => updateQ(qi, 'correct_answer', letter)}
                                    className={`w-8 h-full rounded-l-lg text-xs font-bold transition-all flex-shrink-0 ${
                                      isSelected
                                        ? 'bg-green-500 text-white'
                                        : isDark
                                          ? 'bg-white/[0.08] text-white/50 hover:bg-white/[0.15]'
                                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                    }`}
                                  >
                                    {letter}
                                  </button>
                                  <input
                                    value={opt}
                                    onChange={e => updateQOption(qi, oi, e.target.value)}
                                    placeholder={`Option ${letter}`}
                                    className={`flex-1 px-3 py-2 text-sm border-y ${
                                      isSelected
                                        ? isDark
                                          ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                          : 'bg-green-50 border-green-200 text-green-700'
                                        : isDark
                                          ? 'bg-white/[0.05] border-white/10 text-white placeholder-white/30'
                                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeQOption(qi, oi)}
                                    className={`w-8 h-full rounded-r-lg text-xs transition-all flex-shrink-0 flex items-center justify-center ${
                                      isDark
                                        ? 'bg-white/[0.05] border-y border-r border-white/10 text-white/30 hover:text-red-400 hover:bg-red-500/10'
                                        : 'bg-gray-50 border-y border-r border-gray-200 text-gray-300 hover:text-red-500 hover:bg-red-50'
                                    }`}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          {q.options.length < 8 && (
                            <button
                              type="button"
                              onClick={() => addQOption(qi)}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                isDark
                                  ? 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
                                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <Plus size={12} /> Add option
                            </button>
                          )}
                        </div>
                      )}

                      {/* Fill in the Blank */}
                      {q.question_type === 'fill_blank' && (
                        <div className="space-y-3 mb-3">
                          {/* Text input for correct answer */}
                          <div>
                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                              Correct Answer (word or phrase to fill in)
                            </label>
                            <input
                              value={q.correct_answer}
                              onChange={e => updateQ(qi, 'correct_answer', e.target.value)}
                              placeholder="e.g., her, him, the book..."
                              className={`w-full px-3 py-2.5 rounded-lg text-sm border ${
                                isDark
                                  ? 'bg-green-500/10 border-green-500/30 text-green-400 placeholder-green-400/50'
                                  : 'bg-green-50 border-green-200 text-green-700 placeholder-green-600/50'
                              }`}
                            />
                          </div>

                          {/* Optional: multiple choice options */}
                          {q.options.length > 0 && (
                            <div>
                              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                Options for student to choose from (optional)
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                {q.options.map((opt, oi) => {
                                  const letter = String.fromCharCode(65 + oi);
                                  const isCorrect = q.correct_answer.toLowerCase() === opt.toLowerCase();
                                  return (
                                    <div key={oi} className="flex gap-1">
                                      <input
                                        value={opt}
                                        onChange={e => updateQOption(qi, oi, e.target.value)}
                                        placeholder={`Option ${letter}`}
                                        className={`flex-1 px-3 py-2 text-sm rounded-l-lg border ${
                                          isCorrect
                                            ? isDark
                                              ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                              : 'bg-green-50 border-green-200 text-green-700'
                                            : isDark
                                              ? 'bg-white/[0.05] border-white/10 text-white placeholder-white/30'
                                              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                                        }`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeQOption(qi, oi)}
                                        className={`w-8 h-full rounded-r-lg text-xs transition-all flex-shrink-0 flex items-center justify-center ${
                                          isDark
                                            ? 'bg-white/[0.05] border border-l-0 border-white/10 text-white/30 hover:text-red-400 hover:bg-red-500/10'
                                            : 'bg-gray-50 border border-l-0 border-gray-200 text-gray-300 hover:text-red-500 hover:bg-red-50'
                                        }`}
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {q.options.length < 8 && (
                            <button
                              type="button"
                              onClick={() => addQOption(qi)}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                isDark
                                  ? 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
                                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <Plus size={12} /> {q.options.length === 0 ? 'Add answer options (for multiple choice)' : 'Add option'}
                            </button>
                          )}
                        </div>
                      )}
                      {/* Show text input only for true/false */}
                      {q.question_type === 'true_false' && (
                        <div className="flex gap-2">
                          {['True', 'False'].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => updateQ(qi, 'correct_answer', val)}
                              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                q.correct_answer === val
                                  ? 'bg-green-500 text-white'
                                  : isDark
                                    ? 'bg-white/[0.05] border border-white/10 text-white/60 hover:bg-white/[0.1]'
                                    : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </form>

            {/* Floating bottom bar */}
            <div className="p-4 pb-6">
              {/* Warning about missing answers */}
              {(() => {
                const missingAnswers = testForm.questions.filter(q => q.question_text.trim() && !q.correct_answer.trim()).length;
                if (missingAnswers > 0) {
                  return (
                    <div className={`mb-3 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 ${
                      isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <span className="font-medium">{missingAnswers} {missingAnswers === 1 ? 'question' : 'questions'}</span>
                      <span className={isDark ? 'text-amber-400/70' : 'text-amber-600'}>missing correct answer</span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Floating button bar */}
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg ${
                  isDark
                    ? 'bg-[#252529] border border-white/10'
                    : 'bg-white border border-gray-200 shadow-xl'
                }`}
                style={{ boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.12)' }}
              >
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className={`flex-1 px-6 py-2.5 rounded-xl font-medium transition-all ${
                    isDark
                      ? 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={saveTest}
                  disabled={savingTest}
                  className="flex-1 px-6 py-2.5 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {savingTest ? <Loader size={18} className="animate-spin" /> : <Check size={18} />}
                  {editingTest ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          itemName={deleteTarget.item.title || deleteTarget.item.name}
          onConfirm={executeDelete}
          onCancel={() => setDeleteTarget(null)}
          isDark={isDark}
        />
      )}

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedConfirm && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen flex items-center justify-center p-4 z-[80] animate-fadeIn"
          style={{ background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className={`relative rounded-3xl p-6 w-full max-w-sm animate-scaleIn ${
              isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-gray-200'
            }`}
            style={{
              boxShadow: isDark
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
                : '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Несохранённые изменения
            </h3>
            <p className={`mb-5 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
              У вас есть несохранённые изменения. Вы уверены, что хотите закрыть без сохранения?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowUnsavedConfirm(false)}
                className={`h-10 px-4 font-medium rounded-full transition-all flex items-center justify-center gap-2 border ${
                  isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Отмена
              </button>
              <button
                onClick={confirmDiscardChanges}
                className="h-10 px-4 font-medium rounded-full transition-all flex items-center justify-center gap-2 bg-pink-vibrant text-white hover:brightness-110"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paste Questions Modal */}
      {showPasteModal && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen flex items-center justify-center p-4 z-[90] bg-black/60 backdrop-blur-sm"
        >
          <div
            className={`relative rounded-2xl p-5 w-full max-w-2xl ${isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-gray-200'}`}
            onClick={e => e.stopPropagation()}
            onPaste={handlePasteModalPaste}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Paste Questions
              </h3>
              <button
                onClick={() => { setShowPasteModal(false); clearPasteImage(); }}
                className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode selector: Text or Image */}
            {!pasteImage ? (
              <>
                <p className={`text-sm mb-3 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  Paste text or image (Ctrl+V), or drag & drop an image
                </p>

                {/* Drop zone / Image upload */}
                <div
                  onDrop={handlePasteImageDrop}
                  onDragOver={e => e.preventDefault()}
                  className={`mb-3 p-4 border-2 border-dashed rounded-xl flex items-center justify-center gap-3 cursor-pointer transition-colors ${
                    isDark
                      ? 'border-white/20 hover:border-white/40 hover:bg-white/[0.02]'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                  onClick={() => pasteImageInputRef.current?.click()}
                >
                  <Image size={20} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                  <span className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    Drop image here, paste (Ctrl+V), or click to upload
                  </span>
                  <input
                    ref={pasteImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePasteImageSelect}
                    className="hidden"
                  />
                </div>

                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder={`Or paste text:\n1. Did you remember to get ... bread?\na) a, the  b) -, -  c) the, the  d) -, the\n\n2. Last night we went out for ... meal.\na) -  b) the  c) a  d) an`}
                  className={`w-full h-52 px-4 py-3 rounded-xl border text-sm font-mono resize-none ${
                    isDark
                      ? 'bg-white/[0.05] border-white/10 text-white placeholder-white/30'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </>
            ) : (
              <>
                <p className={`text-sm mb-3 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  Image loaded. Click "Run OCR" to extract questions.
                </p>
                <div className="relative mb-3">
                  <img
                    src={pasteImage.url}
                    alt="Pasted"
                    className="w-full max-h-80 object-contain rounded-xl border border-white/10"
                  />
                  <button
                    onClick={clearPasteImage}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70"
                  >
                    <X size={16} />
                  </button>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setPasteText(''); clearPasteImage(); setShowPasteModal(false); }}
                className={`px-4 py-2 rounded-lg font-medium ${isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                Cancel
              </button>
              <button
                onClick={handlePasteQuestions}
                disabled={(!pasteText.trim() && !pasteImage) || ocrProcessing}
                className="px-4 py-2 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 flex items-center gap-2"
              >
                {ocrProcessing ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : pasteImage ? (
                  <>
                    <Upload size={16} />
                    Run OCR & Add
                  </>
                ) : (
                  'Parse & Add Questions'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Library Modal for Tests */}
      {showTestLibraryModal && (
        <PdfLibraryModal
          teacherId={teacherId}
          isDark={isDark}
          onSelect={(pdf) => {
            setShowTestLibraryModal(false);
            setTestLibraryPdf(pdf);
          }}
          onClose={() => setShowTestLibraryModal(false)}
        />
      )}

      {/* PDF OCR Modal for Tests */}
      {testLibraryPdf && (
        <PdfOcrModal
          pdf={testLibraryPdf}
          isDark={isDark}
          onComplete={handleLibraryOcrComplete}
          onClose={() => setTestLibraryPdf(null)}
        />
      )}
    </>
  );
}
