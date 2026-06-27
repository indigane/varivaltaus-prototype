# Map masks

Masks allow arbitrary board shapes such as islands, circles, holes, or letters.

## Simple mask API

A mask function decides whether a generated tile should remain.

```js
function keepTile(tile, centerPoint, options) {
  return true;
}
```

## Example masks

- rectangle/no mask,
- circle,
- ellipse,
- island/noisy blob,
- remove random holes,
- manual list of removed tile IDs.

## After applying a mask

The generator must:

1. remove filtered-out tiles,
2. remove neighbor references to missing tiles,
3. optionally renumber IDs contiguously,
4. validate graph,
5. optionally ensure the graph is connected.

## Prototype recommendation

Implement rectangular/no mask first.

Add circle or island mask only after multiple tilings work.
