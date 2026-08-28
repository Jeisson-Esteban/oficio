---
name: revisar-patrones
description: Revisa la actividad reciente de un profesional y sugiere mejoras a su forma de trabajar (convertir algo repetido en Proceso, avisar de fallos seguidos, o señalar una Integración que no se usa). Se activa cuando el profesional pregunta algo como "¿cómo voy?", "¿tienes alguna sugerencia?", "¿algo que deba ajustar?", o de forma periódica al iniciar una conversación si hace tiempo no se revisa.
---

# Revisar patrones

## Principio

Esto SOLO sugiere. Nunca crea un Proceso, nunca desconecta una Herramienta, nunca cambia nada por su cuenta -- cada hallazgo se presenta y el profesional decide, igual que al crear o modificar un Proceso (ver skill `interpretar-proceso`).

## Cómo correrlo

```
npx tsx nucleo/cli/revisar-patrones.ts <perfilId> [periodoDias=30]
```

Devuelve una lista de hallazgos (puede venir vacía -- eso es normal y correcto, no hay que forzar que aparezca algo). Cada uno trae evidencia concreta detrás; si no hay evidencia suficiente, el sistema no inventa nada.

## Cómo presentarlo

Nunca muestres el JSON crudo ni menciones "categoría" o "severidad" -- tradúcelo a una frase natural por hallazgo, de mayor a menor importancia. Ejemplos según la categoría:

- **proceso_candidato**: "Note que buscaste el historial de tus pacientes 4 veces esta semana de la misma forma. ¿Quieres que lo guarde como algo que hago siempre?"
- **fallo_recurrente**: "Las últimas veces que intenté consultar tu calendario, falló. Puede que la conexión necesite revisarse -- ¿la revisamos?"
- **proceso_dormido**: "Tienes guardado un proceso de '[nombre]' que no se ha usado en un tiempo. ¿Sigue siendo útil, o lo pausamos?"
- **integracion_sin_uso**: "Conectaste [herramienta] pero no la hemos usado. ¿La seguimos teniendo conectada o la desconectamos?"

Si no hay hallazgos, dilo simple: "Todo se ve normal, no tengo ninguna sugerencia por ahora."

## Qué hacer con la respuesta

- Si confirma un `proceso_candidato` → pásale la conversación a `interpretar-proceso` con lo que ya sabes (la Capacidad, cuántas veces, qué Herramienta) para no repreguntar de cero.
- Si confirma revisar un `fallo_recurrente` → pásale la conversación a `conectar-herramienta` para revisar credenciales/permisos.
- Si confirma pausar un `proceso_dormido` → guarda el Proceso con `estado: "pausado"` vía `guardar-proceso.ts`, incrementando versión e historial como cualquier otro cambio.
- Si confirma desconectar una `integracion_sin_uso` → marca esa Integración con `estado: "revocada"` (mismo mecanismo de `guardar-integracion.ts`).

Nunca hagas ninguno de estos cuatro cambios sin que el profesional lo haya confirmado explícitamente en esta conversación.
