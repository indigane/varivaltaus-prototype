/**
 * Provides functions to mask boards by removing tiles.
 */

export function applyMask(board, maskFn) {
    const tilesToKeep = board.tiles.filter(tile => {
        // Calculate center of tile
        let cx = 0, cy = 0;
        for (const [x, y] of tile.points) {
            cx += x;
            cy += y;
        }
        cx /= tile.points.length;
        cy /= tile.points.length;

        return maskFn(cx, cy, tile);
    });

    const newTiles = tilesToKeep.map((tile, index) => ({
        ...tile,
        originalId: tile.id,
        newId: index
    }));

    const oldIdToNewId = new Map();
    newTiles.forEach(t => oldIdToNewId.set(t.originalId, t.newId));

    const finalTiles = newTiles.map(tile => ({
        id: tile.newId,
        colorId: tile.colorId,
        ownerId: tile.ownerId,
        points: tile.points,
        neighbors: tile.neighbors
            .map(oldId => oldIdToNewId.get(oldId))
            .filter(newId => newId !== undefined)
    }));

    // Update startTileIds
    const newStartTileIds = board.startTileIds
        .map(oldId => oldIdToNewId.get(oldId))
        .filter(newId => newId !== undefined);

    // If we lost some start tiles, try to find replacements near the original positions
    // (simplified for now: just use whatever we have)
    if (newStartTileIds.length === 0 && finalTiles.length > 0) {
        newStartTileIds.push(0);
    }

    return {
        ...board,
        tiles: finalTiles,
        startTileIds: newStartTileIds
    };
}

export function circularMask(centerX, centerY, radius) {
    return (x, y) => {
        const dx = x - centerX;
        const dy = y - centerY;
        return Math.sqrt(dx * dx + dy * dy) <= radius;
    };
}

export function rectangularMask(x, y, width, height) {
    return (tx, ty) => {
        return tx >= x && tx <= x + width && ty >= y && ty <= y + height;
    };
}

export function randomMask(probability) {
    return () => Math.random() < probability;
}

export function triangularMask(centerX, centerY, radius, rotation = 0) {
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    return (x, y) => {
        const dx = x - centerX;
        const dy = y - centerY;
        const rdx = dx * cos - dy * sin;
        const rdy = dx * sin + dy * cos;
        return rdy <= radius / 2 &&
               rdy + Math.sqrt(3) * rdx >= -radius &&
               rdy - Math.sqrt(3) * rdx >= -radius;
    };
}

export function hexagonalMask(centerX, centerY, radius, rotation = 0) {
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    return (x, y) => {
        const dx = x - centerX;
        const dy = y - centerY;
        const rdx = dx * cos - dy * sin;
        const rdy = dx * sin + dy * cos;
        return Math.abs(rdx) <= radius * Math.sqrt(3) / 2 &&
               Math.abs(rdy) + Math.abs(rdx) / Math.sqrt(3) <= radius;
    };
}
