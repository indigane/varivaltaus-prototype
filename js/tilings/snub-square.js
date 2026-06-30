/**
 * Generates a Snub Square tiling board (3.3.4.3.4).
 * This tiling consists of squares and triangles.
 * Every vertex is shared by two squares and three triangles.
 */
export function generateSnubSquareBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;

  // Correct lattice constant for snub square (3.3.4.3.4) where squares share vertices
  const D = a * Math.sqrt(2 + Math.sqrt(3));
  const alpha = 15 * Math.PI / 180;

  const tiles = [];
  const squareMap = new Map();

  const getSquareCenter = (q, r) => {
    return [D * q, D * r];
  };

  let idCounter = 0;
  const vertexMap = new Map();
  const getVertexId = (p) => {
    const key = `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
    if (vertexMap.has(key)) return vertexMap.get(key).id;
    const id = vertexMap.size;
    vertexMap.set(key, { id, p });
    return id;
  };

  // 1. Generate Squares
  const Rsq = a / Math.sqrt(2);
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      const [cx, cy] = getSquareCenter(q, r);
      const id = idCounter++;

      const points = [];
      const vIds = [];
      for (let i = 0; i < 4; i++) {
        const vAngle = alpha + Math.PI / 4 + i * Math.PI / 2;
        const p = [cx + Rsq * Math.cos(vAngle), cy + Rsq * Math.sin(vAngle)];
        points.push(p);
        vIds.push(getVertexId(p));
      }

      const tile = {
        id,
        colorId: Math.floor(rng() * colorCount),
        ownerId: null,
        points,
        vIds,
        neighbors: []
      };
      tiles.push(tile);
      squareMap.set(`${q},${r}`, id);
    }
  }

  // 2. Generate Triangles by finding equilateral triplets among deduplicated vertices
  const allVertices = Array.from(vertexMap.values()).map(v => v.p);
  const distSq = (p1, p2) => {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return dx * dx + dy * dy;
  };

  const targetSq = a * a;
  const tolerance = 0.1 * targetSq;

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
            // v3 must be in neighborhood of v1
            for (let dx2 = -1; dx2 <= 1; dx2++) {
              for (let dy2 = -1; dy2 <= 1; dy2++) {
                const cell3 = grid.get(`${cx + dx2},${cy + dy2}`);
                if (!cell3) continue;
                for (const k of cell3) {
                  if (k <= j) continue;
                  const v3 = allVertices[k];
                  if (Math.abs(distSq(v1, v3) - targetSq) < tolerance && Math.abs(distSq(v2, v3) - targetSq) < tolerance) {
                    tiles.push({
                      id: idCounter++,
                      colorId: Math.floor(rng() * colorCount),
                      ownerId: null,
                      points: [v1, v2, v3],
                      vIds: [i, j, k],
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

  // 3. Optimized Connectivity using vIds
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

  const startTileIds = [
    squareMap.get(`0,0`),
    squareMap.get(`${cols - 1},0`),
    squareMap.get(`0,${rows - 1}`),
    squareMap.get(`${cols - 1},${rows - 1}`)
  ].filter(id => id !== undefined);

  return {
    version: 1,
    generator: "snub-square",
    width: maxX - minX,
    height: maxY - minY,
    tiles,
    startTileIds
  };
}
