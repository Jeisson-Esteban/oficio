import { RegistroCapacidades } from './registro-capacidades.js';

const registro = await RegistroCapacidades.cargar();
const capacidades = registro.listar();

console.log(`${capacidades.length} capacidades en el catálogo:\n`);
for (const capacidad of capacidades) {
  console.log(`- ${capacidad.id} (${capacidad.resolucion}${capacidad.sensible ? ', sensible' : ''})`);
  console.log(`  ${capacidad.descripcion}`);
}
