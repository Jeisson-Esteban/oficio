import { RegistroHerramientas } from './registro-herramientas.js';

const registro = await RegistroHerramientas.cargar();
const herramientas = registro.listar();

console.log(`${herramientas.length} herramientas en el catálogo:\n`);
for (const herramienta of herramientas) {
  console.log(`- ${herramienta.nombre} [${herramienta.estado}]`);
  console.log(`  capacidades: ${herramienta.capacidadesQueOfrece.join(', ') || '(ninguna)'}`);
}
