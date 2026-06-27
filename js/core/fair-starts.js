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

    // Find candidates that are likely to be "corners" or "extremes"
    // 1. Minimum degree tiles
    // 2. Geometric extremes (min/max X/Y)
    const candidates = new Set();

    let minDeg = Infinity;
    for (const t of board.tiles) {
        if (t.neighbors.length < minDeg) minDeg = t.neighbors.length;
    }
    board.tiles.forEach(t => {
        if (t.neighbors.length === minDeg) candidates.add(t.id);
    });

    // Geometric extremes
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let minXT = 0, maxXT = 0, minYT = 0, maxYT = 0;

    board.tiles.forEach(t => {
        // Use centroid for geometric extremes
        let cx = 0, cy = 0;
        t.points.forEach(p => { cx += p[0]; cy += p[1]; });
        cx /= t.points.length;
        cy /= t.points.length;

        if (cx < minX) { minX = cx; minXT = t.id; }
        if (cx > maxX) { maxX = cx; maxXT = t.id; }
        if (cy < minY) { minY = cy; minYT = t.id; }
        if (cy > maxY) { maxY = cy; maxYT = t.id; }
    });
    candidates.add(minXT);
    candidates.add(maxXT);
    candidates.add(minYT);
    candidates.add(maxYT);

    // Also add some random samples to be safe, but prioritize extremes
    const sampleSize = 20;
    for (let i = 0; i < sampleSize; i++) {
        candidates.add(Math.floor(Math.random() * board.tiles.length));
    }

    const candidateIds = Array.from(candidates);

    if (playerCount === 2) {
        let maxDist = -1;
        let bestPair = [candidateIds[0], candidateIds[1] || candidateIds[0]];

        // Double-ended BFS diameter search from candidates
        for (const startId of candidateIds) {
            const dMap = computeDistances(board, startId);
            for (let j = 0; j < board.tiles.length; j++) {
                if (dMap[j] !== undefined && dMap[j] > maxDist) {
                    maxDist = dMap[j];
                    bestPair = [startId, j];
                }
            }
        }
        selectedIds.push(...bestPair);
    } else {
        // Start with the most extreme corner for multi-player greedy selection
        selectedIds.push(minXT);
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
