import { describe, expect, it, vi } from 'vitest';
import type { MCPAdapter } from '../../nucleo/contratos/mcp-adapter.js';
import { MetricoolProvider } from './metricool.provider.js';

function mcpFalso(nombresHerramientas: string[], respuesta: unknown = {}): MCPAdapter {
  return {
    conectar: vi.fn(async () => {}),
    desconectar: vi.fn(async () => {}),
    verificarSalud: vi.fn(async () => ({ ok: true })),
    listarHerramientas: vi.fn(async () => nombresHerramientas.map((nombre) => ({ nombre, descripcion: '' }))),
    ejecutarHerramienta: vi.fn(async () => respuesta),
    obtenerCapacidades: () => ({ nombre: 'metricool', version: '0.0.1' }),
  };
}

describe('MetricoolProvider (proceso local via stdio, sin red real en el test)', () => {
  it('publicar() incluye el blogId configurado y los datos del contenido', async () => {
    const mcp = mcpFalso(['schedule_post'], { id: 'post-1' });
    const provider = new MetricoolProvider(mcp, 'blog-123');

    const resultado = await provider.publicar({ texto: 'Nuevo video', redes: ['tiktok', 'instagram'] });

    expect(resultado.ok).toBe(true);
    expect(mcp.ejecutarHerramienta).toHaveBeenCalledWith('schedule_post', {
      blog_id: 'blog-123',
      text: 'Nuevo video',
      media_url: undefined,
      providers: ['tiktok', 'instagram'],
      scheduled_at: undefined,
    });
  });

  it('consultarMetricas() incluye blogId, red y periodo', async () => {
    const mcp = mcpFalso(['get_metrics'], { seguidores: 500 });
    const provider = new MetricoolProvider(mcp, 'blog-123');

    const resultado = await provider.consultarMetricas('instagram', { desde: '2026-08-01', hasta: '2026-08-31' });

    expect(resultado).toEqual({ tipoMetrica: 'instagram', detalle: { seguidores: 500 } });
    expect(mcp.ejecutarHerramienta).toHaveBeenCalledWith('get_metrics', {
      blog_id: 'blog-123',
      network: 'instagram',
      date_from: '2026-08-01',
      date_to: '2026-08-31',
    });
  });
});
