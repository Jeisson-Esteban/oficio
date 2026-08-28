import { readFile } from 'node:fs/promises';
import { EjecutorPg } from '../../integraciones/registros/neon.provider.js';
import { claveEntorno } from '../configuracion/variables-entorno.js';
import { obtenerVariableRequerida } from '../configuracion/cargar-configuracion.js';

/**
 * Aplica integraciones/registros/neon.schema.sql contra la base de datos de
 * Neon configurada -- ejecutar UNA vez antes de usar Neon por primera vez.
 * Es seguro correrlo de nuevo (CREATE TABLE IF NOT EXISTS).
 *
 * requiere la variable que indica herramientas/neon.yaml (camposCredenciales: [connectionString])
 */
const clave = claveEntorno({ proveedor: 'neon' }, 'connectionString');
const connectionString = obtenerVariableRequerida(clave);
const sql = await readFile(new URL('../../integraciones/registros/neon.schema.sql', import.meta.url), 'utf-8');

const ejecutor = new EjecutorPg(connectionString);
await ejecutor.query(sql);

console.log('Listo: tabla "registros" creada (o ya existía) en la base de datos de Neon.');
