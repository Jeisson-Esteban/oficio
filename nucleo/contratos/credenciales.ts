/**
 * Identifica de quién y de qué Herramienta son unas credenciales, sin decir
 * dónde están guardadas. La implementación (env vars hoy, un secrets manager
 * mañana) es intercambiable porque todo el código depende solo de esto.
 */
export interface AlcanceCredencial {
  /** id de la Herramienta (ej. "notion", "google-calendar") */
  proveedor: string;
  /** permite tener más de una cuenta de la misma Herramienta conectada */
  aliasCuenta?: string;
  /** preparado para multi-tenant a futuro; no se usa en el MVP */
  perfilId?: string;
  orgId?: string;
}

export interface AlmacenCredenciales {
  obtenerCredencial(alcance: AlcanceCredencial): Promise<Record<string, string>>;
}
