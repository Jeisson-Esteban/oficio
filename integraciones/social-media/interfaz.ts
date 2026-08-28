/** SocialMediaProvider = publicar/programar contenido en redes sociales conectadas. */
export interface ContenidoAPublicar {
  texto?: string;
  /** imagen o video ya accesible por URL -- este Provider no sube archivos, solo referencia una URL */
  urlMedia?: string;
  /** ids de red destino, ej. ["instagram", "tiktok"] */
  redes: string[];
  /** ISO 8601 -- si se omite, se publica de inmediato */
  fechaProgramada?: string;
}

export interface ResultadoPublicacion {
  ok: boolean;
  /** respuesta cruda del MCP -- la forma exacta no está 100% confirmada, ver comentarios en cada Provider */
  detalle: unknown;
}

export interface SocialMediaProvider {
  publicar(contenido: ContenidoAPublicar): Promise<ResultadoPublicacion>;
}
