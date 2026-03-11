import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import StudentHomework from './StudentHomework';
import CalendarView from '../common/CalendarView';
import {
  Loader, FileText, ClipboardList, CheckCircle, Clock,
  BookOpen, Layers, Play, Eye, Calendar, ChevronRight, Languages, PenLine
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

export default function StudentLearning({ studentId, onTakeTest, onViewMaterial, onReadText, onStudyVocab, isDark = true }) {
  const [assignments, setAssignments] = useState([]);
  const [vocabAssignments, setVocabAssignments] = useState([]);
  const [materials, setMaterials] = useState({});
  const [tests, setTests] = useState({});
  const [readingTexts, setReadingTexts] = useState({});
  const [vocabSets, setVocabSets] = useState({});
  const [testResults, setTestResults] = useState({});
  const [materialProgress, setMaterialProgress] = useState({});
  const [vocabProgress, setVocabProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadAssignments();
  }, [studentId]);

  const loadAssignments = async () => {
    setLoading(true);

    // Get assignments using the function
    const { data: assignmentData, error: assignmentError } = await supabase
      .rpc('get_student_assignments', { p_student_id: studentId });

    if (assignmentError) {
      console.error('Error loading assignments:', assignmentError);
      setLoading(false);
      return;
    }

    setAssignments(assignmentData || []);

    // Get unique content IDs by type
    const materialIds = assignmentData
      ?.filter(a => a.content_type === 'material')
      .map(a => a.content_id) || [];
    const testIds = assignmentData
      ?.filter(a => a.content_type === 'test')
      .map(a => a.content_id) || [];
    const readingIds = assignmentData
      ?.filter(a => a.content_type === 'reading_text')
      .map(a => a.content_id) || [];

    // Load materials
    if (materialIds.length > 0) {
      const { data: materialsData } = await supabase
        .from('materials')
        .select('*, topics(name)')
        .in('id', materialIds);

      const materialsMap = {};
      materialsData?.forEach(m => { materialsMap[m.id] = m; });
      setMaterials(materialsMap);
    }

    // Load tests
    if (testIds.length > 0) {
      const { data: testsData } = await supabase
        .from('tests')
        .select('*, topics(name)')
        .in('id', testIds);

      // Fetch question counts separately
      if (testsData?.length) {
        const { data: qData } = await supabase
          .from('test_questions')
          .select('id, test_id')
          .in('test_id', testsData.map(t => t.id));
        const qMap = {};
        qData?.forEach(q => {
          if (!qMap[q.test_id]) qMap[q.test_id] = [];
          qMap[q.test_id].push({ id: q.id });
        });
        testsData.forEach(t => { t.test_questions = qMap[t.id] || []; });
      }

      const testsMap = {};
      testsData?.forEach(t => { testsMap[t.id] = t; });
      setTests(testsMap);
    }

    // Load reading texts
    if (readingIds.length > 0) {
      const { data: readingData } = await supabase
        .from('reading_texts')
        .select('*, topics(name)')
        .in('id', readingIds);

      const readingMap = {};
      readingData?.forEach(r => { readingMap[r.id] = r; });
      setReadingTexts(readingMap);
    }

    // Load test results for this student
    if (testIds.length > 0) {
      const { data: resultsData } = await supabase
        .from('test_results')
        .select('*')
        .eq('student_id', studentId)
        .in('test_id', testIds)
        .eq('status', 'completed');

      const resultsMap = {};
      resultsData?.forEach(r => {
        // Keep the best result for each test
        if (!resultsMap[r.test_id] || r.percentage > resultsMap[r.test_id].percentage) {
          resultsMap[r.test_id] = r;
        }
      });
      setTestResults(resultsMap);
    }

    // Load material progress
    if (materialIds.length > 0) {
      const { data: progressData } = await supabase
        .from('material_progress')
        .select('*')
        .eq('student_id', studentId)
        .in('material_id', materialIds);

      const progressMap = {};
      progressData?.forEach(p => { progressMap[p.material_id] = p; });
      setMaterialProgress(progressMap);
    }

    // Load vocabulary assignments
    const { data: vocabData } = await supabase
      .from('vocabulary_assignments')
      .select(`
        *,
        vocabulary_sets(id, title, description, level, word_ids)
      `)
      .eq('student_id', studentId);

    if (vocabData) {
      setVocabAssignments(vocabData);
      const setsMap = {};
      vocabData.forEach(va => {
        if (va.vocabulary_sets) {
          setsMap[va.set_id] = va.vocabulary_sets;
        }
      });
      setVocabSets(setsMap);

      // Load vocab progress for each assignment
      const vocabProgressMap = {};
      for (const va of vocabData) {
        const { data: progressData } = await supabase
          .from('vocabulary_assignment_progress')
          .select('*')
          .eq('assignment_id', va.id);

        if (progressData) {
          const learned = progressData.filter(p => p.current_status === 'learned').length;
          const total = va.vocabulary_sets?.word_ids?.length || 0;
          vocabProgressMap[va.id] = { learned, total, percentage: total > 0 ? Math.round((learned / total) * 100) : 0 };
        }
      }
      setVocabProgress(vocabProgressMap);
    }

    setLoading(false);
  };

  const markMaterialViewed = async (materialId) => {
    if (materialProgress[materialId]) return;

    const { error } = await supabase
      .from('material_progress')
      .upsert({
        material_id: materialId,
        student_id: studentId,
        viewed_at: new Date().toISOString(),
      });

    if (!error) {
      setMaterialProgress(prev => ({
        ...prev,
        [materialId]: { viewed_at: new Date().toISOString() }
      }));
    }
  };

  const handleViewMaterial = (material) => {
    markMaterialViewed(material.id);
    onViewMaterial?.(material);
  };

  // Combine regular assignments with vocab assignments for unified view
  const allAssignments = [
    ...assignments,
    ...vocabAssignments.map(va => ({
      assignment_id: va.id,
      content_type: 'vocabulary',
      content_id: va.set_id,
      due_date: va.due_date,
      notes: va.notes,
      is_required: false,
    }))
  ];

  const filteredAssignments = allAssignments.filter(a => {
    if (activeTab === 'all') return true;
    if (activeTab === 'materials') return a.content_type === 'material';
    if (activeTab === 'tests') return a.content_type === 'test';
    if (activeTab === 'reading') return a.content_type === 'reading_text';
    if (activeTab === 'vocabulary') return a.content_type === 'vocabulary';
    return true;
  });

  const stats = {
    totalMaterials: assignments.filter(a => a.content_type === 'material').length,
    viewedMaterials: Object.keys(materialProgress).length,
    totalTests: assignments.filter(a => a.content_type === 'test').length,
    completedTests: Object.keys(testResults).length,
    totalReading: assignments.filter(a => a.content_type === 'reading_text').length,
    totalVocab: vocabAssignments.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader size={32} className="animate-spin text-pink-vibrant" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {stats.viewedMaterials}/{stats.totalMaterials}
          </div>
          <div className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Materials viewed
          </div>
        </div>
        <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
          <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {stats.completedTests}/{stats.totalTests}
          </div>
          <div className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Tests completed
          </div>
        </div>
        <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
          <div className={`text-2xl font-bold text-green-500`}>
            {stats.completedTests > 0
              ? Math.round(Object.values(testResults).reduce((sum, r) => sum + Number(r.percentage), 0) / stats.completedTests)
              : 0}%
          </div>
          <div className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Avg. test score
          </div>
        </div>
        <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
          <div className={`text-2xl font-bold text-pink-vibrant`}>
            {assignments.length}
          </div>
          <div className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Total assignments
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 p-1.5 rounded-2xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-100'}`}>
        {[
          { key: 'all', label: 'All', count: allAssignments.length },
          { key: 'materials', label: 'Materials', count: stats.totalMaterials },
          { key: 'reading', label: 'Reading', count: stats.totalReading },
          { key: 'vocabulary', label: 'Vocabulary', count: stats.totalVocab },
          { key: 'tests', label: 'Tests', count: stats.totalTests },
          { key: 'homework', label: 'Homework', icon: PenLine },
          { key: 'calendar', label: 'Calendar', icon: Calendar },
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
              activeTab === tab.key
                ? 'bg-white/20'
                : isDark ? 'bg-white/10' : 'bg-gray-200'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Homework tab */}
      {activeTab === 'homework' && (
        <StudentHomework studentId={studentId} isDark={isDark} />
      )}

      {/* Calendar tab */}
      {activeTab === 'calendar' && (
        <CalendarView userId={studentId} role="student" isDark={isDark} />
      )}

      {/* Assignments list */}
      {activeTab !== 'homework' && activeTab !== 'calendar' && filteredAssignments.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl ${
          isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-gray-200'
        }`}>
          <BookOpen size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            No assignments yet
          </h3>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Your teacher hasn't assigned any content yet
          </p>
        </div>
      ) : activeTab !== 'homework' && activeTab !== 'calendar' && (
        <div className="space-y-3">
          {filteredAssignments.map(assignment => {
            const isMaterial = assignment.content_type === 'material';
            const isTest = assignment.content_type === 'test';
            const isReading = assignment.content_type === 'reading_text';
            const isVocab = assignment.content_type === 'vocabulary';

            const content = isMaterial
              ? materials[assignment.content_id]
              : isTest
                ? tests[assignment.content_id]
                : isReading
                  ? readingTexts[assignment.content_id]
                  : vocabSets[assignment.content_id];

            if (!content) return null;

            const vocabProg = isVocab ? vocabProgress[assignment.assignment_id] : null;

            const isViewed = isMaterial && materialProgress[assignment.content_id];
            const testResult = isTest && testResults[assignment.content_id];
            const isDue = assignment.due_date && new Date(assignment.due_date) < new Date();

            return (
              <div
                key={assignment.assignment_id}
                className={`rounded-2xl p-5 transition-all ${
                  isDark
                    ? 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05]'
                    : 'bg-white border border-gray-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isMaterial
                      ? isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                      : isReading
                        ? isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600'
                        : isVocab
                          ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                          : isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {isMaterial ? <FileText size={24} /> : isReading ? <BookOpen size={24} /> : isVocab ? <Languages size={24} /> : <ClipboardList size={24} />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {content.title}
                      </h3>
                      {(isMaterial || isReading) && content.level && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(content.level, isDark)}`}>
                          {content.level}
                        </span>
                      )}
                      {/* Status badge */}
                      {isViewed && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                        }`}>
                          <CheckCircle size={10} />
                          Viewed
                        </span>
                      )}
                      {testResult && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          Number(testResult.percentage) >= 70
                            ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                            : isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          <CheckCircle size={10} />
                          {Math.round(testResult.percentage)}%
                        </span>
                      )}
                      {vocabProg && vocabProg.total > 0 && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          vocabProg.percentage >= 80
                            ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                            : vocabProg.percentage >= 50
                              ? isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                              : isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {vocabProg.learned}/{vocabProg.total} learned
                        </span>
                      )}
                    </div>

                    {/* Topic badge */}
                    {content.topics?.name && (
                      <div className="flex gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                        }`}>
                          <Layers size={10} />
                          {content.topics.name}
                        </span>
                      </div>
                    )}

                    {/* Description / content preview */}
                    {isMaterial && content.content && (
                      <p className={`text-sm line-clamp-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                        {content.content}
                      </p>
                    )}
                    {isReading && content.content && (
                      <p className={`text-sm line-clamp-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                        {content.content}
                      </p>
                    )}
                    {isTest && (
                      <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        {content.test_questions?.length || 0} questions
                        {content.description && ` • ${content.description}`}
                      </p>
                    )}
                    {isVocab && (
                      <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        {content.word_ids?.length || 0} words
                        {content.description && ` • ${content.description}`}
                      </p>
                    )}

                    {/* Due date & notes */}
                    <div className="flex items-center gap-4 mt-2">
                      {assignment.due_date && (
                        <span className={`inline-flex items-center gap-1 text-xs ${
                          isDue
                            ? 'text-red-400'
                            : isDark ? 'text-white/40' : 'text-gray-400'
                        }`}>
                          <Calendar size={12} />
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {assignment.is_required && (
                        <span className={`text-xs ${isDark ? 'text-pink-400' : 'text-pink-600'}`}>
                          Required
                        </span>
                      )}
                    </div>
                    {assignment.notes && (
                      <p className={`text-xs mt-2 italic ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        {assignment.notes}
                      </p>
                    )}
                  </div>

                  {/* Action button */}
                  <div className="flex-shrink-0">
                    {isMaterial && (
                      <button
                        onClick={() => handleViewMaterial(content)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                          isViewed
                            ? isDark
                              ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-pink-vibrant text-white hover:brightness-110'
                        }`}
                      >
                        <Eye size={16} />
                        {isViewed ? 'Review' : 'View'}
                      </button>
                    )}
                    {isReading && (
                      <button
                        onClick={() => onReadText?.(content)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all bg-pink-vibrant text-white hover:brightness-110"
                      >
                        <BookOpen size={16} />
                        Read
                      </button>
                    )}
                    {isTest && (
                      <button
                        onClick={() => onTakeTest?.(content, assignment)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                          testResult
                            ? isDark
                              ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-pink-vibrant text-white hover:brightness-110'
                        }`}
                      >
                        <Play size={16} />
                        {testResult ? 'Retake' : 'Start'}
                      </button>
                    )}
                    {isVocab && (
                      <button
                        onClick={() => onStudyVocab?.(vocabAssignments.find(va => va.set_id === assignment.content_id))}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                          vocabProg?.percentage >= 80
                            ? isDark
                              ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-pink-vibrant text-white hover:brightness-110'
                        }`}
                      >
                        <Languages size={16} />
                        {vocabProg?.percentage >= 80 ? 'Review' : 'Study'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
