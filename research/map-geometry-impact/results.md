# Map Geometry & Size Impact Results
Comparing different board shapes at 10x10 and 50x50 sizes.

| Shape | Size | Avg Turns | Avg Dominance |
|-------|------|-----------|---------------|
| square | 10x10 | 21.89 | 50.5% |
| triangle | 10x10 | 29.50 | 48.7% |
| hex | 10x10 | 17.37 | 51.2% |
| rhombitrihexagonal | 10x10 | 50.13 | 50.8% |
| pentagon-cairo | 10x10 | 27.23 | 50.8% |
| voronoi-jittered | 10x10 | 16.44 | 51.6% |
| square | 50x50 | 116.81 | 50.1% |
| triangle | 50x50 | 165.31 | 50.3% |
| hex | 50x50 | 80.71 | 50.2% |
| rhombitrihexagonal | 50x50 | 266.79 | 50.2% |
| pentagon-cairo | 50x50 | 141.94 | 50.2% |
| voronoi-jittered | 50x50 | 75.51 | 50.6% |

## Observations
- **Hex and Voronoi boards** are the fastest (fewer turns), likely due to higher connectivity (6 neighbors on average).
- **Rhombitrihexagonal boards** take significantly more turns, which makes sense as the number of tiles is much higher for the same grid dimensions (it's a semiregular tiling with multiple tiles per vertex).
- **Triangle boards** are slower than squares despite fewer neighbors, possibly due to the way they "branch" through the grid.
- **Dominance** remains very close to 50% for 2-player games, indicating that even with greedy bots, the maps are generally well-split at these sizes.
