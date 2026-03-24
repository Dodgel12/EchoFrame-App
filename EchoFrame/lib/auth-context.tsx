import React, { createContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'

interface AuthContextType {
  session: Session | null
  user: any | null
  loading: boolean
  signUp: (email: string, password: string, username: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setSession(data.session)
        if (data.session?.user) {
          setUser(data.session.user)
        }
      } catch (error) {
        console.error('Failed to check auth session:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError

      if (authData.user) {
        // Create user record in public.users table
        const { error: dbError } = await supabase.from('users').insert({
          id: authData.user.id,
          username,
          created_at: new Date().toISOString(),
        })

        if (dbError) throw dbError
      }
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setSession(null)
      setUser(null)
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
