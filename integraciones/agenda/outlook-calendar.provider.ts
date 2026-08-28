import { ErrorProveedor } from '../../nucleo/errores/index.js';
import type { ClienteToken } from './cliente-token-google.js';
import { calcularHuecos } from './google-calendar.provider.js';
import type {
  CalendarProvider,
  DatosNuevoEvento,
  EventoCalendario,
  HorarioLibre,
  RangoFechas,
} from './interfaz.js';

/**
 * Outlook Calendar (Microsoft 365) vía Microsoft Graph, con permisos de
 * aplicación (ver cliente-token-microsoft.ts). Como esos permisos no
 * tienen un "me", cada llamada opera explícitamente sobre `userId` (el
 * buzón del profesional) -- ver herramientas/outlook-calendar.yaml.
 */
const URL_BASE = 'https://graph.microsoft.com/v1.0';

export interface ConfigOutlookCalendarProvider {
  clienteToken: ClienteToken;
  userId: string;
  fetchImpl?: typeof fetch;
}

interface EventoGraphAPI {
  id: string;
  subject?: string;
  start: { dateTime: string };
  end: { dateTime: string };
  attendees?: { emailAddress: { address: string } }[];
}

function aEventoCalendario(evento: EventoGraphAPI): EventoCalendario {
  return {
    id: evento.id,
    titulo: evento.subject ?? '(sin título)',
    inicio: evento.start.dateTime,
    fin: evento.end.dateTime,
    participantes: (evento.attendees ?? []).map((a) => a.emailAddress.address),
  };
}

export class OutlookCalendarProvider implements CalendarProvider {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: ConfigOutlookCalendarProvider) {
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
      throw new ErrorProveedor(`Microsoft Graph respondió ${respuesta.status} en ${ruta}`, { cuerpo });
    }
    return (await respuesta.json()) as T;
  }

  private rutaUsuario(sufijo: string): string {
    return `/users/${encodeURIComponent(this.config.userId)}${sufijo}`;
  }

  async consultarProximos(rango: RangoFechas): Promise<EventoCalendario[]> {
    const parametros = new URLSearchParams({ startDateTime: rango.desde, endDateTime: rango.hasta });
    const resultado = await this.peticion<{ value: EventoGraphAPI[] }>(
      this.rutaUsuario(`/calendarView?${parametros.toString()}`),
      { headers: { Prefer: 'outlook.timezone="UTC"' } },
    );
    return resultado.value.map(aEventoCalendario);
  }

  async consultarDisponibilidad(rango: RangoFechas, duracionMinutos: number): Promise<HorarioLibre[]> {
    const resultado = await this.peticion<{
      value: { scheduleItems?: { start: { dateTime: string }; end: { dateTime: string } }[] }[];
    }>(this.rutaUsuario('/calendar/getSchedule'), {
      method: 'POST',
      body: JSON.stringify({
        schedules: [this.config.userId],
        startTime: { dateTime: rango.desde, timeZone: 'UTC' },
        endTime: { dateTime: rango.hasta, timeZone: 'UTC' },
      }),
    });

    const ocupados = (resultado.value[0]?.scheduleItems ?? []).map((s) => ({
      inicio: s.start.dateTime,
      fin: s.end.dateTime,
    }));
    return calcularHuecos(rango, ocupados, duracionMinutos);
  }

  async crearEvento(datos: DatosNuevoEvento): Promise<EventoCalendario> {
    const inicio = new Date(datos.inicio);
    const fin = new Date(inicio.getTime() + datos.duracionMinutos * 60_000);

    const evento = await this.peticion<EventoGraphAPI>(this.rutaUsuario('/events'), {
      method: 'POST',
      body: JSON.stringify({
        subject: datos.titulo,
        start: { dateTime: inicio.toISOString(), timeZone: 'UTC' },
        end: { dateTime: fin.toISOString(), timeZone: 'UTC' },
        attendees: datos.participante
          ? [{ emailAddress: { address: datos.participante }, type: 'required' }]
          : undefined,
      }),
    });

    return aEventoCalendario(evento);
  }

  /** Graph solo tiene un tipo de recordatorio (popup interno de Outlook) -- "metodo" se ignora a propósito. */
  async agregarRecordatorio(eventoId: string, minutosAntes: number): Promise<void> {
    await this.peticion(this.rutaUsuario(`/events/${eventoId}`), {
      method: 'PATCH',
      body: JSON.stringify({ isReminderOn: true, reminderMinutesBeforeStart: minutosAntes }),
    });
  }
}
