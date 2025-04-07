import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "https://lqdievxcicjjdwxirogq.supabase.co"
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZGlldnhjaWNqamR3eGlyb2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NDA4MzIsImV4cCI6MjA1ODQxNjgzMn0.9G-sd1sRd_-vf5Sp6ggvkldtTffp3numZHJs1LRLlwk"

// Verificar que las credenciales estén disponibles
if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        "Error: Faltan las credenciales de Supabase. Asegúrate de que REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY estén configuradas.",
    )
}

// Configurar opciones para persistencia de sesión
const supabaseOptions = {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        localStorage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions)

// Función de utilidad para verificar la conexión
export const checkSupabaseConnection = async () => {
    try {
        // Intenta hacer una consulta simple para verificar la conexión
        const { data, error } = await supabase.from("ubicaciones").select("count", { count: "exact" }).limit(1)

        if (error) {
            console.error("Error de conexión a Supabase:", error)
            return false
        }

        console.log("Conexión a Supabase establecida correctamente")
        return true
    } catch (err) {
        console.error("Error al verificar la conexión a Supabase:", err)
        return false
    }
}

    