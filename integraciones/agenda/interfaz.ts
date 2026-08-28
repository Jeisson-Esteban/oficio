/** CalendarProvider = agenda del profesional (Google Calendar, Outlook...). */
export interface RangoFechas {
  desde: string; // ISO 8601
  hasta: string;
}

export interface EventoCalendario {
  id: string;
  titulo: string;
  inicio: string;
  fin: string;
  participantes: string[];
}

export interface HorarioLibre {
  inicio: string;
  fin: string;
}

export interface DatosNuevoEvento {
  titulo: string;
  inicio: string;
  duracionMinutos: number;
  participante?: string;
}

export interface CalendarProvider {
  consultarProximos(rango: RangoFechas): Promise<EventoCalendario[]>;
  consultarDisponibilidad(rango: RangoFechas, duracionMinutos: number): Promise<HorarioLibre[]>;
  crearEvento(datos: DatosNuevoEvento): Promise<EventoCalendario>;
  /** Calendar no "envía mensajes" -- lo que sí puede hacer es agregar un recordatorio a un evento existente. */
  agregarRecordatorio(eventoId: string, minutosAntes: number, metodo: 'email' | 'popup'): Promise<void>;
}
