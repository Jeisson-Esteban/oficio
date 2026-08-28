---
name: analizar-repositorio
description: Investiga críticamente un repositorio de GitHub que el usuario comparte, para decidir si aporta algo real a este proyecto -- nunca instala ni integra nada solo por encontrarlo. Se activa cuando el usuario pega una URL de github.com y pide revisarla, analizarla, o ver si sirve para el proyecto.
---

# Analizar repositorio

## Principio

Que un repositorio exista, tenga muchas estrellas, o el usuario lo encuentre interesante NO significa que resuelva un problema que este proyecto realmente tiene. El trabajo no termina en "esto hace algo genial" -- termina en un veredicto honesto: adoptarlo completo, adoptar una idea puntual, o rechazarlo, con la razón explícita.

## Paso 1: reunir evidencia real, no solo la primera impresión

```
gh repo view <owner>/<repo> --json name,description,url,primaryLanguage,stargazerCount,pushedAt,createdAt
gh api repos/<owner>/<repo>/readme --jq '.content' | base64 -d | head -c 6000
```

Si el README no alcanza para entender cómo funciona de verdad (instalación, arquitectura, qué guarda/hace exactamente), sigue leyendo secciones específicas antes de opinar -- no juzgues por el título o el badge de estrellas.

Señales de mantenimiento real a considerar: `pushedAt` reciente, versión/changelog visible, tests mencionados, quién lo mantiene (persona/org reconocible vs. anónimo).

## Paso 2: identificar el problema real que resuelve

Antes de comparar nada, responde en una frase: *¿qué problema concreto resuelve esto?* Sé literal -- "indexa código fuente con AST" no es lo mismo que "guarda hechos de negocio de un profesional", aunque ambos usen la palabra "memoria" o "contexto".

## Paso 3: comparar contra lo que este proyecto YA tiene o necesita

- ¿Ya existe algo en `nucleo/` que resuelve esto? Si sí, ¿la alternativa nueva es genuinamente mejor, o es lo mismo con otro nombre?
- ¿El problema que resuelve es uno que este proyecto realmente tiene, o se parece solo superficialmente (misma palabra, distinto propósito)? Este es el error más común -- ver [[project-arquitectura-skill-plataforma]] para dos ejemplos reales ya evaluados así (`codebase-memory-mcp`, `claude-mem`).
- ¿Qué costo trae adoptarlo? (runtime nuevo, dependencia de infraestructura externa, tocar configuración de Claude Code -- hooks, MCP, settings). Nombra el costo explícito, no lo escondas.

## Paso 4: veredicto honesto, una de tres

1. **Adoptar completo** -- solo si resuelve un problema real de este proyecto mejor de lo que ya existe, y el costo de adoptarlo es proporcional.
2. **Adoptar una idea puntual, no la herramienta** -- lo más común. Extraer el concepto útil (un patrón, un enfoque) e implementarlo con las herramientas y el estilo que ya tiene este proyecto, sin arrastrar toda la dependencia.
3. **Rechazar** -- dilo así de directo, con la razón concreta, no con evasivas.

## Paso 5: comunicar antes de actuar

- Nunca instales, ni corras un instalador, ni agregues una dependencia solo porque la investigación fue positiva -- presenta el veredicto primero.
- Si el usuario ya pidió explícitamente instalar/probar algo, y eso toca configuración de Claude Code (hooks, `.mcp.json`, settings), sé transparente sobre exactamente qué cambia y dónde (proyecto vs. global) -- mismo criterio que ya se usa en todo este proyecto.
- Si el hallazgo es relevante a futuro, guárdalo en la memoria del proyecto (no en la memoria de negocio de un Perfil -- esa es para hechos de profesionales, esta es para decisiones técnicas del propio proyecto).

## Qué NO hacer

- No instales nada "para probar" antes de dar el veredicto.
- No digas que algo "parece útil" sin decir para qué, específicamente, en este proyecto.
- No rechaces ni adoptes solo por la cantidad de estrellas -- son una señal de popularidad, no de que resuelva el problema correcto.
