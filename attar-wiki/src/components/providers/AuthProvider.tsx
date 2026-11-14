"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  enabled: boolean;
  isEditor: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: false,
  enabled: false,
  isEditor: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  const loadProfile = useCallback(
    async (u: User | null) => {
      if (!supabase || !u) {
        setProfile(null);
        return;
      }
      const { data } = await supabase.from("profiles").select("id, display_name, role, city, bio").eq("id", u.id).maybeSingle();
      setProfile((data as Profile) ?? null);
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      setUser(data.user);
      await loadProfile(data.user);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void loadProfile(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      loading,
      enabled: Boolean(supabase),
      isEditor: profile?.role === "editor" || profile?.role === "admin",
      signOut: async () => {
        await supabase?.auth.signOut();
        setUser(null);
        setProfile(null);
      },
      refreshProfile: () => loadProfile(user),
    }),
    [user, profile, loading, supabase, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
