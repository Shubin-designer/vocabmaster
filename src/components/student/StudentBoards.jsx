import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Presentation, Radio, Play, Clock, User } from 'lucide-react';
import LiveBoard from '../common/LiveBoard';

export default function StudentBoards({ studentId, isDark = true }) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBoard, setActiveBoard] = useState(null);

  useEffect(() => {
    if (studentId) {
      loadBoards();

      // Subscribe to board updates for live status changes
      const channel = supabase
        .channel('student-boards')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'lesson_boards' },
          () => loadBoards()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [studentId]);

  const loadBoards = async () => {
    setLoading(true);

    // Get boards where student is a participant
    const { data, error } = await supabase
      .from('board_participants')
      .select(`
        board_id,
        role,
        lesson_boards (
          id,
          title,
          is_live,
          started_at,
          created_at,
          teacher_id
        )
      `)
      .eq('user_id', studentId);

    if (!error && data) {
      // Get teacher profiles
      const teacherIds = [...new Set(data.map(d => d.lesson_boards?.teacher_id).filter(Boolean))];
      let teachers = {};

      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, display_name')
          .in('user_id', teacherIds);

        profiles?.forEach(p => {
          teachers[p.user_id] = p.display_name;
        });
      }

      const boardsList = data
        .filter(d => d.lesson_boards)
        .map(d => ({
          ...d.lesson_boards,
          role: d.role,
          teacherName: teachers[d.lesson_boards.teacher_id] || 'Teacher'
        }))
        .sort((a, b) => {
          // Live boards first
          if (a.is_live && !b.is_live) return -1;
          if (!a.is_live && b.is_live) return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        });

      setBoards(boardsList);
    }

    setLoading(false);
  };

  if (activeBoard) {
    return (
      <LiveBoard
        boardId={activeBoard.id}
        userId={studentId}
        isTeacher={false}
        onClose={() => {
          setActiveBoard(null);
          loadBoards();
        }}
        isDark={isDark}
      />
    );
  }

  const liveBoards = boards.filter(b => b.is_live);
  const recentBoards = boards.filter(b => !b.is_live);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Live Boards
        </h2>
        <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          Join interactive whiteboard sessions with your teacher
        </p>
      </div>

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
            No boards available yet. Your teacher will invite you to a session.
          </p>
        </div>
      ) : (
        <>
          {/* Live sessions */}
          {liveBoards.length > 0 && (
            <div>
              <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Live Now
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {liveBoards.map(board => (
                  <div
                    key={board.id}
                    className={`relative rounded-2xl p-5 border-2 border-red-500/50 ${
                      isDark ? 'bg-red-500/10' : 'bg-red-50'
                    }`}
                  >
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500 text-white text-xs">
                      <Radio size={12} className="animate-pulse" />
                      LIVE
                    </div>

                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
                      }`}>
                        <Presentation size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {board.title}
                        </h4>
                        <p className={`text-sm flex items-center gap-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                          <User size={14} />
                          {board.teacherName}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveBoard(board)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                    >
                      <Play size={18} />
                      Join Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent boards */}
          {recentBoards.length > 0 && (
            <div>
              <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Recent Boards
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentBoards.map(board => (
                  <div
                    key={board.id}
                    className={`rounded-2xl p-5 border transition-all ${
                      isDark
                        ? 'bg-white/[0.03] border-white/[0.08] hover:border-white/20'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                      }`}>
                        <Presentation size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {board.title}
                        </h4>
                        <p className={`text-sm flex items-center gap-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                          <User size={14} />
                          {board.teacherName}
                        </p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 text-sm mb-3 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                      <Clock size={14} />
                      {new Date(board.created_at).toLocaleDateString()}
                    </div>

                    <button
                      onClick={() => setActiveBoard(board)}
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl font-medium transition-colors ${
                        isDark
                          ? 'bg-white/5 hover:bg-white/10 text-white/80'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <Play size={16} />
                      Open Board
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
