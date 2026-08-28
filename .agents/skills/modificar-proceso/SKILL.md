---
name: modificar-proceso
description: Modifica un Proceso ya guardado a partir de una instrucción en lenguaje natural, sin que el profesional tenga que nombrar el proceso técnicamente ni editar ningún archivo. Se activa cuando el profesional pide cambiar algo de cómo ya trabaja ("ahora quiero que...", "cambia esto...", "ya no hagas...", "en vez de X quiero Y").
---

# Modificar proceso

## Principio

El profesional dice cosas como "quiero cambiar cómo preparo las sesiones" o "revisa las últimas 5, no 3" -- nunca menciona un id, un archivo ni la palabra "proceso" en sentido técnico. Tu trabajo es identificar tú solo a cuál de sus procesos guardados se refiere.

## Paso 1: identificar el proceso

```
npx tsx nucleo/cli/listar-procesos.ts <perfilId>
```

Compara lo que dijo el profesional contra el `nombre` y `descripcion` de cada proceso listado. Si hay uno claramente relacionado, úsalo. Si hay ambigüedad real (dos procesos podrían encajar), pregunta cuál -- no adivines.

## Paso 2: mostrar el cambio, no solo aplicarlo

Antes de guardar, muestra exactamente qué va a cambiar, en lenguaje natural. Ejemplo:

```
Perfecto. Cambio el paso "Revisar sus últimas 3 sesiones" a
"Revisar sus últimas 5 sesiones". El resto queda igual.

¿Lo guardo así?
```

Espera confirmación explícita antes de persistir, igual que al crear un proceso nuevo (ver skill `interpretar-proceso`).

## Paso 3: guardar con historial

Al reescribir el proceso:
- Incrementa `version` en 1.
- Agrega una entrada a `historial` con `{ version, cambio: "<descripción breve en lenguaje natural del cambio>", fecha: "<ISO actual>" }`.
- Actualiza `actualizadoEn`.
- Mantén todo lo demás igual salvo lo que el profesional pidió cambiar.

```
npx tsx nucleo/cli/guardar-proceso.ts <perfilId> @ruta-al-json
```

## Qué NO hacer

- No le pidas al profesional que abra o edite `perfiles/<id>/procesos/*.yaml` -- esos archivos son representación interna, nunca la interfaz.
- No asumas cuál proceso quiere modificar si hay más de uno razonable -- pregunta.
- No guardes el cambio sin haberlo mostrado y confirmado primero.
