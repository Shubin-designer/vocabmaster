import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useUserProfile, updateUserProfile } from '../hooks/useUserProfile';
import { isTeacher, isStudent, isAdmin, canToggleRole } from '../utils/roleUtils';
import { VIEWS } from '../utils/constants';

const UserContext = createContext(null);

/**
 * Provider component for user authentication and profile state
 */
export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminViewAs, setAdminViewAs] = useState(VIEWS.TEACHER); // For admin role toggle

  // Fetch profile using the hook
  const { profile: userProfile, loading: profileLoading, refetch: refetchProfile } = useUserProfile(user?.id);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load admin view preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem('vocabmaster_admin_view');
    if (savedView && [VIEWS.STUDENT, VIEWS.TEACHER].includes(savedView)) {
      setAdminViewAs(savedView);
    }
  }, []);

  // Save admin view preference
  const toggleAdminView = useCallback(() => {
    setAdminViewAs(prev => {
      const newView = prev === VIEWS.TEACHER ? VIEWS.STUDENT : VIEWS.TEACHER;
      localStorage.setItem('vocabmaster_admin_view', newView);
      return newView;
    });
  }, []);

  // Update user profile
  const updateProfile = useCallback(async (updates) => {
    if (!user?.id) return { error: 'Not authenticated' };
    const result = await updateUserProfile(user.id, updates);
    if (!result.error) {
      await refetchProfile();
    }
    return result;
  }, [user?.id, refetchProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  // Computed role flags
  const roleFlags = useMemo(() => {
    const flags = {
      isTeacher: isTeacher(userProfile),
      isStudent: isStudent(userProfile),
      isAdmin: isAdmin(userProfile),
      canToggleRole: canToggleRole(userProfile)
    };
    // Debug logging
    console.log('[UserContext] Profile:', userProfile);
    console.log('[UserContext] Role flags:', flags);
    return flags;
  }, [userProfile]);

  // Determine effective view (for admin role switching)
  const effectiveView = useMemo(() => {
    if (roleFlags.isAdmin) {
      return adminViewAs;
    }
    if (roleFlags.isTeacher) {
      return VIEWS.TEACHER;
    }
    return VIEWS.STUDENT;
  }, [roleFlags.isAdmin, roleFlags.isTeacher, adminViewAs]);

  const value = useMemo(() => ({
    // Auth state
    user,
    userProfile,
    authLoading,
    profileLoading,

    // Role flags
    ...roleFlags,

    // Admin view toggle
    adminViewAs,
    effectiveView,
    toggleAdminView,

    // Actions
    updateProfile,
    refetchProfile,
    signOut
  }), [
    user,
    userProfile,
    authLoading,
    profileLoading,
    roleFlags,
    adminViewAs,
    effectiveView,
    toggleAdminView,
    updateProfile,
    refetchProfile,
    signOut
  ]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Hook to access user context
 */
export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export default UserContext;
