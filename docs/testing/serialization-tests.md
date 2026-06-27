# Serialization tests

## Save/load

- saved game can be JSON stringified,
- loaded game has same board colors,
- loaded game has same owners,
- loaded game has same current player,
- loaded game has same rules.

## Replay

- replay from initial state reaches same final state,
- move log length matches turn count,
- invalid replay move is rejected or reported.

## Versioning

- known version loads,
- unknown version gives useful error.
