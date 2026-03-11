import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import StudentList from './StudentList';
import InviteStudent from './InviteStudent';
import ContentManager from '../content/ContentManager';
import StudentProgress from './StudentProgress';
import Analytics from './Analytics';
import BoardManager from './BoardManager';
import CalendarView from '../common/CalendarView';
import NotificationBell from '../common/NotificationBell';
import {
  Users, BookOpen, Settings, LogOut, Moon, Sun, Monitor,
  ChevronDown, GraduationCap, Sparkles, Layers, TrendingUp, BarChart3, Calendar, Presentation
} from 'lucide-react';

/**
 * TeacherDashboard - Main dashboard for teachers
 * Tabs: Students, My Learning (future), Settings
 */
export default function TeacherDashboard({ StudentAppComponent, theme, onThemeChange }) {
  const { user, userProfile, isAdmin, toggleAdminView, signOut } = useUser();
  const [activeTab, _setActiveTab] = useState(() => localStorage.getItem('vm_teacher_tab') || 'students');
  const setActiveTab = (tab) => { _setActiveTab(tab); localStorage.setItem('vm_teacher_tab', tab); };
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [students, setStudents] = useState([]);

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Load students for BoardManager
  useEffect(() => {
    if (user?.id) {
      loadStudents();
    }
  }, [user?.id]);

  const loadStudents = async () => {
    const { data: studentsData } = await supabase
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', user.id)
      .eq('status', 'active');

    const studentIds = studentsData?.map(s => s.student_id) || [];
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', studentIds);

      setStudents(studentIds.map(id => ({
        id,
        name: profiles?.find(p => p.user_id === id)?.display_name || 'Student'
      })));
    }
  };

  const tabs = [
    { key: 'students', label: 'Students', icon: Users },
    { key: 'content', label: 'Content', icon: Layers },
    { key: 'boards', label: 'Boards', icon: Presentation },
    { key: 'calendar', label: 'Calendar', icon: Calendar },
    { key: 'progress', label: 'Progress', icon: TrendingUp },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'learning', label: 'My Learning', icon: BookOpen },
    { key: 'settings', label: 'Settings', icon: Settings }
  ];

  const handleInviteSuccess = () => {
    setShowInviteModal(false);
    // StudentList will refresh automatically
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0a0b] text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b ${
        isDark ? 'bg-[#0a0a0b]/80 border-white/[0.06]' : 'bg-white/80 border-gray-200'
      } backdrop-blur-xl`}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-vibrant flex items-center justify-center">
                <GraduationCap size={22} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">VocabMaster</h1>
                <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Teacher Dashboard</p>
              </div>
            </div>

            {/* Navigation tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    activeTab === tab.key
                      ? 'bg-pink-vibrant text-white'
                      : isDark
                        ? 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Notifications & User menu */}
            <div className="flex items-center gap-2">
              <NotificationBell userId={user?.id} isDark={isDark} />

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                  isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold ${
                  isDark ? 'bg-pink-vibrant/20 text-pink-vibrant' : 'bg-indigo-100 text-indigo-600'
                }`}>
                  {(userProfile?.display_name || user?.email || 'T').charAt(0).toUpperCase()}
                </div>
                <ChevronDown size={16} className={isDark ? 'text-white/50' : 'text-gray-500'} />
              </button>

              {/* Dropdown */}
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className={`absolute right-0 mt-2 w-64 rounded-2xl shadow-xl z-50 py-2 ${
                    isDark ? 'bg-[#1a1a1e] border border-white/10' : 'bg-white border border-gray-200'
                  }`}>
                    {/* User info */}
                    <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {userProfile?.display_name || user?.email?.split('@')[0]}
                      </p>
                      <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        {user?.email}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                        <GraduationCap size={12} />
                        Teacher
                      </span>
                    </div>

                    {/* Theme switcher */}
                    <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                      <p className={`text-xs font-medium mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        Theme
                      </p>
                      <div className="flex gap-1">
                        {[
                          { key: 'light', icon: Sun },
                          { key: 'dark', icon: Moon },
                          { key: 'system', icon: Monitor }
                        ].map(t => (
                          <button
                            key={t.key}
                            onClick={() => onThemeChange(t.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              theme === t.key
                                ? 'bg-pink-vibrant text-white'
                                : isDark
                                  ? 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                          >
                            <t.icon size={14} />
                            {t.key.charAt(0).toUpperCase() + t.key.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Admin toggle */}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          toggleAdminView();
                          setShowUserMenu(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isDark ? 'hover:bg-white/[0.05] text-white/80' : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <Sparkles size={18} className="text-yellow-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Switch to Student View</p>
                          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            Admin: toggle role view
                          </p>
                        </div>
                      </button>
                    )}

                    {/* Logout */}
                    <button
                      onClick={signOut}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isDark ? 'hover:bg-white/[0.05] text-red-400' : 'hover:bg-gray-50 text-red-600'
                      }`}
                    >
                      <LogOut size={18} />
                      <span className="text-sm font-medium">Sign Out</span>
                    </button>
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden border-t border-white/[0.06] px-4">
          <div className="flex gap-1 py-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-pink-vibrant text-white'
                    : isDark
                      ? 'text-white/60 hover:text-white'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Students tab */}
        {activeTab === 'students' && (
          <StudentList
            teacherId={user?.id}
            onInvite={() => setShowInviteModal(true)}
            isDark={isDark}
          />
        )}

        {/* Content tab */}
        {activeTab === 'content' && (
          <ContentManager
            teacherId={user?.id}
            isDark={isDark}
          />
        )}

        {/* Boards tab */}
        {activeTab === 'boards' && (
          <BoardManager
            teacherId={user?.id}
            students={students}
            isDark={isDark}
          />
        )}

        {/* Calendar tab */}
        {activeTab === 'calendar' && (
          <CalendarView
            userId={user?.id}
            role="teacher"
            isDark={isDark}
          />
        )}

        {/* Progress tab */}
        {activeTab === 'progress' && (
          <StudentProgress
            teacherId={user?.id}
            isDark={isDark}
          />
        )}

        {/* Analytics tab */}
        {activeTab === 'analytics' && (
          <Analytics
            teacherId={user?.id}
            isDark={isDark}
          />
        )}

        {/* My Learning tab */}
        {activeTab === 'learning' && (
          <div>
            {StudentAppComponent ? (
              <StudentAppComponent embedded={true} />
            ) : (
              <div className={`text-center py-16 rounded-2xl ${
                isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-gray-50 border border-gray-200'
              }`}>
                <BookOpen size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  My Learning
                </h3>
                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  Access your personal vocabulary learning tools here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && (
          <div className={`rounded-2xl p-6 ${
            isDark ? 'bg-white/[0.02] border border-white/[0.05]' : 'bg-white border border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Settings
            </h2>

            <div className="space-y-6">
              {/* Profile section */}
              <div>
                <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                  Profile
                </h3>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${
                      isDark ? 'bg-pink-vibrant/20 text-pink-vibrant' : 'bg-indigo-100 text-indigo-600'
                    }`}>
                      {(userProfile?.display_name || user?.email || 'T').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {userProfile?.display_name || user?.email?.split('@')[0]}
                      </p>
                      <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* More settings coming soon */}
              <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                  More settings coming soon...
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Invite modal */}
      {showInviteModal && (
        <InviteStudent
          teacherId={user?.id}
          onClose={() => setShowInviteModal(false)}
          onSuccess={handleInviteSuccess}
          isDark={isDark}
        />
      )}
    </div>
  );
}
