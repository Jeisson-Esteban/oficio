---
name: conectar-herramienta
description: Conecta una Herramienta externa (Notion, Google Calendar, GoHighLevel...) al Perfil del profesional que está conversando. Se activa cuando el profesional nombra una herramienta que usa, o pide explícitamente conectar/agregar una. Nunca marca una herramienta como lista para usar solo porque se encontró una skill o MCP para ella -- siempre pasa por evaluación y autorización explícita del profesional.
---

# Conectar herramienta

## Principio

Encontrar una integración NO la convierte automáticamente en confiable. El flujo es siempre:

```
Encontrar → Evaluar → Verificar compatibilidad → Identificar capacidades
→ Identificar permisos → Determinar autenticación → Presentar al usuario
→ Usuario autoriza → Conectar
```

Nunca saltes directo de "encontrar" a "conectar".

## Paso 1: buscar en el catálogo ya conocido

```
npx tsx nucleo/cli/buscar-herramienta.ts "<nombre que mencionó>"
```

- Si aparece con `"estado": "disponible"` -> ya fue evaluada, ve al Paso 3.
- Si aparece con `"estado": "pendiente_evaluacion"` o `"no_confirmado"` -> ya se encontró antes pero no está lista para ofrecerse como conectable todavía. Dile al profesional honestamente: "Encontré [herramienta], pero todavía no la terminé de evaluar, así que no te la puedo ofrecer para conectar de forma confiable. ¿Quieres que la investigue más a fondo, o prefieres usar otra?". No la conectes.
- Si no aparece -> Paso 2.

## Paso 2: si no está en el catálogo, buscarla -- y ser CRÍTICO, no solo buscador

**`find-skills` encuentra candidatos, no verifica cómo se desempeñan.** Que algo aparezca en la búsqueda (o tenga muchas instalaciones) no es evidencia de que sea la mejor opción, ni de que funcione bien -- es solo el punto de partida. Tu trabajo no termina en "encontré algo", termina en "esto es realmente lo más apropiado para lo que este profesional necesita".

1. Usa **find-skills** (`npx skills find "<nombre o necesidad>"`) para levantar candidatos.
2. Si aparece más de un candidato razonable, **compáralos explícitamente** antes de elegir uno: ¿cuál tiene un MCP oficial de la propia empresa vs. uno de un tercero desconocido? ¿cuál documenta de verdad qué hace (no solo "instalaciones") vs. cuál es una envoltura genérica sin mantenimiento visible? ¿cuál encaja mejor con la Capacidad concreta que este profesional necesita, no con la lista completa de lo que la herramienta puede hacer?
3. Sé honesto sobre el límite real de esta evaluación: sin credenciales para probarlo en vivo, no puedes confirmar que funciona -- solo que hay evidencia razonable de que existe y de quién lo mantiene. No disfraces esa incertidumbre como certeza.
4. Si tienes dudas genuinas entre dos opciones parecidas, dilo así de claro al profesional en vez de elegir en silencio: "Encontré dos formas de conectar esto, una es más nueva pero oficial, la otra más probada pero de un tercero -- ¿prefieres que empecemos por la oficial?".

Si encuentras algo con evidencia razonable, créale una entrada en `herramientas/<id>.yaml` (siguiendo `nucleo/contratos/herramienta.ts`) con `estado: "pendiente_evaluacion"` y `fuente: "find-skills"`. **Nunca la pongas en `"disponible"` en este mismo paso** -- eso pasa recién en una sesión posterior, después de evaluarla con calma (Provider implementado, permisos claros, forma de autenticación entendida, e idealmente probada una vez con `verificar-integracion.ts`). Sé transparente con el profesional sobre esto: "Encontré algo que podría servir, pero antes de ofrecértela para conectar la voy a revisar con más cuidado."

Si no encuentras nada razonable, dilo honestamente. No inventes que existe una integración, y no elijas la primera opción solo por cerrar la búsqueda rápido.

## Paso 3: presentar y pedir autorización

Antes de conectar nada, explica en una frase qué podrá hacer Claude con esa herramienta una vez conectada (usa `capacidadesQueOfrece` de la entrada del catálogo, traducidas a lenguaje llano) y qué tipo de autenticación requiere (`autenticacion` en el catálogo: oauth, api_key, service_account). Pide autorización explícita. Ejemplo:

```
Notion

Guarda información de tus pacientes: puedo crear fichas, consultarlas
y revisar el historial de sesiones anteriores.

¿Quieres que la conecte?
```

Nunca conectes sin un sí explícito.

## Paso 4: credenciales

No le pidas al profesional que te pegue tokens o secretos en el chat si se puede evitar. Preséntale la `guiaCredenciales` de esa Herramienta en el catálogo (`herramientas/<id>.yaml`), **palabra por palabra y en orden** -- son instrucciones ya escritas para que cualquiera las siga sin saber de tecnología, no las improvises. Al final dile con qué nombre exacto queda la variable de entorno de cada `camposCredenciales` (formato `<HERRAMIENTA>__DEFAULT__<CAMPO>`, ver `nucleo/configuracion/variables-entorno.ts`). Confirmar que la variable está puesta es responsabilidad del profesional o de quien despliegue esto -- tu trabajo es dejarle instrucciones claras, no manipular secretos directamente.

## Paso 5: registrar la conexión

Solo capacidades explícitamente autorizadas (mínimo privilegio) -- no actives todas las que ofrece la herramienta si el profesional solo pidió una:

```
npx tsx nucleo/cli/guardar-integracion.ts <perfilId> @ruta-al-json
```

donde el JSON sigue `nucleo/contratos/integracion.ts` (`herramienta`, `capacidadesHabilitadas`, `credencialesRef`, `conectadoEn`, `estado: "activa"`).

## Paso 6: verificar de verdad (no dar por hecho que funciona)

Guardar el archivo no prueba que las credenciales sirvan. Corre siempre:

```
npx tsx nucleo/cli/verificar-integracion.ts <perfilId> <herramientaId>
```

- Si `verificacion.ok` es `true` → dile al profesional que quedó conectada y probada, no solo guardada.
- Si es `false` → muéstrale el error en lenguaje simple y ayúdalo a revisar ese paso de la guía de credenciales, sin asumir que el resto de la conexión está mal.

## Qué NO hacer

- No marques una Herramienta "disponible" solo porque find-skills encontró algo.
- No conectes una Herramienta sin autorización explícita del profesional.
- No habilites más Capacidades de las que el profesional pidió.
- No le muestres al profesional el YAML ni le pidas que edite archivos.
- No des una conexión por buena sin haber corrido el Paso 6.
