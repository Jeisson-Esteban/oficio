import { ErrorConexionMCP } from '../../nucleo/errores/index.js';
import type { ClienteToken } from './cliente-token-google.js';

export type { ClienteToken };

/**
 * Microsoft no tiene "Service Account" como Google -- el equivalente para
 * un backend no interactivo es el flujo OAuth2 "Client Credentials" contra
 * Azure AD, con permisos de APLICACIÓN (no delegados). Eso significa que
 * no existe un "yo" (me) -- toda llamada a Microsoft Graph debe indicar
 * explícitamente sobre qué buzón (userId) opera. Ver
 * herramientas/outlook-calendar.yaml para la guía de configuración
 * (requiere que un administrador del tenant dé "admin consent").
 */
export interface ConfigMicrosoft {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  fetchImpl?: typeof fetch;
}

export class ClienteTokenMicrosoft implements ClienteToken {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: ConfigMicrosoft) {
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async obtenerAccessToken(): Promise<string> {
    const respuesta = await this.fetchImpl(
      `https://login.microsoftonline.com/${encodeURIComponent(this.config.tenantId)}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
        }),
      },
    );

    if (!respuesta.ok) {
      const cuerpo = await respuesta.text();
      throw new ErrorConexionMCP('No se pudo obtener un access token de Microsoft (Client Credentials)', { cuerpo });
    }

    const datos = (await respuesta.json()) as { access_token?: string };
    if (!datos.access_token) {
      throw new ErrorConexionMCP('Microsoft respondió sin access_token');
    }
    return datos.access_token;
  }
}
