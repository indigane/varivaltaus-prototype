import { validateBoard } from "../core/utils.js";

/**
 * Truncated Trihexagonal Tiling (4.6.12)
 */
export function generateTruncatedTrihexagonalBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;
  const dist = a * (3 + Math.sqrt(3));

  const tiles = [];
  const tileMap = new Map();
  let idCounter = 0;

  const getDodecaCenter = (q, r) => [dist * (q + r / 2), dist * (Math.sqrt(3) / 2) * r];

  const getTile = (cx, cy, sides, angle, radius, prefix) => {
    const key = `${prefix}_${Math.round(cx * 100)},${Math.round(cy * 100)}`;
    if (tileMap.has(key)) return tileMap.get(key);
    const id = idCounter++;
    const points = [];
    for (let i = 0; i < sides; i++) {
      const vAngle = (angle + (i * 360 / sides)) * Math.PI / 180;
      points.push([cx + radius * Math.cos(vAngle), cy + radius * Math.sin(vAngle)]);
    }
    const tile = { id, type: prefix, colorId: Math.floor(rng() * colorCount), points, neighbors: [] };
    tiles.push(tile);
    tileMap.set(key, id);
    return id;
  };

  const R12 = a / (2 * Math.sin(Math.PI / 12));
  const R6 = a;
  const R4 = a / Math.sqrt(2);
  const distS = a * (3 + Math.sqrt(3)) / 2;
  const distH = a * (1 + Math.sqrt(3));
  const dodecaIds = [];

  for (let r = -1; r <= rows; r++) {
    const r_offset = Math.floor(r / 2);
    for (let q = -r_offset - 1; q < cols - r_offset + 1; q++) {
      const [cx, cy] = getDodecaCenter(q, r);
      const dId = getTile(cx, cy, 12, 15, R12, "d");
      if (q >= -r_offset && q < cols - r_offset && r >= 0 && r < rows) dodecaIds.push(dId);
      for (let i = 0; i < 6; i++) {
        getTile(cx + distS * Math.cos(i * 60 * Math.PI / 180), cy + distS * Math.sin(i * 60 * Math.PI / 180), 4, i * 60 + 45, R4, "s");
        getTile(cx + distH * Math.cos((i * 60 + 30) * Math.PI / 180), cy + distH * Math.sin((i * 60 + 30) * Math.PI / 180), 6, 0, R6, "h");
      }
    }
  }

  const vertexMap = new Map();
  tiles.forEach(tile => tile.points.forEach(p => {
    const key = `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
    if (!vertexMap.has(key)) vertexMap.set(key, []);
    vertexMap.get(key).push(tile.id);
  }));

  vertexMap.forEach(ids => {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const id1 = ids[i], id2 = ids[j];
        const shared = tiles[id1].points.filter(p1 => {
           const k1 = `${Math.round(p1[0] * 100)},${Math.round(p1[1] * 100)}`;
           return tiles[id2].points.some(p2 => `${Math.round(p2[0] * 100)},${Math.round(p2[1] * 100)}` === k1);
        }).length;
        if (shared >= 2) {
          if (!tiles[id1].neighbors.includes(id2)) tiles[id1].neighbors.push(id2);
          if (!tiles[id2].neighbors.includes(id1)) tiles[id2].neighbors.push(id1);
        }
      }
    }
  });

  const minCx = 0, maxCx = dist * (cols - 1);
  const minCy = 0, maxCy = dist * (Math.sqrt(3) / 2) * (rows - 1);
  const buffer = a * 1.5;
  const filteredTiles = tiles.filter(tile => {
     const cx = tile.points.reduce((s, p) => s + p[0], 0) / tile.points.length;
     const cy = tile.points.reduce((s, p) => s + p[1], 0) / tile.points.length;
     return cx >= minCx - buffer && cx <= maxCx + buffer && cy >= minCy - buffer && cy <= maxCy + buffer;
  });

  const idMap = new Map();
  filteredTiles.forEach((t, i) => idMap.set(t.id, i));
  filteredTiles.forEach(t => {
    t.id = idMap.get(t.id);
    t.neighbors = t.neighbors.filter(n => idMap.has(n)).map(n => idMap.get(n));
  });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  filteredTiles.forEach(t => t.points.forEach(p => {
    minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
    maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
  }));
  filteredTiles.forEach(t => t.points.forEach(p => { p[0] -= minX; p[1] -= minY; }));

  const startTileIds = [dodecaIds[0], dodecaIds[cols - 1], dodecaIds[(rows - 1) * cols], dodecaIds[dodecaIds.length - 1]].filter(id => id !== undefined && idMap.has(id)).map(id => idMap.get(id));

  const board = { version: 1, generator: "truncated-trihexagonal", width: maxX - minX, height: maxY - minY, tiles: filteredTiles, startTileIds };
  validateBoard(board);
  return board;
}
