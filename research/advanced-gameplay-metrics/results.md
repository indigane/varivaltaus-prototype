# Advanced Gameplay Dynamics Report

This report consolidates findings from studies on **3v3 Balance**, **Spite (Defensive) Play**, **Color Scarcity**, and **Map Topology**, using advanced metrics like Lead Changes, Point of No Return (PoNR), and Max Lead.

## 1. Defining "Fun" via Metrics
We use three metrics to proxy "Fun" (tension and excitement):
- **Lead Changes**: Higher is better (represents comebacks and uncertainty).
- **Point of No Return (PoNR)**: The turn after which the leader never changes (measured as % of total game length). Higher is better (tension lasts longer).
- **Max Lead of Winner**: The peak difference between the winner and 2nd place. Lower is better (closer games).

## 2. Study D: 3v3 Balance & Turn Order
### Key Findings:
- **Standard Turn Order (0,1,2,3,4,5)**: Creates an extreme advantage for Team 0 (Players 0 & 2) in 'merged' territory mode.
- **Snake Turn Order (0,1,2,2,1,0)**: Successfully equalizes turn-order advantage.
- **Spatial Bias**: On square boards, starting in the center (Position 3 in 6-player games) is a massive advantage (~100% win rate in 1v1v1v1v1v1 on 30x30).
- **Recommendation**: For balanced 3v3 play, use **Snake Turn Order** on **Hex boards** with **Merged Territory**.

## 3. Study A & E: Multiplayer Dynamics & Defensive Play
### Key Findings:
- **SpiteBot**: Prioritizes blocking opponents. Currently too weak to win against Greedy bots (approx. 5-10% win rate), but significantly changes game dynamics.
- ** predictability**: Introducing a SpiteBot makes games **less exciting**.
  - 2P Greedy vs Greedy: ~6.7 Lead Changes, PoNR at 37%
  - 2P Greedy vs Spite: ~1.8 Lead Changes, PoNR at 13%
- **Conclusion**: Defensive play, in its current implementation, allows the leader to snowball more easily by disrupting the 2nd place player more than the leader.

## 4. Study F: Color Scarcity (The "Sweet Spot")
### Key Findings:
- **Low Colors (3-4)**: Favor strategic bots (Hybrid). Games are short, but max leads are high (~24%).
- **High Colors (12)**: Favor tactical bots (Greedy). Games are long, with many lead changes (~7), but can feel like a slog.
- **The Sweet Spot**: **6-8 colors** provides the best balance of Lead Changes (~7-8) and manageable game length.

## 5. Study G: Map Topology (Circular Masks)
### Key Findings:
- **Holes in the Center**: Make the game more decisive and faster.
- **Metrics Shift**:
  - Lead Changes drop from ~8 to ~4.5.
  - PoNR shifts earlier (from 47% to 37%).
- **Strategy Shift**: Center-rushing bots (Hybrid) lose some of their advantage when the physical center is removed, making Greedy bots more competitive.

---
## Summary Recommendations for "Maximum Fun":
1. **Geometry**: Use Hex or Voronoi for higher connectivity and fewer bottlenecks.
2. **Turn Order**: Always use **Snake Order** for 3+ players.
3. **Colors**: Stick to **6-8 colors** for a 20x20 board.
4. **Team Play**: Use **Merged Territory** but only with Snake turn order.
5. **Start Pos**: Avoid central starts unless all players are equidistant from the center.
