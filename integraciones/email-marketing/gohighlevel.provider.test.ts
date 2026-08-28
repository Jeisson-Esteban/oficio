import { describe, expect, it, vi } from 'vitest';
import type { MCPAdapter } from '../../nucleo/contratos/mcp-adapter.js';
import { GoHighLevelProvider } from './gohighlevel.provider.js';

function mcpFalso(respuesta: unknown): MCPAdapter {
  return {
    conectar: vi.fn(async () => {}),
    desconectar: vi.fn(async () => {}),
    verificarSalud: vi.fn(async () => ({ ok: true })),
    listarHerramientas: vi.fn(async () => []),
    ejecutarHerramienta: vi.fn(async () => respuesta),
    obtenerCapacidades: () => ({ nombre: 'gohighlevel', version: '0.0.1' }),
  };
}

describe('GoHighLevelProvider (traducción de la interfaz a llamadas MCP, sin red real)', () => {
  it('guardar() envía los datos tal cual al tool de upsert de contactos', async () => {
    const mcp = mcpFalso({ id: 'contacto-1' });
    const provider = new GoHighLevelProvider(mcp);

    const resultado = await provider.guardar('lead', { email: 'lead@example.com', nombre: 'Lead' });

    expect(resultado).toEqual({ id: 'contacto-1' });
    expect(mcp.ejecutarHerramienta).toHaveBeenCalledWith('contacts_upsert', {
      email: 'lead@example.com',
      nombre: 'Lead',
    });
  });

  it('consultar() busca por criterio', async () => {
    const mcp = mcpFalso({ id: 'contacto-1' });
    const provider = new GoHighLevelProvider(mcp);

    await provider.consultar({ tipo: 'lead', criterio: 'lead@example.com' });

    expect(mcp.ejecutarHerramienta).toHaveBeenCalledWith('contacts_lookup', { query: 'lead@example.com' });
  });

  it('generar() pasa el rango de fechas al tool de oportunidades', async () => {
    const mcp = mcpFalso({ items: [] });
    const provider = new GoHighLevelProvider(mcp);

    await provider.generar({ tipoReporte: 'oportunidades', periodo: { desde: '2026-08-01', hasta: '2026-08-31' } });

    expect(mcp.ejecutarHerramienta).toHaveBeenCalledWith('opportunities_search', {
      date_from: '2026-08-01',
      date_to: '2026-08-31',
    });
  });
});
