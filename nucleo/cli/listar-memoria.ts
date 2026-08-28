import { AlmacenMemoriaArchivo, TipoEntradaMemoriaSchema } from '../memoria/memoria.js';
import { imprimir } from './util.js';

/**
 * uso: npx tsx nucleo/cli/listar-memoria.ts <perfilId> [tipo]
 * Sin "tipo" devuelve todo. "tipo" filtra por una de las categorías del
 * schema (preferencia, referencia_fuente, patron_detectado, dato_negocio).
 */
const [, , perfilId, tipoArg] = process.argv;
if (!perfilId) throw new Error('uso: listar-memoria.ts <perfilId> [tipo]');

const tipo = tipoArg ? TipoEntradaMemoriaSchema.parse(tipoArg) : undefined;
const almacen = new AlmacenMemoriaArchivo();
imprimir(await almacen.listar(perfilId, tipo));
