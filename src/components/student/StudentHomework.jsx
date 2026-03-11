import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import {
  FileText, Calendar, Clock, CheckCircle, AlertCircle,
  Send, ChevronRight, Award, X, BookOpen, ClipboardList,
  BookText, ChevronLeft, Highlighter
} from 'lucide-react';
import RichTextEditor from '../common/RichTextEditor';

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#bbf7d0' },
  { name: 'Blue', value: '#bfdbfe' },
  { name: 'Pink', value: '#fbcfe8' },
  { name: 'Orange', value: '#fed7aa' },
];

export default function StudentHomework({ studentId, isDark = true }) {
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Content viewing
  const [viewingContent, setViewingContent] = useState(null);
  const [contentData, setContentData] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);

  // Highlighting
  const [highlights, setHighlights] = useState([]);
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [highlightMode, setHighlightMode] = useState(false);
  const contentRef = useRef(null);

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

  const openContent = async (contentItem) => {
    setContentLoading(true);
    setViewingContent(contentItem);
    setContentData(null);

    let data = null;
    if (contentItem.content_type === 'material') {
      const { data: d } = await supabase
        .from('materials')
        .select('*')
        .eq('id', contentItem.content_id)
        .single();
      data = d;
    } else if (contentItem.content_type === 'test') {
      const { data: d } = await supabase
        .from('tests')
        .select('*, test_questions(*)')
        .eq('id', contentItem.content_id)
        .single();
      data = d;
    } else if (contentItem.content_type === 'reading_text') {
      const { data: d } = await supabase
        .from('reading_texts')
        .select('*')
        .eq('id', contentItem.content_id)
        .single();
      data = d;
    }

    setContentData(data);

    // Load highlights for this content
    if (contentItem.content_type === 'material' || contentItem.content_type === 'reading_text') {
      const { data: hl } = await supabase
        .from('student_highlights')
        .select('*')
        .eq('student_id', studentId)
        .eq('content_type', contentItem.content_type)
        .eq('content_id', contentItem.content_id);
      setHighlights(hl || []);
    }

    setContentLoading(false);
  };

  const handleTextSelect = useCallback(async () => {
    if (!highlightMode || !contentRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    if (!contentRef.current.contains(range.commonAncestorContainer)) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Apply highlight visually
    const mark = document.createElement('mark');
    mark.style.backgroundColor = highlightColor;
    mark.style.borderRadius = '2px';
    mark.style.padding = '0 1px';

    try {
      range.surroundContents(mark);
    } catch {
      // If selection spans multiple nodes, wrap each text node
      const fragment = range.extractContents();
      const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
      const newFragment = document.createDocumentFragment();
      let node;
      while ((node = walker.nextNode())) {
        const m = document.createElement('mark');
        m.style.backgroundColor = highlightColor;
        m.style.borderRadius = '2px';
        m.style.padding = '0 1px';
        m.textContent = node.textContent;
        newFragment.appendChild(m);
      }
      range.insertNode(newFragment);
    }

    selection.removeAllRanges();

    // Save to DB
    const { data: saved } = await supabase
      .from('student_highlights')
      .insert({
        student_id: studentId,
        content_type: viewingContent.content_type,
        content_id: viewingContent.content_id,
        highlight_data: {
          text: selectedText,
          color: highlightColor
        }
      })
      .select()
      .single();

    if (saved) {
      setHighlights(prev => [...prev, saved]);
    }
  }, [highlightMode, highlightColor, studentId, viewingContent]);

  const removeHighlight = async (highlightId) => {
    await supabase.from('student_highlights').delete().eq('id', highlightId);
    setHighlights(prev => prev.filter(h => h.id !== highlightId));
    // Re-render content to remove visual highlight
    if (contentData && contentRef.current) {
      renderContentWithHighlights();
    }
  };

  const renderContentWithHighlights = useCallback(() => {
    if (!contentRef.current || !contentData) return;

    const content = contentData.content || '';
    let html = content;

    // Apply saved highlights
    for (const hl of highlights) {
      const { text, color } = hl.highlight_data;
      if (text && html.includes(text)) {
        html = html.replace(
          text,
          `<mark style="background-color: ${color}; border-radius: 2px; padding: 0 1px;">${text}</mark>`
        );
      }
    }

    contentRef.current.innerHTML = html;
  }, [contentData, highlights]);

  useEffect(() => {
    renderContentWithHighlights();
  }, [renderContentWithHighlights]);

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

  const contentTypeIcon = (type) => {
    if (type === 'material') return <BookOpen size={16} className="text-blue-400" />;
    if (type === 'test') return <ClipboardList size={16} className="text-orange-400" />;
    return <BookText size={16} className="text-green-400" />;
  };

  const contentTypeLabel = (type) => {
    if (type === 'material') return 'Theory';
    if (type === 'test') return 'Test';
    return 'Reading';
  };

  if (loading) {
    return (
      <div className={`text-center py-16 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
        Loading homework...
      </div>
    );
  }

  // Content viewing mode
  if (viewingContent) {
    return (
      <ContentViewer
        contentItem={viewingContent}
        contentData={contentData}
        contentLoading={contentLoading}
        highlights={highlights}
        highlightColor={highlightColor}
        setHighlightColor={setHighlightColor}
        highlightMode={highlightMode}
        setHighlightMode={setHighlightMode}
        contentRef={contentRef}
        onTextSelect={handleTextSelect}
        onRemoveHighlight={removeHighlight}
        onBack={() => { setViewingContent(null); setContentData(null); setHighlightMode(false); }}
        studentId={studentId}
        isDark={isDark}
      />
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
          {homework.map(hw => {
            const contentItems = hw.content_items && hw.content_items !== '[]'
              ? (typeof hw.content_items === 'string' ? JSON.parse(hw.content_items) : hw.content_items)
              : [];

            return (
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

                    {/* Attached content */}
                    {contentItems.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {contentItems.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => openContent(item)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isDark
                                ? 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1]'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {contentTypeIcon(item.content_type)}
                            {item.title}
                          </button>
                        ))}
                      </div>
                    )}

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
            );
          })}
        </div>
      )}

      {/* Submission Modal */}
      {selectedHomework && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl ${
            isDark ? 'bg-[#1a1a1e]' : 'bg-white'
          }`}>
            <div className={`sticky top-0 z-10 flex items-center justify-between p-4 border-b ${
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
                  <div
                    className={`text-sm prose prose-sm max-w-none ${isDark ? 'prose-invert text-white/80' : 'text-gray-700'}`}
                    dangerouslySetInnerHTML={{ __html: selectedHomework.instructions }}
                  />
                </div>
              )}

              {/* Attached content */}
              {(() => {
                const items = selectedHomework.content_items && selectedHomework.content_items !== '[]'
                  ? (typeof selectedHomework.content_items === 'string'
                      ? JSON.parse(selectedHomework.content_items)
                      : selectedHomework.content_items)
                  : [];
                if (items.length === 0) return null;
                return (
                  <div>
                    <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                      Materials
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {items.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => openContent(item)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                            isDark
                              ? 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1]'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {contentTypeIcon(item.content_type)}
                          {item.title}
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            isDark ? 'bg-white/10 text-white/40' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {contentTypeLabel(item.content_type)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

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
                    <RichTextEditor
                      content={submissionContent}
                      onChange={setSubmissionContent}
                      isDark={isDark}
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

// Content viewer component for materials, tests, reading texts
function ContentViewer({
  contentItem, contentData, contentLoading, highlights,
  highlightColor, setHighlightColor, highlightMode, setHighlightMode,
  contentRef, onTextSelect, onRemoveHighlight, onBack,
  studentId, isDark
}) {
  // Test state
  const [testAnswers, setTestAnswers] = useState({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const handleTestSubmit = () => {
    if (!contentData?.test_questions) return;

    const results = contentData.test_questions.map(q => {
      const answer = testAnswers[q.id];
      const correct = q.correct_answer;
      return {
        question_id: q.id,
        given: answer,
        correct,
        is_correct: answer === correct
      };
    });

    const score = results.filter(r => r.is_correct).length;
    setTestResults({ results, score, total: results.length });
    setTestSubmitted(true);
  };

  if (contentLoading) {
    return (
      <div className={`text-center py-16 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
        Loading content...
      </div>
    );
  }

  if (!contentData) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <ChevronLeft size={18} />
          Back to homework
        </button>
        <div className={`text-center py-16 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
          Content not found
        </div>
      </div>
    );
  }

  // Test content
  if (contentItem.content_type === 'test') {
    const questions = contentData.test_questions || [];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ChevronLeft size={18} />
            Back to homework
          </button>
          {testSubmitted && testResults && (
            <span className={`text-lg font-bold ${
              testResults.score / testResults.total >= 0.7 ? 'text-green-500' : 'text-orange-500'
            }`}>
              {testResults.score}/{testResults.total}
            </span>
          )}
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {contentData.title}
          </h2>
          {contentData.description && (
            <p className={`text-sm mb-6 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              {contentData.description}
            </p>
          )}

          <div className="space-y-6">
            {questions.map((q, qIdx) => {
              const result = testSubmitted ? testResults?.results?.find(r => r.question_id === q.id) : null;
              const options = q.options || [];

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl ${
                    testSubmitted
                      ? result?.is_correct
                        ? isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'
                        : isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
                      : isDark ? 'bg-white/[0.03]' : 'bg-gray-50'
                  }`}
                >
                  <p className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {qIdx + 1}. {q.question}
                  </p>

                  <div className="space-y-2">
                    {options.map((opt, optIdx) => {
                      const isSelected = testAnswers[q.id] === opt;
                      const isCorrect = testSubmitted && opt === q.correct_answer;
                      const isWrong = testSubmitted && isSelected && !isCorrect;

                      return (
                        <label
                          key={optIdx}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                            testSubmitted
                              ? isCorrect
                                ? isDark ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'
                                : isWrong
                                  ? isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
                                  : isDark ? 'text-white/60' : 'text-gray-600'
                              : isSelected
                                ? isDark ? 'bg-pink-vibrant/20 text-white' : 'bg-pink-100 text-pink-800'
                                : isDark ? 'hover:bg-white/[0.05] text-white/70' : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${q.id}`}
                            checked={isSelected}
                            onChange={() => !testSubmitted && setTestAnswers({ ...testAnswers, [q.id]: opt })}
                            disabled={testSubmitted}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{opt}</span>
                        </label>
                      );
                    })}
                  </div>

                  {testSubmitted && result && !result.is_correct && q.explanation_correct && (
                    <p className={`mt-3 text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      {q.explanation_correct}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {!testSubmitted && questions.length > 0 && (
            <div className="flex justify-end mt-6">
              <button
                onClick={handleTestSubmit}
                disabled={Object.keys(testAnswers).length < questions.length}
                className="px-6 py-2.5 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 disabled:opacity-50"
              >
                Check Answers
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Material or Reading Text — with highlighting
  const isHighlightable = contentItem.content_type === 'material' || contentItem.content_type === 'reading_text';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <ChevronLeft size={18} />
          Back to homework
        </button>

        {isHighlightable && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHighlightMode(!highlightMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                highlightMode
                  ? 'bg-pink-vibrant text-white'
                  : isDark
                    ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.08]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Highlighter size={16} />
              Highlight
            </button>

            {highlightMode && (
              <div className="flex gap-1">
                {HIGHLIGHT_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setHighlightColor(c.value)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      highlightColor === c.value ? 'scale-125 border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`rounded-2xl border p-6 ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white border-gray-200'}`}>
        <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {contentData.title}
        </h2>
        {contentData.level && (
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-4 ${
            isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'
          }`}>
            {contentData.level}
          </span>
        )}

        {/* Main content with highlighting */}
        <div
          ref={contentRef}
          onMouseUp={onTextSelect}
          className={`prose prose-sm max-w-none ${isDark ? 'prose-invert' : ''} ${
            highlightMode ? 'cursor-text select-text' : ''
          }`}
          style={{ userSelect: highlightMode ? 'text' : 'auto' }}
        />

        {/* Translation for reading texts */}
        {contentData.translation && (
          <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
            <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              Translation
            </h4>
            <p className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
              {contentData.translation}
            </p>
          </div>
        )}

        {/* Vocabulary hints for reading texts */}
        {contentData.vocabulary_hints && Object.keys(contentData.vocabulary_hints).length > 0 && (
          <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
            <h4 className={`text-sm font-medium mb-2 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              Vocabulary
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(contentData.vocabulary_hints).map(([word, translation]) => (
                <span
                  key={word}
                  className={`px-2 py-1 rounded-lg text-sm ${
                    isDark ? 'bg-white/[0.05] text-white/70' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <strong>{word}</strong> — {translation}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Highlights list */}
      {highlights.length > 0 && (
        <div className={`rounded-2xl border p-4 ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white border-gray-200'}`}>
          <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
            Your Highlights ({highlights.length})
          </h4>
          <div className="space-y-2">
            {highlights.map(hl => (
              <div
                key={hl.id}
                className={`flex items-center justify-between px-3 py-2 rounded-xl ${
                  isDark ? 'bg-white/[0.03]' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: hl.highlight_data.color }}
                  />
                  <span className={`text-sm truncate ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                    {hl.highlight_data.text}
                  </span>
                </div>
                <button
                  onClick={() => onRemoveHighlight(hl.id)}
                  className={`p-1 rounded-lg flex-shrink-0 ${isDark ? 'hover:bg-white/[0.05] text-white/30' : 'hover:bg-gray-200 text-gray-400'}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
