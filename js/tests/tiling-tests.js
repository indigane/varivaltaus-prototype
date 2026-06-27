import { validateBoardGraph } from '../core/graph.js';
import { generateSquareBoard } from '../tilings/square.js';
import { generateTriangleBoard } from '../tilings/triangle.js';
import { generateHexBoard } from '../tilings/hex.js';
import { generateCairoPentagonBoard, generatePrismaticPentagonBoard } from '../tilings/pentagon.js';
import { createRNG } from '../core/rng.js';

export function runTilingTests() {
    console.log("Running Tiling Tests...");

    const rng = createRNG(123);
    const options = { cols: 10, rows: 10, tileSize: 20, colorCount: 6, rng };

    testGenerator("Square", () => generateSquareBoard(options));
    testGenerator("Triangle Rect", () => generateTriangleBoard({ ...options, shape: "rectangular" }));
    testGenerator("Triangle Tri", () => generateTriangleBoard({ ...options, shape: "triangular" }));
    testGenerator("Hex Rect", () => generateHexBoard({ ...options, shape: "rectangular" }));
    testGenerator("Hex Hex", () => generateHexBoard({ ...options, shape: "hexagonal" }));
    testGenerator("Pentagon Cairo", () => generateCairoPentagonBoard(options));
    testGenerator("Pentagon Prismatic", () => generatePrismaticPentagonBoard(options));

    console.log("Tiling Tests Completed.");
}

function testGenerator(name, genFn) {
    try {
        const board = genFn();
        const isValid = validateBoardGraph(board);
        if (isValid) {
            console.log(`[PASS] ${name}: Valid graph`);
        } else {
            console.error(`[FAIL] ${name}: Invalid graph`);
        }

        // Additional checks
        if (board.tiles.length === 0) {
            console.error(`[FAIL] ${name}: No tiles generated`);
        }

        for (const tile of board.tiles) {
            if (tile.neighbors.length === 0) {
                // For most tilings, isolated tiles shouldn't exist in a 10x10 grid
                console.warn(`[WARN] ${name}: Tile ${tile.id} has no neighbors`);
            }
        }

    } catch (e) {
        console.error(`[FAIL] ${name}: Threw error`, e);
    }
}
