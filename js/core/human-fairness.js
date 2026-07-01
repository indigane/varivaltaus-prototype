/**
 * Static board-position fairness heuristics for human-vs-human games.
 *
 * This intentionally does not run bots. It evaluates the initialized board that
 * humans see after start ownership, starting-area expansion, buffer rules, and
 * initial flood capture have already been applied by createGame().
 */

const DEFAULT_WEIGHTS = Object.freeze({
    opening: 0.30,
    voronoi: 0.30,
    local: 0.20,
    mobility: 0.10,
    centrality: 0.10
});

const DEFAULT_OPTIONS = Object.freeze({
    localRadius: 4,
    openingTopWeights: [1, 0.5, 0.25],
    weights: DEFAULT_WEIGHTS
});

export function evaluateHumanFairness(state, options = {}) {
    const opts = {
        ...DEFAULT_OPTIONS,
        ...options,
        weights: { ...DEFAULT_WEIGHTS, ...(options.weights || {}) }
    };

    if (!state?.board?.tiles?.length || !Array.isArray(state.players) || state.players.length < 2) {
        return emptyReport('not-enough-players');
    }

    const board = state.board;
    const participants = state.players
        .filter(player => player && player.alive !== false)
        .map(player => ({
            playerId: player.id,
            positionIndex: player.id,
            startTileId: board.startTileIds[player.id % board.startTileIds.length]
        }))
        .filter(position => board.tiles[position.startTileId]);

    if (participants.length < 2) return emptyReport('not-enough-starts');

    const distanceMaps = new Map();
    for (const position of participants) {
        distanceMaps.set(position.playerId, computeDistances(board, position.startTileId));
    }

    const voronoiShares = computeVoronoiShares(board, participants, distanceMaps);
    const maxGraphDistance = estimateMaxGraphDistance(distanceMaps);

    const positions = participants.map(position => {
        const ownedTileIds = board.tiles
            .filter(tile => tile.ownerId === position.playerId)
            .map(tile => tile.id);
        const currentColorId = ownedTileIds.length > 0 ? board.tiles[ownedTileIds[0]].colorId : null;
        const legalColorIds = getLegalColorIds(state, position.playerId, currentColorId, ownedTileIds);
        const opening = computeOpeningMetric(state, position.playerId, ownedTileIds, legalColorIds, opts.openingTopWeights);
        const local = computeLocalColorMetric(state, ownedTileIds, legalColorIds, opts.localRadius);
        const mobility = computeMobilityMetric(state, position.playerId, ownedTileIds, legalColorIds);
        const centrality = computeCentralityMetric(distanceMaps.get(position.playerId), board.tiles.length, maxGraphDistance);
        const voronoi = voronoiShares.get(position.playerId) || 0;

        const advantageScore =
            opts.weights.opening * opening.score +
            opts.weights.voronoi * voronoi +
            opts.weights.local * local.score +
            opts.weights.mobility * mobility.score +
            opts.weights.centrality * centrality.score;

        return {
            playerId: position.playerId,
            positionIndex: position.positionIndex,
            startTileId: position.startTileId,
            currentColorId,
            ownedTileCount: ownedTileIds.length,
            legalColorIds,
            openingPotential: opening.score,
            openingCaptures: opening.captures,
            voronoiShare: voronoi,
            localColorPotential: local.score,
            localColorCounts: local.colorCounts,
            mobility: mobility.score,
            legalMoveCount: legalColorIds.length,
            frontierEdgeCount: mobility.frontierEdgeCount,
            centrality: centrality.score,
            reachableTileCount: centrality.reachableTileCount,
            advantageScore
        };
    });

    const componentSpreads = {
        opening: spread(positions.map(p => p.openingPotential)),
        voronoi: spread(positions.map(p => p.voronoiShare)),
        local: spread(positions.map(p => p.localColorPotential)),
        mobility: spread(positions.map(p => p.mobility)),
        centrality: spread(positions.map(p => p.centrality))
    };

    const score =
        opts.weights.opening * componentSpreads.opening +
        opts.weights.voronoi * componentSpreads.voronoi +
        opts.weights.local * componentSpreads.local +
        opts.weights.mobility * componentSpreads.mobility +
        opts.weights.centrality * componentSpreads.centrality;

    let favored = positions[0];
    for (const position of positions) {
        if (position.advantageScore > favored.advantageScore) favored = position;
    }

    return {
        score,
        rating: rateFairness(score),
        playerCount: positions.length,
        tileCount: board.tiles.length,
        favoredPlayerId: favored?.playerId ?? null,
        favoredPositionIndex: favored?.positionIndex ?? null,
        advantageSpread: spread(positions.map(p => p.advantageScore)),
        componentSpreads,
        positions,
        weights: opts.weights
    };
}

