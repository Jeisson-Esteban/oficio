import { z } from 'zod';

/**
 * Un Perfil es una persona usando el sistema. "profesion" es solo una
 * etiqueta de contexto (ayuda a Claude a sugerir vocabulario/procesos
 * típicos) — nunca una estructura de código ni una condición en el core.
 */
export const PerfilSchema = z.object({
  id: z.string(),
  profesion: z.string(),
  nombreDisplay: z.string().optional(),
  creadoEn: z.string(),
  preferencias: z.record(z.string(), z.unknown()).default({}),
});

export type Perfil = z.infer<typeof PerfilSchema>;
