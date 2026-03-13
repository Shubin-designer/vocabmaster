import { Check, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const STATUS_ICONS = {
  pending: null,
  processing: Loader2,
  done: CheckCircle2,
  error: AlertCircle,
};

export default function PdfPageThumbnail({
  pageNum,
  thumbnail,
  isSelected,
  isActive,
  status = 'pending',
  onSelect,
  onClick,
  isDark,
}) {
  const StatusIcon = STATUS_ICONS[status];

  return (
    <div
      onClick={onClick}
      className={`relative rounded-lg overflow-hidden cursor-pointer transition-all border-2 ${
        isActive
          ? 'border-pink-vibrant shadow-lg shadow-pink-vibrant/20'
          : isSelected
            ? isDark
              ? 'border-white/40'
              : 'border-gray-400'
            : isDark
              ? 'border-white/10 hover:border-white/30'
              : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Thumbnail image */}
      <div className="relative aspect-[3/4] bg-white">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`Page ${pageNum}`}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        )}

        {/* Status overlay */}
        {status === 'processing' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          </div>
        )}
        {status === 'done' && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        )}
      </div>

      {/* Checkbox */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        className={`absolute top-1.5 left-1.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
          isSelected
            ? 'bg-pink-vibrant border-pink-vibrant'
            : isDark
              ? 'bg-black/50 border-white/50 hover:border-white'
              : 'bg-white/80 border-gray-400 hover:border-gray-600'
        }`}
      >
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </div>

      {/* Page number */}
      <div
        className={`absolute bottom-0 left-0 right-0 text-center py-1 text-xs font-medium ${
          isDark ? 'bg-black/70 text-white/80' : 'bg-white/90 text-gray-700'
        }`}
      >
        {pageNum}
      </div>
    </div>
  );
}
