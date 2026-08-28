import pg from 'pg';
import type { PeriodoReporte, ReportingProvider, SolicitudReporte } from '../reporting/interfaz.js';
import type { ConsultaRegistro, RecordProvider } from './interfaz.js';

/**
 * Neon es Postgres -- en vez de adivinar el schema de tools de su MCP oficial
 * (incierto, ver mismo caveat que MailerLite/Klaviyo/GoHighLevel), esta
 * implementación usa el driver estándar de Postgres (`pg`) directo contra el
 * connection string. Es el protocolo mejor documentado que existe, así que
 * aquí SÍ hay alta confianza en que esto funciona tal cual está escrito.
 *
 * "Construir algo sobre Neon" significa justamente esto: no hay una API de
 * "CRM" en Neon, así que definimos nuestro propio esquema mínimo
 * (neon.schema.sql, aplicado con nucleo/cli/preparar-neon.ts) y lo
 * exponemos con las mismas Capacidades que ya usa Notion.
 */

export interface Ejecutor {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

/** Ejecutor real sobre `pg`, usado en producción. Los tests inyectan uno falso en su lugar. */
export class EjecutorPg implements Ejecutor {
  private readonly pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  }

  async query(sql: string, params: unknown[] = []): Promise<{ rows: Record<string, unknown>[] }> {
    const resultado = await this.pool.query(sql, params);
    return { rows: resultado.rows };
  }
}

export class NeonProvider implements RecordProvider, ReportingProvider {
  constructor(private readonly ejecutor: Ejecutor) {}

  async guardar(tipoRegistro: string, datos: Record<string, unknown>): Promise<{ id: string }> {
    const criterio = (datos.criterio ?? datos.nombre ?? datos.email ?? null) as string | null;
    const referencia = (datos.referencia ?? null) as string | null;
    const resultado = await this.ejecutor.query(
      'INSERT INTO registros (tipo, criterio, referencia, datos) VALUES ($1, $2, $3, $4) RETURNING id',
      [tipoRegistro, criterio, referencia, JSON.stringify(datos)],
    );
    return { id: String((resultado.rows[0] as { id: number }).id) };
  }

  async consultar(consulta: ConsultaRegistro): Promise<Record<string, unknown> | undefined> {
    const resultado = await this.ejecutor.query(
      'SELECT * FROM registros WHERE tipo = $1 AND criterio = $2 ORDER BY creado_en DESC LIMIT 1',
      [consulta.tipo, consulta.criterio],
    );
    return resultado.rows[0];
  }

  async buscarHistorial(
    tipoRegistro: string,
    referencia: string,
    cantidad: number,
  ): Promise<Record<string, unknown>[]> {
    const resultado = await this.ejecutor.query(
      'SELECT * FROM registros WHERE tipo = $1 AND referencia = $2 ORDER BY creado_en DESC LIMIT $3',
      [tipoRegistro, referencia, cantidad],
    );
    return resultado.rows;
  }

  async generar(solicitud: SolicitudReporte): Promise<Record<string, unknown>> {
    const resultado = await this.ejecutor.query(
      `SELECT tipo, COUNT(*) AS total FROM registros
       WHERE creado_en BETWEEN $1 AND $2 GROUP BY tipo ORDER BY tipo`,
      [solicitud.periodo.desde, solicitud.periodo.hasta],
    );
    return { tipoReporte: solicitud.tipoReporte, filas: resultado.rows };
  }

  async consultarMetricas(tipoMetrica: string, periodo: PeriodoReporte): Promise<Record<string, unknown>> {
    const resultado = await this.ejecutor.query(
      'SELECT COUNT(*) AS total FROM registros WHERE tipo = $1 AND creado_en BETWEEN $2 AND $3',
      [tipoMetrica, periodo.desde, periodo.hasta],
    );
    const fila = resultado.rows[0] as { total?: string } | undefined;
    return { tipoMetrica, total: Number(fila?.total ?? 0) };
  }
}
