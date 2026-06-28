# Reproduce Bot Comparison

1. Navigate to the Go project:
   ```bash
   cd go-flood
   ```

2. Run the 4-player comparison (Square):
   ```bash
   go run cmd/sim/main.go -games 5000 -board square -cols 50 -rows 50 -bots random,lookahead,hybrid,greedy
   ```

3. Run the 3-player comparison (Hex, no Lookahead):
   ```bash
   go run cmd/sim/main.go -games 5000 -board hex -cols 50 -rows 50 -bots hybrid,greedy,random
   ```
