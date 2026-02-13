import { useState, useEffect, useMemo } from 'react';
import { Plus, Volume2, RotateCcw, Check, X, BookOpen, PenTool, HelpCircle, ChevronRight, Download, Trash2, Edit2, ChevronDown, Home, Menu, Search, Loader, Upload, Undo2, RefreshCw } from 'lucide-react';
import { supabase } from './supabaseClient';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const WORD_TYPES = ['noun', 'verb', 'adjective', 'adverb', 'phrasal verb', 'idiom', 'phrase', 'preposition', 'conjunction', 'interjection'];
const STATUS = { NEW: 'new', LEARNING: 'learning', LEARNED: 'learned' };
const getLevelColor = l => ({ A1: 'bg-green-100 text-green-700', A2: 'bg-green-200 text-green-800', B1: 'bg-yellow-100 text-yellow-700', B2: 'bg-yellow-200 text-yellow-800', C1: 'bg-red-100 text-red-700', C2: 'bg-red-200 text-red-800' }[l] || 'bg-gray-100');
const getStatusColor = s => ({ 'new': 'bg-blue-100 text-blue-700', 'learning': 'bg-yellow-100 text-yellow-700', 'learned': 'bg-green-100 text-green-700' }[s] || 'bg-gray-100');

const COLLECTION_ICONS = ['📚', '📖', '🎬', '💼', '✈️', '🍕', '🎵', '⚽', '💻', '🎓', '🏥', '🎨', '🏠', '🚗', '👔', '🌳', '🎯', '⭐', '🔥', '💡'];
const SECTION_ICONS = ['📖', '📝', '🎬', '🎥', '💼', '🏢', '✈️', '🌍', '🍕', '🍔', '🎵', '🎸', '⚽', '🏀', '💻', '🖥️', '🎓', '📚', '🏥', '⚕️', '🎨', '🖼️', '🏠', '🏡', '🚗', '🚙', '👔', '👗', '🌳', '🌺', '🎯', '⭐'];

const initialData = { collections: [{ id: 'c1', name: 'English', icon: '📚', sections: [{ id: 's1', name: 'Topic 1', icon: '📖' }] }], words: [], allTags: [], songFolders: [{ id: 'sf1', name: 'My Songs' }], songs: [] };

const Modal = ({ children, onClose, preventClose, wide, medium }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={preventClose ? undefined : onClose}>
    <div className={`bg-white rounded-xl p-6 w-full ${wide ? 'max-w-6xl' : medium ? 'max-w-4xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>{children}</div>
  </div>
);

const Toast = ({ message, onUndo, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  return <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50"><span>{message}</span>{onUndo && <button onClick={onUndo} className="px-2 py-1 bg-white/20 rounded"><Undo2 size={14} /></button>}<button onClick={onClose}>×</button></div>;
};

const Alert = ({ message, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full border-l-4 border-red-500 transform scale-100 animate-bounce-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Word Already Exists</h3>
            <p className="text-gray-700 text-base">{message}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X size={24} />
          </button>
        </div>
      </div>
      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
      `}</style>
    </div>
  );
};

const ProgressBar = ({ current, total, correct, wrong }) => (
  <div className="mb-4">
    <div className="flex justify-between text-sm text-gray-600 mb-1"><span>{current + 1}/{total}</span><span className="text-green-600">{correct}✓</span></div>
    <div className="w-full bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${((current + 1) / total) * 100}%` }}></div></div>
  </div>
);

const CompletionScreen = ({ title, stats, onRestart, onBack, wrongWords }) => {
  const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  return (
    <div className="max-w-md mx-auto text-center py-8">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-6xl mb-4">{pct >= 80 ? '🎉' : '💪'}</div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <div className="flex justify-center gap-6 my-6">
          <div><div className="text-3xl font-bold text-green-600">{stats.correct}</div><div className="text-sm text-gray-500">Know</div></div>
          <div><div className="text-3xl font-bold text-red-400">{stats.total - stats.correct}</div><div className="text-sm text-gray-500">Don't know</div></div>
        </div>
        {wrongWords.length > 0 && <div className="text-left mb-4 p-3 bg-red-50 rounded-lg"><div className="text-sm text-red-700 mb-2">To review:</div><div className="flex flex-wrap gap-1">{wrongWords.map(w => <span key={w.id} className="text-xs bg-red-100 px-2 py-1 rounded">{w.word}</span>)}</div></div>}
        <div className="flex gap-3"><button onClick={onBack} className="flex-1 p-3 border rounded-lg">Back</button><button onClick={onRestart} className="flex-1 p-3 bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2"><RefreshCw size={18}/>Again</button></div>
      </div>
    </div>
  );
};

