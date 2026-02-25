import { useState, useEffect, useMemo } from 'react';
import { Plus, Volume2, RotateCcw, Check, X, BookOpen, PenTool, HelpCircle, ChevronRight, Download, Trash2, Edit2, ChevronDown, ChevronUp, Home, Menu, Search, Loader, Upload, Undo2, RefreshCw, User, Settings, LogOut, Moon, Sun, Monitor, TrendingUp, Target, Flame, Calendar, Award } from 'lucide-react';
import { supabase } from './supabaseClient';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const WORD_TYPES = ['noun', 'verb', 'adjective', 'adverb', 'phrasal verb', 'idiom', 'phrase', 'preposition', 'conjunction', 'interjection'];
const STATUS = { NEW: 'new', LEARNING: 'learning', LEARNED: 'learned' };
const getLevelColor = (l, isDark = true) => {
  const colors = isDark ? {
    A1: 'bg-green-500/15 text-green-400', A2: 'bg-green-500/20 text-green-400',
    B1: 'bg-yellow-500/15 text-yellow-400', B2: 'bg-yellow-500/20 text-yellow-400',
    C1: 'bg-red-500/15 text-red-400', C2: 'bg-red-500/20 text-red-400'
  } : {
    A1: 'bg-green-100 text-green-700', A2: 'bg-green-100 text-green-700',
    B1: 'bg-yellow-100 text-yellow-700', B2: 'bg-yellow-100 text-yellow-700',
    C1: 'bg-red-100 text-red-700', C2: 'bg-red-100 text-red-700'
  };
  return colors[l] || (isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-600');
};
const getStatusColor = (s, isDark = true) => {
  const colors = isDark ? {
    'new': 'bg-blue-500/15 text-blue-400',
    'learning': 'bg-orange-500/15 text-orange-400',
    'learned': 'bg-green-500/15 text-green-400'
  } : {
    'new': 'bg-blue-100 text-blue-700',
    'learning': 'bg-orange-100 text-orange-700',
    'learned': 'bg-green-100 text-green-700'
  };
  return colors[s] || (isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-600');
};

const COLLECTION_ICONS = ['📚', '📖', '🎬', '💼', '✈️', '🍕', '🎵', '⚽', '💻', '🎓', '🏥', '🎨', '🏠', '🚗', '👔', '🌳', '🎯', '⭐', '🔥', '💡'];

// Подсветка слова в примере
const highlightWord = (text, word) => {
  if (!text || !word) return text;
  // Экранируем специальные regex символы
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const baseWord = escaped.toLowerCase().replace(/\s+/g, '\\s+');
  try {
    // Ищем слово и его формы (с окончаниями)
    const regex = new RegExp(`(${baseWord}\\w*|\\w*${baseWord})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <span key={i} className="text-blue-400 font-medium not-italic">{part}</span> : part
    );
  } catch {
    return text; // Если regex не работает - возвращаем текст как есть
  }
};

// Activity Tracker Component - Beautiful pixel-style habit tracker
const ActivityTracker = ({ activityData, streak, userGoals, isDark = true, className = '' }) => {
  const today = new Date();
  const goalNew = userGoals?.daily_new_words || 5;
  const goalReview = userGoals?.daily_review_words || 10;

  // Generate days for the grid (7 columns x 7 rows = 49 days)
  const generateAllDays = () => {
    const days = [];
    for (let i = 48; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const activity = activityData.find(a => a.date === dateStr);

      let status = 'none';
      if (activity) {
        const newDone = activity.new_words_learned >= activity.goal_new;
        const reviewDone = activity.words_reviewed >= activity.goal_review;
        if (newDone && reviewDone) status = 'complete';
        else if (newDone || reviewDone) status = 'partial';
        else if (activity.new_words_learned > 0 || activity.words_reviewed > 0) status = 'started';
      }

      const newLearned = activity?.new_words_learned || 0;
      const reviewLearned = activity?.words_reviewed || 0;
      const toolTipText = `${dateStr}\nNew: ${newLearned}, Rev: ${reviewLearned}`;

      days.push({ date: dateStr, status, isToday: i === 0, toolTipText });
    }
    return days;
  };

  const days = generateAllDays();
  const todayActivity = activityData.find(a => a.date === today.toISOString().split('T')[0]);
  const todayNew = todayActivity?.new_words_learned || 0;
  const todayReview = todayActivity?.words_reviewed || 0;

  // Dot colors
  const getDotStyle = (status, isToday) => {
    const base = {
      width: '100%',
      paddingTop: '100%',
      borderRadius: '50%',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    if (status === 'complete') {
      return { ...base, backgroundColor: '#fc3b74', boxShadow: '0 0 8px rgba(252, 59, 116, 0.6)' };
    } else if (status === 'partial') {
      return { ...base, backgroundColor: '#ff7597', boxShadow: '0 0 5px rgba(255, 117, 151, 0.4)' };
    } else if (status === 'started') {
      return { ...base, backgroundColor: isDark ? 'rgba(252, 59, 116, 0.35)' : 'rgba(252, 59, 116, 0.4)' };
    }
    return { ...base, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' };
  };

  return (
    <div
      className={`dash-card relative overflow-hidden flex flex-col ${className}`}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 80% 0%, rgba(252, 59, 116, 0.12) 0%, transparent 50%)'
            : 'radial-gradient(ellipse at 80% 0%, rgba(252, 59, 116, 0.1) 0%, transparent 50%)'
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-6">
        <div>
          <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Activity</h3>
          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Last 7 weeks</p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20">
            <Flame size={14} className="text-pink-vibrant" />
            <span className="text-pink-vibrant font-semibold text-sm">{streak}</span>
          </div>
        )}
      </div>

      {/* Today's Stats - Compact */}
      <div className="relative grid grid-cols-2 gap-3 mb-6">
        <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.04]' : 'bg-black/[0.02] border border-black/[0.04]'}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-pink-vibrant glow-pink" />
            <span className={`text-[11px] uppercase tracking-wide font-medium ${isDark ? 'text-white/50' : 'text-gray-500'}`}>New</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{todayNew}</span>
            <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>/{goalNew}</span>
          </div>
          <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min((todayNew / goalNew) * 100, 100)}%`,
                background: 'linear-gradient(90deg, #fc3b74, #ff7597)',
                boxShadow: todayNew > 0 ? '0 0 8px rgba(252, 59, 116, 0.5)' : 'none'
              }}
            />
          </div>
        </div>
        <div className={`rounded-2xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.04]' : 'bg-black/[0.02] border border-black/[0.04]'}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-mint-vibrant glow-green" />
            <span className={`text-[11px] uppercase tracking-wide font-medium ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Review</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{todayReview}</span>
            <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>/{goalReview}</span>
          </div>
          <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min((todayReview / goalReview) * 100, 100)}%`,
                background: 'linear-gradient(90deg, #69e3a9, #8df5c2)',
                boxShadow: todayReview > 0 ? '0 0 8px rgba(105, 227, 169, 0.5)' : 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* Dot Grid - 7 rows x 7 columns */}
      <div className="relative flex-1 flex flex-col justify-center">
        <div className="grid gap-[8px] w-full max-w-[280px] mx-auto" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.map((day, i) => (
            <div
              key={i}
              title={day.toolTipText}
              style={getDotStyle(day.status, day.isToday)}
              className={`transition-transform cursor-crosshair hover:scale-[1.4] hover:z-10 relative ${day.isToday ? (isDark ? 'ring-1 ring-white/30 ring-offset-2 ring-offset-[#151515]' : 'ring-1 ring-black/20') : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="relative flex items-center justify-center gap-4 mt-5 text-[10px] font-medium">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          <span className={isDark ? 'text-white/40' : 'text-gray-500'}>None</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(252, 59, 116, 0.35)' }} />
          <span className={isDark ? 'text-white/40' : 'text-gray-500'}>Started</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ff7597' }} />
          <span className={isDark ? 'text-white/40' : 'text-gray-500'}>Partial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full glow-pink" style={{ backgroundColor: '#fc3b74' }} />
          <span className={isDark ? 'text-white/40' : 'text-gray-500'}>Complete</span>
        </div>
      </div>
    </div>
  );
};

const SECTION_ICONS = ['📖', '📝', '🎬', '🎥', '💼', '🏢', '✈️', '🌍', '🍕', '🍔', '🎵', '🎸', '⚽', '🏀', '💻', '🖥️', '🎓', '📚', '🏥', '⚕️', '🎨', '🖼️', '🏠', '🏡', '🚗', '🚙', '👔', '👗', '🌳', '🌺', '🎯', '⭐'];

const initialData = { collections: [{ id: 'c1', name: 'English', icon: '📚', sections: [{ id: 's1', name: 'Topic 1', icon: '📖' }] }], words: [], allTags: [], songFolders: [{ id: 'sf1', name: 'My Songs' }], songs: [] };

const Modal = ({ children, onClose, preventClose, wide, medium, isDark = true }) => (
  <div
    className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fadeIn"
    style={{ background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
    onClick={preventClose ? undefined : onClose}
  >
    <div
      className={`relative liquid-glass rounded-3xl p-6 w-full ${wide ? 'max-w-6xl' : medium ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto animate-scaleIn ${isDark ? 'text-gray-100 border-white/10' : 'text-gray-900 border-black/10'}`}
      style={{
        boxShadow: isDark
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
          : '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
      }}
      onClick={e => e.stopPropagation()}
    >{children}</div>
  </div>
);

const Toast = ({ message, onUndo, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  return <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50"><span>{message}</span>{onUndo && <button onClick={onUndo} className="px-2 py-1 bg-white/20 rounded"><Undo2 size={14} /></button>}<button onClick={onClose}>×</button></div>;
};

const Alert = ({ message, onClose, isDark = true }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={onClose}>
      <div className={`rounded-2xl shadow-2xl p-6 max-w-md w-full border-l-4 border-red-500 animate-scaleIn ${isDark ? 'bg-[#1a1a1e]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="flex-1">
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Word Already Exists</h3>
            <p className={`text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{message}</p>
          </div>
          <button onClick={onClose} className={`flex-shrink-0 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
            <X size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

const ProgressBar = ({ current, total, correct, wrong, isDark = true }) => (
  <div className="mb-4">
    <div className={`flex justify-between text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><span>{current + 1}/{total}</span><span className="text-emerald-500">{correct}✓</span></div>
    <div className={`w-full rounded-full h-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}><div className="h-2 rounded-full bg-pink-vibrant transition-all" style={{ width: `${((current + 1) / total) * 100}%` }}></div></div>
  </div>
);

const CompletionScreen = ({ title, stats, onRestart, onBack, wrongWords, isDark = true }) => {
  const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  return (
    <div className="max-w-md mx-auto text-center py-8">
      <div className={`rounded-3xl shadow-lg p-8 ${isDark ? 'bg-[#1a1a1e]' : 'bg-white border border-black/5'}`}>
        <div className="text-6xl mb-4">{pct >= 80 ? '🎉' : '💪'}</div>
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
        <div className="flex justify-center gap-6 my-6">
          <div><div className="text-3xl font-bold text-emerald-400">{stats.correct}</div><div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Know</div></div>
          <div><div className="text-3xl font-bold text-red-400">{stats.total - stats.correct}</div><div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Don't know</div></div>
        </div>
        {wrongWords.length > 0 && <div className={`text-left mb-4 p-3 rounded-xl ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}><div className={`text-sm mb-2 ${isDark ? 'text-red-400' : 'text-red-700'}`}>To review:</div><div className="flex flex-wrap gap-1">{wrongWords.map(w => <span key={w.id} className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'}`}>{w.word}</span>)}</div></div>}
        <div className="flex gap-3"><button onClick={onBack} className={`flex-1 p-3 rounded-full font-medium ${isDark ? 'border border-white/10 text-white hover:bg-white/5' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Back</button><button onClick={onRestart} className="flex-1 p-3 bg-pink-vibrant text-white rounded-full font-medium flex items-center justify-center gap-2 hover:brightness-110"><RefreshCw size={18} />Again</button></div>
      </div>
    </div>
  );
};

const ImportTextModal = ({ onImport, onCancel, currentSectionId, isDark = true }) => {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState([]);

  const hasCyrillic = (str) => /[а-яёА-ЯЁ]/.test(str);

  const parseText = () => {
    const lines = text.split('\n').filter(line => line.trim());
    const parsed = [];

    lines.forEach((line, idx) => {
      const parts = line.split(/\t|=/).map(p => p.trim());

      if (parts.length >= 2) {
        const word = parts[0];
        let meaningRu = '';
        let meaningEn = '';

        if (parts.length === 3) {
          // word \t ru \t en
          meaningRu = parts[1];
          meaningEn = parts[2];
        } else {
          // word \t translation - определяем куда класть по наличию кириллицы
          const translation = parts[1];
          if (hasCyrillic(translation)) {
            meaningRu = translation;
          } else {
            meaningEn = translation;
          }
        }

        parsed.push({
          sectionId: currentSectionId,
          word,
          type: 'phrase',
          level: 'B1',
          forms: '',
          meaningEn,
          meaningRu,
          example: '',
          myExample: '',
          singleRootWords: '',
          synonyms: '',
          tags: [],
          status: STATUS.NEW,
          passedModes: []
        });
      }
    });

    setPreview(parsed);
  };

  return (
    <Modal onClose={onCancel} wide isDark={isDark}>
      <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Import</h3>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste text in format: word [tab] translation"
        className={`w-full px-3 py-2 rounded-xl focus:outline-none h-48 mb-3 font-mono text-sm ${isDark ? 'bg-[#1a1a1e] border border-white/10 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`}
      />
      {preview.length === 0 && (
        <div className="flex gap-2">
          <button onClick={onCancel} className={`flex-1 h-10 px-4 rounded-full font-medium ${isDark ? 'border border-white/10 text-white hover:bg-white/5' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
          <button onClick={parseText} disabled={!text.trim()} className="flex-1 h-10 px-4 bg-pink-vibrant text-white rounded-full font-medium disabled:opacity-50 hover:brightness-110">Parse</button>
        </div>
      )}
      {preview.length > 0 && (
        <>
          <div className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{preview.length} words found</div>
          <div className={`max-h-64 overflow-y-auto rounded-xl mb-3 ${isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
            {preview.map((w, i) => (
              <div key={i} className={`p-2 text-sm ${isDark ? 'border-b border-white/5' : 'border-b border-gray-200'}`}>
                <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{w.word}</div>
                {w.meaningRu && <div className="text-pink-vibrant">→ {w.meaningRu}</div>}
                {w.meaningEn && <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>{w.meaningEn}</div>}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPreview([])} className={`flex-1 h-10 px-4 rounded-full font-medium ${isDark ? 'border border-white/10 text-white hover:bg-white/5' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>← Back</button>
            <button onClick={async () => { await onImport(preview); onCancel(); }} className="flex-1 h-10 px-4 bg-emerald-500 text-white rounded-full font-medium hover:brightness-110">Import {preview.length} words</button>
          </div>
        </>
      )}
    </Modal>
  );
};

const FillCardsModal = ({ words, onSave, onCancel, isDark = true }) => {
  const [stage, setStage] = useState('initial'); // initial, loading, selecting, filling, done
  const [progress, setProgress] = useState({ current: 0, total: words.length });
  const [lookupResults, setLookupResults] = useState([]); // {word, originalData, apiData, selectedTranslations}
  const [abortController, setAbortController] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const BATCH_SIZE = 10;

  // Stage 1: Lookup words and get translation suggestions
  const startLookup = async () => {
    setStage('loading');
    const controller = { aborted: false };
    setAbortController(controller);
    const results = [];

    for (let i = 0; i < words.length; i++) {
      if (controller.aborted) break;
      setProgress({ current: i + 1, total: words.length });
      const word = words[i];

      try {
        const { data, error } = await supabase.functions.invoke('lookup-word', {
          body: { word: word.word }
        });

        if (!error && data && !data.error) {
          results.push({
            word: word.word,
            originalData: word,
            apiData: data,
            selectedTranslations: new Set(
              // Предвыбираем пользовательский перевод если он есть
              word.meaningRu ? word.meaningRu.split(',').map(t => t.trim().toLowerCase()) : []
            ),
            expanded: false
          });
        } else {
          results.push({
            word: word.word,
            originalData: word,
            apiData: null,
            error: data?.error || error?.message || 'Lookup failed',
            suggestions: data?.suggestions || [],
            selectedTranslations: new Set(),
            expanded: false
          });
        }
      } catch (e) {
        results.push({
          word: word.word,
          originalData: word,
          apiData: null,
          error: e.message,
          selectedTranslations: new Set(),
          expanded: false
        });
      }

      setLookupResults([...results]);
      await new Promise(r => setTimeout(r, 300));
    }

    if (!controller.aborted) {
      setStage('selecting');
    }
  };

  // Toggle translation selection
  const toggleTranslation = (wordIndex, translation) => {
    setLookupResults(prev => {
      const updated = [...prev];
      const item = updated[wordIndex];
      const newSet = new Set(item.selectedTranslations);
      const key = translation.toLowerCase();
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      updated[wordIndex] = { ...item, selectedTranslations: newSet };
      return updated;
    });
  };

  // Toggle expand word
  const toggleExpand = (wordIndex) => {
    setLookupResults(prev => {
      const updated = [...prev];
      updated[wordIndex] = { ...updated[wordIndex], expanded: !updated[wordIndex].expanded };
      return updated;
    });
  };

  // Stage 2: Fill cards with selected data
  const fillCards = () => {
    const filledWords = lookupResults.map(item => {
      const { originalData, apiData, selectedTranslations } = item;

      if (!apiData) {
        return originalData; // Keep original if lookup failed
      }

      // Find selected meanings from API
      const selectedMeanings = (apiData.meanings || []).filter(m =>
        selectedTranslations.has(m.ru?.toLowerCase())
      );

      // Build meaningRu from selections (preserve user's original if exists)
      const userRu = originalData.meaningRu || '';
      const apiRuList = selectedMeanings.map(m => m.ru);
      const allRu = userRu
        ? [...new Set([...userRu.split(',').map(t => t.trim()), ...apiRuList])]
        : apiRuList;
      const meaningRu = allRu.join(', ');

      // Build meaningEn from selected meanings
      const meaningEn = selectedMeanings.map(m => m.meaningEn).filter(Boolean).join('\n') || originalData.meaningEn || '';

      // Build example from selected meanings
      const example = selectedMeanings.map(m => m.example).filter(Boolean).join('\n') || originalData.example || '';

      // Get types from selected meanings
      const types = [...new Set(selectedMeanings.map(m => m.type).filter(Boolean))];
      const type = types.join(', ') || originalData.type || 'phrase';

      return {
        ...originalData,
        type,
        level: apiData.level || originalData.level,
        forms: apiData.phonetic || originalData.forms,
        meaningEn,
        meaningRu,
        example,
        singleRootWords: apiData.singleRootWords || originalData.singleRootWords,
        synonyms: apiData.synonyms || originalData.synonyms
      };
    });

    onSave(filledWords);
    onCancel();
  };

  // Handle close/cancel
  const handleClose = () => {
    if (stage === 'loading') {
      if (abortController) abortController.aborted = true;
      setStage('selecting');
      return;
    }
    if ((stage === 'selecting' || stage === 'loading') && lookupResults.length > 0) {
      setShowConfirm(true);
    } else {
      onCancel();
    }
  };

  // Save partial results
  const savePartial = () => {
    const filledWords = lookupResults.filter(r => r.apiData || r.originalData.meaningRu).map(item => {
      if (!item.apiData) return item.originalData;
      return {
        ...item.originalData,
        level: item.apiData.level || item.originalData.level,
        forms: item.apiData.phonetic || item.originalData.forms
      };
    });
    onSave(filledWords);
    onCancel();
  };

  const successCount = lookupResults.filter(r => r.apiData).length;
  const failedCount = lookupResults.filter(r => !r.apiData && r.error).length;

  return (
    <Modal onClose={handleClose} preventClose wide isDark={isDark}>
      <button onClick={handleClose} className={`absolute top-3 right-3 p-1 rounded ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
        <X size={20} />
      </button>

      {showConfirm && (
        <div className="absolute inset-0 bg-white/95 /95 flex flex-col items-center justify-center rounded-lg z-10">
          <p className="text-lg font-medium mb-4">Закрыть без сохранения?</p>
          <p className="text-gray-600  mb-6">{successCount} слов уже загружено</p>
          <div className="flex gap-3 flex-wrap justify-center">
            <button onClick={() => setShowConfirm(false)} className="px-4 py-2 border  rounded-lg hover:bg-white/5">
              Продолжить
            </button>
            <button onClick={savePartial} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
              Сохранить {successCount}
            </button>
            <button onClick={onCancel} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
              Сбросить всё
            </button>
          </div>
        </div>
      )}

      <h3 className="text-lg font-semibold mb-4 pr-8">📚 Fill Cards ({words.length} words)</h3>

      {stage === 'initial' && (
        <>
          <p className="text-gray-600  mb-4">
            Загрузит данные для {words.length} слов. Вы сможете выбрать нужные переводы.
          </p>
          <div className="max-h-48 overflow-y-auto border  rounded-lg p-3 mb-4 bg-gray-50 ">
            {words.map((w, i) => (
              <div key={i} className="text-sm flex justify-between">
                <span>{w.word}</span>
                {w.meaningRu && <span className="text-blue-400 text-xs">({w.meaningRu})</span>}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 h-10 px-4 border  rounded-lg hover:bg-white/5">Cancel</button>
            <button onClick={startLookup} className="flex-1 h-10 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Start</button>
          </div>
        </>
      )}

      {stage === 'loading' && (
        <>
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600  mb-2">
              <span>Загрузка данных...</span>
              <span>{progress.current}/{progress.total}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto border  rounded-lg mb-4">
            {lookupResults.map((r, i) => (
              <div key={i} className={`p-2 border-b  ${r.apiData ? '' : r.error ? 'bg-red-50 ' : ''}`}>
                <div className="font-medium">{r.word}</div>
                {r.apiData && <div className="text-xs text-green-400">✓ {(r.apiData.meanings || []).length} meanings</div>}
                {r.error && <div className="text-xs text-red-500">✗ {r.error}</div>}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleClose} className="flex-1 h-10 px-4 border  rounded-lg hover:bg-white/5 flex items-center justify-center gap-2">
              <X size={16} /> Stop
            </button>
          </div>
        </>
      )}

      {stage === 'selecting' && (
        <>
          <p className="text-sm text-gray-600  mb-3">
            Выберите переводы для каждого слова. Ваши переводы сохранятся.
          </p>
          <div className="max-h-96 overflow-y-auto border  rounded-lg mb-4">
            {lookupResults.map((r, i) => (
              <div key={i} className={`p-3 border-b  ${r.apiData ? '' : 'bg-red-50 '}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">{r.word}</span>
                    {r.apiData && <span className="ml-2 text-xs text-gray-500">{r.apiData.level} · {r.apiData.phonetic}</span>}
                  </div>
                  {r.apiData && r.apiData.meanings?.length > 3 && (
                    <button onClick={() => toggleExpand(i)} className="text-xs text-blue-500 hover:underline">
                      {r.expanded ? 'Скрыть' : `+${r.apiData.meanings.length - 3} ещё`}
                    </button>
                  )}
                </div>
                {r.originalData.meaningRu && (
                  <div className="text-xs text-purple-400 mb-2">
                    Ваш перевод: {r.originalData.meaningRu}
                  </div>
                )}
                {r.apiData ? (
                  <div className="flex flex-wrap gap-1">
                    {(r.expanded ? r.apiData.meanings : r.apiData.meanings?.slice(0, 3))?.map((m, mi) => (
                      <button
                        key={mi}
                        onClick={() => toggleTranslation(i, m.ru)}
                        title={m.meaningEn}
                        className={`text-xs px-2 py-1 rounded-full border ${r.selectedTranslations.has(m.ru?.toLowerCase())
                          ? 'bg-green-100  text-green-700  border-green-300 '
                          : 'bg-gray-800 text-gray-700  border-gray-300  hover:border-gray-400'
                          }`}
                      >
                        {r.selectedTranslations.has(m.ru?.toLowerCase()) ? '✓ ' : ''}{m.ru}
                        <span className="ml-1 text-gray-400">({m.type})</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-red-500">{r.error}</div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleClose} className="h-10 px-4 border  rounded-lg hover:bg-white/5">Cancel</button>
            {failedCount > 0 && (
              <button onClick={() => { /* retry failed */ }} className="h-10 px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                Retry {failedCount}
              </button>
            )}
            <button onClick={fillCards} className="flex-1 h-10 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600">
              Fill {successCount} Cards
            </button>
          </div>
        </>
      )}
    </Modal>
  );
};

const WordForm = ({ word, allTags, existingWords, sections, onSave, onCancel, onAddTag, onDuplicateFound, isDark = true }) => {
  const [form, setForm] = useState({ ...word, tags: word.tags || [] });
  const [loading, setLoading] = useState(false);
  const [translationsWithExamples, setTranslationsWithExamples] = useState([]);
  const [addedTranslations, setAddedTranslations] = useState(new Set());
  const [hasLookedUp, setHasLookedUp] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [pendingLookup, setPendingLookup] = useState(false);

  const doLookup = async (auto = false) => {
    if (!form.word.trim() || loading) return;
    if (auto && hasLookedUp) return;

    // Проверка дубликата
    const cleaned = form.word.trim().toLowerCase();
    const existingWord = existingWords.find(w => w.word.toLowerCase() === cleaned);

    if (existingWord && existingWord.id !== form.id) {
      const sec = sections.find(s => s.id === existingWord.sectionId);
      const location = sec ? `${sec.collectionName} › ${sec.name}` : 'Unknown section';
      onDuplicateFound(`"${form.word}" already exists in: ${location}`);
      return;
    }

    setLoading(true);
    setLookupError(null);
    setSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke('lookup-word', {
        body: { word: form.word.trim() }
      });

      console.log('=== Lookup result ===');
      console.log('Full data:', data);
      console.log('Error:', error);

      // Проверяем на ошибку (неправильное слово) - сначала data, потом error
      if (data?.error) {
        setLookupError(data.error);
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        }
        setHasLookedUp(true);
        setLoading(false);
        return;
      }

      // Если есть error от supabase - пробуем извлечь данные из error.context
      if (error) {
        // FunctionsHttpError содержит context с ответом сервера
        if (error.context) {
          try {
            const errorBody = await error.context.json();
            console.log('Error body:', errorBody);
            if (errorBody?.error) {
              setLookupError(errorBody.error);
              if (errorBody.suggestions && Array.isArray(errorBody.suggestions)) {
                setSuggestions(errorBody.suggestions);
              }
              setHasLookedUp(true);
              setLoading(false);
              return;
            }
          } catch (parseErr) {
            console.log('Could not parse error context:', parseErr);
          }
        }
        throw error;
      }

      console.log('Type:', data?.type);
      console.log('Level:', data?.level);
      console.log('Meanings:', data?.meanings);

      if (data.meanings && Array.isArray(data.meanings)) {
        // Собираем все уникальные типы из API
        const apiTypes = [...new Set(data.meanings.map(m => m.type).filter(Boolean))];
        const primaryApiType = data.meanings[0]?.type || 'noun';

        // Проверяем кириллицу в meaningEn и собираем переводы пользователя
        const hasCyrillic = /[а-яёА-ЯЁ]/.test(form.meaningEn);
        const userMeaningRu = hasCyrillic
          ? (form.meaningRu ? `${form.meaningRu}, ${form.meaningEn}` : form.meaningEn)
          : form.meaningRu;
        const userTranslationsList = userMeaningRu
          ? userMeaningRu.split(',').map(s => s.trim()).filter(Boolean)
          : [];

        // Объединяем: если "мой" перевод есть в API - берём данные API
        const allMeanings = [...data.meanings];

        userTranslationsList.forEach(userRu => {
          const existsInApi = data.meanings.some(m => m.ru.toLowerCase() === userRu.toLowerCase());
          if (!existsInApi) {
            allMeanings.push({
              ru: userRu,
              meaningEn: '',
              example: '',
              type: primaryApiType,
              isUserAdded: true
            });
          }
        });

        setTranslationsWithExamples(allMeanings);

        // Находим совпадение с API для заполнения meaningEn/example
        const firstMatchingApi = data.meanings.find(m =>
          userTranslationsList.some(u => u.toLowerCase() === m.ru.toLowerCase())
        );

        // Если нет совпадения - берём первый API meaning
        const meaningToUse = firstMatchingApi || data.meanings[0];

        // Помечаем переводы пользователя как добавленные
        if (userTranslationsList.length > 0) {
          setAddedTranslations(new Set(userTranslationsList.map(t => t.toLowerCase())));
        }

        // Обновляем форму ОДИН раз со всеми данными
        setForm(f => ({
          ...f,
          level: data.level || f.level,
          forms: data.phonetic || f.forms,
          singleRootWords: data.singleRootWords || f.singleRootWords,
          synonyms: data.synonyms || f.synonyms,
          // Типы из API
          type: apiTypes.join(', ') || f.type,
          // Переносим кириллицу в meaningRu
          meaningRu: userMeaningRu || f.meaningRu,
          // MeaningEn и example из API (очищаем если была кириллица)
          meaningEn: hasCyrillic ? (meaningToUse?.meaningEn || '') : (f.meaningEn || meaningToUse?.meaningEn || ''),
          example: f.example || meaningToUse?.example || ''
        }));
      }
      setHasLookedUp(true);
    } catch (e) {
      console.error('Lookup error:', e);
      // Пробуем извлечь suggestions из ошибки если они есть
      if (e.context) {
        try {
          const errorBody = await e.context.json();
          if (errorBody?.error) {
            setLookupError(errorBody.error);
            if (errorBody.suggestions && Array.isArray(errorBody.suggestions)) {
              setSuggestions(errorBody.suggestions);
            }
            setLoading(false);
            return;
          }
        } catch {
          // не удалось распарсить
        }
      }
      setLookupError(e.message || 'Failed to lookup word');
    }
    setLoading(false);
  };

  // Авто-lookup при фокусе на поле перевода
  const handleTranslationFocus = () => {
    if (form.word.trim() && !hasLookedUp && translationsWithExamples.length === 0) {
      doLookup(true);
    }
  };

  // Авто-lookup после выбора suggestion
  useEffect(() => {
    if (pendingLookup && form.word && !loading) {
      setPendingLookup(false);
      doLookup(false);
    }
  }, [pendingLookup, form.word, loading]);

  const addTranslation = (t) => {
    // Если уже добавлен - УДАЛЯЕМ
    if (addedTranslations.has(t.toLowerCase())) {
      // Удаляем из meaningRu
      const currentTranslations = form.meaningRu.split(',').map(s => s.trim()).filter(s => s);
      const filtered = currentTranslations.filter(s => s.toLowerCase() !== t.toLowerCase());
      setForm(f => ({ ...f, meaningRu: filtered.join(', ') }));

      // Удаляем из Set
      const newSet = new Set(addedTranslations);
      newSet.delete(t.toLowerCase());
      setAddedTranslations(newSet);

      // При удалении type НЕ меняем - пользователь может убрать вручную кликом
      // Пересобираем meaningEn и example из оставшихся переводов
      if (newSet.size > 0) {
        const remainingTranslations = Array.from(newSet);
        const remainingMeanings = translationsWithExamples.filter(m =>
          remainingTranslations.includes(m.ru.toLowerCase())
        );

        setForm(f => ({
          ...f,
          meaningEn: remainingMeanings.map(m => m.meaningEn).join('\n'),
          example: remainingMeanings.map(m => m.example).filter(Boolean).join('\n')
        }));
      } else {
        // Если не осталось переводов - очищаем meaningEn/example (type оставляем)
        setForm(f => ({ ...f, meaningEn: '', example: '' }));
      }

      return;
    }

    // Добавляем
    const current = form.meaningRu.trim();
    setForm(f => ({ ...f, meaningRu: current ? `${current}, ${t}` : t }));
    setAddedTranslations(prev => new Set([...prev, t.toLowerCase()]));

    // Добавляем meaningEn и example с новой строки
    const meaning = translationsWithExamples.find(m => m.ru === t);
    if (meaning) {
      setForm(f => {
        const currentMeaningEn = f.meaningEn.trim();
        const currentExample = f.example.trim();

        // Добавляем type к существующим (мультивыбор)
        const currentTypes = (f.type || '').split(',').map(s => s.trim()).filter(Boolean);
        const newType = meaning.type;
        let updatedTypes = currentTypes;
        if (newType && !currentTypes.includes(newType)) {
          updatedTypes = [...currentTypes, newType];
        }

        return {
          ...f,
          type: updatedTypes.join(', ') || 'noun',
          meaningEn: currentMeaningEn
            ? `${currentMeaningEn}\n${meaning.meaningEn}`
            : meaning.meaningEn,
          example: currentExample
            ? `${currentExample}\n${meaning.example}`
            : meaning.example
        };
      });
    }
  };

  const isTranslationAdded = (t) => {
    if (!t) return false;
    return addedTranslations.has(t.toLowerCase());
  };

  return (
    <Modal onClose={onCancel} preventClose isDark={isDark}>
      <div style={{ maxHeight: '90vh', overflow: 'auto' }}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{word.id ? 'Edit Word' : 'Add Word'}</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input className={`flex-1 h-10 px-3 rounded-xl ${isDark ? 'bg-[#1a1a1e] border border-white/10 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`} placeholder="Word *" value={form.word} onChange={e => setForm({ ...form, word: e.target.value })} />
            <button onClick={() => doLookup(false)} disabled={loading || !form.word.trim()} className="h-10 px-4 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600">
              {loading ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
            </button>
          </div>

          {/* Показ ошибки и suggestions */}
          {lookupError && (
            <div className="p-3 bg-red-900/30 border border-red-200  rounded-lg">
              <div className="text-red-400 text-sm font-medium">{lookupError}</div>
              {suggestions.length > 0 && (
                <div className="mt-2">
                  <span className="text-sm text-gray-300">Did you mean: </span>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        // Слово было с ошибкой - очищаем все поля и ставим новое слово
                        setForm(f => ({
                          ...f,
                          word: s,
                          meaningEn: '',
                          meaningRu: '',
                          example: '',
                          type: 'noun'
                        }));
                        setLookupError(null);
                        setSuggestions([]);
                        setHasLookedUp(false);
                        setTranslationsWithExamples([]);
                        setAddedTranslations(new Set());
                        // Запустит lookup автоматически через useEffect
                        setPendingLookup(true);
                      }}
                      className="ml-1 text-sm text-blue-600 hover:underline"
                    >
                      {s}{i < suggestions.length - 1 ? ',' : '?'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 flex flex-wrap gap-1">
              {WORD_TYPES.map(t => {
                const types = (form.type || '').split(',').map(s => s.trim()).filter(Boolean);
                const isSelected = types.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        // Убираем тип
                        const newTypes = types.filter(x => x !== t);
                        setForm({ ...form, type: newTypes.join(', ') || 'noun' });
                      } else {
                        // Добавляем тип + подтягиваем данные из первого перевода этого типа
                        const meaningOfType = translationsWithExamples.find(m => m.type === t);
                        const newForm = { ...form, type: [...types, t].join(', ') };
                        if (meaningOfType && meaningOfType.meaningEn) {
                          // Добавляем перевод если ещё не добавлен
                          if (!addedTranslations.has(meaningOfType.ru.toLowerCase())) {
                            const currentRu = form.meaningRu.trim();
                            newForm.meaningRu = currentRu ? `${currentRu}, ${meaningOfType.ru}` : meaningOfType.ru;
                            setAddedTranslations(prev => new Set([...prev, meaningOfType.ru.toLowerCase()]));
                          }
                          // Добавляем meaningEn и example
                          const currentEn = form.meaningEn.trim();
                          const currentEx = form.example.trim();
                          newForm.meaningEn = currentEn
                            ? `${currentEn}\n${meaningOfType.meaningEn}`
                            : meaningOfType.meaningEn;
                          newForm.example = meaningOfType.example
                            ? (currentEx ? `${currentEx}\n${meaningOfType.example}` : meaningOfType.example)
                            : currentEx;
                        }
                        setForm(newForm);
                      }
                    }}
                    className={`px-2 py-1 text-xs rounded-full border transition-colors ${isSelected
                      ? 'bg-pink-vibrant text-white border-pink-vibrant'
                      : isDark ? 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20' : 'bg-gray-100 text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <div className="relative w-20">
              <select className={`w-full h-10 pl-3 pr-8 rounded-xl text-sm appearance-none ${isDark ? 'bg-[#1a1a1e] border border-white/10 text-white hover:bg-[#222226]' : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'}`} value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                {LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>
          </div>
          <input className={`w-full h-10 px-3 rounded-xl focus:outline-none ${isDark ? 'bg-[#1a1a1e] border border-white/10 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`} placeholder="IPA" value={form.forms} onChange={e => setForm({ ...form, forms: e.target.value })} />
          <textarea className={`w-full px-3 py-2 rounded-xl focus:outline-none ${isDark ? 'bg-[#1a1a1e] border border-white/10 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`} placeholder="Meaning (English) *" value={form.meaningEn} onChange={e => setForm({ ...form, meaningEn: e.target.value })} rows={2} />
          <div>
            <div className="relative">
              <input
                className={`w-full h-10 px-3 rounded-xl focus:outline-none ${isDark ? 'bg-[#1a1a1e] border border-white/10 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`}
                placeholder="Перевод"
                value={form.meaningRu}
                onChange={e => setForm({ ...form, meaningRu: e.target.value })}
                onFocus={handleTranslationFocus}
                autoComplete="off"
              />
              {loading && <Loader size={16} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />}
            </div>
            {translationsWithExamples.length > 0 && (
              <div className="mt-2 space-y-2">
                {/* Все переводы группируем по типам */}
                {(() => {
                  // Группируем ВСЕ переводы по типам (включая "мои")
                  const grouped = {};
                  translationsWithExamples.forEach(m => {
                    const type = m.type || 'other';
                    if (!grouped[type]) grouped[type] = [];
                    grouped[type].push(m);
                  });

                  const typeLabels = {
                    noun: { label: 'noun', emoji: '🔵', cls: 'bg-blue-900/50 text-blue-400' },
                    verb: { label: 'verb', emoji: '🔴', cls: 'bg-red-900/50 text-red-400' },
                    adjective: { label: 'adj', emoji: '🟡', cls: 'bg-yellow-900/50 text-yellow-400' },
                    adverb: { label: 'adv', emoji: '🟣', cls: 'bg-purple-900/50 text-purple-400' },
                    other: { label: 'other', emoji: '⚪', cls: 'bg-gray-800 text-gray-400' }
                  };

                  return (
                    <>
                      {/* Все переводы по типам */}
                      {Object.entries(grouped).map(([type, meanings]) => {
                        const info = typeLabels[type] || typeLabels.other;
                        return (
                          <div key={type} className="flex flex-wrap items-center gap-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${info.cls}`}>
                              {info.emoji} {info.label}
                            </span>
                            {meanings.map((m, idx) => (
                              <button
                                key={`${type}-${idx}`}
                                onClick={() => addTranslation(m.ru)}
                                title={m.meaningEn || (m.isUserAdded ? 'Мой перевод' : '')}
                                className={`text-sm px-3 py-1 rounded-full transition-colors ${isTranslationAdded(m.ru)
                                  ? isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-green-100 text-green-700 border border-green-300'
                                  : isDark ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                              >
                                {isTranslationAdded(m.ru) ? '✓ ' : ''}{m.isUserAdded ? '★ ' : ''}{m.ru}
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          <textarea className={`w-full px-3 py-2 rounded-xl focus:outline-none ${isDark ? 'bg-[#1a1a1e] border border-white/10 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`} placeholder="Example" value={form.example} onChange={e => setForm({ ...form, example: e.target.value })} rows={2} />
          <textarea className={`w-full px-3 py-2 rounded-xl focus:outline-none ${isDark ? 'bg-amber-900/20 border border-amber-500/20 text-white placeholder-gray-500' : 'bg-amber-50 border border-amber-200 text-gray-900 placeholder-gray-400'}`} placeholder="My example" value={form.myExample || ''} onChange={e => setForm({ ...form, myExample: e.target.value })} rows={2} />
          <input className={`w-full h-10 px-3 rounded-xl focus:outline-none ${isDark ? 'bg-purple-900/20 border border-purple-500/20 text-white placeholder-gray-500' : 'bg-purple-50 border border-purple-200 text-gray-900 placeholder-gray-400'}`} placeholder="Single-root words (e.g., teach, teacher, teaching)" value={form.singleRootWords || ''} onChange={e => setForm({ ...form, singleRootWords: e.target.value })} />
          <input className={`w-full h-10 px-3 rounded-xl focus:outline-none ${isDark ? 'bg-blue-900/20 border border-blue-500/20 text-white placeholder-gray-500' : 'bg-blue-50 border border-blue-200 text-gray-900 placeholder-gray-400'}`} placeholder="Synonyms (e.g., big, large, huge)" value={form.synonyms || ''} onChange={e => setForm({ ...form, synonyms: e.target.value })} />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className={`flex-1 h-10 px-4 rounded-full font-medium ${isDark ? 'border border-white/10 text-white hover:bg-white/5' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
          <button onClick={() => form.word && form.meaningEn && onSave(form)} disabled={!form.word || !form.meaningEn} className="flex-1 h-10 px-4 bg-pink-vibrant text-white rounded-full font-medium disabled:opacity-50 hover:brightness-110">Save</button>
        </div>
      </div>
    </Modal>
  );
};

const SongAnalyzer = ({ song, sections, collections, existingWords, onAddWords, onCreateSection, onUnsavedChange, onClose, isDark = true }) => {
  const [selected, setSelected] = useState([]);
  const [wordSections, setWordSections] = useState({});
  const [checkedWords, setCheckedWords] = useState([]);
  const [popup, setPopup] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [showExp, setShowExp] = useState(false);
  const [loadingExp, setLoadingExp] = useState(false);
  const [hoveredWord, setHoveredWord] = useState(null);
  const [showNewSection, setShowNewSection] = useState(null);
  const [alert, setAlert] = useState(null);
  // Кэш переводов - сохраняем уже подтянутые значения
  const [translationCache, setTranslationCache] = useState({});
  useEffect(() => {
    if (song.explanation) {
      setExplanation(song.explanation);
    }
  }, [song.id]);

  useEffect(() => {
    if (onUnsavedChange) {
      onUnsavedChange(selected.length > 0);
    }
  }, [selected.length, onUnsavedChange]);

  const existingSet = useMemo(() => new Set(existingWords.map(w => w.word.toLowerCase())), [existingWords]);

  const complexWordsMap = useMemo(() => {
    const map = new Map();
    existingWords.filter(w => w.word.includes(' ')).forEach(w => {
      w.word.toLowerCase().split(/\s+/).forEach(part => {
        const clean = part.replace(/[^a-z]/g, '');
        if (clean.length >= 6) {
          if (!map.has(clean)) map.set(clean, []);
          const sec = sections.find(s => s.id === w.sectionId);
          map.get(clean).push({ phrase: w.word, translation: w.meaningRu || '', section: sec?.name || '', collection: sec?.collectionName || '' });
        }
      });
    });
    return map;
  }, [existingWords, sections]);

  useEffect(() => { const h = e => { if (popup && !e.target.closest('.song-popup')) setPopup(null); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, [popup]);

  const explainSong = async () => {
    if (explanation) { setShowExp(!showExp); return; }
    setShowExp(true); setLoadingExp(true);
    try {
      const { data, error } = await supabase.functions.invoke('song-helper', {
        body: { action: 'explain', title: song.title, text: song.text }
      });
      if (!error && data) {
        const result = data.result || '';
        setExplanation(result);

        // Сохраняем в базу
        await supabase
          .from('songs')
          .update({ explanation: result })
          .eq('id', song.id);
      }
    } catch (e) {
      setExplanation('Error');
    }
    setLoadingExp(false);
  };

  const handleSelection = async () => {
    const sel = window.getSelection();
    const txt = sel.toString().trim();
    if (!txt || txt.length < 2) { setPopup(null); return; }

    const cleaned = txt.toLowerCase().replace(/[.,!?;:()"'\-–—\n]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned.length < 2) { setPopup(null); return; }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const wordExists = existingSet.has(cleaned);

    if (wordExists) {
      const existingWord = existingWords.find(w => w.word.toLowerCase() === cleaned);
      const translation = existingWord?.meaningRu || 'No translation';
      setPopup({
        word: cleaned,
        original: txt,
        translation,
        pos: { x: rect.left + rect.width / 2, y: rect.top - 10 },
        isExisting: true,
        isSelected: selected.includes(cleaned)
      });
      return;
    }

    // Проверяем кэш
    if (translationCache[cleaned]) {
      setPopup({
        word: cleaned,
        original: txt,
        translation: translationCache[cleaned],
        pos: { x: rect.left + rect.width / 2, y: rect.top - 10 },
        isExisting: false,
        isSelected: selected.includes(cleaned)
      });
      return;
    }

    setPopup({
      word: cleaned,
      original: txt,
      translation: '...',
      pos: { x: rect.left + rect.width / 2, y: rect.top - 10 },
      isExisting: false,
      isSelected: selected.includes(cleaned)
    });

    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('song-helper', {
        body: { action: 'translate', word: cleaned }
      });

      if (!error && data) {
        const translation = (data.result || '').trim();
        setTranslationCache(prev => ({ ...prev, [cleaned]: translation }));
        setPopup(p => p ? { ...p, translation } : null);
      }
    } catch (e) {
      setPopup(p => p ? { ...p, translation: 'Error' } : null);
    }
    setTranslating(false);
  };

  const addToList = w => {
    if (existingSet.has(w)) {
      const existingWord = existingWords.find(word => word.word.toLowerCase() === w);
      if (existingWord) {
        const sec = sections.find(s => s.id === existingWord.sectionId);
        const location = sec ? `${sec.collectionName} › ${sec.name}` : 'Unknown section';
        setAlert(`"${w}" already exists in: ${location}`);
      } else {
        setAlert(`"${w}" already exists in vocabulary`);
      }
      setPopup(null);
      window.getSelection().removeAllRanges();
      return;
    }
    if (selected.includes(w)) {
      setAlert(`"${w}" already in selection list`);
      setPopup(null);
      window.getSelection().removeAllRanges();
      return;
    }
    setSelected([...selected, w]);
    setWordSections({ ...wordSections, [w]: sections[0]?.id || '' });
    setPopup(null);
    window.getSelection().removeAllRanges();
  };

  const removeFromList = w => { setSelected(selected.filter(x => x !== w)); setCheckedWords(checkedWords.filter(x => x !== w)); const ns = { ...wordSections }; delete ns[w]; setWordSections(ns); };
  const toggleCheck = w => setCheckedWords(checkedWords.includes(w) ? checkedWords.filter(x => x !== w) : [...checkedWords, w]);
  const toggleCheckAll = () => setCheckedWords(checkedWords.length === selected.length ? [] : [...selected]);

  const handleSectionChange = (word, value) => {
    if (value === 'new') setShowNewSection({ forWord: word });
    else setWordSections({ ...wordSections, [word]: value });
  };

  const handleBulkSectionChange = value => {
    if (value === 'new') setShowNewSection({ forChecked: true });
    else { const u = {}; checkedWords.forEach(w => u[w] = value); setWordSections({ ...wordSections, ...u }); }
  };

  const addSelectedWords = () => {
    const toAdd = selected.filter(w => wordSections[w] && !existingSet.has(w));

    const duplicates = selected.filter(w => existingSet.has(w));
    if (duplicates.length > 0) {
      const dupInfo = duplicates.map(w => {
        const existingWord = existingWords.find(word => word.word.toLowerCase() === w);
        if (existingWord) {
          const sec = sections.find(s => s.id === existingWord.sectionId);
          const location = sec ? `${sec.collectionName} › ${sec.name}` : 'Unknown';
          return `"${w}" (${location})`;
        }
        return `"${w}"`;
      }).join(', ');
      setAlert(`Already exists: ${dupInfo}`);
    }

    if (!toAdd.length) {
      if (duplicates.length === 0) {
        setAlert('Select sections for words');
      }
      setSelected(selected.filter(w => !existingSet.has(w)));
      setCheckedWords(checkedWords.filter(w => !existingSet.has(w)));
      return;
    }

    onAddWords(toAdd.map((w, i) => ({ id: Date.now() + i, sectionId: wordSections[w], word: w, type: 'word', level: 'B1', forms: '', meaningEn: '', meaningRu: '', example: '', myExample: '', singleRootWords: '', synonyms: '', tags: [song.title.toLowerCase().replace(/\s+/g, '-')], status: STATUS.NEW, passedModes: [] })));
    setSelected([]); setWordSections({}); setCheckedWords([]);
    if (onUnsavedChange) {
      onUnsavedChange(false);
    }
  };

  const isWordMatch = (textWord, dictWord) => {
    const tl = textWord.toLowerCase();
    const dl = dictWord.toLowerCase();
    if (tl === dl) return true;
    if (tl.length >= 4 && dl.length >= 4) {
      if (tl.startsWith(dl) || dl.startsWith(tl)) return true;
    }
    return false;
  };

  const findMatchingWords = (textWord) => {
    const matches = [];
    const existingWordsLower = existingWords.map(w => w.word.toLowerCase());
    for (const existWord of existingWordsLower) {
      if (isWordMatch(textWord, existWord)) {
        const found = existingWords.find(w => w.word.toLowerCase() === existWord);
        if (found && !matches.find(m => m.word === found.word)) {
          const sec = sections.find(s => s.id === found.sectionId);
          matches.push({
            word: found.word,
            forms: found.forms || '',
            translation: found.meaningRu || '',
            section: sec?.name || '',
            collection: sec?.collectionName || ''
          });
        }
      }
    }
    return matches;
  };

  const isSelectedMatch = (textWord) => {
    return selected.some(sel => isWordMatch(textWord, sel));
  };

  const highlightText = () => {
    const result = []; let i = 0; const text = song.text;
    const existingWordsLower = existingWords.map(w => w.word.toLowerCase());

    while (i < text.length) {
      let matched = false;

      for (const sel of selected.filter(s => s.includes(' ')).sort((a, b) => b.length - a.length)) {
        const remaining = text.slice(i).toLowerCase();
        const cleanRemaining = remaining.replace(/^[^a-z]+/, '');
        if (cleanRemaining.startsWith(sel)) {
          const startOffset = remaining.length - cleanRemaining.length;
          result.push(<span key={i}>{text.slice(i, i + startOffset)}</span>);
          result.push(<span key={i + startOffset} className={`px-1 py-0.5 rounded font-medium ${isDark ? 'bg-pink-vibrant/20 text-pink-vibrant' : 'bg-pink-500/15 text-pink-600'}`}>{text.slice(i + startOffset, i + startOffset + sel.length)}</span>);
          i += startOffset + sel.length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        for (const exist of existingWordsLower.filter(w => w.includes(' ')).sort((a, b) => b.length - a.length)) {
          const remaining = text.slice(i).toLowerCase();
          const cleanRemaining = remaining.replace(/^[^a-z]+/, '');
          if (cleanRemaining.startsWith(exist)) {
            const startOffset = remaining.length - cleanRemaining.length;
            const matches = findMatchingWords(exist);
            result.push(<span key={i}>{text.slice(i, i + startOffset)}</span>);
            result.push(
              <span
                key={i + startOffset}
                className={`border-b-2 border-dashed cursor-help transition-colors ${isDark ? 'border-emerald-400/50 text-emerald-400 hover:text-emerald-300 hover:border-emerald-300' : 'border-emerald-500/50 text-emerald-600 hover:text-emerald-500 hover:border-emerald-400'}`}
                onMouseEnter={e => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setHoveredWord({
                    matches,
                    phonetic: matches[0]?.forms || '',  // ← ДОБАВЛЕНО
                    translation: matches[0]?.translation || '',  // ← ДОБАВЛЕНО
                    pos: { x: r.left + r.width / 2, y: r.top }
                  });
                }}
                onMouseLeave={() => setHoveredWord(null)}
              >
                {text.slice(i + startOffset, i + startOffset + exist.length)}
              </span>
            );
            i += startOffset + exist.length;
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        const char = text[i];
        if (char.match(/[a-zA-Z]/)) {
          let end = i; while (end < text.length && text[end].match(/[a-zA-Z]/)) end++;
          const word = text.slice(i, end); const cleaned = word.toLowerCase();
          const isSelected = isSelectedMatch(cleaned);
          const matches = findMatchingWords(cleaned);
          const isComplexFromPhrase = complexWordsMap.has(cleaned) && matches.length === 0;

          if (isSelected) {
            result.push(<span key={i} className={`px-1 py-0.5 rounded font-medium ${isDark ? 'bg-pink-vibrant/20 text-pink-vibrant' : 'bg-pink-500/15 text-pink-600'}`}>{word}</span>);
          } else if (matches.length > 0) {
            result.push(
              <span
                key={i}
                className={`border-b-2 border-dashed cursor-help transition-colors ${isDark ? 'border-emerald-400/50 text-emerald-400 hover:text-emerald-300 hover:border-emerald-300' : 'border-emerald-500/50 text-emerald-600 hover:text-emerald-500 hover:border-emerald-400'}`}
                onMouseEnter={e => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setHoveredWord({
                    matches,
                    phonetic: matches[0]?.forms || '',
                    translation: matches[0]?.translation || '',
                    pos: { x: r.left + r.width / 2, y: r.top }
                  });
                }}
                onMouseLeave={() => setHoveredWord(null)}
              >
                {word}
              </span>
            );
          }
          else if (isComplexFromPhrase) {
            result.push(
              <span key={i} className={`border-b border-dotted cursor-help transition-colors ${isDark ? 'border-white/40 text-white/80 hover:text-white hover:border-white/60' : 'border-black/30 text-gray-600 hover:text-gray-900 hover:border-black/50'}`}
                onMouseEnter={e => { const r = e.currentTarget.getBoundingClientRect(); setHoveredWord({ word: cleaned, phrases: complexWordsMap.get(cleaned), pos: { x: r.left + r.width / 2, y: r.top } }); }}
                onMouseLeave={() => setHoveredWord(null)}
              >{word}</span>
            );
          } else {
            result.push(<span key={i}>{word}</span>);
          }
          i = end;
        } else { result.push(<span key={i}>{char}</span>); i++; }
      }
    }
    return <div className="whitespace-pre-wrap leading-relaxed select-text" onMouseUp={handleSelection}>{result}</div>;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{song.title}</h2>
        <div className="flex gap-2">
          {onClose && <button onClick={onClose} className={`px-4 py-2.5 rounded-full font-medium transition-colors ${isDark ? 'bg-white/[0.06] text-white/80 hover:bg-white/[0.1] border border-white/[0.08]' : 'bg-white text-gray-700 hover:bg-gray-50 border border-black/[0.08] shadow-sm'}`}>← Back</button>}
          <button
            onClick={explainSong}
            className="px-4 py-2.5 bg-pink-vibrant text-white rounded-full font-medium hover:brightness-110 flex items-center gap-2 transition-all"
          >
            {loadingExp ? <Loader size={16} className="animate-spin" /> : '💡'}
            {explanation ? (showExp ? 'Hide' : 'Show') + ' Explanation' : 'Explain Song'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
        <div className={`dash-card flex-1 min-h-0 flex flex-col relative text-left`}>
          <div className={`text-xs mb-3 flex-shrink-0 font-medium ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Select text to see translation and add words</div>
          <div className={`text-lg leading-relaxed p-4 rounded-2xl flex-1 overflow-y-auto min-h-0 whitespace-pre-wrap ${isDark ? 'bg-[#141417] text-white/95' : 'bg-gray-50 text-gray-900'}`}>{highlightText()}</div>

        </div>

        {hoveredWord && (
          <div className={`fixed rounded-2xl shadow-2xl p-4 z-[200] min-w-48 max-w-xs animate-scaleIn pointer-events-none border ${isDark ? 'bg-[#1a1a1e]/95 backdrop-blur-xl text-white border-white/10' : 'bg-white/95 backdrop-blur-xl text-gray-900 border-black/10 shadow-lg'}`} style={{ left: hoveredWord.pos.x, top: Math.max(hoveredWord.pos.y - 10, 80), transform: 'translate(-50%, -100%)' }}>
            {hoveredWord.phrases ? (
              <>
                <div className="font-bold mb-1">{hoveredWord.word}</div>
                <div className={`text-xs mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Part of {hoveredWord.phrases.length} phrase(s):</div>
                {hoveredWord.phrases.map((p, i) => (
                  <div key={i} className={`text-sm border-t pt-1 mt-1 ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                    <div className="font-semibold">{p.phrase}</div>
                    {p.translation && <div className={isDark ? 'text-blue-300' : 'text-blue-600'}>→ {p.translation}</div>}
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{p.collection} › {p.section}</div>
                  </div>
                ))}
              </>
            ) : hoveredWord.matches ? (
              hoveredWord.matches.map((m, idx) => (
                <div key={idx} className={idx > 0 ? `border-t mt-2 pt-2 ${isDark ? 'border-gray-600' : 'border-gray-200'}` : ''}>
                  <div className="font-bold mb-1">{m.word}</div>
                  {m.forms && <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{m.forms}</div>}
                  {m.translation && <div className={`text-sm font-medium mb-1 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>→ {m.translation}</div>}
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{m.collection} › {m.section}</div>
                </div>
              ))
            ) : null}
          </div>
        )}
        {popup && (
          <div className={`song-popup fixed rounded-2xl shadow-2xl p-4 z-[200] min-w-48 animate-scaleIn border ${isDark ? 'bg-[#1a1a1e]/95 backdrop-blur-xl text-white border-white/10' : 'bg-white/95 backdrop-blur-xl text-gray-900 border-black/10 shadow-lg'}`} style={{ left: popup.pos.x, top: Math.max(popup.pos.y - 10, 80), transform: 'translate(-50%, -100%)' }}>
            <div className="font-bold">{popup.original}</div>
            <div className={`text-sm mb-2 font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>→ {translating ? <Loader size={14} className="inline animate-spin" /> : popup.translation}</div>
            {existingSet.has(popup.word) ? (
              <>
                {(() => {
                  const existingWord = existingWords.find(w => w.word.toLowerCase() === popup.word);
                  if (existingWord) {
                    const sec = sections.find(s => s.id === existingWord.sectionId);
                    const location = sec ? `${sec.collectionName} › ${sec.name}` : 'Unknown';
                    return <div className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1.5 rounded-lg border border-emerald-200 mt-2">✓ In vocabulary: <span className="font-bold">{location}</span></div>;
                  }
                  return <div className={`text-xs px-2 py-1.5 rounded-lg mt-2 ${isDark ? 'text-gray-300 bg-gray-800' : 'text-gray-600 bg-gray-100'}`}>✓ Already in vocabulary</div>;
                })()}
              </>
            ) : selected.includes(popup.word) ? (
              <button onClick={() => removeFromList(popup.word)} className={`w-full px-3 py-2 mt-2 rounded-xl text-sm font-semibold transition-colors ${isDark ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>✗ Remove from list</button>
            ) : (
              <button onClick={() => addToList(popup.word)} className="w-full px-3 py-2 mt-2 bg-pink-vibrant text-white rounded-xl text-sm font-semibold hover:brightness-110 transition-colors shadow-md shadow-pink-500/20">+ Add to list</button>
            )}
          </div>
        )}

        {selected.length > 0 && (
          <div className="dash-card flex-shrink-0 max-h-64 overflow-y-auto">
            <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Selected ({selected.length})</h3>
              <div className="flex items-center gap-2">
                {checkedWords.length > 0 && <select onChange={e => handleBulkSectionChange(e.target.value)}
                  className={`h-10 pl-3 pr-8 rounded-xl text-sm appearance-none ${isDark ? 'bg-[#1a1a1e] border border-white/10 text-white' : 'bg-white border border-gray-300 text-gray-900'}`} defaultValue=""><option value="" className={isDark ? 'bg-[#1a1a1e]' : ''}>Set section for {checkedWords.length}...</option>{sections.map(s => <option key={s.id} value={s.id} className={isDark ? 'bg-[#1a1a1e]' : ''}>{s.collectionName} › {s.name}</option>)}<option value="new" className={isDark ? 'bg-[#1a1a1e]' : ''}>+ New Section</option></select>


                }
                <button onClick={addSelectedWords} className="px-4 py-2.5 bg-mint-vibrant text-white font-medium rounded-full hover:brightness-110 hover:shadow-lg transition-all text-sm">Add to vocabulary</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={`border-b ${isDark ? 'bg-white/[0.03] border-white/[0.06] text-white/50' : 'bg-black/[0.02] border-black/[0.06] text-gray-500'}`}><tr><th className="p-2 text-left w-10"><input type="checkbox" checked={checkedWords.length === selected.length && selected.length > 0} onChange={toggleCheckAll} className="rounded accent-pink-500" /></th><th className="p-2 text-left">Word/Phrase</th><th className="p-2 text-left">Section</th></tr></thead>
                <tbody>{selected.map(w => (
                  <tr key={w} className={`border-b ${isDark ? 'border-white/[0.04] hover:bg-white/[0.03] text-white/90' : 'border-black/[0.04] hover:bg-black/[0.02] text-gray-800'}`}>
                    <td className="p-2"><input type="checkbox" checked={checkedWords.includes(w)} onChange={() => toggleCheck(w)} /></td>
                    <td className="p-2 font-medium">{w}</td>
                    <td className="p-2">

                      <div className="flex items-center justify-between gap-2">
                        <div className="relative flex-1">
                          <select
                            value={wordSections[w] || ''}
                            onChange={e => { if(e.target.value === 'new') setShowNewSection({ forWord: w }); else setWordSections({ ...wordSections, [w]: e.target.value }); }}
                            className={`w-full h-9 pl-3 pr-8 rounded-xl text-sm appearance-none ${isDark ? 'bg-[#1a1a1e] border border-white/10 text-white' : 'bg-white border border-gray-300 text-gray-900'}`}
                          >
                            <option value="" className={isDark ? 'bg-[#1a1a1e]' : ''}>Select section...</option>
                            {sections.map(s => <option key={s.id} value={s.id} className={isDark ? 'bg-[#1a1a1e]' : ''}>{s.collectionName} › {s.name}</option>)}
                            <option value="new" className={isDark ? 'bg-[#1a1a1e]' : ''}>+ New Section</option>
                          </select>
                          <div className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        </div>
                        <button onClick={() => removeFromList(w)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'}`}><Trash2 size={14} /></button>
                      </div>


                    </td>





                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showNewSection && (
        <Modal onClose={() => setShowNewSection(null)} isDark={isDark}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Create New Section</h3>
          <div className="relative mb-3">
            <select id="new-sec-col" className={`w-full h-10 pl-3 pr-8 rounded-xl text-sm appearance-none ${isDark ? 'bg-[#1a1a1e] border border-white/10 text-white' : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'}`}>{collections.map(c => <option key={c.id} value={c.id} className={isDark ? 'bg-[#1a1a1e]' : ''}>{c.name}</option>)}</select>
            <div className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </div>
          <input id="new-sec-name" placeholder="Section name" className={`w-full h-10 px-3 rounded-xl focus:outline-none mb-4 ${isDark ? 'bg-[#1a1a1e] border border-white/10 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`} />
          <div className="flex gap-2">
            <button onClick={() => setShowNewSection(null)} className={`flex-1 h-10 px-4 border rounded-full ${isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
            <button onClick={async () => {
              const colId = document.getElementById('new-sec-col').value;
              const name = document.getElementById('new-sec-name').value;
              if (!name.trim()) return;
              const newId = await onCreateSection(colId, name);
              if (showNewSection.forChecked) { const u = {}; checkedWords.forEach(w => u[w] = newId); setWordSections({ ...wordSections, ...u }); }
              else if (showNewSection.forWord) setWordSections({ ...wordSections, [showNewSection.forWord]: newId });
              setShowNewSection(null);
            }} className="flex-1 h-10 px-4 bg-pink-vibrant text-white rounded-full font-medium hover:brightness-110">Create</button>
          </div>
        </Modal>
      )}
      {alert && <Alert message={alert} onClose={() => setAlert(null)} isDark={isDark} />}
      {showExp && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] transition-opacity" onClick={() => setShowExp(false)}></div>
          <div className={`fixed inset-y-0 right-0 w-[45vw] p-8 shadow-2xl z-[610] overflow-y-auto animate-slideInRight ${isDark ? 'bg-[#131315] border-l border-white/10' : 'bg-white border-l border-black/10'}`}>
            <div className={`flex justify-between items-center mb-8 border-b pb-4 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
              <h3 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Song Explanation</h3>
              <button onClick={() => setShowExp(false)} className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-black/5 text-gray-400 hover:text-gray-900'}`}>
                <X size={24} />
              </button>
            </div>
            {loadingExp ? (
              <div className="flex items-center justify-center py-24">
                <Loader size={48} className={`animate-spin ${isDark ? 'text-pink-500' : 'text-pink-500'}`} />
              </div>
            ) : (
              <div className={`whitespace-pre-wrap text-base leading-relaxed ${isDark ? 'text-white/80' : 'text-gray-800'}`}>{explanation}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const SongModal = ({ song, folderId, onSave, onUpdateSong, onCancel, isDark = true }) => {
  const [title, setTitle] = useState(song?.title || '');
  const [text, setText] = useState(song?.text || '');

  const handleSave = () => {
    const sd = { title, text };
    if (song?.id) {
      const u = { ...song, ...sd };
      onUpdateSong(u);
    } else {
      const n = { ...sd, folderId: folderId || 'sf1' };
      onSave(n);
    }
    onCancel();
  };

  return (
    <Modal onClose={onCancel} preventClose medium isDark={isDark}>
      <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{song?.id ? 'Edit Song' : 'Add Song'}</h3>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Song title *" className={`w-full h-10 px-3 rounded-xl focus:outline-none mb-3 ${isDark ? 'bg-[#1a1a1e] border border-white/10 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`} />
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste lyrics..." className={`w-full px-3 py-2 rounded-xl focus:outline-none h-64 mb-3 ${isDark ? 'bg-[#1a1a1e] border border-white/10 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`} />
      <div className="flex gap-2"><button onClick={onCancel} className={`flex-1 h-10 px-4 rounded-full font-medium ${isDark ? 'border border-white/10 text-white hover:bg-white/5' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancel</button><button onClick={handleSave} disabled={!title.trim() || !text.trim()} className="flex-1 h-10 px-4 bg-pink-vibrant text-white rounded-full font-medium disabled:opacity-50 hover:brightness-110">Save</button></div>
    </Modal>
  );
};




function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else setMessage('✅ Check your email to confirm!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-800">
        <h1 className="text-3xl font-bold text-orange-400 mb-6 text-center">VocabMaster</h1>
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-700 rounded-xl bg-[#0f0f0f] text-gray-100 placeholder-gray-500 focus:border-orange-500 focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-700 rounded-xl bg-[#0f0f0f] text-gray-100 placeholder-gray-500 focus:border-orange-500 focus:outline-none"
            required
            minLength={6}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50 font-medium transition-colors"
          >
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="w-full mt-4 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
        {message && (
          <p className={`mt-4 text-sm text-center ${message.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default function VocabApp() {

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [data, setData] = useState(initialData);
  const [currentCollection, setCurrentCollection] = useState(null);
  const [currentSection, setCurrentSection] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [view, setView] = useState(() => {
    try {
      const saved = localStorage.getItem('vocabmaster_state');
      if (saved) {
        const state = JSON.parse(saved);
        return state.view || 'dashboard';
      }
    } catch (e) {
      console.error('Failed to load view:', e);
    }
    return 'dashboard';
  });
  const [stateRestored, setStateRestored] = useState(false);
  const [modal, setModal] = useState({ type: null, data: null });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [deletedItem, setDeletedItem] = useState(null);
  const [expandedCollections, setExpandedCollections] = useState(() => {
    try {
      const saved = localStorage.getItem('vocabmaster_state');
      if (saved) {
        const state = JSON.parse(saved);
        return state.expandedCollections || ['c1'];
      }
    } catch (e) { }
    return ['c1'];
  });

  const [expandedSongFolders, setExpandedSongFolders] = useState(() => {
    try {
      const saved = localStorage.getItem('vocabmaster_state');
      if (saved) {
        const state = JSON.parse(saved);
        return state.expandedSongFolders || ['sf1'];
      }
    } catch (e) { }
    return ['sf1'];
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activityData, setActivityData] = useState([]);
  const [userGoals, setUserGoals] = useState({ daily_new_words: 5, daily_review_words: 10 });
  const [streak, setStreak] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('vocabmaster_theme') || 'light');
  const [cardSession, setCardSession] = useState(null);
  const [quizSession, setQuizSession] = useState(null);
  const [writeSession, setWriteSession] = useState(null);
  const [hasUnsavedWords, setHasUnsavedWords] = useState(false);
  const [alert, setAlert] = useState(null);
  const [viewTitle, setViewTitle] = useState('All Words');
  const [wordPopup, setWordPopup] = useState(null);
  const [cardPopup, setCardPopup] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Применение темы - v2
  useEffect(() => {
    console.log('[THEME v2] Applying:', theme);
    localStorage.setItem('vocabmaster_theme', theme);

    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Принудительно убираем/добавляем класс
    document.documentElement.classList.remove('dark');
    if (isDark) {
      document.documentElement.classList.add('dark');
    }

    console.log('[THEME v2] isDark:', isDark, 'classes:', document.documentElement.className);
  }, [theme]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowUserMenu(false);
  };

  const handleChangePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setToast({ message: error.message, canUndo: false });
    } else {
      setToast({ message: 'Password updated!', canUndo: false });
      setModal({ type: null, data: null });
    }
  };

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        // Загружаем коллекции с секциями
        const { data: collections } = await supabase
          .from('collections')
          .select('*, sections(*)')
          .order('created_at');

        console.log('Loaded collections:', collections);
        // Загружаем слова
        const { data: wordsData } = await supabase
          .from('words')
          .select('*')
          .order('created_at');

        // Конвертируем snake_case в camelCase
        const words = (wordsData || []).map(w => ({
          id: w.id,
          sectionId: w.section_id,
          word: w.word,
          type: w.type,
          level: w.level,
          forms: w.forms,
          meaningEn: w.meaning_en,
          meaningRu: w.meaning_ru,
          example: w.example,
          myExample: w.my_example,
          singleRootWords: w.single_root_words,
          synonyms: w.synonyms,
          tags: w.tags,
          status: w.status,
          passedModes: w.passed_modes
        }));

        // Загружаем папки песен
        const { data: songFolders } = await supabase
          .from('song_folders')
          .select('*')
          .order('created_at');

        // Загружаем песни
        // Загружаем песни
        const { data: songsData } = await supabase
          .from('songs')
          .select('*')
          .order('created_at');

        // Конвертируем snake_case в camelCase
        const songs = (songsData || []).map(s => ({
          id: s.id,
          folderId: s.folder_id,
          title: s.title,
          text: s.text,
          explanation: s.explanation
        }));

        // Загружаем активность (последние 90 дней)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const { data: activityRows } = await supabase
          .from('activity_log')
          .select('*')
          .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
          .order('date');

        if (activityRows) {
          setActivityData(activityRows);
          // Считаем streak
          let currentStreak = 0;
          const today = new Date().toISOString().split('T')[0];
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

          for (let i = activityRows.length - 1; i >= 0; i--) {
            const a = activityRows[i];
            const newPct = a.goal_new > 0 ? a.new_words_learned / a.goal_new : 1;
            const reviewPct = a.goal_review > 0 ? a.words_reviewed / a.goal_review : 1;
            if ((newPct >= 1 && reviewPct >= 1) || a.date === today || a.date === yesterday) {
              if (newPct >= 1 && reviewPct >= 1) currentStreak++;
              else if (a.date !== today) break;
            } else {
              break;
            }
          }
          setStreak(currentStreak);
        }

        // Загружаем цели пользователя
        const { data: goalsData } = await supabase
          .from('user_goals')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (goalsData) {
          setUserGoals({
            daily_new_words: goalsData.daily_new_words || 5,
            daily_review_words: goalsData.daily_review_words || 10
          });
        }

        setData({
          collections: collections || [],
          words: words || [],
          allTags: [],
          songFolders: songFolders || [],
          songs: songs || []
        });

        console.log('State updated!');

      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
    })();
  }, [user]);

  // Загрузка сохранённого состояния
  useEffect(() => {
    if (!user) return;
    console.log('=== Loading saved state ===');

    try {
      const saved = localStorage.getItem('vocabmaster_state');
      console.log('Saved state:', saved);

      if (saved) {
        const state = JSON.parse(saved);

        console.log('Parsed state:', state);
        if (state.view) setView(state.view);
        console.log('Setting view to:', state.view);

        if (state.expandedCollections) setExpandedCollections(state.expandedCollections);
        if (state.expandedSongFolders) setExpandedSongFolders(state.expandedSongFolders);
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
  }, [user]);

  // Сохранение состояния при изменениях
  useEffect(() => {
    if (!user) return;

    const state = {
      view,
      expandedCollections,
      expandedSongFolders,
      currentCollectionId: currentCollection?.id || null,
      currentSectionId: currentSection?.id || null,
      currentSongId: currentSong?.id || null
    };
    console.log('=== Saving state ===', state);
    localStorage.setItem('vocabmaster_state', JSON.stringify(state));
  }, [user, view, expandedCollections, expandedSongFolders, currentCollection, currentSection, currentSong]);



  // Обновлени текущей коллекции/секциии/песни после загрузки данных
  useEffect(() => {
    if (!user || isLoading) return;

    console.log('=== Restoring current items ===');
    console.log('Collections available:', data.collections.map(c => c.id));

    try {
      const saved = localStorage.getItem('vocabmaster_state');
      if (saved) {
        const state = JSON.parse(saved);
        console.log('State to restore:', state);

        let restoredCollection = false;
        let restoredSection = false;

        if (state.currentCollectionId) {
          const col = data.collections.find(c => c.id === state.currentCollectionId);
          console.log('Looking for collection:', state.currentCollectionId, 'Found:', col?.name);
          if (col) {
            setCurrentCollection(col);
            restoredCollection = true;
          }
        }
        if (state.currentSectionId) {
          const sections = data.collections.flatMap(c => c.sections);
          console.log('Sections available:', sections.map(s => s.id));
          const sec = sections.find(s => s.id === state.currentSectionId);
          console.log('Looking for section:', state.currentSectionId, 'Found:', sec?.name);
          if (sec) {
            setCurrentSection(sec);
            restoredSection = true;
            // Также восстанавливаем родительскую коллекцию
            if (!restoredCollection) {
              const parentCol = data.collections.find(c => c.sections.some(s => s.id === state.currentSectionId));
              if (parentCol) {
                console.log('Restoring parent collection:', parentCol.name);
                setCurrentCollection(parentCol);
              }
            }
          }
        }
        if (state.currentSongId) {
          const song = data.songs.find(s => s.id === state.currentSongId);
          if (song) {
            console.log('Restoring song:', song.title);
            setCurrentSong(song);
          }
        }
      }
    } catch (e) {
      console.error('Failed to restore items:', e);
    }

    // Даём React время обработать state updates перед установкой stateRestored
    setTimeout(() => setStateRestored(true), 50);
  }, [user, isLoading, data.collections, data.songs]);

  console.log('=== Rendering VocabApp ===', {
    view,
    stateRestored,
    currentCollection: currentCollection?.name,
    currentSection: currentSection?.name,
    isLoading,
    user: !!user,
    wordsCount: data.words.length
  });

  // Fallback: калі view патрабуе дадзеныя якіх няма - вяртаемся на dashboard
  useEffect(() => {
    console.log('=== Fallback check ===', { stateRestored, view, currentCollection: currentCollection?.name, currentSection: currentSection?.name });
    if (!stateRestored) return;

    if (view === 'song' && !currentSong) {
      console.log('Song view but no song - redirecting to dashboard');
      setView('dashboard');
    }

    if (['list', 'cards', 'quiz', 'write'].includes(view) && !currentCollection && !currentSection) {
      console.log('List/cards/quiz/write view but no collection/section - redirecting to dashboard');
      setView('dashboard');
    }
  }, [stateRestored, view, currentSong, currentCollection, currentSection]);


  const playPronunciation = w => { const u = new SpeechSynthesisUtterance(w); u.lang = 'en-GB'; u.rate = 0.85; speechSynthesis.speak(u); };

  const getCurrentWords = () => {
    let words = data.words;
    if (view !== 'all-words') {
      if (currentSection) words = words.filter(w => w.sectionId === currentSection.id);
      else if (currentCollection) words = words.filter(w => currentCollection.sections.some(s => s.id === w.sectionId));
    }
    if (filterLevel !== 'all') words = words.filter(w => w.level === filterLevel);
    if (filterStatus !== 'all') words = words.filter(w => w.status === filterStatus);

    // Для Cards фильтруем слова, которые уже пройдены в этом режиме
    if (view === 'cards') {
      words = words.filter(w => !(w.passedModes || []).includes('cards'));
    }

    return words;
  };

  const filteredWords = useMemo(() => getCurrentWords(), [data.words, view, currentSection, currentCollection, filterLevel, filterStatus]);
  const resetSessions = () => { setCardSession(null); setQuizSession(null); setWriteSession(null); };
  useEffect(() => { resetSessions(); }, [currentSection, currentCollection, filterLevel, filterStatus, view]);

  useEffect(() => {
    if (view === 'cards' && !cardSession && filteredWords.length > 0) setCardSession({ words: [...filteredWords], index: 0, flipped: false, correct: 0, wrong: 0, wrongWords: [], completed: false });
    else if (view === 'quiz' && !quizSession && filteredWords.length >= 4) setQuizSession({ words: [...filteredWords], index: 0, correct: 0, wrong: 0, wrongWords: [], selected: null, isAnswered: false, options: [], completed: false });
    else if (view === 'write' && !writeSession && filteredWords.length > 0) setWriteSession({ words: [...filteredWords], index: 0, correct: 0, wrong: 0, wrongWords: [], input: '', result: null, completed: false });
  }, [view, filteredWords.length]);

  const createSectionFromSong = async (cid, name) => { const s = { id: 's' + Date.now(), name, icon: '📖' }; setData(d => ({ ...d, collections: d.collections.map(c => c.id === cid ? { ...c, sections: [...c.sections, s] } : c) })); return s.id; };

  const saveSong = async (sd) => {
    console.log('Saving song:', sd);

    const { data: newSong, error } = await supabase
      .from('songs')
      .insert([{
        user_id: user.id,
        folder_id: sd.folderId,
        title: sd.title,
        text: sd.text
      }])
      .select()
      .single();

    console.log('Result:', newSong, 'Error:', error);

    if (!error && newSong) {
      const song = { ...newSong, folderId: newSong.folder_id };
      setData(d => ({ ...d, songs: [...d.songs, song] }));
      setCurrentSong(song);
      setView('song');
    }
    setModal({ type: null, data: null });
  };

  const updateSong = async (s) => {
    await supabase
      .from('songs')
      .update({
        title: s.title,
        text: s.text
      })
      .eq('id', s.id);

    setData(d => ({ ...d, songs: d.songs.map(x => x.id === s.id ? s : x) }));
    if (currentSong?.id === s.id) setCurrentSong(s);
  };

  const saveSongFolder = async (name) => {
    if (!name.trim()) return;

    if (modal.data?.id) {
      // Обновление
      await supabase
        .from('song_folders')
        .update({ name })
        .eq('id', modal.data.id);

      setData(d => ({ ...d, songFolders: d.songFolders.map(f => f.id === modal.data.id ? { ...modal.data, name } : f) }));
    } else {
      // Создание
      const { data: newFolder, error } = await supabase
        .from('song_folders')
        .insert([{ user_id: user.id, name }])
        .select()
        .single();

      if (!error && newFolder) {
        setData(d => ({ ...d, songFolders: [...d.songFolders, newFolder] }));
        setExpandedSongFolders(e => [...e, newFolder.id]);
      }
    }
    setModal({ type: null, data: null });
  };

  const saveWord = async (w) => {
    const existingWord = data.words.find(word => word.word.toLowerCase() === w.word.toLowerCase());
    if (existingWord && existingWord.id !== w.id) {
      const sec = data.collections.flatMap(c => c.sections.map(s => ({ ...s, collectionName: c.name }))).find(s => s.id === existingWord.sectionId);
      const location = sec ? `${sec.collectionName} › ${sec.name}` : 'Unknown section';
      setAlert(`"${w.word}" already exists in: ${location}`);
      return;
    }

    const isValidUUID = w.id && typeof w.id === 'string' && w.id.length > 30;

    if (isValidUUID) {
      // Обновление
      const { error } = await supabase
        .from('words')
        .update({
          word: w.word,
          type: w.type,
          level: w.level,
          forms: w.forms,
          meaning_en: w.meaningEn,
          meaning_ru: w.meaningRu,
          example: w.example,
          my_example: w.myExample,
          single_root_words: w.singleRootWords || '',
          synonyms: w.synonyms || '',
          tags: w.tags || [],
          status: w.status,
          passed_modes: w.passedModes || []
        })
        .eq('id', w.id);

      if (!error) {
        setData(d => ({ ...d, words: d.words.map(x => x.id === w.id ? w : x) }));
      }
    } else {
      // Создание
      const { data: newWord, error } = await supabase
        .from('words')
        .insert([{
          user_id: user.id,
          section_id: currentSection.id,
          word: w.word,
          type: w.type,
          level: w.level,
          forms: w.forms || '',
          meaning_en: w.meaningEn || '',
          meaning_ru: w.meaningRu || '',
          example: w.example || '',
          my_example: w.myExample || '',
          single_root_words: w.singleRootWords || '',
          synonyms: w.synonyms || '',
          tags: w.tags || [],
          status: STATUS.NEW,
          passed_modes: []
        }])
        .select()
        .single();
      console.log('=== Save word result ===');
      console.log('Word:', w.word);
      console.log('isValidUUID:', isValidUUID);
      console.log('currentSection:', currentSection);
      console.log('Error:', error);

      if (!error && newWord) {
        const converted = {
          id: newWord.id,
          sectionId: newWord.section_id,
          word: newWord.word,
          type: newWord.type,
          level: newWord.level,
          forms: newWord.forms,
          meaningEn: newWord.meaning_en,
          meaningRu: newWord.meaning_ru,
          example: newWord.example,
          myExample: newWord.my_example,
          singleRootWords: newWord.single_root_words,
          synonyms: newWord.synonyms,
          tags: newWord.tags,
          status: newWord.status,
          passedModes: newWord.passed_modes
        };
        setData(d => ({ ...d, words: [...d.words, converted] }));
        // Track new word
        trackActivity(1, 0);
      }
    }

    setModal({ type: null, data: null });
  };

  const saveCollection = async (name) => {
    if (!name.trim()) return;
    const icon = document.getElementById('col-icon')?.textContent || '📚';

    if (modal.data?.id) {
      // Обновление
      const { error } = await supabase
        .from('collections')
        .update({ name, icon })
        .eq('id', modal.data.id);

      if (!error) {
        const u = { ...modal.data, name, icon };
        setData(d => ({ ...d, collections: d.collections.map(c => c.id === modal.data.id ? u : c) }));
        if (currentCollection?.id === modal.data.id) setCurrentCollection(u);
      }
    } else {
      // Создание
      const { data: newCol, error } = await supabase
        .from('collections')
        .insert([{ user_id: user.id, name, icon }])
        .select()
        .single();

      if (!error && newCol) {
        setData(d => ({ ...d, collections: [...d.collections, { ...newCol, sections: [] }] }));
        setExpandedCollections(e => [...e, newCol.id]);
      }
    }
    setModal({ type: null, data: null });
  };

  const saveSection = async (name) => {
    console.log('Creating section:', name, modal.data?.colId);

    if (!name.trim() || !modal.data?.colId) return;
    const icon = document.getElementById('sec-icon')?.textContent || '📖';

    if (modal.data.section?.id) {
      // Обновление
      const { error } = await supabase
        .from('sections')
        .update({ name, icon })
        .eq('id', modal.data.section.id);

      if (!error) {
        const u = { ...modal.data.section, name, icon };
        setData(d => ({ ...d, collections: d.collections.map(c => ({ ...c, sections: c.sections.map(s => s.id === modal.data.section.id ? u : s) })) }));
        if (currentSection?.id === modal.data.section.id) setCurrentSection(u);
      }
    } else {
      // Создание
      const { data: newSection, error } = await supabase
        .from('sections')
        .insert([{ collection_id: modal.data.colId, name, icon }])
        .select()
        .single();

      if (!error && newSection) {
        setData(d => ({ ...d, collections: d.collections.map(c => c.id === modal.data.colId ? { ...c, sections: [...c.sections, newSection] } : c) }));
      }
    }
    setModal({ type: null, data: null });
  };

  const requestDelete = (type, item) => setConfirmDelete({ type, item, name: item.word || item.name || item.title });

  // Перемещение коллекций
  const moveCollection = (colId, direction) => {
    const idx = data.collections.findIndex(c => c.id === colId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= data.collections.length) return;

    const newCollections = [...data.collections];
    [newCollections[idx], newCollections[newIdx]] = [newCollections[newIdx], newCollections[idx]];
    setData(d => ({ ...d, collections: newCollections }));
  };

  // Перемещение секций внутри коллекции
  const moveSection = (colId, secId, direction) => {
    const col = data.collections.find(c => c.id === colId);
    if (!col) return;
    const idx = col.sections.findIndex(s => s.id === secId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= col.sections.length) return;

    const newSections = [...col.sections];
    [newSections[idx], newSections[newIdx]] = [newSections[newIdx], newSections[idx]];
    setData(d => ({ ...d, collections: d.collections.map(c => c.id === colId ? { ...c, sections: newSections } : c) }));
  };

  // Перемещение папок с песнями
  const moveSongFolder = (folderId, direction) => {
    const idx = data.songFolders.findIndex(f => f.id === folderId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= data.songFolders.length) return;

    const newFolders = [...data.songFolders];
    [newFolders[idx], newFolders[newIdx]] = [newFolders[newIdx], newFolders[idx]];
    setData(d => ({ ...d, songFolders: newFolders }));
  };

  // Перемещение песен внутри папки
  const moveSong = (folderId, songId, direction) => {
    const folderSongs = data.songs.filter(s => s.folderId === folderId);
    const idx = folderSongs.findIndex(s => s.id === songId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= folderSongs.length) return;

    // Меняем местами в общем массиве
    const songA = folderSongs[idx];
    const songB = folderSongs[newIdx];
    setData(d => ({
      ...d,
      songs: d.songs.map(s => {
        if (s.id === songA.id) return { ...songB, id: songA.id, title: songA.title, text: songA.text, folderId: songA.folderId };
        if (s.id === songB.id) return { ...songA, id: songB.id, title: songB.title, text: songB.text, folderId: songB.folderId };
        return s;
      })
    }));
    // Проще - просто поменять позиции
    const idxA = data.songs.findIndex(s => s.id === songA.id);
    const idxB = data.songs.findIndex(s => s.id === songB.id);
    const newSongs = [...data.songs];
    [newSongs[idxA], newSongs[idxB]] = [newSongs[idxB], newSongs[idxA]];
    setData(d => ({ ...d, songs: newSongs }));
  };
  const executeDelete = async () => {
    const { type, item } = confirmDelete;

    if (type === 'word') {
      // Удаляем из базы
      await supabase.from('words').delete().eq('id', item.id);
      setDeletedItem({ type, data: item });
      setData(d => ({ ...d, words: d.words.filter(w => w.id !== item.id) }));
    }
    else if (type === 'section') {
      // Удаляем секцию и все её слова
      await supabase.from('sections').delete().eq('id', item.section.id);
      setDeletedItem({ type, data: { section: item.section, colId: item.colId, words: data.words.filter(w => w.sectionId === item.section.id) } });
      setData(d => ({ ...d, collections: d.collections.map(c => c.id === item.colId ? { ...c, sections: c.sections.filter(s => s.id !== item.section.id) } : c), words: d.words.filter(w => w.sectionId !== item.section.id) }));
      if (currentSection?.id === item.section.id) setCurrentSection(null);
    }
    else if (type === 'collection') {
      // Удаляем коллекцию (секции и слова удалятся автоматически из-за CASCADE)
      await supabase.from('collections').delete().eq('id', item.id);
      const sIds = item.sections.map(s => s.id);
      setDeletedItem({ type, data: { collection: item, words: data.words.filter(w => sIds.includes(w.sectionId)) } });
      setData(d => ({ ...d, collections: d.collections.filter(c => c.id !== item.id), words: d.words.filter(w => !sIds.includes(w.sectionId)) }));
      if (currentCollection?.id === item.id) { setCurrentCollection(null); setCurrentSection(null); }
    }
    else if (type === 'song') {
      await supabase.from('songs').delete().eq('id', item.id);
      setDeletedItem({ type, data: item });
      setData(d => ({ ...d, songs: d.songs.filter(s => s.id !== item.id) }));
      if (currentSong?.id === item.id) { setCurrentSong(null); setView('dashboard'); }
    }
    else if (type === 'songFolder') {
      await supabase.from('song_folders').delete().eq('id', item.id);
      setDeletedItem({ type, data: { folder: item, songs: data.songs.filter(s => s.folderId === item.id) } });
      setData(d => ({ ...d, songFolders: d.songFolders.filter(f => f.id !== item.id), songs: d.songs.filter(s => s.folderId !== item.id) }));
    }

    setToast({ message: `Deleted`, canUndo: true });
    setConfirmDelete(null);
  };
  const undoDelete = () => { if (!deletedItem) return; if (deletedItem.type === 'word') setData(d => ({ ...d, words: [...d.words, deletedItem.data] })); else if (deletedItem.type === 'song') setData(d => ({ ...d, songs: [...d.songs, deletedItem.data] })); else if (deletedItem.type === 'songFolder') setData(d => ({ ...d, songFolders: [...d.songFolders, deletedItem.data.folder], songs: [...d.songs, ...deletedItem.data.songs] })); else if (deletedItem.type === 'collection') setData(d => ({ ...d, collections: [...d.collections, deletedItem.data.collection], words: [...d.words, ...deletedItem.data.words] })); else if (deletedItem.type === 'section') setData(d => ({ ...d, collections: d.collections.map(c => c.id === deletedItem.data.colId ? { ...c, sections: [...c.sections, deletedItem.data.section] } : c), words: [...d.words, ...deletedItem.data.words] })); setDeletedItem(null); setToast(null); };

  // Track activity (new words or reviewed words)
  const trackActivity = async (newWords = 0, reviewedWords = 0) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    // Try to update existing record or insert new
    const { data: existing } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (existing) {
      await supabase
        .from('activity_log')
        .update({
          new_words_learned: existing.new_words_learned + newWords,
          words_reviewed: existing.words_reviewed + reviewedWords,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('activity_log')
        .insert({
          user_id: user.id,
          date: today,
          new_words_learned: newWords,
          words_reviewed: reviewedWords,
          goal_new: userGoals.daily_new_words,
          goal_review: userGoals.daily_review_words
        });
    }

    // Update local state
    setActivityData(prev => {
      const idx = prev.findIndex(a => a.date === today);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          new_words_learned: updated[idx].new_words_learned + newWords,
          words_reviewed: updated[idx].words_reviewed + reviewedWords
        };
        return updated;
      } else {
        return [...prev, {
          date: today,
          new_words_learned: newWords,
          words_reviewed: reviewedWords,
          goal_new: userGoals.daily_new_words,
          goal_review: userGoals.daily_review_words
        }];
      }
    });
  };

  const updateWordProgress = async (id, mode, correct) => {
    const word = data.words.find(w => w.id === id);
    if (!word) return;

    let pm = word.passedModes || [];
    if (correct && !pm.includes(mode)) pm = [...pm, mode];
    else if (!correct) {
      pm = pm.filter(m => m !== mode && m !== 'cards');
    }

    const newStatus = pm.length >= 3 ? STATUS.LEARNED : pm.length > 0 ? STATUS.LEARNING : STATUS.NEW;

    // Сохраняем в базу
    await supabase
      .from('words')
      .update({
        passed_modes: pm,
        status: newStatus
      })
      .eq('id', id);

    // Обновляем state
    setData(d => ({
      ...d,
      words: d.words.map(w =>
        w.id === id
          ? { ...w, passedModes: pm, status: newStatus }
          : w
      )
    }));

    // Track reviewed word
    trackActivity(0, 1);
  };

  const exportData = () => { const j = JSON.stringify({ ...data, exportedAt: new Date().toISOString(), version: 'v7' }, null, 2); const a = document.createElement('a'); a.href = 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(j))); a.download = `vocabmaster-backup-${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); setToast({ message: 'Backup downloaded!', canUndo: false }); };
  const importData = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const r = new FileReader();
    r.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!imported.collections || !imported.words) {
          setToast({ message: 'Invalid backup file', canUndo: false });
          return;
        }

        console.log('=== Starting full import ===');
        console.log('Collections:', imported.collections.length);
        console.log('Words:', imported.words.length);

        // Маппінг старых ID → новыя UUID
        const collectionMap = new Map(); // oldId → newId
        const sectionMap = new Map();     // oldId → newId

        // 1. Імпарт калекцый
        for (const col of imported.collections) {
          const { data: newCol, error } = await supabase
            .from('collections')
            .insert([{
              user_id: user.id,
              name: col.name,
              icon: col.icon
            }])
            .select()
            .single();

          if (!error && newCol) {
            collectionMap.set(col.id, newCol.id);
            console.log(`Collection "${col.name}": ${col.id} → ${newCol.id}`);

            // 2. Імпарт секцый гэтай калекцыі
            for (const sec of col.sections) {
              const { data: newSec, error: secError } = await supabase
                .from('sections')
                .insert([{
                  collection_id: newCol.id,
                  name: sec.name,
                  icon: sec.icon
                }])
                .select()
                .single();

              if (!secError && newSec) {
                sectionMap.set(sec.id, newSec.id);
                console.log(`  Section "${sec.name}": ${sec.id} → ${newSec.id}`);
              }
            }
          }
        }

        // 3. Імпарт слоў
        let importedCount = 0;
        let skippedCount = 0;

        console.log('=== Importing words ===');
        console.log('Total words to import:', imported.words.length);
        console.log('Section map size:', sectionMap.size);


        for (const word of imported.words) {
          const newSectionId = sectionMap.get(word.sectionId);
          if (!newSectionId) {
            console.log(`Skipping word "${word.word}" - section ${word.sectionId} not found in map`);
            skippedCount++;

            continue;
          }
          console.log(`Importing word #${importedCount + 1}: "${word.word}" to section ${newSectionId}`);


          const { error } = await supabase
            .from('words')
            .insert([{
              user_id: user.id,
              section_id: newSectionId,
              word: word.word,
              type: word.type,
              level: word.level,
              forms: word.forms || '',
              meaning_en: word.meaningEn || '',
              meaning_ru: word.meaningRu || '',
              example: word.example || '',
              my_example: word.myExample || '',
              single_root_words: word.singleRootWords || '',
              synonyms: word.synonyms || '',
              tags: word.tags || [],
              status: word.status || STATUS.NEW,
              passed_modes: word.passedModes || []
            }]);

          if (!error) {
            importedCount++;
          }
        }

        console.log(`=== Import complete ===`);
        console.log(`Imported: ${importedCount}`);
        console.log(`Skipped: ${skippedCount}`);

        // 4. Перачытваем усё з базы
        const { data: collections } = await supabase
          .from('collections')
          .select('*, sections(*)')
          .order('created_at');

        const { data: wordsData } = await supabase
          .from('words')
          .select('*')
          .order('created_at');

        const words = (wordsData || []).map(w => ({
          id: w.id,
          sectionId: w.section_id,
          word: w.word,
          type: w.type,
          level: w.level,
          forms: w.forms,
          meaningEn: w.meaning_en,
          meaningRu: w.meaning_ru,
          example: w.example,
          myExample: w.my_example,
          singleRootWords: w.single_root_words,
          synonyms: w.synonyms,
          tags: w.tags,
          status: w.status,
          passedModes: w.passed_modes
        }));

        setData({
          collections: collections || [],
          words: words || [],
          allTags: imported.allTags || [],
          songFolders: imported.songFolders || [{ id: 'sf1', name: 'My Songs' }],
          songs: imported.songs || []
        });

        setToast({ message: `Imported ${importedCount} words!`, canUndo: false });

      } catch (e) {
        console.error('Import error:', e);
        setToast({ message: 'Import failed', canUndo: false });
      }
    };
    r.readAsText(f);
    e.target.value = '';
  };
  const handleNavigationWithCheck = (navFunc) => {
    if (hasUnsavedWords && view === 'song') {
      const confirmed = window.confirm('⚠️ You have unsaved words in the list.\n\nAre you sure you want to leave?\n\nProgress will be lost.');
      if (confirmed) {
        setHasUnsavedWords(false);
        navFunc();
      }
    } else {
      navFunc();
    }
  };

  const WordCard = ({ word }) => {
    return (
      <div
        className="dash-card flex flex-col"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-display font-semibold ${isDark ? 'text-white/90' : 'text-gray-900'}`}>{word.word}</span>
              <button onClick={() => playPronunciation(word.word)} className={`p-1.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                <Volume2 size={16} className="text-pink-vibrant" />
              </button>
            </div>
            <span className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{word.type}{word.forms && ` · ${word.forms}`}</span>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setModal({ type: 'word', data: word })} className={`p-1.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-black/5 text-gray-500 hover:text-gray-900'}`}>
              <Edit2 size={16} />
            </button>
            <button onClick={() => requestDelete('word', word)} className={`p-1.5 rounded-xl transition-colors ${isDark ? 'hover:bg-red-500/20 text-white/50 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-500'}`}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <div className={`mb-2 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{word.meaningEn.split('\n').map((m, i) => <div key={i}>{m}</div>)}</div>
        {word.meaningRu && <p className="text-pink-vibrant font-medium text-sm mb-3">→ {word.meaningRu}</p>}
        {word.example && (
          <div className={`text-sm italic rounded-xl border-l-2 pl-3 py-2 mb-3 bg-transparent ${isDark ? 'text-white/40 border-pink-vibrant/40' : 'text-gray-500 border-pink-500/40'}`}>
            {word.example.split('\n').map((ex, i) => <div key={i}>"{highlightWord(ex.trim(), word.word)}"</div>)}
          </div>
        )}
        {word.myExample && (
          <p className={`text-sm italic rounded-xl border-l-2 pl-3 py-2 mb-3 transition-colors ${isDark ? 'text-amber-300/80 border-amber-500/30 bg-amber-900/10' : 'text-amber-700 border-amber-500/30 bg-amber-100/50'}`}>
            ✏️ "{word.myExample}"
          </p>
        )}
        <div className={`flex items-center justify-between mt-3 pt-3 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          <div className="flex gap-1.5">
            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getLevelColor(word.level)}`}>{word.level}</span>
            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getStatusColor(word.status)}`}>{word.status}</span>
          </div>
          <div className="flex gap-1 text-xs font-medium">
            <span className={`px-1.5 py-0.5 rounded-md transition-colors ${(word.passedModes || []).includes('cards') ? 'bg-emerald-500/20 text-emerald-600' : isDark ? 'bg-white/5 text-white/30' : 'bg-black/5 text-gray-400'}`}>C</span>
            <span className={`px-1.5 py-0.5 rounded-md transition-colors ${(word.passedModes || []).includes('quiz') ? 'bg-emerald-500/20 text-emerald-600' : isDark ? 'bg-white/5 text-white/30' : 'bg-black/5 text-gray-400'}`}>Q</span>
            <span className={`px-1.5 py-0.5 rounded-md transition-colors ${(word.passedModes || []).includes('write') ? 'bg-emerald-500/20 text-emerald-600' : isDark ? 'bg-white/5 text-white/30' : 'bg-black/5 text-gray-400'}`}>W</span>
          </div>
        </div>
      </div>
    );
  };

  const sidebarIsDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const Sidebar = () => (
    <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all flex-shrink-0 overflow-hidden ${sidebarIsDark ? 'bg-transparent border-r border-white/5' : 'bg-white border-r border-black/5'}`}>
      <div className="w-64 p-3 h-full overflow-y-auto">
        <button onClick={() => handleNavigationWithCheck(() => { setCurrentCollection(null); setCurrentSection(null); setCurrentSong(null); setFilterStatus('all'); setView('dashboard'); })} className={`w-full flex items-center gap-2 p-2.5 rounded-xl mb-2 transition-colors ${view === 'dashboard' ? 'bg-pink-500/10 text-pink-vibrant' : sidebarIsDark ? 'hover:bg-white/[0.04] text-white/70' : 'hover:bg-black/[0.04] text-gray-600'}`}><Home size={18} /> Dashboard</button>
        <div className={`mb-4 pb-3 border-b ${sidebarIsDark ? 'border-white/5' : 'border-black/5'}`}>
          <div className="flex items-center justify-between mb-2"><span className={`text-sm font-medium ${sidebarIsDark ? 'text-white/40' : 'text-gray-400'}`}>🎵 Songs</span><button onClick={() => setModal({ type: 'songFolder', data: null })} className={`p-1 rounded transition-colors ${sidebarIsDark ? 'hover:bg-white/[0.04] text-white/40' : 'hover:bg-black/[0.04] text-gray-400'}`}><Plus size={16} /></button></div>
          {data.songFolders.map((folder, folderIdx) => {
            const folderSongs = data.songs.filter(s => s.folderId === folder.id);
            return (
              <div key={folder.id} className="mb-1">
                <div className={`flex items-center gap-1 p-2 rounded-xl cursor-pointer group transition-colors ${sidebarIsDark ? 'hover:bg-white/[0.04] text-white/70' : 'hover:bg-black/[0.04] text-gray-600'}`}>
                  <button onClick={() => setExpandedSongFolders(expandedSongFolders.includes(folder.id) ? expandedSongFolders.filter(id => id !== folder.id) : [...expandedSongFolders, folder.id])} className={sidebarIsDark ? 'p-0.5 text-white/30' : 'p-0.5 text-gray-400'}>{expandedSongFolders.includes(folder.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
                  <span className="flex-1 truncate text-sm">{folder.name}</span>
                  <div className="flex opacity-0 group-hover:opacity-100">
                    {folderIdx > 0 && <button onClick={e => { e.stopPropagation(); moveSongFolder(folder.id, 'up'); }} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/10 text-gray-400'}`} title="Move up"><ChevronUp size={12} /></button>}
                    {folderIdx < data.songFolders.length - 1 && <button onClick={e => { e.stopPropagation(); moveSongFolder(folder.id, 'down'); }} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/10 text-gray-400'}`} title="Move down"><ChevronDown size={12} /></button>}
                    <button onClick={() => setModal({ type: 'song', data: { folderId: folder.id } })} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/10 text-gray-400'}`}><Plus size={12} /></button>
                    <button onClick={() => setModal({ type: 'songFolder', data: folder })} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/10 text-gray-400'}`}><Edit2 size={12} /></button>
                    <button onClick={() => requestDelete('songFolder', folder)} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/10 text-gray-400'}`}><Trash2 size={12} /></button>
                  </div>
                </div>
                {expandedSongFolders.includes(folder.id) && <div className="ml-6 space-y-1">{folderSongs.map((song, songIdx) => (
                  <div key={song.id} onClick={() => handleNavigationWithCheck(() => { setCurrentSong(song); setCurrentCollection(null); setCurrentSection(null); setFilterStatus('all'); setView('song'); })} className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer group text-sm transition-colors ${currentSong?.id === song.id ? 'bg-pink-500/10 text-pink-vibrant' : sidebarIsDark ? 'hover:bg-white/[0.04] text-white/50' : 'hover:bg-black/[0.04] text-gray-500'}`}>
                    <span className="flex-1 truncate">{song.title}</span>
                    <div className="flex opacity-0 group-hover:opacity-100">
                      {songIdx > 0 && <button onClick={e => { e.stopPropagation(); moveSong(folder.id, song.id, 'up'); }} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`} title="Move up"><ChevronUp size={12} /></button>}
                      {songIdx < folderSongs.length - 1 && <button onClick={e => { e.stopPropagation(); moveSong(folder.id, song.id, 'down'); }} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`} title="Move down"><ChevronDown size={12} /></button>}
                      <button onClick={e => { e.stopPropagation(); setModal({ type: 'song', data: song }); }} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}><Edit2 size={12} /></button>
                      <button onClick={e => { e.stopPropagation(); requestDelete('song', song); }} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}</div>}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mb-2"><span className={`text-sm font-medium ${sidebarIsDark ? 'text-white/40' : 'text-gray-400'}`}>Collections</span><button onClick={() => setModal({ type: 'collection', data: null })} className={`p-1 rounded transition-colors ${sidebarIsDark ? 'hover:bg-white/[0.04] text-white/40' : 'hover:bg-black/[0.04] text-gray-400'}`}><Plus size={16} /></button></div>
        {data.collections.map((col, colIdx) => (
          <div key={col.id} className="mb-1">
            <div className={`flex items-center gap-1 p-2 rounded-xl cursor-pointer group transition-colors ${currentCollection?.id === col.id && !currentSection ? 'bg-pink-500/10 text-pink-vibrant' : sidebarIsDark ? 'hover:bg-white/[0.04] text-white/70' : 'hover:bg-black/[0.04] text-gray-600'}`}>
              <button onClick={() => setExpandedCollections(expandedCollections.includes(col.id) ? expandedCollections.filter(id => id !== col.id) : [...expandedCollections, col.id])} className={sidebarIsDark ? 'p-0.5 text-white/30' : 'p-0.5 text-gray-400'}>{expandedCollections.includes(col.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
              <span className="text-base">{col.icon || '📚'}</span>
              <span onClick={() => handleNavigationWithCheck(() => { setCurrentCollection(col); setCurrentSection(null); setCurrentSong(null); setFilterStatus('all'); setView('list'); })} className="flex-1 truncate text-sm">{col.name}</span>
              <div className="flex opacity-0 group-hover:opacity-100">
                {colIdx > 0 && <button onClick={e => { e.stopPropagation(); moveCollection(col.id, 'up'); }} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/10 text-gray-400'}`} title="Move up"><ChevronUp size={12} /></button>}
                {colIdx < data.collections.length - 1 && <button onClick={e => { e.stopPropagation(); moveCollection(col.id, 'down'); }} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/10 text-gray-400'}`} title="Move down"><ChevronDown size={12} /></button>}
                <button onClick={() => setModal({ type: 'collection', data: col })} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/10 text-gray-400'}`}><Edit2 size={12} /></button>
                <button onClick={() => requestDelete('collection', col)} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/10 text-gray-400'}`}><Trash2 size={12} /></button>
              </div>
            </div>
            {expandedCollections.includes(col.id) && <div className="ml-6 space-y-1">
              {col.sections.map((sec, secIdx) => (
                <div key={sec.id} onClick={() => handleNavigationWithCheck(() => { setCurrentCollection(col); setCurrentSection(sec); setCurrentSong(null); setFilterStatus('all'); setView('list'); })} className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer group text-sm transition-colors ${currentSection?.id === sec.id ? 'bg-pink-500/10 text-pink-vibrant' : sidebarIsDark ? 'hover:bg-white/[0.04] text-white/50' : 'hover:bg-black/[0.04] text-gray-500'}`}>
                  <span className="text-base">{sec.icon || '📖'}</span>
                  <span className="flex-1 truncate">{sec.name}</span>
                  <div className="flex opacity-0 group-hover:opacity-100">
                    {secIdx > 0 && <button onClick={e => { e.stopPropagation(); moveSection(col.id, sec.id, 'up'); }} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`} title="Move up"><ChevronUp size={12} /></button>}
                    {secIdx < col.sections.length - 1 && <button onClick={e => { e.stopPropagation(); moveSection(col.id, sec.id, 'down'); }} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`} title="Move down"><ChevronDown size={12} /></button>}
                    <button onClick={e => { e.stopPropagation(); setModal({ type: 'section', data: { colId: col.id, section: sec } }); }} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}><Edit2 size={12} /></button>
                    <button onClick={e => { e.stopPropagation(); requestDelete('section', { colId: col.id, section: sec }); }} className={`p-1 rounded ${sidebarIsDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
              <button onClick={() => setModal({ type: 'section', data: { colId: col.id, section: null } })} className={`flex items-center gap-2 p-2 text-sm transition-colors ${sidebarIsDark ? 'text-white/30 hover:text-white/50' : 'text-gray-400 hover:text-gray-600'}`}><Plus size={14} /> Add section</button>
            </div>}
          </div>
        ))}
      </div>
    </div>
  );

  const renderFlashcards = () => {
    if (!filteredWords.length) return <div className="text-center py-12 text-gray-400">No words</div>;
    if (!cardSession) return null;
    if (cardSession.completed) return <CompletionScreen title="Cards Complete!" stats={{ correct: cardSession.correct, total: cardSession.words.length }} wrongWords={cardSession.wrongWords} onRestart={() => setCardSession({ words: [...filteredWords], index: 0, flipped: false, correct: 0, wrong: 0, wrongWords: [], completed: false })} onBack={() => setView('list')} isDark={isDark} />;
    const w = cardSession.words[cardSession.index];
    const handleAnswer = know => { updateWordProgress(w.id, 'cards', know); const nw = know ? cardSession.wrongWords : [...cardSession.wrongWords, w]; if (cardSession.index + 1 >= cardSession.words.length) setCardSession({ ...cardSession, correct: cardSession.correct + (know ? 1 : 0), wrongWords: nw, completed: true }); else setCardSession({ ...cardSession, index: cardSession.index + 1, flipped: false, correct: cardSession.correct + (know ? 1 : 0), wrongWords: nw }); };
    return (
      <div className="max-w-md mx-auto">
        <ProgressBar current={cardSession.index} total={cardSession.words.length} correct={cardSession.correct} wrong={cardSession.wrong} isDark={isDark} />
        <div onClick={() => setCardSession({ ...cardSession, flipped: !cardSession.flipped })} className="cursor-pointer" style={{ perspective: 1000 }}>
          <div style={{ transformStyle: 'preserve-3d', transition: 'transform 0.5s', transform: cardSession.flipped ? 'rotateY(180deg)' : '' }} className="relative h-72">
            <div style={{ backfaceVisibility: 'hidden' }} className={`absolute inset-0 liquid-glass rounded-3xl p-6 flex flex-col items-center justify-center`}><h2 className={`text-3xl font-display font-bold text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>{w.word}</h2><p className={isDark ? "text-gray-400" : "text-gray-500"}>{w.type}</p>{w.forms && <p className="text-gray-500 text-sm mt-1">{w.forms}</p>}<button onClick={e => { e.stopPropagation(); playPronunciation(w.word); }} className="mt-4 p-2 bg-pink-500/10 hover:bg-pink-500/20 rounded-full transition-colors"><Volume2 className="text-pink-vibrant" /></button></div>
            <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} className={`absolute inset-0 liquid-glass rounded-3xl p-6 flex flex-col justify-center border-2 border-pink-vibrant/30`}>
              <p className={`text-lg mb-2 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{w.meaningEn}</p>
              {w.meaningRu && <p className="text-pink-vibrant font-medium mb-2">→ {w.meaningRu}</p>}
              {w.example && <div className={`text-sm italic mt-2 mb-3 rounded-xl border-l-2 pl-3 py-2 ${isDark ? 'text-white/60 bg-[#1a1a1e] border-pink-vibrant/40' : 'text-gray-500 bg-gray-50 border-pink-500/30'}`}>{w.example.split('\n').map((ex, i) => <div key={i}>"{highlightWord(ex.trim(), w.word)}"</div>)}</div>}
              {(w.singleRootWords || w.synonyms) && (
                <div className={`mt-auto pt-3 border-t flex gap-4 text-xs font-medium ${isDark ? 'border-white/10' : 'border-black/5'}`}>
                  {w.singleRootWords && (
                    <button onClick={e => { e.stopPropagation(); setCardPopup({ type: 'roots', word: w }); }} className="text-purple-400 hover:text-purple-300 underline">
                      Single-root words
                    </button>
                  )}
                  {w.synonyms && (
                    <button onClick={e => { e.stopPropagation(); setCardPopup({ type: 'synonyms', word: w }); }} className="text-blue-400 hover:text-blue-300 underline">
                      Synonyms
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-4 mt-6"><button onClick={() => handleAnswer(false)} className={`px-6 py-2 rounded-full flex items-center gap-2 font-medium ${isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}><X size={18} /> Don't know</button><button onClick={() => handleAnswer(true)} className={`px-6 py-2 rounded-full flex items-center gap-2 font-medium ${isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}><Check size={18} /> Know it</button></div>
      </div>
    );
  };

  const renderQuiz = () => {
    if (filteredWords.length < 4) return <div className="text-center py-12 text-gray-400">Need 4+ words</div>;
    if (!quizSession) return null;
    if (quizSession.completed) return <CompletionScreen title="Quiz Complete!" stats={{ correct: quizSession.correct, total: quizSession.words.length }} wrongWords={quizSession.wrongWords} onRestart={() => setQuizSession({ words: [...filteredWords], index: 0, correct: 0, wrong: 0, wrongWords: [], selected: null, isAnswered: false, options: [], completed: false })} onBack={() => setView('list')} isDark={isDark} />;
    const w = quizSession.words[quizSession.index];
    if (!quizSession.options.length) { setQuizSession(s => ({ ...s, options: [...quizSession.words.filter(x => x.id !== w.id).sort(() => Math.random() - 0.5).slice(0, 3), w].sort(() => Math.random() - 0.5) })); return null; }
    const handleSelect = opt => { if (quizSession.isAnswered) return; const correct = opt.id === w.id; updateWordProgress(w.id, 'quiz', correct); setQuizSession(s => ({ ...s, isAnswered: true, selected: opt.id, correct: s.correct + (correct ? 1 : 0), wrongWords: correct ? s.wrongWords : [...s.wrongWords, w] })); };
    const handleNext = () => { if (quizSession.index + 1 >= quizSession.words.length) setQuizSession(s => ({ ...s, completed: true })); else setQuizSession(s => ({ ...s, index: s.index + 1, isAnswered: false, selected: null, options: [] })); };
    return (
      <div className="max-w-md mx-auto">
        <ProgressBar current={quizSession.index} total={quizSession.words.length} correct={quizSession.correct} wrong={quizSession.wrong} isDark={isDark} />
        <div className={`liquid-glass rounded-3xl p-6 mb-4 ${isDark ? '' : 'shadow-sm'}`}><h2 className={`text-xl font-display font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{w.meaningEn}</h2>{w.meaningRu && <p className="text-pink-vibrant font-medium mb-4">→ {w.meaningRu}</p>}<div className="space-y-3">{quizSession.options.map(opt => <button key={opt.id} onClick={() => handleSelect(opt)} className={`w-full p-4 rounded-2xl text-left liquid-glass font-medium transition-all ${quizSession.isAnswered ? opt.id === w.id ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/50' : opt.id === quizSession.selected ? 'bg-red-500/20 text-red-600 border border-red-500/50' : 'opacity-50' : 'hover:brightness-110'}`}>{opt.word}</button>)}</div></div>
        {quizSession.isAnswered && <button onClick={handleNext} className="w-full p-4 bg-purple-vibrant text-white rounded-2xl font-semibold">Next</button>}
      </div>
    );
  };

  const renderWrite = () => {
    if (!filteredWords.length) return <div className="text-center py-12 text-gray-400">No words</div>;
    if (!writeSession) return null;
    if (writeSession.completed) return <CompletionScreen title="Practice Complete!" stats={{ correct: writeSession.correct, total: writeSession.words.length }} wrongWords={writeSession.wrongWords} onRestart={() => setWriteSession({ words: [...filteredWords], index: 0, correct: 0, wrong: 0, wrongWords: [], input: '', result: null, completed: false })} onBack={() => setView('list')} isDark={isDark} />;
    const w = writeSession.words[writeSession.index];
    const handleCheck = () => { const correct = writeSession.input.toLowerCase().trim() === w.word.toLowerCase().trim(); updateWordProgress(w.id, 'write', correct); setWriteSession(s => ({ ...s, result: { correct, answer: w.word }, correct: s.correct + (correct ? 1 : 0), wrongWords: correct ? s.wrongWords : [...s.wrongWords, w] })); };
    const handleNext = () => { if (writeSession.index + 1 >= writeSession.words.length) setWriteSession(s => ({ ...s, completed: true })); else setWriteSession(s => ({ ...s, index: s.index + 1, input: '', result: null })); };
    return (
      <div className="max-w-md mx-auto">
        <ProgressBar current={writeSession.index} total={writeSession.words.length} correct={writeSession.correct} wrong={writeSession.wrong} isDark={isDark} />
        <div className={`liquid-glass rounded-3xl p-6 ${isDark ? '' : 'shadow-sm'}`}><h2 className={`text-xl font-display font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{w.meaningEn}</h2>{w.meaningRu && <p className="text-pink-vibrant mb-4">→ {w.meaningRu}</p>}<input value={writeSession.input} onChange={e => setWriteSession(s => ({ ...s, input: e.target.value }))} onKeyDown={e => e.key === 'Enter' && !writeSession.result && handleCheck()} placeholder="Type the word..." className={`w-full p-4 liquid-glass rounded-2xl mb-4 text-lg ${isDark ? 'text-white' : 'text-gray-900'} focus:ring-2 ring-pink-vibrant/50`} disabled={!!writeSession.result} autoFocus />{writeSession.result && <div className={`p-4 rounded-2xl mb-4 font-medium ${writeSession.result.correct ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'}`}>{writeSession.result.correct ? '✓ Correct!' : `✗ Answer: ${writeSession.result.answer}`}</div>}<button onClick={writeSession.result ? handleNext : handleCheck} className="w-full p-4 bg-purple-vibrant text-white rounded-2xl font-semibold">{writeSession.result ? 'Next' : 'Check'}</button></div>
      </div>
    );
  };

  console.log('Current data:', data);
  console.log('Collections:', data.collections);
  console.log('Is loading:', isLoading);


  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <AuthForm />;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading data...</div>;


  const showFilters = ['list', 'cards', 'quiz', 'write'].includes(view) && (currentCollection || currentSection);

  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-theme-main text-gray-100 dark' : 'bg-[#f5f5f7] text-gray-900'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <header className={`${isDark ? 'bg-[#0d0d10]/80 border-white/5' : 'bg-white/90 border-black/5'} backdrop-blur-xl border-b px-8 py-3 h-auto flex items-center justify-between flex-shrink-0 relative z-[500]`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-black/5 text-gray-600'}`}>
              <Menu size={20} />
            </button>
            <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>VocabMaster</h1>
          </div>
          <div className="flex items-center gap-4">
            <input type="file" accept=".json" onChange={importData} className="hidden" id="import-backup" />
            <button onClick={() => document.getElementById('import-backup').click()} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-black/5 text-gray-500'}`} title="Restore"><Upload size={18} /></button>
            <button onClick={exportData} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-black/5 text-gray-500'}`} title="Backup"><Download size={18} /></button>
            {currentSection && (
              <>
                <button onClick={() => setModal({ type: 'importText', data: null })} className="h-10 px-4 rounded-full flex items-center gap-1.5 text-sm font-semibold bg-purple-vibrant/20 text-purple-vibrant hover:bg-purple-vibrant/30 transition-colors"><Upload size={16} /> Import</button>
                <button onClick={() => setModal({ type: 'word', data: { word: '', type: 'phrase', level: 'B1', forms: '', meaningEn: '', meaningRu: '', example: '', myExample: '', singleRootWords: '', synonyms: '', tags: [] } })} className="h-10 px-4 rounded-full flex items-center gap-1.5 text-sm font-semibold bg-pink-vibrant text-white hover:brightness-110 shadow-lg shadow-pink-500/20 transition-all"><Plus size={16} /> Add</button>
              </>
            )}
            <div className="relative ml-2">
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-10 h-10 rounded-full flex items-center justify-center liquid-glass text-pink-vibrant hover:brightness-110 transition-colors shadow-sm">
                <User size={18} />
              </button>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-[400]" onClick={() => setShowUserMenu(false)}></div>
                  <div className={`absolute right-0 top-full mt-2 w-64 rounded-2xl shadow-2xl py-2 z-[410] animate-scaleIn ${isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-black/5 shadow-lg'}`}>
                    <div className={`px-4 py-2 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                      <div className={`text-sm font-medium truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{user.email}</div>
                    </div>
                    <div className="py-1">
                      <button onClick={() => {
                        const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
                        setTheme(newTheme);
                        localStorage.setItem('vocabmaster_theme', newTheme);
                      }} className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 rounded-lg mx-1 w-[calc(100%-8px)] ${isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-black/5 text-gray-700'}`}>
                        {theme === 'light' ? <Sun size={16} /> : theme === 'dark' ? <Moon size={16} /> : <Monitor size={16} />}
                        Theme: {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'}
                      </button>
                      <button onClick={() => { setModal({ type: 'changePassword', data: null }); setShowUserMenu(false); }} className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 rounded-lg mx-1 w-[calc(100%-8px)] ${isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-black/5 text-gray-700'}`}>
                        <Settings size={16} /> Change Password
                      </button>
                      <button onClick={() => { setModal({ type: 'dailyGoals', data: userGoals }); setShowUserMenu(false); }} className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 rounded-lg mx-1 w-[calc(100%-8px)] ${isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-black/5 text-gray-700'}`}>
                        <Target size={16} /> Daily Goals
                      </button>
                    </div>
                    <div className={`border-t pt-1 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                      <button onClick={handleLogout} className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 rounded-lg mx-1 w-[calc(100%-8px)] ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}>
                        <LogOut size={16} /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <div className={`flex-1 overflow-auto p-8 relative ${isDark ? 'bg-transparent' : 'bg-[#f5f5f7]'}`}>
          {view === 'dashboard' && (() => {
            const totalWords = data.words.length;
            const newWords = data.words.filter(w => w.status === STATUS.NEW).length;
            const learningWords = data.words.filter(w => w.status === STATUS.LEARNING).length;
            const learnedWords = data.words.filter(w => w.status === STATUS.LEARNED).length;
            const progressPercent = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

            // Статистика по уровням
            const levelStats = LEVELS.map(level => ({
              level,
              count: data.words.filter(w => w.level === level).length
            })).filter(l => l.count > 0);

            // Последние добавленные слова
            const recentWords = [...data.words].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

            // Слова для повторения (learning)
            const wordsToReview = data.words.filter(w => w.status === STATUS.LEARNING).slice(0, 5);

            return (
              <div className="space-y-6 w-full animate-fadeIn">
                {/* Stats row - clean pill buttons */}
                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={() => { setFilterStatus('all'); setViewTitle('Total Words'); handleNavigationWithCheck(() => setView('all-words')); }}
                    className={`rounded-2xl p-4 text-left transition-colors ${isDark ? 'bg-purple-500/[0.08] hover:bg-purple-500/[0.12] border border-purple-500/10' : 'bg-purple-50 hover:bg-purple-100 border border-purple-100 shadow-sm'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-2xl font-semibold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{totalWords}</div>
                        <div className={`text-xs ${isDark ? 'text-purple-400/50' : 'text-purple-600/60'}`}>Total</div>
                      </div>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-purple-500/10' : 'bg-purple-100'}`}>
                        <BookOpen size={18} className={isDark ? 'text-purple-400/60' : 'text-purple-500'} />
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => { setFilterStatus('new'); setViewTitle('New Words'); handleNavigationWithCheck(() => setView('all-words')); }}
                    className={`rounded-2xl p-4 text-left transition-colors ${isDark ? 'bg-pink-500/[0.08] hover:bg-pink-500/[0.12] border border-pink-500/10' : 'bg-pink-50 hover:bg-pink-100 border border-pink-100'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-2xl font-semibold ${isDark ? 'text-pink-400' : 'text-pink-600'}`}>{newWords}</div>
                        <div className={`text-xs ${isDark ? 'text-pink-400/50' : 'text-pink-600/60'}`}>New</div>
                      </div>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-pink-500/10' : 'bg-pink-100'}`}>
                        <Target size={18} className={isDark ? 'text-pink-400/60' : 'text-pink-500'} />
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => { setFilterStatus('learning'); setViewTitle('Learning Words'); handleNavigationWithCheck(() => setView('all-words')); }}
                    className={`rounded-2xl p-4 text-left transition-colors ${isDark ? 'bg-yellow-400/[0.08] hover:bg-yellow-400/[0.12] border border-yellow-400/10' : 'bg-yellow-50 hover:bg-yellow-100 border border-yellow-100'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-2xl font-semibold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>{learningWords}</div>
                        <div className={`text-xs ${isDark ? 'text-yellow-400/50' : 'text-yellow-600/60'}`}>Learning</div>
                      </div>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-yellow-400/10' : 'bg-yellow-100'}`}>
                        <Flame size={18} className={isDark ? 'text-yellow-400/60' : 'text-yellow-500'} />
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => { setFilterStatus('learned'); setViewTitle('Learned Words'); handleNavigationWithCheck(() => setView('all-words')); }}
                    className={`rounded-2xl p-4 text-left transition-colors ${isDark ? 'bg-emerald-400/[0.08] hover:bg-emerald-400/[0.12] border border-emerald-400/10' : 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-100'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-2xl font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{learnedWords}</div>
                        <div className={`text-xs ${isDark ? 'text-emerald-400/50' : 'text-emerald-600/60'}`}>Learned</div>
                      </div>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-400/10' : 'bg-emerald-100'}`}>
                        <Award size={18} className={isDark ? 'text-emerald-400/60' : 'text-emerald-500'} />
                      </div>
                    </div>
                  </button>
                </div>

                {/* Main Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  {/* Left side - Activity Tracker (spans height) */}
                  <div className="flex flex-col h-full">
                    <ActivityTracker activityData={activityData} streak={streak} userGoals={userGoals} isDark={isDark} className="flex-1" />
                  </div>

                  {/* Right side - Collections & Stats */}
                  <div className="flex flex-col gap-6">
                    {/* Collections */}
                    <div
                      className="dash-card"
                    >
                      <h3 className={`font-display font-semibold text-lg mb-4 flex items-center gap-2 ${isDark ? 'text-white/90' : 'text-gray-900'}`}>
                        <BookOpen size={16} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                        Collections
                      </h3>
                      {data.collections.length > 0 ? (
                        <div className="space-y-1">
                          {data.collections.slice(0, 5).map(col => {
                            const colWords = data.words.filter(w => col.sections.some(s => s.id === w.sectionId));
                            return (
                              <button
                                key={col.id}
                                onClick={() => { setCurrentCollection(col); setCurrentSection(null); setView('list'); }}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.03]'}`}
                              >
                                <span className="text-lg">{col.icon || '📚'}</span>
                                <span className={`flex-1 truncate text-sm font-medium ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{col.name}</span>
                                <span className={`text-sm ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{colWords.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>No collections yet</p>
                      )}
                    </div>

                    {/* Levels and Review Mini-Grid inside right column */}
                    <div className="grid grid-cols-2 gap-6">
                      {/* Уровни */}
                      <div className="dash-card">
                        <h3 className={`font-medium text-base mb-4 flex items-center gap-2 ${isDark ? 'text-white/90' : 'text-gray-900'}`}>
                          <TrendingUp size={16} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                          By Level
                        </h3>
                        {levelStats.length > 0 ? (
                          <div className="space-y-2.5">
                            {levelStats.map(({ level, count }) => (
                              <div key={level} className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getLevelColor(level)}`}>{level}</span>
                                <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
                                  <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{ width: `${(count / totalWords) * 100}%` }}></div>
                                </div>
                                <span className={`text-sm w-8 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{count}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>No words yet</p>
                        )}
                      </div>

                      {/* Recently Added / To Review */}
                      <div className="dash-card">
                        {wordsToReview.length > 0 ? (
                          <>
                            <h3 className={`font-medium text-base mb-4 flex items-center gap-2 ${isDark ? 'text-white/90' : 'text-gray-900'}`}>
                              <RotateCcw size={16} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                              Review These
                            </h3>
                            <div className="space-y-1">
                              {wordsToReview.map(w => (
                                <div
                                  key={w.id}
                                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.03]'}`}
                                  onClick={() => setModal({ type: 'word', data: w })}
                                >
                                  <span className={`font-medium text-sm ${isDark ? 'text-white/90' : 'text-gray-800'}`}>{w.word}</span>
                                  <span className={`text-sm truncate flex-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{w.meaningRu}</span>
                                </div>
                              ))}
                            </div>
                            {learningWords > 5 && (
                              <button onClick={() => { setFilterStatus('learning'); setView('all-words'); }} className="mt-3 text-sm text-orange-500 hover:text-orange-400 transition-colors">
                                View all {learningWords} →
                              </button>
                            )}
                          </>
                        ) : recentWords.length > 0 ? (
                          <>
                            <h3 className={`font-medium text-base mb-4 flex items-center gap-2 ${isDark ? 'text-white/90' : 'text-gray-900'}`}>
                              <Calendar size={16} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                              Recently Added
                            </h3>
                            <div className="space-y-1">
                              {recentWords.slice(0, 5).map(w => (
                                <div
                                  key={w.id}
                                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.03]'}`}
                                  onClick={() => setModal({ type: 'word', data: w })}
                                >
                                  <span className={`font-medium text-sm ${isDark ? 'text-white/90' : 'text-gray-800'}`}>{w.word}</span>
                                  <span className={`text-sm truncate flex-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{w.meaningRu}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${getLevelColor(w.level)}`}>{w.level}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <h3 className={`font-medium text-base mb-4 flex items-center gap-2 ${isDark ? 'text-white/90' : 'text-gray-900'}`}>
                              <Calendar size={16} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                              Recent
                            </h3>
                            <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>No words yet</p>
                          </>
                        )}
                      </div>
                    </div>

                    {data.collections.length === 0 && totalWords === 0 && (
                      <div
                        className="dash-card text-center py-12 flex flex-col justify-center items-center"
                      >
                        <div className="text-6xl mb-4">📚</div>
                        <h2 className={`text-xl font-display font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Welcome to VocabMaster!</h2>
                        <p className={`mb-4 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Create a collection and start adding words.</p>
                        <button onClick={() => setModal({ type: 'collection', data: null })} className="px-5 py-2.5 bg-pink-vibrant text-white rounded-full hover:brightness-110 transition-all font-medium">
                          <Plus size={18} className="inline mr-1" /> Create Collection
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
          {view === 'all-words' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{viewTitle}</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className={`h-10 pl-4 pr-10 rounded-full text-sm font-medium transition-all appearance-none cursor-pointer ${isDark ? 'bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08]' : 'bg-white text-gray-800 border border-black/[0.06] shadow-sm hover:bg-gray-50'}`}>
                      <option className="text-black" value="all">All levels</option>{LEVELS.map(l => <option className="text-black" key={l}>{l}</option>)}
                    </select>
                    <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  </div>
                  <div className="relative">
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`h-10 pl-4 pr-10 rounded-full text-sm font-medium transition-all appearance-none cursor-pointer ${isDark ? 'bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08]' : 'bg-white text-gray-800 border border-black/[0.06] shadow-sm hover:bg-gray-50'}`}>
                      <option className="text-black" value="all">All status</option><option className="text-black" value="new">New</option><option className="text-black" value="learning">Learning</option><option className="text-black" value="learned">Learned</option>
                    </select>
                    <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">{filteredWords.length ? filteredWords.map(w => <WordCard key={w.id} word={w} />) : <div className="text-center py-12 text-gray-400">No words match filters</div>}</div>
            </>
          )}
          {view === 'song' && currentSong && (
            <div className="h-full">
              <SongAnalyzer
                song={currentSong}
                sections={data.collections.flatMap(c => c.sections.map(s => ({ ...s, collectionName: c.name })))}
                collections={data.collections}
                existingWords={data.words}
                onAddWords={async (ws) => {
                  const savedWords = [];
                  for (const w of ws) {
                    const { data: newWord, error } = await supabase
                      .from('words')
                      .insert([{
                        user_id: user.id,
                        section_id: w.sectionId,
                        word: w.word,
                        type: w.type,
                        level: w.level,
                        forms: w.forms || '',
                        meaning_en: w.meaningEn || '',
                        meaning_ru: w.meaningRu || '',
                        example: w.example || '',
                        my_example: w.myExample || '',
                        single_root_words: w.singleRootWords || '',
                        synonyms: w.synonyms || '',
                        tags: w.tags || [],
                        status: STATUS.NEW,
                        passed_modes: []
                      }])
                      .select()
                      .single();

                    if (!error && newWord) {
                      savedWords.push({
                        id: newWord.id,
                        sectionId: newWord.section_id,
                        word: newWord.word,
                        type: newWord.type,
                        level: newWord.level,
                        forms: newWord.forms,
                        meaningEn: newWord.meaning_en,
                        meaningRu: newWord.meaning_ru,
                        example: newWord.example,
                        myExample: newWord.my_example,
                        singleRootWords: newWord.single_root_words,
                        synonyms: newWord.synonyms,
                        tags: newWord.tags,
                        status: newWord.status,
                        passedModes: newWord.passed_modes
                      });
                    }
                  }
                  setData(d => ({ ...d, words: [...d.words, ...savedWords] }));
                  setToast({ message: `${savedWords.length} words added!`, canUndo: false });
                }}

                onCreateSection={createSectionFromSong}
                onUnsavedChange={setHasUnsavedWords}
                isDark={isDark}
                onClose={() => {
                  if (hasUnsavedWords) {
                    const confirmed = window.confirm('⚠️ You have unsaved words in the list.\n\nAre you sure you want to leave?\n\nProgress will be lost.');
                    if (confirmed) {
                      setHasUnsavedWords(false);
                      setCurrentSong(null);
                      setView('dashboard');
                    }
                  } else {
                    setCurrentSong(null);
                    setView('dashboard');
                  }
                }}
              />
            </div>
          )}
          {showFilters && (
            <>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{currentSection?.name || currentCollection?.name}</h2>
                <div className="flex items-center gap-2">
                  {currentSection && filteredWords.filter(w => !w.meaningEn || !w.singleRootWords || !w.synonyms).length > 0 && <button onClick={() => setModal({ type: 'fillCards', data: filteredWords.filter(w => !w.meaningEn || !w.singleRootWords || !w.synonyms) })} className="h-10 px-4 bg-purple-vibrant text-white rounded-full text-sm font-medium flex items-center gap-1.5 hover:brightness-110 transition-all"><Search size={16} /> Fill {filteredWords.filter(w => !w.meaningEn || !w.singleRootWords || !w.synonyms).length} Cards</button>}
                  <div className="relative">
                    <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className={`h-10 pl-4 pr-10 rounded-full text-sm font-medium transition-all appearance-none cursor-pointer ${isDark ? 'bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08]' : 'bg-white text-gray-800 border border-black/[0.06] shadow-sm hover:bg-gray-50'}`}>
                      <option className="text-black" value="all">All levels</option>{LEVELS.map(l => <option className="text-black" key={l}>{l}</option>)}
                    </select>
                    <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  </div>
                  <div className="relative">
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`h-10 pl-4 pr-10 rounded-full text-sm font-medium transition-all appearance-none cursor-pointer ${isDark ? 'bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08]' : 'bg-white text-gray-800 border border-black/[0.06] shadow-sm hover:bg-gray-50'}`}>
                      <option className="text-black" value="all">All status</option><option className="text-black" value="new">New</option><option className="text-black" value="learning">Learning</option><option className="text-black" value="learned">Learned</option>
                    </select>
                    <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  </div>
                </div>
              </div>
              {!currentSection && currentCollection && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">Select a section to add words.</div>}
              <div className="grid grid-cols-4 gap-3 mb-6">{[{ id: 'list', icon: BookOpen, label: 'List' }, { id: 'cards', icon: RotateCcw, label: 'Cards' }, { id: 'quiz', icon: HelpCircle, label: 'Quiz' }, { id: 'write', icon: PenTool, label: 'Write' }].map(m => <button key={m.id} onClick={() => { resetSessions(); setView(m.id); }} className={`flex items-center justify-center gap-2 px-5 py-3 rounded-full font-medium transition-all ${view === m.id ? 'bg-pink-vibrant text-white shadow-lg shadow-pink-500/20' : isDark ? 'bg-white/[0.04] border border-white/[0.06] text-white/70 hover:text-white hover:bg-white/[0.08]' : 'bg-white border border-black/[0.06] text-gray-600 hover:text-gray-900 shadow-sm'}`}><m.icon size={18} /> {m.label}</button>)}</div>
              {view === 'list' && <div className="space-y-3">{filteredWords.length ? filteredWords.map(w => <WordCard key={w.id} word={w} />) : <div className="text-center py-12 text-gray-400">No words</div>}</div>}
              {view === 'cards' && renderFlashcards()}
              {view === 'quiz' && renderQuiz()}
              {view === 'write' && renderWrite()}
            </>
          )}
        </div>
      </div>
      {modal.type === 'word' && <WordForm word={modal.data} allTags={data.allTags} existingWords={data.words} sections={data.collections.flatMap(c => c.sections.map(s => ({ ...s, collectionName: c.name })))} onSave={saveWord} onCancel={() => setModal({ type: null, data: null })} onAddTag={t => { if (!data.allTags.includes(t)) setData(d => ({ ...d, allTags: [...d.allTags, t] })); }} onDuplicateFound={msg => setAlert(msg)} isDark={isDark} />}
      {
        modal.type === 'importText' && <ImportTextModal currentSectionId={currentSection?.id}

          onImport={async (words) => {
            console.log('=== Starting import ===', words.length, 'words');

            const savedWords = [];
            for (const w of words) {
              console.log('Importing word:', w.word);

              const { data: newWord, error } = await supabase
                .from('words')
                .insert([{
                  user_id: user.id,
                  section_id: w.sectionId,
                  word: w.word,
                  type: w.type,
                  level: w.level,
                  forms: w.forms || '',
                  meaning_en: w.meaningEn || '',
                  meaning_ru: w.meaningRu || '',
                  example: w.example || '',
                  my_example: w.myExample || '',
                  single_root_words: w.singleRootWords || '',
                  synonyms: w.synonyms || '',
                  tags: w.tags || [],
                  status: STATUS.NEW,
                  passed_modes: []
                }])
                .select()
                .single();
              console.log('Result:', { newWord: newWord?.word, error });


              if (!error && newWord) {
                console.error('Supabase error details:', error);

                savedWords.push({
                  id: newWord.id,
                  sectionId: newWord.section_id,
                  word: newWord.word,
                  type: newWord.type,
                  level: newWord.level,
                  forms: newWord.forms,
                  meaningEn: newWord.meaning_en,
                  meaningRu: newWord.meaning_ru,
                  example: newWord.example,
                  myExample: newWord.my_example,
                  singleRootWords: newWord.single_root_words,
                  synonyms: newWord.synonyms,
                  tags: newWord.tags,
                  status: newWord.status,
                  passedModes: newWord.passed_modes
                });
              }
            }

            setData(d => ({ ...d, words: [...d.words, ...savedWords] }));
            setToast({ message: `${savedWords.length} words imported!`, canUndo: false });
          }}

          onCancel={() => setModal({ type: null, data: null })} isDark={isDark} />
      }
      {modal.type === 'song' && <SongModal song={modal.data?.id ? modal.data : null} folderId={modal.data?.folderId} onSave={saveSong} onUpdateSong={updateSong} onCancel={() => setModal({ type: null, data: null })} isDark={isDark} />}
      {modal.type === 'songFolder' && <Modal onClose={() => setModal({ type: null, data: null })} isDark={isDark}><h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{modal.data ? 'Edit Folder' : 'New Folder'}</h3><input defaultValue={modal.data?.name || ''} id="folder-name" className={`w-full h-10 px-3 rounded-xl focus:outline-none mb-4 ${isDark ? 'bg-[#1a1a1e] border border-white/10 text-white placeholder-gray-500' : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'}`} autoFocus /><div className="flex gap-2"><button onClick={() => setModal({ type: null, data: null })} className={`flex-1 h-10 px-4 rounded-full font-medium ${isDark ? 'border border-white/10 text-white hover:bg-white/5' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancel</button><button onClick={() => saveSongFolder(document.getElementById('folder-name').value)} className="flex-1 h-10 px-4 bg-pink-vibrant text-white rounded-full font-medium hover:brightness-110">Save</button></div></Modal>}
      {
        modal.type === 'collection' && <Modal onClose={() => setModal({ type: null, data: null })}>
          <h3 className="text-lg font-semibold mb-4">{modal.data ? 'Edit Collection' : 'New Collection'}</h3>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="grid grid-cols-10 gap-2 p-3 border rounded-lg bg-gray-50 max-h-32 overflow-y-auto">
              {COLLECTION_ICONS.map(icon => (
                <button key={icon} type="button" onClick={() => document.getElementById('col-icon').textContent = icon} className="text-2xl hover:bg-white rounded p-1 transition">{icon}</button>
              ))}
            </div>
            <div className="mt-2 text-center">
              <span className="text-3xl" id="col-icon">{modal.data?.icon || '📚'}</span>
            </div>
          </div>
          <input defaultValue={modal.data?.name || ''} id="col-name" placeholder="Collection name *" className="w-full h-10 px-3 border border-gray-700 rounded-xl bg-white/5 text-gray-100 placeholder-gray-500 focus:border-orange-500/50 focus:outline-none mb-4" autoFocus />
          <div className="flex gap-2">
            <button onClick={() => setModal({ type: null, data: null })} className="flex-1 h-10 px-4 border  rounded-lg hover:bg-white/5">Cancel</button>
            <button onClick={() => saveCollection(document.getElementById('col-name').value)} className="flex-1 h-10 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save</button>
          </div>
        </Modal>
      }
      {
        modal.type === 'section' && <Modal onClose={() => setModal({ type: null, data: null })}>
          <h3 className="text-lg font-semibold mb-4">{modal.data?.section ? 'Edit Section' : 'New Section'}</h3>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="grid grid-cols-10 gap-2 p-3 border rounded-lg bg-gray-50 max-h-32 overflow-y-auto">
              {SECTION_ICONS.map(icon => (
                <button key={icon} type="button" onClick={() => document.getElementById('sec-icon').textContent = icon} className="text-2xl hover:bg-white rounded p-1 transition">{icon}</button>
              ))}
            </div>
            <div className="mt-2 text-center">
              <span className="text-3xl" id="sec-icon">{modal.data?.section?.icon || '📖'}</span>
            </div>
          </div>
          <input defaultValue={modal.data?.section?.name || ''} id="sec-name" placeholder="Section name *" className="w-full h-10 px-3 border border-gray-700 rounded-xl bg-white/5 text-gray-100 placeholder-gray-500 focus:border-orange-500/50 focus:outline-none mb-4" autoFocus />
          <div className="flex gap-2">
            <button onClick={() => setModal({ type: null, data: null })} className="flex-1 h-10 px-4 border  rounded-lg hover:bg-white/5">Cancel</button>
            <button onClick={() => saveSection(document.getElementById('sec-name').value)} className="flex-1 h-10 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save</button>
          </div>
        </Modal>
      }
      {
        modal.type === 'fillCards' && <FillCardsModal
          words={modal.data}
          onSave={async (filledWords) => {
            // Обновляем state
            setData(d => ({
              ...d,
              words: d.words.map(w => {
                const filled = filledWords.find(x => x.id === w.id);
                return filled || w;
              })
            }));

            // Сохраняем в базу
            for (const word of filledWords) {
              await supabase
                .from('words')
                .update({
                  type: word.type,
                  level: word.level,
                  forms: word.forms,
                  meaning_en: word.meaningEn,
                  meaning_ru: word.meaningRu,
                  example: word.example,
                  single_root_words: word.singleRootWords || '',
                  synonyms: word.synonyms || ''
                })
                .eq('id', word.id);
            }

            setToast({ message: `${filledWords.length} cards filled!`, canUndo: false });
          }}
          onCancel={() => setModal({ type: null, data: null })}
          isDark={isDark}
        />
      }
      {confirmDelete && <Modal onClose={() => setConfirmDelete(null)} isDark={isDark}><h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Delete?</h3><p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Delete "{confirmDelete.name}"?</p><div className="flex gap-2"><button onClick={() => setConfirmDelete(null)} className={`flex-1 h-10 px-4 rounded-full font-medium ${isDark ? 'border border-white/10 text-white hover:bg-white/5' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancel</button><button onClick={executeDelete} className="flex-1 h-10 px-4 bg-red-500 text-white rounded-full font-medium hover:brightness-110">Delete</button></div></Modal>}
      {toast && <Toast message={toast.message} onUndo={toast.canUndo ? undoDelete : null} onClose={() => setToast(null)} />}
      {alert && <Alert message={alert} onClose={() => setAlert(null)} isDark={isDark} />}

      {wordPopup && console.log('=== wordPopup ===', wordPopup.word.singleRootWords)}
      {
        wordPopup && (

          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setWordPopup(null)}>
            <div className="bg-[#1a1a1a] rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {wordPopup.type === 'roots' ? 'Single-root words' : 'Synonyms'}
                </h3>
                <button onClick={() => setWordPopup(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              {wordPopup.type === 'roots' ? (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <div className="flex items-center gap-4 px-4 py-2 bg-gray-100 border-b font-medium text-xs text-gray-600 uppercase">
                    <div className="w-32">Word</div>
                    <div className="w-24">Part of Speech</div>
                    <div className="w-36">IPA</div>
                    <div className="flex-1">Translation</div>
                  </div>
                  {wordPopup.word.singleRootWords.split(',').map((item, idx) => {
                    const trimmed = item.trim();

                    // Парсинг формата: word (part_of_speech) /ipa/ - translation
                    // 1. Слово: все до первой открывающей скобки или пробела
                    const wordMatch = trimmed.match(/^(\S+)/);
                    const word = wordMatch ? wordMatch[1] : '';

                    // 2. Часть речи: все между круглыми скобками
                    const typeMatch = trimmed.match(/\(([^)]+)\)/);
                    const type = typeMatch ? typeMatch[1] : '';

                    // 3. IPA: все между слешами
                    const ipaMatch = trimmed.match(/\/([^/]+)\//);
                    const ipa = ipaMatch ? ipaMatch[1] : '';

                    // 4. Перевод: все после тире до конца строки или следующей запятой на верхнем уровне
                    // Ищем последнее вхождение тире, которое не в скобках или слешах
                    const dashIndex = trimmed.lastIndexOf(' - ');
                    const translation = dashIndex > -1 ? trimmed.substring(dashIndex + 3).trim() : '';

                    return (
                      <div key={idx} className={`flex items-center gap-4 px-4 py-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <div className="w-32 font-medium text-gray-100">{word || '—'}</div>
                        <div className="w-24 text-sm text-gray-600">{type || '—'}</div>
                        <div className="w-36 text-sm text-gray-500 font-mono">{ipa ? `/${ipa}/` : '—'}</div>
                        <div className="flex-1 text-sm text-blue-600">{translation || '—'}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-gray-700 leading-relaxed">
                  {wordPopup.word.synonyms}
                </div>
              )}
            </div>
          </div>
        )
      }

      {
        cardPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setCardPopup(null)}>
            <div className="bg-[#1a1a1a] rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {cardPopup.type === 'roots' ? 'Single-root words' : 'Synonyms'}
                </h3>
                <button onClick={() => setCardPopup(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              {cardPopup.type === 'roots' ? (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <div className="flex items-center gap-4 px-4 py-2 bg-gray-100 border-b font-medium text-xs text-gray-600 uppercase">
                    <div className="w-32">Word</div>
                    <div className="w-24">Part of Speech</div>
                    <div className="w-36">IPA</div>
                    <div className="flex-1">Translation</div>
                  </div>
                  {cardPopup.word.singleRootWords.split(',').map((item, idx) => {
                    const trimmed = item.trim();

                    // Парсинг формата: word (part_of_speech) /ipa/ - translation
                    // 1. Слово: все до первой открывающей скобки или пробела
                    const wordMatch = trimmed.match(/^(\S+)/);
                    const word = wordMatch ? wordMatch[1] : '';

                    // 2. Часть речи: все между круглыми скобками
                    const typeMatch = trimmed.match(/\(([^)]+)\)/);
                    const type = typeMatch ? typeMatch[1] : '';

                    // 3. IPA: все между слешами
                    const ipaMatch = trimmed.match(/\/([^/]+)\//);
                    const ipa = ipaMatch ? ipaMatch[1] : '';

                    // 4. Перевод: все после тире до конца строки
                    const dashIndex = trimmed.lastIndexOf(' - ');
                    const translation = dashIndex > -1 ? trimmed.substring(dashIndex + 3).trim() : '';

                    return (
                      <div key={idx} className={`flex items-center gap-4 px-4 py-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <div className="w-32 font-medium text-gray-100">{word || '—'}</div>
                        <div className="w-24 text-sm text-gray-600">{type || '—'}</div>
                        <div className="w-36 text-sm text-gray-500 font-mono">{ipa ? `/${ipa}/` : '—'}</div>
                        <div className="flex-1 text-sm text-blue-600">{translation || '—'}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-gray-700 leading-relaxed">
                  {cardPopup.word.synonyms}
                </div>
              )}
            </div>
          </div>
        )
      }
      {
        modal.type === 'changePassword' && (
          <Modal onClose={() => setModal({ type: null, data: null })}>
            <h3 className="text-lg font-semibold mb-4">Change Password</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const newPass = e.target.newPassword.value;
              const confirmPass = e.target.confirmPassword.value;
              if (newPass.length < 6) {
                setToast({ message: 'Password must be at least 6 characters', canUndo: false });
                return;
              }
              if (newPass !== confirmPass) {
                setToast({ message: 'Passwords do not match', canUndo: false });
                return;
              }
              handleChangePassword(newPass);
            }}>
              <input name="newPassword" type="password" placeholder="New password" className="w-full h-10 px-3 border border-gray-700 rounded-xl bg-white/5 text-gray-100 placeholder-gray-500 focus:border-orange-500/50 focus:outline-none mb-3" required minLength={6} />
              <input name="confirmPassword" type="password" placeholder="Confirm password" className="w-full h-10 px-3 border border-gray-700 rounded-xl bg-white/5 text-gray-100 placeholder-gray-500 focus:border-orange-500/50 focus:outline-none mb-4" required minLength={6} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setModal({ type: null, data: null })} className="flex-1 h-10 border  rounded-lg hover:bg-white/5">Cancel</button>
                <button type="submit" className="flex-1 h-10 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Change</button>
              </div>
            </form>
          </Modal>
        )
      }
      {
        modal.type === 'dailyGoals' && (
          <Modal onClose={() => setModal({ type: null, data: null })}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Target size={20} /> Daily Goals</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const newWords = parseInt(e.target.newWords.value) || 5;
              const reviewWords = parseInt(e.target.reviewWords.value) || 10;

              const { error } = await supabase
                .from('user_goals')
                .upsert({
                  user_id: user.id,
                  daily_new_words: newWords,
                  daily_review_words: reviewWords,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

              if (!error) {
                setUserGoals({ daily_new_words: newWords, daily_review_words: reviewWords });
                setToast({ message: 'Goals updated!', canUndo: false });
                setModal({ type: null, data: null });
              } else {
                setToast({ message: 'Failed to save goals', canUndo: false });
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">New words per day</label>
                  <input
                    name="newWords"
                    type="number"
                    min="1"
                    max="100"
                    defaultValue={userGoals.daily_new_words}
                    className="w-full h-10 px-3 border border-gray-700 rounded-xl bg-white/5 text-gray-100 placeholder-gray-500 focus:border-orange-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Words to review per day</label>
                  <input
                    name="reviewWords"
                    type="number"
                    min="1"
                    max="100"
                    defaultValue={userGoals.daily_review_words}
                    className="w-full h-10 px-3 border border-gray-700 rounded-xl bg-white/5 text-gray-100 placeholder-gray-500 focus:border-orange-500/50 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setModal({ type: null, data: null })} className="flex-1 h-10 border  rounded-lg hover:bg-white/5">Cancel</button>
                <button type="submit" className="flex-1 h-10 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save</button>
              </div>
            </form>
          </Modal>
        )
      }
    </div>
  );
}
