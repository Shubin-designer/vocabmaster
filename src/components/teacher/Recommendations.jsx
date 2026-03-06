import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
  AlertTriangle, Target, BookOpen, HelpCircle, RefreshCw,
  ChevronDown, Calendar, TrendingDown, Users
} from 'lucide-react';

const QUESTION_TYPE_TIPS = {
  fill_blank: 'Students struggle with context clues. Try providing more example sentences.',
  multiple_choice: 'Review distractor options. They may be too similar or too obviously wrong.',
  true_false: 'Statements may be ambiguous. Ensure clarity in wording.',
  matching: 'Consider grouping related items or reducing the number of options.',
  write: 'Free-form answers need clearer instructions and grading rubrics.'
};

const QUESTION_TYPE_LABELS = {
  fill_blank: 'Fill in the Blank',
  multiple_choice: 'Multiple Choice',
  true_false: 'True/False',
  matching: 'Matching',
  write: 'Written Response'
};

export default function Recommendations({ teacherId, isDark = true }) {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    if (teacherId) {
      loadStudents();
    }
  }, [teacherId]);

  useEffect(() => {
    if (teacherId) {
      loadRecommendations();
    }
  }, [teacherId, selectedStudent, dateRange]);

  const loadStudents = async () => {
    const { data: studentsData } = await supabase
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', teacherId)
      .eq('status', 'active');

    const studentIds = studentsData?.map(s => s.student_id) || [];

    if (studentIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', studentIds);

      const studentsList = studentIds.map(id => ({
        id,
        name: profilesData?.find(p => p.user_id === id)?.display_name || 'Student'
      }));
      setStudents(studentsList);
    }
  };

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_weak_area_recommendations', {
        p_teacher_id: teacherId,
        p_student_id: selectedStudent === 'all' ? null : selectedStudent,
        p_days_back: parseInt(dateRange)
      });

      if (rpcError) throw rpcError;
      setRecommendations(data);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityClasses = (score) => {
    if (score < 50) {
      return isDark
        ? 'bg-red-500/20 text-red-400 border-red-500/30'
        : 'bg-red-100 text-red-700 border-red-200';
    }
    if (score < 70) {
      return isDark
        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        : 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
    return isDark
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : 'bg-green-100 text-green-700 border-green-200';
  };

  const getErrorRateSeverity = (errorRate) => {
    if (errorRate >= 50) {
      return isDark
        ? 'bg-red-500/20 text-red-400'
        : 'bg-red-100 text-red-700';
    }
    if (errorRate >= 30) {
      return isDark
        ? 'bg-yellow-500/20 text-yellow-400'
        : 'bg-yellow-100 text-yellow-700';
    }
    return isDark
      ? 'bg-green-500/20 text-green-400'
      : 'bg-green-100 text-green-700';
  };

  const getTopicRecommendation = (avgScore) => {
    if (avgScore < 50) {
      return 'Critical: Requires immediate attention and additional practice';
    }
    return 'Needs attention: Below target performance';
  };

  if (loading) {
    return (
      <div className={`rounded-2xl p-6 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
        <div className={`flex items-center justify-center py-8 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          <RefreshCw className="animate-spin mr-2" size={20} />
          Loading recommendations...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl p-6 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center justify-center py-8 text-red-500">
          <AlertTriangle className="mr-2" size={20} />
          Error: {error}
        </div>
      </div>
    );
  }

  const weakTopics = recommendations?.weak_topics || [];
  const weakQuestionTypes = recommendations?.weak_question_types || [];
  const strugglingWords = recommendations?.struggling_words || [];
  const summary = recommendations?.summary || {};

  const hasRecommendations = weakTopics.length > 0 || weakQuestionTypes.length > 0 || strugglingWords.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-2xl p-6 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Target className="text-pink-vibrant" size={22} />
              Weak Area Recommendations
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              Identify areas needing improvement based on test results and vocabulary progress
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date range filter */}
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
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
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

            {/* Refresh button */}
            <button
              onClick={loadRecommendations}
              disabled={loading}
              className={`p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'border-white/10 text-white/60 hover:bg-white/5'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} className="text-red-500" />
              <span className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Weak Topics</span>
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {weakTopics.length}
            </div>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle size={16} className="text-yellow-500" />
              <span className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Problem Question Types</span>
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {weakQuestionTypes.filter(q => q.error_rate >= 30).length}
            </div>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className="text-orange-500" />
              <span className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Struggling Words</span>
            </div>
            <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {strugglingWords.length}
            </div>
          </div>
        </div>
      </div>

      {!hasRecommendations ? (
        <div className={`rounded-2xl p-8 text-center ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}>
            <Target size={32} className="text-green-500" />
          </div>
          <h4 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Great Job!
          </h4>
          <p className={isDark ? 'text-white/50' : 'text-gray-500'}>
            No significant weak areas detected in the selected period.
            {summary.student_count === 0 && ' Add students to start tracking progress.'}
          </p>
        </div>
      ) : (
        <>
          {/* Weak Topics Section */}
          {weakTopics.length > 0 && (
            <div className={`rounded-2xl p-6 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
              <h4 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <AlertTriangle size={18} className="text-red-500" />
                Topics Needing Attention
              </h4>
              <div className="grid gap-3">
                {weakTopics.map((topic, idx) => (
                  <div
                    key={topic.topic_id || idx}
                    className={`p-4 rounded-xl border ${getSeverityClasses(topic.avg_score)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {topic.topic_name}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            topic.avg_score < 50 ? 'bg-red-500 text-white' : 'bg-yellow-500 text-yellow-900'
                          }`}>
                            {Math.round(topic.avg_score)}%
                          </span>
                        </div>
                        <p className={`text-sm mt-1 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                          {getTopicRecommendation(topic.avg_score)}
                        </p>
                      </div>
                      <div className={`text-right text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        <div>{topic.test_count} tests</div>
                        <div>Range: {Math.round(topic.min_score)}-{Math.round(topic.max_score)}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question Types Section */}
          {weakQuestionTypes.length > 0 && (
            <div className={`rounded-2xl p-6 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
              <h4 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <HelpCircle size={18} className="text-yellow-500" />
                Question Type Analysis
              </h4>
              <div className="grid md:grid-cols-2 gap-3">
                {weakQuestionTypes.map((qt, idx) => (
                  <div
                    key={qt.question_type || idx}
                    className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {QUESTION_TYPE_LABELS[qt.question_type] || qt.question_type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getErrorRateSeverity(qt.error_rate)}`}>
                        {Math.round(qt.error_rate)}% error rate
                      </span>
                    </div>
                    <div className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      {qt.incorrect_count} errors in {qt.total_questions} questions
                    </div>
                    {QUESTION_TYPE_TIPS[qt.question_type] && qt.error_rate >= 30 && (
                      <p className={`text-sm mt-2 pt-2 border-t ${isDark ? 'border-white/10 text-white/60' : 'border-gray-200 text-gray-600'}`}>
                        <span className="font-medium">Tip:</span> {QUESTION_TYPE_TIPS[qt.question_type]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Struggling Words Section */}
          {strugglingWords.length > 0 && (
            <div className={`rounded-2xl p-6 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
              <h4 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <BookOpen size={18} className="text-orange-500" />
                Vocabulary Requiring Extra Practice
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                      <th className={`text-left py-2 px-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Word</th>
                      <th className={`text-left py-2 px-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Meaning</th>
                      <th className={`text-left py-2 px-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Level</th>
                      <th className={`text-left py-2 px-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Practices</th>
                      <th className={`text-left py-2 px-3 text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strugglingWords.map((word, idx) => (
                      <tr key={word.word_id || idx} className={`border-b last:border-0 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                        <td className={`py-3 px-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {word.word}
                        </td>
                        <td className={`py-3 px-3 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                          {word.meaning_ru}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {word.level || 'N/A'}
                          </span>
                        </td>
                        <td className={`py-3 px-3 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                          {word.practice_count}x
                        </td>
                        <td className="py-3 px-3">
                          {word.practice_count >= 5 ? (
                            <span className={`flex items-center gap-1 text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                              <TrendingDown size={14} />
                              Not mastered
                            </span>
                          ) : (
                            <span className={`flex items-center gap-1 text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                              <RefreshCw size={14} />
                              In progress
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {strugglingWords.some(w => w.practice_count >= 5) && (
                <p className={`text-sm mt-4 p-3 rounded-lg ${isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-700'}`}>
                  <strong>Note:</strong> Words practiced 5+ times without mastery may need different learning strategies or additional context examples.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
