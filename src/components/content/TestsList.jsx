import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import AssignContentModal from './AssignContentModal';
import {
  Plus, Edit2, Trash2, Loader, ClipboardList, X, Check,
  ChevronDown, ChevronUp, BookOpen, Layers, HelpCircle, Send
} from 'lucide-react';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'true_false', label: 'True / False' },
];

export default function TestsList({ teacherId, isDark = true }) {
  const [tests, setTests] = useState([]);
  const [topics, setTopics] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedTest, setExpandedTest] = useState(null);
  const [assigningTest, setAssigningTest] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic_id: '',
    material_id: '',
    questions: [],
  });

  const loadData = async () => {
    setLoading(true);

    const [testsRes, topicsRes, materialsRes] = await Promise.all([
      supabase
        .from('tests')
        .select('*, topics(name), materials(title), test_questions(*)')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false }),
      supabase
        .from('topics')
        .select('id, name')
        .eq('teacher_id', teacherId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('materials')
        .select('id, title')
        .eq('teacher_id', teacherId)
        .order('sort_order', { ascending: true }),
    ]);

    if (!testsRes.error && testsRes.data) {
      setTests(testsRes.data);
    }
    if (!topicsRes.error && topicsRes.data) {
      setTopics(topicsRes.data);
    }
    if (!materialsRes.error && materialsRes.data) {
      setMaterials(materialsRes.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [teacherId]);

  const createEmptyQuestion = () => ({
    question_text: '',
    question_type: 'multiple_choice',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation_correct: '',
    explanation_wrong: '',
    hint: '',
  });

  const openModal = async (test = null) => {
    if (test) {
      setEditingTest(test);
      // Load questions for this test
      const { data: questions } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', test.id)
        .order('sort_order', { ascending: true });

      setFormData({
        title: test.title || '',
        description: test.description || '',
        topic_id: test.topic_id || '',
        material_id: test.material_id || '',
        questions: questions?.length ? questions.map(q => ({
          id: q.id,
          question_text: q.question_text || '',
          question_type: q.question_type || 'multiple_choice',
          options: q.options || ['', '', '', ''],
          correct_answer: q.correct_answer || '',
          explanation_correct: q.explanation_correct || '',
          explanation_wrong: q.explanation_wrong || '',
          hint: q.hint || '',
        })) : [createEmptyQuestion()],
      });
    } else {
      setEditingTest(null);
      setFormData({
        title: '',
        description: '',
        topic_id: '',
        material_id: '',
        questions: [createEmptyQuestion()],
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTest(null);
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, createEmptyQuestion()],
    });
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setFormData({ ...formData, questions: newQuestions });
  };

  const updateQuestionOption = (qIndex, oIndex, value) => {
    const newQuestions = [...formData.questions];
    const newOptions = [...newQuestions[qIndex].options];
    newOptions[oIndex] = value;
    newQuestions[qIndex] = { ...newQuestions[qIndex], options: newOptions };
    setFormData({ ...formData, questions: newQuestions });
  };

  const removeQuestion = (index) => {
    if (formData.questions.length <= 1) return;
    const newQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: newQuestions });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const testPayload = {
      title: formData.title,
      description: formData.description || null,
      topic_id: formData.topic_id || null,
      material_id: formData.material_id || null,
      teacher_id: teacherId,
      updated_at: new Date().toISOString(),
    };

    let testId = editingTest?.id;
    let error;

    if (editingTest) {
      ({ error } = await supabase
        .from('tests')
        .update(testPayload)
        .eq('id', testId));
    } else {
      const { data, error: insertError } = await supabase
        .from('tests')
        .insert(testPayload)
        .select('id')
        .single();
      error = insertError;
      testId = data?.id;
    }

    if (error || !testId) {
      setSaving(false);
      return;
    }

    // Delete existing questions if editing
    if (editingTest) {
      await supabase
        .from('test_questions')
        .delete()
        .eq('test_id', testId);
    }

    // Insert questions
    const questionsToInsert = formData.questions
      .filter(q => q.question_text.trim())
      .map((q, index) => ({
        test_id: testId,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.question_type === 'multiple_choice' ? q.options.filter(o => o.trim()) : null,
        correct_answer: q.correct_answer,
        explanation_correct: q.explanation_correct || null,
        explanation_wrong: q.explanation_wrong || null,
        hint: q.hint || null,
        sort_order: index,
      }));

    if (questionsToInsert.length > 0) {
      await supabase.from('test_questions').insert(questionsToInsert);
    }

    await loadData();
    closeModal();
    setSaving(false);
  };

  const handleDelete = async (test) => {
    if (!confirm(`Delete test "${test.title}"?`)) return;

    // Questions will be deleted via cascade
    const { error } = await supabase
      .from('tests')
      .delete()
      .eq('id', test.id);

    if (!error) {
      await loadData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader size={32} className="animate-spin text-pink-vibrant" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Tests
          </h2>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Create tests with questions and explanations
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
        >
          <Plus size={18} />
          Add Test
        </button>
      </div>

      {/* Tests list */}
      {tests.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl ${
          isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-gray-200'
        }`}>
          <ClipboardList size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            No tests yet
          </h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Create your first test with questions
          </p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-5 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
          >
            <Plus size={18} />
            Create Test
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map(test => {
            const isExpanded = expandedTest === test.id;
            const questionCount = test.test_questions?.length || 0;
            return (
              <div
                key={test.id}
                className={`rounded-2xl overflow-hidden transition-all ${
                  isDark
                    ? 'bg-white/[0.03] border border-white/[0.08]'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {/* Test header */}
                <div className="p-5 flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'
                  }`}>
                    <ClipboardList size={24} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {test.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {questionCount} question{questionCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Topic & Material badges */}
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {test.topics?.name && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                        }`}>
                          <Layers size={10} />
                          {test.topics.name}
                        </span>
                      )}
                      {test.materials?.title && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                        }`}>
                          <BookOpen size={10} />
                          {test.materials.title}
                        </span>
                      )}
                    </div>

                    {test.description && (
                      <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        {test.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setAssigningTest(test)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-pink-500/20 text-pink-400' : 'hover:bg-pink-50 text-pink-500'
                      }`}
                      title="Assign to students"
                    >
                      <Send size={18} />
                    </button>
                    <button
                      onClick={() => setExpandedTest(isExpanded ? null : test.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'
                      }`}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <button
                      onClick={() => openModal(test)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'
                      }`}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(test)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'
                      }`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Expanded questions preview */}
                {isExpanded && test.test_questions?.length > 0 && (
                  <div className={`px-5 pb-5 pt-0 border-t ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                    <div className="pt-4 space-y-3">
                      {test.test_questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              isDark ? 'bg-white/10 text-white/60' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <p className={`text-sm ${isDark ? 'text-white/80' : 'text-gray-800'}`}>
                                {q.question_text}
                              </p>
                              <p className={`text-xs mt-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                Answer: {q.correct_answer}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          onClick={closeModal}
        >
          <div
            className={`relative rounded-3xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-gray-200'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingTest ? 'Edit Test' : 'New Test'}
              </h3>
              <button
                onClick={closeModal}
                className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* Title */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Present Simple Quiz"
                  className={`w-full px-4 py-3 rounded-xl ${
                    isDark
                      ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the test..."
                  className={`w-full px-4 py-3 rounded-xl ${
                    isDark
                      ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>

              {/* Topic & Material row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                    Topic
                  </label>
                  <select
                    value={formData.topic_id}
                    onChange={e => setFormData({ ...formData, topic_id: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${
                      isDark
                        ? 'bg-white/[0.05] border border-white/10 text-white'
                        : 'bg-gray-50 border border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="">No topic</option>
                    {topics.map(topic => (
                      <option key={topic.id} value={topic.id}>{topic.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                    Material
                  </label>
                  <select
                    value={formData.material_id}
                    onChange={e => setFormData({ ...formData, material_id: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${
                      isDark
                        ? 'bg-white/[0.05] border border-white/10 text-white'
                        : 'bg-gray-50 border border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="">No material</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Questions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className={`block text-sm font-medium ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                    Questions
                  </label>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isDark
                        ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Plus size={14} />
                    Add Question
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.questions.map((question, qIdx) => (
                    <div
                      key={qIdx}
                      className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-gray-50 border border-gray-100'}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                          Question {qIdx + 1}
                        </span>
                        {formData.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(qIdx)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'
                            }`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {/* Question text */}
                      <div className="mb-3">
                        <input
                          type="text"
                          value={question.question_text}
                          onChange={e => updateQuestion(qIdx, 'question_text', e.target.value)}
                          placeholder="Enter question..."
                          className={`w-full px-4 py-2.5 rounded-xl ${
                            isDark
                              ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                              : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400'
                          }`}
                        />
                      </div>

                      {/* Question type */}
                      <div className="mb-3">
                        <div className="flex gap-2">
                          {QUESTION_TYPES.map(type => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => updateQuestion(qIdx, 'question_type', type.value)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                question.question_type === type.value
                                  ? 'bg-pink-vibrant text-white'
                                  : isDark
                                    ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {type.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Options for multiple choice */}
                      {question.question_type === 'multiple_choice' && (
                        <div className="mb-3 grid grid-cols-2 gap-2">
                          {question.options.map((opt, oIdx) => (
                            <input
                              key={oIdx}
                              type="text"
                              value={opt}
                              onChange={e => updateQuestionOption(qIdx, oIdx, e.target.value)}
                              placeholder={`Option ${oIdx + 1}`}
                              className={`px-3 py-2 rounded-lg text-sm ${
                                isDark
                                  ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                                  : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400'
                              }`}
                            />
                          ))}
                        </div>
                      )}

                      {/* Correct answer */}
                      <div className="mb-3">
                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                          Correct Answer *
                        </label>
                        <input
                          type="text"
                          value={question.correct_answer}
                          onChange={e => updateQuestion(qIdx, 'correct_answer', e.target.value)}
                          placeholder="Enter correct answer..."
                          className={`w-full px-3 py-2 rounded-lg text-sm ${
                            isDark
                              ? 'bg-green-500/10 border border-green-500/30 text-green-400 placeholder-green-400/50'
                              : 'bg-green-50 border border-green-200 text-green-700 placeholder-green-400'
                          }`}
                        />
                      </div>

                      {/* Explanations (collapsible) */}
                      <details className={`${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                        <summary className="cursor-pointer text-xs font-medium flex items-center gap-1.5 py-2">
                          <HelpCircle size={12} />
                          Explanations & Hint (optional)
                        </summary>
                        <div className="mt-2 space-y-2">
                          <input
                            type="text"
                            value={question.explanation_correct}
                            onChange={e => updateQuestion(qIdx, 'explanation_correct', e.target.value)}
                            placeholder="Explanation for correct answer..."
                            className={`w-full px-3 py-2 rounded-lg text-sm ${
                              isDark
                                ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                                : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400'
                            }`}
                          />
                          <input
                            type="text"
                            value={question.explanation_wrong}
                            onChange={e => updateQuestion(qIdx, 'explanation_wrong', e.target.value)}
                            placeholder="Explanation for wrong answer..."
                            className={`w-full px-3 py-2 rounded-lg text-sm ${
                              isDark
                                ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                                : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400'
                            }`}
                          />
                          <input
                            type="text"
                            value={question.hint}
                            onChange={e => updateQuestion(qIdx, 'hint', e.target.value)}
                            placeholder="Hint for the student..."
                            className={`w-full px-3 py-2 rounded-lg text-sm ${
                              isDark
                                ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                                : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400'
                            }`}
                          />
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${
                    isDark
                      ? 'bg-white/[0.05] text-white/80 hover:bg-white/[0.1]'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <Loader size={18} className="animate-spin" /> : <Check size={18} />}
                  {editingTest ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assigningTest && (
        <AssignContentModal
          teacherId={teacherId}
          contentType="test"
          contentId={assigningTest.id}
          contentTitle={assigningTest.title}
          onClose={() => setAssigningTest(null)}
          onSuccess={() => setAssigningTest(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
}
