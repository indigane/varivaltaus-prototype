import { isLegalMove, canCaptureTile } from '../core/rules.js';

/**
 * Aggressive Bot: prefers colors that expand territory furthest from the start point.
 */
export function getMove(state, playerId) {
    const startTileId = state.board.startTileIds[playerId % state.board.startTileIds.length];
    const startTile = state.board.tiles[startTileId];
    const startPos = getCentroid(startTile.points);

    let bestColor = -1;
    let maxDistance = -1;
    let maxGain = -1;

    for (let c = 0; c < state.colorCount; c++) {
        if (!isLegalMove(state, playerId, c)) continue;

        const { gain, furthestDist } = simulateMoveDistance(state, playerId, c, startPos);

        // Priority: farthest expansion, then max gain if distances are equal
        if (furthestDist > maxDistance || (furthestDist === maxDistance && gain > maxGain)) {
            maxDistance = furthestDist;
            maxGain = gain;
            bestColor = c;
        }
    }

    return bestColor;
}

function simulateMoveDistance(state, playerId, colorId, startPos) {
    const queue = [];
    const visited = new Set();
    let gain = 0;
    let furthestDist = 0;
    const player = state.players[playerId];

    for (const tile of state.board.tiles) {
        const isOwner = tile.ownerId === playerId;
        const isTeammateMerged = state.rules.teamTerritory === "merged" &&
                                 tile.ownerId !== null &&
                                 state.players[tile.ownerId].teamId === player.teamId;

        if (isOwner || isTeammateMerged) {
            queue.push(tile.id);
            visited.add(tile.id);

            const dist = getDistance(getCentroid(tile.points), startPos);
            if (dist > furthestDist) furthestDist = dist;
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

                    const dist = getDistance(getCentroid(neighbor.points), startPos);
                    if (dist > furthestDist) furthestDist = dist;
                }
            }
        }
    }

    return { gain, furthestDist };
}

function getCentroid(points) {
    let x = 0, y = 0;
    for (const p of points) {
        x += p[0];
        y += p[1];
    }
    return [x / points.length, y / points.length];
}

function getDistance(p1, p2) {
    return Math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2);
}
