# Canvas renderer

Use Canvas 2D for the prototype.

## Renderer responsibilities

The renderer should:

- clear the canvas,
- draw tile polygons,
- draw borders if enabled,
- highlight current player territory,
- map pointer coordinates to tile IDs,
- scale the board to fit the canvas.

The renderer should not:

- apply game rules,
- mutate game state except perhaps transient UI hover state,
- choose bot moves,
- own the source of truth.

## Basic render flow

```js
function render(state) {
  clearCanvas();
  for (const tile of state.board.tiles) {
    drawTile(tile, palette[tile.colorId], tile.ownerId);
  }
  drawOptionalOverlays(state);
}
```

## Drawing polygon

```js
ctx.beginPath();
ctx.moveTo(points[0][0], points[0][1]);
for (let i = 1; i < points.length; i++) {
  ctx.lineTo(points[i][0], points[i][1]);
}
ctx.closePath();
ctx.fill();
ctx.stroke();
```

## Hit testing

Prototype options:

1. Check each polygon with point-in-polygon.
2. Use bounding boxes first, then point-in-polygon.
3. Later, spatial index if needed.

For early prototype, simple scan is acceptable.

## Scaling

Keep board coordinates separate from screen coordinates.

Use a transform:

```js
screenX = boardX * scale + offsetX;
screenY = boardY * scale + offsetY;
```

Input must invert that transform.
