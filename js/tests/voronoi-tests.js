import { validateBoardGraph } from '../core/graph.js';
import { generateVoronoiBoard } from '../tilings/voronoi.js';
import { createRNG } from '../core/rng.js';

export function runVoronoiTests() {
    console.log("Running Voronoi Tiling Tests...");

    const rng = createRNG(456);
    const options = { cols: 8, rows: 8, tileSize: 40, colorCount: 6, rng };

    testVoronoi("Voronoi Jittered", () => generateVoronoiBoard({ ...options, type: 'jittered' }));
    testVoronoi("Voronoi Random", () => generateVoronoiBoard({ ...options, type: 'random' }));

    console.log("Voronoi Tiling Tests Completed.");
}

function testVoronoi(name, genFn) {
    try {
        const board = genFn();
        const isValid = validateBoardGraph(board);
        if (isValid) {
            console.log(`[PASS] ${name}: Valid graph`);
        } else {
            console.error(`[FAIL] ${name}: Invalid graph`);
        }

        if (board.tiles.length === 0) {
            console.error(`[FAIL] ${name}: No tiles generated`);
        }

        // Check if all tiles have neighbors (should be connected)
        const disconnected = board.tiles.filter(t => t.neighbors.length === 0);
        if (disconnected.length > 0) {
            console.warn(`[WARN] ${name}: ${disconnected.length} tiles have no neighbors`);
        }

        // Check if points are within bounds
        let outOfBounds = 0;
        for (const tile of board.tiles) {
            for (const p of tile.points) {
                if (p[0] < -0.1 || p[0] > board.width + 0.1 || p[1] < -0.1 || p[1] > board.height + 0.1) {
                    outOfBounds++;
                }
            }
        }
        if (outOfBounds > 0) {
            console.error(`[FAIL] ${name}: ${outOfBounds} points out of bounds`);
        }

    } catch (e) {
        console.error(`[FAIL] ${name}: Threw error`, e);
    }
}
