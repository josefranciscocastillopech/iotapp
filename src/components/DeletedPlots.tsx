"use client"

import type React from "react"
import { useEffect, useState } from "react"
import type { DeletedParcela } from "../types/types"
import { fetchDeletedPlots } from "../services/dataService"

const DeletedPlots: React.FC = () => {
    const [deletedPlots, setDeletedPlots] = useState<DeletedParcela[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                console.log("Fetching deleted plots...")
                const data = await fetchDeletedPlots()
                console.log("Deleted plots received:", data)
                setDeletedPlots(data)
            } catch (err) {
                console.error("Error fetching deleted plots:", err)
                setError("Error loading deleted plots")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) {
        return <div className="deleted-loading">Cargando parcelas eliminadas...</div>
    }

    if (error) {
        return <div className="deleted-error">{error}</div>
    }

    if (!deletedPlots.length) {
        return <div className="deleted-empty">No hay parcelas eliminadas</div>
    }

    // Parse sensor data
    const parseSensorData = (sensorDataStr: string | null) => {
        if (!sensorDataStr) return { temperatura: "N/A", humedad: "N/A" }

        try {
            return JSON.parse(sensorDataStr)
        } catch (e) {
            console.error("Error parsing sensor data:", e)
            return { temperatura: "N/A", humedad: "N/A" }
        }
    }

    // Format date
    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr)
            return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`
        } catch (e) {
            console.error("Error formatting date:", e)
            return "Fecha desconocida"
        }
    }

    return (
        <div className="deleted-plots-container">
            {!deletedPlots.length ? (
                <div className="deleted-empty">No hay parcelas eliminadas</div>
            ) : (
                <div className="deleted-plots-grid">
                    {deletedPlots.map((plot) => {
                        const sensorData = parseSensorData(plot.sensor_data)

                        return (
                            <div key={plot.id} className="deleted-plot-card">
                                <h3>{plot.nombre}</h3>
                                <div className="deleted-plot-details">
                                    <p>
                                        <strong>Ubicación:</strong> {plot.ubicacion}
                                    </p>
                                    <p>
                                        <strong>Responsable:</strong> {plot.responsable}
                                    </p>
                                    <p>
                                        <strong>Tipo de cultivo:</strong> {plot.tipo_cultivo}
                                    </p>
                                    <p>
                                        <strong>Último riego:</strong> {formatDate(plot.ultimo_riego)}
                                    </p>
                                    <p>
                                        <strong>Fecha de eliminación:</strong> {formatDate(plot.fecha_eliminacion)}
                                    </p>

                                    <div className="deleted-plot-sensor">
                                        <h4>Últimos datos del sensor:</h4>
                                        <p>
                                            <strong>Temperatura:</strong> {sensorData.temperatura}°C
                                        </p>
                                        <p>
                                            <strong>Humedad:</strong> {sensorData.humedad}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default DeletedPlots

