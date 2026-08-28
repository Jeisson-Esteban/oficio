import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RegistroCapacidades } from './registro-capacidades.js';
import { ErrorValidacion } from '../errores/index.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'capacidades-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('RegistroCapacidades', () => {
  it('carga y valida un catálogo real', async () => {
    const ruta = path.join(dir, 'catalogo.yaml');
    await writeFile(
      ruta,
      `
capacidades:
  - id: guardar_registro
    nombre: Guardar registro
    descripcion: Guarda un registro estructurado (paciente, cliente, proyecto...).
    resolucion: integracion
    interfazProvider: registros.RecordProvider
    metodo: guardar
  - id: identificar_pendientes
    nombre: Identificar pendientes
    descripcion: Analiza texto y extrae puntos pendientes.
    resolucion: razonamiento
`,
      'utf-8',
    );

    const registro = await RegistroCapacidades.cargar(ruta);

    expect(registro.listar()).toHaveLength(2);
    expect(registro.obtener('guardar_registro')?.interfazProvider).toBe('registros.RecordProvider');
    expect(registro.obtener('no_existe')).toBeUndefined();
  });

  it('devuelve un registro vacío si el catálogo todavía no existe', async () => {
    const registro = await RegistroCapacidades.cargar(path.join(dir, 'no-existe.yaml'));
    expect(registro.listar()).toEqual([]);
  });

  it('lanza ErrorValidacion si el catálogo no cumple el schema', async () => {
    const ruta = path.join(dir, 'catalogo-invalido.yaml');
    await writeFile(ruta, 'capacidades:\n  - id: "Mal-Id"\n    nombre: x\n', 'utf-8');

    await expect(RegistroCapacidades.cargar(ruta)).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it('obtenerORequerida lanza ErrorCapacidadNoResuelta si no existe', async () => {
    const registro = await RegistroCapacidades.cargar(path.join(dir, 'no-existe.yaml'));
    expect(() => registro.obtenerORequerida('crear_cita')).toThrow();
  });
});
