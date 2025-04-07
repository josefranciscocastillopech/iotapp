"use client"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router"
import { useEffect, useState } from "react"
import "./App.css"
import Mapa from "./components/mapa"
import LoginForm from "./components/auth/LoginForm"
import RegisterForm from "./components/auth/RegisterForm"
import VerifyEmail from "./components/auth/VerifyEmail"
import ForgotPassword from "./components/auth/ForgotPassword"
import ResetPassword from "./components/auth/ResetPassword"
import ProtectedRoute from "./components/ProtectedRoute"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { setupDatabase, setupDatabaseFunctions } from "./utils/setupDatabase"
import { checkSupabaseConnection } from "./utils/supabaseClient"

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

// Componente para manejar las rutas
const AppRoutes = () => {
  const { user, loading } = useAuth()
  const [dbInitialized, setDbInitialized] = useState<boolean>(false)
  const [dbError, setDbError] = useState<string | null>(null)

  // Verificar conexión a Supabase y configurar base de datos
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Verificar conexión a Supabase
        const isConnected = await checkSupabaseConnection()

        if (!isConnected) {
          console.error("No se pudo establecer conexión con Supabase")
          setDbError("No se pudo establecer conexión con Supabase. Verifica tus credenciales.")
          return
        }

        // Configurar funciones de base de datos (solo necesario la primera vez)
        try {
          await setupDatabaseFunctions()
        } catch (funcError) {
          console.warn("Error al configurar funciones de base de datos:", funcError)
          // Continuar de todos modos, ya que las funciones podrían ya existir
        }

        // Configurar base de datos
        const setupResult = await setupDatabase()

        if (setupResult) {
          console.log("Base de datos inicializada correctamente")
          setDbInitialized(true)
        } else {
          console.error("Error al inicializar la base de datos")
          setDbError("Error al inicializar la base de datos. Algunas funcionalidades pueden no estar disponibles.")
        }
      } catch (error) {
        console.error("Error al inicializar la base de datos:", error)
        setDbError("Error al inicializar la base de datos. Algunas funcionalidades pueden no estar disponibles.")
      }
    }

    initializeDatabase()
  }, [])

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Cargando aplicación...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {dbError && (
        <div className="db-error-banner">
          <p>{dbError}</p>
          <p>
            Asegúrate de que las variables de entorno REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY estén
            configuradas correctamente.
          </p>
        </div>
      )}

      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginForm />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterForm />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Mapa />
            </ProtectedRoute>
          }
        />

        {/* Redirect root to login if not authenticated, dashboard if authenticated */}
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />

        {/* Catch all route */}
        <Route path="*" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
      </Routes>

      <style>{`
        .db-error-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background-color: #ffebee;
          color: #d32f2f;
          padding: 10px;
          text-align: center;
          z-index: 9999;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </>
  )
}

export default App

