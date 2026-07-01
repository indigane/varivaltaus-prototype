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

- `-mode`: Operation mode: `sim` (standard simulation), `fairness` (analyze turn-order and spatial bias), or `search` (find optimal starting positions) (default: "sim")
- `-games`: Number of games to simulate or batches to run (default: 100)
- `-board`: Board type (`square`, `triangle`, `hex`, `rhombitrihexagonal`, `pentagon-cairo`, `pentagon-prismatic`, `pentagon-floret`, `deltoidal-trihexagonal`, `rhombille`, `triakis-triangular`, `kisrhombille`, `tetrakis-square`, `voronoi-jittered`, `voronoi-random`) (default: "square")
- `-cols`: Number of columns (default: 20)
- `-rows`: Number of rows (default: 20)
- `-colors`: Number of colors (default: 6)
- `-bots`: Comma-separated list of bot types for players (e.g., `greedy,random,lookahead`) (default: "greedy,random")
- `-concurrency`: Number of concurrent simulations (default: 8)
- `-seed`: Initial seed for the simulation (default: current timestamp)
- `-start-tiles`: Comma-separated list of tile IDs to use as starting positions in `fairness` mode.

### Fairness Analysis

The `-mode fairness` flag runs rotations of players across the provided or generated start tiles to isolate spatial advantage from turn-order advantage.

```bash
go run cmd/sim/main.go -mode fairness -games 100 -bots greedy,greedy -start-tiles 0,399
```

### Fairness Search

The `-mode search` flag automatically evaluates various combinations of candidate tiles (corners, mid-edges, center) to find the most balanced starting positions for the given player count.

```bash
go run cmd/sim/main.go -mode search -games 50 -board hex -bots greedy,greedy,greedy
```

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
