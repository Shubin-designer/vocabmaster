import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { X, Check, Loader, FileText, BookOpen, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { LEVELS } from '../../utils/constants';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'true_false', label: 'True / False' },
];

const inp = (isDark, extra = '') =>
  `w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50 ${extra} ${
    isDark
      ? 'bg-white/[0.05] border-white/10 text-white placeholder-white/30'
      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
  }`;

const lbl = (isDark) =>
  `block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`;

export default function PdfSaveModal({
  contentType,
  htmlContent,
  teacherId,
  onClose,
  onSuccess,
  isDark,
}) {
  const [topics, setTopics] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form state based on content type
  const [formData, setFormData] = useState({
    title: '',
    topic_id: '',
    level: 'B1',
    // For reading
    translation: '',
    // For test
    description: '',
    questions: [],
  });

  // Load topics
  useEffect(() => {
    const loadTopics = async () => {
      const { data } = await supabase
        .from('topics')
        .select('id, name')
        .eq('teacher_id', teacherId)
        .order('sort_order', { ascending: true });
      setTopics(data || []);
    };
    loadTopics();
  }, [teacherId]);

  // Parse test questions from HTML if content type is test
  useEffect(() => {
    if (contentType === 'test' && htmlContent) {
      const parsedQuestions = parseQuestionsFromHtml(htmlContent);
      setFormData(prev => ({
        ...prev,
        questions: parsedQuestions.length > 0 ? parsedQuestions : [createEmptyQuestion()],
      }));
    }
  }, [contentType, htmlContent]);

  const createEmptyQuestion = () => ({
    question_text: '',
    question_type: 'multiple_choice',
    options: ['', '', '', ''],
    correct_answer: '',
  });

  const parseQuestionsFromHtml = (html) => {
    // Create a temporary div to parse HTML
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.textContent || '';

    // Split by numbered questions (1., 2., etc. or 1), 2), etc.)
    const questionRegex = /(?:^|\n)\s*(\d+)[.)]\s*(.+?)(?=(?:\n\s*\d+[.)])|$)/gs;
    const questions = [];

    let match;
    while ((match = questionRegex.exec(text)) !== null) {
      const questionText = match[2].trim();
      if (!questionText) continue;

      // Try to find options (a), b), c), d) or a., b., c., d. or A, B, C, D)
      const optionRegex = /\n?\s*[a-dA-D][.)]\s*([^\n]+)/g;
      const options = [];
      let optMatch;
      let cleanQuestion = questionText;

      while ((optMatch = optionRegex.exec(questionText)) !== null) {
        options.push(optMatch[1].trim());
        cleanQuestion = cleanQuestion.replace(optMatch[0], '');
      }

      questions.push({
        question_text: cleanQuestion.trim(),
        question_type: options.length > 0 ? 'multiple_choice' : 'fill_blank',
        options: options.length > 0 ? [...options, '', '', '', ''].slice(0, 4) : ['', '', '', ''],
        correct_answer: '',
      });
    }

    return questions;
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

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, createEmptyQuestion()],
    });
  };

  const removeQuestion = (index) => {
    if (formData.questions.length <= 1) return;
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index),
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (contentType === 'material') {
        const { error } = await supabase.from('materials').insert({
          title: formData.title || 'Untitled Material',
          content: htmlContent,
          level: formData.level,
          topic_id: formData.topic_id || null,
          teacher_id: teacherId,
        });
        if (error) throw error;
      } else if (contentType === 'reading') {
        const { error } = await supabase.from('reading_texts').insert({
          title: formData.title || 'Untitled Reading',
          content: htmlContent,
          translation: formData.translation || null,
          level: formData.level,
          topic_id: formData.topic_id || null,
          teacher_id: teacherId,
        });
        if (error) throw error;
      } else if (contentType === 'test') {
        // Insert test
        const { data: testData, error: testError } = await supabase
          .from('tests')
          .insert({
            title: formData.title || 'Untitled Test',
            description: formData.description || null,
            topic_id: formData.topic_id || null,
            teacher_id: teacherId,
          })
          .select('id')
          .single();
        if (testError) throw testError;

        // Insert questions
        const questionsToInsert = formData.questions
          .filter(q => q.question_text.trim())
          .map((q, index) => ({
            test_id: testData.id,
            question: q.question_text,
            type: q.question_type,
            options: q.question_type === 'multiple_choice' ? q.options.filter(o => o.trim()) : null,
            correct_answer: q.correct_answer,
            sort_order: index,
          }));

        if (questionsToInsert.length > 0) {
          const { error: qError } = await supabase.from('test_questions').insert(questionsToInsert);
          if (qError) throw qError;
        }
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getTitle = () => {
    switch (contentType) {
      case 'material': return 'Save as Material';
      case 'reading': return 'Save as Reading Text';
      case 'test': return 'Save as Test';
      default: return 'Save Content';
    }
  };

  const getIcon = () => {
    switch (contentType) {
      case 'material': return FileText;
      case 'reading': return BookOpen;
      case 'test': return ClipboardList;
      default: return FileText;
    }
  };

  const Icon = getIcon();

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 w-screen h-screen flex items-center justify-center p-4 z-50"
      style={{ background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className={`relative rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
          isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-gray-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            contentType === 'material' ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600') :
            contentType === 'reading' ? (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600') :
            (isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600')
          }`}>
            <Icon size={20} />
          </div>
          <h3 className={`text-xl font-bold flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {getTitle()}
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Title */}
          <div>
            <label className={lbl(isDark)}>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter title..."
              className={inp(isDark)}
              required
            />
          </div>

          {/* Topic and Level row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl(isDark)}>Topic</label>
              <select
                value={formData.topic_id}
                onChange={e => setFormData({ ...formData, topic_id: e.target.value })}
                className={inp(isDark)}
              >
                <option value="">No topic</option>
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>{topic.name}</option>
                ))}
              </select>
            </div>
            {contentType !== 'test' && (
              <div>
                <label className={lbl(isDark)}>Level</label>
                <div className="flex gap-1.5">
                  {LEVELS.map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setFormData({ ...formData, level: l })}
                      className={`flex-1 px-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        formData.level === l
                          ? 'bg-pink-vibrant text-white'
                          : isDark ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reading-specific: Translation */}
          {contentType === 'reading' && (
            <div>
              <label className={lbl(isDark)}>Translation (optional)</label>
              <textarea
                value={formData.translation}
                onChange={e => setFormData({ ...formData, translation: e.target.value })}
                placeholder="Russian translation..."
                rows={3}
                className={inp(isDark)}
              />
            </div>
          )}

          {/* Test-specific: Description */}
          {contentType === 'test' && (
            <div>
              <label className={lbl(isDark)}>Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
                className={inp(isDark)}
              />
            </div>
          )}

          {/* Test-specific: Questions */}
          {contentType === 'test' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className={lbl(isDark).replace('mb-2', '')}>Questions</label>
                <button
                  type="button"
                  onClick={addQuestion}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                    isDark ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Plus size={14} /> Add Question
                </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {formData.questions.map((q, qi) => (
                  <div
                    key={qi}
                    className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-gray-50 border border-gray-100'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                        Question {qi + 1}
                      </span>
                      {formData.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(qi)}
                          className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <input
                      value={q.question_text}
                      onChange={e => updateQuestion(qi, 'question_text', e.target.value)}
                      placeholder="Enter question..."
                      className={`${inp(isDark, 'py-2.5')} mb-2`}
                    />

                    <div className="flex gap-2 mb-2 flex-wrap">
                      {QUESTION_TYPES.map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => updateQuestion(qi, 'question_type', t.value)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                            q.question_type === t.value
                              ? 'bg-pink-vibrant text-white'
                              : isDark ? 'bg-white/[0.05] text-white/60' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {q.question_type === 'multiple_choice' && (
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {q.options.map((opt, oi) => (
                          <input
                            key={oi}
                            value={opt}
                            onChange={e => updateQuestionOption(qi, oi, e.target.value)}
                            placeholder={`Option ${oi + 1}`}
                            className={`px-3 py-2 rounded-lg text-sm border ${
                              isDark ? 'bg-white/[0.05] border-white/10 text-white placeholder-white/30' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    <input
                      value={q.correct_answer}
                      onChange={e => updateQuestion(qi, 'correct_answer', e.target.value)}
                      placeholder="Correct answer *"
                      className={`w-full px-3 py-2 rounded-lg text-sm border ${
                        isDark ? 'bg-green-500/10 border-green-500/30 text-green-400 placeholder-green-400/50' : 'bg-green-50 border-green-200 text-green-700 placeholder-green-400'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-3 rounded-xl font-medium ${
                isDark ? 'bg-white/[0.05] text-white/80 hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader size={18} className="animate-spin" /> : <Check size={18} />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
