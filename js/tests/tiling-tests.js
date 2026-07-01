import { validateBoardGraph } from '../core/graph.js';
import { generateSquareBoard } from '../tilings/square.js';
import { generateTriangleBoard } from '../tilings/triangle.js';
import { generateHexBoard } from '../tilings/hex.js';
import { generateRhombitrihexagonalBoard } from '../tilings/rhombitrihexagonal.js';
import { generateCairoPentagonBoard } from '../tilings/pentagon.js';
import { generateOctagonalBoard } from '../tilings/octagonal.js';
import { generatePythagoreanBoard } from '../tilings/pythagorean.js';
import { generateTrihexagonalBoard } from '../tilings/trihexagonal.js';
import { generateTruncatedHexagonalBoard } from '../tilings/truncated-hexagonal.js';
import { generateTruncatedTrihexagonalBoard } from '../tilings/truncated-trihexagonal.js';
import { generateSnubSquareBoard } from '../tilings/snub-square.js';
import { generateSnubTrihexagonalBoard } from '../tilings/snub-trihexagonal.js';
import { generateElongatedTriangularBoard } from '../tilings/elongated-triangular.js';
import {
    generateDeltoidalTrihexagonalBoard,
    generateFloretPentagonalBoard,
    generateKisrhombilleBoard,
    generatePrismaticPentagonalBoard,
    generateRhombilleBoard,
    generateTetrakisSquareBoard,
    generateTriakisTriangularBoard
} from '../tilings/dual-semi-regular.js';
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
    testGenerator("Rhombitrihexagonal", () => generateRhombitrihexagonalBoard(options), { sides: [3, 4, 6], edgeLength: options.tileSize });
    testGenerator("Pentagon Cairo", () => generateCairoPentagonBoard(options));
    testGenerator("Pythagorean", () => generatePythagoreanBoard(options));
    testGenerator("Octagonal (4.8.8)", () => generateOctagonalBoard(options), { sides: [4, 8], edgeLength: options.tileSize });
    testGenerator("Trihexagonal (3.6.3.6)", () => generateTrihexagonalBoard(options), { sides: [3, 6], edgeLength: options.tileSize });
    testGenerator("Truncated Hexagonal (3.12.12)", () => generateTruncatedHexagonalBoard(options), { sides: [3, 12], edgeLength: options.tileSize });
    testGenerator("Truncated Trihexagonal (4.6.12)", () => generateTruncatedTrihexagonalBoard(options), { sides: [4, 6, 12], edgeLength: options.tileSize });
    testGenerator("Snub Square (3.3.4.3.4)", () => generateSnubSquareBoard(options), { sides: [3, 4], edgeLength: options.tileSize });
    testGenerator("Snub Trihexagonal (3.3.3.3.6)", () => generateSnubTrihexagonalBoard(options), { sides: [3, 6], edgeLength: options.tileSize });
    testGenerator("Elongated Triangular (3.3.3.4.4)", () => generateElongatedTriangularBoard(options), { sides: [3, 4], edgeLength: options.tileSize });
    testGenerator("Prismatic Pentagonal (V3.3.3.4.4)", () => generatePrismaticPentagonalBoard(options));
    testGenerator("Floret Pentagonal (V3.3.3.3.6)", () => generateFloretPentagonalBoard(options));
    testGenerator("Deltoidal Trihexagonal (V3.4.6.4)", () => generateDeltoidalTrihexagonalBoard(options));
    testGenerator("Rhombille (V3.6.3.6)", () => generateRhombilleBoard(options));
    testGenerator("Triakis Triangular (V3.12.12)", () => generateTriakisTriangularBoard(options));
    testGenerator("Kisrhombille (V4.6.12)", () => generateKisrhombilleBoard(options));
    testGenerator("Tetrakis Square (V4.8.8)", () => generateTetrakisSquareBoard(options));

    console.log("Tiling Tests Completed.");
}

function testGenerator(name, genFn, geometry = null) {
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

        if (geometry) {
            validateRegularGeometry(name, board, geometry);
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

function validateRegularGeometry(name, board, { sides, edgeLength }) {
    const sideSet = new Set(sides);
    const margin = Math.min(edgeLength * 5, Math.min(board.width, board.height) / 3);
    let interiorCount = 0;

    for (const tile of board.tiles) {
        if (!sideSet.has(tile.points.length)) {
            console.error(`[FAIL] ${name}: Tile ${tile.id} has unexpected side count ${tile.points.length}`);
        }

        const lengths = edgeLengths(tile);
        lengths.forEach((length, edgeIdx) => {
            if (Math.abs(length - edgeLength) > 0.001) {
                console.error(`[FAIL] ${name}: Tile ${tile.id} edge ${edgeIdx} length ${length.toFixed(3)}, expected ${edgeLength}`);
            }
        });

        const [cx, cy] = centroid(tile.points);
        if (cx > margin && cy > margin && cx < board.width - margin && cy < board.height - margin) {
            interiorCount++;
            if (tile.neighbors.length !== tile.points.length) {
                console.error(`[FAIL] ${name}: Interior tile ${tile.id} has ${tile.neighbors.length} neighbors, expected ${tile.points.length}`);
            }
        }
    }

    if (interiorCount === 0) {
        console.error(`[FAIL] ${name}: No interior tiles found for geometry validation`);
    }
}

function edgeLengths(tile) {
    return tile.points.map((p, i) => {
        const next = tile.points[(i + 1) % tile.points.length];
        return Math.hypot(p[0] - next[0], p[1] - next[1]);
    });
}

function centroid(points) {
    const sum = points.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
    return [sum[0] / points.length, sum[1] / points.length];
}
