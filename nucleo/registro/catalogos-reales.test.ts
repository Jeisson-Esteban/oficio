import { describe, expect, it } from 'vitest';
import { RegistroCapacidades } from './registro-capacidades.js';
import { RegistroHerramientas } from './registro-herramientas.js';

/**
 * A diferencia de los demás tests de este módulo (que usan fixtures en un
 * directorio temporal), este carga los catálogos REALES del repo
 * (capacidades/catalogo.yaml, herramientas/*.yaml) para detectar cuanto
 * antes si alguien los edita y rompe el schema o la consistencia cruzada.
 */
describe('catálogos reales del repo', () => {
  it('capacidades/catalogo.yaml carga y cumple el schema', async () => {
    const registro = await RegistroCapacidades.cargar();
    expect(registro.listar().length).toBeGreaterThan(0);
  });

  it('herramientas/*.yaml carga y cumple el schema', async () => {
    const registro = await RegistroHerramientas.cargar();
    expect(registro.listar().length).toBeGreaterThan(0);
  });

  it('toda capacidad que ofrece una herramienta existe en el catálogo de capacidades', async () => {
    const capacidades = await RegistroCapacidades.cargar();
    const herramientas = await RegistroHerramientas.cargar();

    const idsInexistentes: string[] = [];
    for (const herramienta of herramientas.listar()) {
      for (const capacidadId of herramienta.capacidadesQueOfrece) {
        if (!capacidades.obtener(capacidadId)) {
          idsInexistentes.push(`${herramienta.id} -> ${capacidadId}`);
        }
      }
    }
    expect(idsInexistentes).toEqual([]);
  });

  it('Notion y Google Calendar (Herramientas del MVP) están disponibles', async () => {
    const herramientas = await RegistroHerramientas.cargar();
    expect(herramientas.obtener('notion')?.estado).toBe('disponible');
    expect(herramientas.obtener('google-calendar')?.estado).toBe('disponible');
  });

  it('las herramientas de redes/infraestructura no confirmadas no aparecen como disponibles', async () => {
    const herramientas = await RegistroHerramientas.cargar();
    expect(herramientas.obtener('iperf')?.estado).toBe('no_confirmado');
    expect(herramientas.obtener('fail2ban')?.estado).toBe('no_confirmado');
  });
});
