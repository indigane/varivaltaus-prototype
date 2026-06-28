# Reproduce Color Count Sensitivity Study

1. Navigate to the Go project:
   ```bash
   cd go-flood
   ```

2. Run the simulations for different color counts (3 to 12):
   ```bash
   # Example for 3 colors
   go run cmd/sim/main.go -games 5000 -board hex -cols 20 -rows 20 -colors 3 -bots greedy,greedy

   # Example for 6 colors
   go run cmd/sim/main.go -games 5000 -board hex -cols 20 -rows 20 -colors 6 -bots greedy,greedy

   # Example for 12 colors
   go run cmd/sim/main.go -games 5000 -board hex -cols 20 -rows 20 -colors 12 -bots greedy,greedy
   ```
