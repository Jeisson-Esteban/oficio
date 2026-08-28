import type { AddressInfo } from 'node:net';
import type http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Prueba de integración real (servidor HTTP real en un puerto efímero, sin
 * mocks) para la superficie más sensible del proyecto -- ver el hallazgo de
 * la auditoría de seguridad. Cubre las tres barreras agregadas: token CSRF,
 * validación de perfilId (path traversal) y rechazo de saltos de línea en
 * credenciales -- todas fallan ANTES de tocar el filesystem real, así que
 * es seguro correr esto contra el `perfiles/` real del repo.
 */

let servidor: http.Server;
let baseUrl: string;
let token: string;

beforeAll(async () => {
  const mod = await import('./servidor.js');
  servidor = mod.crearServidor();
  token = mod.TOKEN_SESION;
  await new Promise<void>((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  const { port } = servidor.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  servidor.close();
});

async function postConectar(cuerpo: unknown, encabezados: Record<string, string> = {}) {
  return fetch(`${baseUrl}/api/conectar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...encabezados },
    body: JSON.stringify(cuerpo),
  });
}

const cuerpoValido = {
  perfilId: 'perfil-de-prueba-servidor',
  herramientaId: 'notion',
  campos: { token: 'x', databaseId: 'y' },
};

describe('POST /api/conectar -- barreras de seguridad', () => {
  it('rechaza la petición sin el token de sesión (CSRF)', async () => {
    const respuesta = await postConectar(cuerpoValido);
    expect(respuesta.status).toBe(403);
  });

  it('rechaza la petición con un token incorrecto', async () => {
    const respuesta = await postConectar(cuerpoValido, { 'X-Interfaz-Token': 'a'.repeat(64) });
    expect(respuesta.status).toBe(403);
  });

  it('con el token correcto, pasa la barrera CSRF (llega a validar el resto del cuerpo)', async () => {
    // herramientaId inexistente a propósito: prueba que se pasó la barrera
    // CSRF (si no, sería 403) sin llegar a escribir nada en disco ni a
    // llamar a un Provider real (eso da 404 antes de tocar perfiles/ o .env).
    const respuesta = await postConectar(
      { ...cuerpoValido, herramientaId: 'no-existe-esta-herramienta' },
      { 'X-Interfaz-Token': token },
    );
    expect(respuesta.status).toBe(404);
  });

  it('rechaza un perfilId con path traversal antes de tocar el disco', async () => {
    const respuesta = await postConectar(
      { ...cuerpoValido, perfilId: '../../fuera-de-perfiles' },
      { 'X-Interfaz-Token': token },
    );
    expect(respuesta.status).toBe(400);
  });

  it('rechaza un valor de credencial con salto de línea', async () => {
    const respuesta = await postConectar(
      { ...cuerpoValido, campos: { token: 'x\nANTHROPIC_API_KEY=robada', databaseId: 'y' } },
      { 'X-Interfaz-Token': token },
    );
    expect(respuesta.status).toBe(400);
  });

  it('devuelve 400 si falta perfilId o herramientaId', async () => {
    const respuesta = await postConectar({ herramientaId: 'notion', campos: {} }, { 'X-Interfaz-Token': token });
    expect(respuesta.status).toBe(400);
  });

  it('rechaza una petición cuyo Origin no es el de esta interfaz', async () => {
    const respuesta = await postConectar(cuerpoValido, {
      'X-Interfaz-Token': token,
      Origin: 'https://sitio-malicioso.example',
    });
    expect(respuesta.status).toBe(403);
  });
});

describe('GET /', () => {
  it('sirve el HTML con un token embebido (no el placeholder crudo)', async () => {
    const html = await fetch(`${baseUrl}/`).then((r) => r.text());
    expect(html).toContain(token);
    expect(html).not.toContain('%%TOKEN_INTERFAZ%%');
  });
});

describe('GET /iconos/*', () => {
  it('sirve un ícono real del catálogo', async () => {
    const respuesta = await fetch(`${baseUrl}/iconos/notion.svg`);
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-type')).toContain('image/svg+xml');
  });

  it('rechaza un nombre con path traversal en vez de servir un archivo fuera de iconos/', async () => {
    const respuesta = await fetch(`${baseUrl}/iconos/${encodeURIComponent('../package.json')}`);
    expect(respuesta.status).toBe(404);
  });

  it('devuelve 404 (no un error) para una herramienta sin ícono en el catálogo', async () => {
    const respuesta = await fetch(`${baseUrl}/iconos/gohighlevel.svg`);
    expect(respuesta.status).toBe(404);
  });
});
