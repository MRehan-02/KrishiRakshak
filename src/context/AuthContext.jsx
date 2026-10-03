import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useLang } from './LangContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { language, setLanguage } = useLang();

  // Load session from Supabase on startup
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn('Supabase session fetch warning:', sessionError.message);
        }
        if (session?.user && mounted) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.warn('Auth initialization error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Listen to Supabase auth events
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
        if (data.language && data.language !== language) {
          setLanguage(data.language);
        }
        return data;
      }
    } catch (err) {
      console.warn('Failed to fetch profile from Supabase:', err);
    }
    return null;
  }

  // Sign Up: user can choose role 'farmer' or 'officer'
  const signUp = async (email, password, { name, role = 'farmer', district = 'Pune' }) => {
    setError(null);
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      const cleanName = (name || '').trim() || cleanEmail.split('@')[0];
      const selectedRole = role === 'officer' ? 'officer' : 'farmer';
      const selectedDistrict = district || 'Pune';
      const activeLang = language || 'en';

      const { data, error: sbError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: cleanName,
            role: selectedRole,
            district: selectedDistrict,
            language: activeLang,
          },
        },
      });

      if (sbError) throw sbError;

      if (data?.user) {
        // If session returned immediately (auto-confirm enabled)
        if (data.session) {
          setUser(data.user);
          // Upsert to profiles table as safety fallback
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              name: cleanName,
              role: selectedRole,
              district: selectedDistrict,
              language: activeLang,
            });
          } catch (pErr) {
            console.warn('Profile sync fallback:', pErr);
          }
          const loadedProfile = await fetchProfile(data.user.id);
          return { success: true, requiresConfirmation: false, profile: loadedProfile, role: selectedRole };
        } else {
          // Email confirmation is required by Supabase project settings
          return {
            success: true,
            requiresConfirmation: true,
            role: selectedRole,
            message: 'Account created! Please check your email to confirm registration before signing in.',
          };
        }
      }

      return { success: true, requiresConfirmation: false, role: selectedRole };
    } catch (err) {
      const msg = err.message || 'Failed to create account';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  // Sign In with Supabase credentials
  const signIn = async (email, password) => {
    setError(null);
    setLoading(true);

    try {
      const { data, error: sbError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (sbError) throw sbError;

      if (data?.user) {
        setUser(data.user);
        const loadedProfile = await fetchProfile(data.user.id);
        return { success: true, user: data.user, profile: loadedProfile };
      }

      return { success: false, error: 'User not returned' };
    } catch (err) {
      const msg = err.message || 'Authentication failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out warning:', e);
    } finally {
      setUser(null);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
