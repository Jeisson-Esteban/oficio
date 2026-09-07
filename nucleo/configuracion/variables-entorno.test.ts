import { describe, expect, it } from 'vitest';
import { claveEntorno } from './variables-entorno.js';

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
