import { AlmacenCredencialesEntorno } from '../configuracion/variables-entorno.js';
import { RegistroHerramientas } from '../registro/registro-herramientas.js';
import { RegistroMCP } from '../registro/registro-mcp.js';
import { imprimir } from './util.js';

/**
 * Conecta a un MCP externo YA REGISTRADO en mcp-registry.config.yaml (por
 * HTTP o como proceso local) con credenciales reales (.env) y muestra
 * exactamente qué tools expone.
 *
 * Úsalo para confirmar o corregir los nombres de tools "mejor hipótesis"
 * que hay comentados como TOOLS/TOOL_PREFERIDO_* en cada *.provider.ts --
 * son suposiciones documentadas, no verificadas contra un servidor real.
 *
 * uso: npx tsx nucleo/cli/inspeccionar-mcp.ts <mcpId>   (ej. mailerlite, klaviyo, zernio, metricool)
 * Los campos de credenciales requeridos se leen de herramientas/<mcpId>.yaml si existe
 * (mismo id); si no, cae a pedir solo "token".
 */
const mcpId = process.argv[2];
if (!mcpId) throw new Error('uso: inspeccionar-mcp.ts <mcpId>');

const registroHerramientas = await RegistroHerramientas.cargar();
const camposCredenciales = registroHerramientas.obtener(mcpId)?.camposCredenciales ?? ['token'];

const registro = await RegistroMCP.cargar();
const credenciales = new AlmacenCredencialesEntorno({ [mcpId]: camposCredenciales });
const adaptador = await registro.obtenerAdaptador(mcpId, credenciales, { proveedor: mcpId });

const salud = await adaptador.verificarSalud();
const herramientas = await adaptador.listarHerramientas();
await adaptador.desconectar();

imprimir({ mcpId, salud, capacidades: adaptador.obtenerCapacidades(), herramientas });
