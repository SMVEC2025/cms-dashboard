import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getCollegeName } from '@/lib/utils';
import { getSession, onAuthStateChange, signInWithPassword, signOut } from '@/services/authService';
import {
  clearProfileCache,
  fetchOrCreateProfile,
  fetchProfile,
  updateSelectedCollege,
} from '@/services/profileService';
import { AuthContext } from './authContextValue';

async function loadProfile(session) {
  if (!session?.user) {
    return null;
  }

  return fetchOrCreateProfile(session.user);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const bootstrapCompleteRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;

    const bootstrap = async () => {
      // Safety timeout — never stay loading for more than 6 seconds
      const timeout = setTimeout(() => {
        if (mounted && !bootstrapCompleteRef.current) {
          bootstrapCompleteRef.current = true;
          setLoading(false);
        }
      }, 6000);

      try {
        const activeSession = await getSession();
        if (!mounted) return;

        setSession(activeSession);

        if (activeSession?.user) {
          const profileData = await loadProfile(activeSession);
          if (mounted) setProfile(profileData);
        }
      } catch (error) {
        if (mounted) toast.error(error.message);
      } finally {
        clearTimeout(timeout);
        if (mounted) {
          bootstrapCompleteRef.current = true;
          setLoading(false);
        }
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = onAuthStateChange(async (event, nextSession) => {
      // Skip INITIAL_SESSION entirely — bootstrap handles it
      if (event === 'INITIAL_SESSION') return;
      // Skip events until bootstrap finishes to avoid race conditions
      if (!bootstrapCompleteRef.current) return;

      setSession(nextSession);

      if (nextSession?.user) {
        const profileData = await loadProfile(nextSession);
        if (mounted) setProfile(profileData);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!session?.user) {
      return null;
    }

    const profileData = await fetchProfile(session.user.id, { force: true });
    setProfile(profileData);
    return profileData;
  };

  const handleSignIn = async (credentials) => {
    const data = await signInWithPassword(credentials);
    setSession(data.session);
    const profileData = await loadProfile(data.session);
    setProfile(profileData);
    return profileData;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      clearProfileCache(session?.user?.id);
      setSession(null);
      setProfile(null);
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const handleCollegeSelect = async (collegeId) => {
    if (!session?.user) {
      return null;
    }

    const nextProfile = await updateSelectedCollege({ userId: session.user.id, collegeId });
    setProfile(nextProfile);
    return nextProfile;
  };

  const value = {
    loading,
    session,
    user: session?.user || null,
    profile,
    isAuthenticated: Boolean(session?.user),
    isAdmin: profile?.role === 'admin',
    selectedCollegeId: profile?.selected_college_id || null,
    selectedCollegeName: getCollegeName(profile?.selected_college_id),
    requiresCollegeSelection: Boolean(session?.user && profile && !profile.selected_college_id),
    signIn: handleSignIn,
    signOut: handleSignOut,
    selectCollege: handleCollegeSelect,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
