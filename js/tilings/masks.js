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

export function ellipticalMask(centerX, centerY, rx, ry, rotation = 0) {
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    return (x, y) => {
        const dx = x - centerX;
        const dy = y - centerY;
        const rdx = dx * cos - dy * sin;
        const rdy = dx * sin + dy * cos;
        return (rdx * rdx) / (rx * rx) + (rdy * rdy) / (ry * ry) <= 1;
    };
}

export function gemstoneMask(centerX, centerY, radius, rotation = 0) {
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    return (x, y) => {
        const dx = x - centerX;
        const dy = y - centerY;
        const rdx = dx * cos - dy * sin;
        const rdy = dx * sin + dy * cos;

        const nx = rdx / radius;
        const ny = rdy / radius;

        // Pentagon from image: 3 right angles, 2 135-deg angles.
        // Standing on the clipped "pointy" edge.
        // Peak at (0, 1). Bottom flat edge at y = -0.4.
        return ny >= -0.4 &&
               ny - nx <= 1.0 &&
               ny + nx <= 1.0 &&
               ny - nx >= -0.8 &&
               ny + nx >= -0.8;
    };
}

export function donutMask(centerX, centerY, innerRadius, outerRadius) {
    const i2 = innerRadius * innerRadius;
    const o2 = outerRadius * outerRadius;
    return (x, y) => {
        const dx = x - centerX;
        const dy = y - centerY;
        const d2 = dx * dx + dy * dy;
        return d2 >= i2 && d2 <= o2;
    };
}

export function hourglassMask(centerX, centerY, radius, rotation = 0) {
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const waist = radius * 0.25;
    return (x, y) => {
        const dx = x - centerX;
        const dy = y - centerY;
        const rdx = dx * cos - dy * sin;
        const rdy = dx * sin + dy * cos;
        return Math.abs(rdx) <= Math.abs(rdy) * 0.75 + waist && Math.abs(rdy) <= radius;
    };
}

export function plusMask(centerX, centerY, radius, thickness, rotation = 0) {
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const halfThick = thickness / 2;
    return (x, y) => {
        const dx = x - centerX;
        const dy = y - centerY;
        const rdx = dx * cos - dy * sin;
        const rdy = dx * sin + dy * cos;
        return (Math.abs(rdx) <= radius && Math.abs(rdy) <= halfThick) ||
               (Math.abs(rdy) <= radius && Math.abs(rdx) <= halfThick);
    };
}
