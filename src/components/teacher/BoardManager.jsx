import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Plus, Presentation, Trash2, Play, Users, Clock,
  MoreVertical, Radio, Copy, Check, ExternalLink, Pencil
} from 'lucide-react';
import LiveBoard from '../common/LiveBoard';
import ConfirmDeleteModal from '../common/ConfirmDeleteModal';

export default function BoardManager({ teacherId, students = [], isDark = true }) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [editingBoardId, setEditingBoardId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (teacherId) {
      loadBoards();
    }
  }, [teacherId]);

  const loadBoards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lesson_boards')
      .select(`
        *,
        board_participants(user_id, role)
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (!error) {
      setBoards(data || []);
    }
    setLoading(false);
  };

  const createBoard = async () => {
    if (!newTitle.trim()) return;

    const { data: board, error } = await supabase
      .from('lesson_boards')
      .insert({
        teacher_id: teacherId,
        title: newTitle.trim()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating board:', error);
      return;
    }

    // Add selected students as participants
    if (selectedStudents.length > 0) {
      const participants = selectedStudents.map(studentId => ({
        board_id: board.id,
        user_id: studentId,
        role: 'editor'
      }));

      await supabase.from('board_participants').insert(participants);
    }

    // Also add teacher as participant
    await supabase.from('board_participants').insert({
      board_id: board.id,
      user_id: teacherId,
      role: 'editor'
    });

    setShowCreate(false);
    setNewTitle('');
    setSelectedStudents([]);
    loadBoards();
  };

  const deleteBoard = (board) => setDeleteTarget(board);

  const executeDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('lesson_boards').delete().eq('id', deleteTarget.id);
    loadBoards();
    setDeleteTarget(null);
  };

  const updateBoardTitle = async (boardId, newTitle) => {
    if (!newTitle.trim()) {
      setEditingBoardId(null);
      return;
    }
    await supabase
      .from('lesson_boards')
      .update({ title: newTitle.trim(), updated_at: new Date().toISOString() })
      .eq('id', boardId);
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, title: newTitle.trim() } : b));
    setEditingBoardId(null);
  };

  const copyLink = (boardId) => {
    const link = `${window.location.origin}/board/${boardId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(boardId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openBoard = (board) => {
    setActiveBoard(board);
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  if (activeBoard) {
    return (
      <LiveBoard
        boardId={activeBoard.id}
        userId={teacherId}
        isTeacher={true}
        onClose={() => {
          setActiveBoard(null);
          loadBoards();
        }}
        isDark={isDark}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Live Boards
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Interactive whiteboards for real-time lessons
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
        >
          <Plus size={18} />
          New Board
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl ${
            isDark ? 'bg-gray-900 border border-white/10' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Create New Board
            </h3>

            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Board title..."
              className={`w-full px-4 py-3 rounded-xl border mb-4 ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30'
                  : 'bg-gray-50 border-gray-200 text-gray-900'
              }`}
              autoFocus
            />

            {students.length > 0 && (
              <div className="mb-4">
                <label className={`text-sm font-medium mb-2 block ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Invite students (optional)
                </label>
                <div className={`max-h-40 overflow-y-auto rounded-xl border p-2 ${
                  isDark ? 'border-white/10' : 'border-gray-200'
                }`}>
                  {students.map(student => (
                    <label
                      key={student.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                        isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        className="rounded"
                      />
                      <span className={isDark ? 'text-white/80' : 'text-gray-700'}>
                        {student.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewTitle('');
                  setSelectedStudents([]);
                }}
                className={`px-4 py-2 rounded-xl ${
                  isDark ? 'text-white/60 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={createBoard}
                disabled={!newTitle.trim()}
                className="px-4 py-2 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Boards grid */}
      {loading ? (
        <div className={`text-center py-8 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          Loading boards...
        </div>
      ) : boards.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl border-2 border-dashed ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <Presentation className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} size={48} />
          <p className={isDark ? 'text-white/50' : 'text-gray-500'}>
            No boards yet. Create one to start a live lesson.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map(board => (
            <div
              key={board.id}
              className={`group relative rounded-2xl p-5 border transition-all ${
                isDark
                  ? 'bg-white/[0.03] border-white/[0.08] hover:border-white/20'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Live badge */}
              {board.is_live && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </div>
              )}

              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                }`}>
                  <Presentation size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  {editingBoardId === board.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => updateBoardTitle(board.id, editingTitle)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') updateBoardTitle(board.id, editingTitle);
                        if (e.key === 'Escape') setEditingBoardId(null);
                      }}
                      autoFocus
                      className={`w-full font-medium px-2 py-1 rounded-lg border-2 outline-none transition-colors ${
                        isDark
                          ? 'bg-white/5 border-purple-500/50 text-white focus:border-purple-400'
                          : 'bg-gray-50 border-purple-300 text-gray-900 focus:border-purple-500'
                      }`}
                    />
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <h4 className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {board.title}
                      </h4>
                      <button
                        onClick={() => {
                          setEditingBoardId(board.id);
                          setEditingTitle(board.title);
                        }}
                        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                          isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-200 text-gray-400'
                        }`}
                        title="Rename"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                  <div className={`flex items-center gap-3 text-sm mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {board.board_participants?.length || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(board.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openBoard(board)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-medium transition-colors ${
                    board.is_live
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-pink-vibrant text-white hover:brightness-110'
                  }`}
                >
                  <Play size={16} />
                  {board.is_live ? 'Join Live' : 'Open'}
                </button>

                <button
                  onClick={() => copyLink(board.id)}
                  className={`p-2 rounded-xl transition-colors ${
                    isDark ? 'bg-white/5 hover:bg-white/10 text-white/60' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                  title="Copy link"
                >
                  {copiedId === board.id ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>

                <button
                  onClick={() => deleteBoard(board)}
                  className={`p-2 rounded-xl transition-colors ${
                    isDark ? 'bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400' : 'bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600'
                  }`}
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          itemName={deleteTarget.title}
          onConfirm={executeDelete}
          onCancel={() => setDeleteTarget(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
}
