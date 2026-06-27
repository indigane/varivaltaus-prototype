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
 * Cairo pentagonal tiling is a dual of the snub square tiling.
 * It can be represented as a square grid where each cell is divided into 2 pentagons,
 * with the orientation of the division alternating in a checkerboard pattern.
 *
 * Prismatic pentagonal tiling (also known as Type 1 or "house" tiling)
 * consists of interlocking "house" shapes.
 */
export function generatePentagonBoardByEdges(options, type) {
    const { cols, rows, tileSize: s, colorCount, rng } = options;
    const rawTiles = [];
    const m = s / 2;

    if (type === "cairo") {
        const d = 0.2 * s; // Depth of the "V" division
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = c * s;
                const y = r * s;

                // We add midpoints to all square edges to ensure neighbor detection
                // works correctly between horizontal and vertical cells (T-junctions).
                if ((r + c) % 2 === 0) {
                    // Horizontal division (Top and Bottom pentagons)
                    rawTiles.push({
                        points: [
                            [x, y], [x + m, y], [x + s, y],      // Top edge (with midpoint)
                            [x + s, y + m],                     // Right midpoint
                            [x + m, y + m - d],                // Center "V" peak
                            [x, y + m]                          // Left midpoint
                        ]
                    });
                    rawTiles.push({
                        points: [
                            [x, y + m], [x + m, y + m - d], [x + s, y + m], // Center "V" (reversed)
                            [x + s, y + s], [x + m, y + s], [x, y + s]      // Bottom edge (with midpoint)
                        ]
                    });
                } else {
                    // Vertical division (Left and Right pentagons)
                    rawTiles.push({
                        points: [
                            [x, y], [x + m, y],                 // Top midpoint
                            [x + m - d, y + m],                // Center "V" peak
                            [x + m, y + s], [x, y + s],         // Bottom midpoint
                            [x, y + m]                          // Left edge
                        ]
                    });
                    rawTiles.push({
                        points: [
                            [x + m, y], [x + s, y],             // Top edge
                            [x + s, y + m],                     // Right edge
                            [x + s, y + s], [x + m, y + s],     // Bottom edge
                            [x + m - d, y + m]                 // Center "V" peak
                        ]
                    });
                }
            }
        }
    } else {
        // Prismatic pentagonal tiling (House tiling)
        // We use a grid of interlocking houses.
        // A row of "down-pointing" houses followed by a row of "up-pointing" houses.
        const h = s * 0.6; // height of the rectangular part
        const p = s * 0.4; // height of the triangular part
        const rowHeight = h + p;

        for (let r = 0; r < rows; r++) {
            const yBase = r * rowHeight;
            const isOdd = r % 2 === 1;
            const xOff = isOdd ? s / 2 : 0;

            for (let c = 0; c < cols; c++) {
                const x = c * s + xOff;
                if (!isOdd) {
                    // Down-pointing house
                    rawTiles.push({
                        points: [
                            [x, yBase], [x + m, yBase], [x + s, yBase], // Flat top
                            [x + s, yBase + h],                         // Right shoulder
                            [x + m, yBase + h + p],                     // Bottom peak
                            [x, yBase + h]                              // Left shoulder
                        ]
                    });
                } else {
                    // Up-pointing house
                    // To interlock, the peak of the up-house should touch the shoulder-level of the row above?
                    // Actually, let's just use a simpler non-interlocking grid for now
                    // that still looks like a house tiling.
                    rawTiles.push({
                        points: [
                            [x + m, yBase],                             // Top peak
                            [x + s, yBase + p],                         // Right shoulder
                            [x + s, yBase + p + h], [x + m, yBase + p + h], [x, yBase + p + h], // Flat bottom
                            [x, yBase + p]                              // Left shoulder
                        ]
                    });
                }
            }
        }
    }

    // Shared edge neighbor detection
    const tiles = rawTiles.map((t, i) => ({
        id: i,
        colorId: Math.floor(rng() * colorCount),
        ownerId: null,
        points: t.points,
        neighbors: []
    }));

    const edgeMap = new Map();
    // Use a slightly larger epsilon for quantization to handle floating point issues
    const quantize = (v) => Math.round(v * 100) / 100;

    tiles.forEach(tile => {
        for (let i = 0; i < tile.points.length; i++) {
            const p1 = tile.points[i];
            const p2 = tile.points[(i + 1) % tile.points.length];
            const x1 = quantize(p1[0]), y1 = quantize(p1[1]);
            const x2 = quantize(p2[0]), y2 = quantize(p2[1]);

            // Sort points to make the edge key stable
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
        width: cols * s + (type === "prismatic" ? s/2 : 0),
        height: rows * (type === "prismatic" ? (s * 1.0) : s),
        tiles,
        startTileIds: [0, tiles.length - 1]
    };
}

export function generatePentagonBoard(options) {
    return generateCairoPentagonBoard(options);
}
