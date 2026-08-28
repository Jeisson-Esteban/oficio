import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { establecerVariablesEnv } from './escribir-env.js';

let dir: string;
let ruta: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'env-'));
  ruta = path.join(dir, '.env');
});

afterEach(async () => {
  delete process.env.CLAVE_NUEVA;
  delete process.env.CLAVE_EXISTENTE;
  await rm(dir, { recursive: true, force: true });
});

describe('establecerVariablesEnv', () => {
  it('crea el archivo si no existe', async () => {
    await establecerVariablesEnv({ CLAVE_NUEVA: 'valor1' }, ruta);
    expect(await readFile(ruta, 'utf-8')).toContain('CLAVE_NUEVA=valor1');
  });

  it('actualiza una clave existente en vez de duplicarla', async () => {
    await writeFile(ruta, 'CLAVE_EXISTENTE=viejo\nOTRA=x\n', 'utf-8');

    await establecerVariablesEnv({ CLAVE_EXISTENTE: 'nuevo' }, ruta);

    const contenido = await readFile(ruta, 'utf-8');
    expect(contenido).toContain('CLAVE_EXISTENTE=nuevo');
    expect(contenido).not.toContain('viejo');
    expect(contenido.match(/CLAVE_EXISTENTE=/g)).toHaveLength(1);
  });

  it('agrega una clave nueva sin tocar las existentes', async () => {
    await writeFile(ruta, 'OTRA=x\n', 'utf-8');

    await establecerVariablesEnv({ CLAVE_NUEVA: 'valor1' }, ruta);

    const contenido = await readFile(ruta, 'utf-8');
    expect(contenido).toContain('OTRA=x');
    expect(contenido).toContain('CLAVE_NUEVA=valor1');
  });

  it('deja los valores disponibles en process.env de inmediato', async () => {
    await establecerVariablesEnv({ CLAVE_NUEVA: 'valor1' }, ruta);
    expect(process.env.CLAVE_NUEVA).toBe('valor1');
  });
});
