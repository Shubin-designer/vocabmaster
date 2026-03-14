import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Search, X, FileText, Loader2, FolderOpen } from 'lucide-react';

export default function PdfLibraryModal({ teacherId, isDark, onSelect, onClose }) {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadLibrary = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('pdf_library')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (!error) {
        setPdfs(data || []);
      }
      setLoading(false);
    };
    loadLibrary();
  }, [teacherId]);

  const handleSelect = async (pdf) => {
    const { data } = await supabase.storage
      .from('pdfs')
      .createSignedUrl(pdf.file_path, 3600);

    if (data?.signedUrl) {
      onSelect({ ...pdf, signedUrl: data.signedUrl });
    }
  };

  const filteredPdfs = pdfs.filter(pdf =>
    pdf.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pdf.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col ${
          isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Select from Library
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
            isDark ? 'bg-white/[0.03] border-white/10' : 'bg-gray-50 border-gray-200'
          }`}>
            <Search size={18} className={isDark ? 'text-white/40' : 'text-gray-400'} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search PDFs..."
              className={`flex-1 bg-transparent outline-none text-sm ${
                isDark ? 'text-white placeholder-white/40' : 'text-gray-900 placeholder-gray-400'
              }`}
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className={isDark ? 'text-white/40' : 'text-gray-400'}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* PDF List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={32} className="animate-spin text-pink-vibrant" />
            </div>
          ) : filteredPdfs.length === 0 ? (
            <div className={`text-center py-12 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? 'No PDFs found' : 'Library is empty'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredPdfs.map(pdf => (
                <button
                  key={pdf.id}
                  onClick={() => handleSelect(pdf)}
                  className={`flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                    isDark
                      ? 'hover:bg-white/[0.05] border border-white/[0.05]'
                      : 'hover:bg-gray-50 border border-gray-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
                  }`}>
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {pdf.title}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                      {pdf.page_count} pages • {formatSize(pdf.file_size)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
