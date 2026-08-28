import { ClienteTokenServiceAccount } from '../../integraciones/agenda/cliente-token-google.js';
import { GoogleCalendarProvider } from '../../integraciones/agenda/google-calendar.provider.js';
import { GoHighLevelProvider } from '../../integraciones/email-marketing/gohighlevel.provider.js';
import { KlaviyoProvider } from '../../integraciones/email-marketing/klaviyo.provider.js';
import { MailerLiteProvider } from '../../integraciones/email-marketing/mailerlite.provider.js';
import { EjecutorPg, NeonProvider } from '../../integraciones/registros/neon.provider.js';
import { NotionProvider } from '../../integraciones/registros/notion.provider.js';
import { MetricoolProvider } from '../../integraciones/social-media/metricool.provider.js';
import { ZernioProvider } from '../../integraciones/social-media/zernio.provider.js';
import type { AlmacenCredenciales } from '../contratos/credenciales.js';
import { AdaptadorMCPGenerico } from '../mcp/adaptador-mcp-generico.js';
import { ErrorCapacidadNoResuelta, ErrorValidacion } from '../errores/index.js';
import type { RegistroMCP } from './registro-mcp.js';

/**
 * A diferencia de mailerlite/klaviyo/zernio (URL fija en mcp-registry.config.yaml),
 * la de GoHighLevel es por subcuenta y viene como credencial -- eso significa
 * que un dato controlado por quien conecta la Herramienta termina siendo la
 * URL a la que este proceso le manda el token Bearer. Validar forma y host
 * evita que apunte a un servidor arbitrario si esa credencial llega
 * corrompida o manipulada (ver hallazgo de CSRF en nucleo/web/servidor.ts).
 */
function validarUrlGoHighLevel(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ErrorValidacion(`mcpUrl de GoHighLevel no es una URL válida: "${url}"`);
  }
  if (parsed.protocol !== 'https:') {
    throw new ErrorValidacion('mcpUrl de GoHighLevel debe ser https');
  }
  if (!parsed.hostname.endsWith('.leadconnectorhq.com')) {
    throw new ErrorValidacion(
      `mcpUrl de GoHighLevel debe apuntar a *.leadconnectorhq.com, recibido: "${parsed.hostname}"`,
    );
  }
  return url;
}

export interface EstadoSaludProvider {
  ok: boolean;
  error?: string;
}

export interface ProviderConstruido {
  /** Tipado laxo a propósito: cada Provider concreto tiene su propia forma; quien lo use sabe cuál pidió. */
  provider: unknown;
  /** Un chequeo real y barato (una lectura mínima), no solo "las credenciales están presentes". */
  verificarSalud: () => Promise<EstadoSaludProvider>;
}

async function comoSalud(operacion: () => Promise<unknown>): Promise<EstadoSaludProvider> {
  try {
    await operacion();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Única fábrica de Providers, compartida por ejecutar-capacidad.ts (uso real)
 * y verificar-integracion.ts (chequeo de salud tras conectar). Agregar una
 * Herramienta nueva solo requiere una rama aquí, no duplicar la lógica en
 * dos sitios.
 */
export async function construirProvider(
  herramientaId: string,
  almacenCredenciales: AlmacenCredenciales,
  registroMCP: RegistroMCP,
): Promise<ProviderConstruido> {
  if (herramientaId === 'notion') {
    const c = await almacenCredenciales.obtenerCredencial({ proveedor: 'notion' });
    const provider = new NotionProvider({ token: c.token!, databaseId: c.databaseId! });
    return {
      provider,
      verificarSalud: () => comoSalud(() => provider.consultar({ tipo: '_verificacion', criterio: '__ping__' })),
    };
  }

  if (herramientaId === 'google-calendar') {
    const c = await almacenCredenciales.obtenerCredencial({ proveedor: 'google-calendar' });
    const clienteToken = new ClienteTokenServiceAccount({
      clientEmail: c.clientEmail!,
      privateKey: c.privateKey!.replace(/\\n/g, '\n'),
      subject: c.subject,
    });
    const provider = new GoogleCalendarProvider({ clienteToken, calendarId: c.calendarId! });
    return {
      provider,
      verificarSalud: () =>
        comoSalud(() => {
          const ahora = new Date();
          return provider.consultarProximos({
            desde: ahora.toISOString(),
            hasta: new Date(ahora.getTime() + 60_000).toISOString(),
          });
        }),
    };
  }

  if (herramientaId === 'mailerlite' || herramientaId === 'klaviyo') {
    const mcp = await registroMCP.obtenerAdaptador(herramientaId, almacenCredenciales, { proveedor: herramientaId });
    const provider = herramientaId === 'mailerlite' ? new MailerLiteProvider(mcp) : new KlaviyoProvider(mcp);
    return { provider, verificarSalud: async () => mcp.verificarSalud() };
  }

  if (herramientaId === 'neon') {
    const c = await almacenCredenciales.obtenerCredencial({ proveedor: 'neon' });
    const ejecutor = new EjecutorPg(c.connectionString!);
    const provider = new NeonProvider(ejecutor);
    return { provider, verificarSalud: () => comoSalud(() => ejecutor.query('SELECT 1')) };
  }

  if (herramientaId === 'gohighlevel') {
    const c = await almacenCredenciales.obtenerCredencial({ proveedor: 'gohighlevel' });
    const mcp = new AdaptadorMCPGenerico({
      id: 'gohighlevel',
      url: validarUrlGoHighLevel(c.mcpUrl!),
      encabezados: { Authorization: `Bearer ${c.token}` },
    });
    const provider = new GoHighLevelProvider(mcp);
    return { provider, verificarSalud: () => mcp.verificarSalud() };
  }

  if (herramientaId === 'zernio') {
    const mcp = await registroMCP.obtenerAdaptador('zernio', almacenCredenciales, { proveedor: 'zernio' });
    const provider = new ZernioProvider(mcp);
    return { provider, verificarSalud: () => mcp.verificarSalud() };
  }

  if (herramientaId === 'metricool') {
    const c = await almacenCredenciales.obtenerCredencial({ proveedor: 'metricool' });
    const mcp = await registroMCP.obtenerAdaptador('metricool', almacenCredenciales, { proveedor: 'metricool' });
    const provider = new MetricoolProvider(mcp, c.blogId!);
    return { provider, verificarSalud: () => mcp.verificarSalud() };
  }

  throw new ErrorCapacidadNoResuelta(`No hay Provider implementado todavía para la herramienta "${herramientaId}"`);
}
