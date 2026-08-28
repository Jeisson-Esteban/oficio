import type { AlcanceCredencial, AlmacenCredenciales } from '../contratos/credenciales.js';
import { ErrorCredencialesFaltantes } from '../errores/index.js';

function normalizarSegmento(valor: string): string {
  const conGuionesBajos = valor.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
  return conGuionesBajos.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

/** ej. proveedor="google-calendar", aliasCuenta="default", campo="clientEmail" -> GOOGLE_CALENDAR__DEFAULT__CLIENT_EMAIL */
export function claveEntorno(alcance: AlcanceCredencial, campo: string): string {
  const partes = [alcance.proveedor, alcance.aliasCuenta ?? 'default', campo].map(normalizarSegmento);
  return partes.join('__');
}

/**
 * Implementación por defecto de AlmacenCredenciales: lee variables de entorno.
 * El día que haga falta un secrets manager o credenciales por Perfil en una
 * base de datos, se cambia esta clase — nada que dependa de AlmacenCredenciales
 * (los Providers) necesita enterarse.
 */
export class AlmacenCredencialesEntorno implements AlmacenCredenciales {
  /** camposPorProveedor declara qué campos son obligatorios para cada Herramienta, ej. { notion: ["token"] } */
  constructor(private readonly camposPorProveedor: Record<string, string[]>) {}

  async obtenerCredencial(alcance: AlcanceCredencial): Promise<Record<string, string>> {
    const campos = this.camposPorProveedor[alcance.proveedor];
    if (!campos || campos.length === 0) {
      throw new ErrorCredencialesFaltantes(
        `No hay campos de credenciales declarados para el proveedor "${alcance.proveedor}"`,
      );
    }

    const resultado: Record<string, string> = {};
    const faltantes: string[] = [];
    for (const campoDeclarado of campos) {
      // un campo terminado en "?" es opcional (ej. "subject?" para Domain-Wide Delegation)
      const opcional = campoDeclarado.endsWith('?');
      const campo = opcional ? campoDeclarado.slice(0, -1) : campoDeclarado;
      const clave = claveEntorno(alcance, campo);
      const valor = process.env[clave];
      if (!valor) {
        if (!opcional) faltantes.push(clave);
      } else {
        resultado[campo] = valor;
      }
    }

    if (faltantes.length > 0) {
      throw new ErrorCredencialesFaltantes(
        `Faltan variables de entorno para "${alcance.proveedor}": ${faltantes.join(', ')}`,
        { proveedor: alcance.proveedor, faltantes },
      );
    }

    return resultado;
  }
}
