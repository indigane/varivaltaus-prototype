# Reproduce Starting Variations Study

1. Navigate to the Go project:
   ```bash
   cd go-flood
   ```

2. Run the simulations for various starting conditions (20x20 Hex board, 6 colors, 2 Greedy players):

   **Starting Positions:**
   ```bash
   # Corners
   go run cmd/sim/main.go -games 5000 -board hex -cols 20 -rows 20 -colors 6 -bots greedy,greedy -start-pos corners
   # Center-clustered
   go run cmd/sim/main.go -games 5000 -board hex -cols 20 -rows 20 -colors 6 -bots greedy,greedy -start-pos center-clustered
   # Center-distributed
   go run cmd/sim/main.go -games 5000 -board hex -cols 20 -rows 20 -colors 6 -bots greedy,greedy -start-pos center-distributed
   ```

   **Starting Area Size:**
   ```bash
   # Size 1
   go run cmd/sim/main.go -games 5000 -board hex -cols 20 -rows 20 -colors 6 -bots greedy,greedy -start-area-size 1
   # Size 7
   go run cmd/sim/main.go -games 5000 -board hex -cols 20 -rows 20 -colors 6 -bots greedy,greedy -start-area-size 7
   ```

   **Starting Area Buffer:**
   ```bash
   # Buffer True
   go run cmd/sim/main.go -games 5000 -board hex -cols 20 -rows 20 -colors 6 -bots greedy,greedy -start-area-buffer=true
   # Buffer False
   go run cmd/sim/main.go -games 5000 -board hex -cols 20 -rows 20 -colors 6 -bots greedy,greedy -start-area-buffer=false
   ```
