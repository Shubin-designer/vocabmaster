import { useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import {
  X, BookOpen, Volume2, Plus, Check, Loader,
  ChevronLeft, ChevronRight, Eye, EyeOff
} from 'lucide-react';

export default function InteractiveReader({
  text,
  studentId,
  onClose,
  onAddWord,
  isDark = true,
}) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [wordPosition, setWordPosition] = useState({ x: 0, y: 0 });
  const [addingWord, setAddingWord] = useState(false);
  const [addedWords, setAddedWords] = useState(new Set());

  // Parse text into words while preserving punctuation and spacing
  const parseText = useCallback((content) => {
    if (!content) return [];

    // Split by word boundaries but keep delimiters
    const parts = content.split(/(\s+|[.,!?;:'"()\[\]{}—–-])/);

    return parts.map((part, index) => {
      const isWord = /^[a-zA-Zа-яА-ЯёЁ]+$/.test(part);
      return {
        text: part,
        isWord,
        index,
        lowerText: isWord ? part.toLowerCase() : null,
      };
    });
  }, []);

  const words = parseText(text.content);

  const handleWordClick = (word, event) => {
    if (!word.isWord) return;

    const rect = event.target.getBoundingClientRect();
    setWordPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    });
    setSelectedWord(word);
  };

  const closeWordPopup = () => {
    setSelectedWord(null);
  };

  const getHint = (word) => {
    if (!text.vocabulary_hints || !word) return null;
    return text.vocabulary_hints[word.lowerText];
  };

  const handleAddToVocabulary = async () => {
    if (!selectedWord || addedWords.has(selectedWord.lowerText)) return;

    setAddingWord(true);

    // Call parent handler to add word
    const hint = getHint(selectedWord);
    await onAddWord?.({
      word: selectedWord.text,
      translation: hint || '',
    });

    setAddedWords(prev => new Set([...prev, selectedWord.lowerText]));
    setAddingWord(false);
    closeWordPopup();
  };

  const speakWord = (word) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = text.language === 'ru' ? 'ru-RU' : 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  const hint = selectedWord ? getHint(selectedWord) : null;
  const isAdded = selectedWord && addedWords.has(selectedWord.lowerText);

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
            onClick={onClose}
            className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X size={20} />
          </button>
          <div>
            <h1 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {text.title}
            </h1>
            <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              {text.level && <span className="mr-2">{text.level}</span>}
              Click on words to see hints
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {text.translation && (
            <button
              onClick={() => setShowTranslation(!showTranslation)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                showTranslation
                  ? 'bg-pink-vibrant text-white'
                  : isDark
                    ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {showTranslation ? <EyeOff size={16} /> : <Eye size={16} />}
              Translation
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8" onClick={closeWordPopup}>
        <div className="max-w-3xl mx-auto">
          {/* Reading text */}
          <div className={`p-6 rounded-2xl mb-6 ${
            isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-white border border-gray-200 shadow-sm'
          }`}>
            <div className={`text-lg leading-relaxed ${isDark ? 'text-white/90' : 'text-gray-800'}`}>
              {words.map((word, idx) => {
                if (!word.isWord) {
                  // Render whitespace and punctuation as-is
                  return <span key={idx}>{word.text}</span>;
                }

                const hasHint = !!getHint(word);
                const isSelected = selectedWord?.index === word.index;
                const wordIsAdded = addedWords.has(word.lowerText);

                return (
                  <span
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); handleWordClick(word, e); }}
                    className={`cursor-pointer transition-all rounded px-0.5 -mx-0.5 ${
                      isSelected
                        ? 'bg-pink-vibrant text-white'
                        : hasHint
                          ? isDark
                            ? 'hover:bg-yellow-500/20 text-yellow-300 underline decoration-dotted decoration-yellow-500/50'
                            : 'hover:bg-yellow-100 text-yellow-700 underline decoration-dotted decoration-yellow-400'
                          : wordIsAdded
                            ? isDark
                              ? 'text-green-400'
                              : 'text-green-600'
                            : isDark
                              ? 'hover:bg-white/10'
                              : 'hover:bg-gray-100'
                    }`}
                  >
                    {word.text}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Translation panel */}
          {showTranslation && text.translation && (
            <div className={`p-6 rounded-2xl ${
              isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
            }`}>
              <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                Translation
              </h3>
              <div className={`text-base leading-relaxed ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
                {text.translation}
              </div>
            </div>
          )}

          {/* Vocabulary hints legend */}
          {text.vocabulary_hints && Object.keys(text.vocabulary_hints).length > 0 && (
            <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
              <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                Vocabulary ({Object.keys(text.vocabulary_hints).length} words)
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(text.vocabulary_hints).map(([word, translation]) => (
                  <span
                    key={word}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      addedWords.has(word)
                        ? isDark
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-green-100 text-green-700'
                        : isDark
                          ? 'bg-yellow-500/10 text-yellow-300'
                          : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    <strong>{word}</strong>: {translation}
                    {addedWords.has(word) && <Check size={12} className="inline ml-1" />}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Word popup */}
      {selectedWord && (
        <div
          className="fixed z-50"
          style={{
            left: Math.min(wordPosition.x, window.innerWidth - 200),
            top: Math.min(wordPosition.y, window.innerHeight - 150),
            transform: 'translateX(-50%)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className={`rounded-2xl p-4 shadow-xl min-w-[200px] ${
            isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-gray-200'
          }`}>
            {/* Word */}
            <div className="flex items-center justify-between mb-2">
              <span className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {selectedWord.text}
              </span>
              <button
                onClick={() => speakWord(selectedWord.text)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <Volume2 size={16} />
              </button>
            </div>

            {/* Hint translation */}
            {hint ? (
              <p className={`text-sm mb-3 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                {hint}
              </p>
            ) : (
              <p className={`text-sm mb-3 italic ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                No hint available
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={closeWordPopup}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Close
              </button>
              <button
                onClick={handleAddToVocabulary}
                disabled={addingWord || isAdded}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isAdded
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-pink-vibrant text-white hover:brightness-110'
                } disabled:opacity-50`}
              >
                {addingWord ? (
                  <Loader size={14} className="animate-spin" />
                ) : isAdded ? (
                  <Check size={14} />
                ) : (
                  <Plus size={14} />
                )}
                {isAdded ? 'Added' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={`px-4 py-4 border-t ${isDark ? 'bg-[#0a0a0b] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            {addedWords.size > 0 && (
              <span className="text-green-500">{addedWords.size} word{addedWords.size !== 1 ? 's' : ''} added</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2.5 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 transition-all"
          >
            <Check size={18} />
            Done
          </button>
        </div>
      </footer>
    </div>
  );
}
