# Research Study: Bot Comparison (Expanded)

## Introduction
This study compares the performance of various bot strategies in the Flood game. We use a high-performance Go port of the game engine to run large-scale simulations (5000 games per set) on larger board sizes (50x50).

## Methodology
- **Simulations:** 5000 games per set.
- **Board Configuration:** 50x50 grid, 6 colors.
- **Bots Tested:**
  - **Random:** Picks a legal color at random.
  - **Greedy:** Picks the color that captures the most tiles immediately.
  - **Hybrid:** Switches between Aggressive (early game) and Greedy (once contact is made).
  - **Lookahead:** Uses a shallow minimax lookahead to anticipate future gains.

## Results

### 1. Multi-Bot Comparison (4 Players)
How do the bots perform when all are competing on the same board?

#### Square Board (50x50)
| Bot | Win Rate |
| :--- | :--- |
| **Hybrid** | **51.0%** |
| Greedy | 27.7% |
| Lookahead | 20.4% |
| Random | 0.7% |
| Draw | 0.3% |

#### Hex Board (50x50)
| Bot | Win Rate |
| :--- | :--- |
| **Hybrid** | **45.2%** |
| Greedy | 32.8% |
| Lookahead | 20.1% |
| Random | 1.5% |
| Draw | 0.3% |

### 2. Competitive Study (Excluding Dominant Hybrid Bot)
Since the **Hybrid** bot dominated the 4-player games, we conducted a follow-up study excluding it to analyze the remaining strategies.

#### Square Board (50x50)
| Bot | Win Rate |
| :--- | :--- |
| **Greedy** | **55.7%** |
| Lookahead | 44.1% |
| Random | 0.0% |
| Draw | 0.2% |

#### Hex Board (50x50)
| Bot | Win Rate |
| :--- | :--- |
| **Greedy** | **74.1%** |
| Lookahead | 25.8% |
| Random | 0.0% |
| Draw | 0.1% |

## Observations
1. **Hybrid Dominance on Large Boards:** On 50x50 boards, the Hybrid bot is the overall winner. Its early aggressive phase secures vital central territory that is difficult to recapture later.
2. **Greedy vs. Lookahead:** Without Hybrid, the Greedy bot consistently beats the 1-move Lookahead bot. The advantage for Greedy is much more pronounced on Hex boards (74.1% vs 25.8%). This suggests that a simple 1-move lookahead may not be sufficient on high-connectivity boards where immediate gains are very influential.
3. **Connectivity impact:** Higher connectivity (Hex vs Square) tends to favor strategies that maximize immediate capture area.

## Conclusion
The **Hybrid** strategy is the most robust for large, competitive boards. When Hybrid is not present, **Greedy** becomes the dominant strategy, outperforming a shallow **Lookahead** bot, particularly on hexagonal grids.
