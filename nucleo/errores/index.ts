export class ErrorPlataforma extends Error {
  constructor(message: string, public readonly detalles?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** Un Provider no pudo completar la operación pedida. */
export class ErrorProveedor extends ErrorPlataforma {}

/** Falló la conexión o una llamada a un MCP externo. */
export class ErrorConexionMCP extends ErrorPlataforma {}

/** Faltan credenciales para resolver un AlcanceCredencial. */
export class ErrorCredencialesFaltantes extends ErrorPlataforma {}

/** Una Capacidad pedida no existe o no tiene forma de resolverse. */
export class ErrorCapacidadNoResuelta extends ErrorPlataforma {}

/** Un YAML/manifest no cumple su schema. */
export class ErrorValidacion extends ErrorPlataforma {}

/**
 * Se intentó usar una Herramienta que todavía no fue autorizada por el
 * profesional (estado "pendiente_evaluacion" o "no_confirmado"). Ver regla:
 * encontrar una Skill no la convierte automáticamente en integración confiable.
 */
export class ErrorHerramientaNoAutorizada extends ErrorPlataforma {}
