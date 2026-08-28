import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { z } from 'zod';
import { ErrorValidacion } from '../errores/index.js';
import { assertIdSeguro } from '../registro/validar-id.js';

/**
 * Memoria guarda ESTRUCTURA Y REFERENCIAS, nunca una copia de datos
 * sensibles. "valor" debe ser algo como "los pacientes viven en Notion,
 * base de datos X" -- jamás el contenido real de una ficha. El límite de
 * longitud es una barrera de último recurso, no la única defensa: quien
 * llama a guardar() (las habilidades conversacionales) es responsable de
 * no pasarle datos de negocio.
 */
export const TipoEntradaMemoriaSchema = z.enum([
  'preferencia',
  'referencia_fuente',
  'patron_detectado',
  /** un hecho sobre cómo es/opera el negocio del profesional, dicho en conversación (ej. "atiende de lunes a viernes", "ofrece 3 tipos de terapia") -- no encaja como preferencia ni como fuente */
  'dato_negocio',
]);
export type TipoEntradaMemoria = z.infer<typeof TipoEntradaMemoriaSchema>;

export const EntradaMemoriaSchema = z.object({
  tipo: TipoEntradaMemoriaSchema,
  clave: z.string(),
  valor: z.string().max(500, 'memoria guarda referencias cortas, no copias de datos'),
  creadoEn: z.string(),
});
export type EntradaMemoria = z.infer<typeof EntradaMemoriaSchema>;

export interface AlmacenMemoria {
  guardar(perfilId: string, entrada: EntradaMemoria): Promise<void>;
  listar(perfilId: string, tipo?: TipoEntradaMemoria): Promise<EntradaMemoria[]>;
}

export class AlmacenMemoriaArchivo implements AlmacenMemoria {
  constructor(private readonly raiz = 'perfiles') {}

  private ruta(perfilId: string): string {
    assertIdSeguro(perfilId, 'perfilId');
    return path.join(this.raiz, perfilId, 'memoria.yaml');
  }

  async guardar(perfilId: string, entrada: EntradaMemoria): Promise<void> {
    const validada = EntradaMemoriaSchema.parse(entrada);
    const existentes = await this.listar(perfilId);
    const actualizadas = [...existentes.filter((e) => e.clave !== validada.clave), validada];
    const ruta = this.ruta(perfilId);
    await mkdir(path.dirname(ruta), { recursive: true });
    await writeFile(ruta, stringify({ entradas: actualizadas }), 'utf-8');
  }

  async listar(perfilId: string, tipo?: TipoEntradaMemoria): Promise<EntradaMemoria[]> {
    let contenido: string;
    try {
      contenido = await readFile(this.ruta(perfilId), 'utf-8');
    } catch {
      return [];
    }
    const datos = parse(contenido) ?? { entradas: [] };
    const validado = EntradaMemoriaSchema.array().safeParse(datos.entradas ?? []);
    if (!validado.success) {
      throw new ErrorValidacion(`memoria de "${perfilId}" inválida`, { errores: validado.error.issues });
    }
    return tipo ? validado.data.filter((e) => e.tipo === tipo) : validado.data;
  }
}
