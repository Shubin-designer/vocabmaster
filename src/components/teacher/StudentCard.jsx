import { User, Mail, Calendar, TrendingUp, MoreVertical, Archive, Eye } from 'lucide-react';

/**
 * Get color classes for CEFR level
 */
const getLevelColor = (level, isDark = true) => {
  const colors = isDark ? {
    A1: 'bg-green-500/20 text-green-400',
    A2: 'bg-green-500/25 text-green-400',
    B1: 'bg-yellow-500/20 text-yellow-400',
    B2: 'bg-yellow-500/25 text-yellow-400',
    C1: 'bg-red-500/20 text-red-400',
    C2: 'bg-red-500/25 text-red-400'
  } : {
    A1: 'bg-green-200 text-green-800',
    A2: 'bg-green-200 text-green-800',
    B1: 'bg-yellow-200 text-yellow-800',
    B2: 'bg-yellow-200 text-yellow-800',
    C1: 'bg-red-200 text-red-800',
    C2: 'bg-red-200 text-red-800'
  };
  return colors[level] || (isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-200 text-gray-700');
};

/**
 * Get color classes for invitation status
 */
const getStatusColor = (status, isDark = true) => {
  if (status === 'active') {
    return isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800';
  }
  if (status === 'invited') {
    return isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-800';
  }
  return isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-800';
};

/**
 * StudentCard component - displays individual student information
 */
export default function StudentCard({ student, onArchive, onViewProgress, isDark = true }) {
  const profile = student.student_profile || {};
  const email = student.student?.email || 'Unknown';
  const displayName = profile.display_name || email.split('@')[0];
  const level = profile.level || 'A1';
  const xp = profile.xp || 0;
  const status = student.status || 'invited';
  const joinedDate = student.accepted_at || student.invited_at;

  return (
    <div className={`rounded-2xl p-5 transition-all hover:scale-[1.01] ${
      isDark
        ? 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05]'
        : 'bg-white border border-gray-200 hover:shadow-md'
    }`}>
      {/* Header with avatar and status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${
            isDark ? 'bg-pink-vibrant/20 text-pink-vibrant' : 'bg-indigo-100 text-indigo-600'
          }`}>
            {displayName.charAt(0).toUpperCase()}
          </div>

          {/* Name and email */}
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {displayName}
            </h3>
            <div className={`text-sm flex items-center gap-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              <Mail size={12} />
              {email}
            </div>
          </div>
        </div>

        {/* Status badge */}
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(status, isDark)}`}>
          {status}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Level */}
        <div className={`rounded-xl p-3 text-center ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(level, isDark)}`}>
            {level}
          </span>
          <div className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Level</div>
        </div>

        {/* XP */}
        <div className={`rounded-xl p-3 text-center ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
          <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{xp}</div>
          <div className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>XP</div>
        </div>

        {/* Joined */}
        <div className={`rounded-xl p-3 text-center ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
          <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {joinedDate ? new Date(joinedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—'}
          </div>
          <div className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Joined</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onViewProgress && (
          <button
            onClick={() => onViewProgress(student)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
              isDark
                ? 'bg-pink-vibrant/10 text-pink-vibrant hover:bg-pink-vibrant/20'
                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }`}
          >
            <TrendingUp size={16} />
            View Progress
          </button>
        )}

        {onArchive && status === 'active' && (
          <button
            onClick={() => onArchive(student)}
            className={`px-3 py-2.5 rounded-xl transition-colors ${
              isDark
                ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1] hover:text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Archive student"
          >
            <Archive size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
