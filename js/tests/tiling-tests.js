import { validateBoardGraph } from '../core/graph.js';
import { generateSquareBoard } from '../tilings/square.js';
import { generateBrickBoard } from '../tilings/brick.js';
import { generateBasketWeaveBoard } from '../tilings/basket-weave.js';
import { generateWaffleBoard } from '../tilings/waffle.js';
import { generateTriangularWeaveBoard } from '../tilings/triangular-weave.js';
import { generateTwoTriangleWeaveBoard } from '../tilings/two-triangle-weave.js';
import { generateHexParallelogramWeaveBoard } from '../tilings/hex-parallelogram-weave.js';
import { generateTrapezoidTriangleWeaveBoard } from '../tilings/trapezoid-triangle-weave.js';
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
    testGenerator("Brick", () => generateBrickBoard(options));
    testGenerator("Basket Weave", () => generateBasketWeaveBoard(options));
    testBasketWeaveBalancedEdges(generateBasketWeaveBoard, options);
    testGenerator("Waffle", () => generateWaffleBoard(options));
    testGenerator("Triangular Weave", () => generateTriangularWeaveBoard(options), { sides: [6, 9], edgeLength: options.tileSize, interiorNeighborsBySides: { 6: 6, 9: 6 } });
    testTopBottomEdgeTypeCoverage("Triangular Weave", generateTriangularWeaveBoard, [6, 9]);
    testGenerator("Two-Triangle Weave", () => generateTwoTriangleWeaveBoard(options), { sides: [3, 6], edgeLength: options.tileSize, skipInteriorNeighbors: true });
    testGenerator("Hex-Parallelogram Weave", () => generateHexParallelogramWeaveBoard(options), { sides: [3, 10, 12], edgeLength: options.tileSize, skipInteriorNeighbors: true });
    testTopBottomEdgeTypeCoverage("Hex-Parallelogram Weave", generateHexParallelogramWeaveBoard, [3, 10, 12]);
    testGenerator("Trapezoid-Triangle Weave", () => generateTrapezoidTriangleWeaveBoard(options), { sides: [9, 11], edgeLength: options.tileSize, skipInteriorNeighbors: true });
    testTrapezoidTriangleUnitsComplete(generateTrapezoidTriangleWeaveBoard, options);
    testTrapezoidTriangleFlatTopBottom(generateTrapezoidTriangleWeaveBoard, options);
    testHighRowCoverage("Triangular Weave", generateTriangularWeaveBoard, [6, 9]);
    testHighRowCoverage("Two-Triangle Weave", generateTwoTriangleWeaveBoard, [3, 6]);
    testHighRowCoverage("Hex-Parallelogram Weave", generateHexParallelogramWeaveBoard, [3, 10, 12]);
    testHighRowCoverage("Trapezoid-Triangle Weave", generateTrapezoidTriangleWeaveBoard, [9, 11]);
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


function testBasketWeaveBalancedEdges(genFn, options) {
    const board = genFn(options);
    const unit = options.tileSize;
    let hasLeftVertical = false;
    let hasRightVertical = false;
    let hasBottomHorizontal = false;

    for (const tile of board.tiles) {
        const box = tileBoundingBox(tile);
        const width = box.maxX - box.minX;
        const height = box.maxY - box.minY;
        if (box.minX <= unit + 0.001 && Math.abs(width - unit) < 0.001 && Math.abs(height - 3 * unit) < 0.001) {
            hasLeftVertical = true;
        }
        if (box.maxX >= board.width - unit - 0.001 && Math.abs(width - unit) < 0.001 && Math.abs(height - 3 * unit) < 0.001) {
            hasRightVertical = true;
        }
        if (box.maxY >= board.height - unit - 0.001 && Math.abs(width - 3 * unit) < 0.001 && Math.abs(height - unit) < 0.001) {
            hasBottomHorizontal = true;
        }
    }

    if (!hasLeftVertical) {
        console.error('[FAIL] Basket Weave: missing left-edge vertical 1x3 balance tiles');
    }
    if (!hasRightVertical) {
        console.error('[FAIL] Basket Weave: missing right-edge vertical 1x3 balance tiles');
    }
    if (!hasBottomHorizontal) {
        console.error('[FAIL] Basket Weave: missing bottom-edge horizontal 3x1 balance tiles');
    }
}

