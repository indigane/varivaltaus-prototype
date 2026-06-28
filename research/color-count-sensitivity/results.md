# Color Count Sensitivity Results
Studying the impact of color count on 20x20 Hex board (2 players, greedy bots).

| Colors | Avg Turns | Avg Dominance | Win Rate (P0) |
|--------|-----------|---------------|---------------|
| 3 | 13.37 | 55.1% | 59.4% |
| 4 | 20.20 | 52.3% | 58.6% |
| 5 | 26.44 | 51.3% | 57.3% |
| 6 | 33.07 | 50.6% | 54.6% |
| 7 | 38.30 | 50.7% | 56.0% |
| 8 | 43.09 | 50.3% | 55.1% |
| 9 | 48.64 | 49.9% | 54.7% |
| 10 | 52.88 | 49.9% | 57.0% |
| 11 | 57.75 | 50.0% | 55.4% |
| 12 | 61.61 | 49.9% | 52.6% |

## Observations
- **Game Length**: There is a clear linear relationship between the number of colors and the number of turns required to complete the game. Each additional color adds approximately 5-6 turns to the 20x20 Hex board.
- **Fairness**: Lower color counts seem to slightly favor the first player (P0). With 3 colors, P0 has a ~59% win rate, which drops towards 52-55% as more colors are added.
- **Dominance**: The winner's dominance is highest at low color counts (55% for 3 colors) and stabilizes around 50% for 6+ colors. This suggests that with few colors, the "bottlenecking" effect allows one player to lock out the other more effectively.
