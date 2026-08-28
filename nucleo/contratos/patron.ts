import { z } from 'zod';

/**
 * Un Patrón es lo que "revisar-patrones" prescribe: algo que el profesional
 * podría querer convertir en Proceso, revisar, o limpiar. Nunca se aplica
 * solo -- solo se presenta y el profesional confirma (misma regla que
 * crear/modificar un Proceso).
 */
export const CategoriaPatronSchema = z.enum(['proceso_candidato', 'fallo_recurrente', 'proceso_dormido', 'integracion_sin_uso']);
export type CategoriaPatron = z.infer<typeof CategoriaPatronSchema>;

export const PatronSchema = z.object({
  id: z.string(), // slug ESTABLE -- mismo hallazgo en días distintos = mismo id
  categoria: CategoriaPatronSchema,
  severidad: z.number().int().min(1).max(10),
  titular: z.string(), // una frase, lenguaje llano
  sugerencia: z.string(), // 2-4 frases, next step concreto
  evidencia: z.array(z.string()).min(1), // hechos verificables, nunca genérico
});
export type Patron = z.infer<typeof PatronSchema>;

export const ReportePatronesSchema = z.object({
  perfilId: z.string(),
  generadoEn: z.string(),
  periodoDias: z.number().int().positive(),
  patrones: z.array(PatronSchema),
});
export type ReportePatrones = z.infer<typeof ReportePatronesSchema>;
