# Random bot

The random bot is the simplest correctness bot.

## Behavior

1. Get legal colors.
2. Pick one randomly.
3. Return that color.

## API

```js
function chooseRandomMove(state, playerId, rng) {
  const legalMoves = getLegalMoves(state, playerId);
  return legalMoves[Math.floor(rng.nextFloat() * legalMoves.length)];
}
```

## Use cases

- bot-vs-bot smoke tests,
- testing turn order,
- testing that every legal move can be applied,
- filling empty seats.

## Requirements

- Must return only legal moves.
- Must handle no legal moves gracefully.
