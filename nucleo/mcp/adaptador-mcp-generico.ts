import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type {
  CapacidadesMCP,
  DescriptorHerramientaMCP,
  EstadoSalud,
  MCPAdapter,
} from '../contratos/mcp-adapter.js';
import { ErrorConexionMCP } from '../errores/index.js';

export interface OpcionesMCPGenerico {
  /** id interno del MCP (ej. "neon", "gohighlevel") — solo para logs/errores */
  id: string;
  /** URL del endpoint MCP remoto (Streamable HTTP) -- para MCPs hosteados (mailerlite, klaviyo, zernio...) */
  url?: string;
  /** ej. { Authorization: "Bearer ..." } — resuelto por el llamador via AlmacenCredenciales */
  encabezados?: Record<string, string>;
  /** ejecutable a levantar como proceso local (stdio) -- para MCPs que se instalan y corren localmente (ej. metricool) */
  comando?: string;
  argumentos?: string[];
  variablesEntorno?: Record<string, string>;
  /** permite inyectar un transporte propio en tests (ver InMemoryTransport) */
  transporte?: Transport;
}

/**
 * Única implementación de MCPAdapter, para transporte HTTP o stdio (según
 * qué opciones se pasen). Los Providers en integraciones/ la reutilizan en
 * vez de escribir un cliente MCP cada uno — agregar un MCP nuevo no
 * debería requerir código nuevo aquí, solo elegir url o comando.
 */
export class AdaptadorMCPGenerico implements MCPAdapter {
  private cliente: Client | undefined;

  constructor(private readonly opciones: OpcionesMCPGenerico) { }

  private crearTransporte(): Transport {
    if (this.opciones.comando) {
      return new StdioClientTransport({
        command: this.opciones.comando,
        args: this.opciones.argumentos,
        env: this.opciones.variablesEntorno,
      });
    }
    if (this.opciones.url) {
      return new StreamableHTTPClientTransport(new URL(this.opciones.url), {
        requestInit: this.opciones.encabezados ? { headers: this.opciones.encabezados } : undefined,
      });
    }
    throw new ErrorConexionMCP(`El MCP "${this.opciones.id}" no tiene "url" ni "comando" configurado`);
  }

  async conectar(): Promise<void> {
    if (this.cliente) return;

    const transporte = this.opciones.transporte ?? this.crearTransporte();

    const cliente = new Client({ name: `plataforma-${this.opciones.id}`, version: '0.1.0' });

    try {
      await cliente.connect(transporte);
    } catch (error) {
      throw new ErrorConexionMCP(`No se pudo conectar al MCP "${this.opciones.id}"`, {
        causa: error instanceof Error ? error.message : String(error),
      });
    }

    this.cliente = cliente;
  }

  async desconectar(): Promise<void> {
    await this.cliente?.close();
    this.cliente = undefined;
  }

  async verificarSalud(): Promise<EstadoSalud> {
    const inicio = Date.now();
    try {
      await this.conectar();
      await this.cliente!.ping();
      return { ok: true, latenciaMs: Date.now() - inicio };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async listarHerramientas(): Promise<DescriptorHerramientaMCP[]> {
    await this.conectar();
    const { tools } = await this.cliente!.listTools();
    return tools.map((herramienta) => ({
      nombre: herramienta.name,
      descripcion: herramienta.description ?? '',
    }));
  }

  async ejecutarHerramienta(nombre: string, args: Record<string, unknown>): Promise<unknown> {
    await this.conectar();
    const resultado = await this.cliente!.callTool({ name: nombre, arguments: args });
    if ('isError' in resultado && resultado.isError) {
      throw new ErrorConexionMCP(`El MCP "${this.opciones.id}" devolvió error ejecutando "${nombre}"`, {
        resultado,
      });
    }
    return resultado;
  }

  obtenerCapacidades(): CapacidadesMCP {
    return {
      nombre: this.opciones.id,
      version: this.cliente?.getServerVersion()?.version ?? 'desconocida',
    };
  }
}
