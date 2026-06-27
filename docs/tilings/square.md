# Square tiling

Implement first.

## Options

```js
{
  cols: 12,
  rows: 12,
  tileSize: 32,
  colorCount: 6,
  rng
}
```

## Tile polygon

For tile at `(col, row)`:

```js
const x = col * tileSize;
const y = row * tileSize;
points = [
  [x, y],
  [x + tileSize, y],
  [x + tileSize, y + tileSize],
  [x, y + tileSize]
];
```

## Neighbors

Use 4-neighbor adjacency:

- left,
- right,
- up,
- down.

Do not use diagonal adjacency for the default square board.

## Starting positions

For 2 players:

- top-left,
- bottom-right.

For 4 players:

- four corners.

For more players, use random separated positions or manual assignment.
