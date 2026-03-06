import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
  FileText, Calendar, Clock, CheckCircle, AlertCircle,
  Send, ChevronRight, Award, X
} from 'lucide-react';

export default function StudentHomework({ studentId, isDark = true }) {
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (studentId) {
      loadHomework();
    }
  }, [studentId]);

  const loadHomework = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .rpc('get_student_homework', { p_student_id: studentId });

    if (!error && data) {
      setHomework(data);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!selectedHomework || !submissionContent.trim()) return;

    setSubmitting(true);
    const isLate = new Date() > new Date(selectedHomework.due_date);

    const { error } = await supabase
      .from('homework_submissions')
      .upsert({
        homework_id: selectedHomework.homework_id,
        student_id: studentId,
        content: submissionContent,
        is_late: isLate,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      }, { onConflict: 'homework_id,student_id' });

    if (!error) {
      setSelectedHomework(null);
      setSubmissionContent('');
      loadHomework();
    }
    setSubmitting(false);
  };

  const getStatusBadge = (hw) => {
    if (hw.submission_status === 'graded') {
      return (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
          <Award size={12} />
          Graded: {hw.score}/{hw.max_score}
        </span>
      );
    }
    if (hw.submission_status === 'submitted') {
      return (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">
          <CheckCircle size={12} />
          Submitted
        </span>
      );
    }
    if (hw.is_late) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
          <AlertCircle size={12} />
          Overdue
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
        <Clock size={12} />
        Pending
      </span>
    );
  };

  const getDaysUntilDue = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `${days} days left`;
  };

  if (loading) {
    return (
      <div className={`text-center py-16 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
        Loading homework...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {homework.filter(h => h.submission_status === 'pending' && !h.is_late).length}
          </div>
          <div className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Pending
          </div>
        </div>
        <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
          <div className={`text-2xl font-bold text-green-500`}>
            {homework.filter(h => h.submission_status === 'graded').length}
          </div>
          <div className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Graded
          </div>
        </div>
        <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
          <div className={`text-2xl font-bold text-pink-vibrant`}>
            {homework.filter(h => h.submission_status === 'graded' && h.score !== null).length > 0
              ? Math.round(
                  homework
                    .filter(h => h.submission_status === 'graded' && h.score !== null)
                    .reduce((sum, h) => sum + (h.score / h.max_score) * 100, 0) /
                  homework.filter(h => h.submission_status === 'graded' && h.score !== null).length
                )
              : 0}%
          </div>
          <div className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Avg. Score
          </div>
        </div>
      </div>

      {/* Homework list */}
      {homework.length === 0 ? (
        <div className={`text-center py-12 rounded-2xl ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
          <FileText size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
          <p className={isDark ? 'text-white/50' : 'text-gray-500'}>
            No homework assigned yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {homework.map(hw => (
            <div
              key={hw.homework_id}
              className={`rounded-2xl border p-5 transition-all ${
                isDark
                  ? 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]'
                  : 'bg-white border-gray-200 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {hw.title}
                    </h3>
                    {getStatusBadge(hw)}
                  </div>

                  {hw.description && (
                    <p className={`text-sm mb-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                      {hw.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <span className={`flex items-center gap-1 ${
                      hw.is_late && hw.submission_status === 'pending'
                        ? 'text-red-400'
                        : isDark ? 'text-white/50' : 'text-gray-500'
                    }`}>
                      <Calendar size={14} />
                      {new Date(hw.due_date).toLocaleDateString()}
                    </span>
                    <span className={`${
                      hw.is_late && hw.submission_status === 'pending'
                        ? 'text-red-400'
                        : isDark ? 'text-white/40' : 'text-gray-400'
                    }`}>
                      {getDaysUntilDue(hw.due_date)}
                    </span>
                  </div>

                  {/* Feedback */}
                  {hw.feedback && (
                    <div className={`mt-3 p-3 rounded-xl border-l-2 border-pink-vibrant ${
                      isDark ? 'bg-pink-vibrant/10' : 'bg-pink-50'
                    }`}>
                      <p className={`text-sm ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                        <strong>Feedback:</strong> {hw.feedback}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action */}
                <div>
                  {hw.submission_status === 'pending' && (
                    <button
                      onClick={() => setSelectedHomework(hw)}
                      className="flex items-center gap-2 px-4 py-2 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
                    >
                      <Send size={16} />
                      Submit
                    </button>
                  )}
                  {hw.submission_status === 'submitted' && (
                    <button
                      onClick={() => setSelectedHomework(hw)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium ${
                        isDark
                          ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Edit
                      <ChevronRight size={16} />
                    </button>
                  )}
                  {hw.submission_status === 'graded' && (
                    <button
                      onClick={() => setSelectedHomework(hw)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium ${
                        isDark
                          ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      View
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submission Modal */}
      {selectedHomework && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl ${
            isDark ? 'bg-[#1a1a1e]' : 'bg-white'
          }`}>
            <div className={`sticky top-0 flex items-center justify-between p-4 border-b ${
              isDark ? 'bg-[#1a1a1e] border-white/10' : 'bg-white border-gray-200'
            }`}>
              <div>
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {selectedHomework.title}
                </h3>
                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  Due: {new Date(selectedHomework.due_date).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => { setSelectedHomework(null); setSubmissionContent(''); }}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100'}`}
              >
                <X size={20} className={isDark ? 'text-white/60' : 'text-gray-500'} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Instructions */}
              {selectedHomework.instructions && (
                <div className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                  <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                    Instructions
                  </h4>
                  <p className={`text-sm whitespace-pre-wrap ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                    {selectedHomework.instructions}
                  </p>
                </div>
              )}

              {/* Graded feedback */}
              {selectedHomework.submission_status === 'graded' && (
                <div className={`p-4 rounded-xl ${isDark ? 'bg-green-500/10' : 'bg-green-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                      Grade
                    </h4>
                    <span className="text-2xl font-bold text-green-500">
                      {selectedHomework.score}/{selectedHomework.max_score}
                    </span>
                  </div>
                  {selectedHomework.feedback && (
                    <p className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                      {selectedHomework.feedback}
                    </p>
                  )}
                </div>
              )}

              {/* Submission form */}
              {selectedHomework.submission_status !== 'graded' && (
                <>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                      Your Answer
                    </label>
                    <textarea
                      value={submissionContent}
                      onChange={(e) => setSubmissionContent(e.target.value)}
                      rows={8}
                      placeholder="Write your answer here..."
                      className={`w-full px-4 py-3 rounded-xl border resize-none ${
                        isDark
                          ? 'bg-white/[0.03] border-white/10 text-white placeholder-white/30'
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                      } focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50`}
                    />
                  </div>

                  {selectedHomework.is_late && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl ${
                      isDark ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-50 text-yellow-600'
                    }`}>
                      <AlertCircle size={18} />
                      <span className="text-sm">This homework is overdue. Your submission will be marked as late.</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => { setSelectedHomework(null); setSubmissionContent(''); }}
                      className={`px-4 py-2 rounded-xl font-medium ${
                        isDark ? 'bg-white/[0.05] text-white hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!submissionContent.trim() || submitting}
                      className="flex items-center gap-2 px-4 py-2 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 disabled:opacity-50"
                    >
                      <Send size={18} />
                      {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
