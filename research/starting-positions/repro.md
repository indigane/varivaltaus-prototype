# Reproduce Starting Position Fairness Research

1. Navigate to the Go project:
   ```bash
   cd go-flood
   ```

2. Search for the best 3-player positions on a 40x27 square board:
   ```bash
   go run cmd/sim/main.go -mode search -games 100 -cols 40 -rows 27 -bots greedy,greedy,greedy
   ```

3. Analyze a specific set of tiles for fairness:
   ```bash
   go run cmd/sim/main.go -mode fairness -games 100 -cols 40 -rows 27 -start-tiles 0,1040,520 -bots greedy,greedy,greedy
   ```
