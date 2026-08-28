import { JWT } from 'google-auth-library';
import { ErrorConexionMCP } from '../../nucleo/errores/index.js';

/**
 * Separado del Provider a propósito: obtener un access token real requiere
 * firmar un JWT con la private key de la Service Account (criptografía real,
 * no tiene sentido mockearla). El Provider en sí (las llamadas REST) se
 * prueba con un ClienteToken falso, sin tocar esto.
 */
export interface ClienteToken {
  obtenerAccessToken(): Promise<string>;
}

export interface ConfigServiceAccount {
  clientEmail: string;
  privateKey: string;
  /** requerido para Domain-Wide Delegation: a nombre de qué usuario actúa la Service Account */
  subject?: string;
  scopes?: string[];
}

export class ClienteTokenServiceAccount implements ClienteToken {
  private readonly jwt: JWT;

  constructor(config: ConfigServiceAccount) {
    this.jwt = new JWT({
      email: config.clientEmail,
      key: config.privateKey,
      subject: config.subject,
      scopes: config.scopes ?? ['https://www.googleapis.com/auth/calendar'],
    });
  }

  async obtenerAccessToken(): Promise<string> {
    const credenciales = await this.jwt.authorize();
    if (!credenciales.access_token) {
      throw new ErrorConexionMCP('No se pudo obtener un access token de Google (Service Account)');
    }
    return credenciales.access_token;
  }
}
