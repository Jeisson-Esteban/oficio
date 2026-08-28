import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { IntegracionActivaSchema, type IntegracionActiva } from '../contratos/integracion.js';
import { PerfilSchema, type Perfil } from '../contratos/perfil.js';
import { ProcesoSchema, type Proceso } from '../contratos/proceso.js';
import { ErrorValidacion } from '../errores/index.js';

/**
 * ÚNICO punto del sistema que lee o escribe perfiles/<id>/*.yaml.
 *
 * El profesional nunca abre estos archivos (ver regla: YAML es representación
 * interna) — solo las herramientas genéricas de infraestructura (ej.
 * guardar_proceso, modificar_proceso) llaman a esta clase, siempre después de
 * que Claude mostró el cambio y el profesional lo confirmó hablando.
 */
export class RegistroPerfiles {
  constructor(private readonly raiz = 'perfiles') {}

  private rutaPerfil(perfilId: string): string {
    return path.join(this.raiz, perfilId, 'perfil.yaml');
  }

  private rutaIntegraciones(perfilId: string): string {
    return path.join(this.raiz, perfilId, 'integraciones-activas.yaml');
  }

  private rutaCarpetaProcesos(perfilId: string): string {
    return path.join(this.raiz, perfilId, 'procesos');
  }

  async obtenerPerfil(perfilId: string): Promise<Perfil | undefined> {
    let contenido: string;
    try {
      contenido = await readFile(this.rutaPerfil(perfilId), 'utf-8');
    } catch {
      return undefined;
    }
    const validado = PerfilSchema.safeParse(parse(contenido));
    if (!validado.success) {
      throw new ErrorValidacion(`perfil "${perfilId}" inválido`, { errores: validado.error.issues });
    }
    return validado.data;
  }

  async guardarPerfil(perfil: Perfil): Promise<void> {
    const validado = PerfilSchema.parse(perfil);
    const ruta = this.rutaPerfil(validado.id);
    await mkdir(path.dirname(ruta), { recursive: true });
    await writeFile(ruta, stringify(validado), 'utf-8');
  }

  async listarPerfiles(): Promise<Perfil[]> {
    let carpetas: string[];
    try {
      carpetas = (await readdir(this.raiz, { withFileTypes: true }))
        .filter((entrada) => entrada.isDirectory())
        .map((entrada) => entrada.name);
    } catch {
      return [];
    }
    const perfiles: Perfil[] = [];
    for (const id of carpetas) {
      const perfil = await this.obtenerPerfil(id);
      if (perfil) perfiles.push(perfil);
    }
    return perfiles;
  }

  async listarProcesos(perfilId: string): Promise<Proceso[]> {
    const dir = this.rutaCarpetaProcesos(perfilId);
    let archivos: string[];
    try {
      archivos = (await readdir(dir)).filter((archivo) => archivo.endsWith('.yaml'));
    } catch {
      return [];
    }
    const procesos: Proceso[] = [];
    for (const archivo of archivos) {
      const contenido = await readFile(path.join(dir, archivo), 'utf-8');
      const validado = ProcesoSchema.safeParse(parse(contenido));
      if (!validado.success) {
        throw new ErrorValidacion(`proceso "${archivo}" de "${perfilId}" inválido`, {
          errores: validado.error.issues,
        });
      }
      procesos.push(validado.data);
    }
    return procesos;
  }

  async obtenerProceso(perfilId: string, procesoId: string): Promise<Proceso | undefined> {
    const procesos = await this.listarProcesos(perfilId);
    return procesos.find((proceso) => proceso.id === procesoId);
  }

  async guardarProceso(perfilId: string, proceso: Proceso): Promise<void> {
    const validado = ProcesoSchema.parse(proceso);
    const dir = this.rutaCarpetaProcesos(perfilId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${validado.id}.yaml`), stringify(validado), 'utf-8');
  }

  async listarIntegracionesActivas(perfilId: string): Promise<IntegracionActiva[]> {
    let contenido: string;
    try {
      contenido = await readFile(this.rutaIntegraciones(perfilId), 'utf-8');
    } catch {
      return [];
    }
    const datos = parse(contenido) ?? { integraciones: [] };
    const validado = IntegracionActivaSchema.array().safeParse(datos.integraciones ?? []);
    if (!validado.success) {
      throw new ErrorValidacion(`integraciones activas de "${perfilId}" inválidas`, {
        errores: validado.error.issues,
      });
    }
    return validado.data;
  }

  async guardarIntegracionActiva(perfilId: string, integracion: IntegracionActiva): Promise<void> {
    const validado = IntegracionActivaSchema.parse(integracion);
    const existentes = await this.listarIntegracionesActivas(perfilId);
    const actualizadas = [
      ...existentes.filter((i) => i.herramienta !== validado.herramienta),
      validado,
    ];
    const ruta = this.rutaIntegraciones(perfilId);
    await mkdir(path.dirname(ruta), { recursive: true });
    await writeFile(ruta, stringify({ integraciones: actualizadas }), 'utf-8');
  }
}
