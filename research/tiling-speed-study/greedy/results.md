# Tiling Speed Study Results (Greedy Bots)
Ranking of board tilings by game speed (Turns per 100 tiles). Faster tilings have a lower value.

## Methodology
- **Games per tiling**: 1000
- **Grid Size**: 20x20 base (actual tile count varies by geometry)
- **Colors**: 6
- **Bots**: 2x Greedy

## Results Table

| Rank | Tiling | Total Tiles | Avg Turns | **Turns / 100 Tiles** | Lead Changes | PONR | Max Lead |
|------|--------|-------------|-----------|-----------------------|--------------|------|----------|
| 1 | truncated-trihexagonal | 2340 | 63.18 | **2.70** | 8.06 | 34.7% | 13.1% |
| 2 | truncated-hexagonal | 1198 | 38.06 | **3.18** | 6.77 | 37.4% | 16.3% |
| 3 | rhombitrihexagonal | 2559 | 103.08 | **4.03** | 11.97 | 36.7% | 10.0% |
| 4 | snub-trihexagonal | 3364 | 156.86 | **4.66** | 14.75 | 36.3% | 7.9% |
| 5 | pentagon-floret | 2166 | 109.34 | **5.05** | 12.11 | 37.8% | 9.5% |
| 6 | voronoi-random | 400 | 20.76 | **5.19** | 3.66 | 30.4% | 24.1% |
| 7 | 4.8.8 | 841 | 44.04 | **5.24** | 6.69 | 36.3% | 15.7% |
| 8 | deltoidal-trihexagonal | 2400 | 138.09 | **5.75** | 12.80 | 35.5% | 8.4% |
| 9 | pythagorean | 657 | 39.49 | **6.01** | 5.99 | 36.6% | 17.0% |
| 10 | trihexagonal | 1198 | 76.50 | **6.39** | 9.77 | 37.2% | 11.3% |
| 11 | snub-square | 2521 | 162.70 | **6.45** | 13.08 | 35.3% | 8.5% |
| 12 | kisrhombille | 4800 | 315.43 | **6.57** | 19.99 | 35.6% | 5.6% |
| 13 | pentagon-cairo | 800 | 54.58 | **6.82** | 8.03 | 37.2% | 11.7% |
| 14 | voronoi-jittered | 400 | 30.34 | **7.58** | 5.51 | 36.7% | 15.9% |
| 15 | hex | 400 | 32.64 | **8.16** | 5.78 | 37.7% | 14.8% |
| 16 | rhombille | 1121 | 97.46 | **8.69** | 9.94 | 35.8% | 10.0% |
| 17 | pentagon-prismatic | 722 | 65.99 | **9.14** | 6.66 | 33.5% | 19.8% |
| 18 | tetrakis-square | 1600 | 166.67 | **10.42** | 12.62 | 36.8% | 8.4% |
| 19 | elongated-triangular | 1160 | 121.92 | **10.51** | 8.95 | 35.5% | 16.3% |
| 20 | triakis-triangular | 2400 | 256.69 | **10.70** | 15.70 | 36.1% | 6.4% |
| 21 | square | 400 | 44.67 | **11.17** | 6.68 | 38.3% | 12.5% |
| 22 | triangle | 400 | 61.92 | **15.48** | 6.88 | 39.3% | 10.3% |

## Key Observations

- **Maximum Efficiency**: **Truncated Trihexagonal** (Rank 1) is the "fastest" geometry, requiring only ~2.7 turns per 100 tiles. This tiling features a mix of large hexagons, squares, and dodecagons (approximated), resulting in extremely high connectivity and large jump-starts for capture.
- **Irregularity & Speed**: **Voronoi-random** (Rank 6) is significantly faster than its jittered counterpart (Rank 14). The higher variance in cell size and adjacency in the random Voronoi map creates "express lanes" of connectivity that greedy bots exploit to traverse the board quickly.
- **Triangle Slowness**: Geometries dominated by triangles, such as **Triangle** (Rank 22), **Square** (Rank 21), and **Triakis-triangular** (Rank 20), are the slowest. The lower average degree of these tilings limits the number of tiles that can be captured in a single move, forcing a more methodical and slower expansion.
- **Scaling and Density**: High-density tilings like **Kisrhombille** (Rank 12) have very high absolute turn counts (~315 turns) but are surprisingly efficient per tile (6.57 turns/100 tiles). This suggests that game "feel" is a balance between absolute turn count and capture efficiency.
- **Volatility**: Slower tilings do not necessarily have more lead changes. Interestingly, **Kisrhombille** (Rank 12) and **Snub Trihexagonal** (Rank 4) show the highest average lead changes, suggesting that high-density boards with complex connectivity maintain competitive tension longer than simple grids.
- **First Player Advantage**: Tilings with high Max Lead (like **Voronoi-random** at 24.1%) tend to be less balanced, often favoring the player who can capture a high-connectivity hub early.
