# Always-load context

Keep this file in context for every implementation task.

## Project

Prototype implementation of **Värivaltaus / Flood / Flood It**.

Goal: quickly test whether the design space is fun:

- any number of colors,
- switchable palettes,
- square, triangle, hex, pentagon, and custom/non-uniform tilings,
- arbitrary map shapes,
- any number of players including solo,
- any player can be human or bot,
- teams, such as 2v2,
- local static hot-seat play,
- later mobile/tablet-friendly playtesting.

## Hard prototype constraints

- Use **plain JavaScript**, not TypeScript.
- Use **no npm**.
- Use **no bundler**.
- Use browser-native ES modules.
- Use static files only.
- Use Canvas 2D.
- Prefer no external libraries.
- If a library is truly needed, include it manually as a file and document why.

## Core design invariant

The engine must be graph-based.

Do not make rules depend on square-grid coordinates.

All board generators must output the same logical board shape:

```js
{
  tiles: [
    {
      id: 0,
      colorId: 2,
      ownerId: null,
      points: [[x, y], ...],
      neighbors: [1, 4, 5]
    }
  ]
}
```

## Suggested prototype file structure

```text
index.html
style.css
js/
  main.js
  core/
    rng.js
    graph.js
    game.js
    rules.js
    scoring.js
    serialize.js
  tilings/
    square.js
    triangle.js
    hex.js
    pentagon-cairo.js
    custom-json.js
    masks.js
  bots/
    random.js
    greedy.js
    lookahead.js
  ui/
    canvas-renderer.js
    input.js
    panels.js
    replay.js
  tests/
    test-runner.js
    game-tests.js
    tiling-tests.js
maps/
  sample-square.json
  sample-hex.json
  sample-cairo-pentagon.json
```

## Coding style

- Keep modules small.
- Prefer pure functions for engine logic.
- Keep game logic independent from Canvas, DOM, and input handling.
- Keep bot logic independent from UI.
- Avoid per-frame allocations where easy, but do not over-optimize.
- Make state serializable to JSON.
- Every rule option should have a default.

## Current prototype priority

1. Make square solo playable.
2. Convert immediately to graph-based engine.
3. Add hot-seat multiplayer.
4. Add teams and bots.
5. Add multiple tilings.
6. Add tablet/mobile playtest improvements.
