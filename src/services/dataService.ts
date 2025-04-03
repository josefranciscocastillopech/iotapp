import { supabase } from "../utils/supabaseClient"
import type {
    ApiResponse,
    DatabaseTables,
    Location,
    HistoricoSensor,
    PlotInformation,
    Parcela,
    DeletedParcela,
} from "../types/types"

// Add a timeout to the API fetch
export const fetchApiData = async (): Promise<ApiResponse> => {
    try {
        console.log("Fetching API data from updated endpoint...")

        // Create a promise that rejects after 5 seconds
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("API request timed out")), 5000)
        })

        // Race the fetch against the timeout
        const response = (await Promise.race([fetch("https://moriahmkt.com/iotapp/updated/"), timeoutPromise])) as Response

        if (!response.ok) {
            throw new Error("Network response was not ok")
        }

        const data = await response.json()
        console.log("API data fetched successfully:", data)

        // Automatically save the data to Supabase
        await saveApiDataToSupabase(data)

        return data
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

// Fetch locations from Supabase
export const fetchLocations = async (): Promise<Location[]> => {
    try {
        console.log("Fetching locations...")
        const { data, error } = await supabase.from("ubicaciones").select("*")

        if (error) {
            console.error("Supabase error fetching locations:", error)
            throw error
        }

        console.log("Locations fetched successfully:", data)
        return data || []
    } catch (error) {
        console.error("Error fetching locations:", error)
        return []
    }
}

