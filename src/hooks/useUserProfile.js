import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook to fetch and manage user profile from user_profiles table
 * @param {string|null} userId - The user ID to fetch profile for
 * @returns {{ profile: Object|null, loading: boolean, error: string|null, refetch: Function }}
 */
export function useUserProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        // Profile might not exist yet (race condition with trigger)
        if (fetchError.code === 'PGRST116') {
          // No rows returned - profile not created yet, retry once
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: retryData, error: retryError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (retryError) {
            setError(retryError.message);
            setProfile(null);
          } else {
            setProfile(retryData);
          }
        } else {
          setError(fetchError.message);
          setProfile(null);
        }
      } else {
        setProfile(data);
      }
    } catch (err) {
      setError(err.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const refetch = useCallback(() => {
    return fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch };
}

/**
 * Update user profile
 * @param {string} userId - The user ID to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<{data: Object|null, error: string|null}>}
 */
export async function updateUserProfile(userId, updates) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}
