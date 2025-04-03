"use client"

import type React from "react"
import { useState } from "react"
import { supabase } from "../../utils/supabaseClient"

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (error) throw error

            setSuccess("Se ha enviado un enlace para restablecer tu contraseña a tu correo electrónico.")
        } catch (err: any) {
            console.error("Error sending reset password email:", err)
            setError(err.message || "Error al enviar el correo de restablecimiento de contraseña.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-form-container">
            <h2>Recuperar Contraseña</h2>
            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}
            <form onSubmit={handleResetPassword} className="auth-form">
                <div className="form-group">
                    <label htmlFor="email">Correo Electrónico</label>
                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <button type="submit" className="auth-button" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar Enlace de Recuperación"}
                </button>
            </form>
            <div className="auth-links">
                <p>
                    <a href="/login">Volver al Inicio de Sesión</a>
                </p>
            </div>
        </div>
    )
}

export default ForgotPassword

