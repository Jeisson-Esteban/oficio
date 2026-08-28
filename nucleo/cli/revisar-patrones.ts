import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ReportePatronesSchema } from '../contratos/patron.js';
import { leerActividad } from '../logging/registro-actividad.js';
import { detectarPatrones } from '../patrones/detectar-patrones.js';
import { RegistroPerfiles } from '../registro/registro-perfiles.js';
import { imprimir } from './util.js';

/**
 * Versión propia de la skill "dream" de Claude Code OS: revisa la
 * actividad reciente de un Perfil y sugiere patrones -- nunca los aplica
 * solo. La habilidad conversacional (que se agrega después) es la que
 * presenta esto en lenguaje natural y pide confirmación antes de convertir
 * algo en Proceso o desconectar una Integración.
 *
 * uso: npx tsx nucleo/cli/revisar-patrones.ts <perfilId> [periodoDias=30]
 */
const [, , perfilId, periodoDiasArg] = process.argv;
if (!perfilId) throw new Error('uso: revisar-patrones.ts <perfilId> [periodoDias=30]');
const periodoDias = Number(periodoDiasArg ?? 30);

const ahora = new Date();
const desde = new Date(ahora.getTime() - periodoDias * 86_400_000);

const todaLaActividad = await leerActividad(perfilId);
const actividad = todaLaActividad.filter((e) => new Date(e.fecha) >= desde);

const registroPerfiles = new RegistroPerfiles();
const procesos = await registroPerfiles.listarProcesos(perfilId);
const integraciones = await registroPerfiles.listarIntegracionesActivas(perfilId);

const patrones = detectarPatrones({ perfilId, actividad, procesos, integraciones, ahora });

const reporte = ReportePatronesSchema.parse({
  perfilId,
  generadoEn: ahora.toISOString(),
  periodoDias,
  patrones,
});

const dir = path.join('perfiles', perfilId, 'patrones');
await mkdir(dir, { recursive: true });
const archivo = path.join(dir, `patron-${ahora.toISOString().slice(0, 10)}.json`);
await writeFile(archivo, JSON.stringify(reporte, null, 2), 'utf-8');

imprimir(reporte);
if (patrones.length === 0) {
  console.error(`Sin hallazgos con evidencia suficiente en los últimos ${periodoDias} días -- no se inventó nada.`);
}
