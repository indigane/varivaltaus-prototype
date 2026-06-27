# Värivaltaus / Flood Prototype Plan for LLM Agents

This directory contains a decomposed plan for building the **prototype version** of Värivaltaus/Flood.

The structure is optimized for an LLM coding agent that should not load the full plan into context for every task.

## How to use this directory

Always load:

1. [`00_ALWAYS_LOAD.md`](00_ALWAYS_LOAD.md)
2. [`01_CONTEXT_ROUTER.md`](01_CONTEXT_ROUTER.md)
3. The specific task file(s) listed by the context router.

Do not load every file unless doing broad architecture work.

## Prototype constraints

- Browser-based.
- Static/local only.
- Plain JavaScript only.
- No TypeScript.
- No npm.
- No bundler.
- Libraries may be used only if manually included, but the default is no libraries.
- Canvas 2D rendering.
- Prototype should test rules, tilings, players, teams, and bots.
- Extreme performance is not required yet, but avoid obviously wasteful design.

## Key architectural principle

The game is a **graph game**, not a square-grid game.

Every board, regardless of tiling, should produce the same graph format:

```js
Tile {
  id,
  colorId,
  ownerId,
  points,
  neighbors
}
```

Squares, triangles, hexagons, pentagons, irregular maps, and custom maps are all generators that produce this graph.
