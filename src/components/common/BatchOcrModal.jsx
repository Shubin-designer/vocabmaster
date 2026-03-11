import { useState, useRef, useCallback } from 'react';
import { X, Upload, ScanText, Loader2, CheckCircle2, AlertCircle, Trash2, StopCircle } from 'lucide-react';
import { ocrImageToHtml } from '../../utils/ocrToHtml';

export default function BatchOcrModal({ isDark, onInsert, onClose }) {
  const [files, setFiles] = useState([]); // { id, file, name, thumb, status: 'pending'|'processing'|'done'|'error', html, error }
  const [isProcessing, setIsProcessing] = useState(false);
  const [combinedHtml, setCombinedHtml] = useState('');
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const fileInputRef = useRef(null);
  const idCounter = useRef(0);
  const abortRef = useRef(false);

  const addFiles = useCallback((newFiles) => {
    const entries = Array.from(newFiles)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        id: ++idCounter.current,
        file: f,
        name: f.name,
        thumb: URL.createObjectURL(f),
        status: 'pending',
        html: '',
        error: '',
      }));
    setFiles(prev => [...prev, ...entries]);
  }, []);

  const removeFile = (id) => {
    setFiles(prev => {
      const f = prev.find(x => x.id === id);
      if (f?.thumb) URL.revokeObjectURL(f.thumb);
      return prev.filter(x => x.id !== id);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const stopProcessing = () => {
    abortRef.current = true;
  };

  const processAll = async () => {
    setIsProcessing(true);
    setCombinedHtml('');
    abortRef.current = false;

    const pending = files.filter(f => f.status === 'pending' || f.status === 'error');

    for (const entry of pending) {
      if (abortRef.current) {
        // Mark remaining as pending again
        setFiles(prev => prev.map(f =>
          f.id === entry.id && f.status === 'processing' ? { ...f, status: 'pending' } : f
        ));
        break;
      }

      setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'processing', error: '' } : f));

      try {
        const html = await ocrImageToHtml(entry.file);
        if (abortRef.current) {
          // Still save the result even if stopped mid-way
          setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'done', html } : f));
          break;
        }
        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'done', html } : f));
      } catch (err) {
        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'error', error: err.message } : f));
      }
    }

    // Build combined HTML from all done files
    setFiles(prev => {
      const allHtml = prev
        .filter(f => f.status === 'done' && f.html)
        .map(f => f.html)
        .join('\n<hr>\n');
      setCombinedHtml(allHtml);
      return prev;
    });

    setIsProcessing(false);
    abortRef.current = false;
  };

  const handleClose = () => {
    const hasDoneResults = files.some(f => f.status === 'done' && f.html);
    const hasPendingFiles = files.length > 0;
    if (isProcessing || hasDoneResults || hasPendingFiles) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    abortRef.current = true;
    setShowConfirmClose(false);
    onClose();
  };

  const doneCount = files.filter(f => f.status === 'done').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const totalCount = files.length;
  const allDone = totalCount > 0 && doneCount + errorCount === totalCount;
  const hasPending = files.some(f => f.status === 'pending' || f.status === 'error');

  const bg = isDark ? 'bg-[#1a1a1e]' : 'bg-white';
  const border = isDark ? 'border-white/10' : 'border-gray-200';
  const text = isDark ? 'text-white/85' : 'text-gray-900';
  const textMuted = isDark ? 'text-white/50' : 'text-gray-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className={`relative ${bg} ${text} rounded-2xl border ${border} shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${border}`}>
          <div className="flex items-center gap-2">
            <ScanText size={20} className="text-pink-400" />
            <h2 className="text-lg font-semibold">Batch OCR</h2>
            {totalCount > 0 && (
              <span className={`text-sm ${textMuted}`}>
                {doneCount}/{totalCount} done
              </span>
            )}
          </div>
          <button onClick={handleClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDark
                ? 'border-white/15 hover:border-white/30 hover:bg-white/[0.03]'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <Upload size={28} className={`mx-auto mb-2 ${textMuted}`} />
            <p className={`text-sm font-medium ${textMuted}`}>
              Drop images here or click to select
            </p>
            <p className={`text-xs mt-1 ${textMuted}`}>JPG, PNG — multiple files supported</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
          />

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div
                  key={f.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${border} ${
                    isDark ? 'bg-white/[0.02]' : 'bg-gray-50'
                  }`}
                >
                  <span className={`text-xs font-mono ${textMuted} w-5 text-right`}>{i + 1}</span>
                  <img
                    src={f.thumb}
                    alt={f.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{f.name}</p>
                    {f.status === 'error' && (
                      <p className="text-xs text-red-400 truncate">{f.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {f.status === 'pending' && (
                      <span className={`text-xs ${textMuted}`}>Pending</span>
                    )}
                    {f.status === 'processing' && (
                      <Loader2 size={16} className="animate-spin text-pink-400" />
                    )}
                    {f.status === 'done' && (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    )}
                    {f.status === 'error' && (
                      <AlertCircle size={16} className="text-red-400" />
                    )}
                    {!isProcessing && (
                      <button
                        onClick={() => removeFile(f.id)}
                        className={`p-1 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/30' : 'hover:bg-gray-200 text-gray-400'}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          {combinedHtml && (
            <div className={`rounded-xl border ${border} overflow-hidden`}>
              <div className={`px-3 py-2 text-xs font-medium ${isDark ? 'bg-white/[0.04] text-white/50' : 'bg-gray-100 text-gray-500'}`}>
                Preview
              </div>
              <div
                className={`p-4 text-sm max-h-60 overflow-y-auto prose ${isDark ? 'prose-invert' : ''}`}
                dangerouslySetInnerHTML={{ __html: combinedHtml }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-5 py-4 border-t ${border}`}>
          <div className={`text-xs ${textMuted}`}>
            {isProcessing && !abortRef.current && 'Processing...'}
            {!isProcessing && errorCount > 0 && `${errorCount} failed`}
          </div>
          <div className="flex gap-2">
            {isProcessing && (
              <button
                onClick={stopProcessing}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-white/[0.06] text-white/70 hover:bg-white/10'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <StopCircle size={14} />
                Stop
              </button>
            )}
            {!isProcessing && files.length > 0 && hasPending && (
              <button
                onClick={processAll}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-pink-vibrant text-white hover:bg-pink-600 transition-colors"
              >
                <ScanText size={14} />
                {doneCount > 0 ? 'Continue OCR' : 'Start OCR'}
              </button>
            )}
            {combinedHtml && !isProcessing && (
              <button
                onClick={() => { onInsert(combinedHtml); onClose(); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                Insert All
              </button>
            )}
          </div>
        </div>

        {/* Confirm close dialog */}
        {showConfirmClose && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl">
            <div className="absolute inset-0 bg-black/40 rounded-2xl" onClick={() => setShowConfirmClose(false)} />
            <div className={`relative ${bg} border ${border} rounded-xl shadow-2xl p-5 max-w-sm mx-4 space-y-3`}>
              <h3 className="font-semibold">Close OCR?</h3>
              <p className={`text-sm ${textMuted}`}>
                {isProcessing
                  ? 'Processing will stop. Already scanned texts will be lost.'
                  : combinedHtml
                    ? 'Scanned texts have not been inserted and will be lost.'
                    : 'Added images will be removed.'}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowConfirmClose(false)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isDark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClose}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Close anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
