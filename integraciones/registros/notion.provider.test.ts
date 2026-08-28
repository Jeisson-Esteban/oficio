import { describe, expect, it, vi } from 'vitest';
import { ErrorProveedor } from '../../nucleo/errores/index.js';
import { NotionProvider } from './notion.provider.js';

function fetchFalso(respuesta: unknown, ok = true, status = 200) {
  return vi.fn(async () => ({
    ok,
    status,
    json: async () => respuesta,
    text: async () => JSON.stringify(respuesta),
  })) as unknown as typeof fetch;
}

describe('NotionProvider (sin red real -- fetch inyectado)', () => {
  it('guardar() crea una página con el título y el resto de campos como texto', async () => {
    const fetchImpl = fetchFalso({ id: 'pagina-123' });
    const provider = new NotionProvider({ token: 't', databaseId: 'db-1', fetchImpl });

    const resultado = await provider.guardar('paciente', { Name: 'Juan Pérez', Referencia: 'juan-perez' });

    expect(resultado).toEqual({ id: 'pagina-123' });
    const [url, opciones] = (fetchImpl as any).mock.calls[0];
    expect(url).toBe('https://api.notion.com/v1/pages');
    expect(opciones.headers.Authorization).toBe('Bearer t');
    expect(opciones.headers['Notion-Version']).toBe('2022-06-28');
    const cuerpo = JSON.parse(opciones.body);
    expect(cuerpo.parent).toEqual({ database_id: 'db-1' });
    expect(cuerpo.properties.Name.title[0].text.content).toBe('Juan Pérez');
    expect(cuerpo.properties.Referencia.rich_text[0].text.content).toBe('juan-perez');
  });

  it('consultar() filtra por la propiedad de título y devuelve el primer resultado', async () => {
    const fetchImpl = fetchFalso({ results: [{ id: 'pagina-1' }] });
    const provider = new NotionProvider({ token: 't', databaseId: 'db-1', fetchImpl });

    const resultado = await provider.consultar({ tipo: 'paciente', criterio: 'Juan Pérez' });

    expect(resultado).toEqual({ id: 'pagina-1' });
    const [url] = (fetchImpl as any).mock.calls[0];
    expect(url).toBe('https://api.notion.com/v1/databases/db-1/query');
  });

  it('consultar() devuelve undefined si no hay resultados', async () => {
    const fetchImpl = fetchFalso({ results: [] });
    const provider = new NotionProvider({ token: 't', databaseId: 'db-1', fetchImpl });

    expect(await provider.consultar({ tipo: 'paciente', criterio: 'nadie' })).toBeUndefined();
  });

  it('buscarHistorial() ordena por fecha descendente y respeta la cantidad pedida', async () => {
    const fetchImpl = fetchFalso({ results: [{ id: 'sesion-3' }, { id: 'sesion-2' }, { id: 'sesion-1' }] });
    const provider = new NotionProvider({ token: 't', databaseId: 'db-1', fetchImpl });

    const resultado = await provider.buscarHistorial('sesion', 'juan-perez', 3);

    expect(resultado).toHaveLength(3);
    const [, opciones] = (fetchImpl as any).mock.calls[0];
    const cuerpo = JSON.parse(opciones.body);
    expect(cuerpo.filter).toEqual({ property: 'Referencia', rich_text: { equals: 'juan-perez' } });
    expect(cuerpo.sorts).toEqual([{ property: 'Fecha', direction: 'descending' }]);
    expect(cuerpo.page_size).toBe(3);
  });

  it('lanza ErrorProveedor si Notion responde con error', async () => {
    const fetchImpl = fetchFalso({ message: 'unauthorized' }, false, 401);
    const provider = new NotionProvider({ token: 'invalido', databaseId: 'db-1', fetchImpl });

    await expect(provider.consultar({ tipo: 'paciente', criterio: 'x' })).rejects.toBeInstanceOf(ErrorProveedor);
  });
});
