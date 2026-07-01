# Comparison: Greedy vs. Aggressive Bot Speed

This report compares the game speed (Turns per 100 tiles) of the Greedy bot versus the Aggressive bot across all tilings.

| Tiling | Greedy (T/100) | Aggressive (T/100) | Speed Diff % | Faster Strategy |
|--------|----------------|-------------------|--------------|-----------------|
| 4.8.8 | 5.24 | 4.96 | -5.3% | Aggressive |
| deltoidal-trihexagonal | 5.75 | 5.24 | -8.9% | Aggressive |
| elongated-triangular | 10.51 | 9.35 | -11.0% | Aggressive |
| hex | 8.16 | 8.53 | +4.5% | Greedy |
| kisrhombille | 6.57 | 5.81 | -11.6% | Aggressive |
| pentagon-cairo | 6.82 | 6.92 | +1.5% | Greedy |
| pentagon-floret | 5.05 | 4.72 | -6.5% | Aggressive |
| pentagon-prismatic | 9.14 | 8.28 | -9.4% | Aggressive |
| pythagorean | 6.01 | 5.95 | -1.0% | Aggressive |
| rhombille | 8.69 | 8.19 | -5.8% | Aggressive |
| rhombitrihexagonal | 4.03 | 3.72 | -7.7% | Aggressive |
| snub-square | 6.45 | 5.75 | -10.9% | Aggressive |
| snub-trihexagonal | 4.66 | 4.25 | -8.8% | Aggressive |
| square | 11.17 | 11.54 | +3.3% | Greedy |
| tetrakis-square | 10.42 | 9.40 | -9.8% | Aggressive |
| triakis-triangular | 10.70 | 9.33 | -12.8% | Aggressive |
| triangle | 15.48 | 15.94 | +3.0% | Greedy |
| trihexagonal | 6.39 | 6.05 | -5.3% | Aggressive |
| truncated-hexagonal | 3.18 | 3.06 | -3.8% | Aggressive |
| truncated-trihexagonal | 2.70 | 2.52 | -6.7% | Aggressive |
| voronoi-jittered | 7.58 | 8.03 | +5.9% | Greedy |
| voronoi-random | 5.19 | 5.75 | +10.8% | Greedy |

## Summary Findings

- **Strategy Performance**: Contrary to intuition, the **Aggressive** strategy is actually faster on **16 out of 22** tilings. By prioritizing tiles that are furthest from the start, the Aggressive bot likely establishes 'bridgeheads' across the board, which then allows for faster overall flooding in later turns.
- **Geometry Impact**: **Greedy** maintains an advantage on simpler or more regular tilings like **Square**, **Triangle**, **Hex**, and **Voronoi**. In these predictable environments, immediate local expansion is more efficient than strategic reaching.
- **Complexity Advantage**: On complex Archimedean tilings (e.g., **Truncated Trihexagonal**, **Snub Square**, **Rhombitrihexagonal**), the **Aggressive** bot is significantly more efficient. These boards often have 'bottleneck' shapes (like triangles connecting larger hexagons) where reaching through the bottleneck is more valuable than capturing surrounding same-type tiles.
- **Speed Gap**: The largest advantage for Aggressive is seen on **Triakis-triangular** (-12.8%) and **Kisrhombille** (-11.6%), while Greedy is most dominant on **Voronoi-random** (+10.8%).
