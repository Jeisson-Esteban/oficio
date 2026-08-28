import { PerfilSchema } from '../contratos/perfil.js';
import { RegistroPerfiles } from '../registro/registro-perfiles.js';
import { imprimir, leerArgumentoJSON } from './util.js';

const perfil = PerfilSchema.parse(leerArgumentoJSON(process.argv[2]));
const registro = new RegistroPerfiles();
await registro.guardarPerfil(perfil);
imprimir({ ok: true, perfilId: perfil.id });
