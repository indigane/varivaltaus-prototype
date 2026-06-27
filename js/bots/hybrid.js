import { getMove as getAggressiveMove } from './aggressive.js';
import { getMove as getGreedyMove } from './greedy.js';

export function getMove(state, playerId) {
    // Check if in contact with an opponent
    const hasContact = checkOpponentContact(state, playerId);

    if (hasContact) {
        return getGreedyMove(state, playerId);
    } else {
        return getAggressiveMove(state, playerId);
    }
}

function checkOpponentContact(state, playerId) {
    const player = state.players[playerId];
    for (const tile of state.board.tiles) {
        if (tile.ownerId === playerId || (state.rules.teamTerritory === "merged" && tile.ownerId !== null && state.players[tile.ownerId].teamId === player.teamId)) {
            for (const neighborId of tile.neighbors) {
                const neighbor = state.board.tiles[neighborId];
                if (neighbor.ownerId !== null && state.players[neighbor.ownerId].teamId !== player.teamId) {
                    return true;
                }
            }
        }
    }
    return false;
}