const ImportTextModal = ({ onImport, onCancel, currentSectionId }) => {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState([]);
  
  const parseText = () => {
    const lines = text.split('\n').filter(line => line.trim());
    const parsed = [];
    
    lines.forEach((line, idx) => {
      const parts = line.split(/\t|=/).map(p => p.trim());
      
      if (parts.length >= 2) {
        const word = parts[0];
        const meaningRu = parts.length === 3 ? parts[1] : '';
        const meaningEn = parts.length === 3 ? parts[2] : parts[1];
        
        parsed.push({
          id: Date.now() + idx,
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
    <Modal onClose={onCancel} wide>
      <h3 className="text-lg font-semibold mb-4">Import</h3>
      <textarea 
        value={text} 
        onChange={e => setText(e.target.value)} 
        placeholder="Paste text in format: word [tab] translation description"
        className="w-full px-3 py-2 border rounded-lg h-48 mb-3 font-mono text-sm"
      />
      {preview.length === 0 && (
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 h-10 px-4 border rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={parseText} disabled={!text.trim()} className="flex-1 h-10 px-4 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600">Parse</button>
        </div>
      )}
      {preview.length > 0 && (
        <>
          <div className="text-sm text-gray-600 mb-2">{preview.length} words found</div>
          <div className="max-h-64 overflow-y-auto border rounded-lg mb-3 bg-gray-50">
            {preview.map((w, i) => (
              <div key={i} className="p-2 border-b text-sm">
                <div className="font-medium">{w.word}</div>
                {w.meaningRu && <div className="text-blue-600">→ {w.meaningRu}</div>}
                <div className="text-gray-600">{w.meaningEn}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 h-10 px-4 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={() => { onImport(preview); onCancel(); }} className="flex-1 h-10 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600">Import {preview.length} words</button>
          </div>
        </>
      )}
    </Modal>
  );
};

const FillFieldModal = ({ words, fieldName, fieldLabel, icon, onFill, onCancel }) => {
  const [filling, setFilling] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: words.length });
  const [results, setResults] = useState([]);

  const doFill = async () => {
    setFilling(true);
    const filled = [];
    for (let i = 0; i < words.length; i++) {
      setProgress({ current: i + 1, total: words.length });
      const word = words[i];
      try {
        const prompt = fieldName === 'singleRootWords' 
          ? `Generate 4-6 single-root words related to "${word.word}" (${word.type}).

CRITICAL: You MUST return ONLY a JSON object with a "words" field containing a comma-separated string.

EXACT FORMAT for each word in the string:
word (part_of_speech) /IPA_transcription/ - Russian_translation

EXAMPLE OUTPUT for "teach":
{"words":"teach (verb) /tiːtʃ/ - учить, teacher (noun) /ˈtiːtʃər/ - учитель, teaching (noun) /ˈtiːtʃɪŋ/ - обучение, taught (past tense) /tɔːt/ - научил, teachable (adjective) /ˈtiːtʃəbl/ - обучаемый, unteachable (adjective) /ʌnˈtiːtʃəbl/ - необучаемый"}

RULES:
1. Every word MUST have ALL 4 parts: word, (part_of_speech), /IPA/, - translation
2. Use standard parts of speech: noun, verb, adjective, adverb, past tense, gerund, past participle, etc.
3. IPA must be in British English pronunciation format
4. Translation must be in Russian
5. Separate entries with commas ONLY
6. NO markdown, NO explanations, ONLY the JSON object

Return ONLY valid JSON.`
          : `For the word "${word.word}" (${word.type}), provide 4-6 synonyms with brief context. Return JSON: {"synonyms":"synonym1, synonym2, ..."}. Only JSON.`;
        
        const res = await fetch('https://api.anthropic.com/v1/messages', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
            model: 'claude-sonnet-4-20250514', 
            max_tokens: 500, 
            messages: [{ role: 'user', content: prompt }] 
          }) 
        });
        
        if (res.ok) { 
          const data = await res.json(); 
          let text = data.content?.[0]?.text || ''; 
          text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim(); 
          const m = text.match(/\{[\s\S]*\}/); 
          if (m) { 
            const p = JSON.parse(m[0]); 
            const value = fieldName === 'singleRootWords' ? p.words : p.synonyms;
            filled.push({ ...word, [fieldName]: value || word[fieldName] }); 
          } else filled.push(word); 
        } else filled.push(word);
      } catch (e) { filled.push(word); }
      setResults([...filled]);
      await new Promise(r => setTimeout(r, 500));
    }
    setFilling(false);
  };

  return (
    <Modal onClose={onCancel} preventClose>
      <h3 className="text-lg font-semibold mb-4">{icon} {fieldLabel} for {words.length} words</h3>
      {!filling && results.length === 0 ? (
        <>
          <p className="text-gray-600 mb-4">This will generate {fieldLabel.toLowerCase()} for {words.length} words.</p>
          <div className="max-h-48 overflow-y-auto border rounded-lg p-3 mb-4 bg-gray-50">{words.map((w, i) => <div key={i} className="text-sm">{w.word}</div>)}</div>
          <div className="flex gap-2"><button onClick={onCancel} className="flex-1 h-10 px-4 border rounded-lg hover:bg-gray-50">Cancel</button><button onClick={doFill} className="flex-1 h-10 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Start</button></div>
        </>
      ) : (
        <>
          <div className="mb-4"><div className="flex justify-between text-sm text-gray-600 mb-2"><span>Generating...</span><span>{progress.current}/{progress.total}</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div></div></div>
          {results.length > 0 && <div className="max-h-48 overflow-y-auto border rounded-lg mb-4">{results.map((w, i) => <div key={i} className="p-2 border-b"><div className="font-medium">{w.word}</div>{w[fieldName] && <div className="text-sm text-blue-600">→ {w[fieldName]}</div>}</div>)}</div>}
          {!filling && <div className="flex gap-2"><button onClick={onCancel} className="flex-1 h-10 px-4 border rounded-lg hover:bg-gray-50">Cancel</button><button onClick={() => { onFill(results); onCancel(); }} className="flex-1 h-10 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600">Save {results.length}</button></div>}
        </>
      )}
    </Modal>
  );
};

const TranslateEmptyModal = ({ words, onTranslate, onCancel }) => {
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: words.length });
  const [results, setResults] = useState([]);

  const doTranslate = async () => {
    setTranslating(true);
    const translated = [];
    for (let i = 0; i < words.length; i++) {
      setProgress({ current: i + 1, total: words.length });
      const word = words[i];
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 500, messages: [{ role: 'user', content: `Analyze: "${word.word}". Return JSON: {"type":"phrase/verb/noun/etc","level":"A1-C2","meaningEn":"definition","meaningRu":"перевод","phonetic":"/ipa/","example":"sentence","singleRootWords":"related words","synonyms":"synonyms list"}. Only JSON.` }] }) });
        if (res.ok) { const data = await res.json(); let text = data.content?.[0]?.text || ''; text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim(); const m = text.match(/\{[\s\S]*\}/); if (m) { const p = JSON.parse(m[0]); translated.push({ ...word, type: p.type || word.type, level: p.level || word.level, meaningEn: p.meaningEn || '', meaningRu: p.meaningRu || '', forms: p.phonetic || word.forms, example: p.example || word.example, singleRootWords: p.singleRootWords || word.singleRootWords || '', synonyms: p.synonyms || word.synonyms || '' }); } else translated.push(word); } else translated.push(word);
      } catch (e) { translated.push(word); }
      setResults([...translated]);
      await new Promise(r => setTimeout(r, 500));
    }
    setTranslating(false);
  };

  return (
    <Modal onClose={onCancel} preventClose>
      <h3 className="text-lg font-semibold mb-4">Translate {words.length} words</h3>
      {!translating && results.length === 0 ? (
        <>
          <p className="text-gray-600 mb-4">This will translate {words.length} words without definitions.</p>
          <div className="max-h-48 overflow-y-auto border rounded-lg p-3 mb-4 bg-gray-50">{words.map((w, i) => <div key={i} className="text-sm">{w.word}</div>)}</div>
          <div className="flex gap-2"><button onClick={onCancel} className="flex-1 h-10 px-4 border rounded-lg hover:bg-gray-50">Cancel</button><button onClick={doTranslate} className="flex-1 h-10 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Start</button></div>
        </>
      ) : (
        <>
          <div className="mb-4"><div className="flex justify-between text-sm text-gray-600 mb-2"><span>Translating...</span><span>{progress.current}/{progress.total}</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div></div></div>
          {results.length > 0 && <div className="max-h-48 overflow-y-auto border rounded-lg mb-4">{results.map((w, i) => <div key={i} className="p-2 border-b"><div className="font-medium">{w.word}</div>{w.meaningRu && <div className="text-sm text-blue-600">→ {w.meaningRu}</div>}</div>)}</div>}
          {!translating && <div className="flex gap-2"><button onClick={onCancel} className="flex-1 h-10 px-4 border rounded-lg hover:bg-gray-50">Cancel</button><button onClick={() => { onTranslate(results); onCancel(); }} className="flex-1 h-10 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600">Save {results.length}</button></div>}
        </>
      )}
    </Modal>
  );
};

