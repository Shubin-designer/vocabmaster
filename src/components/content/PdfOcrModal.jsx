import { useState, useRef, useEffect } from 'react';
import { X, Save, FileText, BookOpen, ClipboardList, TextSelect, FileDown } from 'lucide-react';
import RichTextEditor from '../common/RichTextEditor';
import PdfSaveModal from './PdfSaveModal';

const CONTENT_TYPES = [
  { key: 'material', label: 'Material', icon: FileText },
  { key: 'reading', label: 'Reading', icon: BookOpen },
  { key: 'test', label: 'Test', icon: ClipboardList },
];

export default function PdfOcrModal({
  ocrHtml,
  onHtmlChange,
  onClose,
  teacherId,
  isDark,
}) {
  const [contentType, setContentType] = useState('material');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMode, setSaveMode] = useState('all'); // 'all' or 'selection'
  const [selectedHtml, setSelectedHtml] = useState('');
  const editorContainerRef = useRef(null);

  // Get selected HTML from editor
  const getSelectionHtml = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return null;
    }

    // Check if selection is within our editor
    const editorEl = editorContainerRef.current?.querySelector('.rich-editor');
    if (!editorEl) return null;

    const range = selection.getRangeAt(0);
    if (!editorEl.contains(range.commonAncestorContainer)) {
      return null;
    }

    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    return container.innerHTML;
  };

  const handleSaveAll = () => {
    setSaveMode('all');
    setShowSaveModal(true);
  };

  const handleSaveSelection = () => {
    const html = getSelectionHtml();
    if (html && html.trim()) {
      setSelectedHtml(html);
      setSaveMode('selection');
      setShowSaveModal(true);
    }
  };

  const hasSelection = () => {
    const selection = window.getSelection();
    return selection && !selection.isCollapsed;
  };

  const [hasTextSelected, setHasTextSelected] = useState(false);

  useEffect(() => {
    const checkSelection = () => {
      setHasTextSelected(!!getSelectionHtml());
    };
    document.addEventListener('selectionchange', checkSelection);
    return () => document.removeEventListener('selectionchange', checkSelection);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: isDark ? '#0f0f12' : '#f5f5f5' }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${
        isDark ? 'bg-[#1a1a1e] border-white/10' : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Edit OCR Result
        </h2>
        <button
          onClick={onClose}
          className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
        >
          <X size={24} />
        </button>
      </div>

      {/* Toolbar */}
      <div className={`flex items-center justify-between px-6 py-3 border-b ${
        isDark ? 'bg-[#1a1a1e]/50 border-white/10' : 'bg-gray-50 border-gray-200'
      }`}>
        {/* Content type selector */}
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Save as:
          </span>
          <div className="flex gap-2">
            {CONTENT_TYPES.map((type) => (
              <button
                key={type.key}
                onClick={() => setContentType(type.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  contentType === type.key
                    ? 'bg-pink-vibrant text-white'
                    : isDark
                      ? 'bg-white/5 text-white/60 hover:bg-white/10'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <type.icon className="w-4 h-4" />
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveSelection}
            disabled={!hasTextSelected}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              !hasTextSelected
                ? isDark
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : isDark
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <TextSelect className="w-4 h-4" />
            Save Selection
          </button>
          <button
            onClick={handleSaveAll}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-500 transition-all"
          >
            <FileDown className="w-4 h-4" />
            Save All
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto p-6" ref={editorContainerRef}>
        <div className="max-w-4xl mx-auto">
          <RichTextEditor
            content={ocrHtml}
            onChange={onHtmlChange}
            isDark={isDark}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className={`px-6 py-3 border-t text-center text-sm ${
        isDark ? 'bg-[#1a1a1e]/50 border-white/10 text-white/40' : 'bg-gray-50 border-gray-200 text-gray-500'
      }`}>
        Select text in the editor to save only that portion, or click "Save All" to save the entire content
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <PdfSaveModal
          contentType={contentType}
          htmlContent={saveMode === 'selection' ? selectedHtml : ocrHtml}
          teacherId={teacherId}
          onClose={() => setShowSaveModal(false)}
          onSuccess={() => {
            setShowSaveModal(false);
            // Don't close the main modal - allow saving more parts
          }}
          isDark={isDark}
        />
      )}
    </div>
  );
}
