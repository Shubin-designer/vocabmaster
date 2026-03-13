import { useState } from 'react';
import { ScanText, Loader2, Save, FileText, BookOpen, ClipboardList } from 'lucide-react';
import RichTextEditor from '../common/RichTextEditor';

const CONTENT_TYPES = [
  { key: 'material', label: 'Material', icon: FileText },
  { key: 'reading', label: 'Reading', icon: BookOpen },
  { key: 'test', label: 'Test', icon: ClipboardList },
];

export default function PdfOcrPanel({
  selectedPages,
  onRunOcr,
  ocrProgress,
  ocrHtml,
  onHtmlChange,
  onSave,
  isDark,
}) {
  const [contentType, setContentType] = useState('material');
  const isProcessing = ocrProgress.status === 'processing';
  const hasContent = ocrHtml && ocrHtml.trim().length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* OCR Controls */}
      <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
        <button
          onClick={onRunOcr}
          disabled={selectedPages.length === 0 || isProcessing}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
            selectedPages.length === 0 || isProcessing
              ? isDark
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-pink-vibrant text-white hover:bg-pink-vibrant/90 shadow-lg shadow-pink-vibrant/25'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing {ocrProgress.current}/{ocrProgress.total}...
            </>
          ) : (
            <>
              <ScanText className="w-5 h-5" />
              Run OCR {selectedPages.length > 0 && `(${selectedPages.length} page${selectedPages.length > 1 ? 's' : ''})`}
            </>
          )}
        </button>

        {/* Progress bar */}
        {isProcessing && (
          <div className={`mt-3 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
            <div
              className="h-full bg-pink-vibrant transition-all duration-300"
              style={{ width: `${(ocrProgress.current / ocrProgress.total) * 100}%` }}
            />
          </div>
        )}

        {ocrProgress.status === 'error' && (
          <p className="mt-2 text-sm text-red-500">{ocrProgress.error}</p>
        )}
      </div>

      {/* Content Type Selector */}
      <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
        <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          Save as
        </label>
        <div className="flex gap-2">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type.key}
              onClick={() => setContentType(type.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
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

      {/* Editor */}
      <div className="flex-1 p-4 overflow-auto">
        <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          OCR Result
        </label>
        <RichTextEditor
          content={ocrHtml}
          onChange={onHtmlChange}
          isDark={isDark}
        />
      </div>

      {/* Save Button */}
      <div className={`p-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
        <button
          onClick={() => onSave(contentType)}
          disabled={!hasContent}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
            !hasContent
              ? isDark
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-600/25'
          }`}
        >
          <Save className="w-5 h-5" />
          Save {CONTENT_TYPES.find((t) => t.key === contentType)?.label}
        </button>
      </div>
    </div>
  );
}
