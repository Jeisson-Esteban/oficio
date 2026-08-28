import { RegistroHerramientas } from '../registro/registro-herramientas.js';
import { imprimir } from './util.js';

const consulta = (process.argv[2] ?? '').toLowerCase();
const registro = await RegistroHerramientas.cargar();
const encontradas = registro
  .listar()
  .filter((h) => h.id.includes(consulta) || h.nombre.toLowerCase().includes(consulta));

imprimir(encontradas);
