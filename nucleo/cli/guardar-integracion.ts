import { IntegracionActivaSchema } from '../contratos/integracion.js';
import { RegistroPerfiles } from '../registro/registro-perfiles.js';
import { imprimir, leerArgumentoJSON } from './util.js';

const perfilId = process.argv[2];
if (!perfilId) throw new Error('uso: guardar-integracion.ts <perfilId> <integracionJson>');

const integracion = IntegracionActivaSchema.parse(leerArgumentoJSON(process.argv[3]));
const registro = new RegistroPerfiles();
await registro.guardarIntegracionActiva(perfilId, integracion);
imprimir({ ok: true, herramienta: integracion.herramienta });
