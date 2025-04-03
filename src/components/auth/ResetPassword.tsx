"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router"
import { supabase } from "../../utils/supabaseClient"

const ResetPassword: React.FC = () => {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [validToken, setValidToken] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        const checkToken = async () => {
            try {
                // Get token from URL
                const params = new URLSearchParams(location.hash.substring(1))
                const accessToken = params.get("access_token")
                const refreshToken = params.get("refresh_token")
                const type = params.get("type")

                if (!accessToken || !refreshToken || type !== "recovery") {
                    setError("Enlace de restablecimiento inválido o expirado.")
                    return
                }

                // Set the session
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                })

                if (error) throw error

                setValidToken(true)
            } catch (err: any) {
                console.error("Error checking reset token:", err)
                setError(err.message || "Error al verificar el token de restablecimiento.")
            }
        }

        checkToken()
    }, [location])

    const handleResetPassword = async (e: React.FormEvent) => {
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
            const { error } = await supabase.auth.updateUser({
                password,
            })

            if (error) throw error

            setSuccess("Contraseña actualizada con éxito. Redirigiendo al inicio de sesión...")

            // Sign out and redirect to login
            await supabase.auth.signOut()

            setTimeout(() => {
                navigate("/login")
            }, 3000)
        } catch (err: any) {
            console.error("Error resetting password:", err)
            setError(err.message || "Error al restablecer la contraseña.")
        } finally {
            setLoading(false)
        }
    }

    if (!validToken && !error) {
        return <div className="loading">Verificando enlace de restablecimiento...</div>
    }

    return (
        <div className="auth-form-container">
            <h2>Restablecer Contraseña</h2>
            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}
            {validToken && !success && (
                <form onSubmit={handleResetPassword} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="password">Nueva Contraseña</label>
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
                        {loading ? "Actualizando..." : "Actualizar Contraseña"}
                    </button>
                </form>
            )}
            {!validToken && (
                <div className="auth-links">
                    <p>
                        <a href="/forgot-password">Solicitar un nuevo enlace de restablecimiento</a>
                    </p>
                    <p>
                        <a href="/login">Volver al Inicio de Sesión</a>
                    </p>
                </div>
            )}
        </div>
    )
}

export default ResetPassword

