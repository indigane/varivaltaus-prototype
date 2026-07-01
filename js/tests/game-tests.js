import { test, assert, assertEqual } from './test-runner.js';
import { createRNG } from '../core/rng.js';
import { generateSquareBoard } from '../tilings/square.js';
import { createGame, applyMove } from '../core/game.js';

export function runGameTests() {
    console.log("Running Game Logic Tests...");

    test("Initial state setup", () => {
        const rng = createRNG(12345);
        const board = generateSquareBoard({ cols: 5, rows: 5, tileSize: 10, colorCount: 6, rng });
        const players = [{ id: 0, name: "P1", teamId: 0, control: "human", alive: true, score: 0 }];
        const teams = [{ id: 0, name: "T1", playerIds: [0], score: 0 }];

        const state = createGame({ board, players, teams, colorCount: 6, paletteId: "default-6", rngSeed: 12345 });

        assert(state.board.tiles[0].ownerId === 0, "Top-left tile should be owned by player 0");
        assert(state.players[0].score > 0, "Player 0 should have a score > 0");
    });

    test("Move legality - cannot pick same color", () => {
        const rng = createRNG(12345);
        const board = generateSquareBoard({ cols: 5, rows: 5, tileSize: 10, colorCount: 6, rng });
        const players = [{ id: 0, name: "P1", teamId: 0, control: "human", alive: true, score: 0 }];
        const teams = [{ id: 0, name: "T1", playerIds: [0], score: 0 }];
        const state = createGame({ board, players, teams, colorCount: 6, paletteId: "default-6", rngSeed: 12345 });

        const currentColor = state.board.tiles[0].colorId;
        const result = applyMove(state, 0, currentColor);

        assert(result.error !== undefined, "Should return an error when picking the current color");
    });

    test("Capture logic - territory expands", () => {
        // Create a fixed board for predictable testing
        const board = {
            width: 100, height: 100,
            startTileIds: [0],
            tiles: [
                { id: 0, colorId: 0, ownerId: null, points: [], neighbors: [1] },
                { id: 1, colorId: 1, ownerId: null, points: [], neighbors: [0, 2] },
                { id: 2, colorId: 1, ownerId: null, points: [], neighbors: [1] }
            ]
        };
        const players = [{ id: 0, name: "P1", teamId: 0, control: "human", alive: true, score: 0 }];
        const teams = [{ id: 0, name: "T1", playerIds: [0], score: 0 }];
        let state = createGame({ board, players, teams, colorCount: 6, paletteId: "default-6", rngSeed: 12345 });

        // Initial state: tile 0 is owned by P1 (color 0). neighbors 1 and 2 are neutral (color 1).
        assertEqual(state.board.tiles[0].ownerId, 0, "Tile 0 should be owned");
        assertEqual(state.board.tiles[1].ownerId, null, "Tile 1 should be neutral");

        // Move: P1 picks color 1
        const result = applyMove(state, 0, 1);
        state = result.state;

        assertEqual(state.board.tiles[0].colorId, 1, "Tile 0 should be recolored");
        assertEqual(state.board.tiles[1].ownerId, 0, "Tile 1 should be captured");
        assertEqual(state.board.tiles[2].ownerId, 0, "Tile 2 should be captured (chained)");
        assertEqual(state.players[0].score, 3, "Score should be 3");
    });

    test("Starting area buffer prevents immediate capture", () => {
        // Mock board where neighbors have the same color as the start tile
        const board = {
            width: 100, height: 100,
            startTileIds: [0],
            tiles: [
                { id: 0, colorId: 0, ownerId: null, points: [], neighbors: [1] },
                { id: 1, colorId: 0, ownerId: null, points: [], neighbors: [0] }
            ]
        };
        const players = [{ id: 0, name: "P1", teamId: 0, control: "human", alive: true, score: 0 }];
        const teams = [{ id: 0, name: "T1", playerIds: [0], score: 0 }];
        const rules = {
            startingAreaSize: 1,
            startingAreaBuffer: true,
            allowSameStartingColor: true,
            captureMode: "neutralOnly",
            colorRestrictions: "notOwnColor"
        };

        const state = createGame({ board, players, teams, colorCount: 6, rules });

        assertEqual(state.board.tiles[0].ownerId, 0, "Tile 0 should be owned");
        assert(state.board.tiles[1].colorId !== state.board.tiles[0].colorId, "Tile 1 should have its color changed by the buffer");
        assertEqual(state.board.tiles[1].ownerId, null, "Tile 1 should NOT be captured during init");
        assertEqual(state.players[0].score, 1, "Score should be exactly 1");
    });

    test("Sparse team IDs do not crash scoring", () => {
        const board = {
            width: 100, height: 100,
            startTileIds: [0, 1],
            tiles: [
                { id: 0, colorId: 0, ownerId: null, points: [], neighbors: [1] },
                { id: 1, colorId: 1, ownerId: null, points: [], neighbors: [0] }
            ]
        };
        // Player has teamId: 5, but teams array only has one team with ID 0.
        // This simulates the bug where teamId in local storage is stale.
        const players = [
            { id: 0, name: "P1", teamId: 5, control: "human", alive: true, score: 0 },
            { id: 1, name: "P2", teamId: 0, control: "human", alive: true, score: 0 }
        ];
        const teams = [{ id: 0, name: "T0", playerIds: [1], score: 0 }];

        try {
            createGame({ board, players, teams, colorCount: 6, paletteId: "default-6", rngSeed: 12345 });
        } catch (e) {
            assert(false, `createGame crashed with sparse team IDs: ${e.message}`);
        }
    });

    console.log("Game Logic Tests Complete.");
}
