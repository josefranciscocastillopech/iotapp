import { createClient } from "@supabase/supabase-js"
import type { ApiResponse, Parcela, WeatherData } from "../types/types"

// Asegúrate de que estas variables de entorno estén configuradas correctamente
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

// Datos de ejemplo para simular la API
const sampleApiResponse: ApiResponse = {
  sensores: {
    temperatura: 28.5,
    humedad: 75,
    lluvia: 0,
    sol: 85,
  },
  parcelas: [
    {
      id: 1,
      nombre: "Parcela Norte",
      ubicacion: "Sector Norte",
      responsable: "Juan Pérez",
      tipo_cultivo: "Maíz",
      ultimo_riego: new Date().toISOString(),
      sensor: {
        temperatura: 27.8,
        humedad: 72,
      },
    },
    {
      id: 2,
      nombre: "Parcela Sur",
      ubicacion: "Sector Sur",
      responsable: "María López",
      tipo_cultivo: "Frijol",
      ultimo_riego: new Date().toISOString(),
      sensor: {
        temperatura: 29.2,
        humedad: 68,
      },
    },
    {
      id: 3,
      nombre: "Parcela Este",
      ubicacion: "Sector Este",
      responsable: "Carlos Rodríguez",
      tipo_cultivo: "Tomate",
      ultimo_riego: new Date().toISOString(),
      sensor: {
        temperatura: 28.0,
        humedad: 70,
      },
    },
  ],
}

// Función para guardar datos del clima en la tabla datos_clima
const saveClimateData = async (weatherData: WeatherData) => {
  try {
    console.log("Guardando datos del clima en Supabase...")

    const { data, error } = await supabase.from("datos_clima").insert([
      {
        temperatura: weatherData.temperatura,
        humedad: weatherData.humedad,
        lluvia: weatherData.lluvia,
        sol: weatherData.sol,
        fecha_creacion: new Date().toISOString(),
        id_ubicacion: 1, // Valor predeterminado, ajustar según sea necesario
      },
    ])

    if (error) {
      console.error("Error al guardar datos del clima:", error)
      return false
    }

    console.log("Datos del clima guardados correctamente:", data)
    return true
  } catch (err) {
    console.error("Error en saveClimateData:", err)
    return false
  }
}

// Función para guardar datos de sensores en la tabla historico_sensores
const saveSensorData = async (parcelas: Parcela[]) => {
  try {
    console.log("Guardando datos de sensores en Supabase...")

    // Preparar los datos para inserción
    const sensorRecords = []

    for (const parcela of parcelas) {
      if (parcela.sensor) {
        // Registro para temperatura
        sensorRecords.push({
          parcela_id: parcela.id,
          sensor_id: 1, // ID genérico para sensores de temperatura
          tipo: "temperatura",
          valor: parcela.sensor.temperatura,
          timestamp: new Date().toISOString(),
        })

        // Registro para humedad
        sensorRecords.push({
          parcela_id: parcela.id,
          sensor_id: 2, // ID genérico para sensores de humedad
          tipo: "humedad",
          valor: parcela.sensor.humedad,
          timestamp: new Date().toISOString(),
        })
      }
    }

    if (sensorRecords.length === 0) {
      console.log("No hay datos de sensores para guardar")
      return false
    }

    const { data, error } = await supabase.from("historico_sensores").insert(sensorRecords)

    if (error) {
      console.error("Error al guardar datos de sensores:", error)
      return false
    }

    console.log(`${sensorRecords.length} registros de sensores guardados correctamente`)
    return true
  } catch (err) {
    console.error("Error en saveSensorData:", err)
    return false
  }
}

