"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router"
import { supabase } from "../../utils/supabaseClient"

const VerifyEmail: React.FC = () => {
    const [verifying, setVerifying] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                // Get token from URL
                const params = new URLSearchParams(location.hash.substring(1))
                const accessToken = params.get("access_token")
                const refreshToken = params.get("refresh_token")
                const type = params.get("type")

                if (!accessToken || !refreshToken || type !== "signup") {
                    setError("Enlace de verificación inválido o expirado.")
                    setVerifying(false)
                    return
                }

                // Set the session
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                })

                if (error) throw error

                // Get user
                const {
                    data: { user },
                } = await supabase.auth.getUser()

                if (!user) {
                    throw new Error("No se pudo obtener la información del usuario.")
                }

                // Update user metadata to mark email as verified
                const { error: updateError } = await supabase.auth.updateUser({
                    data: { email_verified: true },
                })

                if (updateError) throw updateError

                setSuccess("¡Correo electrónico verificado con éxito! Redirigiendo al inicio de sesión...")

                // Sign out and redirect to login
                await supabase.auth.signOut()

                setTimeout(() => {
                    navigate("/login")
                }, 3000)
            } catch (err: any) {
                console.error("Error verifying email:", err)
                setError(err.message || "Error al verificar el correo electrónico.")
            } finally {
                setVerifying(false)
            }
        }

        verifyEmail()
    }, [location, navigate])

    return (
        <div className="verify-email-container">
            <h2>Verificación de Correo Electrónico</h2>
            {verifying && <p>Verificando tu correo electrónico...</p>}
            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}
            {!verifying && !success && (
                <div>
                    <p>
                        Si tienes problemas para verificar tu correo electrónico, puedes intentar
                        <a href="/login"> iniciar sesión </a> o<a href="/register"> registrarte de nuevo</a>.
                    </p>
                </div>
            )}
        </div>
    )
}

export default VerifyEmail

