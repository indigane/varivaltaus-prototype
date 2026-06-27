# Engine overview

The prototype engine should be independent from rendering, DOM, input, and storage.

The engine answers these questions:

- What is the current game state?
- Which moves are legal?
- What happens when a move is applied?
- Whose turn is next?
- What are the scores?
- Has the game ended?

## Non-goals for the prototype engine

The engine should not:

- draw Canvas shapes,
- read DOM events,
- manage buttons,
- decide screen layout,
- perform online networking,
- assume square grids.

## Recommended module responsibilities

```text
core/graph.js
  validateBoardGraph(board)
  getTile(board, id)
  computeConnectedComponent(...)

core/game.js
  createGame(config)
  cloneGameState(state)
  applyMove(state, playerId, colorId)
  getLegalMoves(state, playerId)
  advanceTurn(state)

core/rules.js
  defaultRules()
  isLegalMove(state, playerId, colorId)
  canCaptureTile(state, playerId, tileId)

core/scoring.js
  computePlayerScores(state)
  computeTeamScores(state)
  getWinner(state)

core/serialize.js
  saveGame(state)
  loadGame(json)
  saveReplay(state)
  loadReplay(json)
```

## State update policy

For the prototype, either mutable or immutable updates are acceptable, but be consistent.

Recommendation:

- Use pure-looking public APIs.
- Internally mutate a cloned state for simplicity.
- Return the updated state and a move result.

Example:

```js
const result = applyMove(gameState, playerId, colorId);
gameState = result.state;
render(result.changedTileIds);
```

## Important invariant

All game logic should operate on tile IDs, owners, colors, and neighbor lists.

No rule should rely on `row`, `col`, `q`, `r`, or tiling-specific geometry.
