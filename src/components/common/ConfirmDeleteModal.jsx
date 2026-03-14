import { X } from 'lucide-react';

export default function ConfirmDeleteModal({ title = 'Delete?', itemName, onConfirm, onCancel, isDark = true }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-[70] animate-fadeIn"
      style={{ background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className={`relative liquid-glass rounded-3xl p-6 w-full max-w-sm animate-scaleIn ${
          isDark ? 'text-gray-100 border-white/10' : 'text-gray-900 border-black/10'
        }`}
        style={{
          boxShadow: isDark
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h3>
        <p className={`mb-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Delete "{itemName}"?
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className={`h-10 px-4 font-medium rounded-full transition-all flex items-center justify-center gap-2 border ${
              isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="h-10 px-4 font-medium rounded-full transition-all flex items-center justify-center gap-2 bg-red-500 text-white hover:brightness-110"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
