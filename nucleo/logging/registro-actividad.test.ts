import { appendFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { leerActividad, registrarActividad } from './registro-actividad.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'actividad-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('registro de actividad (JSONL append-only)', () => {
  it('devuelve vacío si el perfil todavía no tiene actividad', async () => {
    expect(await leerActividad('nadie', dir)).toEqual([]);
  });

  it('registra y lee eventos en el orden en que se escribieron', async () => {
    await registrarActividad(
      { tipo: 'ejecucion_capacidad', perfilId: 'demo', capacidadId: 'a', herramienta: 'notion', ok: true, duracionMs: 10, fecha: '2026-08-18T00:00:00.000Z' },
      dir,
    );
    await registrarActividad(
      { tipo: 'ejecucion_capacidad', perfilId: 'demo', capacidadId: 'b', herramienta: 'notion', ok: false, duracionMs: 20, fecha: '2026-08-19T00:00:00.000Z', error: 'boom' },
      dir,
    );

    const eventos = await leerActividad('demo', dir);

    expect(eventos).toHaveLength(2);
    expect(eventos[0]!.capacidadId).toBe('a');
    expect(eventos[1]!).toMatchObject({ capacidadId: 'b', ok: false, error: 'boom' });
  });

  it('ignora líneas corruptas en vez de romper la lectura completa', async () => {
    await registrarActividad(
      { tipo: 'ejecucion_capacidad', perfilId: 'demo', capacidadId: 'a', herramienta: 'notion', ok: true, duracionMs: 10, fecha: '2026-08-18T00:00:00.000Z' },
      dir,
    );
    await mkdir(path.join(dir, 'demo'), { recursive: true });
    await appendFile(path.join(dir, 'demo', 'actividad.jsonl'), 'esto no es json\n', 'utf-8');

    const eventos = await leerActividad('demo', dir);

    expect(eventos).toHaveLength(1);
  });
});
