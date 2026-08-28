import type { MCPAdapter } from '../../nucleo/contratos/mcp-adapter.js';
import type { ConsultaRegistro, RecordProvider } from '../registros/interfaz.js';
import type { PeriodoReporte, ReportingProvider, SolicitudReporte } from '../reporting/interfaz.js';

/**
 * GoHighLevel tiene MCP oficial, production-ready, pero el endpoint es POR
 * SUBCUENTA (services.leadconnectorhq.com/mcp/{cliente}/v2) -- por eso su
 * URL vive en las credenciales del profesional, no en mcp-registry.config.yaml
 * (que asume una URL fija por MCP). Ver herramientas/gohighlevel.yaml.
 *
 * Los nombres de tools de abajo son la MEJOR HIPÓTESIS a partir de su API
 * pública documentada (contacts, opportunities) -- no verificados contra un
 * servidor real por falta de credenciales en este entorno. Corregir aquí si
 * al conectar con credenciales reales los nombres no coinciden (revisar
 * `adaptador.listarHerramientas()` para ver los reales).
 */
const TOOLS = {
  crearOActualizarContacto: 'contacts_upsert',
  buscarContacto: 'contacts_lookup',
  listarOportunidades: 'opportunities_search',
  metricasOportunidades: 'opportunities_search',
} as const;

export class GoHighLevelProvider implements Pick<RecordProvider, 'guardar' | 'consultar'>, ReportingProvider {
  constructor(private readonly mcp: MCPAdapter) {}

  async guardar(_tipoRegistro: string, datos: Record<string, unknown>): Promise<{ id: string }> {
    const resultado = (await this.mcp.ejecutarHerramienta(TOOLS.crearOActualizarContacto, datos)) as {
      id?: string;
    };
    return { id: String(resultado?.id ?? '') };
  }

  async consultar(consulta: ConsultaRegistro): Promise<Record<string, unknown> | undefined> {
    return (await this.mcp.ejecutarHerramienta(TOOLS.buscarContacto, {
      query: consulta.criterio,
    })) as Record<string, unknown> | undefined;
  }

  async generar(solicitud: SolicitudReporte): Promise<Record<string, unknown>> {
    return (await this.mcp.ejecutarHerramienta(TOOLS.listarOportunidades, {
      date_from: solicitud.periodo.desde,
      date_to: solicitud.periodo.hasta,
    })) as Record<string, unknown>;
  }

  async consultarMetricas(_tipoMetrica: string, periodo: PeriodoReporte): Promise<Record<string, unknown>> {
    return (await this.mcp.ejecutarHerramienta(TOOLS.metricasOportunidades, {
      date_from: periodo.desde,
      date_to: periodo.hasta,
    })) as Record<string, unknown>;
  }
}
