import { useState } from 'react';
import TopicsList from './TopicsList';
import ReadingTextsList from './ReadingTextsList';
import VocabSetsList from './VocabSetsList';
import HomeworkList from './HomeworkList';
import PdfWorkbench from './PdfWorkbench';
import { Layers, BookOpen, Languages, PenLine, FileText } from 'lucide-react';

const TABS = [
  { key: 'topics', label: 'Topics', icon: Layers },
  { key: 'reading', label: 'Reading', icon: BookOpen },
  { key: 'vocabulary', label: 'Vocabulary', icon: Languages },
  { key: 'homework', label: 'Homework', icon: PenLine },
  { key: 'pdf', label: 'PDF', icon: FileText },
];

export default function ContentManager({ teacherId, isDark = true }) {
  const [activeTab, _setActiveTab] = useState(() => localStorage.getItem('vm_content_tab') || 'topics');
  const setActiveTab = (tab) => { _setActiveTab(tab); localStorage.setItem('vm_content_tab', tab); };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className={`flex gap-2 p-1.5 rounded-2xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-100'}`}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-pink-vibrant text-white shadow-lg'
                : isDark
                  ? 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'topics' && (
        <TopicsList teacherId={teacherId} isDark={isDark} />
      )}

      {activeTab === 'reading' && (
        <ReadingTextsList teacherId={teacherId} isDark={isDark} />
      )}

      {activeTab === 'vocabulary' && (
        <VocabSetsList teacherId={teacherId} isDark={isDark} />
      )}

      {activeTab === 'homework' && (
        <HomeworkList teacherId={teacherId} isDark={isDark} />
      )}

      {activeTab === 'pdf' && (
        <PdfWorkbench teacherId={teacherId} isDark={isDark} />
      )}
    </div>
  );
}
