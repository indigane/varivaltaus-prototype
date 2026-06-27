# Bot tests

## Random bot

- returns a legal move,
- handles one legal move,
- handles no legal moves gracefully.

## Greedy bot

- does not mutate original state during simulations,
- picks immediate largest gain in a known fixture,
- tie-breaks among equal moves.

## Bot integration

- bot move goes through normal `applyMove`,
- bot-vs-bot game can run multiple turns,
- bot does not move when game is over.
