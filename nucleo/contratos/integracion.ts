import { z } from 'zod';

/**
 * Integración = conexión AUTORIZADA entre una Herramienta y un Perfil.
 * No es lo mismo que la Herramienta (el catálogo) ni que el Provider técnico
 * (el código) — esto es el registro de "este Perfil ya conectó y autorizó esto".
 *
 * "capacidadesHabilitadas" es mínimo privilegio: aunque la Herramienta pueda
 * ofrecer más Capacidades, solo estas quedan disponibles para este Perfil.
 */
export const IntegracionActivaSchema = z.object({
  /** id de Herramienta */
  herramienta: z.string(),
  capacidadesHabilitadas: z.array(z.string()).min(1),
  /** referencia (alias/nombre de variable), NUNCA el secreto en sí */
  credencialesRef: z.string(),
  conectadoEn: z.string(),
  estado: z.enum(['activa', 'revocada']).default('activa'),
  /**
   * Resultado del último chequeo real (una lectura mínima, no solo "el
   * archivo se guardó bien") -- ver nucleo/cli/verificar-integracion.ts.
   * Ausente = todavía no se verificó.
   */
  verificacion: z
    .object({
      ok: z.boolean(),
      en: z.string(),
      error: z.string().optional(),
    })
    .optional(),
});

export type IntegracionActiva = z.infer<typeof IntegracionActivaSchema>;
