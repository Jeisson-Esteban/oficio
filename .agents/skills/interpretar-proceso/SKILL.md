---
name: interpretar-proceso
description: Traduce la descripción en lenguaje natural de un profesional sobre cómo hace su trabajo a un Proceso guardado internamente, SIEMPRE mostrando el borrador y pidiendo confirmación explícita antes de guardar. Se activa cuando un profesional describe algo que hace de forma repetible ("cuando pasa X, hago...", "antes de cada..., reviso...", "todos los [período] yo...").
---

# Interpretar proceso

## Principio fundamental

**"Proceso" es una palabra técnica interna. El usuario nunca tiene que conocerla ni usarla.** Para él, esto es simplemente "cómo trabaja" o "su forma habitual de hacer algo". Nunca le digas "voy a crear un Proceso" -- di "voy a guardar esto como tu forma habitual de trabajar" o similar.

**El profesional es la única fuente de verdad sobre su propio trabajo.** Nunca completes un hueco de la lógica inventando una regla razonable -- si algo no quedó claro, se pregunta. El flujo es siempre:

```
Escuchar → Identificar lo que falta → Preguntar → Proponer → Confirmar → Guardar
```

Nunca guardes nada sin haber mostrado el borrador completo y haber recibido una confirmación explícita ("sí", "guárdalo", "así está bien"...). Un "ok" ambiguo a mitad de la explicación no cuenta como confirmación de guardado.

## Cómo estructurar lo que escuchas

Mientras el profesional describe su forma de trabajar, identifica (para ti, no lo verbalices con esta terminología):

- **disparador**: ¿cuándo pasa esto? Si no lo dijo explícitamente, es `manual` (el profesional lo pide cuando lo necesita). Si dijo algo como "cuando llega un paciente nuevo" es `evento`. Si dijo algo como "cada mañana"/"antes de cada cita" que implica un horario, es `programado` -- en el MVP actual los disparadores automáticos todavía no se ejecutan solos, así que si detectas uno, avisa: "por ahora lo puedo ejecutar cuando tú me lo pidas; que corra solo automáticamente es algo que agregamos más adelante".
- **pasos**: la secuencia de acciones, en las palabras del profesional, no las tuyas.
- **capacidad de cada paso**: revisa `capacidades/catalogo.yaml` (o `npx tsx nucleo/registro/cli-listar-capacidades.ts`) y, si un paso corresponde claramente a una Capacidad existente, anótala. Si no corresponde a ninguna (ej. "identificar los puntos importantes"), no le fuerces una -- ese paso lo resuelves tú razonando en el momento, no llamando a nada.
- **reglas**: cualquier condición o excepción que haya mencionado ("si el paciente es nuevo...", "excepto cuando..."). Guarda el texto tal cual lo dijo.

## Cuando falte información

No asumas. Pregunta con opciones concretas cuando ayude, por ejemplo: "¿Cuántas sesiones anteriores quieres que revise?" en vez de asumir un número. Solo avanza cuando tengas lo que necesitas para proponer algo completo.

## Cómo confirmar (formato obligatorio)

Antes de guardar, muestra siempre el proceso completo en pasos numerados y en español llano, y pide confirmación explícita. Ejemplo:

```
Entendí esto:

Antes de cada sesión:
1. Identificar al paciente de la próxima cita.
2. Revisar sus últimas 3 sesiones.
3. Identificar puntos pendientes.
4. Prepararte un resumen.

¿Quieres que lo guarde como tu forma habitual de trabajar?
```

Solo tras un "sí"/equivalente, guarda.

## Cómo guardar

1. Genera un `id` en snake-case/kebab-case a partir del nombre (ej. "preparación de sesión" -> `preparacion-sesion`). El usuario nunca elige ni ve este id.
2. Arma el JSON del Proceso siguiendo el schema de `nucleo/contratos/proceso.ts` (disparador, pasos, reglas, capacidadesUsadas derivado de los pasos con capacidad, estado "activo", version 1, creadoEn/actualizadoEn en ISO, historial vacío).
3. Escríbelo a un archivo temporal (evita problemas de comillas en shell) y ejecútalo:

   ```
   npx tsx nucleo/cli/guardar-proceso.ts <perfilId> @ruta-al-json
   ```

4. Confirma al profesional en una frase natural, nunca mencionando el archivo ni el YAML: "Listo, ya quedó guardado como tu forma habitual de preparar sesiones."

## Si algún paso necesita una Herramienta que no está conectada

No lo guardes como si ya funcionara. Pásale la conversación a la skill **conectar-herramienta** primero, y retoma esta skill después de que el profesional autorice la conexión.

## Modificaciones a un proceso existente

Si el profesional está cambiando algo de un proceso que ya existe (no describiendo uno nuevo), usa la skill **modificar-proceso** en vez de crear uno duplicado.
