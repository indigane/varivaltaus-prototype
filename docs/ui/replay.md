# Replay UI

Replays are useful for debugging and bot-vs-bot evaluation.

## Basic replay controls

- start replay,
- pause,
- next move,
- previous move later if easy,
- speed selector,
- export replay JSON.

## Replay data

See [`../architecture/serialization.md`](../architecture/serialization.md).

## Implementation recommendation

For simple replay playback:

1. Store initial state.
2. Store list of moves.
3. Rebuild from initial state and apply moves one by one.

Do not store screenshots or rendered frames.
