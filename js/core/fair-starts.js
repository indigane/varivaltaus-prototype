/**
 * Utility to find fair starting positions on an arbitrary graph.
 *
 * Prefer research-backed normalized anchor templates where available, then fall
 * back to a deterministic max-min graph-distance heuristic. Normalized anchors
 * are resolved against the generated board bounds, so they scale with board
 * size, tile size, and post-generation masks.
 */

const FAIR_START_TEMPLATES = [
    {
        boardType: 'hex',
        boardShape: 'rectangular',
        playerCount: 3,
        source: 'research/starting-positions/results.md: 40x27 greedy search, tiles [559, 520, 1060]',
        anchors: [
            [0.9876543210, 0.5000000000],
            [0.0246913580, 0.5000000000],
            [0.5061728395, 0.9756097561]
        ]
    },
    {
        boardType: 'square',
        boardShape: 'rectangular',
        playerCount: 3,
        source: 'research/starting-positions/results.md: 40x27 greedy search, tiles [0, 1040, 520]',
        anchors: [
            [0.0125000000, 0.0185185185],
            [0.0125000000, 0.9814814815],
            [0.0125000000, 0.5000000000]
        ]
    }
];

export function findFairStartTileIds(board, playerCount, context = {}) {
    if (playerCount <= 0 || !board?.tiles?.length) return [];
    if (playerCount === 1) return [board.tiles[0].id];

    const template = findFairStartTemplate(board, playerCount, context);
    if (template) {
        const resolvedIds = resolveNormalizedAnchorsToTileIds(board, template.anchors);
        if (resolvedIds.length === playerCount) return resolvedIds;
    }

    return findGraphHeuristicStartTileIds(board, playerCount);
}

export function getRecommendedBoardTypes(playerCount) {
    if (playerCount === 3) {
        return [
            {
                boardType: 'hex',
                boardShape: 'rectangular',
                confidence: 'researched',
                reason: 'Best current 3-player fairness result; mid-edge and lower-center starts had the lowest observed spread.'
            },
            {
                boardType: 'square',
                boardShape: 'rectangular',
                confidence: 'researched',
                reason: 'Playable with asymmetric left-edge starts; avoid three-corner starts on rectangles.'
            },
            {
                boardType: 'triangle',
                boardShape: 'rectangular',
                confidence: 'caution',
                reason: 'Current research found triangle boards difficult to balance for 3 players.'
            }
        ];
    }

    if (playerCount === 2) {
        return [
            {
                boardType: 'square',
                confidence: 'heuristic',
                reason: 'Opposite graph-diameter starts are straightforward and robust.'
            },
            {
                boardType: 'hex',
                confidence: 'heuristic',
                reason: 'Opposite/extreme starts work well and preserve strong connectivity.'
            }
        ];
    }

    return [
        {
            boardType: 'hex',
            confidence: 'heuristic',
            reason: 'Good general default for many players due to even connectivity.'
        },
        {
            boardType: 'voronoi-jittered',
            confidence: 'experimental',
            reason: 'Interesting variety; should rely on dynamic fair-start search until researched.'
        }
    ];
}

function findFairStartTemplate(board, playerCount, context) {
    const boardType = context.boardType ?? board.generator;
    const boardShape = context.boardShape ?? board.shape;

    return FAIR_START_TEMPLATES.find(template => {
        if (template.playerCount !== playerCount) return false;
        if (template.boardType !== boardType) return false;

        // Do not apply rectangular research templates to an explicitly different
        // shape, such as circular masks or hexagonal boards. If no shape context
        // is available, allow matching by board type for backwards compatibility.
        if (boardShape && template.boardShape && template.boardShape !== boardShape) return false;

        return true;
    });
}

function resolveNormalizedAnchorsToTileIds(board, anchors) {
    const bounds = getBoardBounds(board);
    if (!bounds) return [];

    const selected = [];
    const selectedSet = new Set();

    for (const [nx, ny] of anchors) {
        const target = [
            bounds.minX + nx * bounds.width,
            bounds.minY + ny * bounds.height
        ];
        const tile = findNearestUnselectedTile(board, target, selectedSet);
        if (!tile) break;

        selected.push(tile.id);
        selectedSet.add(tile.id);
    }

    return selected;
}

