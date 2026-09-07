import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { PerfilSchema } from '../contratos/perfil.js';
import { claveEntorno } from '../configuracion/variables-entorno.js';
import { AlmacenCredencialesLocal, guardarCredencialesLocal } from '../configuracion/almacen-credenciales.js';
import { construirProvider } from '../registro/fabrica-providers.js';
import { RegistroHerramientas } from '../registro/registro-herramientas.js';
import { RegistroMCP } from '../registro/registro-mcp.js';
import { RegistroPerfiles } from '../registro/registro-perfiles.js';

/**
 * Interfaz web LOCAL para conectar Herramientas -- corre solo en la
 * máquina del profesional mientras está configurando algo (mismo patrón
 * que `gh auth login` / `vercel login`), nunca expuesta a la red. Reutiliza
 * exactamente el mismo backend que ya usan las habilidades conversacionales
 * (RegistroHerramientas, RegistroPerfiles, fabrica-providers) -- esto es
 * otra "puerta de entrada" al mismo núcleo, no un sistema aparte.
 *
 * Bind a 127.0.0.1 NO alcanza como protección: cualquier pestaña abierta
 * en el mismo navegador puede alcanzar localhost. Por eso las rutas que
 * cambian estado exigen un token de sesión (generado al arrancar, embebido
 * en la página, nunca expuesto por una URL que un tercero pueda adivinar)
 * en un header -- un header custom fuerza preflight CORS, que una petición
 * cross-origin en modo "no-cors" no puede disparar.
 */

const PUERTO = Number(process.env.PUERTO_INTERFAZ ?? 4321);
const DIR_PUBLICO = path.join(path.dirname(fileURLToPath(import.meta.url)), 'publico');
const TOKEN_SESION = randomBytes(32).toString('hex');
const HEADER_TOKEN = 'x-interfaz-token';
const ORIGENES_PERMITIDOS = new Set([`http://localhost:${PUERTO}`, `http://127.0.0.1:${PUERTO}`]);

const TIPOS_MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

// mismo espíritu que assertIdSeguro (nucleo/registro/validar-id.ts): un
// nombre de ícono viene del catálogo, pero igual se valida antes de
// convertirlo en ruta de archivo -- barato y evita cualquier sorpresa.
const NOMBRE_ICONO_SEGURO = /^[a-z0-9-]+\.svg$/;

const ConectarRequestSchema = z.object({
  perfilId: z.string().regex(/^[a-z][a-z0-9-]*$/, 'perfilId debe ser kebab-case'),
  profesionNueva: z.string().optional(),
  herramientaId: z.string(),
  campos: z.record(
    z.string(),
    z.string().refine((v) => !/[\r\n]/.test(v), 'un valor de credencial no puede contener saltos de línea'),
  ),
  capacidadesHabilitadas: z.array(z.string()).optional(),
});

function tokenValido(recibido: string | undefined): boolean {
  if (!recibido || recibido.length !== TOKEN_SESION.length) return false;
  // comparación en tiempo constante -- no dar pistas de cuántos caracteres coinciden
  return timingSafeEqual(Buffer.from(recibido), Buffer.from(TOKEN_SESION));
}

function origenValido(req: http.IncomingMessage): boolean {
  const origen = req.headers.origin;
  // sin header Origin (ej. curl, o una petición same-origin en navegadores viejos) -> se deja
  // pasar aquí, el token sigue siendo la barrera real; con header Origin presente, debe matchear.
  return !origen || ORIGENES_PERMITIDOS.has(origen);
}

async function servirArchivoEstatico(res: http.ServerResponse, rutaRelativa: string): Promise<void> {
  const ruta = path.join(DIR_PUBLICO, rutaRelativa);
  try {
    const contenido = await readFile(ruta);
    const ext = path.extname(ruta);
    res.writeHead(200, { 'Content-Type': TIPOS_MIME[ext] ?? 'application/octet-stream' });
    res.end(contenido);
  } catch {
    res.writeHead(404);
    res.end('No encontrado');
  }
}

/** index.html se sirve siempre generado en el momento, con el token de esta ejecución embebido. */
async function servirIndexConToken(res: http.ServerResponse): Promise<void> {
  try {
    const html = await readFile(path.join(DIR_PUBLICO, 'index.html'), 'utf-8');
    const conToken = html.replace('%%TOKEN_INTERFAZ%%', TOKEN_SESION);
    res.writeHead(200, { 'Content-Type': TIPOS_MIME['.html'] });
    res.end(conToken);
  } catch {
    res.writeHead(404);
    res.end('No encontrado');
  }
}

function enviarJSON(res: http.ServerResponse, estado: number, cuerpo: unknown): void {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(cuerpo));
}

async function leerCuerpoJSON(req: http.IncomingMessage): Promise<unknown> {
  const partes: Buffer[] = [];
  for await (const parte of req) partes.push(parte as Buffer);
  const texto = Buffer.concat(partes).toString('utf-8');
  return texto ? JSON.parse(texto) : {};
}

