export interface WeatherData {
    temperatura: number
    humedad: number
    lluvia: number
    sol: number
}

export interface SensorData {
    humedad: number
    temperatura: number
}

export interface Parcela {
    id: number
    nombre: string
    ubicacion: string
    responsable: string
    tipo_cultivo: string
    ultimo_riego: string
    sensor: SensorData
}

export interface ApiResponse {
    sensores: WeatherData
    parcelas: Parcela[]
}

export interface Location {
    id: number
    nombre: string
    latitud?: number
    longitud?: number
}

export interface DatosClima {
    id: number
    temperatura: number
    humedad: number
    lluvia?: number
    sol?: number
    fecha_creacion: string
    id_ubicacion: number
}

export interface DeletedParcela {
    id: number
    nombre: string
    ubicacion: string
    responsable: string
    tipo_cultivo: string
    ultimo_riego: string
    fecha_eliminacion: string
    sensor_data: string
}

// Updated to match the actual database structure
export interface HistoricoSensor {
    id: number
    parcela_id: number // Aseguramos que sea number, no string
    sensor_id: number
    tipo?: string // Añadimos el campo tipo para distinguir entre temperatura y humedad
    valor: number
    timestamp: string
    // The informacion field is optional since it's a join
    informacion?: {
        nombre: string
        id_ubicacion: number
        ubicaciones?: {
            nombre: string
        }
    }
}

export interface PlotInformation {
    id: number
    nombre: string
    id_ubicacion: number
    responsable: string
    id_tipo_cultivo: number
    ultimo_riego: string
    id_sensor: number
    id_datos_ubicacion?: number
    ubicaciones?: {
        nombre: string
    }
    tipos_de_cultivos?: {
        nombre: string
    }
    sensores?: {
        id: number
        nombre: string
        informacion: any
    }
}

export interface DatabaseTables {
    datos_clima: DatosClima[]
    ubicaciones: Location[]
    parcelas_eliminadas: DeletedParcela[]
    historico_sensores: HistoricoSensor[]
    informacion: PlotInformation[]
}

export interface ChartData {
    labels: string[]
    datasets: {
        label: string
        data: number[]
        backgroundColor?: string | string[]
        borderColor?: string
        borderWidth?: number
        fill?: boolean
        tension?: number
    }[]
}