# Bots overview

Bots should be pure decision functions.

They should not mutate the game state directly.

## Common API

```js
function chooseMove(state, playerId) {
  return colorId;
}
```

## Bot module responsibilities

A bot may:

- inspect legal moves,
- simulate moves on cloned state,
- score outcomes,
- return a color ID.

A bot must not:

- edit DOM,
- render Canvas,
- directly advance the real game,
- bypass move legality.

## Bot kinds

Implement in this order:

1. Random bot.
2. Greedy bot.
3. Lookahead bot.

## Bot turns

When the current player has `control: "bot"`, the UI/controller should ask the correct bot for a move, then call the normal `applyMove` path.

Bots should use the same legal move API as humans.
