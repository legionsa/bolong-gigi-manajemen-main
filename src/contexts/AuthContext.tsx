
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Define a basic UserProfileType, can be expanded as needed
export interface UserProfileType {
  id: string;
  user_auth_id: string;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  phone_number?: string | null;
  role_name?: string | null; // Assuming role_name is part of the profile
  // Add other relevant profile fields here
  [key: string]: any; // Allow other properties
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean; // Auth loading state
  logout: () => Promise<void>;
  userProfile: UserProfileType | null;
  isLoadingProfile: boolean; // Profile loading state
  refetchUserProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const fetchUserProfile = async (userId: string): Promise<UserProfileType | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_auth_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
  return data;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const refetchUserProfile = useCallback(async () => {
    if (!user) return;
    setIsLoadingProfile(true);
    const profile = await fetchUserProfile(user.id);
    setUserProfile(profile);
    setIsLoadingProfile(false);
  }, [user]);

  useEffect(() => {
    const initAuth = async () => {
      setAuthLoading(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (err) {
        console.error('Auth session error:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = {
    user,
    session,
    loading: authLoading,
    logout,
    userProfile,
    isLoadingProfile,
    refetchUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
