# Lookahead bot

The lookahead bot is optional and should only be used on small boards in the prototype.

## Purpose

Test whether strategic play is interesting beyond immediate greedy capture.

## Depth 2 behavior

For each own legal move:

1. Simulate own move.
2. For each opponent legal response, simulate opponent move.
3. Score the worst or average resulting state.
4. Pick best own move.

## Warning

Branching can grow quickly:

```text
colors ^ depth
```

With many players and many colors, keep depth small.

## Requirements

- Must have a time or node limit if used in autoplay.
- Must not freeze UI on large boards.
- May be disabled for large games.
