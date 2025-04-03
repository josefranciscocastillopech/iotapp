import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lqdievxcicjjdwxirogq.supabase.co"
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZGlldnhjaWNqamR3eGlyb2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NDA4MzIsImV4cCI6MjA1ODQxNjgzMn0.9G-sd1sRd_-vf5Sp6ggvkldtTffp3numZHJs1LRLlwk"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Variable para almacenar el estado de la conexión
export let isSupabaseConnected = false

// Función para verificar la conexión a Supabase
export const checkSupabaseConnection = async (): Promise<boolean> => {
    try {
        // Intenta hacer una consulta simple para verificar la conexión
        const { data, error } = await supabase.from("ubicaciones").select("id").limit(1)

        if (error) {
            console.error("Error de conexión a Supabase:", error.message)
            isSupabaseConnected = false
            return false
        }

        isSupabaseConnected = true
        return true
    } catch (err) {
        console.error("Error al verificar la conexión a Supabase:", err)
        isSupabaseConnected = false
        return false
    }
}

    // Verificar la conexión al inicio
    ; (async () => {
        isSupabaseConnected = await checkSupabaseConnection()
        console.log(`Estado de conexión a Supabase: ${isSupabaseConnected ? "Conectado" : "Desconectado"}`)
    })()

