import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AlmacenMemoriaArchivo } from './memoria.js';

let dir: string;
let almacen: AlmacenMemoriaArchivo;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'memoria-'));
  almacen = new AlmacenMemoriaArchivo(dir);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('AlmacenMemoriaArchivo', () => {
  it('guarda y lista entradas de memoria', async () => {
    await almacen.guardar('psicologo-demo', {
      tipo: 'referencia_fuente',
      clave: 'fuente_pacientes',
      valor: 'Los pacientes se guardan en Notion, base de datos "Fichas".',
      creadoEn: '2026-08-15T00:00:00.000Z',
    });

    const entradas = await almacen.listar('psicologo-demo');
    expect(entradas).toHaveLength(1);
    expect(entradas[0]?.valor).toContain('Notion');
  });

  it('reemplaza una entrada existente con la misma clave en vez de duplicarla', async () => {
    await almacen.guardar('psicologo-demo', {
      tipo: 'preferencia',
      clave: 'sesiones_a_revisar',
      valor: '3',
      creadoEn: '2026-08-15T00:00:00.000Z',
    });
    await almacen.guardar('psicologo-demo', {
      tipo: 'preferencia',
      clave: 'sesiones_a_revisar',
      valor: '5',
      creadoEn: '2026-08-16T00:00:00.000Z',
    });

    const entradas = await almacen.listar('psicologo-demo', 'preferencia');
    expect(entradas).toHaveLength(1);
    expect(entradas[0]?.valor).toBe('5');
  });

  it('rechaza guardar un valor demasiado largo (memoria no es una copia de datos)', async () => {
    await expect(
      almacen.guardar('psicologo-demo', {
        tipo: 'referencia_fuente',
        clave: 'ficha_completa',
        valor: 'x'.repeat(501),
        creadoEn: '2026-08-15T00:00:00.000Z',
      }),
    ).rejects.toThrow();
  });

  it('devuelve una lista vacía si el perfil no tiene memoria todavía', async () => {
    expect(await almacen.listar('nadie')).toEqual([]);
  });

  it('acepta el tipo "dato_negocio" para hechos generales del negocio', async () => {
    await almacen.guardar('psicologo-demo', {
      tipo: 'dato_negocio',
      clave: 'horario_atencion',
      valor: 'Atiende de lunes a viernes, de 9 a 5.',
      creadoEn: '2026-08-20T00:00:00.000Z',
    });

    const entradas = await almacen.listar('psicologo-demo', 'dato_negocio');
    expect(entradas).toHaveLength(1);
    expect(entradas[0]?.valor).toContain('lunes a viernes');
  });
});
