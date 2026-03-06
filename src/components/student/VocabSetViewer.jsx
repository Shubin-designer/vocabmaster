import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
  X, Volume2, ChevronLeft, ChevronRight, RotateCcw,
  Check, BookOpen, Star, Shuffle, Eye, EyeOff
} from 'lucide-react';

export default function VocabSetViewer({ assignment, onClose, onProgress, isDark = true }) {
  const [set, setSet] = useState(null);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [mode, setMode] = useState('browse'); // 'browse' | 'flashcards' | 'quiz'
  const [progress, setProgress] = useState({});
  const [shuffled, setShuffled] = useState(false);

  useEffect(() => {
    if (assignment) {
      loadSetAndWords();
    }
  }, [assignment]);

  const loadSetAndWords = async () => {
    setLoading(true);

    // Load vocabulary set
    const { data: setData, error: setError } = await supabase
      .from('vocabulary_sets')
      .select('*')
      .eq('id', assignment.set_id)
      .single();

    if (setError || !setData) {
      setLoading(false);
      return;
    }

    setSet(setData);

    // Load words from vocabulary table
    if (setData.word_ids && setData.word_ids.length > 0) {
      const { data: wordsData } = await supabase
        .from('words')
        .select('*')
        .in('id', setData.word_ids);

      if (wordsData) {
        setWords(wordsData);
      }
    }

    // Load progress
    const { data: progressData } = await supabase
      .from('vocabulary_assignment_progress')
      .select('*')
      .eq('assignment_id', assignment.id);

    if (progressData) {
      const progressMap = {};
      progressData.forEach(p => {
        progressMap[p.word_id] = p;
      });
      setProgress(progressMap);
    }

    setLoading(false);
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };

  const markWordStatus = async (wordId, status) => {
    const existingProgress = progress[wordId];

    if (existingProgress) {
      await supabase
        .from('vocabulary_assignment_progress')
        .update({
          current_status: status,
          practice_count: existingProgress.practice_count + 1,
          last_practiced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProgress.id);
    } else {
      await supabase
        .from('vocabulary_assignment_progress')
        .insert({
          assignment_id: assignment.id,
          word_id: wordId,
          current_status: status,
          practice_count: 1,
          last_practiced_at: new Date().toISOString()
        });
    }

    setProgress(prev => ({
      ...prev,
      [wordId]: {
        ...prev[wordId],
        current_status: status,
        practice_count: (prev[wordId]?.practice_count || 0) + 1
      }
    }));

    onProgress?.();
  };

  const shuffleWords = () => {
    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
    setWords(shuffledWords);
    setShuffled(true);
    setCurrentIndex(0);
  };

  const nextWord = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowMeaning(false);
    }
  };

  const prevWord = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowMeaning(false);
    }
  };

  const getProgressStats = () => {
    const total = words.length;
    const learned = Object.values(progress).filter(p => p.current_status === 'learned').length;
    const learning = Object.values(progress).filter(p => p.current_status === 'learning').length;
    return { total, learned, learning, new: total - learned - learning };
  };

  const stats = getProgressStats();
  const currentWord = words[currentIndex];

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className={`text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-sm">
      <div className={`flex-1 flex flex-col max-w-4xl mx-auto w-full ${
        isDark ? 'bg-[#0a0a0b]' : 'bg-gray-50'
      }`}>
        {/* Header */}
        <header className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {set?.title || 'Vocabulary Set'}
            </h2>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              {words.length} words • {stats.learned} learned
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100'}`}
          >
            <X size={24} className={isDark ? 'text-white/60' : 'text-gray-500'} />
          </button>
        </header>

        {/* Progress bar */}
        <div className={`h-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(stats.learned / stats.total) * 100}%` }}
          />
        </div>

        {/* Mode tabs */}
        <div className={`flex gap-2 p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          {[
            { key: 'browse', label: 'Browse', icon: BookOpen },
            { key: 'flashcards', label: 'Flashcards', icon: RotateCcw },
          ].map(m => (
            <button
              key={m.key}
              onClick={() => { setMode(m.key); setCurrentIndex(0); setShowMeaning(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                mode === m.key
                  ? 'bg-pink-vibrant text-white'
                  : isDark
                    ? 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <m.icon size={18} />
              {m.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={shuffleWords}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              isDark
                ? 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Shuffle size={18} />
            Shuffle
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {mode === 'browse' ? (
            // Browse mode - list all words
            <div className="space-y-3">
              {words.map((word, idx) => {
                const wordProgress = progress[word.id];
                const status = wordProgress?.current_status || 'new';
                return (
                  <div
                    key={word.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isDark
                        ? 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]'
                        : 'bg-white border-gray-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {word.word}
                          </h3>
                          <button
                            onClick={() => speak(word.word)}
                            className={`p-1.5 rounded-lg ${
                              isDark ? 'hover:bg-white/[0.1] text-white/50' : 'hover:bg-gray-100 text-gray-400'
                            }`}
                          >
                            <Volume2 size={16} />
                          </button>
                          {word.level && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {word.level}
                            </span>
                          )}
                        </div>
                        {word.meaning_ru && (
                          <p className={`mt-1 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                            {word.meaning_ru}
                          </p>
                        )}
                        {word.meaning_en && (
                          <p className={`mt-1 text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                            {word.meaning_en}
                          </p>
                        )}
                        {word.example && (
                          <p className={`mt-2 text-sm italic ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                            "{word.example}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => markWordStatus(word.id, 'learning')}
                          className={`p-2 rounded-xl transition-all ${
                            status === 'learning'
                              ? 'bg-yellow-500/20 text-yellow-500'
                              : isDark
                                ? 'hover:bg-white/[0.05] text-white/40'
                                : 'hover:bg-gray-100 text-gray-400'
                          }`}
                          title="Mark as learning"
                        >
                          <Star size={18} />
                        </button>
                        <button
                          onClick={() => markWordStatus(word.id, 'learned')}
                          className={`p-2 rounded-xl transition-all ${
                            status === 'learned'
                              ? 'bg-green-500/20 text-green-500'
                              : isDark
                                ? 'hover:bg-white/[0.05] text-white/40'
                                : 'hover:bg-gray-100 text-gray-400'
                          }`}
                          title="Mark as learned"
                        >
                          <Check size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Flashcard mode
            <div className="flex flex-col items-center justify-center h-full">
              {currentWord ? (
                <>
                  {/* Flashcard */}
                  <div
                    onClick={() => setShowMeaning(!showMeaning)}
                    className={`w-full max-w-lg aspect-[3/2] rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all transform hover:scale-[1.02] ${
                      isDark
                        ? 'bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10'
                        : 'bg-white border border-gray-200 shadow-xl'
                    }`}
                  >
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {currentWord.word}
                        </h2>
                        <button
                          onClick={(e) => { e.stopPropagation(); speak(currentWord.word); }}
                          className={`p-2 rounded-xl ${
                            isDark ? 'hover:bg-white/[0.1] text-white/50' : 'hover:bg-gray-100 text-gray-400'
                          }`}
                        >
                          <Volume2 size={24} />
                        </button>
                      </div>

                      {showMeaning ? (
                        <div className="space-y-3">
                          {currentWord.meaning_ru && (
                            <p className={`text-xl ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                              {currentWord.meaning_ru}
                            </p>
                          )}
                          {currentWord.meaning_en && (
                            <p className={`text-base ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                              {currentWord.meaning_en}
                            </p>
                          )}
                          {currentWord.example && (
                            <p className={`text-sm italic mt-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                              "{currentWord.example}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className={`text-sm ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                          <Eye size={16} className="inline mr-1" />
                          Tap to reveal meaning
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Navigation & Actions */}
                  <div className="flex items-center gap-4 mt-8">
                    <button
                      onClick={prevWord}
                      disabled={currentIndex === 0}
                      className={`p-3 rounded-xl transition-all disabled:opacity-30 ${
                        isDark ? 'hover:bg-white/[0.05] text-white' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <ChevronLeft size={24} />
                    </button>

                    <button
                      onClick={() => markWordStatus(currentWord.id, 'learning')}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                        progress[currentWord.id]?.current_status === 'learning'
                          ? 'bg-yellow-500 text-white'
                          : isDark
                            ? 'bg-white/[0.05] text-white/80 hover:bg-white/[0.1]'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Star size={18} />
                      Learning
                    </button>

                    <button
                      onClick={() => { markWordStatus(currentWord.id, 'learned'); nextWord(); }}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl font-medium bg-green-500 text-white hover:bg-green-600 transition-all"
                    >
                      <Check size={18} />
                      Know it
                    </button>

                    <button
                      onClick={nextWord}
                      disabled={currentIndex === words.length - 1}
                      className={`p-3 rounded-xl transition-all disabled:opacity-30 ${
                        isDark ? 'hover:bg-white/[0.05] text-white' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <ChevronRight size={24} />
                    </button>
                  </div>

                  {/* Progress indicator */}
                  <p className={`mt-4 text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                    {currentIndex + 1} / {words.length}
                  </p>
                </>
              ) : (
                <div className={`text-center ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  No words in this set
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer stats */}
        <footer className={`px-6 py-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className={`text-2xl font-bold text-green-500`}>{stats.learned}</p>
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Learned</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold text-yellow-500`}>{stats.learning}</p>
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Learning</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{stats.new}</p>
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>New</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
