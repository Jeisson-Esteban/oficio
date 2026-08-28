import type { EventoActividad } from '../logging/registro-actividad.js';
import type { IntegracionActiva } from '../contratos/integracion.js';
import type { Patron } from '../contratos/patron.js';
import type { Proceso } from '../contratos/proceso.js';

/**
 * Detección de patrones inspirada en la skill "dream" de Claude Code OS,
 * adaptada a nuestros datos (actividad.jsonl + Procesos + Integraciones en
 * vez de logs de sesión de Claude Code). Mismo espíritu: nada se inventa,
 * cada hallazgo exige evidencia mínima, y esto SOLO sugiere -- nunca crea
 * ni borra nada por su cuenta.
 */

// Umbrales -- documentados a propósito, no mágicos. Subir si empieza a
// generar ruido; bajar si no detecta nada útil con poco historial.
const MIN_EJECUCIONES_PARA_PROCESO_CANDIDATO = 3;
const MIN_FALLOS_PARA_ALERTA = 2;
const TASA_ERROR_MINIMA_PARA_ALERTA = 0.5;
const DIAS_MINIMOS_ANTES_DE_MARCAR_DORMIDO = 7;

export interface EntradaDeteccion {
  perfilId: string;
  actividad: EventoActividad[]; // ya filtrada al período que se quiere analizar
  procesos: Proceso[];
  integraciones: IntegracionActiva[];
  ahora: Date;
}

function diasDesde(fechaIso: string, ahora: Date): number {
  return (ahora.getTime() - new Date(fechaIso).getTime()) / 86_400_000;
}

export function detectarPatrones(entrada: EntradaDeteccion): Patron[] {
  const { actividad, procesos, integraciones, ahora } = entrada;
  const patrones: Patron[] = [];

  const capacidadesEnProcesos = new Set(procesos.flatMap((p) => p.capacidadesUsadas));

  // 1) Capacidad ejecutada seguido, sin ningún Proceso que la agrupe
  const porCapacidad = new Map<string, EventoActividad[]>();
  for (const evento of actividad) {
    const lista = porCapacidad.get(evento.capacidadId) ?? [];
    lista.push(evento);
    porCapacidad.set(evento.capacidadId, lista);
  }
  for (const [capacidadId, eventos] of porCapacidad) {
    const exitosos = eventos.filter((e) => e.ok);
    if (exitosos.length >= MIN_EJECUCIONES_PARA_PROCESO_CANDIDATO && !capacidadesEnProcesos.has(capacidadId)) {
      patrones.push({
        id: `proceso-candidato-${capacidadId}`,
        categoria: 'proceso_candidato',
        severidad: Math.min(10, 3 + exitosos.length),
        titular: `Usaste "${capacidadId}" ${exitosos.length} veces sin tenerlo guardado como una forma habitual de trabajar`,
        sugerencia: `Podría valer la pena guardar esto como un Proceso, así la próxima vez no hay que explicarlo de nuevo. ¿Quieres que lo conversemos?`,
        evidencia: exitosos.slice(0, 3).map((e) => `Ejecutado el ${e.fecha} vía ${e.herramienta}`),
      });
    }
  }

  // 2) Fallos recurrentes de una misma Capacidad
  for (const [capacidadId, eventos] of porCapacidad) {
    const fallos = eventos.filter((e) => !e.ok);
    const tasaError = fallos.length / eventos.length;
    if (fallos.length >= MIN_FALLOS_PARA_ALERTA && tasaError >= TASA_ERROR_MINIMA_PARA_ALERTA) {
      patrones.push({
        id: `fallo-recurrente-${capacidadId}`,
        categoria: 'fallo_recurrente',
        severidad: Math.min(10, 4 + fallos.length),
        titular: `"${capacidadId}" está fallando seguido (${fallos.length} de ${eventos.length} intentos)`,
        sugerencia: `Probablemente haya que revisar la conexión o las credenciales de la Herramienta detrás de esta Capacidad.`,
        evidencia: fallos.slice(0, 3).map((e) => `Falló el ${e.fecha}${e.error ? `: ${e.error}` : ''}`),
      });
    }
  }

  // 3) Proceso guardado y activo, pero dormido (sin ejecuciones recientes)
  for (const proceso of procesos) {
    if (proceso.estado !== 'activo') continue;
    if (diasDesde(proceso.creadoEn, ahora) < DIAS_MINIMOS_ANTES_DE_MARCAR_DORMIDO) continue;
    const tieneEjecucionReciente = proceso.capacidadesUsadas.some((c) => (porCapacidad.get(c)?.length ?? 0) > 0);
    if (!tieneEjecucionReciente && proceso.capacidadesUsadas.length > 0) {
      patrones.push({
        id: `proceso-dormido-${proceso.id}`,
        categoria: 'proceso_dormido',
        severidad: 3,
        titular: `"${proceso.nombre}" está guardado pero no se ha usado en el período revisado`,
        sugerencia: `¿Sigue siendo parte de tu forma de trabajar, o lo pausamos para no confundir?`,
        evidencia: [`Creado el ${proceso.creadoEn}`, `Sin ejecuciones de sus Capacidades en este período`],
      });
    }
  }

  // 4) Integración conectada pero ninguna de sus Capacidades habilitadas se usó
  for (const integracion of integraciones) {
    if (integracion.estado !== 'activa') continue;
    if (diasDesde(integracion.conectadoEn, ahora) < DIAS_MINIMOS_ANTES_DE_MARCAR_DORMIDO) continue;
    const usada = integracion.capacidadesHabilitadas.some((c) => (porCapacidad.get(c)?.length ?? 0) > 0);
    if (!usada) {
      patrones.push({
        id: `integracion-sin-uso-${integracion.herramienta}`,
        categoria: 'integracion_sin_uso',
        severidad: 2,
        titular: `Conectaste "${integracion.herramienta}" pero no se ha usado en el período revisado`,
        sugerencia: `Si ya no hace falta, se puede desconectar para no dejar credenciales activas sin uso.`,
        evidencia: [`Conectada el ${integracion.conectadoEn}`, `Sin ejecuciones de sus Capacidades habilitadas`],
      });
    }
  }

  return patrones.sort((a, b) => b.severidad - a.severidad);
}
