# Move algorithm

This file describes how a player choosing a color changes the board.

## Input

```js
applyMove(state, playerId, colorId)
```

## Output

```js
{
  state,
  changedTileIds,
  capturedTileIds,
  recoloredTileIds,
  nextPlayerId,
  gameEnded,
  winnerIds
}
```

## Basic algorithm

```text
1. Validate that the game is still playing.
2. Validate that it is the player's turn.
3. Validate that colorId is legal.
4. Find the player's territory.
5. Recolor the player's territory to colorId.
6. Flood from the territory through capturable neighboring tiles of colorId.
7. Update ownership of captured tiles.
8. Recompute scores.
9. Append to move log.
10. Advance turn.
11. Check win condition.
```

## Prototype BFS

Simple BFS is fine for the prototype.

```js
function floodCapture(state, playerId, colorId) {
  const queue = [];
  const visited = new Set();
  const captured = [];

  for (const tile of state.board.tiles) {
    if (tile.ownerId === playerId) {
      queue.push(tile.id);
      visited.add(tile.id);
      if (tile.colorId !== colorId) {
        tile.colorId = colorId;
      }
    }
  }

  while (queue.length > 0) {
    const tileId = queue.shift();
    const tile = state.board.tiles[tileId];

    for (const neighborId of tile.neighbors) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);

      const neighbor = state.board.tiles[neighborId];
      if (!canCaptureTile(state, playerId, neighborId)) continue;
      if (neighbor.colorId !== colorId) continue;

      neighbor.ownerId = playerId;
      captured.push(neighborId);
      queue.push(neighborId);
    }
  }

  return captured;
}
```

## Important details

- Recolor owned territory before capture.
- Capturable means different things depending on `captureMode`.
- Team rules may expand territory beyond a single player later.
- For prototype simplicity, rescan owned tiles every turn.
- Later, maintain frontiers for performance.

## Legal color examples

With `notOwnColor`, a player cannot choose the color already used by their owned territory.

With multiple owned colors due to unusual rules, define own color as either:

- the color of the first owned tile, or
- illegal only if all owned tiles already have that color.

Simpler prototype rule: owned territory should always be recolored as one color after each move.
