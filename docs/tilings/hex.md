# Hex tiling

Implement after square board and triangle board, or directly after square if hex maps are a priority.

## Options

```js
{
  cols: 10,
  rows: 10,
  radius: 20,
  colorCount: 6,
  rng,
  orientation: "pointy" // or "flat" later
}
```

## Coordinates

Use axial or offset coordinates internally, but do not expose them to the engine.

Each generated tile still has:

```js
{
  id,
  colorId,
  ownerId,
  points,
  neighbors
}
```

## Neighbors

Each interior hex has 6 neighbors.

Use a standard axial neighbor list if using axial coordinates:

```js
[+1, 0]
[+1, -1]
[0, -1]
[-1, 0]
[-1, +1]
[0, +1]
```

## Polygon

Generate 6 vertices around the center.

## Testing

Test that:

- interior hexes have 6 neighbors,
- edge hexes have fewer,
- neighbor symmetry holds,
- polygons have exactly 6 vertices.
