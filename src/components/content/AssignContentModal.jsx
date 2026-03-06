import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { X, Check, Loader, Users, User, Calendar } from 'lucide-react';

export default function AssignContentModal({
  teacherId,
  contentType, // 'material' | 'test' | 'reading_text' | 'vocabulary_set'
  contentId,
  contentTitle,
  onClose,
  onSuccess,
  isDark = true,
}) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]); // Empty = all students
  const [assignToAll, setAssignToAll] = useState(true);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isRequired, setIsRequired] = useState(true);

  useEffect(() => {
    loadStudents();
  }, [teacherId]);

  const loadStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', teacherId)
      .eq('status', 'active');

    if (!error && data) {
      // Get profiles for students
      const studentIds = data.map(d => d.student_id);
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, display_name')
          .in('id', studentIds);

        setStudents(profiles || []);
      }
    }
    setLoading(false);
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Handle vocabulary sets differently
    if (contentType === 'vocabulary_set') {
      const targetStudents = assignToAll
        ? students.map(s => s.id)
        : selectedStudents;

      const vocabAssignments = targetStudents.map(studentId => ({
        set_id: contentId,
        student_id: studentId,
        assigned_by: teacherId,
        due_date: dueDate || null,
        notes: notes || null,
      }));

      if (vocabAssignments.length > 0) {
        const { error } = await supabase
          .from('vocabulary_assignments')
          .upsert(vocabAssignments, { onConflict: 'set_id,student_id' });

        if (!error) {
          onSuccess?.();
          onClose();
        }
      }
    } else if (assignToAll) {
      // Create one assignment with student_id = NULL (all students)
      const { error } = await supabase
        .from('content_assignments')
        .insert({
          teacher_id: teacherId,
          student_id: null,
          content_type: contentType,
          content_id: contentId,
          due_date: dueDate || null,
          notes: notes || null,
          is_required: isRequired,
        });

      if (!error) {
        onSuccess?.();
        onClose();
      }
    } else {
      // Create individual assignments for selected students
      const assignments = selectedStudents.map(studentId => ({
        teacher_id: teacherId,
        student_id: studentId,
        content_type: contentType,
        content_id: contentId,
        due_date: dueDate || null,
        notes: notes || null,
        is_required: isRequired,
      }));

      if (assignments.length > 0) {
        const { error } = await supabase
          .from('content_assignments')
          .insert(assignments);

        if (!error) {
          onSuccess?.();
          onClose();
        }
      }
    }

    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className={`relative rounded-3xl p-6 w-full max-w-md ${
          isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-gray-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Assign Content
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content info */}
        <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-white/[0.05]' : 'bg-gray-50'}`}>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            {contentType === 'material' ? 'Material' : contentType === 'test' ? 'Test' : contentType === 'vocabulary_set' ? 'Vocabulary Set' : 'Reading Text'}
          </p>
          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {contentTitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Assign to */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
              Assign to
            </label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setAssignToAll(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                  assignToAll
                    ? 'bg-pink-vibrant text-white'
                    : isDark
                      ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Users size={18} />
                All Students
              </button>
              <button
                type="button"
                onClick={() => setAssignToAll(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                  !assignToAll
                    ? 'bg-pink-vibrant text-white'
                    : isDark
                      ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <User size={18} />
                Select
              </button>
            </div>

            {/* Student selection */}
            {!assignToAll && (
              <div className={`max-h-40 overflow-y-auto rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader size={20} className="animate-spin text-pink-vibrant" />
                  </div>
                ) : students.length === 0 ? (
                  <p className={`text-center py-4 text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                    No active students
                  </p>
                ) : (
                  students.map(student => (
                    <label
                      key={student.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        className="w-4 h-4 rounded border-gray-300 text-pink-vibrant focus:ring-pink-vibrant"
                      />
                      <span className={isDark ? 'text-white' : 'text-gray-900'}>
                        {student.display_name || 'Student'}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Due date */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
              <Calendar size={14} className="inline mr-1.5" />
              Due Date (optional)
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl ${
                isDark
                  ? 'bg-white/[0.05] border border-white/10 text-white'
                  : 'bg-gray-50 border border-gray-200 text-gray-900'
              }`}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
              Notes for Students (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Instructions or notes..."
              rows={2}
              className={`w-full px-4 py-3 rounded-xl resize-none ${
                isDark
                  ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                  : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>

          {/* Required toggle */}
          <label className={`flex items-center gap-3 cursor-pointer ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
            <input
              type="checkbox"
              checked={isRequired}
              onChange={e => setIsRequired(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-pink-vibrant focus:ring-pink-vibrant"
            />
            <span className="text-sm font-medium">Required assignment</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${
                isDark
                  ? 'bg-white/[0.05] text-white/80 hover:bg-white/[0.1]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (!assignToAll && selectedStudents.length === 0)}
              className="flex-1 px-4 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader size={18} className="animate-spin" /> : <Check size={18} />}
              Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
