import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
  ArrowLeft, BookOpen, ClipboardList,
  Plus, Edit2, Trash2, X, Check, Loader,
  ChevronDown, ChevronUp, GripVertical
} from 'lucide-react';
import RichTextEditor from '../common/RichTextEditor';
import ConfirmDeleteModal from '../common/ConfirmDeleteModal';
import MaterialEditorFullscreen from './MaterialEditorFullscreen';

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

  const emptyQ = () => ({
    question_text: '', question_type: 'multiple_choice',
    options: ['', '', '', ''], correct_answer: '',
    explanation_correct: '', explanation_wrong: '', hint: '',
  });

  const loadTests = async () => {
    setLoadingTests(true);
    const { data } = await supabase
      .from('tests')
      .select('*')
      .eq('topic_id', topic.id)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
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
        questions: qs?.map(q => ({
          id: q.id,
          question_text: q.question || q.question_text || '',
          question_type: q.type || q.question_type || 'multiple_choice',
          options: q.options || ['', '', '', ''],
          correct_answer: q.correct_answer || '',
          explanation_correct: q.explanation_correct || '',
          explanation_wrong: q.explanation_wrong || '',
          hint: q.hint || '',
        })) || [emptyQ()],
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
    const qs = testForm.questions.filter(q => q.question_text.trim()).map((q, i) => ({
      test_id: testId,
      question: q.question_text,
      type: q.question_type,
      options: q.question_type === 'multiple_choice' ? q.options.filter(o => o.trim()) : null,
      correct_answer: q.correct_answer,
      explanation_correct: q.explanation_correct || null,
      explanation_wrong: q.explanation_wrong || null,
      hint: q.hint || null,
      sort_order: i,
    }));
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

  const deleteTest = (test) => setDeleteTarget({ type: 'test', item: test });

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
        <div className="space-y-4 max-w-3xl mx-auto">
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
            <div className="space-y-3">
              {materials.map((mat) => (
                <div key={mat.id} className={card(isDark) + ' overflow-hidden'}>
                  <div className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                      <BookOpen size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{mat.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        {mat.level && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'}`}>
                            {mat.level}
                          </span>
                        )}
                        <span className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                          {new Date(mat.updated_at || mat.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setExpandedMaterial(expandedMaterial === mat.id ? null : mat.id)}
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'}`}
                      >
                        {expandedMaterial === mat.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <button
                        onClick={() => openMaterialForm(mat)}
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'}`}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => deleteMaterial(mat)}
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  {expandedMaterial === mat.id && (
                    <div className={`px-4 pb-4 pt-3 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
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
        <div className="space-y-4 max-w-3xl mx-auto">
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
            <div className="space-y-3">
              {tests.map(test => (
                <div key={test.id} className={card(isDark) + ' overflow-hidden'}>
                  <div className="p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                      <ClipboardList size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{test.title}</h4>
                      <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        {test.test_questions?.length || 0} question{test.test_questions?.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'}`}
                      >
                        {expandedTest === test.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <button
                        onClick={() => openTestModal(test)}
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'}`}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => deleteTest(test)}
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  {expandedTest === test.id && test.test_questions?.length > 0 && (
                    <div className={`px-4 pb-4 pt-3 border-t ${isDark ? 'border-white/5' : 'border-gray-100'} space-y-2`}>
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

      {/* ── Material Fullscreen Editor ── */}
      {showMaterialForm && (
        <MaterialEditorFullscreen
          material={editingMaterial}
          topicName={topic.name}
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
            } else {
              payload.sort_order = materials.length;
              await supabase.from('materials').insert(payload);
            }
            await loadMaterials();
            closeMaterialForm();
          }}
          onClose={closeMaterialForm}
          isDark={isDark}
        />
      )}

      {/* ── Test Modal ── */}
      {showTestModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowTestModal(false)}
        >
          <div
            className={`relative rounded-3xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-gray-200'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
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

            <form onSubmit={saveTest} className="space-y-5">
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
                  <button
                    type="button"
                    onClick={() => setTestForm({ ...testForm, questions: [...testForm.questions, emptyQ()] })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <Plus size={14} /> Add Question
                  </button>
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
                      {q.question_type === 'multiple_choice' && (
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {q.options.map((opt, oi) => (
                            <input
                              key={oi}
                              value={opt}
                              onChange={e => updateQOption(qi, oi, e.target.value)}
                              placeholder={`Option ${oi + 1}`}
                              className={`px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-white/[0.05] border-white/10 text-white placeholder-white/30' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                            />
                          ))}
                        </div>
                      )}
                      <input
                        value={q.correct_answer}
                        onChange={e => updateQ(qi, 'correct_answer', e.target.value)}
                        placeholder="Correct answer *"
                        className={`w-full px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-green-500/10 border-green-500/30 text-green-400 placeholder-green-400/50' : 'bg-green-50 border-green-200 text-green-700 placeholder-green-400'}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium ${isDark ? 'bg-white/[0.05] text-white/80 hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTest}
                  className="flex-1 px-4 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingTest ? <Loader size={18} className="animate-spin" /> : <Check size={18} />}
                  {editingTest ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
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
          className="fixed inset-0 flex items-center justify-center p-4 z-[80] animate-fadeIn"
          style={{ background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowUnsavedConfirm(false)}
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
    </div>
  );
}
