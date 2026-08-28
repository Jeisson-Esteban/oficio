import { fileURLToPath } from 'node:url';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AdaptadorMCPGenerico } from './adaptador-mcp-generico.js';

const RUTA_SERVIDOR_STDIO = fileURLToPath(new URL('./fixtures/servidor-stdio-prueba.mjs', import.meta.url));

/**
 * No usamos mocks para el cliente MCP: levantamos un servidor MCP real (del
 * mismo SDK) conectado por un transporte en memoria, para probar que el
 * adaptador de verdad habla el protocolo, no solo que llama a funciones que
 * nosotros mismos inventamos.
 */
async function crearServidorDePrueba() {
  const servidor = new McpServer({ name: 'mcp-de-prueba', version: '0.0.1' });

  servidor.registerTool(
    'saludar',
    {
      description: 'Saluda a alguien por su nombre',
      inputSchema: { nombre: z.string() },
    },
    async ({ nombre }) => ({
      content: [{ type: 'text', text: `Hola, ${nombre}` }],
    }),
  );

  const [transporteServidor, transporteCliente] = InMemoryTransport.createLinkedPair();
  await servidor.connect(transporteServidor);
  return transporteCliente;
}

describe('AdaptadorMCPGenerico (integración real con el SDK de MCP)', () => {
  it('conecta, lista herramientas, ejecuta una y verifica salud', async () => {
    const transporteCliente = await crearServidorDePrueba();
    const adaptador = new AdaptadorMCPGenerico({
      id: 'mcp-de-prueba',
      url: 'in-memory://no-se-usa',
      transporte: transporteCliente,
    });

    await adaptador.conectar();

    const herramientas = await adaptador.listarHerramientas();
    expect(herramientas.map((h) => h.nombre)).toContain('saludar');

    const resultado = (await adaptador.ejecutarHerramienta('saludar', { nombre: 'Jeisson' })) as {
      content: { type: string; text: string }[];
    };
    expect(resultado.content[0]?.text).toBe('Hola, Jeisson');

    const salud = await adaptador.verificarSalud();
    expect(salud.ok).toBe(true);

    await adaptador.desconectar();
  });

  it('funciona también por transporte stdio (proceso local), no solo HTTP/en memoria', async () => {
    const adaptador = new AdaptadorMCPGenerico({
      id: 'mcp-stdio-de-prueba',
      comando: process.execPath,
      argumentos: [RUTA_SERVIDOR_STDIO],
    });

    try {
      await adaptador.conectar();

      const herramientas = await adaptador.listarHerramientas();
      expect(herramientas.map((h) => h.nombre)).toContain('saludar');

      const resultado = (await adaptador.ejecutarHerramienta('saludar', { nombre: 'Ana' })) as {
        content: { type: string; text: string }[];
      };
      expect(resultado.content[0]?.text).toBe('Hola, Ana');
    } finally {
      await adaptador.desconectar();
    }
  }, 15_000);

  it('obtenerCapacidades expone el id configurado del MCP', async () => {
    const transporteCliente = await crearServidorDePrueba();
    const adaptador = new AdaptadorMCPGenerico({
      id: 'mcp-de-prueba',
      url: 'in-memory://no-se-usa',
      transporte: transporteCliente,
    });

    await adaptador.conectar();

    expect(adaptador.obtenerCapacidades().nombre).toBe('mcp-de-prueba');
  });
});
