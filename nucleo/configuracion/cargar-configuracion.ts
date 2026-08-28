import 'dotenv/config';

/** Lee una variable de entorno general (no de credenciales de Herramienta) con valor por defecto opcional. */
export function obtenerVariable(nombre: string, porDefecto?: string): string | undefined {
  return process.env[nombre] ?? porDefecto;
}

export function obtenerVariableRequerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno requerida "${nombre}"`);
  }
  return valor;
}
