import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import AssignContentModal from './AssignContentModal';
import {
  Plus, Edit2, Trash2, Loader, FileText, X, Check,
  BookOpen, Layers, Send, Eye, ChevronDown, ChevronUp
} from 'lucide-react';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const LANGUAGES = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'ru', label: 'Russian', flag: '🇷🇺' },
];

const getLevelColor = (level, isDark) => {
  const colors = {
    A1: isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700',
    A2: isDark ? 'bg-green-500/25 text-green-400' : 'bg-green-100 text-green-700',
    B1: isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
    B2: isDark ? 'bg-yellow-500/25 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
    C1: isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700',
    C2: isDark ? 'bg-red-500/25 text-red-400' : 'bg-red-100 text-red-700',
  };
  return colors[level] || colors.A1;
};

export default function ReadingTextsList({ teacherId, isDark = true }) {
  const [texts, setTexts] = useState([]);
  const [topics, setTopics] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingText, setEditingText] = useState(null);
  const [saving, setSaving] = useState(false);
  const [assigningText, setAssigningText] = useState(null);
  const [expandedText, setExpandedText] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    translation: '',
    vocabulary_hints: {},
    topic_id: '',
    source_id: '',
    level: 'A1',
    language: 'en',
  });

  // Vocabulary hints editor
  const [hintWord, setHintWord] = useState('');
  const [hintTranslation, setHintTranslation] = useState('');

  const loadData = async () => {
    setLoading(true);

    const [textsRes, topicsRes, sourcesRes] = await Promise.all([
      supabase
        .from('reading_texts')
        .select('*, topics(name), sources(title)')
        .eq('teacher_id', teacherId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('topics')
        .select('id, name')
        .eq('teacher_id', teacherId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('sources')
        .select('id, title')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false }),
    ]);

    if (!textsRes.error && textsRes.data) {
      setTexts(textsRes.data);
    }
    if (!topicsRes.error && topicsRes.data) {
      setTopics(topicsRes.data);
    }
    if (!sourcesRes.error && sourcesRes.data) {
      setSources(sourcesRes.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [teacherId]);

  const openModal = (text = null) => {
    if (text) {
      setEditingText(text);
      setFormData({
        title: text.title || '',
        content: text.content || '',
        translation: text.translation || '',
        vocabulary_hints: text.vocabulary_hints || {},
        topic_id: text.topic_id || '',
        source_id: text.source_id || '',
        level: text.level || 'A1',
        language: text.language || 'en',
      });
    } else {
      setEditingText(null);
      setFormData({
        title: '',
        content: '',
        translation: '',
        vocabulary_hints: {},
        topic_id: '',
        source_id: '',
        level: 'A1',
        language: 'en',
      });
    }
    setHintWord('');
    setHintTranslation('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingText(null);
  };

  const addVocabularyHint = () => {
    if (!hintWord.trim() || !hintTranslation.trim()) return;
    setFormData({
      ...formData,
      vocabulary_hints: {
        ...formData.vocabulary_hints,
        [hintWord.toLowerCase().trim()]: hintTranslation.trim(),
      },
    });
    setHintWord('');
    setHintTranslation('');
  };

  const removeVocabularyHint = (word) => {
    const newHints = { ...formData.vocabulary_hints };
    delete newHints[word];
    setFormData({ ...formData, vocabulary_hints: newHints });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      title: formData.title,
      content: formData.content,
      translation: formData.translation || null,
      vocabulary_hints: Object.keys(formData.vocabulary_hints).length > 0 ? formData.vocabulary_hints : null,
      topic_id: formData.topic_id || null,
      source_id: formData.source_id || null,
      level: formData.level,
      language: formData.language,
      teacher_id: teacherId,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingText) {
      ({ error } = await supabase
        .from('reading_texts')
        .update(payload)
        .eq('id', editingText.id));
    } else {
      payload.sort_order = texts.length;
      ({ error } = await supabase
        .from('reading_texts')
        .insert(payload));
    }

    if (!error) {
      await loadData();
      closeModal();
    }
    setSaving(false);
  };

  const handleDelete = async (text) => {
    if (!confirm(`Delete reading text "${text.title}"?`)) return;

    const { error } = await supabase
      .from('reading_texts')
      .delete()
      .eq('id', text.id);

    if (!error) {
      await loadData();
    }
  };

  const getLanguageInfo = (lang) => LANGUAGES.find(l => l.value === lang) || LANGUAGES[0];

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
            Reading Texts
          </h2>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Interactive texts with vocabulary hints
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
        >
          <Plus size={18} />
          Add Text
        </button>
      </div>

      {/* Texts list */}
      {texts.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl ${
          isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-gray-200'
        }`}>
          <BookOpen size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            No reading texts yet
          </h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Create interactive reading materials for your students
          </p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-5 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
          >
            <Plus size={18} />
            Create Text
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {texts.map(text => {
            const langInfo = getLanguageInfo(text.language);
            const isExpanded = expandedText === text.id;
            const hintCount = text.vocabulary_hints ? Object.keys(text.vocabulary_hints).length : 0;

            return (
              <div
                key={text.id}
                className={`rounded-2xl overflow-hidden transition-all ${
                  isDark
                    ? 'bg-white/[0.03] border border-white/[0.08]'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="p-5 flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600'
                  }`}>
                    <BookOpen size={24} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {text.title}
                      </h3>
                      {text.level && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(text.level, isDark)}`}>
                          {text.level}
                        </span>
                      )}
                      <span className="text-sm" title={langInfo.label}>{langInfo.flag}</span>
                    </div>

                    {/* Topic & Source badges */}
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {text.topics?.name && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                        }`}>
                          <Layers size={10} />
                          {text.topics.name}
                        </span>
                      )}
                      {hintCount > 0 && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {hintCount} vocabulary hint{hintCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Content preview */}
                    <p className={`text-sm line-clamp-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                      {text.content}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setAssigningText(text)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-pink-500/20 text-pink-400' : 'hover:bg-pink-50 text-pink-500'
                      }`}
                      title="Assign to students"
                    >
                      <Send size={18} />
                    </button>
                    <button
                      onClick={() => setExpandedText(isExpanded ? null : text.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'
                      }`}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                      onClick={() => openModal(text)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'
                      }`}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(text)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'
                      }`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Expanded preview */}
                {isExpanded && (
                  <div className={`px-5 pb-5 pt-0 border-t ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                    <div className="pt-4">
                      <div className={`p-4 rounded-xl whitespace-pre-wrap text-sm ${
                        isDark ? 'bg-white/[0.03] text-white/80' : 'bg-gray-50 text-gray-700'
                      }`}>
                        {text.content}
                      </div>
                      {text.translation && (
                        <div className={`mt-3 p-4 rounded-xl text-sm ${
                          isDark ? 'bg-blue-500/10 text-blue-300' : 'bg-blue-50 text-blue-700'
                        }`}>
                          <p className={`text-xs font-medium mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Translation:</p>
                          {text.translation}
                        </div>
                      )}
                      {hintCount > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {Object.entries(text.vocabulary_hints).map(([word, translation]) => (
                            <span
                              key={word}
                              className={`px-2 py-1 rounded-lg text-xs ${
                                isDark ? 'bg-yellow-500/10 text-yellow-300' : 'bg-yellow-50 text-yellow-700'
                              }`}
                            >
                              <strong>{word}</strong>: {translation}
                            </span>
                          ))}
                        </div>
                      )}
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
            className={`relative rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-gray-200'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingText ? 'Edit Reading Text' : 'New Reading Text'}
              </h3>
              <button
                onClick={closeModal}
                className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Title */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., The Lost Key"
                  className={`w-full px-4 py-3 rounded-xl ${
                    isDark
                      ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                  required
                />
              </div>

              {/* Topic & Source row */}
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
                    Source
                  </label>
                  <select
                    value={formData.source_id}
                    onChange={e => setFormData({ ...formData, source_id: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl ${
                      isDark
                        ? 'bg-white/[0.05] border border-white/10 text-white'
                        : 'bg-gray-50 border border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="">No source</option>
                    {sources.map(source => (
                      <option key={source.id} value={source.id}>{source.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Level & Language row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                    Level
                  </label>
                  <div className="flex gap-1 flex-wrap">
                    {LEVELS.map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFormData({ ...formData, level })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          formData.level === level
                            ? 'bg-pink-vibrant text-white'
                            : isDark
                              ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                    Language
                  </label>
                  <div className="flex gap-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, language: lang.value })}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          formData.language === lang.value
                            ? 'bg-pink-vibrant text-white'
                            : isDark
                              ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Text Content *
                </label>
                <textarea
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter the reading text..."
                  rows={6}
                  className={`w-full px-4 py-3 rounded-xl resize-none ${
                    isDark
                      ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                  required
                />
              </div>

              {/* Translation */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Translation (optional)
                </label>
                <textarea
                  value={formData.translation}
                  onChange={e => setFormData({ ...formData, translation: e.target.value })}
                  placeholder="Full translation of the text..."
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl resize-none ${
                    isDark
                      ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>

              {/* Vocabulary hints */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Vocabulary Hints
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={hintWord}
                    onChange={e => setHintWord(e.target.value)}
                    placeholder="Word"
                    className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                      isDark
                        ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                        : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                  <input
                    type="text"
                    value={hintTranslation}
                    onChange={e => setHintTranslation(e.target.value)}
                    placeholder="Translation"
                    className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                      isDark
                        ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                        : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addVocabularyHint())}
                  />
                  <button
                    type="button"
                    onClick={addVocabularyHint}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      isDark
                        ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {Object.keys(formData.vocabulary_hints).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(formData.vocabulary_hints).map(([word, translation]) => (
                      <span
                        key={word}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm ${
                          isDark ? 'bg-yellow-500/10 text-yellow-300' : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        <strong>{word}</strong>: {translation}
                        <button
                          type="button"
                          onClick={() => removeVocabularyHint(word)}
                          className="hover:text-red-400"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
                  {editingText ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assigningText && (
        <AssignContentModal
          teacherId={teacherId}
          contentType="reading_text"
          contentId={assigningText.id}
          contentTitle={assigningText.title}
          onClose={() => setAssigningText(null)}
          onSuccess={() => setAssigningText(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
}
