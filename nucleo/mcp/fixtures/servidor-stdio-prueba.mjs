// Servidor MCP mínimo por stdio, usado solo por adaptador-mcp-generico.test.ts
// para probar de verdad el transporte stdio (no HTTP) sin depender de un
// servicio externo real.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const servidor = new McpServer({ name: 'mcp-stdio-de-prueba', version: '0.0.1' });

servidor.registerTool(
  'saludar',
  { description: 'Saluda a alguien por su nombre', inputSchema: { nombre: z.string() } },
  async ({ nombre }) => ({ content: [{ type: 'text', text: `Hola, ${nombre}` }] }),
);

await servidor.connect(new StdioServerTransport());
