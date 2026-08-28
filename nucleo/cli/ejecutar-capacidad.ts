import { AlmacenCredencialesEntorno } from '../configuracion/variables-entorno.js';
import { ErrorCapacidadNoResuelta } from '../errores/index.js';
import { registrarActividad } from '../logging/registro-actividad.js';
import { construirProvider } from '../registro/fabrica-providers.js';
import { RegistroCapacidades } from '../registro/registro-capacidades.js';
import { RegistroHerramientas } from '../registro/registro-herramientas.js';
import { RegistroMCP } from '../registro/registro-mcp.js';
import { RegistroPerfiles } from '../registro/registro-perfiles.js';
import { imprimir, leerArgumentoJSON } from './util.js';

/**
 * El ejecutor genérico que las habilidades invocan: recibe SOLO
 * (perfilId, capacidadId, argumentos) -- nunca el nombre de una Herramienta.
 * Resuelve internamente qué Herramienta conectada del Perfil cumple esa
 * Capacidad y llama al Provider real.
 *
 * Los campos de credenciales requeridos por cada Herramienta se leen del
 * propio catálogo (herramientas/*.yaml, campo camposCredenciales) -- una
 * sola fuente de verdad, no una lista aparte hardcodeada aquí.
 */

const [, , perfilId, capacidadId, argumentosJson] = process.argv;
if (!perfilId || !capacidadId) {
  throw new Error('uso: ejecutar-capacidad.ts <perfilId> <capacidadId> [argumentosJson]');
}
const argumentos = (leerArgumentoJSON(argumentosJson) ?? {}) as Record<string, unknown>;

const registroCapacidades = await RegistroCapacidades.cargar();
const capacidad = registroCapacidades.obtenerORequerida(capacidadId);

const registroPerfiles = new RegistroPerfiles();
const integraciones = await registroPerfiles.listarIntegracionesActivas(perfilId);
const integracion = integraciones.find(
  (i) => i.estado === 'activa' && i.capacidadesHabilitadas.includes(capacidadId),
);
if (!integracion) {
  throw new ErrorCapacidadNoResuelta(
    `El perfil "${perfilId}" no tiene ninguna Herramienta conectada que habilite "${capacidadId}"`,
  );
}

const registroHerramientas = await RegistroHerramientas.cargar();
const herramientaCatalogada = registroHerramientas.obtener(integracion.herramienta);
if (!herramientaCatalogada) {
  throw new ErrorCapacidadNoResuelta(`"${integracion.herramienta}" ya no existe en el catálogo de herramientas`);
}

const almacenCredenciales = new AlmacenCredencialesEntorno({
  [integracion.herramienta]: herramientaCatalogada.camposCredenciales,
});
const registroMCP = await RegistroMCP.cargar();
const construido = await construirProvider(integracion.herramienta, almacenCredenciales, registroMCP);
const provider = construido.provider as Record<string, (...args: unknown[]) => unknown>;

const inicio = Date.now();
let resultado: unknown;
let errorMensaje: string | undefined;
try {
  switch (capacidadId) {
    case 'guardar_registro':
      resultado = await provider.guardar!(argumentos.tipoRegistro ?? 'registro', argumentos.datos ?? {});
      break;
    case 'consultar_registro':
      resultado = await provider.consultar!({
        tipo: argumentos.tipo ?? '',
        criterio: String(argumentos.criterio ?? ''),
      });
      break;
    case 'buscar_historial':
      resultado = await provider.buscarHistorial!(
        String(argumentos.tipoRegistro ?? ''),
        String(argumentos.referencia ?? ''),
        Number(argumentos.cantidad ?? 3),
      );
      break;
    case 'consultar_agenda':
      resultado = await provider.consultarProximos!({
        desde: String(argumentos.desde),
        hasta: String(argumentos.hasta),
      });
      break;
    case 'generar_reporte':
      resultado = await provider.generar!({
        tipoReporte: String(argumentos.tipoReporte ?? ''),
        periodo: { desde: String(argumentos.desde), hasta: String(argumentos.hasta) },
      });
      break;
    case 'consultar_metricas':
      resultado = await provider.consultarMetricas!(String(argumentos.tipoMetrica ?? ''), {
        desde: String(argumentos.desde),
        hasta: String(argumentos.hasta),
      });
      break;
    case 'publicar_contenido':
      resultado = await provider.publicar!({
        texto: argumentos.texto ? String(argumentos.texto) : undefined,
        urlMedia: argumentos.urlMedia ? String(argumentos.urlMedia) : undefined,
        redes: Array.isArray(argumentos.redes) ? argumentos.redes : [],
        fechaProgramada: argumentos.fechaProgramada ? String(argumentos.fechaProgramada) : undefined,
      });
      break;
    default:
      throw new ErrorCapacidadNoResuelta(
        `"${capacidadId}" está en el catálogo pero el ejecutor CLI todavía no la implementa`,
      );
  }
} catch (error) {
  errorMensaje = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  // Esta línea es la señal real que después lee "revisar-patrones" -- se
  // registra tanto en éxito como en fallo, nunca se pierde un intento.
  await registrarActividad({
    tipo: 'ejecucion_capacidad',
    perfilId,
    capacidadId,
    herramienta: integracion.herramienta,
    ok: errorMensaje === undefined,
    duracionMs: Date.now() - inicio,
    fecha: new Date().toISOString(),
    error: errorMensaje,
  });
}

imprimir({ capacidad: capacidad.id, herramienta: integracion.herramienta, resultado });
