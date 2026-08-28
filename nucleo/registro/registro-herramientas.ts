import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { HerramientaSchema, type Herramienta } from '../contratos/herramienta.js';
import { ErrorValidacion } from '../errores/index.js';

/**
 * Catálogo user-facing de Herramientas conocidas (Notion, Google Calendar...).
 * Una entrada en estado "pendiente_evaluacion" existe pero NO se ofrece como
 * conectable hasta que alguien la evalúe — ver regla de no confiar en un
 * hallazgo de find-skills automáticamente.
 */
export class RegistroHerramientas {
  private readonly herramientas = new Map<string, Herramienta>();

  static async cargar(directorio = 'herramientas'): Promise<RegistroHerramientas> {
    const registro = new RegistroHerramientas();

    let archivos: string[];
    try {
      archivos = (await readdir(directorio)).filter((archivo) => archivo.endsWith('.yaml'));
    } catch {
      return registro; // catálogo aún no existe -> registro vacío
    }

    for (const archivo of archivos) {
      const ruta = path.join(directorio, archivo);
      const contenido = await readFile(ruta, 'utf-8');
      const validado = HerramientaSchema.safeParse(parse(contenido));
      if (!validado.success) {
        throw new ErrorValidacion(`"${ruta}" no cumple el schema de herramienta`, {
          errores: validado.error.issues,
        });
      }
      registro.herramientas.set(validado.data.id, validado.data);
    }

    return registro;
  }

  listar(): Herramienta[] {
    return [...this.herramientas.values()];
  }

  obtener(id: string): Herramienta | undefined {
    return this.herramientas.get(id);
  }

  /** Solo Herramientas ya evaluadas y disponibles para conectar — nunca las pendientes. */
  disponiblesParaCapacidad(capacidadId: string): Herramienta[] {
    return this.listar().filter(
      (h) => h.estado === 'disponible' && h.capacidadesQueOfrece.includes(capacidadId),
    );
  }
}
