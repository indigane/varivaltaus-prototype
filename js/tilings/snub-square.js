/**
 * Generates a Snub Square tiling board (3.3.4.3.4).
 * This tiling consists of squares and triangles.
 * Every vertex is shared by two squares and three triangles.
 */
export function generateSnubSquareBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;

  // Lattice constant for snub square (3.3.4.3.4)
  const D = a * Math.sqrt(2 + Math.sqrt(3));
  const alpha = 15 * Math.PI / 180;

  let tiles = [];
  const startTileIds = [];

  let idCounter = 0;
  const vertexMap = new Map();
  const vertexEdgeKey = (a, b) => a < b ? `${a},${b}` : `${b},${a}`;
  const getVertexId = (p) => {
    const key = `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
    if (vertexMap.has(key)) return vertexMap.get(key).id;
    const id = vertexMap.size;
    vertexMap.set(key, { id, p });
    return id;
  };

  const Rsq = a / Math.sqrt(2);

  // 1. Generate Squares
  // There are two orientations of squares in the snub square tiling.
  const minBound = -D / 2;
  const maxXBound = (cols - 0.5) * D;
  const maxYBound = (rows - 0.5) * D;

  for (let r = -1; r <= rows; r++) {
    for (let q = -1; q <= cols; q++) {
      // Set 1: At (D*q, D*r) with rotation alpha
      const cx1 = D * q;
      const cy1 = D * r;

      // Set 2: At (D*(q+0.5), D*(r+0.5)) with rotation -alpha (or alpha + 90?)
      // Actually the snub square has all squares same rotation?
      // No, let's check: in s{4,4} squares are rotated by alpha.
      // Wait, the Wikipedia image shows all squares have same orientation relative to the lattice.
      // BUT if I only place them at (D*q, D*r), there are huge gaps.
      // The other set of squares is at (D*(q+0.5), D*(r+0.5))

      const centers = [
        { x: cx1, y: cy1, rot: alpha },
        { x: D * (q + 0.5), y: D * (r + 0.5), rot: -alpha }
      ];

      for (const center of centers) {
        const points = [];
        const vIds = [];
        for (let i = 0; i < 4; i++) {
          const vAngle = center.rot + Math.PI / 4 + i * Math.PI / 2;
          const p = [center.x + Rsq * Math.cos(vAngle), center.y + Rsq * Math.sin(vAngle)];
          points.push(p);
          vIds.push(getVertexId(p));
        }

        // Only add if within roughly [0, cols*D] x [0, rows*D]
        const centroidX = center.x;
        const centroidY = center.y;

        if (centroidX >= minBound && centroidX <= maxXBound && centroidY >= minBound && centroidY <= maxYBound) {
          const id = idCounter++;
          tiles.push({
            id,
            colorId: Math.floor(rng() * colorCount),
            ownerId: null,
            points,
            vIds,
            neighbors: []
          });
          if (q >= 0 && q < cols && r >= 0 && r < rows) {
             // Candidates for start tiles
          }
        }
      }
    }
  }

  const squareEdgeKeys = new Set();
  tiles.forEach(tile => {
    for (let i = 0; i < tile.vIds.length; i++) {
      squareEdgeKeys.add(vertexEdgeKey(tile.vIds[i], tile.vIds[(i + 1) % tile.vIds.length]));
    }
  });

  const squareEdgeCount = (vIds) => [
    vertexEdgeKey(vIds[0], vIds[1]),
    vertexEdgeKey(vIds[1], vIds[2]),
    vertexEdgeKey(vIds[2], vIds[0])
  ].filter(key => squareEdgeKeys.has(key)).length;

  // 2. Generate Triangles by finding equilateral triplets among deduplicated vertices
  const allVertices = Array.from(vertexMap.values()).map(v => v.p);
  const distSq = (p1, p2) => {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return dx * dx + dy * dy;
  };

  const targetSq = a * a;
  const tolerance = 0.001 * targetSq;

  const grid = new Map();
  const getCellKey = (p) => `${Math.floor(p[0] / a)},${Math.floor(p[1] / a)}`;
  allVertices.forEach((v, idx) => {
    const key = getCellKey(v);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(idx);
  });

  for (let i = 0; i < allVertices.length; i++) {
    const v1 = allVertices[i];
    const cx = Math.floor(v1[0] / a);
    const cy = Math.floor(v1[1] / a);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell2 = grid.get(`${cx + dx},${cy + dy}`);
        if (!cell2) continue;
        for (const j of cell2) {
          if (j <= i) continue;
          const v2 = allVertices[j];
          if (Math.abs(distSq(v1, v2) - targetSq) < tolerance) {
            for (let dx2 = -1; dx2 <= 1; dx2++) {
              for (let dy2 = -1; dy2 <= 1; dy2++) {
                const cell3 = grid.get(`${cx + dx2},${cy + dy2}`);
                if (!cell3) continue;
                for (const k of cell3) {
                  if (k <= j) continue;
                  const v3 = allVertices[k];
                  if (Math.abs(distSq(v1, v3) - targetSq) < tolerance && Math.abs(distSq(v2, v3) - targetSq) < tolerance) {
                    const centroidX = (v1[0] + v2[0] + v3[0]) / 3;
                    const centroidY = (v1[1] + v2[1] + v3[1]) / 3;

                    const vIds = [i, j, k];
                    const insideHalo = centroidX >= minBound - a && centroidX <= maxXBound + a && centroidY >= minBound - a && centroidY <= maxYBound + a;

                    if (insideHalo && squareEdgeCount(vIds) >= 1) {
                      tiles.push({
                        id: idCounter++,
                        colorId: Math.floor(rng() * colorCount),
                        ownerId: null,
                        points: [v1, v2, v3],
                        vIds,
                        neighbors: []
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // 3. Optimized Connectivity
  const vertexToTiles = new Map();
  tiles.forEach((tile, idx) => {
    tile.vIds.forEach(vId => {
      if (!vertexToTiles.has(vId)) vertexToTiles.set(vId, []);
      vertexToTiles.get(vId).push(idx);
    });
  });

  tiles.forEach((tile, i) => {
    const neighborCounts = new Map();
    tile.vIds.forEach(vId => {
      vertexToTiles.get(vId).forEach(j => {
        if (i === j) return;
        neighborCounts.set(j, (neighborCounts.get(j) || 0) + 1);
      });
    });
    neighborCounts.forEach((count, j) => {
      if (count >= 2) {
        tile.neighbors.push(tiles[j].id);
      }
    });
  });

  const idMap = new Map();
  const prunedTiles = tiles.filter(tile => !(tile.points.length === 3 && tile.neighbors.length <= 1));
  prunedTiles.forEach((tile, index) => idMap.set(tile.id, index));
  tiles = prunedTiles.map((tile, index) => ({
    ...tile,
    id: index,
    neighbors: tile.neighbors.filter(nId => idMap.has(nId)).map(nId => idMap.get(nId))
  }));

  // 4. Finalize
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

  // Pick start tiles from corners
  const findClosest = (tx, ty) => {
    let bestId = 0;
    let minDist = Infinity;
    tiles.forEach(t => {
      let cx = 0, cy = 0;
      t.points.forEach(p => { cx += p[0]; cy += p[1]; });
      cx /= t.points.length;
      cy /= t.points.length;
      const d = Math.pow(cx - tx, 2) + Math.pow(cy - ty, 2);
      if (d < minDist) {
        minDist = d;
        bestId = t.id;
      }
    });
    return bestId;
  };

  const w = maxX - minX;
  const h = maxY - minY;
  startTileIds.push(findClosest(0, 0));
  startTileIds.push(findClosest(w, 0));
  startTileIds.push(findClosest(0, h));
  startTileIds.push(findClosest(w, h));

  return {
    version: 1,
    generator: "snub-square",
    width: w,
    height: h,
    tiles,
    startTileIds
  };
}
