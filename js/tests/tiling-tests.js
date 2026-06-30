import { validateBoardGraph } from '../core/graph.js';
import { generateSquareBoard } from '../tilings/square.js';
import { generateTriangleBoard } from '../tilings/triangle.js';
import { generateHexBoard } from '../tilings/hex.js';
import { generateRhombitrihexagonalBoard } from '../tilings/rhombitrihexagonal.js';
import { generateCairoPentagonBoard } from '../tilings/pentagon.js';
import { generateOctagonalBoard } from '../tilings/octagonal.js';
import { generateTrihexagonalBoard } from '../tilings/trihexagonal.js';
import { generateTruncatedHexagonalBoard } from '../tilings/truncated-hexagonal.js';
import { generateTruncatedTrihexagonalBoard } from '../tilings/truncated-trihexagonal.js';
import { generateSnubSquareBoard } from '../tilings/snub-square.js';
import { generateSnubTrihexagonalBoard } from '../tilings/snub-trihexagonal.js';
import { generateElongatedTriangularBoard } from '../tilings/elongated-triangular.js';
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
    testGenerator("Rhombitrihexagonal", () => generateRhombitrihexagonalBoard(options));
    testGenerator("Pentagon Cairo", () => generateCairoPentagonBoard(options));
    testGenerator("Octagonal (4.8.8)", () => generateOctagonalBoard(options));
    testGenerator("Trihexagonal (3.6.3.6)", () => generateTrihexagonalBoard(options));
    testGenerator("Truncated Hexagonal (3.12.12)", () => generateTruncatedHexagonalBoard(options));
    testGenerator("Truncated Trihexagonal (4.6.12)", () => generateTruncatedTrihexagonalBoard(options));
    testGenerator("Snub Square (3.3.4.3.4)", () => generateSnubSquareBoard(options));
    testGenerator("Snub Trihexagonal (3.3.3.3.6)", () => generateSnubTrihexagonalBoard(options));
    testGenerator("Elongated Triangular (3.3.3.4.4)", () => generateElongatedTriangularBoard(options));

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
