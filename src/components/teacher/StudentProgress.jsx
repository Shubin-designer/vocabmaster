import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
  Loader, TrendingUp, CheckCircle, XCircle, Clock,
  FileText, ClipboardList, BookOpen, Calendar, Award,
  ChevronDown, ChevronUp, Eye, BarChart3
} from 'lucide-react';

const getLevelColor = (level, isDark) => {
  const colors = {
    A1: isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700',
    A2: isDark ? 'bg-green-500/25 text-green-400' : 'bg-green-100 text-green-700',
    B1: isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
    B2: isDark ? 'bg-yellow-500/25 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
    C1: isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700',
    C2: isDark ? 'bg-red-500/25 text-red-400' : 'bg-red-100 text-red-700',
  };
  return colors[level] || colors.A1;
};

export default function StudentProgress({ teacherId, isDark = true }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [materialProgress, setMaterialProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedResult, setExpandedResult] = useState(null);
  const [activeTab, setActiveTab] = useState('tests');

  useEffect(() => {
    loadStudents();
  }, [teacherId]);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentDetails(selectedStudent.student_id);
    }
  }, [selectedStudent]);

  const loadStudents = async () => {
    setLoading(true);

    // Get teacher's students
    const { data: studentsData, error } = await supabase
      .from('teacher_students')
      .select('student_id, status, accepted_at')
      .eq('teacher_id', teacherId)
      .eq('status', 'active');

    if (error) {
      console.error('Error loading students:', error);
      setLoading(false);
      return;
    }

    // Get profiles
    const studentIds = studentsData?.map(s => s.student_id) || [];
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, display_name, level, xp')
        .in('id', studentIds);

      // Get test result counts per student
      const { data: resultCounts } = await supabase
        .from('test_results')
        .select('student_id, percentage')
        .in('student_id', studentIds)
        .eq('status', 'completed');

      // Aggregate stats
      const statsMap = {};
      resultCounts?.forEach(r => {
        if (!statsMap[r.student_id]) {
          statsMap[r.student_id] = { count: 0, totalPercentage: 0 };
        }
        statsMap[r.student_id].count++;
        statsMap[r.student_id].totalPercentage += Number(r.percentage);
      });

      const enrichedStudents = studentsData.map(s => {
        const profile = profiles?.find(p => p.id === s.student_id);
        const stats = statsMap[s.student_id] || { count: 0, totalPercentage: 0 };
        return {
          ...s,
          display_name: profile?.display_name || 'Student',
          level: profile?.level || 'A1',
          xp: profile?.xp || 0,
          testsCompleted: stats.count,
          avgScore: stats.count > 0 ? Math.round(stats.totalPercentage / stats.count) : 0,
        };
      });

      setStudents(enrichedStudents);
      if (enrichedStudents.length > 0 && !selectedStudent) {
        setSelectedStudent(enrichedStudents[0]);
      }
    }

    setLoading(false);
  };

  const loadStudentDetails = async (studentId) => {
    setLoadingDetails(true);

    // Load test results
    const { data: results } = await supabase
      .from('test_results')
      .select('*, tests(title, topic_id, topics(name))')
      .eq('student_id', studentId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    setTestResults(results || []);

    // Load material progress
    const { data: progress } = await supabase
      .from('material_progress')
      .select('*, materials(title, level, topic_id, topics(name))')
      .eq('student_id', studentId)
      .order('viewed_at', { ascending: false });

    setMaterialProgress(progress || []);

    setLoadingDetails(false);
  };

  // Calculate stats for selected student
  const stats = {
    testsCompleted: testResults.length,
    avgScore: testResults.length > 0
      ? Math.round(testResults.reduce((sum, r) => sum + Number(r.percentage), 0) / testResults.length)
      : 0,
    materialsViewed: materialProgress.length,
    bestScore: testResults.length > 0
      ? Math.max(...testResults.map(r => Number(r.percentage)))
      : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader size={32} className="animate-spin text-pink-vibrant" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className={`text-center py-16 rounded-2xl ${
        isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-gray-200'
      }`}>
        <TrendingUp size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
        <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          No students yet
        </h3>
        <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          Invite students to see their progress here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student selector */}
      <div className="flex flex-wrap gap-2">
        {students.map(student => (
          <button
            key={student.student_id}
            onClick={() => setSelectedStudent(student)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              selectedStudent?.student_id === student.student_id
                ? 'bg-pink-vibrant text-white'
                : isDark
                  ? 'bg-white/[0.05] text-white/80 hover:bg-white/[0.1] border border-white/[0.08]'
                  : 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              selectedStudent?.student_id === student.student_id
                ? 'bg-white/20 text-white'
                : isDark ? 'bg-pink-vibrant/20 text-pink-vibrant' : 'bg-indigo-100 text-indigo-600'
            }`}>
              {student.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="font-medium">{student.display_name}</div>
              <div className={`text-xs ${selectedStudent?.student_id === student.student_id ? 'text-white/70' : isDark ? 'text-white/50' : 'text-gray-500'}`}>
                {student.testsCompleted} tests • {student.avgScore}% avg
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedStudent && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                  <ClipboardList size={20} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {stats.testsCompleted}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Tests taken</div>
                </div>
              </div>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  stats.avgScore >= 70
                    ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                    : stats.avgScore >= 50
                      ? isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
                      : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
                }`}>
                  <BarChart3 size={20} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {stats.avgScore}%
                  </div>
                  <div className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Avg score</div>
                </div>
              </div>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                  <FileText size={20} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {stats.materialsViewed}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Materials</div>
                </div>
              </div>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-pink-500/20 text-pink-400' : 'bg-pink-100 text-pink-600'}`}>
                  <Award size={20} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {stats.bestScore}%
                  </div>
                  <div className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Best score</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className={`flex gap-2 p-1.5 rounded-2xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-100'}`}>
            {[
              { key: 'tests', label: 'Test Results', count: testResults.length },
              { key: 'materials', label: 'Materials', count: materialProgress.length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-pink-vibrant text-white'
                    : isDark
                      ? 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                }`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  activeTab === tab.key ? 'bg-white/20' : isDark ? 'bg-white/10' : 'bg-gray-200'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Content */}
          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={24} className="animate-spin text-pink-vibrant" />
            </div>
          ) : (
            <>
              {/* Test Results */}
              {activeTab === 'tests' && (
                <div className="space-y-3">
                  {testResults.length === 0 ? (
                    <div className={`text-center py-12 rounded-2xl ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                      <ClipboardList size={40} className={`mx-auto mb-3 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
                      <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        No test results yet
                      </p>
                    </div>
                  ) : (
                    testResults.map(result => {
                      const isExpanded = expandedResult === result.id;
                      const percentage = Number(result.percentage);

                      return (
                        <div
                          key={result.id}
                          className={`rounded-2xl overflow-hidden ${
                            isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'
                          }`}
                        >
                          <div className="p-4 flex items-center gap-4">
                            {/* Score circle */}
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              percentage >= 70
                                ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                                : percentage >= 50
                                  ? isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
                                  : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
                            }`}>
                              <span className="text-xl font-bold">{Math.round(percentage)}%</span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {result.tests?.title || 'Test'}
                              </h4>
                              <div className="flex items-center gap-3 mt-1">
                                <span className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                  {result.score}/{result.total_questions} correct
                                </span>
                                {result.tests?.topics?.name && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {result.tests.topics.name}
                                  </span>
                                )}
                              </div>
                              <div className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                <Calendar size={10} className="inline mr-1" />
                                {new Date(result.completed_at).toLocaleDateString('ru-RU', {
                                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                                {result.time_spent_seconds && (
                                  <span className="ml-3">
                                    <Clock size={10} className="inline mr-1" />
                                    {Math.floor(result.time_spent_seconds / 60)}:{String(result.time_spent_seconds % 60).padStart(2, '0')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Expand */}
                            <button
                              onClick={() => setExpandedResult(isExpanded ? null : result.id)}
                              className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'}`}
                            >
                              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                          </div>

                          {/* Expanded answers */}
                          {isExpanded && result.answers && (
                            <div className={`px-4 pb-4 border-t ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                              <div className="pt-3 space-y-2">
                                {Object.entries(result.answers).map(([qId, answer], idx) => (
                                  <div
                                    key={qId}
                                    className={`flex items-center gap-3 p-2 rounded-lg ${
                                      answer.is_correct
                                        ? isDark ? 'bg-green-500/10' : 'bg-green-50'
                                        : isDark ? 'bg-red-500/10' : 'bg-red-50'
                                    }`}
                                  >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                      answer.is_correct
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-red-500/20 text-red-400'
                                    }`}>
                                      {answer.is_correct ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                                        Q{idx + 1}: {answer.answer || '(no answer)'}
                                      </span>
                                      {!answer.is_correct && (
                                        <span className={`text-xs ml-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                                          → {answer.correct_answer}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Materials */}
              {activeTab === 'materials' && (
                <div className="space-y-3">
                  {materialProgress.length === 0 ? (
                    <div className={`text-center py-12 rounded-2xl ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                      <FileText size={40} className={`mx-auto mb-3 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
                      <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        No materials viewed yet
                      </p>
                    </div>
                  ) : (
                    materialProgress.map(progress => (
                      <div
                        key={progress.id}
                        className={`rounded-2xl p-4 flex items-center gap-4 ${
                          isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'
                        }`}
                      >
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                        }`}>
                          <Eye size={20} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {progress.materials?.title || 'Material'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {progress.materials?.level && (
                              <span className={`text-xs px-2 py-0.5 rounded ${getLevelColor(progress.materials.level, isDark)}`}>
                                {progress.materials.level}
                              </span>
                            )}
                            {progress.materials?.topics?.name && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {progress.materials.topics.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Date */}
                        <div className={`text-right text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                          <Calendar size={12} className="inline mr-1" />
                          {new Date(progress.viewed_at).toLocaleDateString('ru-RU', {
                            day: 'numeric', month: 'short'
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
