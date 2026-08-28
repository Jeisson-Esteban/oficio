import { readFile, writeFile } from 'node:fs/promises';
import { ErrorValidacion } from '../errores/index.js';

/**
 * Escribe pares clave=valor en ".env": actualiza la línea si la clave ya
 * existe, la agrega si no. También los deja en process.env de una vez,
 * para que un proceso largo (como el servidor web local) no necesite
 * reiniciarse para verlos.
 *
 * Solo para uso LOCAL (la interfaz web que corre en la máquina del
 * profesional mientras configura algo) -- nunca se expone a la red.
 */
export async function establecerVariablesEnv(pares: Record<string, string>, ruta = '.env'): Promise<void> {
  // Un valor con salto de línea podría inyectar una línea .env adicional
  // (ej. pisar una credencial de OTRO proveedor que no es la que se está
  // conectando). Nunca debería llegar hasta acá -- rechazarlo aquí es la
  // última barrera, no la única.
  for (const [clave, valor] of Object.entries(pares)) {
    if (/[\r\n]/.test(clave) || /[\r\n]/.test(valor)) {
      throw new ErrorValidacion(`la credencial "${clave}" contiene un salto de línea -- no se escribe a .env`);
    }
  }

  let contenido = '';
  try {
    contenido = await readFile(ruta, 'utf-8');
  } catch {
    // .env todavía no existe -- se crea desde cero
  }

  const lineas = contenido.length > 0 ? contenido.split('\n') : [];
  const pendientes = new Map(Object.entries(pares));

  const actualizadas = lineas.map((linea) => {
    const [clave] = linea.split('=');
    if (clave && pendientes.has(clave)) {
      const valor = pendientes.get(clave)!;
      pendientes.delete(clave);
      return `${clave}=${valor}`;
    }
    return linea;
  });

  for (const [clave, valor] of pendientes) {
    actualizadas.push(`${clave}=${valor}`);
  }

  await writeFile(ruta, actualizadas.filter((l, i) => l !== '' || i === actualizadas.length - 1).join('\n'), 'utf-8');

  for (const [clave, valor] of Object.entries(pares)) {
    process.env[clave] = valor;
  }
}
