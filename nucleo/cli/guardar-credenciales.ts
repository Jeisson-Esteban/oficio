import { guardarCredencialesLocal } from '../configuracion/almacen-credenciales.js';
import { claveEntorno } from '../configuracion/variables-entorno.js';
import { RegistroHerramientas } from '../registro/registro-herramientas.js';
import { imprimir, leerArgumentoJSON } from './util.js';

/**
 * Guarda credenciales de una Herramienta cifradas en disco (nunca en texto
 * plano) -- ver almacen-credenciales.ts y conectar-herramienta SKILL.md paso 4.
 *
 * Solo para cuando NO se puede levantar la interfaz web local
 * (nucleo/web/servidor.ts) para que el profesional pegue sus datos ahí
 * directamente en el navegador -- esa sigue siendo la opción preferida,
 * porque el valor nunca pasa por la conversación con Claude.
 *
 * uso: npx tsx nucleo/cli/guardar-credenciales.ts <herramientaId> <camposJson>
 * donde camposJson es { "token": "...", "databaseId": "..." } (inline o "@archivo.json")
 */
const [, , herramientaId, camposArg] = process.argv;
if (!herramientaId || !camposArg) {
  throw new Error('uso: guardar-credenciales.ts <herramientaId> <camposJson>');
}

const registroHerramientas = await RegistroHerramientas.cargar();
const herramienta = registroHerramientas.obtener(herramientaId);
if (!herramienta) {
  throw new Error(`"${herramientaId}" no existe en el catálogo de herramientas`);
}

const campos = leerArgumentoJSON(camposArg) as Record<string, string>;
const pares: Record<string, string> = {};
for (const campoDeclarado of herramienta.camposCredenciales) {
  const campo = campoDeclarado.endsWith('?') ? campoDeclarado.slice(0, -1) : campoDeclarado;
  if (campos[campo]) pares[claveEntorno({ proveedor: herramientaId }, campo)] = campos[campo];
}

await guardarCredencialesLocal(pares);
imprimir({ ok: true, herramienta: herramientaId, camposGuardados: Object.keys(pares).length });
