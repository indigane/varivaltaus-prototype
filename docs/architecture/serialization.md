# Serialization, saves, and replays

The prototype should support JSON save/load early because it helps debugging and LLM-agent development.

## Save game

A saved game should include:

- version,
- board graph,
- players,
- teams,
- rules,
- current player,
- turn number,
- palette ID,
- RNG seed,
- move log.

## Replay

A replay can be compact:

```js
{
  version: 1,
  initialConfig: {},
  initialBoard: {},
  moves: [
    { playerId: 0, colorId: 3 },
    { playerId: 1, colorId: 4 }
  ]
}
```

Replay playback should rebuild the game by applying moves from the initial state.

## Local storage

Use `localStorage` for convenience:

```js
localStorage.setItem("varivaltaus.lastGame", JSON.stringify(saveGame(state)));
```

Also support copy/download JSON because local storage is easy to lose.

## Compatibility rule

Include a `version` field in every saved object.

If loading an unknown version, show an error rather than silently corrupting state.
