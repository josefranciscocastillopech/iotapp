"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { supabase } from "../../utils/supabaseClient"
import { useAuth } from "../../contexts/AuthContext"
import { useNavigate, useLocation } from "react-router"

const LoginForm: React.FC = () => {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { user, setUser } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    // Verificar si ya hay sesión activa
    useEffect(() => {
        if (user) {
            console.log("User already logged in, redirecting to dashboard")
            navigate("/dashboard")
        }
    }, [user, navigate])

    // Modificar la función handleLogin para asegurar que la sesión se guarde correctamente

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            console.log("Attempting login for:", email)

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                console.error("Login error:", error.message)
                throw error
            }

            if (data.user) {
                console.log("Login successful for:", data.user.email)

                // Check if email is verified
                if (!data.user.email_confirmed_at) {
                    setError("Por favor verifica tu correo electrónico antes de iniciar sesión.")
                    await supabase.auth.signOut()
                    setLoading(false)
                    return
                }

                // Get user profile
                const { data: profileData, error: profileError } = await supabase
                    .from("user_profiles")
                    .select("*")
                    .eq("user_id", data.user.id)
                    .single()

                if (profileError && profileError.code !== "PGRST116") {
                    console.error("Error fetching user profile:", profileError)
                }

                // Set user in context
                setUser({
                    ...data.user,
                    profile: profileData || null,
                })

                // Guardar explícitamente la sesión en localStorage como respaldo
                try {
                    if (data.session) {
                        localStorage.setItem("supabase.auth.token", JSON.stringify(data.session))
                    }
                } catch (storageError) {
                    console.error("Error saving session to localStorage:", storageError)
                }

                // Redirect to dashboard
                console.log("Redirecting to dashboard after successful login")
                navigate("/dashboard")
            }
        } catch (err: any) {
            console.error("Error during login:", err)
            setError(err.message || "Error al iniciar sesión. Inténtalo de nuevo.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-form-container">
            <h2>Iniciar Sesión</h2>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={handleLogin} className="auth-form">
                <div className="form-group">
                    <label htmlFor="email">Correo Electrónico</label>
                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Contraseña</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="auth-button" disabled={loading}>
                    {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                </button>
            </form>
            <div className="auth-links">
                <p>
                    ¿No tienes una cuenta? <a href="/register">Regístrate</a>
                </p>
                <p>
                    <a href="/forgot-password">¿Olvidaste tu contraseña?</a>
                </p>
            </div>
        </div>
    )
}

export default LoginForm

