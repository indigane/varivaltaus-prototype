# Preliminary Report: Spatial Bias in 6-Player Matches

During the execution of **Study D (3v3 Balance)**, a significant anomaly was detected in the spatial distribution of winning players.

## The Discovery
In simulations involving 6 players (3v3 or 1v1v1v1v1v1) on 30x30 boards, **Position 3** (the 4th player in the spatial assignment list) exhibited a near-100% win rate.

### Test Case: 6-Player Greedy, 30x30 Square, 10 Colors
- **Total Games**: 720 (Fairness analysis permutations)
- **Win Rate by Turn Order**: Relatively balanced (approx. 16% each).
- **Win Rate by Spatial Position**:
  - Position 0: 0%
  - Position 1: 0%
  - Position 2: 0%
  - **Position 3: 100%**
  - Position 4: 0%
  - Position 5: 0%

## Analysis of "Fair Start" Algorithm
The `FindFairStartTileIds` algorithm uses a furthest-first search to distribute players.
1. It picks geometric extremes (corners/mids).
2. For 6 players on a square grid:
   - Positions 0, 1, 2, 4, 5 are likely corners and mid-points of edges.
   - **Position 3** is often assigned to a location that is mathematically "furthest" from the existing set, which on a rectangular grid with 5 points already taken (4 corners + 1 mid-edge) often results in a **central or near-central starting position**.

## Impact on Gameplay
Starting in the center provides:
1. **Higher Connectivity**: More neighbors to capture initially.
2. **Expansion Directions**: Ability to expand in 360 degrees rather than being pinned against a corner or edge.
3. **Strategic Denial**: Easier access to "cut off" other players from the main board area.

## Conclusion & Next Steps
This spatial advantage is currently the single most dominant factor in multi-player games, far outweighing turn-order advantage or bot strategy (Greedy vs. Random).

**Action Taken**: Documented this bias. Future studies will attempt to use "Search" mode to find a truly fair set of 6 tiles or use different geometries (Hex/Voronoi) where central advantage might be mitigated.
