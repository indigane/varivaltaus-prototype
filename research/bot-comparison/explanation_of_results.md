# Explanation of Research Result Variations

During the course of this research, you may have noticed that the "winning" bot shifted from **Lookahead** to **Hybrid**. This was not due to bugs or inconsistent logic, but rather a reflection of how different game configurations favor different AI strategies.

## 1. Board Size: Tactics vs. Strategy
- **20x20 Boards (Tactical):** On smaller boards, the game is short (usually under 50-80 turns). Every single tile capture is highly significant. The **Lookahead** bot dominates here because its 1-move minimax lookahead allows it to optimize for immediate *and* near-future captures. It plays a "perfect" tactical game that snowballs quickly.
- **50x50 Boards (Strategic):** On larger boards, the game is much longer (150-200+ turns). Immediate tactical gains are less important than **territorial control**. The **Hybrid** bot begins in "Aggressive" mode, ignoring some tactical captures to sprint toward the center of the board. By the time it switches to "Greedy" mode upon meeting an opponent, it has already secured a massive territorial advantage that even "perfect" tactical play by the Lookahead bot cannot overcome.

## 2. The Impact of `MaxTurns`
- In early test runs, the engine used a default `MaxTurns` of 100.
- On a **50x50 board**, 100 turns is nowhere near enough to finish the game.
- In these "cut short" games, the **Aggressive** and **Hybrid** bots always appeared to win by a landslide because they expand the fastest. They were winning because they were the best at "land grabbing" before the timer ran out.
- Once `MaxTurns` was set to `0` (unlimited), games played out to their natural conclusion. This allowed us to see that the Hybrid bot's early-game positioning actually translates into a true victory, not just an early lead.

## 3. Connectivity and Geometry (Hex vs. Square)
- **Hex Boards:** Tiles have 6 neighbors. This high connectivity means the "frontier" of the flood fill grows very fast.
- **Square Boards:** Tiles have 4 neighbors. Growth is slower and more constrained.
- We observed that the **Greedy** strategy performs surprisingly well on Hex boards compared to Lookahead. This is because high connectivity makes immediate captures so powerful that the "opportunity cost" of not taking a large group right now (to set up a slightly better move later) is often too high.

## Summary
The "best" bot depends on the map:
- **Small Maps:** **Lookahead** is king.
- **Large Maps:** **Hybrid** is the dominant strategy due to superior positioning.
- **High Connectivity (Hex):** **Greedy/Hybrid** strategies gain an edge over shallow lookahead.
