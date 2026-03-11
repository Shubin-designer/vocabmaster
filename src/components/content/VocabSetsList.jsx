import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import AssignContentModal from './AssignContentModal';
import {
  Plus, Edit2, Trash2, Send, Book, Search, X,
  ChevronDown, ChevronUp, Check, BookOpen
} from 'lucide-react';
import ConfirmDeleteModal from '../common/ConfirmDeleteModal';

export default function VocabSetsList({ teacherId, isDark = true }) {
  const [sets, setSets] = useState([]);
  const [topics, setTopics] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSet, setSelectedSet] = useState(null);
  const [expandedSet, setExpandedSet] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [vocabularyWords, setVocabularyWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [wordSearch, setWordSearch] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic_id: '',
    source_id: '',
    level: 'B1',
    word_ids: []
  });

  useEffect(() => {
    if (teacherId) {
      fetchSets();
      fetchTopicsAndSources();
      fetchVocabulary();
    }
  }, [teacherId]);

  const fetchSets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vocabulary_sets')
      .select(`
        *,
        topics(id, name),
        sources(id, title)
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSets(data);
    }
    setLoading(false);
  };

  const fetchTopicsAndSources = async () => {
    const [topicsRes, sourcesRes] = await Promise.all([
      supabase.from('topics').select('id, name').eq('teacher_id', teacherId),
      supabase.from('sources').select('id, title').eq('teacher_id', teacherId)
    ]);

    if (topicsRes.data) setTopics(topicsRes.data);
    if (sourcesRes.data) setSources(sourcesRes.data);
  };

  const fetchVocabulary = async () => {
    // Fetch teacher's vocabulary words
    const { data, error } = await supabase
      .from('words')
      .select('id, word, meaning_en, meaning_ru, level, type')
      .eq('user_id', teacherId)
      .order('word');

    if (!error && data) {
      setVocabularyWords(data);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      teacher_id: teacherId,
      title: formData.title,
      description: formData.description || null,
      topic_id: formData.topic_id || null,
      source_id: formData.source_id || null,
      level: formData.level,
      word_ids: selectedWords
    };

    let error;
    if (selectedSet) {
      ({ error } = await supabase
        .from('vocabulary_sets')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', selectedSet.id));
    } else {
      ({ error } = await supabase
        .from('vocabulary_sets')
        .insert(payload));
    }

    if (!error) {
      setShowModal(false);
      resetForm();
      fetchSets();
    }
  };

  const handleDelete = (set) => setDeleteTarget(set);

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from('vocabulary_sets')
      .delete()
      .eq('id', deleteTarget.id);
    if (!error) fetchSets();
    setDeleteTarget(null);
  };

  const openEdit = (set) => {
    setSelectedSet(set);
    setFormData({
      title: set.title,
      description: set.description || '',
      topic_id: set.topic_id || '',
      source_id: set.source_id || '',
      level: set.level || 'B1',
      word_ids: set.word_ids || []
    });
    setSelectedWords(set.word_ids || []);
    setShowModal(true);
  };

  const openAssign = (set) => {
    setSelectedSet(set);
    setShowAssignModal(true);
  };

  const resetForm = () => {
    setSelectedSet(null);
    setFormData({
      title: '',
      description: '',
      topic_id: '',
      source_id: '',
      level: 'B1',
      word_ids: []
    });
    setSelectedWords([]);
    setWordSearch('');
  };

  const toggleWord = (wordId) => {
    setSelectedWords(prev =>
      prev.includes(wordId)
        ? prev.filter(id => id !== wordId)
        : [...prev, wordId]
    );
  };

  const filteredSets = sets.filter(set =>
    set.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWords = vocabularyWords.filter(word =>
    word.word.toLowerCase().includes(wordSearch.toLowerCase()) ||
    (word.meaning_ru && word.meaning_ru.toLowerCase().includes(wordSearch.toLowerCase()))
  );

  const getWordById = (id) => vocabularyWords.find(w => w.id === id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Vocabulary Sets
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Create and assign vocabulary sets to students
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
        >
          <Plus size={18} />
          Create Set
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search vocabulary sets..."
          className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
            isDark
              ? 'bg-white/[0.03] border-white/10 text-white placeholder-white/40'
              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
          } focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50`}
        />
      </div>

      {/* Sets list */}
      {loading ? (
        <div className={`text-center py-12 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          Loading...
        </div>
      ) : filteredSets.length === 0 ? (
        <div className={`text-center py-12 rounded-2xl ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
          <Book size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
          <p className={`${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            {searchQuery ? 'No sets found' : 'No vocabulary sets yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSets.map(set => (
            <div
              key={set.id}
              className={`rounded-2xl border ${
                isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white border-gray-200'
              }`}
            >
              {/* Set header */}
              <div className="p-4 flex items-center justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setExpandedSet(expandedSet === set.id ? null : set.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                    }`}>
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {set.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                          {set.word_ids?.length || 0} words
                        </span>
                        {set.level && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isDark ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {set.level}
                          </span>
                        )}
                        {set.topics?.name && (
                          <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                            • {set.topics.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAssign(set)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-white/[0.05] text-blue-400' : 'hover:bg-gray-100 text-blue-500'
                    }`}
                    title="Assign to students"
                  >
                    <Send size={18} />
                  </button>
                  <button
                    onClick={() => openEdit(set)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-white/[0.05] text-white/60' : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(set)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'
                    }`}
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    onClick={() => setExpandedSet(expandedSet === set.id ? null : set.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-white/[0.05] text-white/40' : 'hover:bg-gray-100 text-gray-400'
                    }`}
                  >
                    {expandedSet === set.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {/* Expanded words list */}
              {expandedSet === set.id && (
                <div className={`px-4 pb-4 pt-2 border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                  {set.description && (
                    <p className={`text-sm mb-3 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                      {set.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {(set.word_ids || []).map(wordId => {
                      const word = getWordById(wordId);
                      if (!word) return null;
                      return (
                        <span
                          key={wordId}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            isDark ? 'bg-white/[0.05] text-white/80' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {word.word}
                          {word.meaning_ru && (
                            <span className={`ml-2 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                              — {word.meaning_ru}
                            </span>
                          )}
                        </span>
                      );
                    })}
                    {(!set.word_ids || set.word_ids.length === 0) && (
                      <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        No words in this set
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl ${
            isDark ? 'bg-[#1a1a1e]' : 'bg-white'
          }`}>
            <div className={`sticky top-0 flex items-center justify-between p-4 border-b ${
              isDark ? 'bg-[#1a1a1e] border-white/10' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {selectedSet ? 'Edit Vocabulary Set' : 'Create Vocabulary Set'}
              </h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100'}`}
              >
                <X size={20} className={isDark ? 'text-white/60' : 'text-gray-500'} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Title */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    isDark
                      ? 'bg-white/[0.03] border-white/10 text-white'
                      : 'bg-white border-gray-200 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50`}
                  placeholder="e.g., Unit 1 - Basic Verbs"
                />
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    isDark
                      ? 'bg-white/[0.03] border-white/10 text-white'
                      : 'bg-white border-gray-200 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50`}
                  placeholder="Optional description..."
                />
              </div>

              {/* Topic, Source, Level */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                    Topic
                  </label>
                  <select
                    value={formData.topic_id}
                    onChange={(e) => setFormData({ ...formData, topic_id: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl border ${
                      isDark
                        ? 'bg-white/[0.03] border-white/10 text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50`}
                  >
                    <option value="">None</option>
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                    Source
                  </label>
                  <select
                    value={formData.source_id}
                    onChange={(e) => setFormData({ ...formData, source_id: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl border ${
                      isDark
                        ? 'bg-white/[0.03] border-white/10 text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50`}
                  >
                    <option value="">None</option>
                    {sources.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                    Level
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl border ${
                      isDark
                        ? 'bg-white/[0.03] border-white/10 text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50`}
                  >
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Word selection */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Words ({selectedWords.length} selected)
                </label>
                <div className="relative mb-2">
                  <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    value={wordSearch}
                    onChange={(e) => setWordSearch(e.target.value)}
                    placeholder="Search words..."
                    className={`w-full pl-9 pr-4 py-2 rounded-lg border ${
                      isDark
                        ? 'bg-white/[0.03] border-white/10 text-white placeholder-white/40'
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50`}
                  />
                </div>

                {/* Selected words */}
                {selectedWords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedWords.map(wordId => {
                      const word = getWordById(wordId);
                      if (!word) return null;
                      return (
                        <span
                          key={wordId}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm bg-pink-vibrant/20 text-pink-vibrant"
                        >
                          {word.word}
                          <button
                            type="button"
                            onClick={() => toggleWord(wordId)}
                            className="hover:text-white"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Available words */}
                <div className={`max-h-48 overflow-y-auto rounded-xl border ${
                  isDark ? 'bg-white/[0.02] border-white/10' : 'bg-gray-50 border-gray-200'
                }`}>
                  {filteredWords.length === 0 ? (
                    <p className={`p-4 text-center text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                      {vocabularyWords.length === 0 ? 'No vocabulary words available' : 'No words match your search'}
                    </p>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {filteredWords.slice(0, 50).map(word => (
                        <button
                          type="button"
                          key={word.id}
                          onClick={() => toggleWord(word.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                            selectedWords.includes(word.id)
                              ? 'bg-pink-vibrant/10'
                              : isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-white'
                          }`}
                        >
                          <div>
                            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {word.word}
                            </span>
                            {word.meaning_ru && (
                              <span className={`text-sm ml-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                — {word.meaning_ru}
                              </span>
                            )}
                          </div>
                          {selectedWords.includes(word.id) && (
                            <Check size={16} className="text-pink-vibrant" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className={`px-4 py-2 rounded-xl font-medium ${
                    isDark ? 'bg-white/[0.05] text-white hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110"
                >
                  {selectedSet ? 'Save Changes' : 'Create Set'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedSet && (
        <AssignContentModal
          contentType="vocabulary_set"
          contentId={selectedSet.id}
          contentTitle={selectedSet.title}
          teacherId={teacherId}
          onClose={() => { setShowAssignModal(false); setSelectedSet(null); }}
          onSuccess={() => { setShowAssignModal(false); setSelectedSet(null); }}
          isDark={isDark}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          itemName={deleteTarget.title}
          onConfirm={executeDelete}
          onCancel={() => setDeleteTarget(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
}
