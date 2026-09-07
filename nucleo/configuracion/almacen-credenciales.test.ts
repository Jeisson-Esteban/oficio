import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ErrorCredencialesFaltantes } from '../errores/index.js';
import { AlmacenCredencialesLocal, guardarCredencialesLocal } from './almacen-credenciales.js';

let dir: string;
let ruta: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'credenciales-'));
  ruta = path.join(dir, '.credenciales.local.json');
});

afterEach(async () => {
  delete process.env.NOTION__DEFAULT__TOKEN;
  await rm(dir, { recursive: true, force: true });
});

describe('guardarCredencialesLocal', () => {
  it('crea el almacén cifrado si no existe', async () => {
    await guardarCredencialesLocal({ CLAVE_NUEVA: 'valor1' }, ruta);
    const contenido = await readFile(ruta, 'utf-8');
    expect(contenido).not.toContain('valor1');
    expect(JSON.parse(contenido).CLAVE_NUEVA).toHaveProperty('datos');
  });

  it('actualiza una clave existente en vez de duplicarla, sin perder las demás', async () => {
    await guardarCredencialesLocal({ CLAVE_EXISTENTE: 'viejo', OTRA: 'x' }, ruta);
    await guardarCredencialesLocal({ CLAVE_EXISTENTE: 'nuevo' }, ruta);

    const almacen = JSON.parse(await readFile(ruta, 'utf-8'));
    expect(Object.keys(almacen)).toEqual(expect.arrayContaining(['CLAVE_EXISTENTE', 'OTRA']));
  });

  it('deja los valores disponibles en process.env de inmediato', async () => {
    await guardarCredencialesLocal({ NOTION__DEFAULT__TOKEN: 'secreto-123' }, ruta);
    expect(process.env.NOTION__DEFAULT__TOKEN).toBe('secreto-123');
  });

  it('rechaza un valor con salto de línea en vez de guardarlo', async () => {
    await expect(guardarCredencialesLocal({ CLAVE_NUEVA: 'x\nOTRA=secuestrada' }, ruta)).rejects.toThrow();
  });

  it('rechaza una clave con salto de línea', async () => {
    await expect(guardarCredencialesLocal({ 'CLAVE\nMALA': 'valor' }, ruta)).rejects.toThrow();
  });
});

describe('AlmacenCredencialesLocal', () => {
  afterEach(() => {
    delete process.env.NOTION__DEFAULT__TOKEN;
  });

  it('resuelve una credencial guardada en el almacén cifrado (round-trip completo)', async () => {
    await guardarCredencialesLocal({ NOTION__DEFAULT__TOKEN: 'secreto-cifrado' }, ruta);
    delete process.env.NOTION__DEFAULT__TOKEN; // simula un proceso nuevo, sin lo que quedó cacheado en memoria

    const almacen = new AlmacenCredencialesLocal({ notion: ['token'] }, ruta);
    const credenciales = await almacen.obtenerCredencial({ proveedor: 'notion' });

    expect(credenciales).toEqual({ token: 'secreto-cifrado' });
  });

  it('el archivo en disco nunca contiene el valor en texto plano', async () => {
    await guardarCredencialesLocal({ NOTION__DEFAULT__TOKEN: 'no-deberia-verse-esto' }, ruta);
    const contenido = await readFile(ruta, 'utf-8');
    expect(contenido).not.toContain('no-deberia-verse-esto');
  });

  it('prioriza process.env sobre el almacén cifrado si ambos existen', async () => {
    await guardarCredencialesLocal({ NOTION__DEFAULT__TOKEN: 'del-almacen' }, ruta);
    process.env.NOTION__DEFAULT__TOKEN = 'del-entorno';

    const almacen = new AlmacenCredencialesLocal({ notion: ['token'] }, ruta);
    const credenciales = await almacen.obtenerCredencial({ proveedor: 'notion' });

    expect(credenciales).toEqual({ token: 'del-entorno' });
  });

  it('lanza ErrorCredencialesFaltantes cuando no está ni en process.env ni en el almacén', async () => {
    const almacen = new AlmacenCredencialesLocal({ notion: ['token'] }, ruta);
    await expect(almacen.obtenerCredencial({ proveedor: 'notion' })).rejects.toBeInstanceOf(
      ErrorCredencialesFaltantes,
    );
  });

  it('lanza ErrorCredencialesFaltantes cuando el proveedor no está declarado', async () => {
    const almacen = new AlmacenCredencialesLocal({}, ruta);
    await expect(almacen.obtenerCredencial({ proveedor: 'notion' })).rejects.toBeInstanceOf(
      ErrorCredencialesFaltantes,
    );
  });

  it('trata un campo opcional (terminado en "?") como no obligatorio', async () => {
    const almacen = new AlmacenCredencialesLocal({ 'google-calendar': ['clientEmail', 'subject?'] }, ruta);
    process.env.GOOGLE_CALENDAR__DEFAULT__CLIENT_EMAIL = 'cuenta@servicio.iam.gserviceaccount.com';

    const credenciales = await almacen.obtenerCredencial({ proveedor: 'google-calendar' });

    expect(credenciales).toEqual({ clientEmail: 'cuenta@servicio.iam.gserviceaccount.com' });
    delete process.env.GOOGLE_CALENDAR__DEFAULT__CLIENT_EMAIL;
  });
});
