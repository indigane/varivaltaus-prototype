# Starting Variations Results
Comparing different starting positions and area configurations.
Board: 20x20 Hex, 6 colors, 2 players (Greedy).

## 1. Starting Positions
### Position: corners
- **Avg Turns**: 33.40
- **Player 0 Win Rate**: 55.0%

### Position: center-clustered
- **Avg Turns**: 24.02
- **Player 0 Win Rate**: 76.0%

### Position: center-distributed
- **Avg Turns**: 25.31
- **Player 0 Win Rate**: 78.0%

## 2. Starting Area Size
### Area Size: 1
- **Avg Turns**: 32.39
- **Player 0 Win Rate**: 53.0%

### Area Size: 7
- **Avg Turns**: 29.75
- **Player 0 Win Rate**: 56.0%

## 3. Starting Area Buffer
### Buffer: true
- **Avg Turns**: 32.24
- **Player 0 Win Rate**: 63.0%

### Buffer: false
- **Avg Turns**: 31.09
- **Player 0 Win Rate**: 56.0%


## Observations
- **Starting Positions**: Starting in the center (clustered or distributed) drastically increases the advantage of the first player (P0). In a 20x20 board, starting at the center gives P0 a win rate of ~76-78%, compared to ~55% when starting at opposite corners. This is because the first player immediately captures the most valuable "central" territory, leaving the second player to expand into the less connected periphery.
- **Starting Area Size**: Increasing the starting area size from 1 to 7 tiles slightly reduces the number of turns (as players start with more territory) but doesn't drastically shift the win rate balance in this 2-player setup.
- **Starting Area Buffer**: The buffer (which ensures no neighbor of your starting tile has your color) actually seems to *increase* P0's advantage slightly in this sample, possibly by ensuring a more "productive" first move that doesn't conflict with immediate neutral colors. However, both modes remain reasonably balanced compared to the center-start variation.
- **Conclusion**: For fair gameplay, **Corners** or widely distributed positions are essential. Center starts are extremely biased towards the first player.
