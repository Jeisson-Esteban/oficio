import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { z } from 'zod';
import type { AlcanceCredencial, AlmacenCredenciales } from '../contratos/credenciales.js';
import type { MCPAdapter } from '../contratos/mcp-adapter.js';
import { ErrorValidacion } from '../errores/index.js';
import { AdaptadorMCPGenerico } from '../mcp/adaptador-mcp-generico.js';

const ConfigMCPSchema = z.object({
  id: z.string(),
  /** para MCPs hosteados por HTTP (mailerlite, klaviyo, zernio...) */
  url: z.string().optional(),
  /** para MCPs que corren como proceso local (ej. metricool via uvx) */
  comando: z.string().optional(),
  argumentos: z.array(z.string()).default([]),
  requiereAuth: z.boolean().default(true),
  /**
   * Solo para entradas "comando": mapea campo de credencial -> nombre real
   * de variable de entorno que espera el proceso (ej. userToken -> METRICOOL_USER_TOKEN).
   * Sin esto, un MCP local no sabría cómo llamar sus propias env vars.
   */
  variablesEntorno: z.record(z.string(), z.string()).default({}),
});
type ConfigMCP = z.infer<typeof ConfigMCPSchema>;

const CatalogoMCPSchema = z.object({ mcps: z.array(ConfigMCPSchema) });

/**
 * Registro de MCPs EXTERNOS (Neon, GoHighLevel, Zernio, Metricool...) que la
 * lógica de negocio puede necesitar fuera de una conversación con Claude
 * (ej. un Proceso disparado por evento). No reemplaza la integración MCP
 * nativa de Claude Code (como Notion en este entorno) — esa la maneja
 * Claude directamente.
 */
export class RegistroMCP {
  private readonly configs = new Map<string, ConfigMCP>();
  private readonly instancias = new Map<string, MCPAdapter>();

  static async cargar(ruta = 'mcp-registry.config.yaml'): Promise<RegistroMCP> {
    const registro = new RegistroMCP();
    let contenido: string;
    try {
      contenido = await readFile(ruta, 'utf-8');
    } catch {
      return registro;
    }

    const validado = CatalogoMCPSchema.safeParse(parse(contenido) ?? { mcps: [] });
    if (!validado.success) {
      throw new ErrorValidacion(`"${ruta}" no cumple el schema de MCPs`, { errores: validado.error.issues });
    }
    for (const config of validado.data.mcps) {
      registro.configs.set(config.id, config);
    }
    return registro;
  }

  listarConfigurados(): string[] {
    return [...this.configs.keys()];
  }

  /**
   * Crea (o reutiliza) el MCPAdapter de un MCP registrado, resolviendo sus
   * credenciales vía el AlmacenCredenciales inyectado. Nunca lee variables
   * de entorno directamente aquí -- esa decisión es de la implementación de
   * AlmacenCredenciales, intercambiable sin tocar este registro.
   */
  async obtenerAdaptador(
    mcpId: string,
    almacenCredenciales: AlmacenCredenciales,
    alcance: AlcanceCredencial,
  ): Promise<MCPAdapter> {
    const existente = this.instancias.get(mcpId);
    if (existente) return existente;

    const config = this.configs.get(mcpId);
    if (!config) {
      throw new ErrorValidacion(`El MCP "${mcpId}" no está en el registro`);
    }

    if (config.comando) {
      let variablesEntorno: Record<string, string> | undefined;
      if (config.requiereAuth) {
        const credenciales = await almacenCredenciales.obtenerCredencial(alcance);
        variablesEntorno = {};
        for (const [campo, nombreEnv] of Object.entries(config.variablesEntorno)) {
          if (credenciales[campo]) variablesEntorno[nombreEnv] = credenciales[campo];
        }
      }
      const adaptador = new AdaptadorMCPGenerico({
        id: config.id,
        comando: config.comando,
        argumentos: config.argumentos,
        variablesEntorno,
      });
      this.instancias.set(mcpId, adaptador);
      return adaptador;
    }

    if (!config.url) {
      throw new ErrorValidacion(`El MCP "${mcpId}" no tiene "url" ni "comando" configurado`);
    }

    let encabezados: Record<string, string> | undefined;
    if (config.requiereAuth) {
      const credenciales = await almacenCredenciales.obtenerCredencial(alcance);
      const token = credenciales.token ?? credenciales.apiKey;
      encabezados = token ? { Authorization: `Bearer ${token}` } : undefined;
    }

    const adaptador = new AdaptadorMCPGenerico({ id: config.id, url: config.url, encabezados });
    this.instancias.set(mcpId, adaptador);
    return adaptador;
  }
}
