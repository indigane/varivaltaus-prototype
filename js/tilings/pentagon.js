/**
 * Provides various pentagonal tilings.
 */

export function generateCairoPentagonBoard(options) {
    return generatePentagonBoardByEdges(options, "cairo");
}

export function generatePrismaticPentagonBoard(options) {
    return generatePentagonBoardByEdges(options, "prismatic");
}

/**
 * Pentagonal tilings implemented via a grid of split cells.
 */
export function generatePentagonBoardByEdges(options, type) {
    const { cols, rows, tileSize: s, colorCount, rng } = options;
    const rawTiles = [];
    const m = s / 2;

    if (type === "cairo") {
        // Cairo tiling: each square is split into 4 pentagons.
        // We shift the edge midpoints to create the characteristic pattern.
        // To ensure perfect interlocking, the shift must be consistent for shared edges.
        const d = s * 0.15;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = c * s;
                const y = r * s;

                // Shift for horizontal edges (Top/Bottom) depends on the row index
                const shiftT = ((r % 2 === 0) ? d : -d);
                const shiftB = (((r + 1) % 2 === 0) ? d : -d);

                // Shift for vertical edges (Left/Right) depends on the column index
                const shiftL = ((c % 2 === 0) ? d : -d);
                const shiftR = (((c + 1) % 2 === 0) ? d : -d);

                const pTL = [x, y], pTR = [x + s, y], pBL = [x, y + s], pBR = [x + s, y + s];
                const pT = [x + m + shiftT, y];
                const pB = [x + m + shiftB, y + s];
                const pL = [x, y + m + shiftL];
                const pR = [x + s, y + m + shiftR];
                const pC = [x + m, y + m];

                // 4 pentagons per square
                rawTiles.push({ points: [pTL, pT, pC, pL] });
                rawTiles.push({ points: [pTR, pT, pC, pR] });
                rawTiles.push({ points: [pBR, pB, pC, pR] });
                rawTiles.push({ points: [pBL, pB, pC, pL] });
            }
        }
    } else {
        // Prismatic (Type 1): Split hexagonal grid.
        // Guaranteed to be gapless and overlap-free.
        const w = Math.sqrt(3) * s;
        const h = s * 1.5;

        for (let r = -1; r < rows + 1; r++) {
            const offset = (r % 2) * (w / 2);
            for (let c = -1; c < cols + 1; c++) {
                const cx = c * w + offset;
                const cy = r * h;

                const p0 = [cx, cy - s];
                const p1 = [cx + w / 2, cy - s / 2];
                const p2 = [cx + w / 2, cy + s / 2];
                const p3 = [cx, cy + s];
                const p4 = [cx - w / 2, cy + s / 2];
                const p5 = [cx - w / 2, cy - s / 2];
                const center = [cx, cy];

                rawTiles.push({ points: [p0, p1, p2, p3, center] });
                rawTiles.push({ points: [p0, p5, p4, p3, center] });
            }
        }
    }

    // Determine bounds
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (const t of rawTiles) {
        for (const p of t.points) {
            minX = Math.min(minX, p[0]);
            minY = Math.min(minY, p[1]);
            maxX = Math.max(maxX, p[0]);
            maxY = Math.max(maxY, p[1]);
        }
    }

    const tiles = rawTiles.map((t, i) => ({
        id: i,
        colorId: Math.floor(rng() * colorCount),
        ownerId: null,
        points: t.points.map(p => [p[0] - minX, p[1] - minY]),
        neighbors: []
    }));

    // Neighbor detection using edge midpoints
    const edgeMap = new Map();
    const quantize = (v) => Math.round(v * 100) / 100;

    tiles.forEach(tile => {
        for (let i = 0; i < tile.points.length; i++) {
            const p1 = tile.points[i];
            const p2 = tile.points[(i + 1) % tile.points.length];
            const x1 = quantize(p1[0]), y1 = quantize(p1[1]);
            const x2 = quantize(p2[0]), y2 = quantize(p2[1]);

            const key = x1 < x2 || (x1 === x2 && y1 < y2)
                ? `${x1},${y1}_${x2},${y2}`
                : `${x2},${y2}_${x1},${y1}`;

            if (!edgeMap.has(key)) edgeMap.set(key, []);
            edgeMap.get(key).push(tile.id);
        }
    });

    edgeMap.forEach(tileIds => {
        if (tileIds.length >= 2) {
            for (let i = 0; i < tileIds.length; i++) {
                for (let j = i + 1; j < tileIds.length; j++) {
                    const id1 = tileIds[i];
                    const id2 = tileIds[j];
                    if (!tiles[id1].neighbors.includes(id2)) tiles[id1].neighbors.push(id2);
                    if (!tiles[id2].neighbors.includes(id1)) tiles[id2].neighbors.push(id1);
                }
            }
        }
    });

    return {
        version: 1,
        generator: `pentagon-${type}`,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
        tiles,
        startTileIds: [0, tiles.length - 1]
    };
}

export function generatePentagonBoard(options) {
    return generateCairoPentagonBoard(options);
}
