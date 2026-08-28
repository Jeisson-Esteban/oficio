import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { assertIdSeguro } from '../registro/validar-id.js';

/**
 * Registro de actividad por Perfil (JSONL, append-only) -- la señal real
 * que alimenta "revisar-patrones" (inspirado en la skill "dream" de
 * Claude Code OS). Es representación interna, igual que el resto de
 * perfiles/<id>/ -- el profesional nunca la lee directamente.
 */
export interface EventoActividad {
  tipo: 'ejecucion_capacidad';
  perfilId: string;
  capacidadId: string;
  herramienta: string;
  ok: boolean;
  duracionMs: number;
  fecha: string;
  error?: string;
}

function ruta(perfilId: string, raiz: string): string {
  assertIdSeguro(perfilId, 'perfilId');
  return path.join(raiz, perfilId, 'actividad.jsonl');
}

export async function registrarActividad(evento: EventoActividad, raiz = 'perfiles'): Promise<void> {
  const archivo = ruta(evento.perfilId, raiz);
  await mkdir(path.dirname(archivo), { recursive: true });
  await appendFile(archivo, `${JSON.stringify(evento)}\n`, 'utf-8');
}

export async function leerActividad(perfilId: string, raiz = 'perfiles'): Promise<EventoActividad[]> {
  let contenido: string;
  try {
    contenido = await readFile(ruta(perfilId, raiz), 'utf-8');
  } catch {
    return [];
  }
  const eventos: EventoActividad[] = [];
  for (const linea of contenido.split('\n')) {
    if (!linea.trim()) continue;
    try {
      eventos.push(JSON.parse(linea));
    } catch {
      // línea corrupta -- se ignora en vez de romper la lectura completa
    }
  }
  return eventos;
}
