import { test, assert } from './test-runner.js';
import { createRNG } from '../core/rng.js';
import { generateSquareBoard } from '../tilings/square.js';
import { createGame } from '../core/game.js';
import { getMove as getRandomMove } from '../bots/random.js';
import { getMove as getGreedyMove } from '../bots/greedy.js';
import { getMove as getAggressiveMove } from '../bots/aggressive.js';
import { getMove as getLookaheadMove } from '../bots/lookahead.js';
import { getMove as getHybridMove } from '../bots/hybrid.js';

export function runBotTests() {
    const rng = createRNG(123);
    const board = generateSquareBoard({ cols: 5, rows: 5, tileSize: 10, colorCount: 6, rng });
    const players = [
        { id: 0, name: "P1", teamId: 0, control: "human", alive: true, score: 0 },
        { id: 1, name: "P2", teamId: 1, control: "greedy", alive: true, score: 0 }
    ];
    const teams = [{ id: 0, playerIds: [0] }, { id: 1, playerIds: [1] }];
    const state = createGame({ board, players, teams, colorCount: 6 });

    test('Random bot returns a valid number', () => {
        const move = getRandomMove(state, 0);
        assert(typeof move === 'number' && move >= 0 && move < 6);
    });

    test('Greedy bot returns a valid number', () => {
        const move = getGreedyMove(state, 0);
        assert(typeof move === 'number' && move >= 0 && move < 6);
    });

    test('Aggressive bot returns a valid number', () => {
        const move = getAggressiveMove(state, 0);
        assert(typeof move === 'number' && move >= 0 && move < 6);
    });

    test('Lookahead bot returns a valid number', () => {
        const move = getLookaheadMove(state, 0);
        assert(typeof move === 'number' && move >= 0 && move < 6);
    });

    test('Hybrid bot returns a valid number', () => {
        const move = getHybridMove(state, 0);
        assert(typeof move === 'number' && move >= 0 && move < 6);
    });
}
