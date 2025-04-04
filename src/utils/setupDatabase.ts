import { supabase } from "./supabaseClient"

export const setupDatabase = async (): Promise<boolean> => {
  try {
    console.log("Inicializando base de datos...")

    // Verificar si las tablas ya existen utilizando un enfoque compatible
    const { data: existingTables, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
    
    if (tablesError) {
      console.error("Error al verificar tablas existentes:", tablesError)
      return false
    }

    const tableNames = existingTables ? existingTables.map(t => t.tablename) : []

    // Crear tabla de ubicaciones si no existe
    if (!tableNames.includes("ubicaciones")) {
      const { error: ubicacionesError } = await supabase.rpc('ejecutar_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS ubicaciones (
            id SERIAL PRIMARY KEY,
            nombre TEXT NOT NULL,
            latitud FLOAT,
            longitud FLOAT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `
      })

      if (ubicacionesError) {
        console.error("Error al crear tabla ubicaciones:", ubicacionesError)
        return false
      }

      // Insertar ubicación por defecto
      const { error: insertError } = await supabase.from("ubicaciones").insert([
        {
          nombre: "Cancún",
          latitud: 21.0367,
          longitud: -86.8742,
        },
      ])

      if (insertError && insertError.code !== "23505") {
        // Ignorar error si es por duplicado (código 23505)
        console.error("Error al insertar ubicación por defecto:", insertError)
      }
    }

    // Crear tabla de tipos de cultivos si no existe
    if (!tableNames.includes("tipos_de_cultivos")) {
      const { error: cultivosError } = await supabase.rpc('ejecutar_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS tipos_de_cultivos (
            id SERIAL PRIMARY KEY,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `
      })

      if (cultivosError) {
        console.error("Error al crear tabla tipos_de_cultivos:", cultivosError)
        return false
      }

      // Insertar tipos de cultivo por defecto
      const { error: insertError } = await supabase.from("tipos_de_cultivos").insert([
        { nombre: "Maíz", descripcion: "Cultivo de maíz" },
        { nombre: "Frijol", descripcion: "Cultivo de frijol" },
        { nombre: "Tomate", descripcion: "Cultivo de tomate" },
      ])

      if (insertError && insertError.code !== "23505") {
        console.error("Error al insertar tipos de cultivo por defecto:", insertError)
      }
    }

    // Crear tabla de sensores si no existe
    if (!tableNames.includes("sensores")) {
      const { error: sensoresError } = await supabase.rpc('ejecutar_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS sensores (
            id SERIAL PRIMARY KEY,
            nombre TEXT NOT NULL,
            tipo TEXT NOT NULL,
            informacion JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `
      })

      if (sensoresError) {
        console.error("Error al crear tabla sensores:", sensoresError)
        return false
      }

      // Insertar sensores por defecto
      const { error: insertError } = await supabase.from("sensores").insert([
        {
          nombre: "Sensor de Temperatura",
          tipo: "temperatura",
          informacion: { unidad: "°C", precision: 0.1 },
        },
        {
          nombre: "Sensor de Humedad",
          tipo: "humedad",
          informacion: { unidad: "%", precision: 1 },
        },
      ])

      if (insertError && insertError.code !== "23505") {
        console.error("Error al insertar sensores por defecto:", insertError)
      }
    }

    // Crear tabla de parcelas si no existe
    if (!tableNames.includes("parcelas")) {
      const { error: parcelasError } = await supabase.rpc('ejecutar_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS parcelas (
            id SERIAL PRIMARY KEY,
            nombre TEXT NOT NULL,
            id_ubicacion INTEGER,
            responsable TEXT,
            id_tipo_cultivo INTEGER,
            ultimo_riego TIMESTAMP WITH TIME ZONE,
            id_sensor INTEGER,
            temperatura FLOAT,
            humedad FLOAT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `
      })

      if (parcelasError) {
        console.error("Error al crear tabla parcelas:", parcelasError)
        return false
      }
    }

    // Crear tabla de datos_clima si no existe
    if (!tableNames.includes("datos_clima")) {
      const { error: climaError } = await supabase.rpc('ejecutar_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS datos_clima (
            id SERIAL PRIMARY KEY,
            temperatura FLOAT NOT NULL,
            humedad FLOAT NOT NULL,
            lluvia FLOAT,
            sol FLOAT,
            fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            id_ubicacion INTEGER
          )
        `
      })

      if (climaError) {
        console.error("Error al crear tabla datos_clima:", climaError)
        return false
      }
    }

    // Crear tabla de historico_sensores si no existe
    if (!tableNames.includes("historico_sensores")) {
      const { error: historicoError } = await supabase.rpc('ejecutar_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS historico_sensores (
            id SERIAL PRIMARY KEY,
            parcela_id INTEGER,
            sensor_id INTEGER,
            tipo TEXT NOT NULL,
            valor FLOAT NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `
      })

      if (historicoError) {
        console.error("Error al crear tabla historico_sensores:", historicoError)
        return false
      }
    }

    // Crear tabla de parcelas_eliminadas si no existe
    if (!tableNames.includes("parcelas_eliminadas")) {
      const { error: eliminadasError } = await supabase.rpc('ejecutar_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS parcelas_eliminadas (
            id SERIAL PRIMARY KEY,
            nombre TEXT NOT NULL,
            ubicacion TEXT,
            responsable TEXT,
            tipo_cultivo TEXT,
            ultimo_riego TIMESTAMP WITH TIME ZONE,
            fecha_eliminacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            sensor_data JSONB
          )
        `
      })

      if (eliminadasError) {
        console.error("Error al crear tabla parcelas_eliminadas:", eliminadasError)
        return false
      }
    }

    // Crear la función RPC ejecutar_sql si no existe
    const { error: rpcError } = await supabase.rpc('crear_funcion_ejecutar_sql', {})
    if (rpcError && !rpcError.message.includes('already exists')) {
      console.error("Error al crear función RPC ejecutar_sql:", rpcError)
      // No fallamos aquí, podría ser que la función ya exista
    }

    console.log("Base de datos inicializada correctamente")
    return true
  } catch (error) {
    console.error("Error al inicializar la base de datos:", error)
    return false
  }
}