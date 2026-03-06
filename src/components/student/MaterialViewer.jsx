import { X, BookOpen, Layers, CheckCircle } from 'lucide-react';

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

export default function MaterialViewer({ material, onClose, isDark = true }) {
  if (!material) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className={`relative rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden ${
          isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-gray-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 px-6 py-4 border-b ${
          isDark ? 'bg-[#1a1a1e] border-white/10' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {material.title}
                </h2>
                {material.level && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(material.level, isDark)}`}>
                    {material.level}
                  </span>
                )}
              </div>
              {material.topics?.name && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                  isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                }`}>
                  <Layers size={10} />
                  {material.topics.name}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Main content */}
          <div className={`prose max-w-none ${isDark ? 'prose-invert' : ''}`}>
            <div className={`text-base leading-relaxed whitespace-pre-wrap ${isDark ? 'text-white/90' : 'text-gray-800'}`}>
              {material.content}
            </div>
          </div>

          {/* Examples */}
          {material.examples?.length > 0 && (
            <div className="mt-8">
              <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                <BookOpen size={16} />
                Examples
              </h3>
              <div className="space-y-2">
                {material.examples.map((example, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.05]' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        isDark ? 'bg-pink-vibrant/20 text-pink-vibrant' : 'bg-pink-100 text-pink-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <p className={`text-sm ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                        {example}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {material.notes && (
            <div className="mt-8">
              <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                Notes
              </h3>
              <div className={`p-4 rounded-xl border-l-4 ${
                isDark ? 'bg-yellow-500/10 border-yellow-500 text-white/70' : 'bg-yellow-50 border-yellow-400 text-gray-700'
              }`}>
                <p className="text-sm">{material.notes}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t flex justify-end">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
            >
              <CheckCircle size={18} />
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
