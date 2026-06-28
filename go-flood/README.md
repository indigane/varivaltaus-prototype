# go-flood

`go-flood` is a high-performance Go port of the Värivaltaus (Flood) game engine. It is designed for running large-scale simulations to analyze bot strategies and game configurations efficiently.

## Features

- **High Performance**: Optimized for running thousands of simulations in parallel using goroutines.
- **Bot Analysis**: Includes implementations of various bot strategies (Random, Greedy, Aggressive, Lookahead, Hybrid) to evaluate their performance across different board types and sizes.
- **CLI Simulator**: A command-line tool for running batches of games and generating aggregate statistics.

## Usage

To run the simulation tool, navigate to the `go-flood/` directory and use `go run`:

```bash
cd go-flood
go run cmd/sim/main.go [flags]
```

### Configuration Flags

- `-games`: Number of games to simulate (default: 100)
- `-board`: Board type (square, triangle, hex, pentagon-cairo, voronoi-jittered, voronoi-random) (default: "square")
- `-cols`: Number of columns (default: 20)
- `-rows`: Number of rows (default: 20)
- `-colors`: Number of colors (default: 6)
- `-bots`: Comma-separated list of bot types for players (e.g., "greedy,random,lookahead") (default: "greedy,random")
- `-concurrency`: Number of concurrent simulations (default: 8)
- `-seed`: Initial seed for the simulation (default: current timestamp)

### Example

Run 1000 games on a 50x50 hex board with 8 colors, comparing Greedy and Hybrid bots:

```bash
go run cmd/sim/main.go -games 1000 -board hex -cols 50 -rows 50 -colors 8 -bots greedy,hybrid
```

## Testing

Run the test suite to ensure the engine's correctness:

```bash
go test ./...
```
