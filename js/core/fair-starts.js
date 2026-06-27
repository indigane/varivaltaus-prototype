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

    if (playerCount === 2) {
        // For exactly 2 players, find the absolute diameter of the graph
        // This ensures they are as far apart as possible (e.g. opposite corners)
        let maxDist = -1;
        let bestPair = [0, board.tiles.length - 1];

        // We can optimize this by only checking "boundary" tiles if we had them,
        // but for now, we'll sample some tiles to keep it fast if the board is huge.
        const sampleSize = Math.min(board.tiles.length, 100);
        const step = Math.max(1, Math.floor(board.tiles.length / sampleSize));

        for (let i = 0; i < board.tiles.length; i += step) {
            const dMap = computeDistances(board, i);
            for (let j = 0; j < board.tiles.length; j += step) {
                if (dMap[j] > maxDist) {
                    maxDist = dMap[j];
                    bestPair = [i, j];
                }
            }
        }
        selectedIds.push(...bestPair);
    } else {
        // Start with the first tile
        selectedIds.push(board.tiles[0].id);
    }

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
