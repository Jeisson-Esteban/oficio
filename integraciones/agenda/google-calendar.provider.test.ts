import { describe, expect, it, vi } from 'vitest';
import { ErrorProveedor } from '../../nucleo/errores/index.js';
import type { ClienteToken } from './cliente-token-google.js';
import { calcularHuecos, GoogleCalendarProvider } from './google-calendar.provider.js';

function fetchFalso(respuesta: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => respuesta,
    text: async () => JSON.stringify(respuesta),
  })) as unknown as typeof fetch;
}

const tokenFalso: ClienteToken = { obtenerAccessToken: async () => 'token-de-prueba' };

describe('calcularHuecos', () => {
  it('encuentra el hueco libre entre dos eventos', () => {
    const huecos = calcularHuecos(
      { desde: '2026-08-17T08:00:00.000Z', hasta: '2026-08-17T18:00:00.000Z' },
      [
        { inicio: '2026-08-17T08:00:00.000Z', fin: '2026-08-17T09:00:00.000Z' },
        { inicio: '2026-08-17T09:30:00.000Z', fin: '2026-08-17T10:00:00.000Z' },
      ],
      30,
    );

    expect(huecos).toEqual([
      { inicio: '2026-08-17T09:00:00.000Z', fin: '2026-08-17T09:30:00.000Z' },
      { inicio: '2026-08-17T10:00:00.000Z', fin: '2026-08-17T18:00:00.000Z' },
    ]);
  });

  it('no devuelve huecos más cortos que la duración pedida', () => {
    const huecos = calcularHuecos(
      { desde: '2026-08-17T08:00:00.000Z', hasta: '2026-08-17T09:10:00.000Z' },
      [{ inicio: '2026-08-17T08:00:00.000Z', fin: '2026-08-17T09:00:00.000Z' }],
      30,
    );
    expect(huecos).toEqual([]);
  });

  it('sin eventos ocupados, todo el rango es un único hueco', () => {
    const huecos = calcularHuecos(
      { desde: '2026-08-17T08:00:00.000Z', hasta: '2026-08-17T09:00:00.000Z' },
      [],
      30,
    );
    expect(huecos).toEqual([{ inicio: '2026-08-17T08:00:00.000Z', fin: '2026-08-17T09:00:00.000Z' }]);
  });
});

describe('GoogleCalendarProvider (sin red real -- fetch y token inyectados)', () => {
  it('consultarProximos mapea los eventos de la API al tipo EventoCalendario', async () => {
    const fetchImpl = fetchFalso({
      items: [
        {
          id: 'evt-1',
          summary: 'Sesión con Juan Pérez',
          start: { dateTime: '2026-08-17T15:00:00.000Z' },
          end: { dateTime: '2026-08-17T15:50:00.000Z' },
          attendees: [{ email: 'juan@example.com' }],
        },
      ],
    });
    const provider = new GoogleCalendarProvider({ clienteToken: tokenFalso, calendarId: 'primary', fetchImpl });

    const eventos = await provider.consultarProximos({
      desde: '2026-08-17T00:00:00.000Z',
      hasta: '2026-08-18T00:00:00.000Z',
    });

    expect(eventos).toEqual([
      {
        id: 'evt-1',
        titulo: 'Sesión con Juan Pérez',
        inicio: '2026-08-17T15:00:00.000Z',
        fin: '2026-08-17T15:50:00.000Z',
        participantes: ['juan@example.com'],
      },
    ]);
    const [url, opciones] = (fetchImpl as any).mock.calls[0];
    expect(url).toContain('/calendars/primary/events?');
    expect(opciones.headers.Authorization).toBe('Bearer token-de-prueba');
  });

  it('crearEvento calcula el fin a partir de la duración y envía al participante como attendee', async () => {
    const fetchImpl = fetchFalso({
      id: 'evt-nuevo',
      summary: 'Cita',
      start: { dateTime: '2026-08-17T15:00:00.000Z' },
      end: { dateTime: '2026-08-17T15:30:00.000Z' },
      attendees: [{ email: 'paciente@example.com' }],
    });
    const provider = new GoogleCalendarProvider({ clienteToken: tokenFalso, calendarId: 'primary', fetchImpl });

    const evento = await provider.crearEvento({
      titulo: 'Cita',
      inicio: '2026-08-17T15:00:00.000Z',
      duracionMinutos: 30,
      participante: 'paciente@example.com',
    });

    expect(evento.id).toBe('evt-nuevo');
    const [, opciones] = (fetchImpl as any).mock.calls[0];
    const cuerpo = JSON.parse(opciones.body);
    expect(cuerpo.end.dateTime).toBe('2026-08-17T15:30:00.000Z');
    expect(cuerpo.attendees).toEqual([{ email: 'paciente@example.com' }]);
  });

  it('lanza ErrorProveedor si la API de Google responde con error', async () => {
    const fetchImpl = fetchFalso({ error: 'forbidden' }, false, 403);
    const provider = new GoogleCalendarProvider({ clienteToken: tokenFalso, calendarId: 'primary', fetchImpl });

    await expect(
      provider.consultarProximos({ desde: '2026-08-17T00:00:00.000Z', hasta: '2026-08-18T00:00:00.000Z' }),
    ).rejects.toBeInstanceOf(ErrorProveedor);
  });
});
