import { supabase } from "../utils/supabaseClient"

export const setupDatabase = async (): Promise<boolean> => {
  try {
    console.log("Verificando y configurando la estructura de la base de datos...")

    // Verificar si las tablas ya existen
    const { data: tables, error: tablesError } = await supabase
      .from("pg_tables")
      .select("tablename")
      .eq("schemaname", "public")

    if (tablesError) {
      console.error("Error al verificar tablas existentes:", tablesError)
      // Intentar crear las tablas de todos modos
    }

    const existingTables = tables ? tables.map((t) => t.tablename) : []

    // Crear tabla de ubicaciones si no existe
    if (!existingTables.includes("ubicaciones")) {
      console.log("Creando tabla ubicaciones...")
      const { error } = await supabase.rpc("create_ubicaciones_table")
      if (error) console.error("Error al crear tabla ubicaciones:", error)
    }

    // Crear tabla de datos_clima si no existe
    if (!existingTables.includes("datos_clima")) {
      console.log("Creando tabla datos_clima...")
      const { error } = await supabase.rpc("create_datos_clima_table")
      if (error) console.error("Error al crear tabla datos_clima:", error)
    }

    // Crear tabla de historico_sensores si no existe
    if (!existingTables.includes("historico_sensores")) {
      console.log("Creando tabla historico_sensores...")
      const { error } = await supabase.rpc("create_historico_sensores_table")
      if (error) console.error("Error al crear tabla historico_sensores:", error)
    }

    // Crear tabla de parcelas_eliminadas si no existe
    if (!existingTables.includes("parcelas_eliminadas")) {
      console.log("Creando tabla parcelas_eliminadas...")
      const { error } = await supabase.rpc("create_parcelas_eliminadas_table")
      if (error) console.error("Error al crear tabla parcelas_eliminadas:", error)
    }

    // Crear tabla de informacion si no existe
    if (!existingTables.includes("informacion")) {
      console.log("Creando tabla informacion...")
      const { error } = await supabase.rpc("create_informacion_table")
      if (error) console.error("Error al crear tabla informacion:", error)
    }

    console.log("Configuración de la base de datos completada")
    return true
  } catch (err) {
    console.error("Error en setupDatabase:", err)
    return false
  }
}

// Función para crear las funciones RPC en Supabase
export const setupDatabaseFunctions = async (): Promise<boolean> => {
  try {
    console.log("Configurando funciones de base de datos...")

    // Crear función para crear tabla ubicaciones
    await supabase.rpc("create_function_create_ubicaciones_table")

    // Crear función para crear tabla datos_clima
    await supabase.rpc("create_function_create_datos_clima_table")

    // Crear función para crear tabla historico_sensores
    await supabase.rpc("create_function_create_historico_sensores_table")

    // Crear función para crear tabla parcelas_eliminadas
    await supabase.rpc("create_function_create_parcelas_eliminadas_table")

    // Crear función para crear tabla informacion
    await supabase.rpc("create_function_create_informacion_table")

    console.log("Funciones de base de datos configuradas correctamente")
    return true
  } catch (err) {
    console.error("Error en setupDatabaseFunctions:", err)
    return false
  }
}

