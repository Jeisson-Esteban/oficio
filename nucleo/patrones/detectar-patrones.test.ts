import { describe, expect, it } from 'vitest';
import type { EventoActividad } from '../logging/registro-actividad.js';
import type { IntegracionActiva } from '../contratos/integracion.js';
import type { Proceso } from '../contratos/proceso.js';
import { detectarPatrones } from './detectar-patrones.js';

const AHORA = new Date('2026-08-20T00:00:00.000Z');

function evento(parcial: Partial<EventoActividad> & { capacidadId: string }): EventoActividad {
  return {
    tipo: 'ejecucion_capacidad',
    perfilId: 'demo',
    herramienta: 'notion',
    ok: true,
    duracionMs: 100,
    fecha: '2026-08-18T10:00:00.000Z',
    ...parcial,
  };
}

describe('detectarPatrones', () => {
  it('no reporta nada con actividad insuficiente (no inventa)', () => {
    const patrones = detectarPatrones({
      perfilId: 'demo',
      actividad: [evento({ capacidadId: 'consultar_registro' })],
      procesos: [],
      integraciones: [],
      ahora: AHORA,
    });
    expect(patrones).toEqual([]);
  });

  it('sugiere "proceso_candidato" cuando una capacidad se usa 3+ veces sin estar en ningún Proceso', () => {
    const actividad = [
      evento({ capacidadId: 'consultar_registro', fecha: '2026-08-15T10:00:00.000Z' }),
      evento({ capacidadId: 'consultar_registro', fecha: '2026-08-16T10:00:00.000Z' }),
      evento({ capacidadId: 'consultar_registro', fecha: '2026-08-17T10:00:00.000Z' }),
    ];
    const patrones = detectarPatrones({ perfilId: 'demo', actividad, procesos: [], integraciones: [], ahora: AHORA });

    expect(patrones).toHaveLength(1);
    expect(patrones[0]).toMatchObject({ id: 'proceso-candidato-consultar_registro', categoria: 'proceso_candidato' });
    expect(patrones[0]!.evidencia.length).toBeGreaterThan(0);
  });

  it('no sugiere proceso_candidato si la capacidad ya está en un Proceso guardado', () => {
    const actividad = [
      evento({ capacidadId: 'consultar_agenda' }),
      evento({ capacidadId: 'consultar_agenda' }),
      evento({ capacidadId: 'consultar_agenda' }),
    ];
    const procesos: Proceso[] = [
      {
        id: 'preparacion-sesion',
        nombre: 'Preparación de sesión',
        descripcion: '...',
        disparador: { tipo: 'manual' },
        pasos: [{ descripcion: 'x', capacidad: 'consultar_agenda' }],
        reglas: [],
        capacidadesUsadas: ['consultar_agenda'],
        estado: 'activo',
        version: 1,
        creadoEn: '2026-08-01T00:00:00.000Z',
        actualizadoEn: '2026-08-01T00:00:00.000Z',
        historial: [],
      },
    ];

    const patrones = detectarPatrones({ perfilId: 'demo', actividad, procesos, integraciones: [], ahora: AHORA });

    expect(patrones.filter((p) => p.categoria === 'proceso_candidato')).toEqual([]);
  });

  it('alerta "fallo_recurrente" cuando >=2 fallos y >=50% de tasa de error', () => {
    const actividad = [
      evento({ capacidadId: 'consultar_agenda', ok: false, error: 'credenciales faltantes' }),
      evento({ capacidadId: 'consultar_agenda', ok: false, error: 'credenciales faltantes' }),
      evento({ capacidadId: 'consultar_agenda', ok: true }),
    ];
    const patrones = detectarPatrones({ perfilId: 'demo', actividad, procesos: [], integraciones: [], ahora: AHORA });

    expect(patrones.some((p) => p.categoria === 'fallo_recurrente')).toBe(true);
  });

  it('no alerta fallo_recurrente si la tasa de error es baja', () => {
    const actividad = [
      evento({ capacidadId: 'consultar_agenda', ok: false }),
      evento({ capacidadId: 'consultar_agenda', ok: true }),
      evento({ capacidadId: 'consultar_agenda', ok: true }),
      evento({ capacidadId: 'consultar_agenda', ok: true }),
      evento({ capacidadId: 'consultar_agenda', ok: true }),
    ];
    const patrones = detectarPatrones({ perfilId: 'demo', actividad, procesos: [], integraciones: [], ahora: AHORA });

    expect(patrones.some((p) => p.categoria === 'fallo_recurrente')).toBe(false);
  });

  it('marca "proceso_dormido" un Proceso activo, viejo, sin ejecuciones recientes', () => {
    const procesos: Proceso[] = [
      {
        id: 'seguimiento-viejo',
        nombre: 'Seguimiento viejo',
        descripcion: '...',
        disparador: { tipo: 'manual' },
        pasos: [{ descripcion: 'x', capacidad: 'generar_reporte' }],
        reglas: [],
        capacidadesUsadas: ['generar_reporte'],
        estado: 'activo',
        version: 1,
        creadoEn: '2026-07-01T00:00:00.000Z',
        actualizadoEn: '2026-07-01T00:00:00.000Z',
        historial: [],
      },
    ];

    const patrones = detectarPatrones({ perfilId: 'demo', actividad: [], procesos, integraciones: [], ahora: AHORA });

    expect(patrones.some((p) => p.id === 'proceso-dormido-seguimiento-viejo')).toBe(true);
  });

  it('no marca dormido un Proceso reciente (menos de 7 días)', () => {
    const procesos: Proceso[] = [
      {
        id: 'nuevo',
        nombre: 'Nuevo',
        descripcion: '...',
        disparador: { tipo: 'manual' },
        pasos: [{ descripcion: 'x', capacidad: 'generar_reporte' }],
        reglas: [],
        capacidadesUsadas: ['generar_reporte'],
        estado: 'activo',
        version: 1,
        creadoEn: '2026-08-19T00:00:00.000Z',
        actualizadoEn: '2026-08-19T00:00:00.000Z',
        historial: [],
      },
    ];

    const patrones = detectarPatrones({ perfilId: 'demo', actividad: [], procesos, integraciones: [], ahora: AHORA });

    expect(patrones.some((p) => p.categoria === 'proceso_dormido')).toBe(false);
  });

  it('marca "integracion_sin_uso" una Integración vieja sin ninguna ejecución de sus Capacidades', () => {
    const integraciones: IntegracionActiva[] = [
      {
        herramienta: 'klaviyo',
        capacidadesHabilitadas: ['consultar_metricas'],
        credencialesRef: 'KLAVIYO__DEFAULT__TOKEN',
        conectadoEn: '2026-07-01T00:00:00.000Z',
        estado: 'activa',
      },
    ];

    const patrones = detectarPatrones({ perfilId: 'demo', actividad: [], procesos: [], integraciones, ahora: AHORA });

    expect(patrones.some((p) => p.id === 'integracion-sin-uso-klaviyo')).toBe(true);
  });

  it('ordena los patrones por severidad descendente', () => {
    const actividad = [
      evento({ capacidadId: 'a', ok: false, error: 'x' }),
      evento({ capacidadId: 'a', ok: false, error: 'x' }),
      evento({ capacidadId: 'b' }),
      evento({ capacidadId: 'b' }),
      evento({ capacidadId: 'b' }),
    ];
    const patrones = detectarPatrones({ perfilId: 'demo', actividad, procesos: [], integraciones: [], ahora: AHORA });

    const severidades = patrones.map((p) => p.severidad);
    expect(severidades).toEqual([...severidades].sort((a, b) => b - a));
  });
});
