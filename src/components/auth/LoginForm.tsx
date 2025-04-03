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
    const [verificationSent, setVerificationSent] = useState(false)
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

    const sendVerificationEmail = async (userEmail: string) => {
        try {
            const { error } = await supabase.auth.resend({
                type: "signup",
                email: userEmail,
                options: {
                    emailRedirectTo: `${window.location.origin}/verify-email`,
                },
            })

            if (error) throw error

            setVerificationSent(true)
            return true
        } catch (err: any) {
            console.error("Error sending verification email:", err)
            setError(`Error al enviar email de verificación: ${err.message}`)
            return false
        }
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setVerificationSent(false)

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

                // Check if email is verified from user metadata
                const isEmailVerified =
                    data.user.email_confirmed_at || (data.user.user_metadata && data.user.user_metadata.email_verified === true)

                if (!isEmailVerified) {
                    console.log("Email not verified, sending verification email")
                    // Sign out the user since they need to verify email first
                    await supabase.auth.signOut()

                    // Send verification email
                    await sendVerificationEmail(email)

                    setLoading(false)
                    return
                }

                // Try to get user profile, but don't fail if it doesn't exist
                let profileData = null
                try {
                    const { data: profile, error: profileError } = await supabase
                        .from("user_profiles")
                        .select("*")
                        .eq("user_id", data.user.id)
                        .single()

                    if (!profileError) {
                        profileData = profile
                    }
                } catch (profileErr) {
                    console.warn("Could not fetch profile, but continuing with auth user:", profileErr)
                }

                // Set user in context with profile data if available
                setUser({
                    ...data.user,
                    profile: profileData,
                })

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
            {verificationSent && (
                <div className="auth-success">
                    Se ha enviado un enlace de verificación a tu correo electrónico. Por favor verifica tu cuenta antes de iniciar
                    sesión.
                </div>
            )}
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
                {!verificationSent && (
                    <p>
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault()
                                sendVerificationEmail(email)
                            }}
                        >
                            Reenviar email de verificación
                        </a>
                    </p>
                )}
            </div>
        </div>
    )
}

export default LoginForm

