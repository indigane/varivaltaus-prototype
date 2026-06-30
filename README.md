# Värivaltaus / Flood Prototype

Värivaltaus (Finnish for "Color Capture") is a flood-fill strategy game where players compete to capture tiles on a grid by changing the color of their territory.

## Features

- **Diverse Board Types**: Play on regular, semi-regular, dual semi-regular, Cairo pentagonal, and Voronoi (Jittered/Random) tilings.
- **Geometric Masks**: Apply masks like circular or rectangular holes to create unique board shapes.
- **Configurable Players**: Support for up to 8 players, including human players and various bot strategies.
- **Bot Strategies**:
  - **Random**: Makes random valid moves.
  - **Greedy**: Maximizes immediate tile capture.
  - **Aggressive**: Prioritizes capturing tiles furthest from the starting position.
  - **Lookahead**: Uses minimax to evaluate future states.
  - **Hybrid**: Switches from Aggressive to Greedy once contact is made with opponents.
- **Game Rules**: Customizable starting area sizes, color buffers, and color selection restrictions (e.g., cannot pick an adjacent enemy's color).
- **Research Tools**: Includes a high-performance Go port for running massive simulations and analyzing bot performance.

## Project Structure

- `index.html`: The main entry point for the web-based game.
- `js/`: Contains the JavaScript implementation of the game engine, bots, and UI.
  - `core/`: Core game logic and state management.
  - `bots/`: Bot strategy implementations.
  - `tilings/`: Board generation and tiling logic.
  - `ui/`: Canvas rendering and UI handling.
- `go-flood/`: A high-performance Go port of the game engine, optimized for CLI simulations and research.
- `research/`: Documentation and results from bot comparison studies.
- `tests.html`: A web-based test runner for the JavaScript game logic.

## Getting Started

### Web Version

The web version uses native ES modules. To bypass browser CORS restrictions, it should be served via an HTTP server.

1. Clone the repository.
2. Start a local server (e.g., using Python):
   ```bash
   python3 -m http.server 8000
   ```
3. Open `http://localhost:8000` in your browser.

### Go Port & Simulations

For instructions on running high-performance simulations, see the [go-flood/README.md](go-flood/README.md).

## Testing

- **JavaScript**: Open `tests.html` in your browser (via an HTTP server) to run the JS test suite.
- **Go**: Run `go test ./...` within the `go-flood/` directory.
