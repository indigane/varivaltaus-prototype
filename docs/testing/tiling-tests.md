# Tiling tests

Every board generator should be validated with the same graph tests.

## Generic board validation tests

- tile IDs are unique,
- tile IDs are valid,
- neighbor IDs exist,
- no self-neighbors,
- no duplicate neighbors,
- neighbor relation is symmetric,
- every polygon has at least 3 points,
- every point has numeric x/y,
- color IDs are within range.

## Generator-specific tests

### Square

- interior tile has 4 neighbors,
- corner tile has 2 neighbors,
- edge non-corner tile has 3 neighbors,
- polygons have 4 points.

### Triangle

- polygons have 3 points,
- interior triangles have 3 neighbors.

### Hex

- polygons have 6 points,
- interior hexes have 6 neighbors.

### Pentagon

- polygons have 5 points,
- neighbor relation is symmetric.

## Mask tests

- removed tiles do not appear in neighbor lists,
- graph remains valid after mask,
- optional connectedness check passes for connected masks.
