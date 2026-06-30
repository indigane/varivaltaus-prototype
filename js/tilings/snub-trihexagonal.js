import { getVertexId, distanceSq } from "../core/utils.js";

/**
 * Snub Trihexagonal Tiling (3.3.3.3.6)
 */
export function generateSnubTrihexagonalBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;
  const D = a * Math.sqrt(7);
  const alpha = Math.atan(Math.sqrt(3) / 5);

  const tiles = [];
  const vertexMap = new Map();
  const addedShapes = new Set();
  let idCounter = 0;

  const getHexCenter = (q, r) => {
    const x = D * (q + r / 2);
    const y = D * (Math.sqrt(3) / 2) * r;
    return [x, y];
  };

  // Generate Hexagons in a wider range
  const q_pad = 2;
  const r_pad = 2;
  for (let r = -r_pad; r < rows + r_pad; r++) {
    const r_offset = Math.floor(r / 2);
    for (let q = -r_offset - q_pad; q < cols - r_offset + q_pad; q++) {
      const [cx, cy] = getHexCenter(q, r);
      const points = [];
      const vIds = [];
      for (let i = 0; i < 6; i++) {
        const angle = alpha + (i * 60) * Math.PI / 180;
        const p = [cx + a * Math.cos(angle), cy + a * Math.sin(angle)];
        points.push(p);
        vIds.push(getVertexId(p, vertexMap));
      }

      const vIdsSorted = [...vIds].sort((a, b) => a - b);
      const key = "h" + vIdsSorted.join(',');
      if (!addedShapes.has(key)) {
        addedShapes.add(key);
        tiles.push({
          id: idCounter++,
          colorId: Math.floor(rng() * colorCount),
          points,
          vIds,
          neighbors: []
        });
      }
    }
  }

  const allVertices = Array.from(vertexMap.entries()).map(([key, id]) => {
    const [x, y] = key.split(',').map(Number);
    return { p: [x, y], id };
  });

  const grid = new Map();
  const cellSize = a * 1.5;
  allVertices.forEach(v => {
    const key = `${Math.floor(v.p[0] / cellSize)},${Math.floor(v.p[1] / cellSize)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(v);
  });

  const targetSq = a * a;
  const tolerance = 0.05 * targetSq;

  // Find Triangles between hexagon vertices
  for (let i = 0; i < allVertices.length; i++) {
    const v1 = allVertices[i];
    const gx = Math.floor(v1.p[0] / cellSize);
    const gy = Math.floor(v1.p[1] / cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell2 = grid.get(`${gx + dx},${gy + dy}`);
        if (!cell2) continue;
        for (const v2 of cell2) {
          if (v2.id <= v1.id) continue;
          if (Math.abs(distanceSq(v1.p, v2.p) - targetSq) < tolerance) {
            for (let dx2 = -1; dx2 <= 1; dx2++) {
              for (let dy2 = -1; dy2 <= 1; dy2++) {
                const cell3 = grid.get(`${gx + dx2},${gy + dy2}`);
                if (!cell3) continue;
                for (const v3 of cell3) {
                  if (v3.id <= v2.id) continue;
                  if (Math.abs(distanceSq(v1.p, v3.p) - targetSq) < tolerance && Math.abs(distanceSq(v2.p, v3.p) - targetSq) < tolerance) {
                    const vIds = [v1.id, v2.id, v3.id].sort((a, b) => a - b);
                    const key = "t" + vIds.join(',');
                    if (!addedShapes.has(key)) {
                      addedShapes.add(key);
                      tiles.push({
                        id: idCounter++,
                        colorId: Math.floor(rng() * colorCount),
                        points: [v1.p, v2.p, v3.p],
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

  // Filter tiles to requested area
  const filteredTiles = tiles.filter(t => {
    const cx = t.points.reduce((s, p) => s + p[0], 0) / t.points.length;
    const cy = t.points.reduce((s, p) => s + p[1], 0) / t.points.length;
    return cx >= -a && cx <= (cols - 0.5) * D && cy >= -a && cy <= (rows - 0.5) * D * Math.sqrt(3)/2;
  });

  // Re-index and build connectivity
  filteredTiles.forEach((t, idx) => t.id = idx);
  const vertexToTiles = [];
  filteredTiles.forEach(tile => {
    tile.vIds.forEach(vId => {
      if (!vertexToTiles[vId]) vertexToTiles[vId] = [];
      vertexToTiles[vId].push(tile.id);
    });
  });

  filteredTiles.forEach(tile => {
    const counts = new Map();
    tile.vIds.forEach(vId => {
      vertexToTiles[vId].forEach(otherId => {
        if (otherId === tile.id) return;
        counts.set(otherId, (counts.get(otherId) || 0) + 1);
      });
    });
    counts.forEach((count, otherId) => {
      if (count >= 2) tile.neighbors.push(otherId);
    });
  });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  filteredTiles.forEach(t => t.points.forEach(p => {
    minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
    maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
  }));
  filteredTiles.forEach(t => t.points.forEach(p => { p[0] -= minX; p[1] -= minY; }));

  const w = maxX - minX, h = maxY - minY;
  const findClosest = (tx, ty) => {
    let bestId = 0, minDist = Infinity;
    filteredTiles.forEach(t => {
      const cx = t.points.reduce((s, p) => s + p[0], 0) / t.points.length;
      const cy = t.points.reduce((s, p) => s + p[1], 0) / t.points.length;
      const d = Math.pow(cx - tx, 2) + Math.pow(cy - ty, 2);
      if (d < minDist) { minDist = d; bestId = t.id; }
    });
    return bestId;
  };

  return {
    version: 1, generator: "snub-trihexagonal", width: w, height: h,
    tiles: filteredTiles,
    startTileIds: [findClosest(0, 0), findClosest(w, 0), findClosest(0, h), findClosest(w, h)]
  };
}
