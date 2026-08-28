import { readFileSync } from 'node:fs';

/**
 * Acepta JSON inline o, prefijado con "@", una ruta a un archivo con el JSON
 * -- pasar JSON con comillas como argumento de shell es frágil en Windows/
 * PowerShell (las comillas dobles se pueden perder), así que un archivo es
 * la forma confiable de invocar esto desde una habilidad.
 */
export function leerArgumentoJSON(valor: string | undefined): unknown {
  if (!valor) return undefined;
  const contenido = valor.startsWith('@') ? readFileSync(valor.slice(1), 'utf-8') : valor;
  try {
    return JSON.parse(contenido);
  } catch {
    throw new Error(`Argumento inválido, se esperaba JSON: ${valor}`);
  }
}

export function imprimir(valor: unknown): void {
  console.log(JSON.stringify(valor, null, 2));
}
