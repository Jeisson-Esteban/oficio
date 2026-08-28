---
name: recordar-negocio
description: Detecta y guarda en memoria cualquier dato sobre cómo es o cómo opera el negocio del profesional que surja en la conversación -- horarios, tipos de servicio que ofrece, cuántos pacientes/clientes tiene, preferencias de trabajo, reglas que menciona de pasada -- incluso cuando NO está formalmente creando o modificando un Proceso. Se activa en cualquier momento de cualquier conversación donde el profesional comparta algo sobre su negocio, no solo dentro de interpretar-proceso.
---

# Recordar negocio

## Principio

El profesional no tiene que decir "guarda esto en memoria" -- ese es un concepto técnico que no conoce. Tu trabajo es notar CUANDO está compartiendo algo real sobre su negocio (aunque sea de pasada, en medio de otra conversación) y guardarlo tú, sin que él tenga que pedirlo.

Esto es lo que completa a `revisar-patrones`: esa skill aprende observando actividad ya ocurrida (qué Capacidades se usaron); esta skill aprende de lo que el profesional te CUENTA directamente, en el momento en que lo cuenta.

## Cuándo se activa

Ejemplos de cosas que debes reconocer como "dato de negocio" y capturar, sin que el profesional use ningún término técnico:

- "Atiendo de lunes a viernes, de 9 a 5" -> horario/forma de operar.
- "Tengo como 40 pacientes activos" -> escala del negocio.
- "Ofrezco terapia individual y de pareja" -> tipos de servicio.
- "Mis clientes casi siempre me escriben los lunes" -> patrón de comportamiento de sus clientes.
- "Normalmente cobro por sesión, no por paquete" -> modelo de cobro.
- Cualquier regla, excepción o costumbre que mencione sin que estés en medio de crear un Proceso formal.

## El profesional sigue siendo la fuente de verdad

Mismo principio que en `interpretar-proceso`: si algo queda ambiguo o incompleto, **pregunta antes de guardar** -- no completes el hueco adivinando. Ejemplo: si dice "normalmente reviso antes de las citas" sin decir qué exactamente, pregunta "¿qué sueles revisar?" antes de guardarlo como un dato concreto.

No hace falta pedir permiso para CADA dato menor y trivial (eso sería más fricción que ayuda) -- pero sí confirma en una frase breve cuando el dato es importante o cuando tienes dudas de haberlo entendido bien: "Anoto que atiendes solo por las mañanas, ¿es así?".

## Cómo guardar

1. Elige el tipo que mejor encaje (ver `nucleo/memoria/memoria.ts`):
   - `dato_negocio`: hechos generales sobre el negocio (horarios, tipos de servicio, escala).
   - `preferencia`: cómo prefiere que Claude se comporte o le ayude.
   - `referencia_fuente`: dónde vive cierta información (ej. "los pacientes están en Notion").
2. Arma la entrada siguiendo `nucleo/contratos` (`tipo`, `clave` en snake_case corta y estable, `valor` -- una frase corta, NUNCA el dato sensible completo, `creadoEn` en ISO).
3. Guarda:

   ```
   npx tsx nucleo/cli/guardar-memoria.ts <perfilId> @ruta-al-json
   ```

   Si ya existe una entrada con la misma `clave`, se reemplaza sola -- no genera duplicados. Por eso conviene reusar la misma `clave` cuando estés actualizando algo que ya sabías (ej. si el horario cambia, guarda de nuevo con la misma `clave` que usaste la primera vez).

## Qué NUNCA guardar aquí

- El contenido real de una ficha, un mensaje, un monto exacto de un cliente específico -- eso vive en la Herramienta conectada (Notion, Neon...), memoria solo guarda que existe y dónde. Ver el límite de 500 caracteres en el schema: si lo que vas a guardar no cabe cómodo en una frase corta, es una señal de que es demasiado detalle para memoria.
- Nada que el profesional no haya dicho explícitamente -- no inventes ni generalices de más a partir de un solo comentario.

## Antes de responder algo importante del negocio

Cuando el profesional pregunte algo donde ya podrías tener contexto guardado, consúltalo primero:

```
npx tsx nucleo/cli/listar-memoria.ts <perfilId>
```

Úsalo para no volver a preguntar algo que ya te dijeron antes.
