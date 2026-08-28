import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PerfilSchema } from '../contratos/perfil.js';
import { claveEntorno } from '../configuracion/variables-entorno.js';
import { establecerVariablesEnv } from '../configuracion/escribir-env.js';
import { construirProvider } from '../registro/fabrica-providers.js';
import { AlmacenCredencialesEntorno } from '../configuracion/variables-entorno.js';
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
 */

const PUERTO = Number(process.env.PUERTO_INTERFAZ ?? 4321);
const DIR_PUBLICO = path.join(path.dirname(fileURLToPath(import.meta.url)), 'publico');

const TIPOS_MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

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

function enviarJSON(res: http.ServerResponse, estado: number, cuerpo: unknown): void {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(cuerpo));
}

async function leerCuerpoJSON(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const partes: Buffer[] = [];
  for await (const parte of req) partes.push(parte as Buffer);
  const texto = Buffer.concat(partes).toString('utf-8');
  return texto ? JSON.parse(texto) : {};
}

async function manejarConectar(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const cuerpo = await leerCuerpoJSON(req);
  const perfilId = String(cuerpo.perfilId ?? '').trim();
  const profesionNueva = cuerpo.profesionNueva ? String(cuerpo.profesionNueva) : undefined;
  const herramientaId = String(cuerpo.herramientaId ?? '');
  const campos = (cuerpo.campos ?? {}) as Record<string, string>;
  const capacidadesHabilitadas = Array.isArray(cuerpo.capacidadesHabilitadas)
    ? (cuerpo.capacidadesHabilitadas as string[])
    : undefined;

  if (!perfilId || !herramientaId) {
    return enviarJSON(res, 400, { error: 'perfilId y herramientaId son requeridos' });
  }

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
  await establecerVariablesEnv(paresEnv);

  const conectadoEn = new Date().toISOString();
  await registroPerfiles.guardarIntegracionActiva(perfilId, {
    herramienta: herramientaId,
    capacidadesHabilitadas: capacidadesHabilitadas?.length ? capacidadesHabilitadas : herramienta.capacidadesQueOfrece,
    credencialesRef: Object.keys(paresEnv)[0] ?? herramientaId,
    conectadoEn,
    estado: 'activa',
  });

  // Verificación real, igual que nucleo/cli/verificar-integracion.ts.
  const almacenCredenciales = new AlmacenCredencialesEntorno({ [herramientaId]: herramienta.camposCredenciales });
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

const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${PUERTO}`);

    if (req.method === 'GET' && url.pathname === '/') return servirArchivoEstatico(res, 'index.html');
    if (req.method === 'GET' && (url.pathname === '/app.js' || url.pathname === '/estilos.css')) {
      return servirArchivoEstatico(res, url.pathname.slice(1));
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
      return await manejarConectar(req, res);
    }

    res.writeHead(404);
    res.end('No encontrado');
  } catch (error) {
    enviarJSON(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

servidor.listen(PUERTO, '127.0.0.1', () => {
  console.log(`Interfaz local corriendo en http://localhost:${PUERTO} (Ctrl+C para detenerla)`);
});
