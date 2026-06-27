# Greedy bot

The greedy bot picks the legal color that gives the biggest immediate score gain.

## Behavior

For each legal color:

1. Clone state.
2. Apply the move.
3. Compute score increase.
4. Pick best color.

## Scoring function

Basic score:

```js
score = tilesOwnedAfter - tilesOwnedBefore;
```

Enemy-aware score, later:

```js
score = ownGain - strongestOpponentGainPotential * 0.5;
```

## Tie-breaking

If multiple moves tie, choose randomly among tied moves.

## Requirements

- Must not mutate real game state during simulation.
- Must use normal `applyMove` logic on cloned state.
- Must return only legal moves.
