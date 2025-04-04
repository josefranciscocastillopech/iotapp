import { createClient } from "@supabase/supabase-js"
import type { ApiResponse, HistoricoSensor, DeletedParcela, DatosClima, PlotInformation } from "../types/types"

// Asegúrate de que estas variables de entorno estén configuradas correctamente
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || ""
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ""

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

// Función para guardar datos de la API en Supabase
const saveApiDataToSupabase = async (data: ApiResponse) => {
    try {
        // Verificar conexión a Supabase
        const isConnected = await checkSupabaseConnection()
        if (!isConnected) {
            console.error("No se pudo guardar datos en Supabase: sin conexión")
            return
        }

        // Guardar datos del clima
        const { error: climateError } = await supabase.from("datos_clima").insert([
            {
                temperatura: data.sensores.temperatura,
                humedad: data.sensores.humedad,
                lluvia: data.sensores.lluvia,
                sol: data.sensores.sol,
                fecha_creacion: new Date().toISOString(),
                id_ubicacion: 1, // ID por defecto para ubicación
            },
        ])

        if (climateError) {
            console.error("Error al guardar datos del clima:", climateError)
        } else {
            console.log("Datos del clima guardados correctamente")
        }

        // Guardar datos de sensores para cada parcela
        for (const parcela of data.parcelas) {
            // Guardar datos de temperatura
            const { error: tempError } = await supabase.from("historico_sensores").insert([
                {
                    parcela_id: parcela.id,
                    sensor_id: 1, // ID por defecto para sensor de temperatura
                    tipo: "temperatura",
                    valor: parcela.sensor.temperatura,
                    timestamp: new Date().toISOString(),
                },
            ])

            if (tempError) {
                console.error(`Error al guardar datos de temperatura para parcela ${parcela.id}:`, tempError)
            }

            // Guardar datos de humedad
            const { error: humError } = await supabase.from("historico_sensores").insert([
                {
                    parcela_id: parcela.id,
                    sensor_id: 2, // ID por defecto para sensor de humedad
                    tipo: "humedad",
                    valor: parcela.sensor.humedad,
                    timestamp: new Date().toISOString(),
                },
            ])

            if (humError) {
                console.error(`Error al guardar datos de humedad para parcela ${parcela.id}:`, humError)
            }
        }

        console.log("Datos de sensores guardados correctamente")

        // Detectar parcelas eliminadas
        try {
            // Obtener IDs de parcelas activas
            const activeParcelIds = data.parcelas.map((p) => p.id)

            // Obtener todas las parcelas de la base de datos
            const { data: dbParcelas, error: dbError } = await supabase.from("parcelas").select("id")

            if (dbError) {
                console.error("Error al obtener parcelas de la base de datos:", dbError)
                return
            }

            // Encontrar parcelas que están en la base de datos pero no en la API (eliminadas)
            if (dbParcelas && Array.isArray(dbParcelas)) {
                const dbParcelIds = dbParcelas.map((p) => p.id)
                const deletedParcelIds = dbParcelIds.filter((id) => !activeParcelIds.includes(id))

                // Procesar parcelas eliminadas
                for (const deletedId of deletedParcelIds) {
                    // Obtener datos de la parcela eliminada
                    const { data: deletedParcel, error: getError } = await supabase
                        .from("parcelas")
                        .select("*")
                        .eq("id", deletedId)
                        .single()

                    if (getError) {
                        console.error(`Error al obtener datos de parcela eliminada ${deletedId}:`, getError)
                        continue
                    }

                    if (deletedParcel) {
                        // Guardar en parcelas_eliminadas
                        const { error: saveError } = await supabase.from("parcelas_eliminadas").insert([
                            {
                                id: deletedParcel.id,
                                nombre: deletedParcel.nombre,
                                ubicacion: deletedParcel.ubicacion,
                                responsable: deletedParcel.responsable,
                                tipo_cultivo: deletedParcel.tipo_cultivo,
                                ultimo_riego: deletedParcel.ultimo_riego,
                                fecha_eliminacion: new Date().toISOString(),
                                sensor_data: JSON.stringify({
                                    temperatura: deletedParcel.temperatura,
                                    humedad: deletedParcel.humedad,
                                }),
                            },
                        ])

                        if (saveError) {
                            console.error(`Error al guardar parcela eliminada ${deletedId}:`, saveError)
                        } else {
                            console.log(`Parcela eliminada ${deletedId} guardada correctamente`)

                            // Eliminar de la tabla de parcelas
                            const { error: deleteError } = await supabase.from("parcelas").delete().eq("id", deletedId)

                            if (deleteError) {
                                console.error(`Error al eliminar parcela ${deletedId} de la tabla de parcelas:`, deleteError)
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error al procesar parcelas eliminadas:", err)
        }
    } catch (err) {
        console.error("Error general al guardar datos en Supabase:", err)
    }
}

// Función para obtener datos de la API
export const fetchApiData = async (): Promise<ApiResponse> => {
    try {
        console.log("Fetching API data from endpoint (one-time load)...", new Date().toLocaleTimeString())

        // Create a promise that rejects after 10 seconds
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("API request timed out after 10 seconds")), 10000)
        })

        // Race the fetch against the timeout
        const apiUrl = "https://moriahmkt.com/iotapp/updated/"
        console.log("Fetching data from API URL:", apiUrl)
        const response = (await Promise.race([fetch(apiUrl), timeoutPromise])) as Response

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log("API data fetched successfully (one-time load) at", new Date().toLocaleTimeString())

        // Log the number of parcels received from API
        if (data && data.parcelas) {
            console.log(`Received ${Array.isArray(data.parcelas) ? data.parcelas.length : 0} parcels from API`)
        }

        // Verificar que los datos tengan la estructura esperada
        if (!data || !data.sensores || typeof data.sensores !== "object") {
            console.error("API data has invalid structure:", data)
            throw new Error("API data has invalid structure")
        }

        // Asegurarse de que sensores tenga todas las propiedades necesarias
        const sensores = {
            temperatura: data.sensores.temperatura || 0,
            humedad: data.sensores.humedad || 0,
            lluvia: data.sensores.lluvia || 0,
            sol: data.sensores.sol || 0,
        }

        // Asegurarse de que parcelas sea un array
        const parcelasData = Array.isArray(data.parcelas) ? data.parcelas : []

        // Crear una respuesta normalizada con tipado correcto
        const normalizedResponse: ApiResponse = {
            sensores,
            parcelas: parcelasData.map((p: any) => ({
                id: p.id || Math.floor(Math.random() * 10000),
                nombre: p.nombre || `Parcela ${Math.floor(Math.random() * 1000)}`,
                ubicacion: p.ubicacion || "Ubicación desconocida",
                responsable: p.responsable || "Sin responsable",
                tipo_cultivo: p.tipo_cultivo || "Sin especificar",
                ultimo_riego: p.ultimo_riego || new Date().toISOString(),
                sensor: {
                    temperatura: p.sensor?.temperatura !== undefined ? p.sensor.temperatura : 0,
                    humedad: p.sensor?.humedad !== undefined ? p.sensor.humedad : 0,
                },
            })),
        }

        // Automatically save the data to Supabase
        await saveApiDataToSupabase(normalizedResponse)

        return normalizedResponse
    } catch (error) {
        console.error("Error fetching API data:", error)
        // Return default data structure to prevent app from crashing
        return {
            sensores: {
                temperatura: 25,
                humedad: 60,
                lluvia: 0,
                sol: 80,
            },
            parcelas: [
                {
                    id: 1,
                    nombre: "Parcela Muestra 1",
                    ubicacion: "Cancún",
                    responsable: "Juan Pérez",
                    tipo_cultivo: "Maíz",
                    ultimo_riego: new Date().toISOString(),
                    sensor: {
                        temperatura: 28,
                        humedad: 65,
                    },
                },
            ],
        }
    }
}

// Función para obtener datos históricos de sensores
export const fetchHistoricalSensorData = async (): Promise<HistoricoSensor[]> => {
    try {
        console.log("Fetching historical sensor data...")
        const { data, error } = await supabase
            .from("historico_sensores")
            .select("*, informacion:parcela_id(nombre, id_ubicacion, ubicaciones:id_ubicacion(nombre))")
            .order("timestamp", { ascending: false })
            .limit(100)

        if (error) {
            console.error("Error fetching historical sensor data:", error)
            throw error
        }

        return data || []
    } catch (err) {
        console.error("Error in fetchHistoricalSensorData:", err)
        return []
    }
}

// Función para obtener datos del clima
export const fetchClimateData = async (): Promise<DatosClima[]> => {
    try {
        console.log("Fetching climate data...")
        const { data, error } = await supabase
            .from("datos_clima")
            .select("*")
            .order("fecha_creacion", { ascending: false })
            .limit(100)

        if (error) {
            console.error("Error fetching climate data:", error)
            throw error
        }

        return data || []
    } catch (err) {
        console.error("Error in fetchClimateData:", err)
        return []
    }
}

// Función para obtener parcelas eliminadas
export const fetchDeletedPlots = async (): Promise<DeletedParcela[]> => {
    try {
        console.log("Fetching deleted plots...")
        const { data, error } = await supabase
            .from("parcelas_eliminadas")
            .select("*")
            .order("fecha_eliminacion", { ascending: false })

        if (error) {
            console.error("Error fetching deleted plots:", error)
            throw error
        }

        return data || []
    } catch (err) {
        console.error("Error in fetchDeletedPlots:", err)
        return []
    }
}

// Función para obtener parcelas activas
export const fetchActivePlots = async (): Promise<PlotInformation[]> => {
    try {
        console.log("Fetching active plots...")
        const { data, error } = await supabase
            .from("parcelas")
            .select(
                "*, ubicaciones:id_ubicacion(nombre), tipos_de_cultivos:id_tipo_cultivo(nombre), sensores:id_sensor(id, nombre, informacion)",
            )

        if (error) {
            console.error("Error fetching active plots:", error)
            throw error
        }

        return data || []
    } catch (err) {
        console.error("Error in fetchActivePlots:", err)
        return []
    }
}

