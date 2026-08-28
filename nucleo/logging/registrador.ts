import pino from 'pino';

/**
 * Campos consistentes en todo log, para poder responder "¿por qué falló esta
 * operación?" sin tener que adivinar — nunca incluir el contenido de datos
 * sensibles (fichas, montos), solo identificadores.
 */
export interface CamposLog {
  perfilId?: string;
  procesoId?: string;
  capacidadId?: string;
  herramientaId?: string;
  mcpId?: string;
  requestId?: string;
  duracionMs?: number;
}

const base = pino({
  level: process.env.LOG_LEVEL ?? 'info',
});

export type Registrador = pino.Logger;

export function crearRegistrador(campos: CamposLog = {}): Registrador {
  return base.child(campos);
}

export const registrador: Registrador = crearRegistrador();
