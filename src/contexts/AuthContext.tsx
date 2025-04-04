"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase } from "../utils/supabaseClient"
import type { Session, User } from "@supabase/supabase-js"

interface UserProfile {
  id: number
  user_id: string
  name: string
  email: string
  email_verified: boolean
  created_at: string
}

interface AuthUser extends User {
  profile: UserProfile | null
}

interface AuthContextType {
  session: Session | null
  user: AuthUser | null
  loading: boolean
  setUser: (user: AuthUser | null) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase.from("user_profiles").select("*").eq("user_id", userId).single()

        if (error && error.code !== "PGRST116") {
          console.error("Error fetching user profile:", error)
          return null
        }

        return data
      } catch (err) {
        console.error("Error in fetchUserProfile:", err)
        return null
      }
    }

    const setUserWithProfile = async (authUser: User) => {
      try {
        const profile = await fetchUserProfile(authUser.id)
        setUser({
          ...authUser,
          profile,
        })
      } catch (err) {
        console.error("Error setting user with profile:", err)
        // Even if there's an error with the profile, set the user
        setUser({
          ...authUser,
          profile: null,
        })
      }
    }

    // Initial session check
    const initializeAuth = async () => {
      setLoading(true)
      try {
        console.log("Initializing auth and checking for existing session...")

        // Get current session
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession()

        if (currentSession) {
          console.log("Existing session found:", currentSession.user?.email)
          setSession(currentSession)

          if (currentSession.user) {
            // Set user immediately with basic info, then fetch profile in background
            setUser({
              ...currentSession.user,
              profile: null,
            })

            // Fetch profile in background
            fetchUserProfile(currentSession.user.id).then((profile) => {
              if (profile) {
                setUser((prevUser) => ({
                  ...prevUser!,
                  profile,
                }))
              }
            })
          }
        } else {
          console.log("No active session found")

          // Intentar recuperar la sesión desde localStorage como respaldo
          try {
            const storedSession = localStorage.getItem("supabase.auth.token")
            if (storedSession) {
              console.log("Found stored session in localStorage, attempting to restore...")
              // La sesión existe en localStorage, intentar restaurarla
              const { data, error } = await supabase.auth.refreshSession()

              if (error) {
                console.error("Error refreshing session:", error)
                // Limpiar localStorage si hay error
                localStorage.removeItem("supabase.auth.token")
                setSession(null)
                setUser(null)
              } else if (data.session) {
                console.log("Session restored successfully")
                setSession(data.session)

                if (data.user) {
                  setUser({
                    ...data.user,
                    profile: null,
                  })

                  // Fetch profile in background
                  fetchUserProfile(data.user.id).then((profile) => {
                    if (profile) {
                      setUser((prevUser) => ({
                        ...prevUser!,
                        profile,
                      }))
                    }
                  })
                }
              }
            } else {
              setSession(null)
              setUser(null)
            }
          } catch (storageError) {
            console.error("Error accessing localStorage:", storageError)
            setSession(null)
            setUser(null)
          }
        }
      } catch (err) {
        console.error("Error initializing auth:", err)
        // Reset state on error
        setSession(null)
        setUser(null)
      } finally {
        setLoading(false)
        console.log("Auth initialization completed")
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("Auth state changed:", event)

      if (newSession) {
        console.log("New session established")
        setSession(newSession)

        if (newSession.user) {
          await setUserWithProfile(newSession.user)
        }
      } else if (event === "SIGNED_OUT") {
        console.log("User signed out")
        setSession(null)
        setUser(null)
      }

      // Ensure loading is set to false after auth state change
      setLoading(false)
    })

    // Cleanup subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      console.log("Starting sign out process")
      setLoading(true)

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("Error signing out from Supabase:", error)
        throw error
      }

      // Clear local state
      setUser(null)
      setSession(null)

      console.log("Sign out successful")
      return
    } catch (err) {
      console.error("Error during sign out:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const value = {
    session,
    user,
    loading,
    setUser,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

