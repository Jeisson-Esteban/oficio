import { describe, expect, it, vi } from 'vitest';
import type { MCPAdapter } from '../../nucleo/contratos/mcp-adapter.js';
import { MailerLiteProvider } from './mailerlite.provider.js';

function mcpFalso(respuesta: unknown): MCPAdapter {
  return {
    conectar: vi.fn(async () => {}),
    desconectar: vi.fn(async () => {}),
    verificarSalud: vi.fn(async () => ({ ok: true })),
    listarHerramientas: vi.fn(async () => []),
    ejecutarHerramienta: vi.fn(async () => respuesta),
    obtenerCapacidades: () => ({ nombre: 'mailerlite', version: '0.0.1' }),
  };
}

describe('MailerLiteProvider (traducción de la interfaz a llamadas MCP, sin red real)', () => {
  it('guardar() llama al tool de crear suscriptor con el email y los campos', async () => {
    const mcp = mcpFalso({ id: 'sub-1' });
    const provider = new MailerLiteProvider(mcp);

    const resultado = await provider.guardar('contacto', { email: 'juan@example.com', nombre: 'Juan' });

    expect(resultado).toEqual({ id: 'sub-1' });
    expect(mcp.ejecutarHerramienta).toHaveBeenCalledWith('create_subscriber', {
      email: 'juan@example.com',
      fields: { email: 'juan@example.com', nombre: 'Juan' },
    });
  });

  it('consultar() busca por email', async () => {
    const mcp = mcpFalso({ id: 'sub-1', email: 'juan@example.com' });
    const provider = new MailerLiteProvider(mcp);

    const resultado = await provider.consultar({ tipo: 'contacto', criterio: 'juan@example.com' });

    expect(resultado).toEqual({ id: 'sub-1', email: 'juan@example.com' });
    expect(mcp.ejecutarHerramienta).toHaveBeenCalledWith('get_subscriber', { email: 'juan@example.com' });
  });

  it('generar() y consultarMetricas() pasan el rango de fechas al MCP', async () => {
    const mcp = mcpFalso({ ok: true });
    const provider = new MailerLiteProvider(mcp);

    await provider.generar({ tipoReporte: 'campañas', periodo: { desde: '2026-08-01', hasta: '2026-08-31' } });
    expect(mcp.ejecutarHerramienta).toHaveBeenCalledWith('list_campaigns', {
      date_from: '2026-08-01',
      date_to: '2026-08-31',
    });

    await provider.consultarMetricas('camp-1', { desde: '2026-08-01', hasta: '2026-08-31' });
    expect(mcp.ejecutarHerramienta).toHaveBeenCalledWith('get_campaign_stats', {
      campaign_id: 'camp-1',
      date_from: '2026-08-01',
      date_to: '2026-08-31',
    });
  });
});
