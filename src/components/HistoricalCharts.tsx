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
import { Line, Bar } from "react-chartjs-2"
import type { HistoricoSensor, ChartData, DatosClima, PlotInformation } from "../types/types"
import { fetchHistoricalSensorData, fetchClimateData, fetchActivePlots } from "../services/dataService"

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
    const [activePlots, setActivePlots] = useState<PlotInformation[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                console.log("Fetching historical data for charts...")

                // Fetch all data types in parallel
                const [sensorHistory, climateHistory, plotsData] = await Promise.all([
                    fetchHistoricalSensorData(),
                    fetchClimateData(),
                    fetchActivePlots(),
                ])

                console.log("Historical sensor data received:", sensorHistory)
                console.log("Historical climate data received:", climateHistory)
                console.log("Active plots data received:", plotsData)

                setSensorData(sensorHistory || [])
                setClimateData(climateHistory || [])
                setActivePlots(plotsData || [])
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
        combinedChartData: ChartData
    } => {
        console.log("Processing chart data...")

        // 1. Humidity Chart (from historico_sensores)
        // Filter humidity data
        const humidityData = sensorData.filter((item) => item.tipo === "humedad")

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
        const parcelaGroups: { [key: number]: { values: number[]; labels: string[]; name: string } } = {}

        recentHumidityData.forEach((item) => {
            if (!parcelaGroups[item.parcela_id]) {
                // Find plot name if available
                let plotName = `Parcela ${item.parcela_id}`
                const plot = activePlots.find((p) => p.id === item.parcela_id)
                if (plot) {
                    plotName = plot.nombre
                }

                parcelaGroups[item.parcela_id] = {
                    values: [],
                    labels: [],
                    name: plotName,
                }
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
                label: parcelaGroups[Number(parcelaId)].name,
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
        const temperatureParcelaGroups: { [key: number]: { values: number[]; labels: string[]; name: string } } = {}

        recentTemperatureData.forEach((item) => {
            if (!temperatureParcelaGroups[item.parcela_id]) {
                // Find plot name if available
                let plotName = `Parcela ${item.parcela_id}`
                const plot = activePlots.find((p) => p.id === item.parcela_id)
                if (plot) {
                    plotName = plot.nombre
                }

                temperatureParcelaGroups[item.parcela_id] = {
                    values: [],
                    labels: [],
                    name: plotName,
                }
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
                label: temperatureParcelaGroups[Number(parcelaId)].name,
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

        // 3. Combined Chart (temperatura y humedad)
        // Get the last 20 records of climate data
        const recentClimateData = climateData.slice(-20)

        const climateLabels = recentClimateData.map((item) => {
            const date = new Date(item.fecha_creacion)
            return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${date.getMinutes()}`
        })

        // Create datasets for temperatura and humedad
        const combinedChartData: ChartData = {
            labels: climateLabels,
            datasets: [
                {
                    label: "Temperatura (°C)",
                    data: recentClimateData.map((item) => item.temperatura),
                    borderColor: "rgb(255, 99, 132)",
                    backgroundColor: "rgba(255, 99, 132, 0.5)",
                    tension: 0.3,
                },
                {
                    label: "Humedad (%)",
                    data: recentClimateData.map((item) => item.humedad),
                    borderColor: "rgb(53, 162, 235)",
                    backgroundColor: "rgba(53, 162, 235, 0.5)",
                    tension: 0.3,
                },
            ],
        }

        return { humidityChartData, temperatureChartData, combinedChartData }
    }

    const { temperatureChartData, humidityChartData, combinedChartData } = processDataForCharts()

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
                <h3>Temperatura y Humedad Combinadas</h3>
                <div className="chart">
                    <Bar
                        data={combinedChartData}
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
                                    text: "Comparativa de Temperatura y Humedad",
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
        </div>
    )
}

export default HistoricalCharts

