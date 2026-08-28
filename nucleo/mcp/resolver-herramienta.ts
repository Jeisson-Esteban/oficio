import type { MCPAdapter } from '../contratos/mcp-adapter.js';
import { ErrorConexionMCP } from '../errores/index.js';

/**
 * Para MCPs que NO garantizan nombres de tool estables/documentados (ej.
 * Zernio: 496 tools, muchas auto-generadas, con su propio mecanismo de
 * "search_tools") -- en vez de adivinar un nombre fijo y arriesgarnos a que
 * cambie, preguntamos al servidor en vivo qué tools tiene y buscamos por
 * coincidencia. Prioriza un nombre exacto preferido si existe.
 */
export async function resolverHerramienta(
  mcp: MCPAdapter,
  preferido: string,
  palabrasClave: string[],
): Promise<string> {
  const herramientas = await mcp.listarHerramientas();

  const porNombreExacto = herramientas.find((h) => h.nombre === preferido);
  if (porNombreExacto) return porNombreExacto.nombre;

  const coincidencia = herramientas.find((h) =>
    palabrasClave.every((palabra) => h.nombre.toLowerCase().includes(palabra)),
  );
  if (coincidencia) return coincidencia.nombre;

  throw new ErrorConexionMCP(
    `No encontré ninguna tool en "${mcp.obtenerCapacidades().nombre}" que coincida con [${palabrasClave.join(', ')}]`,
    { herramientasDisponibles: herramientas.map((h) => h.nombre) },
  );
}
