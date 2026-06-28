# Player Count Scaling Results
Studying how the game scales from 2 to 8 players on a 30x30 Hex board.
Using Fairness mode (rotations) to isolate Turn Order and Spatial bias.

### 2 Players (8 colors)
- **Avg Turns**: 66.20
- **Avg Winner Dominance**: 50.1%

#### Win Rates by Turn Order (Unbiased)
| Player Index | Win Rate |
|--------------|----------|
| 0 | 50.0% |
| 1 | 50.0% |

#### Win Rates by Spatial Position (Unbiased)
| Position Index | Win Rate |
|----------------|----------|
| 0 | 40.0% |
| 1 | 60.0% |

### 3 Players (8 colors)
- **Avg Turns**: 94.00
- **Avg Winner Dominance**: 38.4%

#### Win Rates by Turn Order (Unbiased)
| Player Index | Win Rate |
|--------------|----------|
| 0 | 36.7% |
| 1 | 30.0% |
| 2 | 33.3% |

#### Win Rates by Spatial Position (Unbiased)
| Position Index | Win Rate |
|----------------|----------|
| 0 | 73.3% |
| 1 | 26.7% |
| 2 | 0.0% |

### 4 Players (8 colors)
- **Avg Turns**: 104.48
- **Avg Winner Dominance**: 29.1%

#### Win Rates by Turn Order (Unbiased)
| Player Index | Win Rate |
|--------------|----------|
| 0 | 31.7% |
| 1 | 31.7% |
| 2 | 15.8% |
| 3 | 20.8% |

#### Win Rates by Spatial Position (Unbiased)
| Position Index | Win Rate |
|----------------|----------|
| 0 | 20.0% |
| 1 | 23.3% |
| 2 | 39.2% |
| 3 | 17.5% |

### 8 Players (12 colors)
- **Avg Turns**: 215.00
- **Avg Winner Dominance**: 18.4%

#### Win Rates by Turn Order (Unbiased)
- **Player Index 0-7**: Relatively balanced with Index 0 and 1 having a slight early-lead advantage.

#### Win Rates by Spatial Position (Unbiased)
- **Positions**: Highly fragmented. Certain corner positions provide significantly more expansion room.

## Observations
- **Game Length**: Increasing the player count naturally increases the total turns. 8 players on a 30x30 board take ~3x longer than 2 players.
- **Winner Dominance**: As player count increases, the percentage of the board held by the winner decreases significantly (from 50% down to ~18%). This indicates a much more fragmented board with multiple players holding smaller territories.
- **Fairness (Spatial)**: Spatial position is a huge factor in 3-player games, where Position 0 (likely a specific corner/side) consistently outperforms others. In 4 and 8 player games, the spatial advantage is more distributed but still present.
- **Fairness (Turn Order)**: Being the first player (Index 0) or second (Index 1) still provides a slight edge, but it is often overshadowed by spatial advantages in high-player-count games.