// Enhanced function to save API data to Supabase
export const saveApiDataToSupabase = async (apiResponse: ApiResponse) => {
    try {
        console.log("Saving API data to Supabase...")

        // 1. Check if any deleted plots have reappeared in the API
        await checkForReappearedPlots(apiResponse.parcelas)

        // 2. Save climate data (sensores)
        const { sensores } = apiResponse

        // Get or create a default location
        let locationId = 1 // Default location ID

        const { data: locationData, error: locationError } = await supabase
            .from("ubicaciones")
            .select("id")
            .limit(1)
            .single()

        if (locationError) {
            console.log("No existing location found, creating default location")
            const { data: newLocation, error: createLocationError } = await supabase
                .from("ubicaciones")
                .insert([
                    {
                        nombre: "Zona Sur",
                        latitud: 21.0367,
                        longitud: -86.8742,
                    },
                ])
                .select("id")
                .single()

            if (createLocationError) {
                console.error("Error creating default location:", createLocationError)
            } else if (newLocation) {
                locationId = newLocation.id
                console.log("Created default location with ID:", locationId)
            }
        } else if (locationData) {
            locationId = locationData.id
        }

        // Save ALL climate data including temperatura, humedad, lluvia, and sol
        const { error: climateError } = await supabase.from("datos_clima").insert([
            {
                temperatura: sensores.temperatura,
                humedad: sensores.humedad,
                lluvia: sensores.lluvia || 0,
                sol: sensores.sol || 0,
                fecha_creacion: new Date().toISOString(),
                id_ubicacion: locationId,
            },
        ])

        if (climateError) {
            console.error("Supabase error saving climate data:", climateError)
        } else {
            console.log("Climate data saved successfully.")
        }

        // 3. Save plots information
        for (const parcela of apiResponse.parcelas) {
            // Check if the plot already exists
            const { data: existingPlot, error: checkError } = await supabase
                .from("informacion")
                .select("id")
                .eq("id", parcela.id)
                .single()

            if (checkError && checkError.code !== "PGRST116") {
                console.error(`Error checking if plot ${parcela.id} exists:`, checkError)
                continue
            }

            // Get or create crop type
            let cropTypeId = 1 // Default crop type ID
            const { data: cropType, error: cropTypeError } = await supabase
                .from("tipos_de_cultivos")
                .select("id")
                .eq("nombre", parcela.tipo_cultivo)
                .single()

            if (cropTypeError) {
                console.log(`Crop type '${parcela.tipo_cultivo}' not found, creating it`)
                const { data: newCropType, error: createCropTypeError } = await supabase
                    .from("tipos_de_cultivos")
                    .insert([
                        {
                            nombre: parcela.tipo_cultivo,
                        },
                    ])
                    .select("id")
                    .single()

                if (createCropTypeError) {
                    console.error("Error creating crop type:", createCropTypeError)
                } else if (newCropType) {
                    cropTypeId = newCropType.id
                    console.log(`Created crop type '${parcela.tipo_cultivo}' with ID:`, cropTypeId)
                }
            } else if (cropType) {
                cropTypeId = cropType.id
            }

            // Get or create sensor
            let sensorId = 1 // Default sensor ID
            const { data: sensor, error: sensorError } = await supabase
                .from("sensores")
                .select("id")
                .eq("nombre", `Sensor ${parcela.nombre}`)
                .single()

            if (sensorError) {
                console.log(`Sensor for '${parcela.nombre}' not found, creating it`)
                const { data: newSensor, error: createSensorError } = await supabase
                    .from("sensores")
                    .insert([
                        {
                            nombre: `Sensor ${parcela.nombre}`,
                            informacion: parcela.sensor,
                        },
                    ])
                    .select("id")
                    .single()

                if (createSensorError) {
                    console.error("Error creating sensor:", createSensorError)
                } else if (newSensor) {
                    sensorId = newSensor.id
                    console.log(`Created sensor for '${parcela.nombre}' with ID:`, sensorId)
                }
            } else if (sensor) {
                sensorId = sensor.id

                // Update sensor information
                const { error: updateSensorError } = await supabase
                    .from("sensores")
                    .update({
                        informacion: parcela.sensor,
                    })
                    .eq("id", sensorId)

                if (updateSensorError) {
                    console.error("Error updating sensor information:", updateSensorError)
                } else {
                    console.log(`Updated sensor information for ID ${sensorId}`)
                }
            }

            // Save historical sensor data - save both temperature and humidity
            const { error: historicalTempError } = await supabase.from("historico_sensores").insert([
                {
                    parcela_id: parcela.id,
                    sensor_id: sensorId,
                    tipo: "temperatura",
                    valor: parcela.sensor.temperatura,
                    timestamp: new Date().toISOString(),
                },
            ])

            if (historicalTempError) {
                console.error("Error saving historical temperature data:", historicalTempError)
            } else {
                console.log(`Saved historical temperature data for plot ${parcela.id}`)
            }

            const { error: historicalHumError } = await supabase.from("historico_sensores").insert([
                {
                    parcela_id: parcela.id,
                    sensor_id: sensorId,
                    tipo: "humedad",
                    valor: parcela.sensor.humedad,
                    timestamp: new Date().toISOString(),
                },
            ])

            if (historicalHumError) {
                console.error("Error saving historical humidity data:", historicalHumError)
            } else {
                console.log(`Saved historical humidity data for plot ${parcela.id}`)
            }

            // Get or create location for this plot
            let plotLocationId = locationId
            const { data: plotLocation, error: plotLocationError } = await supabase
                .from("ubicaciones")
                .select("id")
                .eq("nombre", parcela.ubicacion)
                .single()

            if (plotLocationError) {
                console.log(`Location '${parcela.ubicacion}' not found, creating it`)
                const { data: newLocation, error: createLocationError } = await supabase
                    .from("ubicaciones")
                    .insert([
                        {
                            nombre: parcela.ubicacion,
                            latitud: 21.0367 + (Math.random() * 0.02 - 0.01), // Random coordinates near Cancun
                            longitud: -86.8742 + (Math.random() * 0.02 - 0.01),
                        },
                    ])
                    .select("id")
                    .single()

                if (createLocationError) {
                    console.error("Error creating location:", createLocationError)
                } else if (newLocation) {
                    plotLocationId = newLocation.id
                    console.log(`Created location '${parcela.ubicacion}' with ID:`, plotLocationId)
                }
            } else if (plotLocation) {
                plotLocationId = plotLocation.id
            }

            // If plot exists, update it; otherwise, insert it
            if (existingPlot) {
                const { error: updateError } = await supabase
                    .from("informacion")
                    .update({
                        nombre: parcela.nombre,
                        id_ubicacion: plotLocationId,
                        responsable: parcela.responsable,
                        id_tipo_cultivo: cropTypeId,
                        ultimo_riego: parcela.ultimo_riego,
                        id_sensor: sensorId,
                    })
                    .eq("id", parcela.id)

                if (updateError) {
                    console.error(`Error updating plot ${parcela.id}:`, updateError)
                } else {
                    console.log(`Plot ${parcela.id} (${parcela.nombre}) updated successfully.`)
                }
            } else {
                const { error: insertError } = await supabase.from("informacion").insert([
                    {
                        id: parcela.id,
                        nombre: parcela.nombre,
                        id_ubicacion: plotLocationId,
                        responsable: parcela.responsable,
                        id_tipo_cultivo: cropTypeId,
                        ultimo_riego: parcela.ultimo_riego,
                        id_sensor: sensorId,
                    },
                ])

                if (insertError) {
                    console.error(`Error inserting plot ${parcela.id}:`, insertError)
                } else {
                    console.log(`Plot ${parcela.id} (${parcela.nombre}) inserted successfully.`)
                }
            }
        }

        // 4. Check for deleted plots
        await checkAndSaveDeletedPlots(apiResponse.parcelas)

        console.log("API data saved to Supabase successfully.")
    } catch (error) {
        console.error("Error saving API data to Supabase:", error)
    }
}

