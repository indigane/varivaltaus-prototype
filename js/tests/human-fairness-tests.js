import { test, assert, assertEqual } from './test-runner.js';
import { createRNG } from '../core/rng.js';
import { generateSquareBoard } from '../tilings/square.js';
import { createGame } from '../core/game.js';
import { evaluateHumanFairness, acceptsFairnessReport } from '../core/human-fairness.js';

export function runHumanFairnessTests() {
    console.log('Running Human Fairness Tests...');

    test('Human fairness report exposes score and favored player', () => {
        const state = createTwoPlayerSquareState(10, 10, 12345);
        const report = evaluateHumanFairness(state);

        assert(Number.isFinite(report.score), 'score should be finite');
        assert(report.positions.length === 2, 'should have two position reports');
        assert(report.favoredPlayerId === 0 || report.favoredPlayerId === 1, 'favored player should be one of the players');
        assert(report.componentSpreads.opening >= 0, 'opening spread should be non-negative');
    });

    test('Balanced acceptance respects threshold', () => {
        const state = createTwoPlayerSquareState(8, 8, 10);
        const report = evaluateHumanFairness(state);

        assertEqual(
            acceptsFairnessReport(report, { enabled: true, mode: 'balanced', threshold: report.score + 0.001 }),
            true,
            'report should pass a threshold above its score'
        );
        assertEqual(
            acceptsFairnessReport(report, { enabled: true, mode: 'balanced', threshold: Math.max(0, report.score - 0.001) }),
            report.score === 0,
            'report should fail a lower threshold unless score is exactly zero'
        );
    });

    test('Handicap acceptance requires target favored player and score range', () => {
        const state = createAsymmetricLineState();
        const report = evaluateHumanFairness(state);

        assert(report.score > 0, 'asymmetric board should have non-zero bias');
        assertEqual(report.favoredPlayerId, 0, 'player 1 should be favored on the line board');
        assert(acceptsFairnessReport(report, {
            enabled: true,
            mode: 'handicap',
            targetPlayerId: 0,
            handicapMin: 0,
            handicapMax: 1
        }), 'targeted handicap should be accepted');
        assert(!acceptsFairnessReport(report, {
            enabled: true,
            mode: 'handicap',
            targetPlayerId: 1,
            handicapMin: 0,
            handicapMax: 1
        }), 'wrong target should be rejected');
    });

    console.log('Human Fairness Tests Completed.');
}

function createTwoPlayerSquareState(cols, rows, seed) {
    const board = generateSquareBoard({ cols, rows, tileSize: 10, colorCount: 6, rng: createRNG(seed) });
    board.startTileIds = [0, rows * cols - 1];
    return createGame({
        board,
        players: [
            { id: 0, name: 'P1', teamId: 0, control: 'human', alive: true, score: 0 },
            { id: 1, name: 'P2', teamId: 1, control: 'human', alive: true, score: 0 }
        ],
        teams: [
            { id: 0, name: 'T1', playerIds: [0], score: 0 },
            { id: 1, name: 'T2', playerIds: [1], score: 0 }
        ],
        colorCount: 6,
        paletteId: 'default-6',
        rngSeed: seed,
        playRngSeed: seed + 1,
        rules: {
            winCondition: 'mostTiles',
            turnOrder: 'players',
            teamTerritory: 'separatePlayers',
            captureMode: 'neutralOnly',
            colorRestrictions: 'notOwnColor',
            startingPositions: 'corners',
            maxTurns: 100,
            startingAreaSize: 1,
            startingAreaBuffer: true,
            allowSameStartingColor: false
        }
    });
}

function createAsymmetricLineState() {
    const board = {
        version: 1,
        generator: 'test-line',
        width: 50,
        height: 10,
        startTileIds: [0, 4],
        tiles: [
            { id: 0, colorId: 0, ownerId: null, points: [[0, 0]], neighbors: [1] },
            { id: 1, colorId: 1, ownerId: null, points: [[10, 0]], neighbors: [0, 2] },
            { id: 2, colorId: 1, ownerId: null, points: [[20, 0]], neighbors: [1, 3] },
            { id: 3, colorId: 2, ownerId: null, points: [[30, 0]], neighbors: [2, 4] },
            { id: 4, colorId: 3, ownerId: null, points: [[40, 0]], neighbors: [3] }
        ]
    };

    return createGame({
        board,
        players: [
            { id: 0, name: 'P1', teamId: 0, control: 'human', alive: true, score: 0 },
            { id: 1, name: 'P2', teamId: 1, control: 'human', alive: true, score: 0 }
        ],
        teams: [
            { id: 0, name: 'T1', playerIds: [0], score: 0 },
            { id: 1, name: 'T2', playerIds: [1], score: 0 }
        ],
        colorCount: 4,
        paletteId: 'default-4',
        rngSeed: 1,
        playRngSeed: 2,
        rules: {
            winCondition: 'mostTiles',
            turnOrder: 'players',
            teamTerritory: 'separatePlayers',
            captureMode: 'neutralOnly',
            colorRestrictions: 'notOwnColor',
            startingPositions: 'corners',
            maxTurns: 100,
            startingAreaSize: 1,
            startingAreaBuffer: false,
            allowSameStartingColor: true
        }
    });
}
