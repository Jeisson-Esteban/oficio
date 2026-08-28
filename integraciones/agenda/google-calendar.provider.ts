import { ErrorProveedor } from '../../nucleo/errores/index.js';
import type { ClienteToken } from './cliente-token-google.js';
import type {
  CalendarProvider,
  DatosNuevoEvento,
  EventoCalendario,
  HorarioLibre,
  RangoFechas,
} from './interfaz.js';

const URL_BASE = 'https://www.googleapis.com/calendar/v3';

export interface ConfigGoogleCalendarProvider {
  clienteToken: ClienteToken;
  calendarId: string;
  fetchImpl?: typeof fetch;
}

interface EventoGoogleAPI {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: { email: string }[];
}

function aEventoCalendario(evento: EventoGoogleAPI): EventoCalendario {
  return {
    id: evento.id,
    titulo: evento.summary ?? '(sin título)',
    inicio: evento.start.dateTime ?? evento.start.date ?? '',
    fin: evento.end.dateTime ?? evento.end.date ?? '',
    participantes: (evento.attendees ?? []).map((a) => a.email),
  };
}

/** Calcula huecos libres de al menos duracionMinutos dentro de rango, dado un listado de periodos ocupados. */
export function calcularHuecos(
  rango: RangoFechas,
  ocupados: { inicio: string; fin: string }[],
  duracionMinutos: number,
): HorarioLibre[] {
  const ordenados = [...ocupados].sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio));
  const huecos: HorarioLibre[] = [];
  let cursor = Date.parse(rango.desde);
  const fin = Date.parse(rango.hasta);
  const duracionMs = duracionMinutos * 60_000;

  for (const ocupado of ordenados) {
    const inicioOcupado = Date.parse(ocupado.inicio);
    const finOcupado = Date.parse(ocupado.fin);
    if (inicioOcupado - cursor >= duracionMs) {
      huecos.push({ inicio: new Date(cursor).toISOString(), fin: new Date(inicioOcupado).toISOString() });
    }
    cursor = Math.max(cursor, finOcupado);
  }
  if (fin - cursor >= duracionMs) {
    huecos.push({ inicio: new Date(cursor).toISOString(), fin: new Date(fin).toISOString() });
  }
  return huecos;
}

export class GoogleCalendarProvider implements CalendarProvider {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: ConfigGoogleCalendarProvider) {
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private async peticion<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const token = await this.config.clienteToken.obtenerAccessToken();
    const respuesta = await this.fetchImpl(`${URL_BASE}${ruta}`, {
      ...opciones,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(opciones.headers ?? {}),
      },
    });
    if (!respuesta.ok) {
      const cuerpo = await respuesta.text();
      throw new ErrorProveedor(`Google Calendar respondió ${respuesta.status} en ${ruta}`, { cuerpo });
    }
    return (await respuesta.json()) as T;
  }

  async consultarProximos(rango: RangoFechas): Promise<EventoCalendario[]> {
    const parametros = new URLSearchParams({
      timeMin: rango.desde,
      timeMax: rango.hasta,
      singleEvents: 'true',
      orderBy: 'startTime',
    });
    const resultado = await this.peticion<{ items: EventoGoogleAPI[] }>(
      `/calendars/${encodeURIComponent(this.config.calendarId)}/events?${parametros.toString()}`,
    );
    return resultado.items.map(aEventoCalendario);
  }

  async consultarDisponibilidad(rango: RangoFechas, duracionMinutos: number): Promise<HorarioLibre[]> {
    const resultado = await this.peticion<{
      calendars: Record<string, { busy: { start: string; end: string }[] }>;
    }>('/freeBusy', {
      method: 'POST',
      body: JSON.stringify({
        timeMin: rango.desde,
        timeMax: rango.hasta,
        items: [{ id: this.config.calendarId }],
      }),
    });

    const ocupados = (resultado.calendars[this.config.calendarId]?.busy ?? []).map((b) => ({
      inicio: b.start,
      fin: b.end,
    }));
    return calcularHuecos(rango, ocupados, duracionMinutos);
  }

  async crearEvento(datos: DatosNuevoEvento): Promise<EventoCalendario> {
    const inicio = new Date(datos.inicio);
    const fin = new Date(inicio.getTime() + datos.duracionMinutos * 60_000);

    const evento = await this.peticion<EventoGoogleAPI>(
      `/calendars/${encodeURIComponent(this.config.calendarId)}/events`,
      {
        method: 'POST',
        body: JSON.stringify({
          summary: datos.titulo,
          start: { dateTime: inicio.toISOString() },
          end: { dateTime: fin.toISOString() },
          attendees: datos.participante ? [{ email: datos.participante }] : undefined,
        }),
      },
    );

    return aEventoCalendario(evento);
  }

  async agregarRecordatorio(eventoId: string, minutosAntes: number, metodo: 'email' | 'popup'): Promise<void> {
    await this.peticion(`/calendars/${encodeURIComponent(this.config.calendarId)}/events/${eventoId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        reminders: { useDefault: false, overrides: [{ method: metodo, minutes: minutosAntes }] },
      }),
    });
  }
}