export function acceptsFairnessReport(report, config = {}) {
    if (!config.enabled || config.mode === 'off') return true;
    if (!report || typeof report.score !== 'number') return false;

    if (config.mode === 'balanced') {
        return report.score <= (config.threshold ?? 0.10);
    }

    if (config.mode === 'handicap') {
        const min = config.handicapMin ?? 0.10;
        const max = config.handicapMax ?? 0.35;
        return report.score >= min &&
            report.score <= max &&
            report.favoredPlayerId === config.targetPlayerId;
    }

    return true;
}

export function describeFairnessReport(report) {
    if (!report || typeof report.score !== 'number') return 'Fairness: unavailable';
    const parts = [`Fairness ${report.rating}`, `score ${report.score.toFixed(3)}`];
    if (report.favoredPlayerId !== null && report.favoredPlayerId !== undefined) {
        parts.push(`favored P${report.favoredPlayerId + 1}`);
    }
    return parts.join(' · ');
}

function emptyReport(reason) {
    return {
        score: 0,
        rating: 'unavailable',
        reason,
        playerCount: 0,
        tileCount: 0,
        favoredPlayerId: null,
        favoredPositionIndex: null,
        advantageSpread: 0,
        componentSpreads: { opening: 0, voronoi: 0, local: 0, mobility: 0, centrality: 0 },
        positions: [],
        weights: DEFAULT_WEIGHTS
    };
}

function rateFairness(score) {
    if (score <= 0.05) return 'excellent';
    if (score <= 0.10) return 'balanced';
    if (score <= 0.20) return 'playable';
    if (score <= 0.30) return 'biased';
    return 'strongly biased';
}

function computeVoronoiShares(board, participants, distanceMaps) {
    const shares = new Map(participants.map(position => [position.playerId, 0]));
    if (board.tiles.length === 0) return shares;

    for (const tile of board.tiles) {
        let bestDistance = Infinity;
        let nearest = [];

        for (const position of participants) {
            const distance = distanceMaps.get(position.playerId)?.[tile.id];
            if (distance === undefined) continue;

            if (distance < bestDistance) {
                bestDistance = distance;
                nearest = [position.playerId];
            } else if (distance === bestDistance) {
                nearest.push(position.playerId);
            }
        }

        if (nearest.length === 0) continue;
        const credit = 1 / nearest.length;
        for (const playerId of nearest) {
            shares.set(playerId, (shares.get(playerId) || 0) + credit);
        }
    }

    for (const [playerId, value] of shares) {
        shares.set(playerId, value / board.tiles.length);
    }

    return shares;
}

function estimateMaxGraphDistance(distanceMaps) {
    let maxDistance = 1;
    for (const dMap of distanceMaps.values()) {
        for (const distance of Object.values(dMap)) {
            if (distance > maxDistance) maxDistance = distance;
        }
    }
    return maxDistance;
}

