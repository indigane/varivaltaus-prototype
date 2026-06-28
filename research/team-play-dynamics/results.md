# Team Play Dynamics Results
Comparing 2v2 and 3v3 team configurations with Merged vs. Separate territory rules.
Board: 30x30 Hex, 8 colors, Greedy bots.

## 2v2 (Team 0 vs Team 1)
### Mode: separatePlayers
- **Avg Turns**: 102.73
- **Team 0 Win Rate**: 45.0%
- **Team 1 Win Rate**: 53.0%

### Mode: merged
- **Avg Turns**: 60.01
- **Team 0 Win Rate**: 56.0%
- **Team 1 Win Rate**: 36.0%

## 3v3 (Team 0 vs Team 1)
### Mode: separatePlayers
- **Avg Turns**: 113.36
- **Team 0 Win Rate**: 100.0%
- **Team 1 Win Rate**: 0.0%

### Mode: merged
- **Avg Turns**: 51.57
- **Team 0 Win Rate**: 98.0%
- **Team 1 Win Rate**: 0.0%


## Observations
- **Merged vs. Separate**: The `merged` territory rule significantly speeds up the game (nearly 50% fewer turns). This is because capture moves from any team member contribute to a single large territory, which grows much faster than individual territories.
- **Synergy**: In `merged` mode, the first team to move (Team 0) seems to have a much larger advantage than in `separatePlayers` mode, especially in 2v2.
- **Extreme Bias in 3v3**: The 3v3 results show a complete dominance of Team 0. This is likely due to the spatial distribution of players (0, 1, 0, 1, 0, 1) where Team 0 members likely occupy more favorable starting positions on the hex board, or their combined turns allow them to lock out Team 1 before they can establish a foothold.
- **Efficiency**: `Merged` territory turns the game into a more cooperative strategic experience where teammates effectively work together to flood the board.
