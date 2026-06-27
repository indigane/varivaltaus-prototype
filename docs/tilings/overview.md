# Tilings overview

Tiling modules should generate board graphs.

They should not implement game rules.

## Common API

```js
function generateSquareBoard(options) -> board
function generateTriangleBoard(options) -> board
function generateHexBoard(options) -> board
function generateCairoPentagonBoard(options) -> board
function loadCustomJsonBoard(json) -> board
```

## Common output

All generators return:

```js
{
  version: 1,
  generator: "hex",
  tiles: [tile]
}
```

See [`../architecture/graph-format.md`](../architecture/graph-format.md).

## Generator responsibilities

Each generator must:

- create tile polygons,
- assign unique tile IDs,
- compute symmetric neighbors,
- assign initial random colors,
- optionally apply a map mask,
- validate the graph before returning it.

## What not to do

A tiling generator must not:

- decide game rules,
- create players,
- inspect teams,
- apply moves,
- draw to Canvas directly.
