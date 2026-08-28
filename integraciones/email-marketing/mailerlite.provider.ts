import type { MCPAdapter } from '../../nucleo/contratos/mcp-adapter.js';
import type { ConsultaRegistro, RecordProvider } from '../registros/interfaz.js';
import type { PeriodoReporte, ReportingProvider, SolicitudReporte } from '../reporting/interfaz.js';

/**
 * MailerLite tiene MCP oficial (mcp.mailerlite.com/mcp) pero en BETA. Los
 * nombres de tools de abajo son la MEJOR HIPÓTESIS a partir de su API
 * pública documentada -- no se pudieron verificar contra un servidor real
 * por falta de credenciales en este entorno.
 *
 * Antes de confiar en esto con datos reales: correr
 * `npx tsx nucleo/cli/inspeccionar-mcp.ts mailerlite` con credenciales
 * reales configuradas, comparar con esta tabla, y corregir aquí si hace falta.
 */
const TOOLS = {
  crearSuscriptor: 'create_subscriber',
  buscarSuscriptor: 'get_subscriber',
  listarCampanias: 'list_campaigns',
  estadisticasCampania: 'get_campaign_stats',
} as const;

export class MailerLiteProvider implements Pick<RecordProvider, 'guardar' | 'consultar'>, ReportingProvider {
  constructor(private readonly mcp: MCPAdapter) {}

  async guardar(_tipoRegistro: string, datos: Record<string, unknown>): Promise<{ id: string }> {
    const resultado = (await this.mcp.ejecutarHerramienta(TOOLS.crearSuscriptor, {
      email: datos.email,
      fields: datos,
    })) as { id?: string | number };
    return { id: String(resultado?.id ?? '') };
  }

  async consultar(consulta: ConsultaRegistro): Promise<Record<string, unknown> | undefined> {
    return (await this.mcp.ejecutarHerramienta(TOOLS.buscarSuscriptor, {
      email: consulta.criterio,
    })) as Record<string, unknown> | undefined;
  }

  async generar(solicitud: SolicitudReporte): Promise<Record<string, unknown>> {
    return (await this.mcp.ejecutarHerramienta(TOOLS.listarCampanias, {
      date_from: solicitud.periodo.desde,
      date_to: solicitud.periodo.hasta,
    })) as Record<string, unknown>;
  }

  async consultarMetricas(tipoMetrica: string, periodo: PeriodoReporte): Promise<Record<string, unknown>> {
    return (await this.mcp.ejecutarHerramienta(TOOLS.estadisticasCampania, {
      campaign_id: tipoMetrica,
      date_from: periodo.desde,
      date_to: periodo.hasta,
    })) as Record<string, unknown>;
  }
}
