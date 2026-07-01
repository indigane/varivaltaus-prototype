import { findFairStartTileIds, getRecommendedBoardTypes } from '../core/fair-starts.js';
import { createRNG } from '../core/rng.js';
import { generateSquareBoard } from '../tilings/square.js';
import { generateHexBoard } from '../tilings/hex.js';
import { applyMask, circularMask, gemstoneMask } from '../tilings/masks.js';

export function runFairStartTests() {
    console.log('Running Fair Start Tests...');

    testResearchBackedSquareThreePlayerStarts();
    testResearchBackedHexThreePlayerStarts();
    testFallbackDoesNotUseMathRandom();
    testCircularSixPlayerStartsStayOnPerimeter();
    testGemstoneTwoPlayerStartsUseHorizontalExtremes();
    testRecommendationsExistForThreePlayers();

    console.log('Fair Start Tests Completed.');
}

function testResearchBackedSquareThreePlayerStarts() {
    const board = generateSquareBoard({ cols: 40, rows: 27, tileSize: 10, colorCount: 6, rng: createRNG(123) });
    const starts = findFairStartTileIds(board, 3, { boardType: 'square', boardShape: 'rectangular', cols: 40, rows: 27 });
    assertEqualArray('Square 40x27 3-player research starts', starts, [0, 1040, 520]);
}

function testResearchBackedHexThreePlayerStarts() {
    const board = generateHexBoard({ cols: 40, rows: 27, tileSize: 10, colorCount: 6, rng: createRNG(123), shape: 'rectangular' });
    const starts = findFairStartTileIds(board, 3, { boardType: 'hex', boardShape: 'rectangular', cols: 40, rows: 27 });
    assertEqualArray('Hex 40x27 3-player research starts', starts, [559, 520, 1060]);
}

function testFallbackDoesNotUseMathRandom() {
    const originalRandom = Math.random;
    try {
        Math.random = () => { throw new Error('Math.random should not be used by fair-start fallback'); };
        const board = generateSquareBoard({ cols: 10, rows: 10, tileSize: 10, colorCount: 6, rng: createRNG(123) });
        const starts = findFairStartTileIds(board, 4, { boardType: 'square', boardShape: 'rectangular', cols: 10, rows: 10 });
        if (starts.length !== 4 || new Set(starts).size !== 4) {
            console.error('[FAIL] Fair-start fallback returns four unique starts', starts);
        } else {
            console.log('[PASS] Fair-start fallback returns four unique starts without Math.random');
        }
    } finally {
        Math.random = originalRandom;
    }
}


function testCircularSixPlayerStartsStayOnPerimeter() {
    const board = maskedSquareBoard('circular');
    const starts = findFairStartTileIds(board, 6, { boardType: 'square', boardShape: 'circular', cols: 25, rows: 25 });
    const center = centroidBoundsCenter(board);
    const maxRadius = Math.max(...board.tiles.map(tile => distance(centroid(tile.points), center)));
    const minStartRadius = Math.min(...starts.map(id => distance(centroid(board.tiles[id].points), center)));

    if (starts.length !== 6 || new Set(starts).size !== 6 || minStartRadius < maxRadius * 0.75) {
        console.error('[FAIL] Circular 6-player starts stay on the perimeter', starts, { minStartRadius, maxRadius });
    } else {
        console.log('[PASS] Circular 6-player starts stay on the perimeter');
    }
}

function testGemstoneTwoPlayerStartsUseHorizontalExtremes() {
    const board = maskedSquareBoard('gemstone');
    const starts = findFairStartTileIds(board, 2, { boardType: 'square', boardShape: 'gemstone', cols: 25, rows: 25 });
    const startXs = starts.map(id => centroid(board.tiles[id].points)[0]).sort((a, b) => a - b);
    const allXs = board.tiles.map(tile => centroid(tile.points)[0]);
    const minX = Math.min(...allXs);
    const maxX = Math.max(...allXs);

    if (starts.length !== 2 || startXs[0] !== minX || startXs[1] !== maxX) {
        console.error('[FAIL] Gemstone 2-player starts use horizontal extremes', starts, { startXs, minX, maxX });
    } else {
        console.log('[PASS] Gemstone 2-player starts use horizontal extremes');
    }
}

function maskedSquareBoard(shape) {
    let board = generateSquareBoard({ cols: 25, rows: 25, tileSize: 20, colorCount: 6, rng: createRNG(123) });
    const cx = board.width / 2;
    const cy = board.height / 2;
    const radius = Math.min(board.width, board.height) * 0.45;

    if (shape === 'circular') return applyMask(board, circularMask(cx, cy, radius));
    if (shape === 'gemstone') return applyMask(board, gemstoneMask(cx, cy, radius));

    return board;
}

function centroidBoundsCenter(board) {
    const centers = board.tiles.map(tile => centroid(tile.points));
    const xs = centers.map(([x]) => x);
    const ys = centers.map(([, y]) => y);
    return [
        (Math.min(...xs) + Math.max(...xs)) / 2,
        (Math.min(...ys) + Math.max(...ys)) / 2
    ];
}

function centroid(points) {
    let cx = 0;
    let cy = 0;
    for (const [x, y] of points) {
        cx += x;
        cy += y;
    }
    return [cx / points.length, cy / points.length];
}

function distance(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy);
}

function testRecommendationsExistForThreePlayers() {
    const recommendations = getRecommendedBoardTypes(3);
    const hexRecommendation = recommendations.find(r => r.boardType === 'hex');
    if (!hexRecommendation) {
        console.error('[FAIL] 3-player recommendations include hex');
    } else {
        console.log('[PASS] 3-player recommendations include hex');
    }
}

function assertEqualArray(name, actual, expected) {
    const ok = actual.length === expected.length && actual.every((value, index) => value === expected[index]);
    if (ok) {
        console.log(`[PASS] ${name}`);
    } else {
        console.error(`[FAIL] ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}
