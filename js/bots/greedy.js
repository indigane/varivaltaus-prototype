import { isLegalMove, canCaptureTile } from '../core/rules.js';

export function getMove(state, playerId) {
    let bestColor = -1;
    let maxGain = -1;

    for (let c = 0; c < state.colorCount; c++) {
        if (!isLegalMove(state, playerId, c)) continue;

        const gain = simulateMove(state, playerId, c);
        if (gain > maxGain) {
            maxGain = gain;
            bestColor = c;
        }
    }

    return bestColor;
}

export function simulateMove(state, playerId, colorId) {
    const queue = [];
    const visited = new Set();
    let gain = 0;

    // Teammates should be considered part of the "source" for flood if merged
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
                if (canCaptureTile(state, playerId, neighborId)) {
                    gain++;
                    queue.push(neighborId);
                }
            }
        }
    }

    return gain;
}
