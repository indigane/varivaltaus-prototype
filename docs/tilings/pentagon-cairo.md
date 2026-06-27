# Cairo pentagonal tiling

This is a later prototype tiling, not required for milestone 1.

## Purpose

Pentagonal tilings test whether unfamiliar board geometry creates interesting strategy.

## Recommendation

Implement a known tileable pentagonal pattern such as a Cairo pentagonal tiling as a generator that emits polygons and neighbor lists.

## Practical approach

Do not begin with a mathematically perfect general-purpose pentagon system.

Instead:

1. Define a repeating patch of pentagons.
2. Repeat the patch across rows and columns.
3. Merge or align shared edges carefully.
4. Build neighbors by shared edges or by explicit pattern rules.
5. Validate symmetry.

## Neighbor detection option

For irregular or complex tilings, compute neighbors by shared edges:

- normalize each polygon edge,
- quantize coordinates to avoid floating-point mismatch,
- map each normalized edge to tile IDs,
- if exactly two tiles share an edge, they are neighbors.

## Testing

Test that:

- all polygons have 5 points,
- neighbor relation is symmetric,
- no duplicate neighbors exist,
- the generated board is connected or intentionally masked.
