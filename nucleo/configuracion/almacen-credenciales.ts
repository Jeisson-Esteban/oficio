import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AlcanceCredencial, AlmacenCredenciales } from '../contratos/credenciales.js';
import { ErrorCredencialesFaltantes, ErrorValidacion } from '../errores/index.js';
import { cifrar, descifrar, obtenerClaveLocal, type ValorCifrado } from '../seguridad/cifrado.js';
import { claveEntorno } from './variables-entorno.js';

const RUTA_ALMACEN_POR_DEFECTO = '.credenciales.local.json';
const NOMBRE_ARCHIVO_CLAVE = '.clave-local.key';

/** La clave maestra vive junto al almacén (mismo directorio) -- así los tests que
 * apuntan el almacén a un directorio temporal nunca tocan la clave real del repo. */
function rutaClaveJuntoAlAlmacen(rutaAlmacen: string): string {
  return path.join(path.dirname(rutaAlmacen), NOMBRE_ARCHIVO_CLAVE);
}

async function leerAlmacen(ruta: string): Promise<Record<string, ValorCifrado>> {
  try {
    return JSON.parse(await readFile(ruta, 'utf-8'));
  } catch {
    return {};
  }
}

function validarSinSaltosDeLinea(pares: Record<string, string>): void {
  for (const [clave, valor] of Object.entries(pares)) {
    if (/[\r\n]/.test(clave) || /[\r\n]/.test(valor)) {
      throw new ErrorValidacion(`la credencial "${clave}" contiene un salto de línea -- no se guarda`);
    }
  }
}

/**
 * Guarda credenciales CIFRADAS en disco (".credenciales.local.json", nunca
 * versionado -- ver .gitignore) en vez del ".env" en texto plano que se usaba
 * antes. Pensado para cuando quien conecta la Herramienta es un profesional
 * sin experiencia técnica que pegó su API key en un formulario: ese valor no
 * debe quedar legible a simple vista en un archivo del proyecto.
 *
 * También deja los valores en process.env de una vez, para que un proceso
 * largo (la interfaz web local) no necesite reiniciarse para verlos.
 */
export async function guardarCredencialesLocal(
  pares: Record<string, string>,
  ruta = RUTA_ALMACEN_POR_DEFECTO,
): Promise<void> {
  validarSinSaltosDeLinea(pares);

  const claveLocal = await obtenerClaveLocal(rutaClaveJuntoAlAlmacen(ruta));
  const almacen = await leerAlmacen(ruta);

  for (const [clave, valor] of Object.entries(pares)) {
    almacen[clave] = cifrar(claveLocal, valor);
  }

  await writeFile(ruta, JSON.stringify(almacen, null, 2), { mode: 0o600 });

  for (const [clave, valor] of Object.entries(pares)) {
    process.env[clave] = valor;
  }
}

/**
 * Implementación de AlmacenCredenciales que primero mira process.env (una
 * variable puesta por la plataforma de despliegue, o cargada desde ".env"
 * vía dotenv -- útil para quien despliega esto técnicamente y prefiere ese
 * mecanismo) y, si no está ahí, la busca y descifra en el almacén local
 * cifrado (ver guardarCredencialesLocal). Reemplaza a la vieja
 * AlmacenCredencialesEntorno, que solo sabía leer process.env.
 */
export class AlmacenCredencialesLocal implements AlmacenCredenciales {
  constructor(
    private readonly camposPorProveedor: Record<string, string[]>,
    private readonly ruta = RUTA_ALMACEN_POR_DEFECTO,
  ) {}

  async obtenerCredencial(alcance: AlcanceCredencial): Promise<Record<string, string>> {
    const campos = this.camposPorProveedor[alcance.proveedor];
    if (!campos || campos.length === 0) {
      throw new ErrorCredencialesFaltantes(
        `No hay campos de credenciales declarados para el proveedor "${alcance.proveedor}"`,
      );
    }

    const almacen = await leerAlmacen(this.ruta);
    let claveLocal: Buffer | undefined;

    const resultado: Record<string, string> = {};
    const faltantes: string[] = [];
    for (const campoDeclarado of campos) {
      // un campo terminado en "?" es opcional (ej. "subject?" para Domain-Wide Delegation)
      const opcional = campoDeclarado.endsWith('?');
      const campo = opcional ? campoDeclarado.slice(0, -1) : campoDeclarado;
      const clave = claveEntorno(alcance, campo);

      const deEntorno = process.env[clave];
      if (deEntorno) {
        resultado[campo] = deEntorno;
        continue;
      }

      const cifrado = almacen[clave];
      if (cifrado) {
        claveLocal ??= await obtenerClaveLocal(rutaClaveJuntoAlAlmacen(this.ruta));
        resultado[campo] = descifrar(claveLocal, cifrado);
        continue;
      }

      if (!opcional) faltantes.push(clave);
    }

    if (faltantes.length > 0) {
      throw new ErrorCredencialesFaltantes(
        `Faltan credenciales para "${alcance.proveedor}": ${faltantes.join(', ')}`,
        { proveedor: alcance.proveedor, faltantes },
      );
    }

    return resultado;
  }
}
