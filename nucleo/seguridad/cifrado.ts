import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const ALGORITMO = 'aes-256-gcm';
const RUTA_CLAVE_LOCAL_POR_DEFECTO = '.clave-local.key';

export interface ValorCifrado {
  iv: string;
  tag: string;
  datos: string;
}

/**
 * Clave maestra de cifrado local: 32 bytes al azar, generados una sola vez
 * por instalación y guardados fuera de git (ver .gitignore). Esto NO es un
 * secrets manager real -- quien tenga acceso al disco de esta máquina puede
 * leer este archivo igual que podría leer un ".env" plano. Lo que sí evita
 * es el caso común (y el que motivó esto): que una key pegada por un
 * profesional sin experiencia técnica quede legible a simple vista en un
 * archivo, en un commit por error, o en un backup/zip del proyecto.
 */
export async function obtenerClaveLocal(ruta = RUTA_CLAVE_LOCAL_POR_DEFECTO): Promise<Buffer> {
  try {
    const contenido = await readFile(ruta, 'utf-8');
    return Buffer.from(contenido.trim(), 'base64');
  } catch {
    const nueva = randomBytes(32);
    await writeFile(ruta, nueva.toString('base64'), { mode: 0o600 });
    return nueva;
  }
}

export function cifrar(clave: Buffer, textoPlano: string): ValorCifrado {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITMO, clave, iv);
  const datos = Buffer.concat([cipher.update(textoPlano, 'utf-8'), cipher.final()]);
  return {
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    datos: datos.toString('base64'),
  };
}

export function descifrar(clave: Buffer, valor: ValorCifrado): string {
  const decipher = createDecipheriv(ALGORITMO, clave, Buffer.from(valor.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(valor.tag, 'base64'));
  const texto = Buffer.concat([decipher.update(Buffer.from(valor.datos, 'base64')), decipher.final()]);
  return texto.toString('utf-8');
}
