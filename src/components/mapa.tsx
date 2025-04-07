"use client"

import type React from "react"
import { useEffect, useState, useRef, useCallback } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import logo from "../logo.svg"
import type { ApiResponse, Location, WeatherData, DeletedParcela } from "../types/types"
import WeatherCard from "./WeatherCard"
import { CloudRain, Sun } from "./Icons"
import { fetchApiData, fetchDeletedPlots } from "../services/dataService"
import HistoricalCharts from "./HistoricalCharts"
import DeletedPlots from "./DeletedPlots"

// Importa useAuth y useNavigate
import { useAuth } from "../contexts/AuthContext"
import { useNavigate } from "react-router"

// Set your Mapbox token
const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN || "pk.eyJ1IjoiZnJhbmNpc2NvMTUwODAzIiwiYSI6ImNtODdjdTRoODA3Mmoyam9iM2twODBjN2sifQ.8b_Uf9VFJws6VCRWpQLl5w"
mapboxgl.accessToken = mapboxToken

// Check if token is available and log appropriate message
if (!mapboxToken) {
  console.warn("Mapbox token is missing! Map functionality will be limited.")
} else {
  console.log("Mapbox token is configured:", mapboxToken)
}

// Modifica la definición del componente para incluir useAuth y useNavigate
const Mapa: React.FC = () => {
  const [weatherData, setWeatherData] = useState<WeatherData>({
    temperatura: 0,
    humedad: 0,
    lluvia: 0,
    sol: 0,
  })
  const [locations, setLocations] = useState<Location[]>([])
  const [apiData, setApiData] = useState<ApiResponse | null>(null)
  const [deletedPlots, setDeletedPlots] = useState<DeletedParcela[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<"dashboard" | "charts" | "deleted">("dashboard")
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [initialDataLoaded, setInitialDataLoaded] = useState<boolean>(false)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Verificar si hay usuario
  useEffect(() => {
    if (!user && !loading) {
      console.log("No user detected in Mapa component, redirecting to login")
      navigate("/login")
    }
  }, [user, navigate, loading])

  // Agrega la función handleLogout
  const handleLogout = async () => {
    try {
      console.log("Cerrando sesión...")
      await signOut()
      console.log("Sesión cerrada exitosamente")
      // Forzar la redirección a la página de login
      navigate("/login")
    } catch (err) {
      console.error("Error al cerrar sesión:", err)
      alert("Error al cerrar sesión. Por favor intenta nuevamente.")
    }
  }

  // Función para obtener datos, extraída para poder reutilizarla
  const fetchData = useCallback(async () => {
    try {
      console.log("Actualizando datos...", new Date().toLocaleTimeString())
      setError(null) // Reset error state before fetching

      // Fetch data from API for weather data - this is critical
      const apiResponse = await fetchApiData()

      // Verificar que apiResponse y apiResponse.sensores no sean nulos antes de usarlos
      if (apiResponse && apiResponse.sensores) {
        setApiData(apiResponse)
        setWeatherData(apiResponse.sensores)
        console.log("API data set:", apiResponse)
      } else {
        console.warn("API response or sensores is null/undefined", apiResponse)
        // Establecer datos predeterminados si no hay datos válidos
        setWeatherData({
          temperatura: 0,
          humedad: 0,
          lluvia: 0,
          sol: 0,
        })
      }

      // After critical data is loaded, show the dashboard
      setLoading(false)
      setInitialDataLoaded(true)

      // Load deleted plots
      try {
        const deletedPlotsData = await fetchDeletedPlots()
        setDeletedPlots(deletedPlotsData || [])
      } catch (deletedError) {
        console.error("Error fetching deleted plots:", deletedError)
        // Don't set main error for this, just log it
      }

      // Actualizar la hora de la última actualización
      setLastUpdate(new Date())

      return true
    } catch (err) {
      console.error("Error fetching data:", err)
      // If we haven't shown the dashboard yet, show error
      if (!initialDataLoaded) {
        setLoading(false)
        setError("Error al cargar datos. Por favor, intenta de nuevo más tarde.")
      }
      return false
    }
  }, [initialDataLoaded])

  // Efecto para cargar datos iniciales
  useEffect(() => {
    // Only fetch data if we have a user
    if (user) {
      const initialLoad = async () => {
        setLoading(true)
        setError(null) // Reset error state
        console.log("Carga inicial de datos...")

        // Set a timeout to show the dashboard even if data loading is slow
        const timeout = setTimeout(() => {
          if (loading) {
            console.log("Data loading timeout reached, showing dashboard with default data")
            setLoading(false)
          }
        }, 10000) // Increased timeout to 10 seconds

        try {
          const success = await fetchData()

          if (!success && !initialDataLoaded) {
            setError("Error al cargar datos. Por favor, intenta de nuevo más tarde.")
          }
        } catch (e) {
          console.error("Error in initial data load:", e)
          setError("Error al cargar datos. Por favor, intenta de nuevo más tarde.")
        } finally {
          clearTimeout(timeout)
        }
      }

      initialLoad()
    }
  }, [fetchData, loading, user, initialDataLoaded])

  // Efecto para configurar la actualización periódica
  useEffect(() => {
    // Only set up interval if we have a user
    if (user) {
      // Configurar intervalo para actualizar datos cada 2 minutos
      updateIntervalRef.current = setInterval(
        () => {
          console.log("Ejecutando actualización programada...")
          fetchData()
        },
        2 * 60 * 1000,
      ) // 2 minutos
    }

    // Limpiar intervalo al desmontar
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [fetchData, user])

  // Function to clear all markers from the map
  const clearMarkers = useCallback(() => {
    if (markersRef.current.length > 0) {
      console.log("Clearing existing markers:", markersRef.current.length)
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
    }
  }, [])

  // Function to add all plots to the map (only active plots from API)
  const addPlotsToMap = useCallback(
    (mapInstance: mapboxgl.Map) => {
      console.log("Adding API plots to map")

      // Clear existing markers first
      clearMarkers()

      // Create bounds to fit all markers
      const bounds = new mapboxgl.LngLatBounds()

      // Add active plots from API
      if (apiData && apiData.parcelas && Array.isArray(apiData.parcelas) && apiData.parcelas.length > 0) {
        console.log("Adding active plots to map:", apiData.parcelas.length)

        apiData.parcelas.forEach((plot, index) => {
          // Skip if plot is undefined or missing required properties
          if (!plot || !plot.nombre || !plot.ubicacion) {
            console.warn("Skipping invalid plot:", plot)
            return
          }

          const marker = document.createElement("div")
          marker.className = "marker active-marker"

          // Ensure sensor data exists
          const sensorTemp = plot.sensor?.temperatura !== undefined ? plot.sensor.temperatura : "N/A"
          const sensorHum = plot.sensor?.humedad !== undefined ? plot.sensor.humedad : "N/A"

          // Create popup with plot info
          const popupContent = `
            <div style="font-family: Arial, sans-serif; padding: 5px; color: #000000;">
              <h3 style="margin-top: 0; color: #0052cc; font-size: 16px;">${plot.nombre}</h3>
              <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
                <p><strong>Ubicación:</strong> ${plot.ubicacion}</p>
                <p><strong>Responsable:</strong> ${plot.responsable || "No especificado"}</p>
                <p><strong>Tipo de cultivo:</strong> ${plot.tipo_cultivo || "No especificado"}</p>
                <p><strong>Último riego:</strong> ${plot.ultimo_riego ? new Date(plot.ultimo_riego).toLocaleString() : "No especificado"}</p>
                <p><strong>Temperatura:</strong> ${sensorTemp}°C</p>
                <p><strong>Humedad:</strong> ${sensorHum}%</p>
              </div>
            </div>
          `

          const popup = new mapboxgl.Popup({ offset: 25, maxWidth: "300px" }).setHTML(popupContent)

          // Use random coordinates around Cancun for demonstration
          // Spread the markers out to make them more visible
          const lng = -86.8742 + (Math.random() * 0.04 - 0.02) + index * 0.003
          const lat = 21.0367 + (Math.random() * 0.04 - 0.02) + index * 0.003

          try {
            const mapMarker = new mapboxgl.Marker(marker).setLngLat([lng, lat]).setPopup(popup).addTo(mapInstance)

            // Store marker reference for later removal
            markersRef.current.push(mapMarker)

            // Extend bounds to include this marker
            bounds.extend([lng, lat])
          } catch (err) {
            console.error("Error adding marker for plot:", plot.nombre, err)
          }
        })
      }

      // If no plots were added, just log a message but don't add a default marker
      if (markersRef.current.length === 0) {
        console.log("No plots available from API")
      }

      // Fit map to all markers with padding only if we have markers
      if (!bounds.isEmpty() && markersRef.current.length > 0) {
        try {
          mapInstance.fitBounds(bounds, { padding: 70 })
        } catch (err) {
          console.error("Error fitting bounds:", err)
        }
      } else if (markersRef.current.length === 0) {
        // If no markers, just center on Cancun without adding a marker
        try {
          mapInstance.setCenter([-86.8742, 21.0367])
          mapInstance.setZoom(10)
        } catch (err) {
          console.error("Error centering map:", err)
        }
      }
    },
    [apiData, clearMarkers],
  )

  // Efecto para actualizar el mapa cuando cambian los datos
  useEffect(() => {
    if (loading || activeView !== "dashboard") return

    // Check if Mapbox token is available
    if (!mapboxgl.accessToken || mapboxgl.accessToken === "") {
      console.error("Mapbox token is missing or empty")
      setError("Error: Mapbox token is missing. Please check your environment variables.")
      setLoading(false)
      return
    }

    if (!map.current && mapContainer.current) {
      console.log("Initializing map...")

      try {
        // Initialize map centered on Cancun Airport
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v11",
          center: [-86.8742, 21.0367], // Cancun Airport coordinates
          zoom: 12,
          attributionControl: false,
        })

        // Add error handling for map initialization
        map.current.on("error", (e) => {
          console.error("Mapbox map error:", e.error)
          setError(`Error en el mapa: ${e.error?.message || "Error desconocido"}`)
        })

        map.current.on("load", () => {
          console.log("Map loaded")

          if (map.current) {
            try {
              // Mostrar solo las parcelas activas de la API en el mapa
              addPlotsToMap(map.current)
            } catch (err) {
              console.error("Error adding plots to map:", err)
              setError("Error al añadir parcelas al mapa")
            }
          }
        })
      } catch (e) {
        console.error("Error initializing map:", e)
        setError("Error al inicializar el mapa. Verifica tu token de Mapbox.")
        setLoading(false)
      }
    } else if (map.current) {
      // Si el mapa ya existe y hay nuevos datos, actualizar los marcadores
      console.log("Updating map markers with new data")
      try {
        addPlotsToMap(map.current)
      } catch (err) {
        console.error("Error updating map markers:", err)
      }
    }

    // Clean up on unmount
    return () => {
      if (map.current) {
        try {
          clearMarkers()
          map.current.remove()
        } catch (err) {
          console.error("Error cleaning up map:", err)
        }
        map.current = null
      }
    }
  }, [loading, apiData, activeView, addPlotsToMap, clearMarkers])

  // Función para actualizar datos manualmente
  const handleRefresh = async () => {
    console.log("Actualizando datos manualmente...")
    setError(null) // Reset error state
    await fetchData()
  }

  if (loading) {
    return <div className="loading">Cargando datos...</div>
  }

  if (error) {
    return (
      <div className="error">
        {error}
        <button
          onClick={handleRefresh}
          style={{
            marginTop: "20px",
            padding: "10px 15px",
            background: "rgba(255, 255, 255, 0.2)",
            border: "none",
            borderRadius: "4px",
            color: "white",
            cursor: "pointer",
          }}
        >
          Intentar de nuevo
        </button>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return (
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">Mapa de Parcelas</h2>
              <div className="section-actions">
                <button className="refresh-button" onClick={handleRefresh} title="Actualizar datos">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                </button>
                <div className="last-update">Última actualización: {lastUpdate.toLocaleTimeString()}</div>
              </div>
            </div>

            {!mapboxToken ? (
              <div className="map-error-container" style={{ padding: "20px", textAlign: "center" }}>
                <h3>Error de configuración del mapa</h3>
                <p>No se ha configurado el token de Mapbox. Por favor, verifica tus variables de entorno.</p>
                <p>Asegúrate de que REACT_APP_MAPBOX_TOKEN esté configurado correctamente.</p>
              </div>
            ) : (
              <div id="map" ref={mapContainer} className="map-container"></div>
            )}

            {/* Map legend */}
            <div className="map-legend">
              <div className="legend-item">
                <div className="legend-color legend-active"></div>
                <span>Parcelas Activas</span>
              </div>
            </div>
          </div>
        )
      case "charts":
        return (
          <div className="section">
            <h2 className="section-title">Datos Históricos</h2>
            <HistoricalCharts />
          </div>
        )
      case "deleted":
        return (
          <div className="section">
            <h2 className="section-title">Parcelas Eliminadas</h2>
            <DeletedPlots />
          </div>
        )
    }
  }

  return (
    <div className="app">
      {/* Left sidebar */}
      <div className="sidebar">
        <div className="logo-container">
          <img src={logo || "/placeholder.svg"} className="logo" alt="Logo" />
        </div>
        <nav className="nav">
          <div
            className={`nav-item ${activeView === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveView("dashboard")}
          >
            Dashboard
          </div>
          <div
            className={`nav-item ${activeView === "charts" ? "active" : ""}`}
            onClick={() => setActiveView("charts")}
          >
            Gráficas
          </div>
          <div
            className={`nav-item ${activeView === "deleted" ? "active" : ""}`}
            onClick={() => setActiveView("deleted")}
          >
            Parcelas Eliminadas
          </div>
          <div className="nav-item bottom logout-button" onClick={handleLogout}>
            <span>Cerrar Sesión</span>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="main-content">
        <header className="header">
          <h1>del Sur | Mapa de ubicaciones</h1>
          {user && (
            <div className="user-info">
              <span>Bienvenido, {user.profile?.name || user.email}</span>
            </div>
          )}
        </header>

        <div className="content">{renderContent()}</div>

        <footer className="footer">
          <div className="divider"></div>
          <p>© 2025 MarketinIA - Todos los derechos reservados</p>
        </footer>
      </div>

      {/* Right sidebar for weather cards */}
      <div className="right-sidebar">
        <div className="weather-cards-grid">
          <div className="weather-card-container">
            <WeatherCard title="Temperatura" value={`${weatherData?.temperatura || 0} °C`} />
          </div>
          <div className="weather-card-container">
            <WeatherCard title="Humedad" value={`${weatherData?.humedad || 0}%`} />
          </div>
          <div className="weather-card-container">
            <WeatherCard
              title="Lluvia"
              icon={(weatherData?.lluvia || 0) > 0 ? <CloudRain /> : null}
              value={(weatherData?.lluvia || 0) > 0 ? "Sí" : "No"}
            />
          </div>
          <div className="weather-card-container">
            <WeatherCard title="Intensidad del sol" icon={<Sun />} value={`${weatherData?.sol || 0}%`} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Mapa