// Fetch climate data from Supabase
export const fetchClimateData = async (): Promise<DatabaseTables["datos_clima"]> => {
    try {
        console.log("Fetching climate data...")
        const { data, error } = await supabase
            .from("datos_clima")
            .select("*")
            .order("fecha_creacion", { ascending: false })
            .limit(50) // Aumentamos el límite para tener más datos para las gráficas

        if (error) {
            console.error("Supabase error fetching climate data:", error)
            throw error
        }

        console.log("Climate data fetched successfully:", data)
        return data || []
    } catch (error) {
        console.error("Error fetching climate data:", error)
        return []
    }
}

// Fetch historical sensor data
export const fetchHistoricalSensorData = async (): Promise<HistoricoSensor[]> => {
    try {
        console.log("Fetching historical sensor data...")
        // Use a simpler query that matches your database schema
        const { data, error } = await supabase
            .from("historico_sensores")
            .select(`
        id,
        parcela_id,
        sensor_id,
        tipo,
        valor,
        timestamp
      `)
            .order("timestamp", { ascending: false })
            .limit(100)

        if (error) {
            console.error("Supabase error fetching historical sensor data:", error)
            throw error
        }

        console.log("Historical sensor data fetched successfully:", data)
        return data || []
    } catch (error) {
        console.error("Error fetching historical sensor data:", error)
        return []
    }
}

// Fetch deleted plots
export const fetchDeletedPlotsForDashboard = async () => {
    try {
        console.log("Fetching deleted plots...")
        const { data, error } = await supabase
            .from("parcelas_eliminadas")
            .select("*")
            .order("fecha_eliminacion", { ascending: false })

        if (error) {
            console.error("Supabase error fetching deleted plots:", error)
            throw error
        }

        console.log("Deleted plots fetched successfully:", data)
        return data || []
    } catch (error) {
        console.error("Error fetching deleted plots:", error)
        return []
    }
}

// Fetch all plots information
export const fetchPlotsInformation = async (): Promise<PlotInformation[]> => {
    try {
        console.log("Fetching plots information...")
        const { data, error } = await supabase.from("informacion").select(`
        *,
        ubicaciones:id_ubicacion(nombre),
        tipos_de_cultivos:id_tipo_cultivo(nombre),
        sensores:id_sensor(*)
      `)

        if (error) {
            console.error("Supabase error fetching plots information:", error)
            throw error
        }

        console.log("Plots information fetched successfully:", data)
        return data || []
    } catch (error) {
        console.error("Error fetching plots information:", error)
        return []
    }
}

