# Starting Position Fairness Research

This study investigates the fairness of starting positions in 1v1v1 (3-player) matches across different board types and dimensions, using the `go-flood` simulation tool.

## Methodology

To isolate **spatial fairness** (the advantage of a specific position on the board) from **turn-order fairness** (the advantage of going first), we use a "rotation" technique:
1. Select a set of $N$ starting tiles.
2. Run games for all $N!$ permutations of players assigned to those tiles.
3. Aggregate win rates by both the **player index** (turn order) and the **tile position**.

## Results for 3-Player 40x27 Rectangular Board

We evaluated various combinations of candidate tiles (corners, mid-edges, and centers).

### Square Board (40x27)
Standard greedy algorithms usually pick the corners (e.g., Top-Left, Top-Right, Bottom-Left). However, in a 3-player game on a rectangle, this is fundamentally imbalanced.

**Top Fairness Results:**
1. **Asymmetric Mix:** Tiles [0, 1040, 520] (Top-Left, Bottom-Left, Left-Mid)
   - Win Rates: 35.8% / 24.2% / 40.0% (Fairness: 0.1583)
2. **Standard Corners:** Tiles [0, 39, 1079] (Top-Left, Top-Right, Bottom-Right)
   - Win Rates: 51.7% / 0.8% / 47.5% (Fairness: 0.5083) - **Extremely Unfair**

*Observation: On a 40x27 rectangle, picking three corners leaves the "middle" corner player squeezed between the other two, leading to a near-zero win rate for that position.*

### Hex Board (40x27)
Hexagonal tilings provide more natural connectivity and generally result in fairer matches for 3 players.

**Top Fairness Result:**
1. **Mid-Edge + Center:** Tiles [559, 520, 1060]
   - Win Rates: 35.0% / 34.2% / 29.2% (**Fairness: 0.0583**)

### Triangle Board (40x27)
Triangle boards are the most difficult to balance for 3 players due to the restrictive movement and "bottlenecks" created by the tiling.

**Top Fairness Result:**
1. **Corners:** Tiles [19, 0, 39]
   - Win Rates: 56.7% / 18.3% / 24.2% (Fairness: 0.3833)

## Conclusions

1. **Board Type Matters:** Hex boards are significantly fairer for 3-player games than Square or Triangle boards.
2. **Symmetry is a Trap:** For 3 players on a 2-player-symmetric board (like a rectangle), picking symmetric corners often results in one player being "sandwiched" with almost no chance of winning.
3. **Mid-Points are Key:** Better fairness is often achieved by placing one player at a mid-edge or center point rather than forcing all players into corners.

