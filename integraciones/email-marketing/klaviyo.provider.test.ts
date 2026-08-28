import { describe, expect, it, vi } from 'vitest';
import type { MCPAdapter } from '../../nucleo/contratos/mcp-adapter.js';
import { KlaviyoProvider } from './klaviyo.provider.js';

function mcpFalso(respuesta: unknown): MCPAdapter {
  return {
    conectar: vi.fn(async () => {}),
    desconectar: vi.fn(async () => {}),
    verificarSalud: vi.fn(async () => ({ ok: true })),
    listarHerramientas: vi.fn(async () => []),
    ejecutarHerramienta: vi.fn(async () => respuesta),
    obtenerCapacidades: () => ({ nombre: 'klaviyo', version: '0.0.1' }),
  };
}

describe('KlaviyoProvider (traducción de la interfaz a llamadas MCP, sin red real)', () => {
  it('guardar() crea/actualiza un perfil con el email como identificador', async () => {
    const mcp = mcpFalso({ id: 'perfil-1' });
    const provider = new KlaviyoProvider(mcp);

    const resultado = await provider.guardar('contacto', { email: 'ana@example.com', nombre: 'Ana' });

    expect(resultado).toEqual({ id: 'perfil-1' });
    expect(mcp.ejecutarHerramienta).toHaveBeenCalledWith('create_or_update_profile', {
      email: 'ana@example.com',
      attributes: { email: 'ana@example.com', nombre: 'Ana' },
    });
  });

  it('consultar() busca un perfil por email', async () => {
    const mcp = mcpFalso({ id: 'perfil-1' });
    const provider = new KlaviyoProvider(mcp);

    await provider.consultar({ tipo: 'contacto', criterio: 'ana@example.com' });

    expect(mcp.ejecutarHerramienta).toHaveBeenCalledWith('get_profile', { email: 'ana@example.com' });
  });

  it('consultarMetricas() pasa el id de campaña y el rango de fechas', async () => {
    const mcp = mcpFalso({ enviados: 100 });
    const provider = new KlaviyoProvider(mcp);

    const resultado = await provider.consultarMetricas('camp-1', { desde: '2026-08-01', hasta: '2026-08-31' });

    expect(resultado).toEqual({ enviados: 100 });
    expect(mcp.ejecutarHerramienta).toHaveBeenCalledWith('get_campaign_metrics', {
      campaign_id: 'camp-1',
      date_from: '2026-08-01',
      date_to: '2026-08-31',
    });
  });
});
