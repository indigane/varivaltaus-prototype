# Triangle tiling

Implement after square board and graph engine are working.

## Goal

Generate a board made of alternating up/down triangles.

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

## Representation

Use one triangle per logical tile.

Each square-like cell can contain two triangles:

- upper/right-facing or up triangle,
- lower/left-facing or down triangle.

Choose one convention and document it in code comments.

## Neighbors

Each triangle has up to 3 edge-neighbors.

Neighbor relation must be symmetric.

## Rendering

Renderer does not need to know this is a triangle board. It draws `tile.points`.

## Testing

Test that:

- every triangle has 2 or 3 neighbors depending on edge position,
- no self-neighbors exist,
- neighbor symmetry holds,
- polygon points contain exactly 3 vertices.
