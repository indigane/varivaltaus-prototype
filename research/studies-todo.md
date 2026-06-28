# Planned Studies for Go Simulation Tool

This document outlines the planned studies to analyze the gameplay dynamics of the Flood game engine using the `go-flood` simulation tool.

## 1. Map Geometry & Size Impact
Analyze how different board tessellations and sizes affect game length, fairness, and strategy effectiveness.
- **Shapes**: Square, Triangle, Hex, Rhombitrihexagonal, Cairo Pentagon, Voronoi (Jittered & Random).
- **Sizes**: Small (10x10), Medium (20x20), Large (50x50).
- **Metrics**: Average Turns, Win Rate Fairness, Territory Dominance.

## 2. Color Count Sensitivity
Investigate how the number of available colors changes the "bottlenecking" effect and bot performance.
- **Range**: 3 to 12 colors.
- **Fixed Setup**: 20x20 Hex board, 2 players (Greedy vs Greedy).
- **Metrics**: Average Turns, Win Rate, Move Legal-rate.

## 3. Player Count Scaling
Study how the game changes as more players are added to the board.
- **Matchups**: 2, 3, 4, 6, and 8 players.
- **Setup**: 30x30 Hex board, 8 colors, Greedy bots.
- **Metrics**: Win Rate Fairness (Spatial vs Turn Order), Game Length.

## 4. Team Play Dynamics
Compare different team configurations and territory rules.
- **Configurations**: 2v2, 3v3, 4v4, 2v2v2v2.
- **Territory Rules**: `merged` (teammates share territory for capture) vs `separate` (teammates act independently).
- **Metrics**: Team Win Rate, Synergy factor (Team win rate vs individual win rate).

## 5. Starting Variations
Evaluate how different starting conditions affect the opening game and fairness.
- **Positions**: Corners, Center-Clustered (touching), Center-Distributed (near center but gapped).
- **Area Size**: 1 tile vs 7 tiles (full neighborhood).
- **Buffer**: Starting Area Buffer (On vs Off).
- **Metrics**: First-player advantage, Win Rate Fairness.

## 6. Bot/Shape Interaction Matchups
Determine if certain bot strategies are inherently better suited for specific map geometries.
- **Bots**: Random, Greedy, Aggressive, Lookahead, Hybrid.
- **Shapes**: Square vs Triangle vs Hex.
- **Metrics**: Win Rate by Bot/Shape combination.

## 7. Asymmetric Matchups
Explore high-stakes scenarios with unbalanced player abilities or numbers.
- **Scenarios**: 2 Advanced Bots (Hybrid/Lookahead) vs 4 Weak Bots (Greedy/Random).
- **Metrics**: Win Rate, Territory held at elimination.

---
## Standard Metrics for All Studies:
- **Win Rate**: Percentage of games won by each player/team.
- **Average Turns**: Number of turns until a winner is determined.
- **Territory Dominance**: Average percentage of the board owned by the winner at the end of the game.