// Función para detectar parcelas eliminadas
const detectDeletedPlots = async (currentParcelas: Parcela[]) => {
  try {
    console.log("Verificando parcelas eliminadas...")

    // Obtener todas las parcelas activas de la base de datos
    const { data: activePlots, error: fetchError } = await supabase.from("informacion").select("id")

    if (fetchError) {
      console.error("Error al obtener parcelas activas:", fetchError)
      return false
    }

    // IDs de parcelas activas en la base de datos
    const activeIdsInDB = activePlots ? activePlots.map((plot) => plot.id) : []

    // IDs de parcelas activas en la API actual
    const activeIdsInAPI = currentParcelas.map((parcela) => parcela.id)

    // Encontrar parcelas que están en la DB pero no en la API (eliminadas)
    const deletedIds = activeIdsInDB.filter((id) => !activeIdsInAPI.includes(id))

    if (deletedIds.length === 0) {
      console.log("No se detectaron parcelas eliminadas")
      return true
    }

    console.log(`Detectadas ${deletedIds.length} parcelas eliminadas:`, deletedIds)

    // Para cada parcela eliminada, moverla a la tabla parcelas_eliminadas
    for (const id of deletedIds) {
      // Obtener información completa de la parcela
      const { data: plotInfo, error: plotError } = await supabase
        .from("informacion")
        .select(`
          id, 
          nombre, 
          ubicaciones (nombre),
          responsable,
          tipos_de_cultivos (nombre),
          ultimo_riego,
          sensores (informacion)
        `)
        .eq("id", id)
        .single()

      if (plotError) {
        console.error(`Error al obtener información de la parcela ${id}:`, plotError)
        continue
      }

      if (!plotInfo) {
        console.warn(`No se encontró información para la parcela ${id}`)
        continue
      }

      // Preparar datos para insertar en parcelas_eliminadas
      const deletedPlotData = {
        id: plotInfo.id,
        nombre: plotInfo.nombre, // Acceder directamente si existe en la estructura
        ubicacion: plotInfo.ubicaciones?.[0]?.nombre || "Desconocida", // Ajuste para arrays
        responsable: plotInfo.responsable,
        tipo_cultivo: plotInfo.tipos_de_cultivos?.[0]?.nombre || "Desconocido", // Ajuste para arrays
        ultimo_riego: plotInfo.ultimo_riego,
        fecha_eliminacion: new Date().toISOString(),
        sensor_data: JSON.stringify(plotInfo.sensores?.[0]?.informacion || {}) // Ajuste para arrays
      };


      // Insertar en parcelas_eliminadas
      const { error: insertError } = await supabase.from("parcelas_eliminadas").insert([deletedPlotData])

      if (insertError) {
        console.error(`Error al insertar parcela eliminada ${id}:`, insertError)
        continue
      }

      // Eliminar de la tabla informacion
      const { error: deleteError } = await supabase.from("informacion").delete().eq("id", id)

      if (deleteError) {
        console.error(`Error al eliminar parcela ${id} de informacion:`, deleteError)
      } else {
        console.log(`Parcela ${id} movida correctamente a parcelas_eliminadas`)
      }
    }

    return true
  } catch (err) {
    console.error("Error en detectDeletedPlots:", err)
    return false
  }
}

// Función principal para obtener datos de la API y guardarlos en Supabase
export const fetchApiData = async (): Promise<ApiResponse> => {
  try {
    console.log("Obteniendo datos de la API y guardando en Supabase...")

    // En un entorno real, aquí harías una llamada fetch a tu API externa
    // Por ahora, usamos datos de ejemplo
    const apiResponse = sampleApiResponse

    // Guardar datos del clima
    await saveClimateData(apiResponse.sensores)

    // Guardar datos de sensores
    await saveSensorData(apiResponse.parcelas)

    // Detectar parcelas eliminadas
    await detectDeletedPlots(apiResponse.parcelas)

    return apiResponse
  } catch (error) {
    console.error("Error en fetchApiData:", error)
    throw error
  }
}

// Función para obtener datos históricos de sensores
export const fetchHistoricalSensorData = async () => {
  try {
    console.log("Obteniendo datos históricos de sensores...")

    const { data, error } = await supabase
      .from("historico_sensores")
      .select(`
        id,
        parcela_id,
        sensor_id,
        tipo,
        valor,
        timestamp,
        informacion:parcela_id (
          nombre,
          id_ubicacion,
          ubicaciones:id_ubicacion (nombre)
        )
      `)
      .order("timestamp", { ascending: false })
      .limit(100)

    if (error) {
      console.error("Error al obtener datos históricos de sensores:", error)
      return []
    }

    console.log(`Obtenidos ${data.length} registros históricos de sensores`)
    return data
  } catch (err) {
    console.error("Error en fetchHistoricalSensorData:", err)
    return []
  }
}

// Función para obtener datos del clima
export const fetchClimateData = async () => {
  try {
    console.log("Obteniendo datos históricos del clima...")

    const { data, error } = await supabase
      .from("datos_clima")
      .select("*")
      .order("fecha_creacion", { ascending: false })
      .limit(100)

    if (error) {
      console.error("Error al obtener datos del clima:", error)
      return []
    }

    console.log(`Obtenidos ${data.length} registros de datos del clima`)
    return data
  } catch (err) {
    console.error("Error en fetchClimateData:", err)
    return []
  }
}

// Función para obtener parcelas eliminadas
export const fetchDeletedPlots = async () => {
  try {
    console.log("Obteniendo parcelas eliminadas...")

    const { data, error } = await supabase
      .from("parcelas_eliminadas")
      .select("*")
      .order("fecha_eliminacion", { ascending: false })

    if (error) {
      console.error("Error al obtener parcelas eliminadas:", error)
      return []
    }

    console.log(`Obtenidas ${data.length} parcelas eliminadas`)
    return data
  } catch (err) {
    console.error("Error en fetchDeletedPlots:", err)
    return []
  }
}

// Función para obtener active plots
export const fetchActivePlots = async () => {
  try {
    console.log("Obteniendo parcelas activas...")

    const { data, error } = await supabase.from("informacion").select(`
        id,
        nombre,
        id_ubicacion,
        responsable,
        id_tipo_cultivo,
        ultimo_riego,
        id_sensor,
        ubicaciones (
          nombre
        ),
        tipos_de_cultivos (
          nombre
        ),
        sensores (
          id,
          nombre,
          informacion
        )
      `)

    if (error) {
      console.error("Error al obtener parcelas activas:", error)
      return []
    }

    console.log(`Obtenidas ${data.length} parcelas activas`)
    return data
  } catch (err) {
    console.error("Error en fetchActivePlots:", err)
    return []
  }
}

