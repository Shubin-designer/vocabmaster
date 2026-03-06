import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
  BarChart3, TrendingUp, Users, Download, Calendar,
  BookOpen, ClipboardCheck, Languages, FileText, ChevronDown
} from 'lucide-react';
import Recommendations from './Recommendations';

export default function Analytics({ teacherId, isDark = true }) {
  const [students, setStudents] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [materialProgress, setMaterialProgress] = useState([]);
  const [vocabProgress, setVocabProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  const [selectedStudent, setSelectedStudent] = useState('all');

  useEffect(() => {
    if (teacherId) {
      loadAnalytics();
    }
  }, [teacherId, dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange));

    // Load students
    const { data: studentsData } = await supabase
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', teacherId)
      .eq('status', 'active');

    const studentIds = studentsData?.map(s => s.student_id) || [];

    // Load student profiles separately
    let studentsList = [];
    if (studentIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', studentIds);

      studentsList = studentIds.map(id => ({
        id,
        name: profilesData?.find(p => p.user_id === id)?.display_name || 'Student'
      }));
    }
    setStudents(studentsList);

    if (studentIds.length === 0) {
      setLoading(false);
      return;
    }

    // Load test results
    const { data: testsData } = await supabase
      .from('test_results')
      .select('*, tests(title)')
      .in('student_id', studentIds)
      .gte('completed_at', startDate.toISOString())
      .order('completed_at', { ascending: true });

    setTestResults(testsData || []);

    // Load material progress
    const { data: materialsData } = await supabase
      .from('material_progress')
      .select('*, learning_materials(title)')
      .in('student_id', studentIds)
      .gte('viewed_at', startDate.toISOString());

    setMaterialProgress(materialsData || []);

    // Load vocab progress
    const { data: vocabData } = await supabase
      .from('vocabulary_assignment_progress')
      .select(`
        *,
        vocabulary_assignments!inner(student_id, vocabulary_sets(title))
      `)
      .gte('updated_at', startDate.toISOString());

    // Filter by our students
    const filteredVocab = vocabData?.filter(v =>
      studentIds.includes(v.vocabulary_assignments?.student_id)
    ) || [];
    setVocabProgress(filteredVocab);

    setLoading(false);
  };

  // Calculate statistics
  const getStats = () => {
    const filteredTests = selectedStudent === 'all'
      ? testResults
      : testResults.filter(t => t.student_id === selectedStudent);

    const filteredMaterials = selectedStudent === 'all'
      ? materialProgress
      : materialProgress.filter(m => m.student_id === selectedStudent);

    const avgScore = filteredTests.length > 0
      ? Math.round(filteredTests.reduce((sum, t) => sum + Number(t.percentage), 0) / filteredTests.length)
      : 0;

    const testsPerStudent = students.length > 0
      ? (filteredTests.length / students.length).toFixed(1)
      : 0;

    return {
      totalTests: filteredTests.length,
      avgScore,
      testsPerStudent,
      materialsViewed: filteredMaterials.length,
      activeStudents: new Set(filteredTests.map(t => t.student_id)).size,
    };
  };

  // Group test results by date for chart
  const getTestsByDate = () => {
    const byDate = {};
    const filteredTests = selectedStudent === 'all'
      ? testResults
      : testResults.filter(t => t.student_id === selectedStudent);

    filteredTests.forEach(test => {
      const date = new Date(test.completed_at).toLocaleDateString();
      if (!byDate[date]) {
        byDate[date] = { count: 0, totalScore: 0 };
      }
      byDate[date].count++;
      byDate[date].totalScore += Number(test.percentage);
    });

    return Object.entries(byDate).map(([date, data]) => ({
      date,
      count: data.count,
      avgScore: Math.round(data.totalScore / data.count)
    }));
  };

  // Get score distribution
  const getScoreDistribution = () => {
    const ranges = [
      { label: '0-49%', min: 0, max: 49, count: 0 },
      { label: '50-69%', min: 50, max: 69, count: 0 },
      { label: '70-84%', min: 70, max: 84, count: 0 },
      { label: '85-100%', min: 85, max: 100, count: 0 },
    ];

    const filteredTests = selectedStudent === 'all'
      ? testResults
      : testResults.filter(t => t.student_id === selectedStudent);

    filteredTests.forEach(test => {
      const score = Number(test.percentage);
      const range = ranges.find(r => score >= r.min && score <= r.max);
      if (range) range.count++;
    });

    return ranges;
  };

  // Get top students
  const getTopStudents = () => {
    const studentScores = {};

    testResults.forEach(test => {
      if (!studentScores[test.student_id]) {
        studentScores[test.student_id] = { total: 0, count: 0 };
      }
      studentScores[test.student_id].total += Number(test.percentage);
      studentScores[test.student_id].count++;
    });

    return Object.entries(studentScores)
      .map(([id, data]) => ({
        id,
        name: students.find(s => s.id === id)?.name || 'Student',
        avgScore: Math.round(data.total / data.count),
        testsCompleted: data.count
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Student', 'Test', 'Score', 'Date'];
    const rows = testResults.map(t => [
      students.find(s => s.id === t.student_id)?.name || 'Unknown',
      t.tests?.title || 'Unknown Test',
      `${t.percentage}%`,
      new Date(t.completed_at).toLocaleDateString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = getStats();
  const testsByDate = getTestsByDate();
  const scoreDistribution = getScoreDistribution();
  const topStudents = getTopStudents();
  const maxBarHeight = 120;
  const maxCount = Math.max(...testsByDate.map(d => d.count), 1);
  const maxDistribution = Math.max(...scoreDistribution.map(d => d.count), 1);

  if (loading) {
    return (
      <div className={`text-center py-16 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Analytics & Reports
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Track student progress and performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date range */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className={`appearance-none pl-10 pr-8 py-2 rounded-xl border ${
                isDark
                  ? 'bg-white/[0.03] border-white/10 text-white'
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <Calendar size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
            <ChevronDown size={16} className={`absolute right-2 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
          </div>

          {/* Student filter */}
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className={`px-4 py-2 rounded-xl border ${
              isDark
                ? 'bg-white/[0.03] border-white/10 text-white'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <option value="all">All Students</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Export button */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
              <ClipboardCheck size={20} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.totalTests}</div>
          <div className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Tests Completed</div>
        </div>

        <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.avgScore}%</div>
          <div className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Average Score</div>
        </div>

        <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
              <FileText size={20} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.materialsViewed}</div>
          <div className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Materials Viewed</div>
        </div>

        <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <Users size={20} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.activeStudents}</div>
          <div className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Active Students</div>
        </div>

        <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600'}`}>
              <BarChart3 size={20} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.testsPerStudent}</div>
          <div className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Tests/Student</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tests over time chart */}
        <div className={`rounded-2xl p-6 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Tests Completed Over Time
          </h3>
          {testsByDate.length === 0 ? (
            <div className={`text-center py-8 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              No data for selected period
            </div>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {testsByDate.slice(-14).map((day, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-pink-vibrant rounded-t transition-all"
                    style={{ height: `${(day.count / maxCount) * maxBarHeight}px` }}
                    title={`${day.date}: ${day.count} tests, avg ${day.avgScore}%`}
                  />
                  <span className={`text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                    {day.date.split('/')[1]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Score distribution */}
        <div className={`rounded-2xl p-6 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Score Distribution
          </h3>
          <div className="flex items-end gap-4 h-32">
            {scoreDistribution.map((range, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className={`w-full rounded-t transition-all ${
                    idx === 0 ? 'bg-red-500' :
                    idx === 1 ? 'bg-yellow-500' :
                    idx === 2 ? 'bg-blue-500' : 'bg-green-500'
                  }`}
                  style={{ height: `${maxDistribution > 0 ? (range.count / maxDistribution) * maxBarHeight : 0}px` }}
                />
                <div className="text-center">
                  <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {range.count}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                    {range.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top students */}
      <div className={`rounded-2xl p-6 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Top Performing Students
        </h3>
        {topStudents.length === 0 ? (
          <div className={`text-center py-8 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            No test data available
          </div>
        ) : (
          <div className="space-y-3">
            {topStudents.map((student, idx) => (
              <div
                key={student.id}
                className={`flex items-center gap-4 p-3 rounded-xl ${
                  isDark ? 'bg-white/[0.02]' : 'bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  idx === 0 ? 'bg-yellow-500 text-yellow-900' :
                  idx === 1 ? 'bg-gray-300 text-gray-700' :
                  idx === 2 ? 'bg-orange-400 text-orange-900' :
                  isDark ? 'bg-white/10 text-white/60' : 'bg-gray-200 text-gray-600'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {student.name}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    {student.testsCompleted} tests completed
                  </div>
                </div>
                <div className={`text-xl font-bold ${
                  student.avgScore >= 85 ? 'text-green-500' :
                  student.avgScore >= 70 ? 'text-blue-500' :
                  student.avgScore >= 50 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {student.avgScore}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent test results */}
      <div className={`rounded-2xl p-6 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
        <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Recent Test Results
        </h3>
        {testResults.length === 0 ? (
          <div className={`text-center py-8 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            No test results yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                  <th className={`text-left py-2 px-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Student</th>
                  <th className={`text-left py-2 px-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Test</th>
                  <th className={`text-left py-2 px-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Score</th>
                  <th className={`text-left py-2 px-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Date</th>
                </tr>
              </thead>
              <tbody>
                {testResults.slice(-10).reverse().map(result => (
                  <tr key={result.id} className={`border-b last:border-0 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    <td className={`py-3 px-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {students.find(s => s.id === result.student_id)?.name || 'Unknown'}
                    </td>
                    <td className={`py-3 px-3 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                      {result.tests?.title || 'Unknown Test'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        Number(result.percentage) >= 85 ? 'bg-green-500/20 text-green-500' :
                        Number(result.percentage) >= 70 ? 'bg-blue-500/20 text-blue-500' :
                        Number(result.percentage) >= 50 ? 'bg-yellow-500/20 text-yellow-500' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {result.percentage}%
                      </span>
                    </td>
                    <td className={`py-3 px-3 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      {new Date(result.completed_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recommendations section */}
      <Recommendations teacherId={teacherId} isDark={isDark} />
    </div>
  );
}
