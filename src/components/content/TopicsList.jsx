import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Plus, Edit2, Trash2, Loader, BookOpen, Hash,
  GraduationCap, Globe, Clock, Zap, Target, Layers,
  ChevronDown, X, Check, ChevronRight, GripVertical
} from 'lucide-react';
import TopicDetail from './TopicDetail';
import ConfirmDeleteModal from '../common/ConfirmDeleteModal';

const ICONS = [
  { name: 'book', icon: BookOpen },
  { name: 'hash', icon: Hash },
  { name: 'graduation', icon: GraduationCap },
  { name: 'globe', icon: Globe },
  { name: 'clock', icon: Clock },
  { name: 'zap', icon: Zap },
  { name: 'target', icon: Target },
  { name: 'layers', icon: Layers },
];

const COLORS = [
  { name: 'blue', class: 'bg-blue-500' },
  { name: 'green', class: 'bg-green-500' },
  { name: 'purple', class: 'bg-purple-500' },
  { name: 'pink', class: 'bg-pink-500' },
  { name: 'orange', class: 'bg-orange-500' },
  { name: 'teal', class: 'bg-teal-500' },
  { name: 'red', class: 'bg-red-500' },
  { name: 'yellow', class: 'bg-yellow-500' },
];

const getIconComponent = (iconName) => {
  const found = ICONS.find(i => i.name === iconName);
  return found ? found.icon : BookOpen;
};

const getColorClass = (colorName, isDark) => {
  const colors = {
    blue: isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600',
    green: isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600',
    purple: isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600',
    pink: isDark ? 'bg-pink-500/20 text-pink-400' : 'bg-pink-100 text-pink-600',
    orange: isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600',
    teal: isDark ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-600',
    red: isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600',
    yellow: isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600',
  };
  return colors[colorName] || colors.blue;
};

