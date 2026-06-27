/**
 * Utility to find "fair" starting positions on an arbitrary graph.
 */

export function findFairStartTileIds(board, playerCount) {
    if (playerCount <= 0) return [];
    if (playerCount === 1) return [board.tiles[0].id];

    // Simple heuristic: pick tiles that are far apart.
    // We'll use a greedy approach:
    // 1. Pick a random tile (or the first one).
    // 2. Pick the tile furthest from it.
    // 3. Repeatedly pick the tile furthest from the set of already picked tiles.

    const selectedIds = [];

    // Start with the first tile or a corner-like tile if possible
    selectedIds.push(board.tiles[0].id);

    while (selectedIds.length < playerCount) {
        let bestTileId = -1;
        let maxMinDistance = -1;

        // For each tile, find its minimum distance to any already selected tile
        const distances = selectedIds.map(startId => computeDistances(board, startId));

        for (let i = 0; i < board.tiles.length; i++) {
            if (selectedIds.includes(i)) continue;

            let minDistance = Infinity;
            for (const dMap of distances) {
                const d = dMap[i] === undefined ? Infinity : dMap[i];
                if (d < minDistance) minDistance = d;
            }

            if (minDistance !== Infinity && minDistance > maxMinDistance) {
                maxMinDistance = minDistance;
                bestTileId = i;
            }
        }

        if (bestTileId === -1) break; // Should not happen if graph is connected
        selectedIds.push(bestTileId);
    }

    return selectedIds;
}

function computeDistances(board, startId) {
    const distances = {};
    const queue = [[startId, 0]];
    distances[startId] = 0;

    while (queue.length > 0) {
        const [id, d] = queue.shift();
        for (const neighborId of board.tiles[id].neighbors) {
            if (distances[neighborId] === undefined) {
                distances[neighborId] = d + 1;
                queue.push([neighborId, d + 1]);
            }
        }
    }
    return distances;
}
