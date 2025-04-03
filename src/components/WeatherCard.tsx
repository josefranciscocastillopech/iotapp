import type React from "react"
import type { ReactNode } from "react"

interface WeatherCardProps {
    title: string
    value?: string
    icon?: ReactNode
}

const WeatherCard: React.FC<WeatherCardProps> = ({ title, value, icon }) => {
    return (
        <div className="weather-card">
            <div className="weather-card-title">{title}</div>
            {value && <div className="weather-card-value">{value}</div>}
            {icon && <div className="weather-card-icon">{icon}</div>}
        </div>
    )
}

export default WeatherCard

