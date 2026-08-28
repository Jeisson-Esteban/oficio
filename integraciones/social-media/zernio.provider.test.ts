import { describe, expect, it, vi } from 'vitest';
import type { MCPAdapter } from '../../nucleo/contratos/mcp-adapter.js';
import { ZernioProvider } from './zernio.provider.js';

function mcpFalso(nombresHerramientas: string[], respuesta: unknown = {}): MCPAdapter {
  return {
    conectar: vi.fn(async () => {}),
    desconectar: vi.fn(async () => {}),
    verificarSalud: vi.fn(async () => ({ ok: true })),
    listarHerramientas: vi.fn(async () => nombresHerramientas.map((nombre) => ({ nombre, descripcion: '' }))),
    ejecutarHerramienta: vi.fn(async () => respuesta),
    obtenerCapacidades: () => ({ nombre: 'zernio', version: '0.0.1' }),
  };
}

describe('ZernioProvider (resuelve el nombre de tool en vivo, sin red real)', () => {
  it('publicar() resuelve "create_post" cuando existe exacto y manda texto/media/redes', async () => {
    const mcp = mcpFalso(['create_post', 'get_analytics'], { id: 'post-1' });
    const provider = new ZernioProvider(mcp);

    const resultado = await provider.publicar({
      texto: 'Hola mundo',
      urlMedia: 'https://ejemplo.com/video.mp4',
      redes: ['instagram', 'tiktok'],
    });

    expect(resultado.ok).toBe(true);
    expect(mcp.ejecutarHerramienta).toHaveBeenCalledWith('create_post', {
      content: 'Hola mundo',
      media_url: 'https://ejemplo.com/video.mp4',
      platforms: ['instagram', 'tiktok'],
      scheduled_at: undefined,
    });
  });

  it('publicar() cae a una tool con nombre distinto si "create_post" no existe pero algo con "post" sí', async () => {
    const mcp = mcpFalso(['social_post_create_v3']);
    const provider = new ZernioProvider(mcp);

    await provider.publicar({ redes: ['x'] });

    expect(mcp.ejecutarHerramienta).toHaveBeenCalledWith('social_post_create_v3', expect.any(Object));
  });

  it('consultarMetricas() resuelve una tool de analítica y pasa la plataforma y el periodo', async () => {
    const mcp = mcpFalso(['get_analytics'], { alcance: 1000 });
    const provider = new ZernioProvider(mcp);

    const resultado = await provider.consultarMetricas('instagram', { desde: '2026-08-01', hasta: '2026-08-31' });

    expect(resultado).toEqual({ tipoMetrica: 'instagram', detalle: { alcance: 1000 } });
    expect(mcp.ejecutarHerramienta).toHaveBeenCalledWith('get_analytics', {
      platform: 'instagram',
      date_from: '2026-08-01',
      date_to: '2026-08-31',
    });
  });
});
