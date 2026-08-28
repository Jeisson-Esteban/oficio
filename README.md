# oficio

**El profesional explica cómo trabaja. Claude lo ejecuta.**

`oficio` es una plataforma donde un profesional no técnico (psicólogo, contador, arquitecto, especialista en marketing...) le cuenta a Claude, en lenguaje natural, cómo hace su trabajo — y Claude lo traduce a algo estructurado, lo confirma con él, y lo ejecuta usando las herramientas que ya usa (Notion, Google Calendar, GoHighLevel...). El profesional nunca ve un YAML, nunca escucha la palabra "MCP", y nunca tiene que saber qué es una Skill.

## La idea en corto

```
Profesional explica su trabajo
        ↓
Claude interpreta, pregunta lo que falta, propone
        ↓
Profesional confirma
        ↓
Se guarda como un Proceso -- y se puede ejecutar y modificar hablando
```

Por debajo, todo lo técnico (Skills, MCPs, credenciales, Providers) es infraestructura invisible. Ver la arquitectura de dos niveles más abajo.

## Requisitos

- Node.js 20+
- npm

## Instalación

```bash
npm install   # tambien enlaza las skills en .claude/skills/ (ver scripts/instalar-skills.mjs)
cp .env.example .env   # completar con credenciales reales cuando se vaya a probar en serio
```

**Importante:** para que Claude Code detecte las skills conversacionales hay que abrirlo en esta carpeta (terminal, extensión de VS Code, o app de escritorio) -- **no** funciona pegando el link del repo en un chat normal de claude.ai, que no tiene acceso a terminal ni puede correr `npm run interfaz`.

## Probarlo

```bash
npm test                        # 84 tests, sin necesitar ninguna credencial real
npm run capacidades:listar      # catálogo de qué puede hacer el sistema
npm run herramientas:listar     # catálogo de herramientas conocidas y su estado
npm run interfaz                # interfaz web local (http://localhost:4321) para conectar herramientas con botones
```

Ya existe un perfil de ejemplo (`perfiles/psicologo-demo/`) con Notion y Google Calendar "conectados" y un Proceso guardado, para ver la forma de los datos sin tener que crear nada desde cero.

## Arquitectura: dos niveles

```
NIVEL 1 — DOMINIO (lo que el profesional entiende)
   Perfil profesional → Proceso ── Regla(s) → Capacidad
                                                  │
NIVEL 2 — INFRAESTRUCTURA (lo que Claude y el sistema manejan)
                                                  │
                            Integración → Provider → MCP/API → servicio real
```

- **Perfil**: una persona usando el sistema. `profesión` es solo una etiqueta de contexto, nunca una estructura de código.
- **Proceso**: la forma particular en que un Perfil hace un trabajo repetible. Se guarda en lenguaje natural mínimamente estructurado; lo ejecuta Claude agénticamente, no un motor de workflows.
- **Capacidad**: un verbo de negocio independiente de herramienta (`crear_cita`, `guardar_registro`, `consultar_metricas`...). Ver `capacidades/catalogo.yaml`.
- **Herramienta**: un producto externo real (Notion, Klaviyo...). Ver `herramientas/*.yaml` — incluye su propia guía de credenciales en lenguaje simple.
- **Integración**: la conexión autorizada entre un Perfil y una Herramienta.
- **Provider**: la implementación técnica de una Herramienta (`integraciones/`), sobre un MCP real o su API REST.

Documentación más detallada del razonamiento de diseño en `.agents/skills/*/SKILL.md`.

## Qué hay implementado hoy

- **Núcleo** (`nucleo/`): contratos, registros, credenciales, logging, detección de patrones de uso.
- **Providers reales**: Notion, Google Calendar, MailerLite, Klaviyo, GoHighLevel, Neon (CRM propio sobre Postgres), Metricool, Zernio.
- **7 skills conversacionales** (`.agents/skills/`): `descubrir-necesidad`, `interpretar-proceso`, `conectar-herramienta`, `modificar-proceso`, `revisar-patrones`, `recordar-negocio`, `analizar-repositorio`.
- **Interfaz web local** (`nucleo/web/`) para conectar herramientas sin usar la terminal.

## Estructura

```
nucleo/            contratos, registros, credenciales, logging, CLI
integraciones/     Providers concretos por Herramienta
capacidades/       catálogo de Capacidades
herramientas/      catálogo de Herramientas conocidas
perfiles/          datos por Perfil (Procesos, Integraciones, memoria)
.agents/skills/    skills conversacionales (fuente de verdad; `.claude/skills` son enlaces locales, no versionados)
```

## Agregar una Herramienta nueva

Ver el paso a paso en `.agents/skills/conectar-herramienta/SKILL.md`. En resumen: catalogarla en `herramientas/<id>.yaml` con su `guiaCredenciales`, implementar su Provider en `integraciones/`, y registrarlo en `nucleo/registro/fabrica-providers.ts`.
