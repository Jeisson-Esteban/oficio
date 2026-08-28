import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RegistroHerramientas } from './registro-herramientas.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'herramientas-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('RegistroHerramientas', () => {
  it('carga varios archivos .yaml del directorio', async () => {
    await writeFile(
      path.join(dir, 'notion.yaml'),
      `
id: notion
nombre: Notion
descripcion: Espacio de trabajo para notas y bases de datos.
capacidadesQueOfrece: [guardar_registro, consultar_registro]
estado: disponible
`,
      'utf-8',
    );
    await writeFile(
      path.join(dir, 'zernio.yaml'),
      `
id: zernio
nombre: Zernio
descripcion: Gestión de redes sociales.
capacidadesQueOfrece: [publicar_contenido]
estado: pendiente_evaluacion
fuente: find-skills
`,
      'utf-8',
    );

    const registro = await RegistroHerramientas.cargar(dir);

    expect(registro.listar()).toHaveLength(2);
    expect(registro.obtener('notion')?.estado).toBe('disponible');
  });

  it('no ofrece una herramienta pendiente_evaluacion como disponible para una capacidad', async () => {
    await writeFile(
      path.join(dir, 'zernio.yaml'),
      `
id: zernio
nombre: Zernio
descripcion: Gestión de redes sociales.
capacidadesQueOfrece: [publicar_contenido]
estado: pendiente_evaluacion
`,
      'utf-8',
    );

    const registro = await RegistroHerramientas.cargar(dir);

    expect(registro.disponiblesParaCapacidad('publicar_contenido')).toEqual([]);
  });

  it('devuelve un registro vacío si el directorio no existe', async () => {
    const registro = await RegistroHerramientas.cargar(path.join(dir, 'no-existe'));
    expect(registro.listar()).toEqual([]);
  });
});
