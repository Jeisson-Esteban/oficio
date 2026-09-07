import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cifrar, descifrar, obtenerClaveLocal } from './cifrado.js';

let dir: string;
let rutaClave: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'clave-'));
  rutaClave = path.join(dir, '.clave-local.key');
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('obtenerClaveLocal', () => {
  it('genera una clave nueva de 32 bytes si el archivo no existe', async () => {
    const clave = await obtenerClaveLocal(rutaClave);
    expect(clave).toHaveLength(32);
    expect(await readFile(rutaClave, 'utf-8')).toBeTruthy();
  });

  it('reutiliza la misma clave en llamadas siguientes en vez de regenerarla', async () => {
    const primera = await obtenerClaveLocal(rutaClave);
    const segunda = await obtenerClaveLocal(rutaClave);
    expect(segunda.equals(primera)).toBe(true);
  });
});

describe('cifrar / descifrar', () => {
  it('recupera el texto original después de cifrarlo', async () => {
    const clave = await obtenerClaveLocal(rutaClave);
    const valor = cifrar(clave, 'secreto-123');
    expect(descifrar(clave, valor)).toBe('secreto-123');
  });

  it('nunca deja el texto plano visible dentro del valor cifrado', async () => {
    const clave = await obtenerClaveLocal(rutaClave);
    const valor = cifrar(clave, 'mi-api-key-super-secreta');
    expect(valor.datos).not.toContain('mi-api-key-super-secreta');
    expect(JSON.stringify(valor)).not.toContain('mi-api-key-super-secreta');
  });

  it('produce un iv distinto en cada llamada, incluso para el mismo texto', async () => {
    const clave = await obtenerClaveLocal(rutaClave);
    const a = cifrar(clave, 'mismo-texto');
    const b = cifrar(clave, 'mismo-texto');
    expect(a.iv).not.toBe(b.iv);
    expect(a.datos).not.toBe(b.datos);
  });

  it('rechaza descifrar con una clave distinta a la que se usó para cifrar', async () => {
    const claveA = await obtenerClaveLocal(rutaClave);
    const valor = cifrar(claveA, 'secreto-123');
    const claveB = await obtenerClaveLocal(path.join(dir, 'otra.key'));
    expect(() => descifrar(claveB, valor)).toThrow();
  });

  it('rechaza descifrar si el valor cifrado fue alterado (autenticación falla)', async () => {
    const clave = await obtenerClaveLocal(rutaClave);
    const valor = cifrar(clave, 'secreto-123');
    const alterado = { ...valor, datos: Buffer.from('otra-cosa').toString('base64') };
    expect(() => descifrar(clave, alterado)).toThrow();
  });
});
