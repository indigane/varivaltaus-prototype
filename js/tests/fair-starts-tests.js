import { findFairStartTileIds, getRecommendedBoardTypes } from '../core/fair-starts.js';
import { createRNG } from '../core/rng.js';
import { generateSquareBoard } from '../tilings/square.js';
import { generateHexBoard } from '../tilings/hex.js';

export function runFairStartTests() {
    console.log('Running Fair Start Tests...');

    testResearchBackedSquareThreePlayerStarts();
    testResearchBackedHexThreePlayerStarts();
    testFallbackDoesNotUseMathRandom();
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
