import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import {
  X, ChevronLeft, ChevronRight, Check, Loader,
  Clock, AlertCircle, CheckCircle, XCircle, Lightbulb,
  RotateCcw, Trophy
} from 'lucide-react';

export default function TestTaker({
  test,
  assignment,
  studentId,
  onClose,
  onComplete,
  isDark = true,
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showHint, setShowHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [startTime] = useState(Date.now());
  const [resultId, setResultId] = useState(null);

  useEffect(() => {
    loadQuestions();
    createTestResult();
  }, [test.id]);

  const loadQuestions = async () => {
    const { data, error } = await supabase
      .from('test_questions')
      .select('*')
      .eq('test_id', test.id)
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setQuestions(data);
    }
    setLoading(false);
  };

  const createTestResult = async () => {
    const { data, error } = await supabase
      .from('test_results')
      .insert({
        test_id: test.id,
        student_id: studentId,
        assignment_id: assignment?.assignment_id || null,
        status: 'in_progress',
        total_questions: test.test_questions?.length || 0,
      })
      .select('id')
      .single();

    if (!error && data) {
      setResultId(data.id);
    }
  };

  const currentQuestion = questions[currentIndex];

  const handleAnswer = (answer) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
    setShowHint(false);
  };

  const goToNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowHint(false);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowHint(false);
    }
  };

  const calculateResults = useCallback(() => {
    let correct = 0;
    const answerDetails = {};

    questions.forEach(q => {
      const userAnswer = answers[q.id] || '';
      const isCorrect = userAnswer.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
      if (isCorrect) correct++;

      answerDetails[q.id] = {
        answer: userAnswer,
        is_correct: isCorrect,
        correct_answer: q.correct_answer,
      };
    });

    return {
      score: correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100),
      answers: answerDetails,
      timeSpent: Math.round((Date.now() - startTime) / 1000),
    };
  }, [questions, answers, startTime]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const results = calculateResults();

    // Update test result
    if (resultId) {
      await supabase
        .from('test_results')
        .update({
          score: results.score,
          total_questions: results.total,
          answers: results.answers,
          time_spent_seconds: results.timeSpent,
          completed_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', resultId);
    }

    setResult(results);
    setSubmitting(false);
    onComplete?.(results);
  };

  const handleClose = async () => {
    // Mark as abandoned if not completed
    if (resultId && !result) {
      await supabase
        .from('test_results')
        .update({ status: 'abandoned' })
        .eq('id', resultId);
    }
    onClose();
  };

  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ background: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.6)' }}
      >
        <Loader size={32} className="animate-spin text-pink-vibrant" />
      </div>
    );
  }

  // Results screen
  if (result) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-4 z-50"
        style={{ background: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      >
        <div
          className={`relative rounded-3xl w-full max-w-lg overflow-hidden ${
            isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-gray-200'
          }`}
        >
          {/* Header */}
          <div className={`px-6 py-5 text-center border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
              result.percentage >= 70
                ? 'bg-green-500/20 text-green-400'
                : result.percentage >= 50
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
            }`}>
              <Trophy size={40} />
            </div>
            <h2 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {result.percentage >= 70 ? 'Great job!' : result.percentage >= 50 ? 'Good effort!' : 'Keep practicing!'}
            </h2>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              {test.title}
            </p>
          </div>

          {/* Score */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className={`text-center p-4 rounded-xl ${isDark ? 'bg-white/[0.05]' : 'bg-gray-50'}`}>
                <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {result.percentage}%
                </div>
                <div className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Score</div>
              </div>
              <div className={`text-center p-4 rounded-xl ${isDark ? 'bg-white/[0.05]' : 'bg-gray-50'}`}>
                <div className={`text-3xl font-bold text-green-500`}>
                  {result.score}
                </div>
                <div className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Correct</div>
              </div>
              <div className={`text-center p-4 rounded-xl ${isDark ? 'bg-white/[0.05]' : 'bg-gray-50'}`}>
                <div className={`text-3xl font-bold ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                  {Math.floor(result.timeSpent / 60)}:{String(result.timeSpent % 60).padStart(2, '0')}
                </div>
                <div className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Time</div>
              </div>
            </div>

            {/* Questions review */}
            <div className={`max-h-60 overflow-y-auto rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
              {questions.map((q, idx) => {
                const answerInfo = result.answers[q.id];
                return (
                  <div
                    key={q.id}
                    className={`p-4 border-b last:border-b-0 ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        answerInfo?.is_correct
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {answerInfo?.is_correct ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium mb-1 ${isDark ? 'text-white/80' : 'text-gray-800'}`}>
                          {idx + 1}. {q.question || q.question_text}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className={answerInfo?.is_correct ? 'text-green-400' : 'text-red-400'}>
                            Your answer: {answerInfo?.answer || '(skipped)'}
                          </span>
                          {!answerInfo?.is_correct && (
                            <span className="text-green-400">
                              Correct: {q.correct_answer}
                            </span>
                          )}
                        </div>
                        {!answerInfo?.is_correct && q.explanation_wrong && (
                          <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                            {q.explanation_wrong}
                          </p>
                        )}
                        {answerInfo?.is_correct && q.explanation_correct && (
                          <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                            {q.explanation_correct}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className={`px-6 py-4 border-t flex gap-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${
                isDark
                  ? 'bg-white/[0.05] text-white/80 hover:bg-white/[0.1]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Close
            </button>
            <button
              onClick={() => {
                setResult(null);
                setAnswers({});
                setCurrentIndex(0);
                createTestResult();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
            >
              <RotateCcw size={18} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Test taking screen
  return (
    <div
      className="fixed inset-0 flex flex-col z-50"
      style={{ background: isDark ? '#0a0a0b' : '#f9fafb' }}
    >
      {/* Header */}
      <header className={`px-4 py-3 border-b flex items-center justify-between ${
        isDark ? 'bg-[#0a0a0b] border-white/[0.08]' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X size={20} />
          </button>
          <div>
            <h1 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {test.title}
            </h1>
            <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className={`flex items-center gap-1.5 text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
            <Clock size={14} />
            <TimerDisplay startTime={startTime} />
          </div>

          {/* Progress */}
          <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {answeredCount}/{questions.length}
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className={`h-1 ${isDark ? 'bg-white/[0.05]' : 'bg-gray-200'}`}>
        <div
          className="h-full bg-pink-vibrant transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          {currentQuestion && (
            <div className="space-y-6">
              {/* Question text */}
              <div className={`text-xl font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {currentQuestion.question || currentQuestion.question_text}
              </div>

              {/* Answer options */}
              {(currentQuestion.type || currentQuestion.question_type) === 'multiple_choice' && currentQuestion.options?.length > 0 ? (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(option)}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        answers[currentQuestion.id] === option
                          ? 'bg-pink-vibrant text-white'
                          : isDark
                            ? 'bg-white/[0.05] text-white/80 hover:bg-white/[0.1] border border-white/[0.08]'
                            : 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          answers[currentQuestion.id] === option
                            ? 'bg-white/20'
                            : isDark ? 'bg-white/10' : 'bg-gray-100'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (currentQuestion.type || currentQuestion.question_type) === 'true_false' ? (
                <div className="flex gap-4">
                  {['True', 'False'].map(option => (
                    <button
                      key={option}
                      onClick={() => handleAnswer(option)}
                      className={`flex-1 p-6 rounded-xl text-center font-medium transition-all ${
                        answers[currentQuestion.id] === option
                          ? 'bg-pink-vibrant text-white'
                          : isDark
                            ? 'bg-white/[0.05] text-white/80 hover:bg-white/[0.1] border border-white/[0.08]'
                            : 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={answers[currentQuestion.id] || ''}
                  onChange={e => handleAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  className={`w-full px-4 py-4 rounded-xl text-lg ${
                    isDark
                      ? 'bg-white/[0.05] border border-white/10 text-white placeholder-white/30'
                      : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
                />
              )}

              {/* Hint */}
              {currentQuestion.hint && (
                <div>
                  {showHint ? (
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'}`}>
                      <div className="flex items-start gap-2">
                        <Lightbulb size={18} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                        <p className={`text-sm ${isDark ? 'text-yellow-200' : 'text-yellow-800'}`}>
                          {currentQuestion.hint}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowHint(true)}
                      className={`flex items-center gap-2 text-sm ${isDark ? 'text-white/40 hover:text-white/60' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <Lightbulb size={16} />
                      Show hint
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer navigation */}
      <footer className={`px-4 py-4 border-t ${isDark ? 'bg-[#0a0a0b] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-30 ${
              isDark
                ? 'bg-white/[0.05] text-white/80 hover:bg-white/[0.1]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          {/* Question dots */}
          <div className="hidden md:flex gap-1.5 flex-wrap justify-center max-w-md">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => { setCurrentIndex(idx); setShowHint(false); }}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'bg-pink-vibrant scale-125'
                    : answers[q.id]
                      ? isDark ? 'bg-green-500' : 'bg-green-400'
                      : isDark ? 'bg-white/20' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {currentIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all disabled:opacity-50"
            >
              {submitting ? <Loader size={18} className="animate-spin" /> : <Check size={18} />}
              Submit
            </button>
          ) : (
            <button
              onClick={goToNext}
              className="flex items-center gap-2 px-4 py-2.5 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
            >
              Next
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

// Timer component
function TimerDisplay({ startTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return <span>{mins}:{String(secs).padStart(2, '0')}</span>;
}
