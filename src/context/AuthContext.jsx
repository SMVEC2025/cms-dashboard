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
import { clearCollegesCache, listColleges } from '@/services/collegesService';
import { AuthContext } from './authContextValue';

const DEFAULT_ADMIN_COLLEGE_ID = 'smvec-engineering-college';

function normalizeCollegeKey(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function resolveDefaultAdminCollegeId(colleges = []) {
  if (!colleges.length) {
    return null;
  }

  const directMatch = colleges.find((college) => college.id === DEFAULT_ADMIN_COLLEGE_ID);
  if (directMatch) {
    return directMatch.id;
  }

  const targetNameKey = normalizeCollegeKey('SMVEC Engineering college');
  const nameMatch = colleges.find(
    (college) => normalizeCollegeKey(college.name || '') === targetNameKey,
  );

  return nameMatch?.id || colleges[0].id;
}

async function loadProfile(session) {
  if (!session?.user) {
    return null;
  }

  return fetchOrCreateProfile(session.user);
}

async function ensureAdminDefaultCollege({ profile, colleges, userId }) {
  if (!profile || profile.role !== 'admin' || profile.selected_college_id) {
    return profile;
  }

  const defaultCollegeId = resolveDefaultAdminCollegeId(colleges);
  if (!defaultCollegeId) {
    return profile;
  }

  return updateSelectedCollege({ userId, collegeId: defaultCollegeId });
}

async function loadSessionContext(session, { forceColleges = false } = {}) {
  const [profileResult, collegesResult] = await Promise.allSettled([
    loadProfile(session),
    listColleges({ force: forceColleges }),
  ]);

  if (profileResult.status === 'rejected') {
    throw profileResult.reason;
  }

  return {
    profileData: profileResult.value,
    collegesData: collegesResult.status === 'fulfilled' ? collegesResult.value : [],
    collegesError: collegesResult.status === 'rejected' ? collegesResult.reason : null,
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [colleges, setColleges] = useState([]);
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
          const {
            profileData: rawProfileData,
            collegesData,
            collegesError,
          } = await loadSessionContext(activeSession, { forceColleges: true });
          if (collegesError && mounted) {
            toast.error(collegesError.message || 'Failed to load colleges.');
          }
          const profileData = await ensureAdminDefaultCollege({
            profile: rawProfileData,
            colleges: collegesData,
            userId: activeSession.user.id,
          });
          if (mounted) {
            setProfile(profileData);
            setColleges(collegesData);
          }
        } else if (mounted) {
          setProfile(null);
          setColleges([]);
        }
      } catch (error) {
        if (mounted) {
          toast.error(error.message);
          setProfile(null);
          setColleges([]);
        }
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

      try {
        setSession(nextSession);

        if (nextSession?.user) {
          const {
            profileData: rawProfileData,
            collegesData,
            collegesError,
          } = await loadSessionContext(nextSession);
          if (collegesError && mounted) {
            toast.error(collegesError.message || 'Failed to load colleges.');
          }
          const profileData = await ensureAdminDefaultCollege({
            profile: rawProfileData,
            colleges: collegesData,
            userId: nextSession.user.id,
          });
          if (mounted) {
            setProfile(profileData);
            setColleges(collegesData);
          }
        } else if (mounted) {
          setProfile(null);
          setColleges([]);
        }
      } catch (error) {
        if (mounted) {
          toast.error(error.message);
          setProfile(null);
          setColleges([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
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
    const {
      profileData: rawProfileData,
      collegesData,
      collegesError,
    } = await loadSessionContext(data.session);
    if (collegesError) {
      toast.error(collegesError.message || 'Failed to load colleges.');
    }
    const profileData = await ensureAdminDefaultCollege({
      profile: rawProfileData,
      colleges: collegesData,
      userId: data.session.user.id,
    });
    setProfile(profileData);
    setColleges(collegesData);
    return profileData;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      clearProfileCache(session?.user?.id);
      clearCollegesCache();
      setSession(null);
      setProfile(null);
      setColleges([]);
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
    colleges,
    getCollegeNameById: (collegeId) => getCollegeName(collegeId, colleges),
    selectedCollegeId: profile?.selected_college_id || null,
    selectedCollegeName: getCollegeName(profile?.selected_college_id, colleges),
    requiresCollegeSelection: Boolean(
      session?.user
      && profile
      && profile.role !== 'admin'
      && !profile.selected_college_id,
    ),
    signIn: handleSignIn,
    signOut: handleSignOut,
    selectCollege: handleCollegeSelect,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
