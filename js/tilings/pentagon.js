/**
 * Cairo Pentagon Tiling
 *
 * This implementation uses the 2-pentagons-per-square construction.
 * Each square in a grid is either "Vertical" or "Horizontal" in a checkerboard pattern.
 * Each square is divided into 2 pentagons by its internal segment and connections to grid corners.
 */

export function generateCairoPentagonBoard({ colorCount, rng, cols, rows, tileSize }) {
    const tiles = [];
    const size = tileSize;
    const hSize = size / 2;
    const offset = size * 0.2; // Adjust for aesthetic "basketweave" look

    // Helper to get internal points for any square
    const getP1 = (gx, gy) => {
        const x = gx * size;
        const y = gy * size;
        if ((gx + gy) % 2 === 0) return [x + hSize, y + offset]; // V-top
        return [x + offset, y + hSize]; // H-left
    };
    const getP2 = (gx, gy) => {
        const x = gx * size;
        const y = gy * size;
        if ((gx + gy) % 2 === 0) return [x + hSize, y + size - offset]; // V-bottom
        return [x + size - offset, y + hSize]; // H-right
    };
    const getCorner = (gx, gy) => [gx * size, gy * size];

    const addTile = (points, gx, gy, subId) => {
        const id = (gy * cols + gx) * 2 + subId;
        const colorId = Math.floor(rng() * colorCount);

        tiles.push({
            id,
            colorId,
            ownerId: null,
            neighbors: [],
            points: points.map(p => [p[0], p[1]]),
            gx, gy, subId
        });
    };

    // 1. Generate all tiles
    for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
            const isV = (gx + gy) % 2 === 0;
            const p1 = getP1(gx, gy);
            const p2 = getP2(gx, gy);

            if (isV) {
                // Left Pentagon
                addTile([
                    p1,
                    getCorner(gx, gy),
                    getP2(gx - 1, gy), // Shares with H-square Left
                    getCorner(gx, gy + 1),
                    p2
                ], gx, gy, 0);
                // Right Pentagon
                addTile([
                    p1,
                    getCorner(gx + 1, gy),
                    getP1(gx + 1, gy), // Shares with H-square Right
                    getCorner(gx + 1, gy + 1),
                    p2
                ], gx, gy, 1);
            } else {
                // Top Pentagon
                addTile([
                    p1,
                    getCorner(gx, gy),
                    getP2(gx, gy - 1), // Shares with V-square Above
                    getCorner(gx + 1, gy),
                    p2
                ], gx, gy, 0);
                // Bottom Pentagon
                addTile([
                    p1,
                    getCorner(gx, gy + 1),
                    getP1(gx, gy + 1), // Shares with V-square Below
                    getCorner(gx + 1, gy + 1),
                    p2
                ], gx, gy, 1);
            }
        }
    }

    // 2. Establish neighbors
    const tileMap = new Map();
    tiles.forEach(t => tileMap.set(`${t.gx},${t.gy},${t.subId}`, t));

    tiles.forEach(t => {
        const { gx, gy, subId } = t;
        const isV = (gx + gy) % 2 === 0;
        let potential = [];

        if (isV) {
            if (subId === 0) { // Left
                potential = [
                    [gx, gy, 1], // Same square Right
                    [gx - 1, gy, 0], // H-square Left, Top
                    [gx - 1, gy, 1], // H-square Left, Bottom
                    [gx, gy - 1, 1], // H-square Above, Bottom
                    [gx, gy + 1, 0]  // H-square Below, Top
                ];
            } else { // Right
                potential = [
                    [gx, gy, 0], // Same square Left
                    [gx + 1, gy, 0], // H-square Right, Top
                    [gx + 1, gy, 1], // H-square Right, Bottom
                    [gx, gy - 1, 1], // H-square Above, Bottom
                    [gx, gy + 1, 0]  // H-square Below, Top
                ];
            }
        } else {
            if (subId === 0) { // Top
                potential = [
                    [gx, gy, 1], // Same square Bottom
                    [gx, gy - 1, 0], // V-square Above, Left
                    [gx, gy - 1, 1], // V-square Above, Right
                    [gx - 1, gy, 1], // V-square Left, Right
                    [gx + 1, gy, 0]  // V-square Right, Left
                ];
            } else { // Bottom
                potential = [
                    [gx, gy, 0], // Same square Top
                    [gx, gy + 1, 0], // V-square Below, Left
                    [gx, gy + 1, 1], // V-square Below, Right
                    [gx - 1, gy, 1], // V-square Left, Right
                    [gx + 1, gy, 0]  // V-square Right, Left
                ];
            }
        }

        potential.forEach(([nx, ny, ns]) => {
            const neighbor = tileMap.get(`${nx},${ny},${ns}`);
            if (neighbor) {
                t.neighbors.push(neighbor.id);
            }
        });
    });

    // 3. Determine actual bounds and apply offset to fix cropping
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const t of tiles) {
        for (const p of t.points) {
            minX = Math.min(minX, p[0]);
            minY = Math.min(minY, p[1]);
            maxX = Math.max(maxX, p[0]);
            maxY = Math.max(maxY, p[1]);
        }
    }

    tiles.forEach(t => {
        t.points = t.points.map(p => [p[0] - minX, p[1] - minY]);
    });

    return {
        tiles,
        width: maxX - minX,
        height: maxY - minY
    };
}
