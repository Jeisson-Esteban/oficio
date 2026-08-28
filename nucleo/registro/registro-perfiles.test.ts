import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RegistroPerfiles } from './registro-perfiles.js';
import type { Perfil } from '../contratos/perfil.js';
import type { Proceso } from '../contratos/proceso.js';

let dir: string;
let registro: RegistroPerfiles;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'perfiles-'));
  registro = new RegistroPerfiles(dir);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const perfilDemo: Perfil = {
  id: 'psicologo-demo',
  profesion: 'Psicólogo',
  nombreDisplay: 'Dr. Demo',
  creadoEn: '2026-08-15T00:00:00.000Z',
  preferencias: {},
};

const procesoDemo: Proceso = {
  id: 'preparacion-sesion',
  nombre: 'Preparación de sesión',
  descripcion: 'Antes de cada sesión, revisa las notas anteriores del paciente.',
  disparador: { tipo: 'manual' },
  pasos: [
    { descripcion: 'Identificar al paciente de la próxima cita', capacidad: 'consultar_agenda' },
    { descripcion: 'Buscar las últimas 3 sesiones del paciente', capacidad: 'buscar_historial' },
    { descripcion: 'Identificar puntos pendientes' },
  ],
  reglas: [{ texto: 'Si el paciente es nuevo, avisar que es su primera sesión en vez de buscar historial.' }],
  capacidadesUsadas: ['consultar_agenda', 'buscar_historial'],
  estado: 'activo',
  version: 1,
  creadoEn: '2026-08-15T00:00:00.000Z',
  actualizadoEn: '2026-08-15T00:00:00.000Z',
  historial: [],
};

describe('RegistroPerfiles', () => {
  it('devuelve undefined si el perfil no existe todavía', async () => {
    expect(await registro.obtenerPerfil('no-existe')).toBeUndefined();
  });

  it('guarda y recupera un perfil', async () => {
    await registro.guardarPerfil(perfilDemo);
    const recuperado = await registro.obtenerPerfil('psicologo-demo');
    expect(recuperado).toEqual(perfilDemo);
  });

  it('guarda, lista y recupera un proceso por id', async () => {
    await registro.guardarPerfil(perfilDemo);
    await registro.guardarProceso(perfilDemo.id, procesoDemo);

    const procesos = await registro.listarProcesos(perfilDemo.id);
    expect(procesos).toHaveLength(1);

    const recuperado = await registro.obtenerProceso(perfilDemo.id, 'preparacion-sesion');
    expect(recuperado?.nombre).toBe('Preparación de sesión');
  });

  it('una modificación conversacional se refleja subiendo version y agregando historial', async () => {
    await registro.guardarProceso(perfilDemo.id, procesoDemo);

    const modificado: Proceso = {
      ...procesoDemo,
      pasos: procesoDemo.pasos.map((p) =>
        p.descripcion.includes('últimas 3') ? { ...p, descripcion: 'Buscar las últimas 5 sesiones del paciente' } : p,
      ),
      version: 2,
      actualizadoEn: '2026-08-16T00:00:00.000Z',
      historial: [{ version: 2, cambio: 'Cambié de revisar 3 a 5 sesiones anteriores', fecha: '2026-08-16T00:00:00.000Z' }],
    };
    await registro.guardarProceso(perfilDemo.id, modificado);

    const recuperado = await registro.obtenerProceso(perfilDemo.id, 'preparacion-sesion');
    expect(recuperado?.version).toBe(2);
    expect(recuperado?.historial).toHaveLength(1);
    expect(recuperado?.pasos.some((p) => p.descripcion.includes('5 sesiones'))).toBe(true);
  });

  it('registra una integración activa con capacidades habilitadas explícitas', async () => {
    await registro.guardarIntegracionActiva(perfilDemo.id, {
      herramienta: 'notion',
      capacidadesHabilitadas: ['guardar_registro', 'consultar_registro'],
      credencialesRef: 'NOTION__DEFAULT__TOKEN',
      conectadoEn: '2026-08-15T00:00:00.000Z',
      estado: 'activa',
    });

    const integraciones = await registro.listarIntegracionesActivas(perfilDemo.id);
    expect(integraciones).toHaveLength(1);
    expect(integraciones[0]?.capacidadesHabilitadas).toEqual(['guardar_registro', 'consultar_registro']);
  });
});
