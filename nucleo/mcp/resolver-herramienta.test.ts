import { describe, expect, it, vi } from 'vitest';
import type { MCPAdapter } from '../contratos/mcp-adapter.js';
import { resolverHerramienta } from './resolver-herramienta.js';

function mcpFalso(nombres: string[]): MCPAdapter {
  return {
    conectar: vi.fn(async () => {}),
    desconectar: vi.fn(async () => {}),
    verificarSalud: vi.fn(async () => ({ ok: true })),
    listarHerramientas: vi.fn(async () => nombres.map((nombre) => ({ nombre, descripcion: '' }))),
    ejecutarHerramienta: vi.fn(async () => ({})),
    obtenerCapacidades: () => ({ nombre: 'mcp-de-prueba', version: '0.0.1' }),
  };
}

describe('resolverHerramienta', () => {
  it('devuelve el nombre preferido si existe exacto', async () => {
    const mcp = mcpFalso(['create_post', 'get_metrics']);
    expect(await resolverHerramienta(mcp, 'create_post', ['post'])).toBe('create_post');
  });

  it('cae a coincidencia por palabras clave si el preferido no existe', async () => {
    const mcp = mcpFalso(['posts_create_v2', 'metrics_get']);
    expect(await resolverHerramienta(mcp, 'create_post', ['post'])).toBe('posts_create_v2');
  });

  it('exige que TODAS las palabras clave coincidan', async () => {
    const mcp = mcpFalso(['posts_list', 'posts_create_scheduled']);
    expect(await resolverHerramienta(mcp, 'x', ['post', 'scheduled'])).toBe('posts_create_scheduled');
  });

  it('lanza un error claro (con las tools disponibles) si no encuentra nada', async () => {
    const mcp = mcpFalso(['unrelated_tool']);
    await expect(resolverHerramienta(mcp, 'create_post', ['post'])).rejects.toThrow(/mcp-de-prueba/);
  });
});