function testTopBottomEdgeTypeCoverage(name, genFn, expectedSideCounts) {
    const board = genFn({ cols: 10, rows: 10, tileSize: 20, colorCount: 6, rng: createRNG(9876) });
    const topCounts = new Set();
    const bottomCounts = new Set();

    for (const tile of board.tiles) {
        const [, cy] = centroid(tile.points);
        if (cy < board.height * 0.2) topCounts.add(tile.points.length);
        if (cy > board.height * 0.8) bottomCounts.add(tile.points.length);
    }

    for (const sideCount of expectedSideCounts) {
        if (!topCounts.has(sideCount)) {
            console.error(`[FAIL] ${name}: top edge is missing ${sideCount}-sided tiles`);
        }
        if (!bottomCounts.has(sideCount)) {
            console.error(`[FAIL] ${name}: bottom edge is missing ${sideCount}-sided tiles`);
        }
    }
}

function testTrapezoidTriangleUnitsComplete(genFn, options) {
    const board = genFn(options);
    for (const tile of board.tiles) {
        if (!tile.type?.startsWith('triangle')) continue;
        const trapezoidNeighbors = tile.neighbors.filter(neighborId => board.tiles[neighborId]?.type === 'trapezoid');
        if (trapezoidNeighbors.length !== 3) {
            console.error(`[FAIL] Trapezoid-Triangle Weave: triangle tile ${tile.id} has ${trapezoidNeighbors.length} trapezoid neighbors, expected 3`);
        }
    }
}


function testTrapezoidTriangleFlatTopBottom(genFn, options) {
    for (const rows of [5, 6, 7, options.rows]) {
        const board = genFn({ ...options, rows, rng: createRNG(5000 + rows) });
        if (!hasHorizontalBoundaryEdge(board, 0)) {
            console.error(`[FAIL] Trapezoid-Triangle Weave: rows=${rows} has a spiky top edge`);
        }
        if (!hasHorizontalBoundaryEdge(board, board.height)) {
            console.error(`[FAIL] Trapezoid-Triangle Weave: rows=${rows} has a spiky bottom edge`);
        }
    }
}

function hasHorizontalBoundaryEdge(board, y) {
    for (const tile of board.tiles) {
        for (let i = 0; i < tile.points.length; i++) {
            const a = tile.points[i];
            const b = tile.points[(i + 1) % tile.points.length];
            if (Math.abs(a[1] - y) < 0.001 && Math.abs(b[1] - y) < 0.001 && Math.abs(a[0] - b[0]) > 0.001) {
                return true;
            }
        }
    }
    return false;
}

function tileBoundingBox(tile) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of tile.points) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }
    return { minX, minY, maxX, maxY };
}

function testHighRowCoverage(name, genFn, expectedBottomLeftSideCounts) {
    const highRowOptions = { cols: 8, rows: 50, tileSize: 10, colorCount: 6, rng: createRNG(12345) };
    const board = genFn(highRowOptions);
    const bottomLeftCounts = new Map();

    for (const tile of board.tiles) {
        const [cx, cy] = centroid(tile.points);
        if (cx < board.width * 0.25 && cy > board.height * 0.75) {
            bottomLeftCounts.set(tile.points.length, (bottomLeftCounts.get(tile.points.length) ?? 0) + 1);
        }
    }

    for (const sideCount of expectedBottomLeftSideCounts) {
        if (!bottomLeftCounts.has(sideCount)) {
            console.error(`[FAIL] ${name}: high-row bottom-left crop is missing ${sideCount}-sided tiles`);
        }
    }
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

function validateRegularGeometry(name, board, { sides, edgeLength, interiorNeighborsBySides = null, skipInteriorNeighbors = false }) {
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
            if (!skipInteriorNeighbors) {
                const expectedNeighbors = interiorNeighborsBySides?.[tile.points.length] ?? tile.points.length;
                if (tile.neighbors.length !== expectedNeighbors) {
                    console.error(`[FAIL] ${name}: Interior tile ${tile.id} has ${tile.neighbors.length} neighbors, expected ${expectedNeighbors}`);
                }
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