export default function TopicsList({ teacherId, isDark = true }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Drag state
  const [draggedTopic, setDraggedTopic] = useState(null);
  const [dragOverTopic, setDragOverTopic] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    name_ru: '',
    description: '',
    icon: 'book',
    icon_color: 'blue',
  });

  const loadTopics = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setTopics(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTopics();
  }, [teacherId]);

  if (selectedTopic) {
    return (
      <TopicDetail
        topic={selectedTopic}
        teacherId={teacherId}
        isDark={isDark}
        onBack={() => setSelectedTopic(null)}
      />
    );
  }

  const openModal = (topic = null) => {
    if (topic) {
      setEditingTopic(topic);
      setFormData({
        name: topic.name || '',
        name_ru: topic.name_ru || '',
        description: topic.description || '',
        icon: topic.icon || 'book',
        icon_color: topic.icon_color || 'blue',
      });
    } else {
      setEditingTopic(null);
      setFormData({
        name: '',
        name_ru: '',
        description: '',
        icon: 'book',
        icon_color: 'blue',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTopic(null);
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
    if (editingTopic) {
      ({ error } = await supabase
        .from('topics')
        .update(payload)
        .eq('id', editingTopic.id));
    } else {
      payload.sort_order = topics.length;
      ({ error } = await supabase
        .from('topics')
        .insert(payload));
    }

    if (!error) {
      await loadTopics();
      closeModal();
    }
    setSaving(false);
  };

  const handleDelete = async (topic) => {
    setDeleteTarget(topic);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('id', deleteTarget.id);

    if (!error) {
      await loadTopics();
    }
    setDeleteTarget(null);
  };

  // Drag handlers
  const handleDragStart = (e, topic) => {
    setDraggedTopic(topic);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTopic(null);
    setDragOverTopic(null);
  };

  const handleDragOver = (e, topic) => {
    e.preventDefault();
    if (draggedTopic && topic.id !== draggedTopic.id) {
      setDragOverTopic(topic);
    }
  };

  const handleDrop = async (e, targetTopic) => {
    e.preventDefault();
    if (!draggedTopic || draggedTopic.id === targetTopic.id) return;

    const oldIndex = topics.findIndex(t => t.id === draggedTopic.id);
    const newIndex = topics.findIndex(t => t.id === targetTopic.id);

    const newTopics = [...topics];
    newTopics.splice(oldIndex, 1);
    newTopics.splice(newIndex, 0, draggedTopic);

    setTopics(newTopics);
    setDraggedTopic(null);
    setDragOverTopic(null);

    // Update sort_order in database
    const updates = newTopics.map((t, i) => ({ id: t.id, sort_order: i }));
    for (const u of updates) {
      await supabase.from('topics').update({ sort_order: u.sort_order }).eq('id', u.id);
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
            Topics
          </h2>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Organize your materials by topic (Prepositions, Tenses, etc.)
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
        >
          <Plus size={18} />
          Add Topic
        </button>
      </div>

      {/* Topics grid */}
      {topics.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl ${
          isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-gray-200'
        }`}>
          <Layers size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            No topics yet
          </h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Create your first topic to organize materials
          </p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-5 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
          >
            <Plus size={18} />
            Create Topic
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map(topic => {
            const IconComponent = getIconComponent(topic.icon);
            const isDragging = draggedTopic?.id === topic.id;
            const isDragOver = dragOverTopic?.id === topic.id;
            return (
              <div
                key={topic.id}
                draggable
                onDragStart={e => handleDragStart(e, topic)}
                onDragEnd={handleDragEnd}
                onDragOver={e => handleDragOver(e, topic)}
                onDrop={e => handleDrop(e, topic)}
                className={`group rounded-2xl p-5 transition-all cursor-pointer ${
                  isDragging ? 'opacity-50' : ''
                } ${
                  isDragOver ? 'ring-2 ring-pink-vibrant' : ''
                } ${
                  isDark
                    ? 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20'
                    : 'bg-white border border-gray-200 hover:shadow-md hover:border-gray-300'
                }`}
                onClick={() => setSelectedTopic(topic)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`cursor-grab active:cursor-grabbing p-1 -ml-1 rounded ${isDark ? 'text-white/30 hover:text-white/60' : 'text-gray-300 hover:text-gray-500'}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <GripVertical size={18} />
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getColorClass(topic.icon_color, isDark)}`}>
                      <IconComponent size={24} />
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => openModal(topic)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'
                      }`}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(topic)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'
                      }`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {topic.name}
                </h3>
                {topic.name_ru && (
                  <p className={`text-sm mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    {topic.name_ru}
                  </p>
                )}
                {topic.description && (
                  <p className={`text-sm mb-3 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                    {topic.description}
                  </p>
                )}
                <div className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                  isDark ? 'text-white/30 group-hover:text-pink-vibrant' : 'text-gray-300 group-hover:text-pink-vibrant'
                }`}>
                  Open <ChevronRight size={14} />
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
        >
          <div
            className={`relative rounded-3xl p-6 w-full max-w-md ${
              isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-gray-200'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingTopic ? 'Edit Topic' : 'New Topic'}
              </h3>
              <button
                onClick={closeModal}
                className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Name */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Name (English) *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Prepositions"
                  className={`w-full px-4 py-3 rounded-xl ${
                    isDark
                      ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                  required
                />
              </div>

              {/* Name RU */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Name (Russian)
                </label>
                <input
                  type="text"
                  value={formData.name_ru}
                  onChange={e => setFormData({ ...formData, name_ru: e.target.value })}
                  placeholder="e.g., Предлоги"
                  className={`w-full px-4 py-3 rounded-xl ${
                    isDark
                      ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description..."
                  rows={2}
                  className={`w-full px-4 py-3 rounded-xl resize-none ${
                    isDark
                      ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>

              {/* Icon selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Icon
                </label>
                <div className="flex gap-2 flex-wrap">
                  {ICONS.map(({ name, icon: Icon }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: name })}
                      className={`p-3 rounded-xl transition-all ${
                        formData.icon === name
                          ? 'bg-pink-vibrant text-white'
                          : isDark
                            ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Icon size={20} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(({ name, class: colorClass }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon_color: name })}
                      className={`w-8 h-8 rounded-full ${colorClass} transition-all ${
                        formData.icon_color === name
                          ? 'ring-2 ring-offset-2 ring-pink-vibrant'
                          : ''
                      }`}
                      style={{ ringOffsetColor: isDark ? '#1a1a1e' : '#fff' }}
                    />
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
                  {editingTopic ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteTarget && (
        <ConfirmDeleteModal
          itemName={deleteTarget.name}
          onConfirm={executeDelete}
          onCancel={() => setDeleteTarget(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
}
