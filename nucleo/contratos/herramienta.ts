import { z } from 'zod';

/**
 * Una Herramienta es un producto externo real que usa el profesional
 * (Notion, Google Calendar, GoHighLevel...). Es la vista de cara al usuario
 * de lo que técnicamente implementa un Provider en integraciones/.
 *
 * estado "pendiente_evaluacion" es intencional: cuando habilidades/conectar-herramienta
 * descubre algo vía find-skills, entra en el catálogo en este estado, NUNCA
 * "disponible" automáticamente — ver regla de no confiar en una Skill solo por encontrarla.
 */
export const EstadoHerramientaSchema = z.enum(['disponible', 'pendiente_evaluacion', 'no_confirmado']);
export type EstadoHerramienta = z.infer<typeof EstadoHerramientaSchema>;

export const TipoAutenticacionSchema = z.enum(['oauth', 'api_key', 'service_account', 'ninguna']);
export type TipoAutenticacion = z.infer<typeof TipoAutenticacionSchema>;

export const HerramientaSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/, 'el id de una herramienta debe ser kebab-case'),
  nombre: z.string(),
  descripcion: z.string(),
  categoria: z.string().optional(),
  /** ids de Capacidad que esta Herramienta puede cumplir */
  capacidadesQueOfrece: z.array(z.string()).default([]),
  /** ruta al Provider concreto bajo integraciones/, si ya está implementado */
  integracion: z.string().optional(),
  autenticacion: TipoAutenticacionSchema.optional(),
  /** id del MCP en el registro de MCPs externos, si aplica */
  mcp: z.string().optional(),
  estado: EstadoHerramientaSchema.default('pendiente_evaluacion'),
  /** de dónde viene el hallazgo, para trazabilidad (ej. "find-skills", "investigacion-manual") */
  fuente: z.string().optional(),
  /**
   * Nombres de campos de credenciales que necesita el Provider (ej. ["token", "databaseId"]).
   * De aquí se derivan las variables de entorno reales via claveEntorno() -- una sola fuente
   * de verdad, en vez de repetir esta lista a mano en cada script.
   */
  camposCredenciales: z.array(z.string()).default([]),
  /**
   * Pasos en lenguaje simple, en orden, para que CUALQUIER persona (sin
   * conocimiento técnico) consiga esas credenciales. conectar-herramienta
   * los presenta SIEMPRE, palabra por palabra, antes de pedir que se
   * configure nada -- nunca se improvisan en la conversación.
   */
  guiaCredenciales: z.array(z.string()).default([]),
});

export type Herramienta = z.infer<typeof HerramientaSchema>;
