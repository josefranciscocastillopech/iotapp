"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { supabase } from "../../utils/supabaseClient"
import { useNavigate } from "react-router"
import { useAuth } from "../../contexts/AuthContext"

const RegisterForm: React.FC = () => {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const navigate = useNavigate()
    const { user } = useAuth()

    // Verificar si ya hay sesión activa
    useEffect(() => {
        if (user) {
            navigate("/dashboard")
        }
    }, [user, navigate])

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        // Validate passwords match
        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden")
            setLoading(false)
            return
        }

        // Validate password strength
        if (password.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres")
            setLoading(false)
            return
        }

        try {
            // Register user with Supabase Auth only
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        email_verified: false, // Explicitly set to false
                    },
                    emailRedirectTo: `${window.location.origin}/verify-email`,
                },
            })

            if (error) throw error

            if (data.user) {
                // Show success message
                setSuccess(
                    "Registro exitoso. Por favor verifica tu correo electrónico para activar tu cuenta. Se ha enviado un enlace de verificación a tu correo.",
                )

                // Sign out the user since they need to verify email
                await supabase.auth.signOut()

                // Redirect to login after 5 seconds
                setTimeout(() => {
                    navigate("/login")
                }, 5000)
            }
        } catch (err: any) {
            console.error("Error durante el registro:", err)
            setError(err.message || "Error al registrarse. Inténtalo de nuevo.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-form-container">
            <h2>Registro</h2>
            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}
            <form onSubmit={handleRegister} className="auth-form">
                <div className="form-group">
                    <label htmlFor="name">Nombre Completo</label>
                    <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
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
                    <small>La contraseña debe tener al menos 8 caracteres</small>
                </div>
                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="auth-button" disabled={loading}>
                    {loading ? "Registrando..." : "Registrarse"}
                </button>
            </form>
            <div className="auth-links">
                <p>
                    ¿Ya tienes una cuenta? <a href="/login">Iniciar Sesión</a>
                </p>
            </div>
        </div>
    )
}

export default RegisterForm

