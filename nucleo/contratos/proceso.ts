import { z } from 'zod';

/**
 * Representación interna de "cómo trabaja el profesional". El usuario NUNCA
 * edita esto directamente (ver regla: YAML es representación interna) — se
 * crea y se modifica siempre hablando; Claude traduce la conversación a esto
 * y lo confirma con el usuario antes de guardar.
 */
export const DisparadorSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('manual') }),
  z.object({ tipo: z.literal('evento'), descripcion: z.string() }),
  z.object({ tipo: z.literal('programado'), descripcion: z.string() }),
]);
export type Disparador = z.infer<typeof DisparadorSchema>;

export const ReglaSchema = z.object({
  /** lo que dijo el profesional, siempre presente — es la fuente de verdad */
  texto: z.string(),
  /** forma estructurada mínima, solo cuando es trivial de extraer; nunca forzada */
  condicion: z.string().optional(),
  entonces: z.string().optional(),
});
export type Regla = z.infer<typeof ReglaSchema>;

export const PasoProcesoSchema = z.object({
  /** en lenguaje natural, tal como se le explicó a Claude */
  descripcion: z.string(),
  /** id de Capacidad si el paso llama a una; si no está, Claude lo resuelve razonando */
  capacidad: z.string().optional(),
});
export type PasoProceso = z.infer<typeof PasoProcesoSchema>;

export const CambioHistorialSchema = z.object({
  version: z.number().int().min(1),
  /** descripción en lenguaje natural del cambio, ej. "cambié de 3 a 5 sesiones" */
  cambio: z.string(),
  fecha: z.string(),
});

export const ProcesoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string(),
  disparador: DisparadorSchema,
  pasos: z.array(PasoProcesoSchema).min(1),
  reglas: z.array(ReglaSchema).default([]),
  /** derivado automáticamente de los pasos, para saber de qué Integraciones depende */
  capacidadesUsadas: z.array(z.string()).default([]),
  estado: z.enum(['activo', 'pausado', 'borrador']).default('borrador'),
  version: z.number().int().min(1).default(1),
  creadoEn: z.string(),
  actualizadoEn: z.string(),
  historial: z.array(CambioHistorialSchema).default([]),
});

export type Proceso = z.infer<typeof ProcesoSchema>;
