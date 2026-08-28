import { z } from 'zod';

/**
 * Un Perfil es una persona usando el sistema. "profesion" es solo una
 * etiqueta de contexto (ayuda a Claude a sugerir vocabulario/procesos
 * típicos) — nunca una estructura de código ni una condición en el core.
 */
export const PerfilSchema = z.object({
  // kebab-case estricto: perfilId se usa para construir rutas de archivo
  // (perfiles/<id>/...) -- sin este patrón, un id como "../../etc" sería
  // un path traversal. Ver nucleo/registro/validar-id.ts para el chequeo
  // de defensa en profundidad que aplica esto también en runtime, no solo
  // al validar este schema.
  id: z.string().regex(/^[a-z][a-z0-9-]*$/, 'el id de un perfil debe ser kebab-case'),
  profesion: z.string(),
  nombreDisplay: z.string().optional(),
  creadoEn: z.string(),
  preferencias: z.record(z.string(), z.unknown()).default({}),
});

export type Perfil = z.infer<typeof PerfilSchema>;
