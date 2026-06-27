import { loadCustomJsonBoard } from '../tilings/custom.js';
import { validateBoardGraph } from '../core/graph.js';
import { createRNG } from '../core/rng.js';
import { test, assert, assertEqual } from './test-runner.js';

export function runCustomMapTests() {
    console.log("Running Custom Map Tests...");

    test("Load basic custom board", () => {
        const json = {
            width: 100,
            height: 100,
            tiles: [
                { id: 0, points: [[0,0], [10,0], [10,10], [0,10]], neighbors: [1] },
                { id: 1, points: [[10,0], [20,0], [20,10], [10,10]], neighbors: [0] }
            ],
            startTileIds: [0, 1]
        };

        const rng = createRNG(1);
        const board = loadCustomJsonBoard(json, { colorCount: 6, rng });

        assert(board !== null, "Board should be loaded");
        assertEqual(board.tiles.length, 2, "Should have 2 tiles");
        assert(validateBoardGraph(board), "Board graph should be valid");
        assert(board.tiles[0].colorId !== undefined, "Tiles should have assigned colors");
    });

    console.log("Custom Map Tests Completed.");
}
