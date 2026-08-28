/** ReportingProvider = de dónde se sacan reportes y métricas (campañas, ventas, redes...). */
export interface PeriodoReporte {
  desde: string;
  hasta: string;
}

export interface SolicitudReporte {
  tipoReporte: string;
  periodo: PeriodoReporte;
}

export interface ReportingProvider {
  generar(solicitud: SolicitudReporte): Promise<Record<string, unknown>>;
  consultarMetricas(tipoMetrica: string, periodo: PeriodoReporte): Promise<Record<string, unknown>>;
}
