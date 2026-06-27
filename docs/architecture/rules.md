# Rules

The prototype should keep rules configurable so playtesting can discover what is fun.

## Rule object

```js
const rules = {
  winCondition: "mostTiles",
  turnOrder: "players",
  teamTerritory: "separatePlayers",
  captureMode: "neutralOnly",
  colorRestrictions: "notOwnColor",
  startingPositions: "corners",
  maxTurns: null
};
```

## Rule fields

### `winCondition`

Allowed values:

- `"mostTiles"`
- `"eliminateOthers"`
- `"targetPercent"`
- `"fixedTurns"`

For early prototype, implement `mostTiles` and `fixedTurns` first.

### `turnOrder`

Allowed values:

- `"players"`
- `"teams"`

Prototype recommendation: implement `players` first.

### `teamTerritory`

Allowed values:

- `"separatePlayers"`
- `"sharedTeam"`

Prototype recommendation: implement `separatePlayers` first. In that mode, each player owns their own tiles, but team score sums all team members.

### `captureMode`

Allowed values:

- `"neutralOnly"`
- `"canCaptureEnemies"`
- `"cannotTouchEnemies"`

Implement in this order:

1. `neutralOnly`
2. `canCaptureEnemies`
3. `cannotTouchEnemies` if useful

### `colorRestrictions`

Allowed values:

- `"none"`
- `"notOwnColor"`
- `"notAdjacentEnemyColor"`

Implement `notOwnColor` first.

### `startingPositions`

Allowed values:

- `"corners"`
- `"randomSeparated"`
- `"manual"`

Implement `corners` for square/rectangular boards and `randomSeparated` for arbitrary graphs.

## Initial playtest modes

### Solo Classic

- players: 1
- bots: none
- win condition: fixed turn count or target percent
- capture mode: neutral only

### Duel Flood

- players: 2
- alternate turns
- neutral capture only initially
- compare score when board is full or no useful moves remain

### Territory Conquest

- players: 2+
- teams optional
- enemy capture can be enabled
- useful for testing chaotic variants
