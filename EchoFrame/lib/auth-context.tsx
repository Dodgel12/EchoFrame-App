import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import React, { createContext, ReactNode, useEffect, useState } from "react";
import { supabase } from "./supabase";

// Create a redirect URL for Supabase auth callbacks
const prefix = Linking.createURL("/");

interface AuthContextType {
  session: Session | null;
  user: any | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        if (data.session?.user) {
          setUser(data.session.user);
        }
      } catch (error) {
        console.error("Failed to check auth session:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Handle deep links for email confirmation
    const handleDeepLink = async (url: string) => {
      console.log("Handling deep link:", url);
      if (url.includes("#access_token=")) {
        const params = new URL(url).hash.substring(1);
        const accessToken = new URLSearchParams(params).get("access_token");
        const refreshToken = new URLSearchParams(params).get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error) {
            const { data } = await supabase.auth.getSession();
            setSession(data.session);
            if (data.session?.user) {
              setUser(data.session.user);
            }
          }
        }
      }
    };

    const subscription2 = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription?.unsubscribe();
      subscription2.remove();
    };
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    try {
      console.log("SignUp called with:", { email, username });

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.error("Auth signup error details:", authError);
        if (authError.message === "Invalid API key") {
          throw new Error(
            'Unable to connect to Supabase. Please verify your API key in .env is correct. It should be a long JWT token (eyJhbGc...), not a "sb_publishable_" key.',
          );
        }
        throw authError;
      }

      if (authData.user) {
        console.log("Auth user created:", authData.user.id);
        console.log("Creating profile with username:", username);

        // Create user profile using public function with user-provided username
        const { error: dbError } = await supabase.rpc("create_user_profile", {
          user_id: authData.user.id,
          user_username: username,
        });

        if (dbError) {
          console.error("RPC error creating profile:", dbError);
          throw dbError;
        }

        console.log(
          "User profile created successfully with username:",
          username,
        );
      }
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ session, user, loading, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
