import { AlmacenCredencialesLocal } from '../configuracion/almacen-credenciales.js';
import { construirProvider } from '../registro/fabrica-providers.js';
import { RegistroHerramientas } from '../registro/registro-herramientas.js';
import { RegistroMCP } from '../registro/registro-mcp.js';
import { RegistroPerfiles } from '../registro/registro-perfiles.js';
import { imprimir } from './util.js';

/**
 * Convierte "conectar una Herramienta" de un simple guardado de archivo a
 * una verificación real: intenta una lectura mínima con las credenciales
 * puestas y guarda el resultado en la propia Integración.
 *
 * Correr SIEMPRE justo después de guardar-integracion.ts (ver skill
 * conectar-herramienta, paso 5→6). También sirve para re-chequear una
 * conexión vieja si "revisar-patrones" avisa de fallos seguidos.
 *
 * uso: npx tsx nucleo/cli/verificar-integracion.ts <perfilId> <herramientaId>
 */
const [, , perfilId, herramientaId] = process.argv;
if (!perfilId || !herramientaId) {
  throw new Error('uso: verificar-integracion.ts <perfilId> <herramientaId>');
}

const registroPerfiles = new RegistroPerfiles();
const integraciones = await registroPerfiles.listarIntegracionesActivas(perfilId);
const integracion = integraciones.find((i) => i.herramienta === herramientaId);
if (!integracion) {
  throw new Error(`El perfil "${perfilId}" no tiene una Integración guardada para "${herramientaId}"`);
}

const registroHerramientas = await RegistroHerramientas.cargar();
const herramientaCatalogada = registroHerramientas.obtener(herramientaId);
if (!herramientaCatalogada) {
  throw new Error(`"${herramientaId}" ya no existe en el catálogo de herramientas`);
}

const almacenCredenciales = new AlmacenCredencialesLocal({
  [herramientaId]: herramientaCatalogada.camposCredenciales,
});
const registroMCP = await RegistroMCP.cargar();

const en = new Date().toISOString();
let resultado: { ok: boolean; error?: string };
try {
  const { verificarSalud } = await construirProvider(herramientaId, almacenCredenciales, registroMCP);
  resultado = await verificarSalud();
} catch (error) {
  resultado = { ok: false, error: error instanceof Error ? error.message : String(error) };
}

await registroPerfiles.guardarIntegracionActiva(perfilId, {
  ...integracion,
  verificacion: { ok: resultado.ok, en, error: resultado.error },
});

imprimir({ perfilId, herramienta: herramientaId, verificacion: { ok: resultado.ok, en, error: resultado.error } });
