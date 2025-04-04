"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { useAuth } from "../contexts/AuthContext"

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, session } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isVerifying, setIsVerifying] = useState(true)

  useEffect(() => {
    // When loading is complete, check authentication
    if (!loading) {
      console.log("Auth check complete, user:", user?.email, "session:", !!session)

      // Si no hay usuario ni sesión, intentar recuperar la sesión
      if (!user && !session) {
        console.log("No authenticated user found, checking for stored session...")

        // Intentar recuperar la sesión desde localStorage
        try {
          const storedSession = localStorage.getItem("supabase.auth.token")
          if (storedSession) {
            console.log("Found stored session, waiting for auth context to process it...")
            // Esperar un poco más antes de redirigir, para dar tiempo a que se procese la sesión
            setTimeout(() => {
              setIsVerifying(false)
              // Si después de esperar sigue sin haber usuario, redirigir
              if (!user && !session) {
                console.log("No authenticated user found after waiting, redirecting to login")
                navigate("/login", { state: { from: location }, replace: true })
              }
            }, 1500)
          } else {
            setIsVerifying(false)
            console.log("No stored session found, redirecting to login")
            navigate("/login", { state: { from: location }, replace: true })
          }
        } catch (storageError) {
          console.error("Error accessing localStorage:", storageError)
          setIsVerifying(false)
          navigate("/login", { state: { from: location }, replace: true })
        }
      } else {
        setIsVerifying(false)
      }
    }
  }, [loading, user, session, navigate, location])

  // Show loading state only during initial verification
  if (loading || isVerifying) {
    return (
      <div className="loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  // If we're not loading and we have a user or session, render children
  return <>{children}</>
}

export default ProtectedRoute

