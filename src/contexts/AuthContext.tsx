
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // Renamed to avoid conflict

  // Fetch user profile using the hook
  const { userProfile, isLoadingProfile, refetchUserProfile } = useUserProfile(); 

  useEffect(() => {
    setAuthLoading(true); // Set loading to true at the start of the effect
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await refetchUserProfile(); // Fetch profile if user exists
      }
    }).finally(() => {
      setAuthLoading(false); // Set loading to false after session and profile are handled
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setAuthLoading(true); // Set loading to true before handling auth state change
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await refetchUserProfile(); // Trigger profile fetch on auth change if user exists
        } else {
          // Optionally clear profile or handle logged out state if needed
        }
        setAuthLoading(false); // Set loading to false after auth state change is handled
      }
    );

    return () => subscription.unsubscribe();
  }, [refetchUserProfile]); // Added refetchUserProfile to dependencies

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    // setUser(null); // Optionally clear user state immediately
    // setSession(null);
  }, []);

  const value = {
    user,
    session,
    loading: authLoading, // Use authLoading for the general loading state
    logout,
    userProfile,
    isLoadingProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
