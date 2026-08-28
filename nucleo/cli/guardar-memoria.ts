import { AlmacenMemoriaArchivo, EntradaMemoriaSchema } from '../memoria/memoria.js';
import { imprimir, leerArgumentoJSON } from './util.js';

/**
 * Persiste un dato de negocio/preferencia que el profesional compartió en
 * conversación -- ver skill "recordar-negocio". Nunca pasar aquí el
 * contenido real de un dato sensible (una ficha, un monto): "valor" es
 * siempre una referencia corta, reforzado por el límite de 500 caracteres
 * del schema.
 *
 * uso: npx tsx nucleo/cli/guardar-memoria.ts <perfilId> <entradaJson>
 * entradaJson: { tipo, clave, valor, creadoEn }
 */
const [, , perfilId, entradaJson] = process.argv;
if (!perfilId) throw new Error('uso: guardar-memoria.ts <perfilId> <entradaJson>');

const entrada = EntradaMemoriaSchema.parse(leerArgumentoJSON(entradaJson));
const almacen = new AlmacenMemoriaArchivo();
await almacen.guardar(perfilId, entrada);
imprimir({ ok: true, perfilId, clave: entrada.clave });
