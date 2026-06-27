import { getMove as getGreedyMove, simulateMove } from './greedy.js';
import { isLegalMove } from '../core/rules.js';

export function getMove(state, playerId, depth = 2) {
    const bestMove = minimax(state, playerId, depth);
    return bestMove.colorId;
}

function minimax(state, playerId, depth) {
    if (depth === 0) {
        return { score: 0 }; // We only care about immediate gain for now in this simple version
    }

    let bestColorId = -1;
    let maxScore = -Infinity;

    for (let c = 0; c < state.colorCount; c++) {
        if (!isLegalMove(state, playerId, c)) continue;

        // 1. Calculate gain of this move
        const gain = simulateMove(state, playerId, c);

        // 2. Simple lookahead: add the best possible gain on the next turn
        // For a more complete minimax, we'd need to simulate the board state change.
        // Since we don't want to clone the whole board if possible, let's do a shallow simulation.

        // Mock state change (just for scoring)
        // This is a bit complex without full state cloning.
        // For Milestone 4, let's keep lookahead simple:
        // "Look at immediate gain + potential gain from colors reachable after this move"

        const potentialGain = simulateLookahead(state, playerId, c);
        const totalScore = gain + potentialGain * 0.5; // Weight future gain slightly less

        if (totalScore > maxScore) {
            maxScore = totalScore;
            bestColorId = c;
        }
    }

    return { colorId: bestColorId, score: maxScore };
}

function simulateLookahead(state, playerId, colorId) {
    // 1. Find all tiles that would be captured
    const capturedIds = [];
    const queue = [];
    const visited = new Set();
    const player = state.players[playerId];

    for (const tile of state.board.tiles) {
        const isOwner = tile.ownerId === playerId;
        const isTeammateMerged = state.rules.teamTerritory === "merged" &&
                                 tile.ownerId !== null &&
                                 state.players[tile.ownerId].teamId === player.teamId;
        if (isOwner || isTeammateMerged) {
            queue.push(tile.id);
            visited.add(tile.id);
        }
    }

    while (queue.length > 0) {
        const tileId = queue.shift();
        const tile = state.board.tiles[tileId];

        for (const neighborId of tile.neighbors) {
            if (visited.has(neighborId)) continue;
            visited.add(neighborId);
            const neighbor = state.board.tiles[neighborId];
            if (neighbor.ownerId === null && neighbor.colorId === colorId) {
                capturedIds.push(neighborId);
                queue.push(neighborId);
            }
        }
    }

    // 2. From the *new* boundary, what's the best next gain?
    // This is still a bit of a heuristic.
    let maxNextGain = 0;
    for (let nextC = 0; nextC < state.colorCount; nextC++) {
        if (nextC === colorId) continue;

        let nextGain = 0;
        const nextVisited = new Set(visited);
        const nextQueue = [...capturedIds];

        while (nextQueue.length > 0) {
            const tileId = nextQueue.shift();
            const tile = state.board.tiles[tileId];
            for (const neighborId of tile.neighbors) {
                if (nextVisited.has(neighborId)) continue;
                nextVisited.add(neighborId);
                const neighbor = state.board.tiles[neighborId];
                if (neighbor.ownerId === null && neighbor.colorId === nextC) {
                    nextGain++;
                    nextQueue.push(neighborId);
                }
            }
        }
        if (nextGain > maxNextGain) maxNextGain = nextGain;
    }

    return maxNextGain;
}
