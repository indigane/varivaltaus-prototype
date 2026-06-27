# Custom JSON maps

Custom maps allow testing unusual tilings and hand-made boards without changing code.

## Custom map format

```json
{
  "version": 1,
  "name": "Example Map",
  "tiles": [
    {
      "id": 0,
      "colorId": 1,
      "ownerId": null,
      "points": [[0,0], [40,0], [20,30]],
      "neighbors": [1, 2]
    }
  ]
}
```

## Loader responsibilities

`loadCustomJsonBoard(json)` should:

- parse JSON if given a string,
- validate the board,
- optionally assign random colors if missing,
- reject invalid polygons,
- reject invalid neighbors,
- return a normal board graph.

## Use cases

- hand-authored maps,
- exported map editor maps,
- weird non-uniform tilings,
- test fixtures,
- regression cases for bugs.
