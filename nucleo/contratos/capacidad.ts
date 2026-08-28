import { z } from 'zod';

/**
 * Una Capacidad es un verbo de negocio independiente de herramienta
 * (crear_cita, guardar_registro, consultar_disponibilidad...). Se resuelve
 * de tres formas posibles — nunca nombra un proveedor concreto:
 *
 *  - "integracion":     la cumple un Provider técnico (integraciones/) sobre un MCP/API.
 *  - "logica_negocio":  la cumple código propio determinista (logica_negocio/).
 *  - "razonamiento":    la resuelve Claude directamente, sin llamar a nada externo.
 */
export const ResolucionCapacidadSchema = z.enum(['integracion', 'logica_negocio', 'razonamiento']);
export type ResolucionCapacidad = z.infer<typeof ResolucionCapacidadSchema>;

export const CapacidadSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z][a-z0-9_]*$/, 'el id de una capacidad debe ser snake_case, ej. "crear_cita"'),
    nombre: z.string(),
    descripcion: z.string(),
    categoria: z.string().optional(),
    entrada: z.array(z.string()).default([]),
    salida: z.string().optional(),
    resolucion: ResolucionCapacidadSchema,
    /** requerido cuando resolucion === "integracion": ej. "agenda.CalendarProvider" */
    interfazProvider: z.string().optional(),
    /** requerido cuando resolucion === "integracion": el método de esa interfaz */
    metodo: z.string().optional(),
    /** requerido cuando resolucion === "logica_negocio": ruta bajo logica_negocio/ */
    modulo: z.string().optional(),
    /** toca datos sensibles (salud, dinero...) -> exige confirmación explícita, ver permisos/ */
    sensible: z.boolean().default(false),
  })
  .refine(
    (c) => c.resolucion !== 'integracion' || (!!c.interfazProvider && !!c.metodo),
    { message: 'una capacidad con resolucion "integracion" necesita interfazProvider y metodo' },
  )
  .refine((c) => c.resolucion !== 'logica_negocio' || !!c.modulo, {
    message: 'una capacidad con resolucion "logica_negocio" necesita modulo',
  });

export type Capacidad = z.infer<typeof CapacidadSchema>;
