import { RegistroPerfiles } from '../registro/registro-perfiles.js';
import { imprimir } from './util.js';

const perfilId = process.argv[2];
if (!perfilId) throw new Error('uso: listar-procesos.ts <perfilId>');

const registro = new RegistroPerfiles();
imprimir(await registro.listarProcesos(perfilId));
