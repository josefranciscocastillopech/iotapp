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

        setSensorData(sensorHistory || [])
        setClimateData(climateHistory || [])
      } catch (err) {
        console.error("Error fetching historical data:", err)
        setError("Error loading historical data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div className="chart-loading">Cargando datos históricos...</div>
  if (error) return <div className="chart-error">{error}</div>
  if (!sensorData.length && !climateData.length) return <div className="chart-empty">No hay datos históricos disponibles</div>

  // Function to process data for charts
  const processDataForCharts = (): { humidityChartData: ChartData; temperatureChartData: ChartData; combinedChartData: ChartData } => {
    console.log("Processing chart data...")

    const processSensorData = (tipo: string) => {
      const filteredData = sensorData.filter((item) => item.tipo === tipo).slice(-20)
      return {
        labels: filteredData.map((item) => new Date(item.timestamp).toLocaleString()),
        values: filteredData.map((item) => item.valor),
      }
    }

    const { labels: humidityLabels, values: humidityValues } = processSensorData("humedad")
    const { labels: temperatureLabels, values: temperatureValues } = processSensorData("temperatura")

    const humidityChartData: ChartData = {
      labels: humidityLabels,
      datasets: [
        {
          label: "Humedad del Sensor (%)",
          data: humidityValues,
          borderColor: "rgb(53, 162, 235)",
          backgroundColor: "rgba(53, 162, 235, 0.5)",
          tension: 0.3,
        },
      ],
    }

    const temperatureChartData: ChartData = {
      labels: temperatureLabels,
      datasets: [
        {
          label: "Temperatura del Sensor (°C)",
          data: temperatureValues,
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          tension: 0.3,
        },
      ],
    }

    const recentClimateData = climateData.slice(-20)
    const combinedChartData: ChartData = {
      labels: recentClimateData.map((item) => new Date(item.fecha_creacion).toLocaleString()),
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
      {[{ title: "Temperatura de Sensores", data: temperatureChartData }, { title: "Humedad de Sensores", data: humidityChartData }].map(({ title, data }, index) => (
        <div key={index} className="chart-wrapper">
          <h3>{title} (Últimas 20 Mediciones)</h3>
          <div className="chart">
            <Line data={data} options={{ responsive: true, plugins: { legend: { position: "top" }, title: { display: true, text: title } } }} />
          </div>
        </div>
      ))}

      <div className="chart-wrapper">
        <h3>Temperatura y Humedad Combinadas</h3>
        <div className="chart">
          <Bar data={combinedChartData} options={{ responsive: true, plugins: { legend: { position: "top" }, title: { display: true, text: "Comparativa de Temperatura y Humedad" } } }} />
        </div>
      </div>
    </div>
  )
}

export default HistoricalCharts
