import { describe, expect, it } from 'vitest';
import { CapacidadSchema } from './capacidad.js';

describe('CapacidadSchema', () => {
  it('acepta una capacidad resuelta por integración con interfazProvider y metodo', () => {
    const resultado = CapacidadSchema.safeParse({
      id: 'crear_cita',
      nombre: 'Crear cita',
      descripcion: 'Agenda una cita en el calendario del profesional.',
      resolucion: 'integracion',
      interfazProvider: 'agenda.CalendarProvider',
      metodo: 'crearEvento',
    });
    expect(resultado.success).toBe(true);
  });

  it('rechaza una capacidad de integración sin interfazProvider/metodo', () => {
    const resultado = CapacidadSchema.safeParse({
      id: 'crear_cita',
      nombre: 'Crear cita',
      descripcion: 'Agenda una cita.',
      resolucion: 'integracion',
    });
    expect(resultado.success).toBe(false);
  });

  it('rechaza una capacidad de logica_negocio sin modulo', () => {
    const resultado = CapacidadSchema.safeParse({
      id: 'calcular_impuestos',
      nombre: 'Calcular impuestos',
      descripcion: 'Calcula impuestos según reglas fiscales.',
      resolucion: 'logica_negocio',
    });
    expect(resultado.success).toBe(false);
  });

  it('acepta una capacidad resuelta por razonamiento sin datos adicionales', () => {
    const resultado = CapacidadSchema.safeParse({
      id: 'identificar_pendientes',
      nombre: 'Identificar pendientes',
      descripcion: 'Analiza notas de sesión e identifica puntos pendientes.',
      resolucion: 'razonamiento',
    });
    expect(resultado.success).toBe(true);
  });

  it('rechaza un id que no está en snake_case', () => {
    const resultado = CapacidadSchema.safeParse({
      id: 'CrearCita',
      nombre: 'Crear cita',
      descripcion: 'x',
      resolucion: 'razonamiento',
    });
    expect(resultado.success).toBe(false);
  });
});