// Función para verificar si parcelas eliminadas han reaparecido en la API
export const checkForReappearedPlots = async (apiParcelas: Parcela[]): Promise<void> => {
    try {
        console.log("Verificando si alguna parcela eliminada ha reaparecido...")

        // Obtener todas las parcelas eliminadas
        const { data: deletedPlots, error } = await supabase.from("parcelas_eliminadas").select("*")

        if (error) {
            console.error("Error al obtener parcelas eliminadas:", error)
            return
        }

        if (!deletedPlots || deletedPlots.length === 0) {
            console.log("No hay parcelas eliminadas para verificar")
            return
        }

        // Crear un mapa de nombres de parcelas de la API para búsqueda rápida
        const apiParcelasMap = new Map<string, Parcela>()
        apiParcelas.forEach((parcela) => {
            apiParcelasMap.set(parcela.nombre, parcela)
        })

        // Buscar parcelas eliminadas que hayan reaparecido en la API
        let reappearedPlotsCount = 0

        for (const deletedPlot of deletedPlots) {
            // Buscar si hay alguna parcela en la API con el mismo nombre
            const matchingApiParcela = apiParcelasMap.get(deletedPlot.nombre)

            if (matchingApiParcela) {
                console.log(`Parcela "${deletedPlot.nombre}" ha reaparecido en la API, eliminando de parcelas_eliminadas`)

                // Eliminar de parcelas_eliminadas
                const { error: deleteError } = await supabase.from("parcelas_eliminadas").delete().eq("id", deletedPlot.id)

                if (deleteError) {
                    console.error(`Error al eliminar parcela reaparecida "${deletedPlot.nombre}":`, deleteError)
                } else {
                    reappearedPlotsCount++
                }
            }
        }

        if (reappearedPlotsCount > 0) {
            console.log(`Se encontraron ${reappearedPlotsCount} parcelas que reaparecieron en la API`)
        } else {
            console.log("No se encontraron parcelas reaparecidas")
        }
    } catch (error) {
        console.error("Error al verificar parcelas reaparecidas:", error)
    }
}

// Función para guardar una parcela en parcelas_eliminadas
const savePlotToDeletedPlots = async (parcela: Parcela): Promise<boolean> => {
    try {
        console.log("Guardando parcela en parcelas_eliminadas:", parcela.nombre)

        // Crear objeto para la tabla parcelas_eliminadas
        const deletedParcela: Omit<DeletedParcela, "id"> = {
            nombre: parcela.nombre,
            ubicacion: parcela.ubicacion,
            responsable: parcela.responsable,
            tipo_cultivo: parcela.tipo_cultivo,
            ultimo_riego: parcela.ultimo_riego,
            fecha_eliminacion: new Date().toISOString(),
            sensor_data: JSON.stringify(parcela.sensor),
        }

        // Guardar en la tabla parcelas_eliminadas
        const { error: insertError } = await supabase.from("parcelas_eliminadas").insert([deletedParcela])

        if (insertError) {
            console.error("Error al guardar parcela eliminada:", insertError)
            throw insertError
        }

        console.log("Parcela guardada en parcelas_eliminadas:", parcela.nombre)
        return true
    } catch (error) {
        console.error("Error completo al guardar parcela eliminada:", error)
        return false
    }
}

// Función para obtener las parcelas guardadas previamente
const getPreviouslySavedPlots = async (): Promise<PlotInformation[]> => {
    try {
        const { data, error } = await supabase.from("informacion").select("*")

        if (error) {
            console.error("Error al obtener parcelas guardadas:", error)
            throw error
        }

        return data || []
    } catch (error) {
        console.error("Error completo al obtener parcelas guardadas:", error)
        return []
    }
}

