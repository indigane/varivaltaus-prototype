# Scoring and win conditions

## Player score

Player score is the number of tiles owned by that player.

```js
function computePlayerScores(state) {
  const scores = Array(state.players.length).fill(0);
  for (const tile of state.board.tiles) {
    if (tile.ownerId !== null) scores[tile.ownerId]++;
  }
  return scores;
}
```

## Team score

Team score is the sum of player scores for players on that team.

```js
function computeTeamScores(state, playerScores) {
  const scores = Array(state.teams.length).fill(0);
  for (const player of state.players) {
    scores[player.teamId] += playerScores[player.id];
  }
  return scores;
}
```

## Win conditions

### `mostTiles`

Game ends when no neutral tiles remain, no legal moves remain, or max turns is reached.

Winner is the player/team with the most tiles.

### `fixedTurns`

Game ends when `turnNumber >= maxTurns`.

Winner is the player/team with the most tiles.

### `targetPercent`

Game ends when a player/team owns at least the configured percentage of tiles.

### `eliminateOthers`

Game ends when only one player/team owns tiles or is alive.

This is less important for early prototype unless enemy capture is enabled.

## Ties

Prototype behavior:

- allow ties,
- display all tied winners,
- do not add tiebreakers yet.
