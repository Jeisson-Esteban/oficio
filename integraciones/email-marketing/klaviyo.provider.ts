import type { MCPAdapter } from '../../nucleo/contratos/mcp-adapter.js';
import type { ConsultaRegistro, RecordProvider } from '../registros/interfaz.js';
import type { PeriodoReporte, ReportingProvider, SolicitudReporte } from '../reporting/interfaz.js';

/**
 * Klaviyo tiene MCP oficial GA (mcp.klaviyo.com/mcp). Los nombres de tools
 * de abajo son la MEJOR HIPÓTESIS a partir de su API pública documentada
 * (profiles, campaigns) -- no verificados contra un servidor real por falta
 * de credenciales en este entorno.
 *
 * Antes de confiar en esto con datos reales: correr
 * `npx tsx nucleo/cli/inspeccionar-mcp.ts klaviyo` con credenciales reales
 * configuradas, comparar con esta tabla, y corregir aquí si hace falta.
 */
const TOOLS = {
  crearOActualizarPerfil: 'create_or_update_profile',
  buscarPerfil: 'get_profile',
  listarCampanias: 'get_campaigns',
  metricasCampania: 'get_campaign_metrics',
} as const;

export class KlaviyoProvider implements Pick<RecordProvider, 'guardar' | 'consultar'>, ReportingProvider {
  constructor(private readonly mcp: MCPAdapter) {}

  async guardar(_tipoRegistro: string, datos: Record<string, unknown>): Promise<{ id: string }> {
    const resultado = (await this.mcp.ejecutarHerramienta(TOOLS.crearOActualizarPerfil, {
      email: datos.email,
      attributes: datos,
    })) as { id?: string };
    return { id: String(resultado?.id ?? '') };
  }

  async consultar(consulta: ConsultaRegistro): Promise<Record<string, unknown> | undefined> {
    return (await this.mcp.ejecutarHerramienta(TOOLS.buscarPerfil, {
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
    return (await this.mcp.ejecutarHerramienta(TOOLS.metricasCampania, {
      campaign_id: tipoMetrica,
      date_from: periodo.desde,
      date_to: periodo.hasta,
    })) as Record<string, unknown>;
  }
}
