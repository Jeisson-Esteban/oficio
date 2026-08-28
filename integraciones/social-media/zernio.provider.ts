import type { MCPAdapter } from '../../nucleo/contratos/mcp-adapter.js';
import { resolverHerramienta } from '../../nucleo/mcp/resolver-herramienta.js';
import type { PeriodoReporte, ReportingProvider, SolicitudReporte } from '../reporting/interfaz.js';
import type { ContenidoAPublicar, ResultadoPublicacion, SocialMediaProvider } from './interfaz.js';

/**
 * Zernio (rebrand de "Late"/getlate.dev) -- MCP oficial CONFIRMADO en
 * https://mcp.zernio.com/mcp con Bearer token (verificado contra su
 * documentación real, no adivinado).
 *
 * A diferencia de MailerLite/Klaviyo, Zernio expone ~496 tools, muchas
 * auto-generadas por endpoint, y documenta su propio mecanismo de
 * "search_tools" para descubrimiento -- no hay un nombre de tool fijo y
 * documentado para "publicar". Por eso este Provider resuelve el nombre en
 * vivo con `resolverHerramienta` en vez de asumir uno fijo.
 */
const TOOL_PREFERIDO_PUBLICAR = 'create_post';
const TOOL_PREFERIDO_METRICAS = 'get_analytics';

export class ZernioProvider implements SocialMediaProvider, ReportingProvider {
  constructor(private readonly mcp: MCPAdapter) {}

  async publicar(contenido: ContenidoAPublicar): Promise<ResultadoPublicacion> {
    const tool = await resolverHerramienta(this.mcp, TOOL_PREFERIDO_PUBLICAR, ['post']);
    const detalle = await this.mcp.ejecutarHerramienta(tool, {
      content: contenido.texto,
      media_url: contenido.urlMedia,
      platforms: contenido.redes,
      scheduled_at: contenido.fechaProgramada,
    });
    return { ok: true, detalle };
  }

  async generar(solicitud: SolicitudReporte): Promise<Record<string, unknown>> {
    const tool = await resolverHerramienta(this.mcp, TOOL_PREFERIDO_METRICAS, ['analytic']);
    const detalle = await this.mcp.ejecutarHerramienta(tool, {
      date_from: solicitud.periodo.desde,
      date_to: solicitud.periodo.hasta,
    });
    return { tipoReporte: solicitud.tipoReporte, detalle };
  }

  async consultarMetricas(tipoMetrica: string, periodo: PeriodoReporte): Promise<Record<string, unknown>> {
    const tool = await resolverHerramienta(this.mcp, TOOL_PREFERIDO_METRICAS, ['analytic']);
    const detalle = await this.mcp.ejecutarHerramienta(tool, {
      platform: tipoMetrica,
      date_from: periodo.desde,
      date_to: periodo.hasta,
    });
    return { tipoMetrica, detalle };
  }
}
