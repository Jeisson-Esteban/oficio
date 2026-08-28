import type { Registrador } from '../logging/registrador.js';

/**
 * Lo que recibe cualquier ejecución de una Capacidad: quién la pide y con
 * qué logger correlacionado. No lleva datos de negocio — esos van en los
 * argumentos propios de cada Capacidad.
 */
export interface ContextoEjecucion {
  perfilId: string;
  requestId: string;
  logger: Registrador;
}
