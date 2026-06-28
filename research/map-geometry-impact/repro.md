# Reproduce Map Geometry & Size Impact Study

1. Navigate to the Go project:
   ```bash
   cd go-flood
   ```

2. Run the simulations for various board types and sizes:

   **Small Boards (10x10):**
   ```bash
   # Square
   go run cmd/sim/main.go -games 5000 -board square -cols 10 -rows 10
   # Triangle
   go run cmd/sim/main.go -games 5000 -board triangle -cols 10 -rows 10
   # Hex
   go run cmd/sim/main.go -games 5000 -board hex -cols 10 -rows 10
   # Rhombitrihexagonal
   go run cmd/sim/main.go -games 5000 -board rhombitrihexagonal -cols 10 -rows 10
   # Cairo Pentagon
   go run cmd/sim/main.go -games 5000 -board pentagon-cairo -cols 10 -rows 10
   # Voronoi Jittered
   go run cmd/sim/main.go -games 5000 -board voronoi-jittered -cols 10 -rows 10
   ```

   **Large Boards (50x50):**
   ```bash
   # Square
   go run cmd/sim/main.go -games 5000 -board square -cols 50 -rows 50
   # Triangle
   go run cmd/sim/main.go -games 5000 -board triangle -cols 50 -rows 50
   # Hex
   go run cmd/sim/main.go -games 5000 -board hex -cols 50 -rows 50
   # Rhombitrihexagonal
   go run cmd/sim/main.go -games 5000 -board rhombitrihexagonal -cols 50 -rows 50
   # Cairo Pentagon
   go run cmd/sim/main.go -games 5000 -board pentagon-cairo -cols 50 -rows 50
   # Voronoi Jittered
   go run cmd/sim/main.go -games 5000 -board voronoi-jittered -cols 50 -rows 50
   ```