function findGraphHeuristicStartTileIds(board, playerCount) {
    const selectedIds = [];
    const candidateIds = findCandidateTileIds(board);

    if (playerCount === 2) {
        let maxDist = -1;
        let bestPair = [candidateIds[0], candidateIds[1] ?? candidateIds[0]];

        for (const startId of candidateIds) {
            const dMap = computeDistances(board, startId);
            for (const tile of board.tiles) {
                const d = dMap[tile.id];
                if (d !== undefined && d > maxDist) {
                    maxDist = d;
                    bestPair = [startId, tile.id];
                }
            }
        }
        selectedIds.push(...bestPair);
    } else {
        selectedIds.push(candidateIds[0] ?? board.tiles[0].id);
    }

    while (selectedIds.length < playerCount) {
        let bestTileId = -1;
        let maxMinDistance = -1;

        const distances = selectedIds.map(startId => computeDistances(board, startId));

        for (const tile of board.tiles) {
            if (selectedIds.includes(tile.id)) continue;

            let minDistance = Infinity;
            for (const dMap of distances) {
                const d = dMap[tile.id] === undefined ? Infinity : dMap[tile.id];
                if (d < minDistance) minDistance = d;
            }

            if (minDistance !== Infinity && minDistance > maxMinDistance) {
                maxMinDistance = minDistance;
                bestTileId = tile.id;
            }
        }

        if (bestTileId === -1) break;
        selectedIds.push(bestTileId);
    }

    return selectedIds;
}

function findCandidateTileIds(board) {
    const bounds = getBoardBounds(board);
    if (!bounds) return board.tiles.map(t => t.id);

    const targets = [
        [bounds.minX, bounds.minY],
        [bounds.maxX, bounds.maxY],
        [bounds.maxX, bounds.minY],
        [bounds.minX, bounds.maxY],
        [bounds.minX + bounds.width / 2, bounds.minY],
        [bounds.minX + bounds.width / 2, bounds.maxY],
        [bounds.minX, bounds.minY + bounds.height / 2],
        [bounds.maxX, bounds.minY + bounds.height / 2],
        [bounds.minX + bounds.width / 2, bounds.minY + bounds.height / 2]
    ];

    const candidates = new Set();
    for (const target of targets) {
        const tile = findNearestUnselectedTile(board, target, candidates);
        if (tile) candidates.add(tile.id);
    }

    return Array.from(candidates);
}

function getBoardBounds(board) {
    if (!board.tiles.length) return null;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const tile of board.tiles) {
        for (const [x, y] of tile.points) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }

    return {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX,
        height: maxY - minY
    };
}

function findNearestUnselectedTile(board, target, selectedSet) {
    let bestTile = null;
    let bestDistance = Infinity;

    for (const tile of board.tiles) {
        if (selectedSet.has(tile.id)) continue;

        const [cx, cy] = centroid(tile.points);
        const dx = cx - target[0];
        const dy = cy - target[1];
        const distance = dx * dx + dy * dy;

        if (distance < bestDistance) {
            bestDistance = distance;
            bestTile = tile;
        }
    }

    return bestTile;
}

function centroid(points) {
    let cx = 0;
    let cy = 0;
    for (const [x, y] of points) {
        cx += x;
        cy += y;
    }
    return [cx / points.length, cy / points.length];
}

function computeDistances(board, startId) {
    const distances = {};
    const queue = [[startId, 0]];
    distances[startId] = 0;

    while (queue.length > 0) {
        const [id, d] = queue.shift();
        const tile = board.tiles[id];
        if (!tile) continue;

        for (const neighborId of tile.neighbors) {
            if (distances[neighborId] === undefined) {
                distances[neighborId] = d + 1;
                queue.push([neighborId, d + 1]);
            }
        }
    }
    return distances;
}
