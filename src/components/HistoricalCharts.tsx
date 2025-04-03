"use client"

import type React from "react"
import { useEffect, useState } from "react"
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js"
import { Line } from "react-chartjs-2"
import type { HistoricoSensor, ChartData, DatosClima } from "../types/types"
import { fetchHistoricalSensorData, fetchClimateData } from "../services/dataService"

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
)

const HistoricalCharts: React.FC = () => {
    const [sensorData, setSensorData] = useState<HistoricoSensor[]>([])
    const [climateData, setClimateData] = useState<DatosClima[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                console.log("Fetching historical data for charts...")

                // Fetch both sensor and climate data in parallel
                const [sensorHistory, climateHistory] = await Promise.all([fetchHistoricalSensorData(), fetchClimateData()])

                console.log("Historical sensor data received:", sensorHistory)
                console.log("Historical climate data received:", climateHistory)

                setSensorData(sensorHistory)
                setClimateData(climateHistory)
            } catch (err) {
                console.error("Error fetching historical data:", err)
                setError("Error loading historical data")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) {
        return <div className="chart-loading">Cargando datos históricos...</div>
    }

    if (error) {
        return <div className="chart-error">{error}</div>
    }

    if (!sensorData.length && !climateData.length) {
        return <div className="chart-empty">No hay datos históricos disponibles</div>
    }

    // Process data for charts
    const processDataForCharts = (): {
        humidityChartData: ChartData
        temperatureChartData: ChartData
        otherDataChartData: ChartData
    } => {
        console.log("Processing chart data...")

        // 1. Humidity Chart (from historico_sensores)
        // Filter humidity data
        const humidityData = sensorData.filter((item) => item.tipo === "humedad" || !item.tipo)

        // Get the last 20 records or all if less than 20
        const recentHumidityData = humidityData.slice(-20)

        // Format dates for labels
        const humidityLabels = recentHumidityData.map((item) => {
            const date = new Date(item.timestamp)
            return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${date.getMinutes()}`
        })

        // Humidity values
        const humidityValues = recentHumidityData.map((item) => item.valor)

        // Group by parcela_id
        const parcelaGroups: { [key: number]: { values: number[]; labels: string[] } } = {}

        recentHumidityData.forEach((item) => {
            if (!parcelaGroups[item.parcela_id]) {
                parcelaGroups[item.parcela_id] = { values: [], labels: [] }
            }

            const date = new Date(item.timestamp)
            parcelaGroups[item.parcela_id].values.push(item.valor)
            parcelaGroups[item.parcela_id].labels.push(
                `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${date.getMinutes()}`,
            )
        })

        // Create datasets for each parcela
        const humidityDatasets = Object.keys(parcelaGroups).map((parcelaId, index) => {
            const colors = [
                "rgba(53, 162, 235, 0.5)",
                "rgba(255, 99, 132, 0.5)",
                "rgba(75, 192, 192, 0.5)",
                "rgba(255, 206, 86, 0.5)",
                "rgba(153, 102, 255, 0.5)",
            ]

            return {
                label: `Parcela ${parcelaId}`,
                data: parcelaGroups[Number(parcelaId)].values,
                borderColor: colors[index % colors.length].replace("0.5", "1"),
                backgroundColor: colors[index % colors.length],
                tension: 0.3,
            }
        })

        // If we have grouped data by parcela, use that, otherwise use simple version
        const humidityChartData: ChartData = {
            labels: humidityLabels,
            datasets:
                humidityDatasets.length > 0
                    ? humidityDatasets
                    : [
                        {
                            label: "Humedad del Sensor (%)",
                            data: humidityValues,
                            borderColor: "rgb(53, 162, 235)",
                            backgroundColor: "rgba(53, 162, 235, 0.5)",
                            tension: 0.3,
                        },
                    ],
        }

        // 2. Temperature Chart (from historico_sensores)
        // Filter temperature data
        const temperatureData = sensorData.filter((item) => item.tipo === "temperatura")

        // Get the last 20 records or all if less than 20
        const recentTemperatureData = temperatureData.slice(-20)

        // Format dates for labels
        const temperatureLabels = recentTemperatureData.map((item) => {
            const date = new Date(item.timestamp)
            return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${date.getMinutes()}`
        })

        // Temperature values
        const temperatureValues = recentTemperatureData.map((item) => item.valor)

        // Group by parcela_id for temperature
        const temperatureParcelaGroups: { [key: number]: { values: number[]; labels: string[] } } = {}

        recentTemperatureData.forEach((item) => {
            if (!temperatureParcelaGroups[item.parcela_id]) {
                temperatureParcelaGroups[item.parcela_id] = { values: [], labels: [] }
            }

            const date = new Date(item.timestamp)
            temperatureParcelaGroups[item.parcela_id].values.push(item.valor)
            temperatureParcelaGroups[item.parcela_id].labels.push(
                `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${date.getMinutes()}`,
            )
        })

        // Create datasets for each parcela for temperature
        const temperatureDatasets = Object.keys(temperatureParcelaGroups).map((parcelaId, index) => {
            const colors = [
                "rgba(255, 99, 132, 0.5)",
                "rgba(53, 162, 235, 0.5)",
                "rgba(75, 192, 192, 0.5)",
                "rgba(255, 206, 86, 0.5)",
                "rgba(153, 102, 255, 0.5)",
            ]

            return {
                label: `Parcela ${parcelaId}`,
                data: temperatureParcelaGroups[Number(parcelaId)].values,
                borderColor: colors[index % colors.length].replace("0.5", "1"),
                backgroundColor: colors[index % colors.length],
                tension: 0.3,
            }
        })

        // If we have grouped data by parcela, use that, otherwise use simple version
        const temperatureChartData: ChartData = {
            labels: temperatureLabels,
            datasets:
                temperatureDatasets.length > 0
                    ? temperatureDatasets
                    : [
                        {
                            label: "Temperatura del Sensor (°C)",
                            data: temperatureValues,
                            borderColor: "rgb(255, 99, 132)",
                            backgroundColor: "rgba(255, 99, 132, 0.5)",
                            tension: 0.3,
                        },
                    ],
        }

        // 3. Other Data Chart (from datos_clima)
        const recentClimateData = climateData.slice(-20)

        const climateLabels = recentClimateData.map((item) => {
            const date = new Date(item.fecha_creacion)
            return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${date.getMinutes()}`
        })

        // Create datasets for lluvia and sol
        const otherDataChartData: ChartData = {
            labels: climateLabels,
            datasets: [
                {
                    label: "Lluvia",
                    data: recentClimateData.map((item) => item.lluvia || 0),
                    borderColor: "rgb(75, 192, 192)",
                    backgroundColor: "rgba(75, 192, 192, 0.5)",
                    tension: 0.3,
                },
                {
                    label: "Intensidad del Sol (%)",
                    data: recentClimateData.map((item) => item.sol || 0),
                    borderColor: "rgb(255, 206, 86)",
                    backgroundColor: "rgba(255, 206, 86, 0.5)",
                    tension: 0.3,
                },
            ],
        }

        return { humidityChartData, temperatureChartData, otherDataChartData }
    }

    const { humidityChartData, temperatureChartData, otherDataChartData } = processDataForCharts()

    return (
        <div className="charts-container">
            <div className="chart-wrapper">
                <h3>Temperatura de Sensores (Últimas 20 Mediciones)</h3>
                <div className="chart">
                    <Line
                        data={temperatureChartData}
                        options={{
                            responsive: true,
                            plugins: {
                                legend: {
                                    position: "top" as const,
                                    labels: {
                                        color: "black",
                                        font: {
                                            weight: "bold",
                                        },
                                    },
                                },
                                title: {
                                    display: true,
                                    text: "Evolución de Temperatura",
                                    color: "black",
                                    font: {
                                        weight: "bold",
                                    },
                                },
                            },
                            scales: {
                                y: {
                                    beginAtZero: false,
                                    ticks: {
                                        color: "black",
                                    },
                                    grid: {
                                        color: "rgba(0, 0, 0, 0.1)",
                                    },
                                },
                                x: {
                                    ticks: {
                                        color: "black",
                                    },
                                    grid: {
                                        color: "rgba(0, 0, 0, 0.1)",
                                    },
                                },
                            },
                        }}
                    />
                </div>
            </div>

            <div className="chart-wrapper">
                <h3>Humedad de Sensores (Últimas 20 Mediciones)</h3>
                <div className="chart">
                    <Line
                        data={humidityChartData}
                        options={{
                            responsive: true,
                            plugins: {
                                legend: {
                                    position: "top" as const,
                                    labels: {
                                        color: "black",
                                        font: {
                                            weight: "bold",
                                        },
                                    },
                                },
                                title: {
                                    display: true,
                                    text: "Evolución de Humedad",
                                    color: "black",
                                    font: {
                                        weight: "bold",
                                    },
                                },
                            },
                            scales: {
                                y: {
                                    beginAtZero: false,
                                    ticks: {
                                        color: "black",
                                    },
                                    grid: {
                                        color: "rgba(0, 0, 0, 0.1)",
                                    },
                                },
                                x: {
                                    ticks: {
                                        color: "black",
                                    },
                                    grid: {
                                        color: "rgba(0, 0, 0, 0.1)",
                                    },
                                },
                            },
                        }}
                    />
                </div>
            </div>

            <div className="chart-wrapper">
                <h3>Otros Datos Climáticos (Últimas 20 Mediciones)</h3>
                <div className="chart">
                    <Line
                        data={otherDataChartData}
                        options={{
                            responsive: true,
                            plugins: {
                                legend: {
                                    position: "top" as const,
                                    labels: {
                                        color: "black",
                                        font: {
                                            weight: "bold",
                                        },
                                    },
                                },
                                title: {
                                    display: true,
                                    text: "Lluvia e Intensidad del Sol",
                                    color: "black",
                                    font: {
                                        weight: "bold",
                                    },
                                },
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        color: "black",
                                    },
                                    grid: {
                                        color: "rgba(0, 0, 0, 0.1)",
                                    },
                                },
                                x: {
                                    ticks: {
                                        color: "black",
                                    },
                                    grid: {
                                        color: "rgba(0, 0, 0, 0.1)",
                                    },
                                },
                            },
                        }}
                    />
                </div>
            </div>
        </div>
    )
}

export default HistoricalCharts