const WordForm = ({ word, allTags, existingWords, sections, onSave, onCancel, onAddTag, onDuplicateFound }) => {
  const [form, setForm] = useState({ ...word, tags: word.tags || [] });
  const [loading, setLoading] = useState(false);
  const [translations, setTranslations] = useState([]);
  const [translationsWithExamples, setTranslationsWithExamples] = useState([]);
  const [addedTranslations, setAddedTranslations] = useState(new Set());
  const [hasLookedUp, setHasLookedUp] = useState(false);
  
  const doLookup = async (auto = false) => {
    if (!form.word.trim() || loading) return;
    if (auto && hasLookedUp) return;
    
    // Проверка дубликата ПЕРЕД вызовом API (только если это новое слово или изменилось название)
    const cleaned = form.word.trim().toLowerCase();
    const existingWord = existingWords.find(w => w.word.toLowerCase() === cleaned);
    
    if (existingWord && existingWord.id !== form.id) {
      const sec = sections.find(s => s.id === existingWord.sectionId);
      const location = sec ? `${sec.collectionName} › ${sec.name}` : 'Unknown section';
      onDuplicateFound(`"${form.word}" already exists in: ${location}`);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          model: 'claude-sonnet-4-20250514', 
          max_tokens: 1500, 
          messages: [{ 
            role: 'user', 
            content: `Analyze: "${form.word.trim()}". Return JSON with multiple meanings (2-4 most common): {"type":"phrase/verb/noun/etc","level":"A1-C2","phonetic":"/ipa/","meaningEn":"main definition","meanings":[{"ru":"перевод 1","example":"example 1"},{"ru":"перевод 2","example":"example 2"}],"singleRootWords":"comma-separated list of related words with same root","synonyms":"comma-separated list of synonyms"}. Only JSON.` 
          }] 
        }) 
      });
      if (res.ok) { 
        const data = await res.json(); 
        let text = data.content?.[0]?.text || ''; 
        text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim(); 
        const p = JSON.parse(text); 
        
        const firstRu = p.meanings?.[0]?.ru || '';
        const firstExample = p.meanings?.[0]?.example || '';
        
        setForm(f => ({ 
          ...f, 
          type: p.type || f.type, 
          level: p.level || f.level, 
          forms: p.phonetic || f.forms,
          meaningEn: p.meaningEn || f.meaningEn,
          meaningRu: auto ? (f.meaningRu || firstRu) : (firstRu || f.meaningRu),
          example: auto ? (f.example || firstExample) : (firstExample || f.example),
          singleRootWords: p.singleRootWords || f.singleRootWords,
          synonyms: p.synonyms || f.synonyms
        }));
        
        // Сохраняем переводы с примерами
        if (p.meanings && Array.isArray(p.meanings)) {
          setTranslationsWithExamples(p.meanings);
          setTranslations(p.meanings.map(m => m.ru));
          // Отмечаем первый перевод как добавленный
          if (firstRu) {
            setAddedTranslations(new Set([firstRu.toLowerCase()]));
          }
        }
        setHasLookedUp(true);
      }
    } catch (e) {}
    setLoading(false);
  };
  
  // Авто-lookup при фокусе на поле перевода
  const handleTranslationFocus = () => {
    if (form.word.trim() && !hasLookedUp && translations.length === 0) {
      doLookup(true);
    }
  };
  
  const addTranslation = (t) => {
    if (addedTranslations.has(t.toLowerCase())) return;
    
    setForm(f => {
      const current = f.meaningRu.trim();
      return { ...f, meaningRu: current ? `${current}, ${t}` : t };
    });
    
    // Отмечаем как добавленный
    setAddedTranslations(prev => new Set([...prev, t.toLowerCase()]));
    
    // Найти пример для этого перевода и добавить к существующим примерам
    const meaning = translationsWithExamples.find(m => m.ru === t);
    if (meaning?.example) {
      setForm(f => {
        const currentExample = f.example.trim();
        return { ...f, example: currentExample ? `${currentExample}\n${meaning.example}` : meaning.example };
      });
    }
  };
  
  const isTranslationAdded = (t) => {
    if (!t) return false;
    return addedTranslations.has(t.toLowerCase());
  };
  
  return (
    <Modal onClose={onCancel} preventClose>
      <div style={{ maxHeight: '90vh', overflow: 'auto' }}>
        <h3 className="text-lg font-semibold mb-4">{word.id ? 'Edit Word' : 'Add Word'}</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input className="flex-1 h-10 px-3 border rounded-lg" placeholder="Word *" value={form.word} onChange={e => setForm({ ...form, word: e.target.value })} />
            <button onClick={() => doLookup(false)} disabled={loading || !form.word.trim()} className="h-10 px-4 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600">
              {loading ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
            </button>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select className="w-full h-10 pl-3 pr-8 border border-gray-300 rounded-lg bg-white text-sm hover:bg-gray-50 appearance-none" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {WORD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
            <div className="relative w-20">
              <select className="w-full h-10 pl-3 pr-8 border border-gray-300 rounded-lg bg-white text-sm hover:bg-gray-50 appearance-none" value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                {LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
          </div>
          <input className="w-full h-10 px-3 border rounded-lg" placeholder="IPA" value={form.forms} onChange={e => setForm({ ...form, forms: e.target.value })} />
          <textarea className="w-full px-3 py-2 border rounded-lg" placeholder="Meaning (English) *" value={form.meaningEn} onChange={e => setForm({ ...form, meaningEn: e.target.value })} rows={2} />
          <div>
            <div className="relative">
              <input 
                className="w-full h-10 px-3 border rounded-lg" 
                placeholder="Перевод" 
                value={form.meaningRu} 
                onChange={e => setForm({ ...form, meaningRu: e.target.value })} 
                onFocus={handleTranslationFocus}
                autoComplete="off"
              />
              {loading && <Loader size={16} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />}
            </div>
            {translations.length > 0 && (
              <div className="mt-1">
                <span className="text-xs text-gray-500 mr-1">Click to add:</span>
                {translations.map((t, i) => {
                  const isAdded = isTranslationAdded(t);
                  return <button key={i} type="button" onClick={() => addTranslation(t)} disabled={isAdded} className={`text-xs px-2 py-1 rounded mr-1 mb-1 ${isAdded ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-blue-100'}`}>{isAdded ? '✓' : '+'} {t}</button>;
                })}
              </div>
            )}
          </div>
          <textarea className="w-full px-3 py-2 border rounded-lg" placeholder="Example" value={form.example} onChange={e => setForm({ ...form, example: e.target.value })} rows={2} />
          <textarea className="w-full px-3 py-2 border rounded-lg bg-yellow-50 text-gray-900" placeholder="My example" value={form.myExample || ''} onChange={e => setForm({ ...form, myExample: e.target.value })} rows={2} />
          <input className="w-full h-10 px-3 border rounded-lg bg-purple-50 text-gray-900" placeholder="Single-root words (e.g., teach, teacher, teaching)" value={form.singleRootWords || ''} onChange={e => setForm({ ...form, singleRootWords: e.target.value })} />
          <input className="w-full h-10 px-3 border rounded-lg bg-blue-50 text-gray-900" placeholder="Synonyms (e.g., big, large, huge)" value={form.synonyms || ''} onChange={e => setForm({ ...form, synonyms: e.target.value })} />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="flex-1 h-10 px-4 border rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={() => form.word && form.meaningEn && onSave(form)} disabled={!form.word || !form.meaningEn} className="flex-1 h-10 px-4 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600">Save</button>
        </div>
      </div>
    </Modal>
  );
};

const SongAnalyzer = ({ song, sections, collections, existingWords, onAddWords, onCreateSection, onUnsavedChange, onClose }) => {
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
    try { const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, messages: [{ role: 'user', content: `Explain this song in Russian:\n"${song.title}"\n${song.text}\nInclude meaning, metaphors, slang.` }] }) }); if (res.ok) { const d = await res.json(); setExplanation(d.content?.[0]?.text || ''); } } catch (e) { setExplanation('Error'); }
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
      const res = await fetch('https://api.anthropic.com/v1/messages', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          model: 'claude-sonnet-4-20250514', 
          max_tokens: 100, 
          messages: [{ role: 'user', content: `Translate "${cleaned}" to Russian. Only translation.` }] 
        }) 
      }); 
      if (res.ok) { 
        const d = await res.json(); 
        const translation = (d.content?.[0]?.text || '').trim();
        // Сохраняем в кэш
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
      
      for (const sel of selected.filter(s => s.includes(' ')).sort((a,b) => b.length - a.length)) {
        const remaining = text.slice(i).toLowerCase();
        const cleanRemaining = remaining.replace(/^[^a-z]+/, '');
        if (cleanRemaining.startsWith(sel)) {
          const startOffset = remaining.length - cleanRemaining.length;
          result.push(<span key={i}>{text.slice(i, i + startOffset)}</span>);
          result.push(<span key={i + startOffset} className="bg-blue-200 rounded-sm px-0.5">{text.slice(i + startOffset, i + startOffset + sel.length)}</span>);
          i += startOffset + sel.length;
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        for (const exist of existingWordsLower.filter(w => w.includes(' ')).sort((a,b) => b.length - a.length)) {
          const remaining = text.slice(i).toLowerCase();
          const cleanRemaining = remaining.replace(/^[^a-z]+/, '');
          if (cleanRemaining.startsWith(exist)) {
            const startOffset = remaining.length - cleanRemaining.length;
            const matches = findMatchingWords(exist);
            result.push(<span key={i}>{text.slice(i, i + startOffset)}</span>);
            result.push(
              <span key={i + startOffset} className="border-b-2 border-dashed border-gray-400 cursor-help"
                onMouseEnter={e => { const r = e.currentTarget.getBoundingClientRect(); setHoveredWord({ matches, pos: { x: r.left + r.width/2, y: r.top } }); }}
                onMouseLeave={() => setHoveredWord(null)}
              >{text.slice(i + startOffset, i + startOffset + exist.length)}</span>
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
            result.push(<span key={i} className="bg-blue-200 rounded-sm px-0.5">{word}</span>);
          } else if (matches.length > 0) {
            result.push(
              <span key={i} className="border-b-2 border-dashed border-gray-400 cursor-help"
                onMouseEnter={e => { const r = e.currentTarget.getBoundingClientRect(); setHoveredWord({ matches, pos: { x: r.left + r.width/2, y: r.top } }); }}
                onMouseLeave={() => setHoveredWord(null)}
              >{word}</span>
            );
          } else if (isComplexFromPhrase) {
            result.push(
              <span key={i} className="border-b border-dotted border-gray-400 cursor-help"
                onMouseEnter={e => { const r = e.currentTarget.getBoundingClientRect(); setHoveredWord({ word: cleaned, phrases: complexWordsMap.get(cleaned), pos: { x: r.left + r.width/2, y: r.top } }); }}
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
        <h2 className="text-2xl font-bold">{song.title}</h2>
        {onClose && <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">← Back</button>}
      </div>
      
      <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
        <div className="bg-white rounded-xl shadow-sm border p-4 flex-1 min-h-0 flex flex-col relative">
          <div className="text-xs text-gray-600 mb-2 flex-shrink-0">Select text to see translation and add words</div>
          <div className="bg-gray-50 p-4 rounded-lg flex-1 overflow-y-auto min-h-0">{highlightText()}</div>
          <div className="mt-2 pt-2 border-t flex-shrink-0">
            <button onClick={explainSong} className="text-sm text-blue-600">💡 {explanation ? (showExp ? 'Hide' : 'Show') : 'Explain song'}</button>
            {showExp && <div className="mt-2 p-3 bg-blue-50 rounded-lg max-h-40 overflow-y-auto">{loadingExp ? <Loader className="animate-spin" /> : <div className="text-sm whitespace-pre-wrap">{explanation}</div>}</div>}
          </div>
          {hoveredWord && (
            <div className="fixed bg-gray-800 text-white rounded-lg shadow-xl p-3 z-50 min-w-48 max-w-xs" style={{ left: hoveredWord.pos.x, top: hoveredWord.pos.y, transform: 'translate(-50%, -100%)', marginTop: -10 }}>
              {hoveredWord.phrases ? (
                <>
                  <div className="font-semibold mb-1">{hoveredWord.word}</div>
                  <div className="text-xs text-gray-300 mb-1">Part of {hoveredWord.phrases.length} phrase(s):</div>
                  {hoveredWord.phrases.map((p, i) => (
                    <div key={i} className="text-sm border-t border-gray-600 pt-1 mt-1">
                      <div className="font-medium">{p.phrase}</div>
                      {p.translation && <div className="text-blue-300">→ {p.translation}</div>}
                      <div className="text-xs text-gray-400">{p.collection} › {p.section}</div>
                    </div>
                  ))}
                </>
              ) : hoveredWord.matches ? (
                hoveredWord.matches.map((m, idx) => (
                  <div key={idx} className={idx > 0 ? 'border-t border-gray-600 mt-2 pt-2' : ''}>
                    <div className="font-semibold mb-1">{m.word}</div>
                    {m.forms && <div className="text-xs text-gray-400 mb-1">{m.forms}</div>}
                    {m.translation && <div className="text-blue-300 text-sm mb-1">→ {m.translation}</div>}
                    <div className="text-xs text-gray-400">{m.collection} › {m.section}</div>
                  </div>
                ))
              ) : null}
            </div>
          )}
          {popup && (
            <div className="song-popup fixed bg-white border-2 border-blue-500 rounded-lg shadow-xl p-3 z-50 min-w-48" style={{ left: popup.pos.x, top: popup.pos.y, transform: 'translate(-50%, -100%)', marginTop: -10 }}>
              <div className="font-semibold">{popup.original}</div>
              <div className="text-sm text-blue-600 mb-2">→ {translating ? <Loader size={14} className="inline animate-spin" /> : popup.translation}</div>
              {existingSet.has(popup.word) ? (
                <>
                  {(() => {
                    const existingWord = existingWords.find(w => w.word.toLowerCase() === popup.word);
                    if (existingWord) {
                      const sec = sections.find(s => s.id === existingWord.sectionId);
                      const location = sec ? `${sec.collectionName} › ${sec.name}` : 'Unknown';
                      return <div className="text-xs text-gray-600 bg-green-50 px-2 py-1 rounded border border-green-200">✓ In vocabulary: <span className="font-medium">{location}</span></div>;
                    }
                    return <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">✓ Already in vocabulary</div>;
                  })()}
                </>
              ) : selected.includes(popup.word) ? (
                <button onClick={() => removeFromList(popup.word)} className="w-full px-3 py-1 bg-red-100 text-red-700 rounded text-sm">✗ Remove from list</button>
              ) : (
                <button onClick={() => addToList(popup.word)} className="w-full px-3 py-1 bg-blue-500 text-white rounded text-sm">+ Add to list</button>
              )}
            </div>
          )}
        </div>
        
        {selected.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-4 flex-shrink-0 max-h-64 overflow-y-auto">
            <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
              <h3 className="font-semibold">Selected ({selected.length})</h3>
              <div className="flex items-center gap-2">
                {checkedWords.length > 0 && <select onChange={e => handleBulkSectionChange(e.target.value)} className="p-2 border rounded text-sm" defaultValue=""><option value="">Set section for {checkedWords.length}...</option>{sections.map(s => <option key={s.id} value={s.id}>{s.collectionName} › {s.name}</option>)}<option value="new">+ New Section</option></select>}
                <button onClick={addSelectedWords} className="px-4 py-2 bg-green-500 text-white rounded text-sm">Add to vocabulary</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr><th className="p-2 text-left w-10"><input type="checkbox" checked={checkedWords.length === selected.length && selected.length > 0} onChange={toggleCheckAll} /></th><th className="p-2 text-left">Word/Phrase</th><th className="p-2 text-left">Section</th><th className="p-2 w-10"></th></tr></thead>
                <tbody>{selected.map(w => (
                  <tr key={w} className="border-b hover:bg-gray-50">
                    <td className="p-2"><input type="checkbox" checked={checkedWords.includes(w)} onChange={() => toggleCheck(w)} /></td>
                    <td className="p-2 font-medium">{w}</td>
                    <td className="p-2"><select value={wordSections[w] || ''} onChange={e => handleSectionChange(w, e.target.value)} className="w-full p-1.5 border rounded text-sm"><option value="">Select section...</option>{sections.map(s => <option key={s.id} value={s.id}>{s.collectionName} › {s.name}</option>)}<option value="new">+ New Section</option></select></td>
                    <td className="p-2"><button onClick={() => removeFromList(w)} className="p-1 hover:bg-gray-200 rounded"><Trash2 size={14} /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {showNewSection && (
        <Modal onClose={() => setShowNewSection(null)}>
          <h3 className="text-lg font-semibold mb-4">Create New Section</h3>
          <div className="relative mb-3">
            <select id="new-sec-col" className="w-full h-10 pl-3 pr-8 border border-gray-300 rounded-lg bg-white text-sm hover:bg-gray-50 appearance-none">{collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
          <input id="new-sec-name" placeholder="Section name" className="w-full h-10 px-3 border rounded-lg mb-4" />
          <div className="flex gap-2">
            <button onClick={() => setShowNewSection(null)} className="flex-1 h-10 px-4 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={async () => {
              const colId = document.getElementById('new-sec-col').value;
              const name = document.getElementById('new-sec-name').value;
              if (!name.trim()) return;
              const newId = await onCreateSection(colId, name);
              if (showNewSection.forChecked) { const u = {}; checkedWords.forEach(w => u[w] = newId); setWordSections({ ...wordSections, ...u }); }
              else if (showNewSection.forWord) setWordSections({ ...wordSections, [showNewSection.forWord]: newId });
              setShowNewSection(null);
            }} className="flex-1 h-10 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Create</button>
          </div>
        </Modal>
      )}
      {alert && <Alert message={alert} onClose={() => setAlert(null)} />}
    </div>
  );
};

const SongModal = ({ song, folderId, onSave, onUpdateSong, onCancel }) => {
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
    <Modal onClose={onCancel} preventClose medium>
      <h3 className="text-lg font-semibold mb-4">{song?.id ? 'Edit Song' : 'Add Song'}</h3>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Song title *" className="w-full h-10 px-3 border rounded-lg mb-3" />
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste lyrics..." className="w-full px-3 py-2 border rounded-lg h-64 mb-3" />
      <div className="flex gap-2"><button onClick={onCancel} className="flex-1 h-10 px-4 border rounded-lg hover:bg-gray-50">Cancel</button><button onClick={handleSave} disabled={!title.trim() || !text.trim()} className="flex-1 h-10 px-4 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600">Save</button></div>
    </Modal>
  );
};

export default function VocabApp() {
  
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [data, setData] = useState(initialData);
  const [currentCollection, setCurrentCollection] = useState(null);
  const [currentSection, setCurrentSection] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [view, setView] = useState('dashboard');
  const [modal, setModal] = useState({ type: null, data: null });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [deletedItem, setDeletedItem] = useState(null);
  const [expandedCollections, setExpandedCollections] = useState(['c1']);
  const [expandedSongFolders, setExpandedSongFolders] = useState(['sf1']);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
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
      const { data: songs } = await supabase
        .from('songs')
        .select('*')
        .order('created_at');

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
    setData(d => ({ ...d, songs: [...d.songs, newSong] })); 
    setCurrentSong(newSong); 
    setView('song'); 
  }
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
  
  if (w.id) {
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
    
    if (!error && newWord) {
      setData(d => ({ ...d, words: [...d.words, newWord] }));
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
};

  const exportData = () => { const j = JSON.stringify({ ...data, exportedAt: new Date().toISOString(), version: 'v7' }, null, 2); const a = document.createElement('a'); a.href = 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(j))); a.download = `vocabmaster-backup-${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); setToast({ message: 'Backup downloaded!', canUndo: false }); };
  const importData = e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { try { const i = JSON.parse(ev.target.result); if (i.collections && i.words) { setData({ collections: i.collections, words: i.words, allTags: i.allTags || [], songs: i.songs || [], songFolders: i.songFolders || [{ id: 'sf1', name: 'My Songs' }] }); setToast({ message: `Restored!`, canUndo: false }); } } catch (e) { setToast({ message: 'Error', canUndo: false }); } }; r.readAsText(f); e.target.value = ''; };

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
      <div className="bg-white rounded-xl shadow-sm border p-4 relative">
        <div className="flex items-start justify-between mb-2">
          <div><div className="flex items-center gap-2"><span className="text-xl font-semibold">{word.word}</span><button onClick={() => playPronunciation(word.word)} className="p-1 hover:bg-gray-100 rounded"><Volume2 size={18} className="text-blue-500" /></button></div><span className="text-sm text-gray-500">{word.type}{word.forms && ` · ${word.forms}`}</span></div>
          <div className="flex gap-1"><button onClick={() => setModal({ type: 'word', data: word })} className="p-1 hover:bg-gray-100 rounded"><Edit2 size={16} className="text-gray-400" /></button><button onClick={() => requestDelete('word', word)} className="p-1 hover:bg-gray-100 rounded"><Trash2 size={16} className="text-gray-400" /></button></div>
        </div>
        <p className="text-gray-700 mb-1">{word.meaningEn}</p>
        {word.meaningRu && <p className="text-blue-600 text-sm mb-2">→ {word.meaningRu}</p>}
        {word.example && <p className="text-sm text-gray-600 italic border-l-2 border-blue-200 pl-2 mb-2">"{word.example}"</p>}
        {word.myExample && <p className="text-sm text-yellow-700 italic border-l-2 border-yellow-400 pl-2 bg-yellow-50 py-1 mb-2">✏️ "{word.myExample}"</p>}
        {(word.singleRootWords || word.synonyms) && (
          <div className="flex gap-3 mb-2 text-xs">
            {word.singleRootWords && (
              <button onClick={() => setWordPopup({ type: 'roots', word })} className="text-purple-700 hover:text-purple-900 underline">
                Single-root words
              </button>
            )}
            {word.synonyms && (
              <button onClick={() => setWordPopup({ type: 'synonyms', word })} className="text-blue-700 hover:text-blue-900 underline">
                Synonyms
              </button>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mt-3 pt-2 border-t">
          <div className="flex gap-1"><span className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(word.level)}`}>{word.level}</span><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(word.status)}`}>{word.status}</span></div>
          <div className="flex gap-1 text-xs"><span className={`px-1.5 py-0.5 rounded ${(word.passedModes || []).includes('cards') ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>C</span><span className={`px-1.5 py-0.5 rounded ${(word.passedModes || []).includes('quiz') ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>Q</span><span className={`px-1.5 py-0.5 rounded ${(word.passedModes || []).includes('write') ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>W</span></div>
        </div>
      </div>
    );
  };

  const Sidebar = () => (
    <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all bg-white border-r flex-shrink-0 overflow-hidden`}>
      <div className="w-64 p-3 h-full overflow-y-auto">
        <button onClick={() => handleNavigationWithCheck(() => { setCurrentCollection(null); setCurrentSection(null); setCurrentSong(null); setFilterStatus('all'); setView('dashboard'); })} className={`w-full flex items-center gap-2 p-2 rounded-lg mb-2 ${view === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}><Home size={18}/> Dashboard</button>
        <div className="mb-4 pb-3 border-b">
          <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-gray-500">🎵 Songs</span><button onClick={() => setModal({ type: 'songFolder', data: null })} className="p-1 hover:bg-gray-100 rounded"><Plus size={16}/></button></div>
          {data.songFolders.map(folder => (
            <div key={folder.id} className="mb-1">
              <div className="flex items-center gap-1 p-2 rounded-lg cursor-pointer group hover:bg-gray-50">
                <button onClick={() => setExpandedSongFolders(expandedSongFolders.includes(folder.id) ? expandedSongFolders.filter(id => id !== folder.id) : [...expandedSongFolders, folder.id])} className="p-0.5">{expandedSongFolders.includes(folder.id) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button>
                <span className="flex-1 truncate text-sm">{folder.name}</span>
                <button onClick={() => setModal({ type: 'song', data: { folderId: folder.id } })} className="p-1 opacity-0 group-hover:opacity-100"><Plus size={12}/></button>
                <button onClick={() => setModal({ type: 'songFolder', data: folder })} className="p-1 opacity-0 group-hover:opacity-100"><Edit2 size={12}/></button>
                <button onClick={() => requestDelete('songFolder', folder)} className="p-1 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
              </div>
              {expandedSongFolders.includes(folder.id) && <div className="ml-6 space-y-1">{data.songs.filter(s => s.folderId === folder.id).map(song => (
                <div key={song.id} onClick={() => handleNavigationWithCheck(() => { setCurrentSong(song); setCurrentCollection(null); setCurrentSection(null); setFilterStatus('all'); setView('song'); })} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer group text-sm ${currentSong?.id === song.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}>
                  <span className="flex-1 truncate">{song.title}</span>
                  <button onClick={e => { e.stopPropagation(); setModal({ type: 'song', data: song }); }} className="p-1 opacity-0 group-hover:opacity-100"><Edit2 size={12}/></button>
                  <button onClick={e => { e.stopPropagation(); requestDelete('song', song); }} className="p-1 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                </div>
              ))}</div>}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-gray-500">Collections</span><button onClick={() => setModal({ type: 'collection', data: null })} className="p-1 hover:bg-gray-100 rounded"><Plus size={16}/></button></div>
        {data.collections.map(col => (
          <div key={col.id} className="mb-1">
            <div className={`flex items-center gap-1 p-2 rounded-lg cursor-pointer group ${currentCollection?.id === col.id && !currentSection ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}>
              <button onClick={() => setExpandedCollections(expandedCollections.includes(col.id) ? expandedCollections.filter(id => id !== col.id) : [...expandedCollections, col.id])} className="p-0.5">{expandedCollections.includes(col.id) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button>
              <span className="text-base">{col.icon || '📚'}</span>
              <span onClick={() => handleNavigationWithCheck(() => { setCurrentCollection(col); setCurrentSection(null); setCurrentSong(null); setFilterStatus('all'); setView('list'); })} className="flex-1 truncate text-sm">{col.name}</span>
              <button onClick={() => setModal({ type: 'collection', data: col })} className="p-1 opacity-0 group-hover:opacity-100"><Edit2 size={12}/></button>
              <button onClick={() => requestDelete('collection', col)} className="p-1 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
            </div>
            {expandedCollections.includes(col.id) && <div className="ml-6 space-y-1">
              {col.sections.map(sec => (
                <div key={sec.id} onClick={() => handleNavigationWithCheck(() => { setCurrentCollection(col); setCurrentSection(sec); setCurrentSong(null); setFilterStatus('all'); setView('list'); })} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer group text-sm ${currentSection?.id === sec.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}>
                  <span className="text-base">{sec.icon || '📖'}</span>
                  <span className="flex-1 truncate">{sec.name}</span>
                  <button onClick={e => { e.stopPropagation(); setModal({ type: 'section', data: { colId: col.id, section: sec } }); }} className="p-1 opacity-0 group-hover:opacity-100"><Edit2 size={12}/></button>
                  <button onClick={e => { e.stopPropagation(); requestDelete('section', { colId: col.id, section: sec }); }} className="p-1 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                </div>
              ))}
              <button onClick={() => setModal({ type: 'section', data: { colId: col.id, section: null } })} className="flex items-center gap-2 p-2 text-gray-400 hover:text-gray-600 text-sm"><Plus size={14}/> Add section</button>
            </div>}
          </div>
        ))}
      </div>
    </div>
  );

  const renderFlashcards = () => {
    if (!filteredWords.length) return <div className="text-center py-12 text-gray-500">No words</div>;
    if (!cardSession) return null;
    if (cardSession.completed) return <CompletionScreen title="Cards Complete!" stats={{ correct: cardSession.correct, total: cardSession.words.length }} wrongWords={cardSession.wrongWords} onRestart={() => setCardSession({ words: [...filteredWords], index: 0, flipped: false, correct: 0, wrong: 0, wrongWords: [], completed: false })} onBack={() => setView('list')} />;
    const w = cardSession.words[cardSession.index];
    const handleAnswer = know => { updateWordProgress(w.id, 'cards', know); const nw = know ? cardSession.wrongWords : [...cardSession.wrongWords, w]; if (cardSession.index + 1 >= cardSession.words.length) setCardSession({ ...cardSession, correct: cardSession.correct + (know ? 1 : 0), wrongWords: nw, completed: true }); else setCardSession({ ...cardSession, index: cardSession.index + 1, flipped: false, correct: cardSession.correct + (know ? 1 : 0), wrongWords: nw }); };
    return (
      <div className="max-w-md mx-auto">
        <ProgressBar current={cardSession.index} total={cardSession.words.length} correct={cardSession.correct} wrong={cardSession.wrong} />
        <div onClick={() => setCardSession({ ...cardSession, flipped: !cardSession.flipped })} className="cursor-pointer" style={{ perspective: 1000 }}>
          <div style={{ transformStyle: 'preserve-3d', transition: 'transform 0.5s', transform: cardSession.flipped ? 'rotateY(180deg)' : '' }} className="relative h-72">
            <div style={{ backfaceVisibility: 'hidden' }} className="absolute inset-0 bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center"><h2 className="text-3xl font-bold text-center">{w.word}</h2><p className="text-gray-500">{w.type}</p>{w.forms && <p className="text-gray-400 text-sm mt-1">{w.forms}</p>}<button onClick={e => { e.stopPropagation(); playPronunciation(w.word); }} className="mt-4 p-2 bg-blue-50 rounded-full"><Volume2 className="text-blue-500"/></button></div>
            <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} className="absolute inset-0 bg-blue-50 rounded-xl shadow-lg p-6 flex flex-col justify-center">
              <p className="text-lg text-gray-700 mb-2">{w.meaningEn}</p>
              {w.meaningRu && <p className="text-blue-600 font-medium mb-2">→ {w.meaningRu}</p>}
              {w.example && <p className="text-sm text-gray-600 italic mt-2 mb-3">"{w.example}"</p>}
              {(w.singleRootWords || w.synonyms) && (
                <div className="mt-auto pt-3 border-t border-blue-200 flex gap-3 text-xs">
                  {w.singleRootWords && (
                    <button onClick={e => { e.stopPropagation(); setCardPopup({ type: 'roots', word: w }); }} className="text-purple-700 hover:text-purple-900 underline">
                      Single-root words
                    </button>
                  )}
                  {w.synonyms && (
                    <button onClick={e => { e.stopPropagation(); setCardPopup({ type: 'synonyms', word: w }); }} className="text-blue-700 hover:text-blue-900 underline">
                      Synonyms
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-4 mt-6"><button onClick={() => handleAnswer(false)} className="px-6 py-2 bg-red-100 text-red-600 rounded-lg flex items-center gap-2"><X size={18}/> Don't know</button><button onClick={() => handleAnswer(true)} className="px-6 py-2 bg-green-100 text-green-600 rounded-lg flex items-center gap-2"><Check size={18}/> Know it</button></div>
      </div>
    );
  };

  const renderQuiz = () => {
    if (filteredWords.length < 4) return <div className="text-center py-12 text-gray-500">Need 4+ words</div>;
    if (!quizSession) return null;
    if (quizSession.completed) return <CompletionScreen title="Quiz Complete!" stats={{ correct: quizSession.correct, total: quizSession.words.length }} wrongWords={quizSession.wrongWords} onRestart={() => setQuizSession({ words: [...filteredWords], index: 0, correct: 0, wrong: 0, wrongWords: [], selected: null, isAnswered: false, options: [], completed: false })} onBack={() => setView('list')} />;
    const w = quizSession.words[quizSession.index];
    if (!quizSession.options.length) { setQuizSession(s => ({ ...s, options: [...quizSession.words.filter(x => x.id !== w.id).sort(() => Math.random() - 0.5).slice(0, 3), w].sort(() => Math.random() - 0.5) })); return null; }
    const handleSelect = opt => { if (quizSession.isAnswered) return; const correct = opt.id === w.id; updateWordProgress(w.id, 'quiz', correct); setQuizSession(s => ({ ...s, isAnswered: true, selected: opt.id, correct: s.correct + (correct ? 1 : 0), wrongWords: correct ? s.wrongWords : [...s.wrongWords, w] })); };
    const handleNext = () => { if (quizSession.index + 1 >= quizSession.words.length) setQuizSession(s => ({ ...s, completed: true })); else setQuizSession(s => ({ ...s, index: s.index + 1, isAnswered: false, selected: null, options: [] })); };
    return (
      <div className="max-w-md mx-auto">
        <ProgressBar current={quizSession.index} total={quizSession.words.length} correct={quizSession.correct} wrong={quizSession.wrong} />
        <div className="bg-white rounded-xl shadow-lg p-6 mb-4"><h2 className="text-xl font-semibold mb-2">{w.meaningEn}</h2>{w.meaningRu && <p className="text-blue-600 mb-4">→ {w.meaningRu}</p>}<div className="space-y-2">{quizSession.options.map(opt => <button key={opt.id} onClick={() => handleSelect(opt)} className={`w-full p-3 rounded-lg border text-left ${quizSession.isAnswered ? opt.id === w.id ? 'bg-green-100 border-green-500' : opt.id === quizSession.selected ? 'bg-red-100 border-red-500' : '' : 'hover:bg-gray-50'}`}>{opt.word}</button>)}</div></div>
        {quizSession.isAnswered && <button onClick={handleNext} className="w-full p-3 bg-blue-500 text-white rounded-lg">Next</button>}
      </div>
    );
  };

  const renderWrite = () => {
    if (!filteredWords.length) return <div className="text-center py-12 text-gray-500">No words</div>;
    if (!writeSession) return null;
    if (writeSession.completed) return <CompletionScreen title="Practice Complete!" stats={{ correct: writeSession.correct, total: writeSession.words.length }} wrongWords={writeSession.wrongWords} onRestart={() => setWriteSession({ words: [...filteredWords], index: 0, correct: 0, wrong: 0, wrongWords: [], input: '', result: null, completed: false })} onBack={() => setView('list')} />;
    const w = writeSession.words[writeSession.index];
    const handleCheck = () => { const correct = writeSession.input.toLowerCase().trim() === w.word.toLowerCase().trim(); updateWordProgress(w.id, 'write', correct); setWriteSession(s => ({ ...s, result: { correct, answer: w.word }, correct: s.correct + (correct ? 1 : 0), wrongWords: correct ? s.wrongWords : [...s.wrongWords, w] })); };
    const handleNext = () => { if (writeSession.index + 1 >= writeSession.words.length) setWriteSession(s => ({ ...s, completed: true })); else setWriteSession(s => ({ ...s, index: s.index + 1, input: '', result: null })); };
    return (
      <div className="max-w-md mx-auto">
        <ProgressBar current={writeSession.index} total={writeSession.words.length} correct={writeSession.correct} wrong={writeSession.wrong} />
        <div className="bg-white rounded-xl shadow-lg p-6"><h2 className="text-lg font-semibold mb-2">{w.meaningEn}</h2>{w.meaningRu && <p className="text-blue-600 mb-2">→ {w.meaningRu}</p>}<input value={writeSession.input} onChange={e => setWriteSession(s => ({ ...s, input: e.target.value }))} onKeyDown={e => e.key === 'Enter' && !writeSession.result && handleCheck()} placeholder="Type the word..." className="w-full p-3 border rounded-lg mb-3" disabled={!!writeSession.result} autoFocus />{writeSession.result && <div className={`p-3 rounded-lg mb-3 ${writeSession.result.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{writeSession.result.correct ? '✓ Correct!' : `✗ Answer: ${writeSession.result.answer}`}</div>}<button onClick={writeSession.result ? handleNext : handleCheck} className="w-full p-3 bg-blue-500 text-white rounded-lg">{writeSession.result ? 'Next' : 'Check'}</button></div>
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="bg-white border-b px-4 h-14 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3"><button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg"><Menu size={20}/></button><h1 className="text-xl font-bold text-blue-600">VocabMaster</h1></div>
          <div className="flex items-center gap-2">
            <input type="file" accept=".json" onChange={importData} className="hidden" id="import-backup" />
            <button onClick={() => document.getElementById('import-backup').click()} className="p-2 hover:bg-gray-100 rounded" title="Restore"><Upload size={20}/></button>
            <button onClick={exportData} className="p-2 hover:bg-gray-100 rounded" title="Backup"><Download size={20}/></button>
            {currentSection && (
              <>
                <button onClick={() => setModal({ type: 'importText', data: null })} className="h-10 px-3 bg-purple-500 text-white rounded-lg flex items-center gap-1 text-sm"><Upload size={18}/> Import</button>
                <button onClick={() => setModal({ type: 'word', data: { word: '', type: 'phrase', level: 'B1', forms: '', meaningEn: '', meaningRu: '', example: '', myExample: '', singleRootWords: '', synonyms: '', tags: [] } })} className="h-10 px-3 bg-blue-500 text-white rounded-lg flex items-center gap-1 text-sm"><Plus size={18}/> Add word</button>
              </>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4">
          {view === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <button onClick={() => { setFilterStatus('all'); setViewTitle('Total Words'); handleNavigationWithCheck(() => setView('all-words')); }} className="bg-white rounded-xl p-4 shadow-sm border hover:bg-gray-50 text-left"><div className="text-3xl font-bold">{data.words.length}</div><div className="text-gray-500 text-sm">Total</div></button>
                <button onClick={() => { setFilterStatus('new'); setViewTitle('New Words'); handleNavigationWithCheck(() => setView('all-words')); }} className="bg-blue-50 rounded-xl p-4 border border-blue-100 hover:bg-blue-100 text-left"><div className="text-3xl font-bold text-blue-600">{data.words.filter(w => w.status === STATUS.NEW).length}</div><div className="text-gray-500 text-sm">New</div></button>
                <button onClick={() => { setFilterStatus('learning'); setViewTitle('Learning Words'); handleNavigationWithCheck(() => setView('all-words')); }} className="bg-yellow-50 rounded-xl p-4 border border-yellow-100 hover:bg-yellow-100 text-left"><div className="text-3xl font-bold text-yellow-600">{data.words.filter(w => w.status === STATUS.LEARNING).length}</div><div className="text-gray-500 text-sm">Learning</div></button>
                <button onClick={() => { setFilterStatus('learned'); setViewTitle('Learned Words'); handleNavigationWithCheck(() => setView('all-words')); }} className="bg-green-50 rounded-xl p-4 border border-green-100 hover:bg-green-100 text-left"><div className="text-3xl font-bold text-green-600">{data.words.filter(w => w.status === STATUS.LEARNED).length}</div><div className="text-gray-500 text-sm">Learned</div></button>
              </div>
              {data.collections.length === 0 && <div className="text-center py-12"><div className="text-6xl mb-4">📚</div><h2 className="text-xl font-semibold mb-2">Welcome to VocabMaster!</h2><p className="text-gray-500">Create a collection and start adding words.</p></div>}
            </div>
          )}
          {view === 'all-words' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{viewTitle}</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="h-10 pl-3 pr-8 border border-gray-300 rounded-lg bg-white text-sm hover:bg-gray-50 appearance-none">
                      <option value="all">All levels</option>{LEVELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                  <div className="relative">
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-10 pl-3 pr-8 border border-gray-300 rounded-lg bg-white text-sm hover:bg-gray-50 appearance-none">
                      <option value="all">All status</option><option value="new">New</option><option value="learning">Learning</option><option value="learned">Learned</option>
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">{filteredWords.length ? filteredWords.map(w => <WordCard key={w.id} word={w} />) : <div className="text-center py-12 text-gray-500">No words match filters</div>}</div>
            </>
          )}
          {view === 'song' && currentSong && (
            <div className="h-full">
              <SongAnalyzer 
                song={currentSong} 
                sections={data.collections.flatMap(c => c.sections.map(s => ({ ...s, collectionName: c.name })))} 
                collections={data.collections} 
                existingWords={data.words} 
                onAddWords={ws => { setData(d => ({ ...d, words: [...d.words, ...ws] })); setToast({ message: `${ws.length} words added!`, canUndo: false }); }} 
                onCreateSection={createSectionFromSong} 
                onUnsavedChange={setHasUnsavedWords}
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
                <h2 className="text-xl font-semibold">{currentSection?.name || currentCollection?.name}</h2>
                <div className="flex items-center gap-2">
                  {currentSection && filteredWords.filter(w => !w.meaningEn || !w.meaningRu).length > 0 && <button onClick={() => setModal({ type: 'translateEmpty', data: filteredWords.filter(w => !w.meaningEn || !w.meaningRu) })} className="h-10 px-3 bg-purple-500 text-white rounded-lg text-sm flex items-center gap-1"><Search size={16}/> Translate {filteredWords.filter(w => !w.meaningEn || !w.meaningRu).length} empty</button>}
                  {currentSection && filteredWords.filter(w => !w.singleRootWords || w.singleRootWords.trim() === '').length > 0 && <button onClick={() => setModal({ type: 'fillRoots', data: filteredWords.filter(w => !w.singleRootWords || w.singleRootWords.trim() === '') })} className="h-10 px-3 bg-purple-600 text-white rounded-lg text-sm flex items-center gap-1">Fill roots ({filteredWords.filter(w => !w.singleRootWords || w.singleRootWords.trim() === '').length})</button>}
                  {currentSection && filteredWords.filter(w => !w.synonyms || w.synonyms.trim() === '').length > 0 && <button onClick={() => setModal({ type: 'fillSynonyms', data: filteredWords.filter(w => !w.synonyms || w.synonyms.trim() === '') })} className="h-10 px-3 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1">Fill synonyms ({filteredWords.filter(w => !w.synonyms || w.synonyms.trim() === '').length})</button>}
                  <div className="relative">
                    <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="h-10 pl-3 pr-8 border border-gray-300 rounded-lg bg-white text-sm hover:bg-gray-50 appearance-none">
                      <option value="all">All levels</option>{LEVELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                  <div className="relative">
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-10 pl-3 pr-8 border border-gray-300 rounded-lg bg-white text-sm hover:bg-gray-50 appearance-none">
                      <option value="all">All status</option><option value="new">New</option><option value="learning">Learning</option><option value="learned">Learned</option>
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                </div>
              </div>
              {!currentSection && currentCollection && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">Select a section to add words.</div>}
              <div className="grid grid-cols-4 gap-2 mb-4">{[{ id: 'list', icon: BookOpen, label: 'List' }, { id: 'cards', icon: RotateCcw, label: 'Cards' }, { id: 'quiz', icon: HelpCircle, label: 'Quiz' }, { id: 'write', icon: PenTool, label: 'Write' }].map(m => <button key={m.id} onClick={() => { resetSessions(); setView(m.id); }} className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg ${view === m.id ? 'bg-blue-500 text-white' : 'bg-white border'}`}><m.icon size={18}/> {m.label}</button>)}</div>
              {view === 'list' && <div className="space-y-3">{filteredWords.length ? filteredWords.map(w => <WordCard key={w.id} word={w} />) : <div className="text-center py-12 text-gray-500">No words</div>}</div>}
              {view === 'cards' && renderFlashcards()}
              {view === 'quiz' && renderQuiz()}
              {view === 'write' && renderWrite()}
            </>
          )}
        </div>
      </div>
      {modal.type === 'word' && <WordForm word={modal.data} allTags={data.allTags} existingWords={data.words} sections={data.collections.flatMap(c => c.sections.map(s => ({ ...s, collectionName: c.name })))} onSave={saveWord} onCancel={() => setModal({ type: null, data: null })} onAddTag={t => { if (!data.allTags.includes(t)) setData(d => ({ ...d, allTags: [...d.allTags, t] })); }} onDuplicateFound={msg => setAlert(msg)} />}
      {modal.type === 'importText' && <ImportTextModal currentSectionId={currentSection?.id} onImport={words => { setData(d => ({ ...d, words: [...d.words, ...words] })); setToast({ message: `${words.length} words imported!`, canUndo: false }); }} onCancel={() => setModal({ type: null, data: null })} />}
      {modal.type === 'song' && <SongModal song={modal.data?.id ? modal.data : null} folderId={modal.data?.folderId} onSave={saveSong} onUpdateSong={updateSong} onCancel={() => setModal({ type: null, data: null })} />}
      {modal.type === 'songFolder' && <Modal onClose={() => setModal({ type: null, data: null })}><h3 className="text-lg font-semibold mb-4">{modal.data ? 'Edit Folder' : 'New Folder'}</h3><input defaultValue={modal.data?.name || ''} id="folder-name" className="w-full h-10 px-3 border rounded-lg mb-4" autoFocus /><div className="flex gap-2"><button onClick={() => setModal({ type: null, data: null })} className="flex-1 h-10 px-4 border rounded-lg hover:bg-gray-50">Cancel</button><button onClick={() => saveSongFolder(document.getElementById('folder-name').value)} className="flex-1 h-10 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save</button></div></Modal>}
      {modal.type === 'collection' && <Modal onClose={() => setModal({ type: null, data: null })}>
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
        <input defaultValue={modal.data?.name || ''} id="col-name" placeholder="Collection name *" className="w-full h-10 px-3 border rounded-lg mb-4" autoFocus />
        <div className="flex gap-2">
          <button onClick={() => setModal({ type: null, data: null })} className="flex-1 h-10 px-4 border rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={() => saveCollection(document.getElementById('col-name').value)} className="flex-1 h-10 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save</button>
        </div>
      </Modal>}
      {modal.type === 'section' && <Modal onClose={() => setModal({ type: null, data: null })}>
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
        <input defaultValue={modal.data?.section?.name || ''} id="sec-name" placeholder="Section name *" className="w-full h-10 px-3 border rounded-lg mb-4" autoFocus />
        <div className="flex gap-2">
          <button onClick={() => setModal({ type: null, data: null })} className="flex-1 h-10 px-4 border rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={() => saveSection(document.getElementById('sec-name').value)} className="flex-1 h-10 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save</button>
        </div>
      </Modal>}
      {modal.type === 'translateEmpty' && <TranslateEmptyModal words={modal.data} onTranslate={translated => { setData(d => ({ ...d, words: d.words.map(w => { const t = translated.find(x => x.id === w.id); return t || w; }) })); setToast({ message: `${translated.length} words translated!`, canUndo: false }); }} onCancel={() => setModal({ type: null, data: null })} />}
      {modal.type === 'fillRoots' && <FillFieldModal words={modal.data} fieldName="singleRootWords" fieldLabel="Single-root words" icon="🌱" onFill={filled => { setData(d => ({ ...d, words: d.words.map(w => { const f = filled.find(x => x.id === w.id); return f || w; }) })); setToast({ message: `${filled.length} words updated!`, canUndo: false }); }} onCancel={() => setModal({ type: null, data: null })} />}
      {modal.type === 'fillSynonyms' && <FillFieldModal words={modal.data} fieldName="synonyms" fieldLabel="Synonyms" icon="🔄" onFill={filled => { setData(d => ({ ...d, words: d.words.map(w => { const f = filled.find(x => x.id === w.id); return f || w; }) })); setToast({ message: `${filled.length} words updated!`, canUndo: false }); }} onCancel={() => setModal({ type: null, data: null })} />}
      {confirmDelete && <Modal onClose={() => setConfirmDelete(null)}><h3 className="text-lg font-semibold mb-2">Delete?</h3><p className="text-gray-600 mb-4">Delete "{confirmDelete.name}"?</p><div className="flex gap-2"><button onClick={() => setConfirmDelete(null)} className="flex-1 h-10 px-4 border rounded-lg hover:bg-gray-50">Cancel</button><button onClick={executeDelete} className="flex-1 h-10 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600">Delete</button></div></Modal>}
      {toast && <Toast message={toast.message} onUndo={toast.canUndo ? undoDelete : null} onClose={() => setToast(null)} />}
      {alert && <Alert message={alert} onClose={() => setAlert(null)} />}
      
      {wordPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setWordPopup(null)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {wordPopup.type === 'roots' ? 'Single-root words' : 'Synonyms'}
              </h3>
              <button onClick={() => setWordPopup(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
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
                      <div className="w-32 font-medium text-gray-900">{word || '—'}</div>
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
      )}
      
      {cardPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setCardPopup(null)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {cardPopup.type === 'roots' ? 'Single-root words' : 'Synonyms'}
              </h3>
              <button onClick={() => setCardPopup(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
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
                      <div className="w-32 font-medium text-gray-900">{word || '—'}</div>
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
      )}
    </div>
  );
}
