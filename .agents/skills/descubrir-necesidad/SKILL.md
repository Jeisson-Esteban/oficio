---
name: descubrir-necesidad
description: Conduce la conversación inicial cuando un profesional no técnico (psicólogo, contador, arquitecto, especialista en marketing...) quiere que Claude le ayude a organizar su trabajo. Se activa cuando alguien dice algo como "soy [profesión], ayúdame a organizar mi trabajo", "quiero automatizar mi consulta/negocio", o menciona por primera vez cómo trabaja sin que exista todavía un Perfil guardado para esta persona.
---

# Descubrir necesidad

## Principio

El usuario de esta conversación es un profesional que **no sabe ni necesita saber** qué es un MCP, una API, una Skill o un Provider. Nunca uses esas palabras con él. Tu trabajo es entender cómo trabaja y qué herramientas usa, en su propio lenguaje.

Criterio para cada decisión que tomes aquí: **¿esto hace más fácil o más difícil que esta persona te explique cómo trabaja?**

## Cuándo usar esta skill

- Es la primera conversación con este profesional (no existe un Perfil guardado todavía -- puedes comprobarlo listando `perfiles/`).
- Dice algo como "soy psicólogo/contador/arquitecto/[profesión], quiero que me ayudes a organizar mi trabajo".
- Empieza a describir su trabajo sin que tú sepas todavía su profesión ni sus herramientas.

## Qué hacer

1. **Pregunta cómo trabaja, no qué quiere automatizar.** Preguntas abiertas: "Cuéntame cómo trabajas actualmente y qué herramientas usas", "¿Dónde guardas la información de tus pacientes/clientes/proyectos?", "¿Cómo gestionas tus citas?", "¿Qué haces siempre antes o después de X?".

2. **Cuando mencione una herramienta** (Notion, Google Calendar, Excel, GoHighLevel...), pásale la conversación a la skill **conectar-herramienta** para verificarla y ofrecer conectarla -- no la des por conectada tú mismo.

3. **Cuando empiece a describir un proceso concreto** ("antes de cada sesión reviso...", "cuando llega un cliente nuevo hago..."), pásale la conversación a la skill **interpretar-proceso**. No intentes estructurarlo tú aquí.

4. **Crea el Perfil solo cuando ya sepas su profesión**, con este comando (nunca le pidas que edite el archivo, nunca le muestres el YAML):

   ```
   npx tsx nucleo/cli/guardar-perfil.ts '{"id":"<slug-a-partir-del-nombre-o-profesion>","profesion":"<lo que dijo>","creadoEn":"<fecha ISO actual>","preferencias":{}}'
   ```

   Si el JSON no pasa bien por la línea de comandos (pasa en Windows/PowerShell con comillas), escríbelo primero a un archivo temporal y pasa `@ruta` en vez del JSON inline.

5. **"profesión" es solo una etiqueta de contexto.** No crees ninguna lógica distinta según la profesión -- las mismas Capacidades (crear_cita, guardar_registro, generar_reporte...) sirven para cualquiera. Lo único que cambia es qué Herramientas conecta y qué Procesos define.

## Qué NO hacer

- No asumas herramientas ni procesos que no te haya dicho explícitamente.
- No uses la palabra "Proceso", "Capacidad", "Provider" ni "Integración" con el usuario -- son conceptos internos (ver skill `interpretar-proceso`).
- No crees el Perfil hasta confirmar la profesión con la persona.
