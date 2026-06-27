# Example prompts for LLM agents

## Implement square board generator

Load:

- `00_ALWAYS_LOAD.md`
- `architecture/graph-format.md`
- `tilings/square.md`
- `testing/tiling-tests.md`

Prompt:

```text
Implement `js/tilings/square.js` for the Värivaltaus prototype. It must generate a board graph using the format in `architecture/graph-format.md`. Add or update tests from `testing/tiling-tests.md`. Use plain JavaScript ES modules only. No npm.
```

## Implement greedy bot

Load:

- `00_ALWAYS_LOAD.md`
- `architecture/game-state.md`
- `architecture/move-algorithm.md`
- `bots/overview.md`
- `bots/greedy.md`
- `testing/bot-tests.md`

Prompt:

```text
Implement the greedy bot. It must choose the legal color with the largest immediate tile gain by simulating moves on cloned state. It must not mutate the real state during simulation. Add browser-runner tests.
```

## Add hex tiling

Load:

- `00_ALWAYS_LOAD.md`
- `architecture/graph-format.md`
- `tilings/overview.md`
- `tilings/hex.md`
- `testing/tiling-tests.md`

Prompt:

```text
Add a hex board generator that emits normal tile graph data. The engine and renderer must not need special hex-specific rule logic. Add graph validation tests for neighbor symmetry and 6-point polygons.
```
