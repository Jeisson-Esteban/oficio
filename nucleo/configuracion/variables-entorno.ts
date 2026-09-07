import type { AlcanceCredencial } from '../contratos/credenciales.js';

function normalizarSegmento(valor: string): string {
  const conGuionesBajos = valor.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
  return conGuionesBajos.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

/** ej. proveedor="google-calendar", aliasCuenta="default", campo="clientEmail" -> GOOGLE_CALENDAR__DEFAULT__CLIENT_EMAIL */
export function claveEntorno(alcance: AlcanceCredencial, campo: string): string {
  const partes = [alcance.proveedor, alcance.aliasCuenta ?? 'default', campo].map(normalizarSegmento);
  return partes.join('__');
}
