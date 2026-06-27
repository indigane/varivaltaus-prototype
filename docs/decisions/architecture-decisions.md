# Architecture decisions

## ADR 001: Use graph-based game engine

Decision: The engine operates on tiles and neighbor lists, not grid coordinates.

Reason: The prototype must support squares, triangles, hexagons, pentagons, non-uniform tilings, and arbitrary map shapes.

Consequence: Board generators are responsible for geometry and neighbors. Rules are tiling-independent.

## ADR 002: Use plain JavaScript and static files

Decision: Use browser-native JavaScript modules without npm, TypeScript, or bundlers.

Reason: This is the fastest LLM-agent-friendly prototype path under the given constraints.

Consequence: Avoid tooling complexity. Keep code modular but simple.

## ADR 003: Use Canvas 2D

Decision: Use Canvas 2D for rendering.

Reason: It is simple, browser-native, and enough for prototype-scale polygon boards.

Consequence: Renderer draws polygons from tile points. WebGL is deferred to production if needed.

## ADR 004: Keep bots as pure decision functions

Decision: Bots return legal color choices and do not mutate game state directly.

Reason: This makes bots testable and ensures bot and human moves share the same rule path.

Consequence: Bot simulations must clone state before applying hypothetical moves.
