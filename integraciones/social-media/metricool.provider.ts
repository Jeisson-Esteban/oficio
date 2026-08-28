import type { MCPAdapter } from '../../nucleo/contratos/mcp-adapter.js';
import { resolverHerramienta } from '../../nucleo/mcp/resolver-herramienta.js';
import type { PeriodoReporte, ReportingProvider, SolicitudReporte } from '../reporting/interfaz.js';
import type { ContenidoAPublicar, ResultadoPublicacion, SocialMediaProvider } from './interfaz.js';

/**
 * Metricool NO tiene un endpoint HTTP hosteado -- su MCP se corre en local
 * como proceso (`uvx mcp-metricool`, ver herramientas/metricool.yaml),
 * confirmado contra su documentación oficial (help.metricool.com).
 *
 * Tools confirmadas por la documentación: `get_brands`, `update_schedule_post`.
 * El nombre exacto para CREAR una publicación nueva no está documentado
 * públicamente con el mismo detalle -- se resuelve en vivo con
 * `resolverHerramienta` en vez de asumirlo.
 */
const TOOL_PREFERIDO_PUBLICAR = 'schedule_post';
const TOOL_PREFERIDO_METRICAS = 'get_metrics';

export class MetricoolProvider implements SocialMediaProvider, ReportingProvider {
  constructor(
    private readonly mcp: MCPAdapter,
    private readonly blogId: string,
  ) {}

  async publicar(contenido: ContenidoAPublicar): Promise<ResultadoPublicacion> {
    const tool = await resolverHerramienta(this.mcp, TOOL_PREFERIDO_PUBLICAR, ['post']);
    const detalle = await this.mcp.ejecutarHerramienta(tool, {
      blog_id: this.blogId,
      text: contenido.texto,
      media_url: contenido.urlMedia,
      providers: contenido.redes,
      scheduled_at: contenido.fechaProgramada,
    });
    return { ok: true, detalle };
  }

  async generar(solicitud: SolicitudReporte): Promise<Record<string, unknown>> {
    const tool = await resolverHerramienta(this.mcp, TOOL_PREFERIDO_METRICAS, ['metric']);
    const detalle = await this.mcp.ejecutarHerramienta(tool, {
      blog_id: this.blogId,
      date_from: solicitud.periodo.desde,
      date_to: solicitud.periodo.hasta,
    });
    return { tipoReporte: solicitud.tipoReporte, detalle };
  }

  async consultarMetricas(tipoMetrica: string, periodo: PeriodoReporte): Promise<Record<string, unknown>> {
    const tool = await resolverHerramienta(this.mcp, TOOL_PREFERIDO_METRICAS, ['metric']);
    const detalle = await this.mcp.ejecutarHerramienta(tool, {
      blog_id: this.blogId,
      network: tipoMetrica,
      date_from: periodo.desde,
      date_to: periodo.hasta,
    });
    return { tipoMetrica, detalle };
  }
}