// Función para verificar y guardar parcelas eliminadas
export const checkAndSaveDeletedPlots = async (apiParcelas: Parcela[]): Promise<DeletedParcela[]> => {
    try {
        console.log("Verificando parcelas eliminadas...")

        // Obtener parcelas guardadas previamente
        const savedPlots = await getPreviouslySavedPlots()

        if (savedPlots.length === 0) {
            console.log("No hay parcelas guardadas previamente para comparar")
            return []
        }

        // Crear un mapa de IDs de parcelas de la API para búsqueda rápida
        const apiParcelasIds = new Set(apiParcelas.map((p) => p.id))

        // Encontrar parcelas que ya no están en la API
        const deletedPlots = savedPlots.filter((plot) => !apiParcelasIds.has(plot.id))

        console.log(`Encontradas ${deletedPlots.length} parcelas eliminadas`)

        // Guardar cada parcela eliminada
        const savedDeletedPlots: DeletedParcela[] = []

        for (const plot of deletedPlots) {
            // Obtener información adicional para la parcela
            const { data: locationData } = await supabase
                .from("ubicaciones")
                .select("nombre")
                .eq("id", plot.id_ubicacion)
                .single()

            const { data: cropTypeData } = await supabase
                .from("tipos_de_cultivos")
                .select("nombre")
                .eq("id", plot.id_tipo_cultivo)
                .single()

            const { data: sensorData } = await supabase
                .from("sensores")
                .select("informacion")
                .eq("id", plot.id_sensor)
                .single()

            // Convertir PlotInformation a Parcela para guardarla
            const parcela: Parcela = {
                id: plot.id,
                nombre: plot.nombre,
                ubicacion: locationData?.nombre || "Desconocido",
                responsable: plot.responsable,
                tipo_cultivo: cropTypeData?.nombre || "Desconocido",
                ultimo_riego: plot.ultimo_riego,
                sensor: sensorData?.informacion || {
                    temperatura: 0,
                    humedad: 0,
                },
            }

            // Verificar si ya existe en parcelas_eliminadas
            const { data: existingData } = await supabase
                .from("parcelas_eliminadas")
                .select("id")
                .eq("nombre", parcela.nombre)
                .limit(1)

            if (existingData && existingData.length > 0) {
                console.log(`Parcela ${parcela.nombre} ya está en parcelas_eliminadas`)
                continue
            }

            // Guardar en parcelas_eliminadas
            const success = await savePlotToDeletedPlots(parcela)

            if (success) {
                // Obtener la parcela guardada con su ID
                const { data: newlyDeletedPlot } = await supabase
                    .from("parcelas_eliminadas")
                    .select("*")
                    .eq("nombre", parcela.nombre)
                    .order("fecha_eliminacion", { ascending: false })
                    .limit(1)
                    .single()

                if (newlyDeletedPlot) {
                    savedDeletedPlots.push(newlyDeletedPlot)
                }
            }
        }

        // Obtener todas las parcelas eliminadas para devolver
        const { data: allDeletedPlots } = await supabase
            .from("parcelas_eliminadas")
            .select("*")
            .order("fecha_eliminacion", { ascending: false })

        return allDeletedPlots || []
    } catch (error) {
        console.error("Error al verificar parcelas eliminadas:", error)
        return []
    }
}

// Fetch deleted plots
export const fetchDeletedPlots = async (): Promise<DeletedParcela[]> => {
    try {
        console.log("Fetching deleted plots...")
        const { data, error } = await supabase
            .from("parcelas_eliminadas")
            .select("*")
            .order("fecha_eliminacion", { ascending: false })

        if (error) {
            console.error("Supabase error fetching deleted plots:", error)
            throw error
        }

        console.log("Deleted plots fetched successfully:", data)
        return data || []
    } catch (error) {
        console.error("Error fetching deleted plots:", error)
        return []
    }
}