async function manejarConectar(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  let cuerpo: z.infer<typeof ConectarRequestSchema>;
  try {
    cuerpo = ConectarRequestSchema.parse(await leerCuerpoJSON(req));
  } catch (error) {
    return enviarJSON(res, 400, {
      error: 'cuerpo inválido',
      detalle: error instanceof z.ZodError ? error.issues : String(error),
    });
  }
  const { perfilId, profesionNueva, herramientaId, campos, capacidadesHabilitadas } = cuerpo;

  const registroHerramientas = await RegistroHerramientas.cargar();
  const herramienta = registroHerramientas.obtener(herramientaId);
  if (!herramienta) {
    return enviarJSON(res, 404, { error: `"${herramientaId}" no existe en el catálogo` });
  }
  if (herramienta.estado !== 'disponible') {
    return enviarJSON(res, 409, {
      error: `"${herramientaId}" todavía no está evaluada como disponible (estado: ${herramienta.estado})`,
    });
  }

  // Mínimo privilegio real, no solo de interfaz: nunca se habilita una
  // Capacidad que esta Herramienta no ofrezca, aunque el cliente la pida.
  const solicitadas = capacidadesHabilitadas?.length ? capacidadesHabilitadas : herramienta.capacidadesQueOfrece;
  const capacidadesFinal = solicitadas.filter((c) => herramienta.capacidadesQueOfrece.includes(c));
  if (capacidadesFinal.length === 0) {
    return enviarJSON(res, 400, { error: 'ninguna capacidad solicitada es ofrecida por esta herramienta' });
  }

  const registroPerfiles = new RegistroPerfiles();
  let perfil = await registroPerfiles.obtenerPerfil(perfilId);
  if (!perfil) {
    perfil = PerfilSchema.parse({
      id: perfilId,
      profesion: profesionNueva ?? 'Sin especificar',
      creadoEn: new Date().toISOString(),
      preferencias: {},
    });
    await registroPerfiles.guardarPerfil(perfil);
  }

  // Escribe cada campo bajo la clave exacta que el resto del sistema espera.
  const paresEnv: Record<string, string> = {};
  for (const campo of herramienta.camposCredenciales) {
    if (campos[campo]) paresEnv[claveEntorno({ proveedor: herramientaId }, campo)] = campos[campo];
  }
  await guardarCredencialesLocal(paresEnv);

  const conectadoEn = new Date().toISOString();
  await registroPerfiles.guardarIntegracionActiva(perfilId, {
    herramienta: herramientaId,
    capacidadesHabilitadas: capacidadesFinal,
    credencialesRef: Object.keys(paresEnv)[0] ?? herramientaId,
    conectadoEn,
    estado: 'activa',
  });

  // Verificación real, igual que nucleo/cli/verificar-integracion.ts.
  const almacenCredenciales = new AlmacenCredencialesLocal({ [herramientaId]: herramienta.camposCredenciales });
  const registroMCP = await RegistroMCP.cargar();
  let verificacion: { ok: boolean; error?: string };
  try {
    const { verificarSalud } = await construirProvider(herramientaId, almacenCredenciales, registroMCP);
    verificacion = await verificarSalud();
  } catch (error) {
    verificacion = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const integraciones = await registroPerfiles.listarIntegracionesActivas(perfilId);
  const actual = integraciones.find((i) => i.herramienta === herramientaId)!;
  await registroPerfiles.guardarIntegracionActiva(perfilId, {
    ...actual,
    verificacion: { ok: verificacion.ok, en: new Date().toISOString(), error: verificacion.error },
  });

  enviarJSON(res, 200, { ok: true, perfilId, herramienta: herramientaId, verificacion });
}

/** Construye el servidor sin escuchar todavía -- así los tests pueden levantarlo en un puerto efímero. */
export function crearServidor(): http.Server {
  return http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${PUERTO}`);

    if (req.method === 'GET' && url.pathname === '/') return await servirIndexConToken(res);
    if (req.method === 'GET' && (url.pathname === '/app.js' || url.pathname === '/estilos.css')) {
      return await servirArchivoEstatico(res, url.pathname.slice(1));
    }

    if (req.method === 'GET' && url.pathname.startsWith('/iconos/')) {
      const nombre = url.pathname.slice('/iconos/'.length);
      if (!NOMBRE_ICONO_SEGURO.test(nombre)) {
        res.writeHead(404);
        return res.end('No encontrado');
      }
      return await servirArchivoEstatico(res, `iconos/${nombre}`);
    }

    if (req.method === 'GET' && url.pathname === '/api/herramientas') {
      const registro = await RegistroHerramientas.cargar();
      return enviarJSON(res, 200, registro.listar());
    }

    if (req.method === 'GET' && url.pathname === '/api/perfiles') {
      const registro = new RegistroPerfiles();
      return enviarJSON(res, 200, await registro.listarPerfiles());
    }

    const coincidenciaIntegraciones = url.pathname.match(/^\/api\/perfiles\/([^/]+)\/integraciones$/);
    if (req.method === 'GET' && coincidenciaIntegraciones) {
      const registro = new RegistroPerfiles();
      return enviarJSON(res, 200, await registro.listarIntegracionesActivas(coincidenciaIntegraciones[1]!));
    }

    if (req.method === 'POST' && url.pathname === '/api/conectar') {
      // Barrera CSRF: token de sesión (no adivinable) + Origin, ambas antes
      // de tocar cualquier archivo. Un header custom no se puede mandar en
      // modo "no-cors", así que esto cierra el vector de "cualquier pestaña
      // abierta puede conectar una Herramienta con credenciales ajenas".
      if (!origenValido(req) || !tokenValido(req.headers[HEADER_TOKEN] as string | undefined)) {
        return enviarJSON(res, 403, { error: 'token de sesión inválido o ausente' });
      }
      return await manejarConectar(req, res);
    }

    res.writeHead(404);
    res.end('No encontrado');
  } catch (error) {
    enviarJSON(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
  });
}

export { TOKEN_SESION };

/* c8 ignore start -- arranque real; en tests, vitest define process.env.VITEST y este bloque no corre */
if (!process.env.VITEST) {
  crearServidor().listen(PUERTO, '127.0.0.1', () => {
    console.log(`Interfaz local corriendo en http://localhost:${PUERTO} (Ctrl+C para detenerla)`);
  });
}
/* c8 ignore stop */
