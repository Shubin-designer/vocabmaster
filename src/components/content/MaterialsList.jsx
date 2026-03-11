import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import AssignContentModal from './AssignContentModal';
import {
  Plus, Edit2, Trash2, Loader, FileText, X, Check,
  ChevronDown, BookOpen, Layers, GraduationCap, Send
} from 'lucide-react';

import ConfirmDeleteModal from '../common/ConfirmDeleteModal';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const LANGUAGES = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'ru', label: 'Russian', flag: '🇷🇺' },
  { value: 'both', label: 'Both', flag: '🌐' },
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

export default function MaterialsList({ teacherId, isDark = true }) {
  const [materials, setMaterials] = useState([]);
  const [topics, setTopics] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [saving, setSaving] = useState(false);
  const [assigningMaterial, setAssigningMaterial] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    examples: [''],
    notes: '',
    topic_id: '',
    source_id: '',
    level: 'A1',
    language: 'en',
  });
  const [initialFormData, setInitialFormData] = useState(null);

  const loadData = async () => {
    setLoading(true);

    const [materialsRes, topicsRes, sourcesRes] = await Promise.all([
      supabase
        .from('materials')
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

    if (!materialsRes.error && materialsRes.data) {
      setMaterials(materialsRes.data);
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

  const openModal = (material = null) => {
    let newFormData;
    if (material) {
      setEditingMaterial(material);
      newFormData = {
        title: material.title || '',
        content: material.content || '',
        examples: material.examples?.length ? material.examples : [''],
        notes: material.notes || '',
        topic_id: material.topic_id || '',
        source_id: material.source_id || '',
        level: material.level || 'A1',
        language: material.language || 'en',
      };
    } else {
      setEditingMaterial(null);
      newFormData = {
        title: '',
        content: '',
        examples: [''],
        notes: '',
        topic_id: '',
        source_id: '',
        level: 'A1',
        language: 'en',
      };
    }
    setFormData(newFormData);
    setInitialFormData(newFormData);
    setShowModal(true);
  };

  const hasUnsavedChanges = () => {
    if (!initialFormData) return false;
    return (
      formData.title !== initialFormData.title ||
      formData.content !== initialFormData.content ||
      formData.notes !== initialFormData.notes ||
      formData.topic_id !== initialFormData.topic_id ||
      formData.source_id !== initialFormData.source_id ||
      formData.level !== initialFormData.level ||
      formData.language !== initialFormData.language ||
      JSON.stringify(formData.examples) !== JSON.stringify(initialFormData.examples)
    );
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMaterial(null);
    setInitialFormData(null);
  };

  const handleBackdropClick = () => {
    if (hasUnsavedChanges()) {
      if (window.confirm('У вас есть несохранённые изменения. Закрыть без сохранения?')) {
        closeModal();
      }
    } else {
      closeModal();
    }
  };

  const addExample = () => {
    setFormData({ ...formData, examples: [...formData.examples, ''] });
  };

  const updateExample = (index, value) => {
    const newExamples = [...formData.examples];
    newExamples[index] = value;
    setFormData({ ...formData, examples: newExamples });
  };

  const removeExample = (index) => {
    if (formData.examples.length <= 1) return;
    const newExamples = formData.examples.filter((_, i) => i !== index);
    setFormData({ ...formData, examples: newExamples });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Filter out empty examples
    const cleanedExamples = formData.examples.filter(ex => ex.trim());

    const payload = {
      title: formData.title,
      content: formData.content,
      examples: cleanedExamples.length ? cleanedExamples : null,
      notes: formData.notes || null,
      topic_id: formData.topic_id || null,
      source_id: formData.source_id || null,
      level: formData.level,
      language: formData.language,
      teacher_id: teacherId,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingMaterial) {
      ({ error } = await supabase
        .from('materials')
        .update(payload)
        .eq('id', editingMaterial.id));
    } else {
      payload.sort_order = materials.length;
      ({ error } = await supabase
        .from('materials')
        .insert(payload));
    }

    if (!error) {
      await loadData();
      closeModal();
    }
    setSaving(false);
  };

  const handleDelete = (material) => setDeleteTarget(material);

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', deleteTarget.id);
    if (!error) await loadData();
    setDeleteTarget(null);
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
            Materials
          </h2>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Grammar rules and explanations with examples
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
        >
          <Plus size={18} />
          Add Material
        </button>
      </div>

      {/* Materials list */}
      {materials.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl ${
          isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-gray-200'
        }`}>
          <FileText size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            No materials yet
          </h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Create your first grammar rule or explanation
          </p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-5 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
          >
            <Plus size={18} />
            Create Material
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map(material => {
            const langInfo = getLanguageInfo(material.language);
            return (
              <div
                key={material.id}
                className={`rounded-2xl p-5 transition-all ${
                  isDark
                    ? 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05]'
                    : 'bg-white border border-gray-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                  }`}>
                    <FileText size={24} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {material.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(material.level, isDark)}`}>
                        {material.level}
                      </span>
                      <span className="text-sm" title={langInfo.label}>{langInfo.flag}</span>
                    </div>

                    {/* Topic & Source badges */}
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {material.topics?.name && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                        }`}>
                          <Layers size={10} />
                          {material.topics.name}
                        </span>
                      )}
                      {material.sources?.title && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                        }`}>
                          <BookOpen size={10} />
                          {material.sources.title}
                        </span>
                      )}
                    </div>

                    {/* Content preview */}
                    <p className={`text-sm line-clamp-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                      {material.content}
                    </p>

                    {/* Examples count */}
                    {material.examples?.length > 0 && (
                      <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        {material.examples.length} example{material.examples.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setAssigningMaterial(material)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-pink-500/20 text-pink-400' : 'hover:bg-pink-50 text-pink-500'
                      }`}
                      title="Assign to students"
                    >
                      <Send size={18} />
                    </button>
                    <button
                      onClick={() => openModal(material)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'
                      }`}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(material)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'
                      }`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
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
          onClick={handleBackdropClick}
        >
          <div
            className={`relative rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-gray-200'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingMaterial ? 'Edit Material' : 'New Material'}
              </h3>
              <button
                onClick={handleBackdropClick}
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
                  placeholder="e.g., Present Simple: Usage and Formation"
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
                {/* Topic */}
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

                {/* Source */}
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
                {/* Level */}
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

                {/* Language */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                    Language
                  </label>
                  <div className="flex gap-1">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, language: lang.value })}
                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          formData.language === lang.value
                            ? 'bg-pink-vibrant text-white'
                            : isDark
                              ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span>{lang.flag}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Content / Rule *
                </label>
                <textarea
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Explain the grammar rule or concept..."
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl resize-none ${
                    isDark
                      ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                  required
                />
              </div>

              {/* Examples */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Examples
                </label>
                <div className="space-y-2">
                  {formData.examples.map((example, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={example}
                        onChange={e => updateExample(index, e.target.value)}
                        placeholder={`Example ${index + 1}...`}
                        className={`flex-1 px-4 py-2.5 rounded-xl ${
                          isDark
                            ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                            : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                        }`}
                      />
                      {formData.examples.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeExample(index)}
                          className={`p-2.5 rounded-xl transition-colors ${
                            isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'
                          }`}
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addExample}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isDark
                        ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Plus size={16} />
                    Add Example
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes, exceptions, tips..."
                  rows={2}
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
                  onClick={handleBackdropClick}
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
                  {editingMaterial ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assigningMaterial && (
        <AssignContentModal
          teacherId={teacherId}
          contentType="material"
          contentId={assigningMaterial.id}
          contentTitle={assigningMaterial.title}
          onClose={() => setAssigningMaterial(null)}
          onSuccess={() => setAssigningMaterial(null)}
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
