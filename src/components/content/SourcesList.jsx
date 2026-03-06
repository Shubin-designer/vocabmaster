import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Plus, Edit2, Trash2, Loader, Book, X, Check, Globe } from 'lucide-react';

const LANGUAGES = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'ru', label: 'Russian', flag: '🇷🇺' },
  { value: 'both', label: 'Both', flag: '🌐' },
];

export default function SourcesList({ teacherId, isDark = true }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    language: 'en',
    description: '',
  });

  const loadSources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSources(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSources();
  }, [teacherId]);

  const openModal = (source = null) => {
    if (source) {
      setEditingSource(source);
      setFormData({
        title: source.title || '',
        author: source.author || '',
        language: source.language || 'en',
        description: source.description || '',
      });
    } else {
      setEditingSource(null);
      setFormData({
        title: '',
        author: '',
        language: 'en',
        description: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSource(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...formData,
      teacher_id: teacherId,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingSource) {
      ({ error } = await supabase
        .from('sources')
        .update(payload)
        .eq('id', editingSource.id));
    } else {
      ({ error } = await supabase
        .from('sources')
        .insert(payload));
    }

    if (!error) {
      await loadSources();
      closeModal();
    }
    setSaving(false);
  };

  const handleDelete = async (source) => {
    if (!confirm(`Delete source "${source.title}"?`)) return;

    const { error } = await supabase
      .from('sources')
      .delete()
      .eq('id', source.id);

    if (!error) {
      await loadSources();
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
            Sources
          </h2>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Books and materials you're extracting content from
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
        >
          <Plus size={18} />
          Add Source
        </button>
      </div>

      {/* Sources list */}
      {sources.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl ${
          isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-gray-200'
        }`}>
          <Book size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            No sources yet
          </h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Add your first book or brochure
          </p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-5 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
          >
            <Plus size={18} />
            Add Source
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map(source => {
            const langInfo = getLanguageInfo(source.language);
            return (
              <div
                key={source.id}
                className={`rounded-2xl p-5 flex items-center gap-4 transition-all ${
                  isDark
                    ? 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05]'
                    : 'bg-white border border-gray-200 hover:shadow-md'
                }`}
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                }`}>
                  <Book size={28} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {source.title}
                    </h3>
                    <span className="text-lg" title={langInfo.label}>{langInfo.flag}</span>
                  </div>
                  {source.author && (
                    <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      by {source.author}
                    </p>
                  )}
                  {source.description && (
                    <p className={`text-sm mt-1 truncate ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                      {source.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openModal(source)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(source)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'
                    }`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
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
            className={`relative rounded-3xl p-6 w-full max-w-md ${
              isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-gray-200'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingSource ? 'Edit Source' : 'New Source'}
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
                  placeholder="e.g., English Grammar in Use"
                  className={`w-full px-4 py-3 rounded-xl ${
                    isDark
                      ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                  required
                />
              </div>

              {/* Author */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Author
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={e => setFormData({ ...formData, author: e.target.value })}
                  placeholder="e.g., Raymond Murphy"
                  className={`w-full px-4 py-3 rounded-xl ${
                    isDark
                      ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>

              {/* Language */}
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
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                        formData.language === lang.value
                          ? 'bg-pink-vibrant text-white'
                          : isDark
                            ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span className="text-sm">{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this book..."
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl resize-none ${
                    isDark
                      ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
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
                  {editingSource ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
