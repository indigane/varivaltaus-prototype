# Context router for LLM agents

Use this file to decide which markdown files to load for a task.

Always keep [`00_ALWAYS_LOAD.md`](00_ALWAYS_LOAD.md) loaded.

## If editing game rules or turn logic

Load:

- [`architecture/engine-overview.md`](architecture/engine-overview.md)
- [`architecture/game-state.md`](architecture/game-state.md)
- [`architecture/rules.md`](architecture/rules.md)
- [`architecture/move-algorithm.md`](architecture/move-algorithm.md)
- [`architecture/scoring-and-win.md`](architecture/scoring-and-win.md)
- [`testing/game-logic-tests.md`](testing/game-logic-tests.md)

## If editing board representation or graph utilities

Load:

- [`architecture/engine-overview.md`](architecture/engine-overview.md)
- [`architecture/graph-format.md`](architecture/graph-format.md)
- [`architecture/serialization.md`](architecture/serialization.md)
- [`testing/tiling-tests.md`](testing/tiling-tests.md)

## If adding or changing tilings

Load:

- [`architecture/graph-format.md`](architecture/graph-format.md)
- [`tilings/overview.md`](tilings/overview.md)
- The relevant tiling file:
  - [`tilings/square.md`](tilings/square.md)
  - [`tilings/triangle.md`](tilings/triangle.md)
  - [`tilings/hex.md`](tilings/hex.md)
  - [`tilings/pentagon-cairo.md`](tilings/pentagon-cairo.md)
  - [`tilings/custom-json.md`](tilings/custom-json.md)
  - [`tilings/masks.md`](tilings/masks.md)
- [`testing/tiling-tests.md`](testing/tiling-tests.md)

## If editing bots

Load:

- [`architecture/game-state.md`](architecture/game-state.md)
- [`architecture/move-algorithm.md`](architecture/move-algorithm.md)
- [`bots/overview.md`](bots/overview.md)
- The relevant bot file:
  - [`bots/random.md`](bots/random.md)
  - [`bots/greedy.md`](bots/greedy.md)
  - [`bots/lookahead.md`](bots/lookahead.md)
- [`testing/bot-tests.md`](testing/bot-tests.md)

## If editing rendering or input

Load:

- [`architecture/graph-format.md`](architecture/graph-format.md)
- [`ui/canvas-renderer.md`](ui/canvas-renderer.md)
- [`ui/input.md`](ui/input.md)
- [`ui/panels.md`](ui/panels.md)
- [`ui/mobile-tablet-pass.md`](ui/mobile-tablet-pass.md) if touching responsive layout.

## If editing palettes

Load:

- [`architecture/game-state.md`](architecture/game-state.md)
- [`ui/palettes.md`](ui/palettes.md)
- [`ui/canvas-renderer.md`](ui/canvas-renderer.md)

## If editing save/load, replay, or sample maps

Load:

- [`architecture/serialization.md`](architecture/serialization.md)
- [`ui/replay.md`](ui/replay.md)
- [`tilings/custom-json.md`](tilings/custom-json.md)
- [`testing/serialization-tests.md`](testing/serialization-tests.md)

## If choosing what to build next

Load:

- [`milestones/overview.md`](milestones/overview.md)
- The current milestone file under [`milestones/`](milestones/)

## If doing broad refactoring

Load:

- [`00_ALWAYS_LOAD.md`](00_ALWAYS_LOAD.md)
- [`architecture/engine-overview.md`](architecture/engine-overview.md)
- [`architecture/game-state.md`](architecture/game-state.md)
- [`architecture/graph-format.md`](architecture/graph-format.md)
- [`architecture/rules.md`](architecture/rules.md)
- [`architecture/move-algorithm.md`](architecture/move-algorithm.md)
