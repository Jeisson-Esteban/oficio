import { ErrorProveedor } from '../../nucleo/errores/index.js';
import type { ConsultaRegistro, RecordProvider } from './interfaz.js';

/**
 * Notion tiene MCP disponible, pero esta implementación usa su REST API
 * directamente (api.notion.com, documentada y estable) en vez de un
 * endpoint MCP -- así el Provider puede correr de forma standalone (ej. un
 * disparador programado) sin depender de que haya una conversación de
 * Claude con el MCP de Notion ya conectado.
 *
 * Simplificación conocida: asume que "datos"/propiedades se mapean 1:1 a
 * propiedades de tipo texto en la base de datos de Notion del profesional.
 * Mapear esquemas de Notion más ricos (select, relation, etc.) queda para
 * cuando haga falta un caso de uso real que lo pida.
 */
export interface ConfigNotionProvider {
  token: string;
  databaseId: string;
  propiedadTitulo?: string;
  propiedadReferencia?: string;
  propiedadFecha?: string;
  fetchImpl?: typeof fetch;
}

const VERSION_NOTION = '2022-06-28';
const URL_BASE = 'https://api.notion.com/v1';

interface RespuestaConsultaBaseDeDatos {
  results: Record<string, unknown>[];
}

export class NotionProvider implements RecordProvider {
  private readonly fetchImpl: typeof fetch;
  private readonly propiedadTitulo: string;
  private readonly propiedadReferencia: string;
  private readonly propiedadFecha: string;

  constructor(private readonly config: ConfigNotionProvider) {
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.propiedadTitulo = config.propiedadTitulo ?? 'Name';
    this.propiedadReferencia = config.propiedadReferencia ?? 'Referencia';
    this.propiedadFecha = config.propiedadFecha ?? 'Fecha';
  }

  private async peticion<T>(ruta: string, opciones: RequestInit): Promise<T> {
    const respuesta = await this.fetchImpl(`${URL_BASE}${ruta}`, {
      ...opciones,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        'Notion-Version': VERSION_NOTION,
        'Content-Type': 'application/json',
        ...(opciones.headers ?? {}),
      },
    });

    if (!respuesta.ok) {
      const cuerpo = await respuesta.text();
      throw new ErrorProveedor(`Notion respondió ${respuesta.status} en ${ruta}`, { cuerpo });
    }

    return (await respuesta.json()) as T;
  }

  async guardar(tipoRegistro: string, datos: Record<string, unknown>): Promise<{ id: string }> {
    const propiedades: Record<string, unknown> = {
      [this.propiedadTitulo]: {
        title: [{ text: { content: String(datos[this.propiedadTitulo] ?? tipoRegistro) } }],
      },
    };
    for (const [clave, valor] of Object.entries(datos)) {
      if (clave === this.propiedadTitulo) continue;
      propiedades[clave] = { rich_text: [{ text: { content: String(valor) } }] };
    }

    const resultado = await this.peticion<{ id: string }>('/pages', {
      method: 'POST',
      body: JSON.stringify({ parent: { database_id: this.config.databaseId }, properties: propiedades }),
    });

    return { id: resultado.id };
  }

  async consultar(consulta: ConsultaRegistro): Promise<Record<string, unknown> | undefined> {
    const resultado = await this.peticion<RespuestaConsultaBaseDeDatos>(
      `/databases/${this.config.databaseId}/query`,
      {
        method: 'POST',
        body: JSON.stringify({
          filter: { property: this.propiedadTitulo, title: { equals: consulta.criterio } },
          page_size: 1,
        }),
      },
    );

    return resultado.results[0];
  }

  async buscarHistorial(
    _tipoRegistro: string,
    referencia: string,
    cantidad: number,
  ): Promise<Record<string, unknown>[]> {
    const resultado = await this.peticion<RespuestaConsultaBaseDeDatos>(
      `/databases/${this.config.databaseId}/query`,
      {
        method: 'POST',
        body: JSON.stringify({
          filter: { property: this.propiedadReferencia, rich_text: { equals: referencia } },
          sorts: [{ property: this.propiedadFecha, direction: 'descending' }],
          page_size: cantidad,
        }),
      },
    );

    return resultado.results;
  }
}
