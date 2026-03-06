import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Plus, Edit2, Trash2, Search, Calendar, Clock,
  Users, ChevronDown, ChevronUp, X, Check, FileText,
  AlertCircle, CheckCircle, Eye
} from 'lucide-react';

export default function HomeworkList({ teacherId, isDark = true }) {
  const [homework, setHomework] = useState([]);
  const [topics, setTopics] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSubmissions, setShowSubmissions] = useState(null);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    due_date: '',
    max_score: 100,
    topic_id: '',
    allow_late_submission: false,
    assign_to_all: true,
    selected_students: []
  });

  useEffect(() => {
    if (teacherId) {
      fetchHomework();
      fetchTopics();
      fetchStudents();
    }
  }, [teacherId]);

  const fetchHomework = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('homework')
      .select(`
        *,
        topics(name),
        homework_assignments(student_id),
        homework_submissions(id, student_id, status)
      `)
      .eq('teacher_id', teacherId)
      .order('due_date', { ascending: false });

    if (!error && data) {
      setHomework(data);
    }
    setLoading(false);
  };

  const fetchTopics = async () => {
    const { data } = await supabase
      .from('topics')
      .select('id, name')
      .eq('teacher_id', teacherId);
    if (data) setTopics(data);
  };

  const fetchStudents = async () => {
    const { data: tsData } = await supabase
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', teacherId)
      .eq('status', 'active');

    if (tsData && tsData.length > 0) {
      const ids = tsData.map(t => t.student_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', ids);
      setStudents(profiles || []);
    }
  };

  const fetchSubmissions = async (homeworkId) => {
    const { data } = await supabase
      .from('homework_submissions')
      .select(`
        *,
        homework_feedback(score, feedback, graded_at)
      `)
      .eq('homework_id', homeworkId);

    if (data) {
      // Add student names
      const enriched = data.map(s => ({
        ...s,
        student_name: students.find(st => st.user_id === s.student_id)?.display_name || 'Student'
      }));
      setSubmissions(enriched);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      teacher_id: teacherId,
      title: formData.title,
      description: formData.description || null,
      instructions: formData.instructions || null,
      due_date: formData.due_date,
      max_score: formData.max_score,
      topic_id: formData.topic_id || null,
      allow_late_submission: formData.allow_late_submission
    };

    let homeworkId;
    if (selectedHomework) {
      const { error } = await supabase
        .from('homework')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', selectedHomework.id);
      if (error) return;
      homeworkId = selectedHomework.id;
    } else {
      const { data, error } = await supabase
        .from('homework')
        .insert(payload)
        .select('id')
        .single();
      if (error || !data) return;
      homeworkId = data.id;

      // Create assignments
      if (formData.assign_to_all) {
        await supabase
          .from('homework_assignments')
          .insert({ homework_id: homeworkId, student_id: null });
      } else {
        const assignments = formData.selected_students.map(studentId => ({
          homework_id: homeworkId,
          student_id: studentId
        }));
        if (assignments.length > 0) {
          await supabase.from('homework_assignments').insert(assignments);
        }
      }
    }

    setShowModal(false);
    resetForm();
    fetchHomework();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this homework?')) return;
    await supabase.from('homework').delete().eq('id', id);
    fetchHomework();
  };

  const openEdit = (hw) => {
    setSelectedHomework(hw);
    setFormData({
      title: hw.title,
      description: hw.description || '',
      instructions: hw.instructions || '',
      due_date: hw.due_date ? new Date(hw.due_date).toISOString().slice(0, 16) : '',
      max_score: hw.max_score || 100,
      topic_id: hw.topic_id || '',
      allow_late_submission: hw.allow_late_submission || false,
      assign_to_all: true,
      selected_students: []
    });
    setShowModal(true);
  };

  const openSubmissions = async (hw) => {
    setSelectedHomework(hw);
    await fetchSubmissions(hw.id);
    setShowSubmissions(hw.id);
  };

  const resetForm = () => {
    setSelectedHomework(null);
    setFormData({
      title: '',
      description: '',
      instructions: '',
      due_date: '',
      max_score: 100,
      topic_id: '',
      allow_late_submission: false,
      assign_to_all: true,
      selected_students: []
    });
  };

  const filteredHomework = homework.filter(hw =>
    hw.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusCounts = (hw) => {
    const total = students.length;
    const submitted = hw.homework_submissions?.length || 0;
    const graded = hw.homework_submissions?.filter(s => s.status === 'graded').length || 0;
    return { total, submitted, graded };
  };

  const isPastDue = (date) => new Date(date) < new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Homework
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Create and manage homework assignments
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
        >
          <Plus size={18} />
          Create Homework
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search homework..."
          className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
            isDark
              ? 'bg-white/[0.03] border-white/10 text-white placeholder-white/40'
              : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
          } focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50`}
        />
      </div>

      {/* Homework list */}
      {loading ? (
        <div className={`text-center py-12 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          Loading...
        </div>
      ) : filteredHomework.length === 0 ? (
        <div className={`text-center py-12 rounded-2xl ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
          <FileText size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
          <p className={isDark ? 'text-white/50' : 'text-gray-500'}>
            {searchQuery ? 'No homework found' : 'No homework yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHomework.map(hw => {
            const status = getStatusCounts(hw);
            const pastDue = isPastDue(hw.due_date);

            return (
              <div
                key={hw.id}
                className={`rounded-2xl border p-5 ${
                  isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {hw.title}
                      </h3>
                      {pastDue ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                          Past due
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                          Active
                        </span>
                      )}
                      {hw.topics?.name && (
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {hw.topics.name}
                        </span>
                      )}
                    </div>

                    {hw.description && (
                      <p className={`text-sm mb-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                        {hw.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      <span className={`flex items-center gap-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        <Calendar size={14} />
                        Due: {new Date(hw.due_date).toLocaleDateString()}
                      </span>
                      <span className={`flex items-center gap-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        <Users size={14} />
                        {status.submitted}/{status.total} submitted
                      </span>
                      <span className={`flex items-center gap-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        <CheckCircle size={14} />
                        {status.graded} graded
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openSubmissions(hw)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isDark
                          ? 'bg-white/[0.05] text-white/80 hover:bg-white/[0.1]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Eye size={16} />
                      View ({status.submitted})
                    </button>
                    <button
                      onClick={() => openEdit(hw)}
                      className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/[0.05] text-white/60' : 'hover:bg-gray-100 text-gray-600'}`}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(hw.id)}
                      className={`p-2 rounded-lg ${isDark ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl ${
            isDark ? 'bg-[#1a1a1e]' : 'bg-white'
          }`}>
            <div className={`sticky top-0 flex items-center justify-between p-4 border-b ${
              isDark ? 'bg-[#1a1a1e] border-white/10' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {selectedHomework ? 'Edit Homework' : 'Create Homework'}
              </h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100'}`}
              >
                <X size={20} className={isDark ? 'text-white/60' : 'text-gray-500'} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    isDark
                      ? 'bg-white/[0.03] border-white/10 text-white'
                      : 'bg-white border-gray-200 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    isDark
                      ? 'bg-white/[0.03] border-white/10 text-white'
                      : 'bg-white border-gray-200 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Instructions
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={3}
                  placeholder="Detailed instructions for students..."
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    isDark
                      ? 'bg-white/[0.03] border-white/10 text-white placeholder-white/30'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                    Due Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                    className={`w-full px-4 py-2.5 rounded-xl border ${
                      isDark
                        ? 'bg-white/[0.03] border-white/10 text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                    Max Score
                  </label>
                  <input
                    type="number"
                    value={formData.max_score}
                    onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) })}
                    min={1}
                    className={`w-full px-4 py-2.5 rounded-xl border ${
                      isDark
                        ? 'bg-white/[0.03] border-white/10 text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  Topic
                </label>
                <select
                  value={formData.topic_id}
                  onChange={(e) => setFormData({ ...formData, topic_id: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    isDark
                      ? 'bg-white/[0.03] border-white/10 text-white'
                      : 'bg-white border-gray-200 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-pink-vibrant/50`}
                >
                  <option value="">None</option>
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <label className={`flex items-center gap-3 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                <input
                  type="checkbox"
                  checked={formData.allow_late_submission}
                  onChange={(e) => setFormData({ ...formData, allow_late_submission: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Allow late submissions</span>
              </label>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className={`px-4 py-2 rounded-xl font-medium ${
                    isDark ? 'bg-white/[0.05] text-white hover:bg-white/[0.1]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110"
                >
                  {selectedHomework ? 'Save Changes' : 'Create Homework'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {showSubmissions && (
        <SubmissionsModal
          homework={selectedHomework}
          submissions={submissions}
          students={students}
          onClose={() => { setShowSubmissions(null); setSelectedHomework(null); }}
          onGrade={() => fetchSubmissions(selectedHomework.id)}
          isDark={isDark}
        />
      )}
    </div>
  );
}

// Submissions Modal Component
function SubmissionsModal({ homework, submissions, students, onClose, onGrade, isDark }) {
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleGrade = async () => {
    if (!gradingSubmission || score === '') return;

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('homework_feedback').upsert({
      submission_id: gradingSubmission.id,
      teacher_id: user.id,
      score: parseInt(score),
      feedback: feedback || null
    }, { onConflict: 'submission_id' });

    setGradingSubmission(null);
    setScore('');
    setFeedback('');
    onGrade();
  };

  // Students who haven't submitted
  const submittedIds = submissions.map(s => s.student_id);
  const notSubmitted = students.filter(s => !submittedIds.includes(s.user_id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl ${
        isDark ? 'bg-[#1a1a1e]' : 'bg-white'
      }`}>
        <div className={`sticky top-0 flex items-center justify-between p-4 border-b ${
          isDark ? 'bg-[#1a1a1e] border-white/10' : 'bg-white border-gray-200'
        }`}>
          <div>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Submissions: {homework?.title}
            </h3>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              {submissions.length} submitted, {notSubmitted.length} pending
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100'}`}
          >
            <X size={20} className={isDark ? 'text-white/60' : 'text-gray-500'} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Submitted */}
          {submissions.length > 0 && (
            <div>
              <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Submitted ({submissions.length})
              </h4>
              <div className="space-y-3">
                {submissions.map(sub => (
                  <div
                    key={sub.id}
                    className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {sub.student_name}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                          Submitted: {new Date(sub.submitted_at).toLocaleString()}
                          {sub.is_late && <span className="ml-2 text-red-400">(Late)</span>}
                        </p>
                      </div>
                      {sub.homework_feedback?.[0] ? (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
                          {sub.homework_feedback[0].score}/{homework?.max_score}
                        </span>
                      ) : (
                        <button
                          onClick={() => setGradingSubmission(sub)}
                          className="px-3 py-1 rounded-full text-sm font-medium bg-pink-vibrant text-white hover:brightness-110"
                        >
                          Grade
                        </button>
                      )}
                    </div>
                    {sub.content && (
                      <div className={`mt-2 p-3 rounded-lg text-sm ${
                        isDark ? 'bg-white/[0.02] text-white/80' : 'bg-white text-gray-700'
                      }`}>
                        {sub.content}
                      </div>
                    )}
                    {sub.homework_feedback?.[0]?.feedback && (
                      <div className={`mt-2 p-3 rounded-lg text-sm border-l-2 border-pink-vibrant ${
                        isDark ? 'bg-pink-vibrant/10 text-white/70' : 'bg-pink-50 text-gray-600'
                      }`}>
                        <strong>Feedback:</strong> {sub.homework_feedback[0].feedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not submitted */}
          {notSubmitted.length > 0 && (
            <div>
              <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Not Submitted ({notSubmitted.length})
              </h4>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                <div className="flex flex-wrap gap-2">
                  {notSubmitted.map(s => (
                    <span
                      key={s.user_id}
                      className={`px-3 py-1 rounded-full text-sm ${
                        isDark ? 'bg-white/[0.05] text-white/60' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {s.display_name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Grading form */}
        {gradingSubmission && (
          <div className={`p-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Grade: {gradingSubmission.student_name}
            </h4>
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="number"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder={`Score (max ${homework?.max_score})`}
                  min={0}
                  max={homework?.max_score}
                  className={`w-full px-4 py-2 rounded-xl border ${
                    isDark
                      ? 'bg-white/[0.03] border-white/10 text-white'
                      : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
              <div className="flex-[2]">
                <input
                  type="text"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Feedback (optional)"
                  className={`w-full px-4 py-2 rounded-xl border ${
                    isDark
                      ? 'bg-white/[0.03] border-white/10 text-white'
                      : 'bg-white border-gray-200 text-gray-900'
                  }`}
                />
              </div>
              <button
                onClick={handleGrade}
                disabled={score === ''}
                className="px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50"
              >
                <Check size={18} />
              </button>
              <button
                onClick={() => { setGradingSubmission(null); setScore(''); setFeedback(''); }}
                className={`px-4 py-2 rounded-xl ${
                  isDark ? 'bg-white/[0.05] text-white/60' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
