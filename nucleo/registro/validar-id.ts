import { ErrorValidacion } from '../errores/index.js';

const PATRON_ID_SEGURO = /^[a-z][a-z0-9-]*$/;

/**
 * Defensa en profundidad contra path traversal: perfilId (y similares) se
 * usan para construir rutas de archivo (perfiles/<id>/...). El schema de
 * Perfil ya exige este mismo patrón, pero varios métodos (guardarProceso,
 * listarIntegracionesActivas, AlmacenMemoriaArchivo...) reciben el id como
 * string suelto sin pasar por ese schema -- este chequeo no depende de que
 * el llamador haya validado antes.
 */
export function assertIdSeguro(id: string, contexto = 'id'): void {
  if (!PATRON_ID_SEGURO.test(id)) {
    throw new ErrorValidacion(`"${contexto}" tiene un valor inválido: "${id}" (debe ser kebab-case, sin rutas)`);
  }
}
