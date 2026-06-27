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
 * We implement it using a square grid where each cell is divided into 2 pentagons,
 * alternating orientation in a checkerboard pattern.
 * Midpoints are added to all edges to ensure perfect tiling and neighbor detection.
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

                if ((r + c) % 2 === 0) {
                    // Horizontal division (Top and Bottom)
                    rawTiles.push({
                        points: [
                            [x, y], [x + m, y], [x + s, y],      // Top edge
                            [x + s, y + m],                     // Right midpoint
                            [x + m, y + m - d],                // Peak
                            [x, y + m]                          // Left midpoint
                        ]
                    });
                    rawTiles.push({
                        points: [
                            [x, y + m], [x + m, y + m - d], [x + s, y + m], // Midline
                            [x + s, y + s], [x + m, y + s], [x, y + s]      // Bottom edge
                        ]
                    });
                } else {
                    // Vertical division (Left and Right)
                    rawTiles.push({
                        points: [
                            [x, y], [x + m, y],                 // Top midpoint
                            [x + m - d, y + m],                // Peak
                            [x + m, y + s], [x, y + s],         // Bottom midpoint
                            [x, y + m], [x, y]                  // Left edge
                        ]
                    });
                    rawTiles.push({
                        points: [
                            [x + m, y], [x + s, y], [x + s, y + m], [x + s, y + s], // Right edge
                            [x + m, y + s],                     // Bottom midpoint
                            [x + m - d, y + m]                 // Peak
                        ]
                    });
                }
            }
        }
    } else {
        // Prismatic (House) tiling: Interlocking
        const h = s * 0.7; // height of the square part
        const p = s * 0.3; // height of the peak

        for (let r = 0; r < rows; r++) {
            const isOdd = r % 2 === 1;
            const yBase = r * h;
            for (let c = 0; c < cols; c++) {
                const x = c * s + (isOdd ? s/2 : 0);

                if (!isOdd) {
                    // Downward house
                    rawTiles.push({
                        points: [
                            [x, yBase], [x + m, yBase], [x + s, yBase], // Top
                            [x + s, yBase + m], [x + s, yBase + h],     // Right
                            [x + m, yBase + h + p],                     // Peak
                            [x, yBase + h], [x, yBase + m]              // Left
                        ]
                    });
                } else {
                    // Upward house
                    rawTiles.push({
                        points: [
                            [x + m, yBase - p],                         // Peak
                            [x + s, yBase], [x + s, yBase + m], [x + s, yBase + h], // Right
                            [x + m, yBase + h], [x, yBase + h],         // Bottom
                            [x, yBase + m], [x, yBase]                  // Left
                        ]
                    });
                }
            }
        }
    }

    // Determine bounds to offset
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

    // Shared edge neighbor detection
    const edgeMap = new Map();
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
        width: maxX - minX,
        height: maxY - minY,
        tiles,
        startTileIds: [0, tiles.length - 1]
    };
}

export function generatePentagonBoard(options) {
    return generateCairoPentagonBoard(options);
}
