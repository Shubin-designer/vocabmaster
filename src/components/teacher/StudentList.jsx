import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import StudentCard from './StudentCard';
import { Users, Loader, Filter, UserPlus } from 'lucide-react';

/**
 * StudentList component - displays teacher's students
 */
export default function StudentList({ teacherId, onInvite, isDark = true }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'invited' | 'archived'

  const loadStudents = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('teacher_students')
        .select(`
          id,
          status,
          invited_at,
          accepted_at,
          student:student_id (
            id,
            email
          )
        `)
        .eq('teacher_id', teacherId)
        .order('invited_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        setStudents([]);
      } else {
        // Fetch profiles separately to avoid complex join issues
        const studentIds = data.map(s => s.student?.id).filter(Boolean);

        if (studentIds.length > 0) {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id, display_name, level, xp')
            .in('id', studentIds);

          const profileMap = {};
          profiles?.forEach(p => {
            profileMap[p.id] = p;
          });

          const enrichedData = data.map(s => ({
            ...s,
            student_profile: s.student?.id ? profileMap[s.student.id] : null
          }));

          setStudents(enrichedData);
        } else {
          setStudents(data);
        }
      }
    } catch (err) {
      setError(err.message);
      setStudents([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, [teacherId, filterStatus]);

  const handleArchive = async (student) => {
    const { error } = await supabase
      .from('teacher_students')
      .update({ status: 'archived' })
      .eq('id', student.id);

    if (!error) {
      loadStudents();
    }
  };

  const handleViewProgress = (student) => {
    // TODO: Navigate to student progress view
    console.log('View progress for:', student);
  };

  // Count by status
  const statusCounts = students.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  const filteredStudents = filterStatus === 'all'
    ? students
    : students.filter(s => s.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            isDark ? 'bg-pink-vibrant/20' : 'bg-indigo-100'
          }`}>
            <Users size={24} className="text-pink-vibrant" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              My Students
            </h2>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              {students.length} student{students.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>

        <button
          onClick={onInvite}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all shadow-lg shadow-pink-vibrant/20"
        >
          <UserPlus size={18} />
          Invite Student
        </button>
      </div>

      {/* Filter tabs */}
      <div className={`flex gap-2 p-1 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-100'}`}>
        {[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'invited', label: 'Invited' },
          { key: 'archived', label: 'Archived' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              filterStatus === tab.key
                ? 'bg-pink-vibrant text-white shadow-lg'
                : isDark
                  ? 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            {tab.label}
            {statusCounts[tab.key] > 0 && tab.key !== 'all' && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                filterStatus === tab.key
                  ? 'bg-white/20'
                  : isDark ? 'bg-white/10' : 'bg-gray-200'
              }`}>
                {statusCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className={`p-4 rounded-xl ${
          isDark ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader size={32} className={`animate-spin ${isDark ? 'text-pink-vibrant' : 'text-indigo-500'}`} />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredStudents.length === 0 && (
        <div className={`text-center py-16 rounded-2xl ${
          isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-gray-200'
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isDark ? 'bg-white/[0.05]' : 'bg-gray-100'
          }`}>
            <Users size={28} className={isDark ? 'text-white/30' : 'text-gray-400'} />
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {filterStatus === 'all' ? 'No students yet' : `No ${filterStatus} students`}
          </h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            {filterStatus === 'all'
              ? 'Invite your first student to get started!'
              : 'Try changing the filter to see other students.'
            }
          </p>
          {filterStatus === 'all' && (
            <button
              onClick={onInvite}
              className="inline-flex items-center gap-2 px-5 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
            >
              <UserPlus size={18} />
              Invite Student
            </button>
          )}
        </div>
      )}

      {/* Student grid */}
      {!loading && filteredStudents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map(student => (
            <StudentCard
              key={student.id}
              student={student}
              onArchive={handleArchive}
              onViewProgress={handleViewProgress}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </div>
  );
}
