# Instrucciones para cualquier agente de código que abra este repositorio

Esto aplica a cualquier IA con acceso a terminal que trabaje en este proyecto: Claude Code, Codex CLI, Cursor, Copilot, Gemini CLI, o cualquier otro. (Si sos Claude Code específicamente, `CLAUDE.md` tiene el mismo contenido con un par de notas propias.)

## Con quién estás hablando

La persona al otro lado de la conversación casi nunca es programadora. Es un profesional (psicólogo, contador, arquitecto, especialista en marketing...) que quiere explicar en lenguaje natural cómo trabaja y que el agente se encargue de lo técnico. Nunca asumas que sabe qué es una terminal, un `.env`, un YAML, un MCP o una Skill — y no uses esas palabras con él/ella salvo que las use primero.

## Regla 1 — el agente corre la terminal, nunca el profesional

Si hace falta ejecutar algo (`npm install`, un script de `nucleo/cli/`, levantar la interfaz web, correr los tests), lo corre el agente. Nunca le pidas al profesional que:

- abra una terminal,
- pegue o corra un comando,
- edite un archivo (`.env`, un YAML, un JSON),
- o instale algo.

Si tu entorno no tiene acceso a terminal ni a este sistema de archivos, decilo explícitamente en vez de improvisar instrucciones de terminal para el profesional — ver la nota correspondiente en `README.md`. La solución correcta es abrir el proyecto con un agente que sí tenga esa capacidad, no que el profesional aprenda a usar una terminal.

## Regla 2 — agregar una herramienta o aplicación nueva

Cuando el profesional quiera conectar algo que ya usa (Notion, Google Calendar, lo que sea) o pida "agregar" una aplicación nueva, seguí **`.agents/skills/conectar-herramienta/SKILL.md`** paso a paso. Ese flujo está diseñado para que el agente evalúe las opciones de verdad (no la primera que aparezca), explique en una frase qué va a poder hacer en lenguaje llano, pida autorización explícita antes de conectar nada, y verifique que funciona de verdad. Nunca le muestres el catálogo YAML al profesional ni le pidas que lo edite.

## Regla 3 — credenciales: nunca en texto plano

Si el profesional va a dar una API key, token o contraseña de una herramienta externa:

1. **Preferí la interfaz web local.** Levantala vos (`npx tsx nucleo/web/servidor.ts`, en segundo plano) y pasale el link (`http://localhost:4321` salvo que `PUERTO_INTERFAZ` diga otra cosa) para que la pegue ahí, en su navegador — así el valor ni siquiera pasa por la conversación. Ese formulario guarda todo cifrado (`nucleo/configuracion/almacen-credenciales.ts`, AES-256-GCM sobre `.credenciales.local.json`, nunca un `.env` plano) y verifica la conexión con una lectura real antes de darla por buena.
2. **Si de verdad no se puede levantar esa interfaz**, se puede recibir el valor en el chat como último recurso — pero nunca escribirlo a mano en `.env` ni en ningún archivo sin cifrar. Guardalo con `npx tsx nucleo/cli/guardar-credenciales.ts <herramientaId> '<camposJson>'`, que lo cifra igual que la interfaz web. No lo repitas de vuelta en el chat.
3. Si el profesional pregunta qué tan seguro es esto, sé honesto: el cifrado local protege el caso común (que la key quede legible a simple vista, en un commit por error, en un backup del proyecto) — no es un secrets manager de nivel empresa, y alguien con acceso completo a esa misma máquina podría en teoría leer también la clave que descifra. No lo vendas como más de lo que es.

## Primer uso

Si no existe `node_modules/`, corré `npm install` vos mismo — también deja las skills conversacionales enlazadas en `.claude/skills/` (ver `scripts/instalar-skills.mjs`). No hace falta pedirle nada al profesional para esto.

## Más contexto

- `README.md` — arquitectura de dos niveles (dominio vs. infraestructura) y qué hay implementado hoy.
- `.agents/skills/*/SKILL.md` — el procedimiento detallado de cada habilidad conversacional: `descubrir-necesidad`, `interpretar-proceso`, `conectar-herramienta`, `modificar-proceso`, `revisar-patrones`, `recordar-negocio`.
