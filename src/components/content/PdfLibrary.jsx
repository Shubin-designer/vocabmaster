import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Upload, FileText, Trash2, Loader, Search, X,
  BookOpen, FolderOpen, GripVertical
} from 'lucide-react';
import { loadPdf } from '../../utils/pdfUtils';

export default function PdfLibrary({ teacherId, isDark, onSelectPdf }) {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [draggedPdf, setDraggedPdf] = useState(null);
  const [dragOverPdf, setDragOverPdf] = useState(null);
  const fileInputRef = useRef(null);

  const loadLibrary = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pdf_library')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('sort_order', { ascending: true });

    if (!error) {
      setPdfs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLibrary();
  }, [teacherId]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setUploading(true);
    setUploadProgress(10);

    try {
      // Get page count
      const pdfDoc = await loadPdf(file);
      const pageCount = pdfDoc.numPages;
      setUploadProgress(30);

      // IMPORTANT: Use only safe characters in filename (timestamp only)
      const safeFilename = `${Date.now()}.pdf`;
      const filePath = `${teacherId}/${safeFilename}`;

      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      setUploadProgress(70);

      // Save metadata (original filename preserved here)
      const { error: dbError } = await supabase
        .from('pdf_library')
        .insert({
          teacher_id: teacherId,
          title: file.name.replace(/\.pdf$/i, ''),
          filename: file.name,
          file_path: filePath,
          file_size: file.size,
          page_count: pageCount,
          sort_order: pdfs.length,
        });

      if (dbError) throw dbError;
      setUploadProgress(100);

      await loadLibrary();
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (pdf) => {
    try {
      await supabase.storage.from('pdfs').remove([pdf.file_path]);
      await supabase.from('pdf_library').delete().eq('id', pdf.id);
      await loadLibrary();
    } catch (err) {
      console.error('Delete error:', err);
    }
    setDeleteTarget(null);
  };

  const handleSelectPdf = async (pdf) => {
    const { data } = await supabase.storage
      .from('pdfs')
      .createSignedUrl(pdf.file_path, 3600);

    if (data?.signedUrl) {
      onSelectPdf({ ...pdf, signedUrl: data.signedUrl });
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

  // Drag handlers
  const handleDragStart = (e, pdf) => {
    setDraggedPdf(pdf);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedPdf(null);
    setDragOverPdf(null);
  };

  const handleDragOver = (e, pdf) => {
    e.preventDefault();
    if (draggedPdf && pdf.id !== draggedPdf.id) {
      setDragOverPdf(pdf);
    }
  };

  const handleDragLeave = () => {
    setDragOverPdf(null);
  };

  const handleDrop = async (e, targetPdf) => {
    e.preventDefault();
    if (!draggedPdf || draggedPdf.id === targetPdf.id) return;

    const oldIndex = pdfs.findIndex(p => p.id === draggedPdf.id);
    const newIndex = pdfs.findIndex(p => p.id === targetPdf.id);

    const newPdfs = [...pdfs];
    newPdfs.splice(oldIndex, 1);
    newPdfs.splice(newIndex, 0, draggedPdf);

    setPdfs(newPdfs);
    setDraggedPdf(null);
    setDragOverPdf(null);

    for (let i = 0; i < newPdfs.length; i++) {
      await supabase
        .from('pdf_library')
        .update({ sort_order: i })
        .eq('id', newPdfs[i].id);
    }
  };

  const card = `rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-gray-200'}`;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
          isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-gray-200'
        }`}>
          <Search size={18} className={isDark ? 'text-white/40' : 'text-gray-400'} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search PDFs..."
            className={`flex-1 bg-transparent outline-none text-sm ${
              isDark ? 'text-white placeholder-white/40' : 'text-gray-900 placeholder-gray-400'
            }`}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className={isDark ? 'text-white/40' : 'text-gray-400'}>
              <X size={16} />
            </button>
          )}
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader size={18} className="animate-spin" />
              {uploadProgress}%
            </>
          ) : (
            <>
              <Upload size={18} /> Upload PDF
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* PDF List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size={32} className="animate-spin text-pink-vibrant" />
        </div>
      ) : filteredPdfs.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-gray-200'}`}>
          <FolderOpen size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
          <p className={`text-lg mb-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
            {searchQuery ? 'No PDFs found' : 'Your library is empty'}
          </p>
          <p className={`text-sm mb-6 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            Upload PDFs to build your library
          </p>
          {!searchQuery && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110"
            >
              <Upload size={18} /> Upload First PDF
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPdfs.map(pdf => {
            const isDragging = draggedPdf?.id === pdf.id;
            const isDragOver = dragOverPdf?.id === pdf.id;
            return (
            <div
              key={pdf.id}
              draggable
              onDragStart={e => handleDragStart(e, pdf)}
              onDragEnd={handleDragEnd}
              onDragOver={e => handleDragOver(e, pdf)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, pdf)}
              className={`${card} p-4 flex items-start gap-4 group transition-all ${
                isDragging ? 'opacity-50' : ''
              } ${
                isDragOver ? 'ring-2 ring-pink-vibrant' : ''
              }`}
            >
              <div
                className={`cursor-grab active:cursor-grabbing p-1 mt-1 rounded flex-shrink-0 ${isDark ? 'text-white/30 hover:text-white/60' : 'text-gray-300 hover:text-gray-500'}`}
              >
                <GripVertical size={18} />
              </div>
              <div className={`w-12 h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
              }`}>
                <FileText size={24} />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {pdf.title}
                </h4>
                <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  {pdf.page_count} pages • {formatSize(pdf.file_size)}
                </p>
                <p className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-300'}`}>
                  {new Date(pdf.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleSelectPdf(pdf)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-white/10 text-green-400' : 'hover:bg-green-50 text-green-600'
                  }`}
                  title="Open"
                >
                  <BookOpen size={18} />
                </button>
                <button
                  onClick={() => setDeleteTarget(pdf)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'
                  }`}
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div
            className={`rounded-2xl p-6 w-full max-w-sm ${isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white'}`}
            onClick={e => e.stopPropagation()}
          >
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Delete PDF?
            </h3>
            <p className={`mb-4 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
              "{deleteTarget.title}" will be permanently deleted.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  isDark ? 'hover:bg-white/10 text-white/70' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="px-4 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
