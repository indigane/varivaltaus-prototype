# Map Geometry & Size Impact Results
Comparing different board shapes at 10x10 and 50x50 sizes, normalized by tile count.

| Shape | Size | Total Tiles | Avg Turns | Turns / 100 Tiles | Avg Dominance |
|-------|------|-------------|-----------|-------------------|---------------|
| square | 10x10 | 100 | 22.03 | 22.03 | 50.0% |
| triangle | 10x10 | 100 | 29.43 | 29.43 | 48.7% |
| hex | 10x10 | 100 | 17.19 | 17.19 | 51.0% |
| rhombitrihexagonal | 10x10 | 679 | 50.31 | 7.41 | 50.9% |
| pentagon-cairo | 10x10 | 200 | 27.20 | 13.60 | 50.7% |
| voronoi-jittered | 10x10 | 100 | 16.42 | 16.42 | 51.2% |
| square | 50x50 | 2500 | 117.18 | 4.69 | 50.4% |
| triangle | 50x50 | 2500 | 164.47 | 6.58 | 50.3% |
| hex | 50x50 | 2500 | 81.37 | 3.25 | 50.5% |
| rhombitrihexagonal | 50x50 | 15399 | 265.89 | 1.73 | 50.1% |
| pentagon-cairo | 50x50 | 5000 | 143.57 | 2.87 | 49.8% |
| voronoi-jittered | 50x50 | 2500 | 76.16 | 3.05 | 50.5% |

## Observations
- **Efficiency per Tile**: Normalizing by 100 tiles reveals that **Hex and Voronoi boards** are significantly more efficient (fewer turns to capture the same number of tiles) than Square or Triangle boards.
- **Rhombitrihexagonal Density**: While Rhombitrihexagonal boards take many more turns in absolute terms, their *efficiency per 100 tiles* is remarkably high (~1.73 turns per 100 tiles on 50x50). This indicates that despite the high tile count, the complex connectivity (linking hexagons, squares, and triangles) allows for very rapid expansion per turn once a foothold is established.
- **Scaling**: Most shapes show better "efficiency" (fewer turns per tile) as the board size increases from 10x10 to 50x50. This suggests that the opening game (which is less efficient) becomes a smaller part of the total game time on larger maps.
- **Connectivity**: The "Turns per 100 tiles" metric clearly shows that higher connectivity (Hex/Voronoi) leads to faster board flooding.
