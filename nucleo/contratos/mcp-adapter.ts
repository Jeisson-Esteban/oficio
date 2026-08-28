export interface EstadoSalud {
  ok: boolean;
  latenciaMs?: number;
  error?: string;
}

export interface DescriptorHerramientaMCP {
  nombre: string;
  descripcion: string;
}

export interface CapacidadesMCP {
  nombre: string;
  version: string;
}

/**
 * Contrato único para hablar con un MCP externo (Neon, GoHighLevel, Klaviyo...).
 * Los Providers en integraciones/ dependen de esto, nunca de un cliente MCP concreto.
 */
export interface MCPAdapter {
  conectar(): Promise<void>;
  desconectar(): Promise<void>;
  verificarSalud(): Promise<EstadoSalud>;
  listarHerramientas(): Promise<DescriptorHerramientaMCP[]>;
  ejecutarHerramienta(nombre: string, args: Record<string, unknown>): Promise<unknown>;
  obtenerCapacidades(): CapacidadesMCP;
}
