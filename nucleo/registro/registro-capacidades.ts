import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { z } from 'zod';
import { CapacidadSchema, type Capacidad } from '../contratos/capacidad.js';
import { ErrorCapacidadNoResuelta, ErrorValidacion } from '../errores/index.js';

const CatalogoCapacidadesSchema = z.object({ capacidades: z.array(CapacidadSchema) });

/**
 * Catálogo de "qué puede hacer el sistema", independiente de con qué
 * Herramienta lo hace. Es el puente entre el dominio (Proceso habla de
 * Capacidades) y la infraestructura (cada Capacidad se resuelve con un
 * Provider, código propio, o razonamiento de Claude).
 */
export class RegistroCapacidades {
  private readonly capacidades = new Map<string, Capacidad>();

  static async cargar(rutaCatalogo = 'capacidades/catalogo.yaml'): Promise<RegistroCapacidades> {
    const registro = new RegistroCapacidades();
    let contenido: string;
    try {
      contenido = await readFile(rutaCatalogo, 'utf-8');
    } catch {
      return registro; // catálogo aún no existe (ej. Fase 1 sin Fase 2 todavía) -> registro vacío, no un error
    }

    const datos = parse(contenido) ?? { capacidades: [] };
    const validado = CatalogoCapacidadesSchema.safeParse(datos);
    if (!validado.success) {
      throw new ErrorValidacion(`"${rutaCatalogo}" no cumple el schema de capacidades`, {
        errores: validado.error.issues,
      });
    }

    for (const capacidad of validado.data.capacidades) {
      registro.capacidades.set(capacidad.id, capacidad);
    }
    return registro;
  }

  listar(): Capacidad[] {
    return [...this.capacidades.values()];
  }

  obtener(id: string): Capacidad | undefined {
    return this.capacidades.get(id);
  }

  obtenerORequerida(id: string): Capacidad {
    const capacidad = this.capacidades.get(id);
    if (!capacidad) {
      throw new ErrorCapacidadNoResuelta(`La capacidad "${id}" no existe en el catálogo`);
    }
    return capacidad;
  }
}