function computeOpeningMetric(state, playerId, ownedTileIds, legalColorIds, topWeights) {
    const captures = legalColorIds
        .map(colorId => ({ colorId, captureCount: countCaptureForColor(state, playerId, ownedTileIds, colorId) }))
        .sort((a, b) => b.captureCount - a.captureCount);

    let weightedCaptureCount = 0;
    for (let i = 0; i < topWeights.length && i < captures.length; i++) {
        weightedCaptureCount += captures[i].captureCount * topWeights[i];
    }

    return {
        captures,
        score: normalizeByBoardSize(weightedCaptureCount, state.board.tiles.length)
    };
}

function countCaptureForColor(state, playerId, ownedTileIds, colorId) {
    if (ownedTileIds.length === 0) return 0;

    const board = state.board;
    const visited = new Uint8Array(board.tiles.length);
    const queue = [];
    let head = 0;
    let captured = 0;

    for (const tileId of ownedTileIds) {
        if (tileId < 0 || tileId >= visited.length) continue;
        if (visited[tileId]) continue;
        visited[tileId] = 1;
        queue.push(tileId);
    }

    while (head < queue.length) {
        const tileId = queue[head++];
        const tile = board.tiles[tileId];
        if (!tile) continue;

        for (const neighborId of tile.neighbors) {
            if (neighborId < 0 || neighborId >= visited.length || visited[neighborId]) continue;
            visited[neighborId] = 1;

            const neighbor = board.tiles[neighborId];
            if (!isCapturableBy(state, playerId, neighbor)) continue;
            if (neighbor.colorId !== colorId) continue;

            captured++;
            queue.push(neighborId);
        }
    }

    return captured;
}

