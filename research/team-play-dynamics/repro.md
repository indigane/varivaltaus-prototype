# Reproduce Team Play Dynamics Study

1. Navigate to the Go project:
   ```bash
   cd go-flood
   ```

2. Run the simulations for different team configurations and territory rules (30x30 Hex board, 8 colors, Greedy bots):

   **2v2 (Team 0 vs Team 1):**
   ```bash
   # Separate Players
   go run cmd/sim/main.go -games 5000 -board hex -cols 30 -rows 30 -colors 8 -bots greedy,greedy,greedy,greedy -teams 0,1,0,1 -team-territory separatePlayers

   # Merged
   go run cmd/sim/main.go -games 5000 -board hex -cols 30 -rows 30 -colors 8 -bots greedy,greedy,greedy,greedy -teams 0,1,0,1 -team-territory merged
   ```

   **3v3 (Team 0 vs Team 1):**
   ```bash
   # Separate Players
   go run cmd/sim/main.go -games 5000 -board hex -cols 30 -rows 30 -colors 8 -bots greedy,greedy,greedy,greedy,greedy,greedy -teams 0,1,0,1,0,1 -team-territory separatePlayers

   # Merged
   go run cmd/sim/main.go -games 5000 -board hex -cols 30 -rows 30 -colors 8 -bots greedy,greedy,greedy,greedy,greedy,greedy -teams 0,1,0,1,0,1 -team-territory merged
   ```
