/**
 * Utility to find fair starting positions on an arbitrary graph.
 *
 * Prefer research-backed normalized anchor templates where available, then use
 * geometry-aware starts for masked boards, and finally fall back to a
 * deterministic max-min graph-distance heuristic. Normalized anchors are
 * resolved against the generated board bounds, so they scale with board size,
 * tile size, and post-generation masks.
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

const RADIAL_MASK_SHAPES = new Set([
    'circular',
    'donut',
    'hexagonal',
    'ellipse-v',
    'ellipse-h',
    'gemstone',
    'hourglass-v',
    'hourglass-h',
    'plus'
]);

const HORIZONTAL_TWO_PLAYER_SHAPES = new Set([
    'circular',
    'donut',
    'hexagonal',
    'ellipse-h',
    'gemstone',
    'hourglass-h',
    'plus'
]);

const VERTICAL_TWO_PLAYER_SHAPES = new Set([
    'ellipse-v',
    'hourglass-v',
    'triangular'
]);

export function findFairStartTileIds(board, playerCount, context = {}) {
    if (playerCount <= 0 || !board?.tiles?.length) return [];

    const targetCount = Math.min(playerCount, board.tiles.length);
    if (targetCount === 1) return [board.tiles[0].id];

    const template = findFairStartTemplate(board, targetCount, context);
    if (template) {
        const resolvedIds = resolveNormalizedAnchorsToTileIds(board, template.anchors);
        if (resolvedIds.length === targetCount) return resolvedIds;
    }

    const geometryAwareIds = findGeometryAwareStartTileIds(board, targetCount, context);
    if (geometryAwareIds.length === targetCount) return geometryAwareIds;

    return findGraphHeuristicStartTileIds(board, targetCount);
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

function findGeometryAwareStartTileIds(board, playerCount, context) {
    const boardShape = context.boardShape ?? board.shape;
    if (!boardShape || boardShape === 'rectangular') return [];

    if (playerCount === 2) {
        if (HORIZONTAL_TWO_PLAYER_SHAPES.has(boardShape)) {
            return findAxisExtremePair(board, 'x');
        }
        if (VERTICAL_TWO_PLAYER_SHAPES.has(boardShape)) {
            return findAxisExtremePair(board, 'y');
        }
    }

    if (!RADIAL_MASK_SHAPES.has(boardShape)) return [];

    const bounds = getCentroidBounds(board);
    if (!bounds) return [];

    // Place multi-player starts around the actual masked footprint instead of
    // using the board center as a late max-min candidate. This is especially
    // important for circular 6-8 player games where center starts dominate.
    const targets = createRadialPerimeterTargets(bounds, playerCount);
    return resolveTargetsToTileIds(board, targets);
}

function resolveNormalizedAnchorsToTileIds(board, anchors) {
    const bounds = getBoardBounds(board);
    if (!bounds) return [];

    const targets = anchors.map(([nx, ny]) => ([
        bounds.minX + nx * bounds.width,
        bounds.minY + ny * bounds.height
    ]));

    return resolveTargetsToTileIds(board, targets);
}

function resolveTargetsToTileIds(board, targets) {
    const selected = [];
    const selectedSet = new Set();

    for (const target of targets) {
        const tile = findNearestUnselectedTile(board, target, selectedSet);
        if (!tile) break;

        selected.push(tile.id);
        selectedSet.add(tile.id);
    }

    return selected;
}

function createRadialPerimeterTargets(bounds, playerCount) {
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const rx = bounds.width / 2;
    const ry = bounds.height / 2;

    // Two-player radial shapes are handled by exact axis extremes above. For
    // larger counts, start at the top and walk clockwise so the sequence itself
    // stays spatially coherent for UI edge/strip assignment.
    const startAngle = -Math.PI / 2;
    const targets = [];

    for (let i = 0; i < playerCount; i++) {
        const angle = startAngle + (2 * Math.PI * i) / playerCount;
        targets.push([
            cx + Math.cos(angle) * rx,
            cy + Math.sin(angle) * ry
        ]);
    }

    return targets;
}

function findAxisExtremePair(board, axis) {
    const bounds = getCentroidBounds(board);
    if (!bounds) return [];

    const axisIndex = axis === 'x' ? 0 : 1;
    const perpendicularIndex = axis === 'x' ? 1 : 0;
    const perpendicularCenter = axis === 'x'
        ? (bounds.minY + bounds.maxY) / 2
        : (bounds.minX + bounds.maxX) / 2;

    let minTile = null;
    let maxTile = null;
    let minValue = Infinity;
    let maxValue = -Infinity;
    let minTieDistance = Infinity;
    let maxTieDistance = Infinity;

    for (const tile of board.tiles) {
        const c = centroid(tile.points);
        const value = c[axisIndex];
        const tieDistance = Math.abs(c[perpendicularIndex] - perpendicularCenter);

        if (value < minValue - Number.EPSILON || (Math.abs(value - minValue) <= Number.EPSILON && tieDistance < minTieDistance)) {
            minValue = value;
            minTieDistance = tieDistance;
            minTile = tile;
        }

        if (value > maxValue + Number.EPSILON || (Math.abs(value - maxValue) <= Number.EPSILON && tieDistance < maxTieDistance)) {
            maxValue = value;
            maxTieDistance = tieDistance;
            maxTile = tile;
        }
    }

    if (!minTile || !maxTile) return [];
    if (minTile.id === maxTile.id) return [minTile.id];

    return [minTile.id, maxTile.id];
}

function findGraphHeuristicStartTileIds(board, playerCount) {
    const selectedIds = [];
    const candidateIds = findCandidateTileIds(board);
    const fallbackIds = board.tiles.map(t => t.id);
    const searchIds = candidateIds.length >= playerCount ? candidateIds : fallbackIds;

    if (playerCount === 2) {
        let maxDist = -1;
        let bestPair = [searchIds[0], searchIds[1] ?? searchIds[0]];

        for (const startId of searchIds) {
            const dMap = computeDistances(board, startId);
            for (const tileId of searchIds) {
                if (tileId === startId) continue;
                const d = dMap[tileId];
                if (d !== undefined && d > maxDist) {
                    maxDist = d;
                    bestPair = [startId, tileId];
                }
            }
        }
        selectedIds.push(...bestPair);
    } else {
        selectedIds.push(searchIds[0] ?? board.tiles[0].id);
    }

    while (selectedIds.length < playerCount) {
        let bestTileId = -1;
        let maxMinDistance = -1;

        const distances = selectedIds.map(startId => computeDistances(board, startId));

        for (const tileId of searchIds) {
            if (selectedIds.includes(tileId)) continue;

            let minDistance = Infinity;
            for (const dMap of distances) {
                const d = dMap[tileId] === undefined ? Infinity : dMap[tileId];
                if (d < minDistance) minDistance = d;
            }

            if (minDistance !== Infinity && minDistance > maxMinDistance) {
                maxMinDistance = minDistance;
                bestTileId = tileId;
            }
        }

        // If perimeter candidates cannot supply enough connected starts, fall
        // back to any unselected tile rather than returning duplicates.
        if (bestTileId === -1 && searchIds !== fallbackIds) {
            for (const tileId of fallbackIds) {
                if (!selectedIds.includes(tileId)) {
                    bestTileId = tileId;
                    break;
                }
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
        [bounds.maxX, bounds.minY + bounds.height / 2]
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

function getCentroidBounds(board) {
    if (!board.tiles.length) return null;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const tile of board.tiles) {
        const [cx, cy] = centroid(tile.points);
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
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
    const tileById = new Map(board.tiles.map(tile => [tile.id, tile]));
    const distances = {};
    const queue = [[startId, 0]];
    distances[startId] = 0;

    while (queue.length > 0) {
        const [id, d] = queue.shift();
        const tile = tileById.get(id);
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
