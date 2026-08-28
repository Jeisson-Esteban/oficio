import { afterEach, describe, expect, it } from 'vitest';
import { AlmacenCredencialesEntorno, claveEntorno } from './variables-entorno.js';
import { ErrorCredencialesFaltantes } from '../errores/index.js';

describe('claveEntorno', () => {
  it('normaliza proveedor, alias y campo a MAYUSCULAS__SEPARADAS', () => {
    expect(claveEntorno({ proveedor: 'google-calendar' }, 'clientEmail')).toBe(
      'GOOGLE_CALENDAR__DEFAULT__CLIENT_EMAIL',
    );
    expect(claveEntorno({ proveedor: 'notion', aliasCuenta: 'consultorio-2' }, 'token')).toBe(
      'NOTION__CONSULTORIO_2__TOKEN',
    );
  });
});

describe('AlmacenCredencialesEntorno', () => {
  const clave = 'NOTION__DEFAULT__TOKEN';

  afterEach(() => {
    delete process.env[clave];
  });

  it('resuelve credenciales cuando las variables de entorno existen', async () => {
    process.env[clave] = 'secreto-123';
    const almacen = new AlmacenCredencialesEntorno({ notion: ['token'] });

    const credenciales = await almacen.obtenerCredencial({ proveedor: 'notion' });

    expect(credenciales).toEqual({ token: 'secreto-123' });
  });

  it('lanza ErrorCredencialesFaltantes cuando falta una variable', async () => {
    const almacen = new AlmacenCredencialesEntorno({ notion: ['token'] });

    await expect(almacen.obtenerCredencial({ proveedor: 'notion' })).rejects.toBeInstanceOf(
      ErrorCredencialesFaltantes,
    );
  });

  it('lanza ErrorCredencialesFaltantes cuando el proveedor no está declarado', async () => {
    const almacen = new AlmacenCredencialesEntorno({});

    await expect(almacen.obtenerCredencial({ proveedor: 'notion' })).rejects.toBeInstanceOf(
      ErrorCredencialesFaltantes,
    );
  });
});
