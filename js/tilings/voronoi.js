/**
 * Generates a Voronoi tiling board as a graph.
 * Supports 'jittered' and 'random' distributions.
 */
export function generateVoronoiBoard(options) {
    const { cols, rows, tileSize, colorCount, rng, type = 'jittered' } = options;
    const width = cols * tileSize;
    const height = rows * tileSize;
    const sites = [];

    if (type === 'jittered') {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Jittered grid: start at center of cell, add random offset
                const x = (c + 0.5 + (rng() - 0.5) * 0.7) * tileSize;
                const y = (r + 0.5 + (rng() - 0.5) * 0.7) * tileSize;
                sites.push({ x, y, id: sites.length });
            }
        }
    } else {
        const count = cols * rows;
        for (let i = 0; i < count; i++) {
            sites.push({
                x: rng() * width,
                y: rng() * height,
                id: i
            });
        }
    }

    const tiles = [];
    const neighborMap = new Map(); // id -> Set of neighbor ids

    for (let i = 0; i < sites.length; i++) {
        let poly = [
            [0, 0],
            [width, 0],
            [width, height],
            [0, height]
        ];

        const myNeighbors = new Set();

        // Sort other sites by distance to site i to clip against closest first
        const others = [];
        for (let j = 0; j < sites.length; j++) {
            if (i === j) continue;
            const distSq = Math.pow(sites[i].x - sites[j].x, 2) + Math.pow(sites[i].y - sites[j].y, 2);
            others.push({ id: j, distSq });
        }
        others.sort((a, b) => a.distSq - b.distSq);

        for (const other of others) {
            const j = other.id;
            const result = clipPolygon(poly, sites[i], sites[j]);
            if (result.clipped) {
                poly = result.poly;
                myNeighbors.add(j);
            }
            if (poly.length === 0) break;
        }

        tiles.push({
            id: i,
            colorId: Math.floor(rng() * colorCount),
            ownerId: null,
            points: poly,
            neighbors: [] // Will fill later for symmetry
        });
        neighborMap.set(i, myNeighbors);
    }

    // Ensure symmetry: if A is a neighbor of B, then B must be a neighbor of A
    for (let i = 0; i < sites.length; i++) {
        const neighborsOfI = neighborMap.get(i);
        for (const j of neighborsOfI) {
            neighborMap.get(j).add(i);
        }
    }

    // Fill neighbor arrays from the symmetrized map
    for (let i = 0; i < tiles.length; i++) {
        tiles[i].neighbors = Array.from(neighborMap.get(i)).sort((a, b) => a - b);
    }

    return {
        version: 1,
        generator: `voronoi-${type}`,
        width,
        height,
        cols,
        rows,
        tiles,
        startTileIds: [0, tiles.length - 1] // Basic default
    };
}

function clipPolygon(poly, site1, site2) {
    const midX = (site1.x + site2.x) / 2;
    const midY = (site1.y + site2.y) / 2;
    const nx = site2.x - site1.x;
    const ny = site2.y - site1.y;

    // We want to keep points P such that (P - M) . N <= 0
    // Using a small epsilon to avoid issues with points exactly on the line
    const isInside = (p) => (p[0] - midX) * nx + (p[1] - midY) * ny <= 1e-9;

    const newPoly = [];
    let clipped = false;

    for (let i = 0; i < poly.length; i++) {
        const p1 = poly[i];
        const p2 = poly[(i + 1) % poly.length];

        const in1 = isInside(p1);
        const in2 = isInside(p2);

        if (!in1) clipped = true;

        if (in1) {
            if (in2) {
                newPoly.push(p2);
            } else {
                newPoly.push(intersect(p1, p2, midX, midY, nx, ny));
            }
        } else if (in2) {
            newPoly.push(intersect(p1, p2, midX, midY, nx, ny));
            newPoly.push(p2);
        }
    }

    // Verify if it was REALLY clipped (sometimes precision makes it look clipped but it's not)
    // We only care if the polygon actually changed.
    // For simplicity, we trust the `clipped` flag if the number of points changed or points moved.

    return { poly: newPoly, clipped: clipped && newPoly.length > 0 };
}

function intersect(p1, p2, midX, midY, nx, ny) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const num = (p1[0] - midX) * nx + (p1[1] - midY) * ny;
    const den = dx * nx + dy * ny;

    // If den is 0, lines are parallel. Should not happen in Voronoi bisector clipping
    // unless sites are identical, which RNG avoids.
    if (Math.abs(den) < 1e-12) return p1;

    const t = -num / den;
    return [p1[0] + t * dx, p1[1] + t * dy];
}
