import { getVertexId, distanceSq } from "../core/utils.js";

/**
 * Snub Square Tiling (3.3.4.3.4)
 */
export function generateSnubSquareBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;
  const D = a * Math.sqrt(2 + Math.sqrt(3));
  const alpha = 15 * Math.PI / 180;

  const tiles = [];
  const addedShapes = new Set();
  const vertexMap = new Map();
  const squareCentroids = [];
  let idCounter = 0;

  const Rsq = a / Math.sqrt(2);

  // Generate Squares in a grid
  for (let r = -2; r <= rows + 1; r++) {
    for (let q = -2; q <= cols + 1; q++) {
      const centers = [
        { x: D * q, y: D * r },
        { x: D * (q + 0.5), y: D * (r + 0.5) }
      ];

      for (const center of centers) {
        const points = [];
        const vIds = [];
        for (let i = 0; i < 4; i++) {
          const vAngle = alpha + Math.PI / 4 + i * Math.PI / 2;
          const p = [center.x + Rsq * Math.cos(vAngle), center.y + Rsq * Math.sin(vAngle)];
          points.push(p);
          vIds.push(getVertexId(p, vertexMap));
        }

        const shapeKey = "s" + [...vIds].sort((a, b) => a - b).join(',');
        if (!addedShapes.has(shapeKey)) {
          addedShapes.add(shapeKey);
          tiles.push({
            id: idCounter++,
            colorId: Math.floor(rng() * colorCount),
            points,
            vIds,
            neighbors: []
          });
          squareCentroids.push(center);
        }
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

  const isPointInSquare = (px, py, cx, cy) => {
    const dx = px - cx, dy = py - cy;
    const lx = dx * Math.cos(-alpha) - dy * Math.sin(-alpha);
    const ly = dx * Math.sin(-alpha) + dy * Math.cos(-alpha);
    const half = a / 2 - 0.01 * a;
    return Math.abs(lx) < half && Math.abs(ly) < half;
  };

  const targetSq = a * a;
  const tolerance = 0.05 * targetSq;

  // Find Triangles
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
                    const tx = (v1.p[0] + v2.p[0] + v3.p[0]) / 3;
                    const ty = (v1.p[1] + v2.p[1] + v3.p[1]) / 3;

                    let overlapping = false;
                    for (const sc of squareCentroids) {
                      if (isPointInSquare(tx, ty, sc.x, sc.y)) {
                        overlapping = true; break;
                      }
                    }
                    if (overlapping) continue;

                    const vIds = [v1.id, v2.id, v3.id].sort((a, b) => a - b);
                    const shapeKey = "t" + vIds.join(',');
                    if (!addedShapes.has(shapeKey)) {
                      addedShapes.add(shapeKey);
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

  const filteredTiles = tiles.filter(t => {
    const cx = t.points.reduce((s, p) => s + p[0], 0) / t.points.length;
    const cy = t.points.reduce((s, p) => s + p[1], 0) / t.points.length;
    return cx >= -a/2 && cx <= (cols - 0.5) * D && cy >= -a/2 && cy <= (rows - 0.5) * D;
  });
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
    version: 1, generator: "snub-square", width: w, height: h,
    tiles: filteredTiles,
    startTileIds: [findClosest(0, 0), findClosest(w, 0), findClosest(0, h), findClosest(w, h)]
  };
}
