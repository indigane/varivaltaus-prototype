# Reproduce Player Count Scaling Study

1. Navigate to the Go project:
   ```bash
   cd go-flood
   ```

2. Run the fairness analysis for different player counts:

   **2 Players (8 colors):**
   ```bash
   go run cmd/sim/main.go -mode fairness -games 100 -board hex -cols 30 -rows 30 -colors 8 -bots greedy,greedy
   ```

   **3 Players (8 colors):**
   ```bash
   go run cmd/sim/main.go -mode fairness -games 100 -board hex -cols 30 -rows 30 -colors 8 -bots greedy,greedy,greedy
   ```

   **4 Players (8 colors):**
   ```bash
   go run cmd/sim/main.go -mode fairness -games 100 -board hex -cols 30 -rows 30 -colors 8 -bots greedy,greedy,greedy,greedy
   ```

   **8 Players (12 colors):**
   ```bash
   go run cmd/sim/main.go -mode fairness -games 100 -board hex -cols 30 -rows 30 -colors 12 -bots greedy,greedy,greedy,greedy,greedy,greedy,greedy,greedy
   ```

*Note: In fairness mode, the `games` flag specifies the number of full rotation batches.*
