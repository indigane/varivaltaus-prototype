# Board graph format

Every board generator must output this format.

```js
const board = {
  version: 1,
  generator: "square",
  width: 10,
  height: 10,
  tiles: [
    {
      id: 0,
      colorId: 2,
      ownerId: null,
      points: [[0, 0], [32, 0], [32, 32], [0, 32]],
      neighbors: [1, 10]
    }
  ]
};
```

## Tile fields

### `id`

Integer tile ID.

Rules:

- Must be unique.
- Prefer IDs from `0` to `tiles.length - 1`.
- If IDs are contiguous, arrays become easier later.

### `colorId`

Integer color index.

Rules:

- Must be `>= 0`.
- Must be `< gameState.colorCount`.
- It is a logical color, not a CSS color.

### `ownerId`

Owner player ID or `null`.

Rules:

- `null` means neutral.
- A player ID means the tile belongs to that player.
- Team ownership is derived from the owning player's `teamId` unless a future shared-team mode changes this.

### `points`

Array of polygon vertices.

Rules:

- Points are in board/canvas coordinate space.
- Clockwise or counterclockwise is okay, but be consistent per generator.
- At least 3 points.
- Renderer draws this polygon.
- Input hit testing uses this polygon.

### `neighbors`

Array of neighboring tile IDs.

Rules:

- Neighbor relation should be symmetric.
- No tile should list itself as a neighbor.
- No duplicate neighbor IDs.
- Neighbor IDs must exist.

## Validation checklist

A valid board graph has:

- at least one tile,
- unique tile IDs,
- valid color IDs,
- valid owners or `null`,
- valid polygons,
- valid symmetric neighbor lists,
- no duplicate neighbors,
- no self-neighbors.

## Important rule

The engine should not care how `neighbors` were generated.
