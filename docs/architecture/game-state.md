# Game state

The game state should be JSON-serializable.

## Shape

```js
const gameState = {
  version: 1,
  board: {
    tiles: []
  },
  players: [],
  teams: [],
  currentPlayerId: 0,
  colorCount: 6,
  paletteId: "default-6",
  rules: {},
  turnNumber: 0,
  rngSeed: 12345,
  moveLog: [],
  status: "playing"
};
```

## Player

```js
const player = {
  id: 0,
  name: "Player 1",
  teamId: 0,
  control: "human", // "human" or "bot"
  botKind: null,    // null, "random", "greedy", "lookahead"
  alive: true,
  score: 0
};
```

## Team

```js
const team = {
  id: 0,
  name: "Team 1",
  playerIds: [0],
  score: 0
};
```

## Tile

See [`graph-format.md`](graph-format.md).

## Move log entry

```js
const move = {
  turn: 12,
  playerId: 1,
  colorId: 3,
  changedTileIds: [4, 7, 8],
  scoresAfter: {
    players: [10, 12],
    teams: [10, 12]
  }
};
```

## Notes for LLM agents

- Do not store functions in game state.
- Do not store DOM nodes in game state.
- Do not store Canvas paths in game state.
- Keep geometry in `tile.points` only.
- Keep ownership in `tile.ownerId` only.
- Keep color in `tile.colorId` only.