function computeLocalColorMetric(state, ownedTileIds, legalColorIds, radius) {
    if (ownedTileIds.length === 0 || legalColorIds.length === 0) {
        return { score: 0, colorCounts: [] };
    }

    const board = state.board;
    const legal = new Set(legalColorIds);
    const colorScores = new Array(state.colorCount).fill(0);
    const visited = new Uint8Array(board.tiles.length);
    const queue = [];
    let head = 0;
    let totalWeighted = 0;

    for (const tileId of ownedTileIds) {
        if (tileId < 0 || tileId >= visited.length || visited[tileId]) continue;
        visited[tileId] = 1;
        queue.push([tileId, 0]);
    }

    while (head < queue.length) {
        const [tileId, distance] = queue[head++];
        if (distance >= radius) continue;

        const tile = board.tiles[tileId];
        if (!tile) continue;

        for (const neighborId of tile.neighbors) {
            if (neighborId < 0 || neighborId >= visited.length || visited[neighborId]) continue;
            visited[neighborId] = 1;

            const neighbor = board.tiles[neighborId];
            const nextDistance = distance + 1;
            const weight = 1 / nextDistance;

            if (neighbor.ownerId === null && legal.has(neighbor.colorId)) {
                colorScores[neighbor.colorId] += weight;
                totalWeighted += weight;
            }

            if (nextDistance < radius) queue.push([neighborId, nextDistance]);
        }
    }

    const sorted = colorScores
        .map((score, colorId) => ({ colorId, score }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score);

    const topScore = sorted.length > 0 ? sorted[0].score + (sorted[1]?.score || 0) * 0.5 : 0;
    const normalized = totalWeighted > 0 ? Math.min(1, topScore / totalWeighted) : 0;

    return { score: normalized, colorCounts: sorted };
}

function computeMobilityMetric(state, playerId, ownedTileIds, legalColorIds) {
    if (ownedTileIds.length === 0) return { score: 0, frontierEdgeCount: 0 };

    const board = state.board;
    const owned = new Set(ownedTileIds);
    let frontierEdgeCount = 0;
    let possibleFrontierEdgeCount = 0;

    for (const tileId of ownedTileIds) {
        const tile = board.tiles[tileId];
        if (!tile) continue;

        possibleFrontierEdgeCount += tile.neighbors.length;
        for (const neighborId of tile.neighbors) {
            if (owned.has(neighborId)) continue;
            const neighbor = board.tiles[neighborId];
            if (isCapturableBy(state, playerId, neighbor)) frontierEdgeCount++;
        }
    }

    const legalScore = state.colorCount > 0 ? legalColorIds.length / state.colorCount : 0;
    const frontierScore = possibleFrontierEdgeCount > 0 ? frontierEdgeCount / possibleFrontierEdgeCount : 0;

    return {
        score: 0.6 * legalScore + 0.4 * frontierScore,
        frontierEdgeCount
    };
}

function computeCentralityMetric(distanceMap, tileCount, maxGraphDistance) {
    if (!distanceMap || tileCount <= 0) return { score: 0, reachableTileCount: 0 };

    let totalDistance = 0;
    let reachableTileCount = 0;
    for (const distance of Object.values(distanceMap)) {
        totalDistance += distance;
        reachableTileCount++;
    }

    if (reachableTileCount === 0) return { score: 0, reachableTileCount: 0 };

    const unreachableCount = Math.max(0, tileCount - reachableTileCount);
    totalDistance += unreachableCount * (maxGraphDistance + 1);

    const averageDistance = totalDistance / tileCount;
    const score = 1 - Math.min(1, averageDistance / Math.max(1, maxGraphDistance + 1));

    return { score, reachableTileCount };
}

function getLegalColorIds(state, playerId, currentColorId, ownedTileIds) {
    const legalColors = [];
    for (let colorId = 0; colorId < state.colorCount; colorId++) {
        if (isColorLegalForPlayer(state, playerId, colorId, currentColorId, ownedTileIds)) {
            legalColors.push(colorId);
        }
    }
    return legalColors;
}

function isColorLegalForPlayer(state, playerId, colorId, currentColorId, ownedTileIds) {
    const rules = state.rules || {};

    if (rules.colorRestrictions === 'notOwnColor' || !rules.colorRestrictions) {
        return colorId !== currentColorId;
    }

    if (rules.colorRestrictions === 'notAnyPlayerColor') {
        for (const tile of state.board.tiles) {
            if (tile.ownerId !== null && tile.colorId === colorId) return false;
        }
        return true;
    }

    if (rules.colorRestrictions === 'notAdjacentEnemyColor') {
        if (colorId === currentColorId) return false;
        const owned = new Set(ownedTileIds);

        for (const tileId of ownedTileIds) {
            const tile = state.board.tiles[tileId];
            if (!tile) continue;

            for (const neighborId of tile.neighbors) {
                if (owned.has(neighborId)) continue;
                const neighbor = state.board.tiles[neighborId];
                if (neighbor?.ownerId !== null && neighbor?.ownerId !== playerId && neighbor?.colorId === colorId) {
                    return false;
                }
            }
        }
        return true;
    }

    return colorId !== currentColorId;
}

function isCapturableBy(state, playerId, tile) {
    if (!tile) return false;
    if (tile.ownerId === null) return true;

    const rules = state.rules || {};
    if (rules.captureMode !== 'freeForAll') return false;
    if (tile.ownerId === playerId) return false;

    const player = state.players[playerId];
    const tileOwner = state.players[tile.ownerId];
    if (player && tileOwner && player.teamId === tileOwner.teamId) return false;

    return true;
}

function normalizeByBoardSize(value, tileCount) {
    if (tileCount <= 0) return 0;
    return Math.min(1, Math.max(0, value / tileCount));
}

function spread(values) {
    if (!values.length) return 0;
    let min = Infinity;
    let max = -Infinity;
    for (const value of values) {
        if (value < min) min = value;
        if (value > max) max = value;
    }
    return max - min;
}

function computeDistances(board, startId) {
    const distances = {};
    if (!board.tiles[startId]) return distances;

    const queue = [startId];
    let head = 0;
    distances[startId] = 0;

    while (head < queue.length) {
        const id = queue[head++];
        const tile = board.tiles[id];
        if (!tile) continue;

        for (const neighborId of tile.neighbors) {
            if (distances[neighborId] !== undefined) continue;
            distances[neighborId] = distances[id] + 1;
            queue.push(neighborId);
        }
    }

    return distances;
}
