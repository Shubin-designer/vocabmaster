import { useState, useRef, useEffect } from 'react';
import { X, Check, Loader, PanelRightOpen, PanelRightClose } from 'lucide-react';
import RichTextEditor from '../common/RichTextEditor';
import PdfSidePanel from './PdfSidePanel';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function MaterialEditorFullscreen({
  material,
  topicName,
  onSave,
  onClose,
  isDark,
}) {
  const [formData, setFormData] = useState({
    title: material?.title || '',
    content: material?.content || '',
    level: material?.level || 'B1',
  });
  const [saving, setSaving] = useState(false);
  const [showPdfPanel, setShowPdfPanel] = useState(true);
  const editorRef = useRef(null);

  const handleSave = async () => {
    if (!formData.content || formData.content === '<p></p>') return;
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  // Insert HTML at cursor position in editor
  const handleInsertFromPdf = (html) => {
    if (!html) return;

    // Get the Tiptap editor instance
    const editorEl = editorRef.current?.querySelector('.ProseMirror');
    if (editorEl) {
      // Focus the editor and insert content
      editorEl.focus();

      // Use the editor's insertContent if available via window
      // Otherwise, append to current content
      const currentContent = formData.content || '';
      const newContent = currentContent.replace(/<\/p>$/, '') + html + '</p>';
      setFormData(prev => ({ ...prev, content: prev.content + html }));
    } else {
      // Fallback: append to content
      setFormData(prev => ({ ...prev, content: prev.content + html }));
    }
  };

  const isEditing = !!material;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: isDark ? '#0f0f12' : '#f5f5f5' }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${
        isDark ? 'bg-[#1a1a1e] border-white/10' : 'bg-white border-gray-200'
      }`}>
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {isEditing ? 'Edit Material' : 'New Material'}
          </h2>
          {topicName && (
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              Topic: {topicName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPdfPanel(!showPdfPanel)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              showPdfPanel
                ? 'bg-pink-vibrant text-white'
                : isDark
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showPdfPanel ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            PDF Panel
          </button>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Material Form */}
        <div className={`flex-1 flex flex-col overflow-hidden ${showPdfPanel ? 'w-1/2' : 'w-full'}`}>
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Title & Level */}
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                    Title
                  </label>
                  <input
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50 ${
                      isDark
                        ? 'bg-white/[0.05] border-white/10 text-white placeholder-white/30'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                    placeholder="Material title..."
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                    Level
                  </label>
                  <div className="flex gap-1.5">
                    {LEVELS.map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setFormData({ ...formData, level: l })}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          formData.level === l
                            ? 'bg-pink-vibrant text-white'
                            : isDark
                              ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Content Editor */}
              <div ref={editorRef}>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Content *
                </label>
                <RichTextEditor
                  content={formData.content}
                  onChange={html => setFormData({ ...formData, content: html })}
                  isDark={isDark}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`flex gap-3 px-6 py-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-3 rounded-xl font-medium ${
                isDark ? 'bg-white/[0.05] text-white/80 hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.content || formData.content === '<p></p>'}
              className="flex-1 px-4 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader size={18} className="animate-spin" /> : <Check size={18} />}
              {isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>

        {/* Right: PDF Panel */}
        {showPdfPanel && (
          <div className={`w-1/2 border-l overflow-hidden ${
            isDark ? 'bg-[#1a1a1e] border-white/10' : 'bg-white border-gray-200'
          }`}>
            <PdfSidePanel
              onInsert={handleInsertFromPdf}
              isDark={isDark}
            />
          </div>
        )}
      </div>
    </div>
  );
}
