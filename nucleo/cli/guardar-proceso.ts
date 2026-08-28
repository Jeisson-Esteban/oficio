import { ProcesoSchema } from '../contratos/proceso.js';
import { RegistroPerfiles } from '../registro/registro-perfiles.js';
import { imprimir, leerArgumentoJSON } from './util.js';

const perfilId = process.argv[2];
if (!perfilId) throw new Error('uso: guardar-proceso.ts <perfilId> <procesoJson>');

const proceso = ProcesoSchema.parse(leerArgumentoJSON(process.argv[3]));
const registro = new RegistroPerfiles();
await registro.guardarProceso(perfilId, proceso);
imprimir({ ok: true, procesoId: proceso.id, version: proceso.version });
