import { describe, expect, it, vi } from 'vitest';
import { NeonProvider, type Ejecutor } from './neon.provider.js';

function ejecutorFalso(filas: Record<string, unknown>[]): Ejecutor {
  return { query: vi.fn(async () => ({ rows: filas })) };
}

describe('NeonProvider (SQL sin Postgres real -- ejecutor inyectado)', () => {
  it('guardar() inserta y devuelve el id generado', async () => {
    const ejecutor = ejecutorFalso([{ id: 42 }]);
    const provider = new NeonProvider(ejecutor);

    const resultado = await provider.guardar('cliente', { nombre: 'Ana', criterio: 'ana@example.com' });

    expect(resultado).toEqual({ id: '42' });
    expect(ejecutor.query).toHaveBeenCalledWith(
      'INSERT INTO registros (tipo, criterio, referencia, datos) VALUES ($1, $2, $3, $4) RETURNING id',
      ['cliente', 'ana@example.com', null, JSON.stringify({ nombre: 'Ana', criterio: 'ana@example.com' })],
    );
  });

  it('consultar() filtra por tipo y criterio', async () => {
    const ejecutor = ejecutorFalso([{ id: 1, tipo: 'cliente' }]);
    const provider = new NeonProvider(ejecutor);

    const resultado = await provider.consultar({ tipo: 'cliente', criterio: 'ana@example.com' });

    expect(resultado).toEqual({ id: 1, tipo: 'cliente' });
    expect(ejecutor.query).toHaveBeenCalledWith(expect.stringContaining('WHERE tipo = $1 AND criterio = $2'), [
      'cliente',
      'ana@example.com',
    ]);
  });

  it('consultar() devuelve undefined si no hay filas', async () => {
    const ejecutor = ejecutorFalso([]);
    const provider = new NeonProvider(ejecutor);

    expect(await provider.consultar({ tipo: 'cliente', criterio: 'nadie' })).toBeUndefined();
  });

  it('buscarHistorial() respeta tipo, referencia y cantidad', async () => {
    const ejecutor = ejecutorFalso([{ id: 3 }, { id: 2 }, { id: 1 }]);
    const provider = new NeonProvider(ejecutor);

    const resultado = await provider.buscarHistorial('sesion', 'ana@example.com', 3);

    expect(resultado).toHaveLength(3);
    expect(ejecutor.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $3'), [
      'sesion',
      'ana@example.com',
      3,
    ]);
  });

  it('consultarMetricas() cuenta registros de un tipo en un periodo', async () => {
    const ejecutor = ejecutorFalso([{ total: '7' }]);
    const provider = new NeonProvider(ejecutor);

    const resultado = await provider.consultarMetricas('cliente', { desde: '2026-08-01', hasta: '2026-08-31' });

    expect(resultado).toEqual({ tipoMetrica: 'cliente', total: 7 });
  });
});
