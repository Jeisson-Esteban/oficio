/**
 * RecordProvider = donde el profesional guarda fichas/registros (Notion,
 * Airtable, Google Sheets...). La lógica de negocio y los Procesos solo
 * conocen esto -- nunca el nombre de la Herramienta concreta detrás.
 */
export interface ConsultaRegistro {
  tipo: string;
  criterio: string;
}

export interface RecordProvider {
  guardar(tipoRegistro: string, datos: Record<string, unknown>): Promise<{ id: string }>;
  consultar(consulta: ConsultaRegistro): Promise<Record<string, unknown> | undefined>;
  buscarHistorial(tipoRegistro: string, referencia: string, cantidad: number): Promise<Record<string, unknown>[]>;
}
