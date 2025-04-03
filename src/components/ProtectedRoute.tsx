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
      setIsVerifying(false)

      // If no user and no session after loading completes, redirect to login
      if (!user && !session) {
        console.log("No authenticated user found, redirecting to login")
        navigate("/login", { state: { from: location }, replace: true })
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

