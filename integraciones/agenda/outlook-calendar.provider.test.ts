import { describe, expect, it, vi } from 'vitest';
import { ErrorProveedor } from '../../nucleo/errores/index.js';
import type { ClienteToken } from './cliente-token-google.js';
import { OutlookCalendarProvider } from './outlook-calendar.provider.js';

function fetchFalso(respuesta: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => respuesta,
    text: async () => JSON.stringify(respuesta),
  })) as unknown as typeof fetch;
}

const tokenFalso: ClienteToken = { obtenerAccessToken: async () => 'token-de-prueba-ms' };

describe('OutlookCalendarProvider (sin red real -- fetch y token inyectados)', () => {
  it('consultarProximos usa /users/{userId}/calendarView y mapea los eventos', async () => {
    const fetchImpl = fetchFalso({
      value: [
        {
          id: 'evt-1',
          subject: 'Asesoría con Juan',
          start: { dateTime: '2026-08-17T15:00:00.000Z' },
          end: { dateTime: '2026-08-17T15:50:00.000Z' },
          attendees: [{ emailAddress: { address: 'juan@example.com' } }],
        },
      ],
    });
    const provider = new OutlookCalendarProvider({
      clienteToken: tokenFalso,
      userId: 'profesor@universidad.edu',
      fetchImpl,
    });

    const eventos = await provider.consultarProximos({
      desde: '2026-08-17T00:00:00.000Z',
      hasta: '2026-08-18T00:00:00.000Z',
    });

    expect(eventos).toEqual([
      {
        id: 'evt-1',
        titulo: 'Asesoría con Juan',
        inicio: '2026-08-17T15:00:00.000Z',
        fin: '2026-08-17T15:50:00.000Z',
        participantes: ['juan@example.com'],
      },
    ]);
    const [url, opciones] = (fetchImpl as any).mock.calls[0];
    expect(url).toContain('/users/profesor%40universidad.edu/calendarView?');
    expect(opciones.headers.Authorization).toBe('Bearer token-de-prueba-ms');
  });

  it('consultarDisponibilidad usa getSchedule y calcula huecos con calcularHuecos', async () => {
    const fetchImpl = fetchFalso({
      value: [
        {
          scheduleItems: [
            { start: { dateTime: '2026-08-17T08:00:00.000Z' }, end: { dateTime: '2026-08-17T09:00:00.000Z' } },
          ],
        },
      ],
    });
    const provider = new OutlookCalendarProvider({ clienteToken: tokenFalso, userId: 'x@y.edu', fetchImpl });

    const huecos = await provider.consultarDisponibilidad(
      { desde: '2026-08-17T08:00:00.000Z', hasta: '2026-08-17T10:00:00.000Z' },
      30,
    );

    expect(huecos).toEqual([{ inicio: '2026-08-17T09:00:00.000Z', fin: '2026-08-17T10:00:00.000Z' }]);
    const [url, opciones] = (fetchImpl as any).mock.calls[0];
    expect(url).toContain('/calendar/getSchedule');
    const cuerpo = JSON.parse(opciones.body);
    expect(cuerpo.schedules).toEqual(['x@y.edu']);
  });

  it('crearEvento calcula el fin a partir de la duración y agrega al participante como attendee', async () => {
    const fetchImpl = fetchFalso({
      id: 'evt-nuevo',
      subject: 'Cita',
      start: { dateTime: '2026-08-17T15:00:00.000Z' },
      end: { dateTime: '2026-08-17T15:30:00.000Z' },
      attendees: [{ emailAddress: { address: 'paciente@example.com' } }],
    });
    const provider = new OutlookCalendarProvider({ clienteToken: tokenFalso, userId: 'x@y.edu', fetchImpl });

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
    expect(cuerpo.attendees).toEqual([{ emailAddress: { address: 'paciente@example.com' }, type: 'required' }]);
  });

  it('agregarRecordatorio usa el formato de reminder de Graph', async () => {
    const fetchImpl = fetchFalso({});
    const provider = new OutlookCalendarProvider({ clienteToken: tokenFalso, userId: 'x@y.edu', fetchImpl });

    await provider.agregarRecordatorio('evt-1', 15);

    const [url, opciones] = (fetchImpl as any).mock.calls[0];
    expect(url).toContain('/events/evt-1');
    expect(opciones.method).toBe('PATCH');
    expect(JSON.parse(opciones.body)).toEqual({ isReminderOn: true, reminderMinutesBeforeStart: 15 });
  });

  it('lanza ErrorProveedor si Microsoft Graph responde con error', async () => {
    const fetchImpl = fetchFalso({ error: 'forbidden' }, false, 403);
    const provider = new OutlookCalendarProvider({ clienteToken: tokenFalso, userId: 'x@y.edu', fetchImpl });

    await expect(
      provider.consultarProximos({ desde: '2026-08-17T00:00:00.000Z', hasta: '2026-08-18T00:00:00.000Z' }),
    ).rejects.toBeInstanceOf(ErrorProveedor);
  });
});
