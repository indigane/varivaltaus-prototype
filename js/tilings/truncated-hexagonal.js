import { validateBoard } from "../core/utils.js";

/**
 * Truncated Hexagonal Tiling (3.12.12)
 */
export function generateTruncatedHexagonalBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;
  const dist = a * (2 + Math.sqrt(3));

  const tiles = [];
  const dodecaMap = new Map();
  const triangleMap = new Map();
  let idCounter = 0;

  const getDodecaCenter = (q, r) => [dist * (q + r / 2), dist * (Math.sqrt(3) / 2) * r];
  const R12 = a / (2 * Math.sin(Math.PI / 12));
  const rT = a / Math.sqrt(3);
  const distT = dist / Math.sqrt(3);

  for (let r = 0; r < rows; r++) {
    const r_offset = Math.floor(r / 2);
    for (let q = -r_offset; q < cols - r_offset; q++) {
      const [cx, cy] = getDodecaCenter(q, r);
      const points = [];
      for (let i = 0; i < 12; i++) {
        const angle = (30 * i + 15) * Math.PI / 180;
        points.push([cx + R12 * Math.cos(angle), cy + R12 * Math.sin(angle)]);
      }
      const tile = {
        id: idCounter++, type: 'dodecagon', q, r,
        colorId: Math.floor(rng() * colorCount), points, neighbors: []
      };
      tiles.push(tile);
      dodecaMap.set(`${q},${r}`, tile.id);
    }
  }

  tiles.filter(t => t.type === 'dodecagon').forEach(dodeca => {
    const [cx, cy] = getDodecaCenter(dodeca.q, dodeca.r);
    // dodeca-dodeca
    [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]].forEach(([dq, dr]) => {
      const nId = dodecaMap.get(`${dodeca.q+dq},${dodeca.r+dr}`);
      if (nId !== undefined && !dodeca.neighbors.includes(nId)) dodeca.neighbors.push(nId);
    });
    // dodeca-triangle
    for (let i = 0; i < 6; i++) {
      const angleT = (60 * i + 30) * Math.PI / 180;
      const tcx = cx + distT * Math.cos(angleT);
      const tcy = cy + distT * Math.sin(angleT);
      const key = `${Math.round(tcx * 100)},${Math.round(tcy * 100)}`;
      let tId;
      if (!triangleMap.has(key)) {
        const triPoints = [];
        for (let j = 0; j < 3; j++) {
          const vAngle = angleT + (j * 120) * Math.PI / 180;
          triPoints.push([tcx + rT * Math.cos(vAngle), tcy + rT * Math.sin(vAngle)]);
        }
        const triTile = {
          id: idCounter++, type: 'triangle', colorId: Math.floor(rng() * colorCount),
          points: triPoints, neighbors: []
        };
        tiles.push(triTile);
        triangleMap.set(key, triTile.id);
        tId = triTile.id;
      } else {
        tId = triangleMap.get(key);
      }
      if (!dodeca.neighbors.includes(tId)) dodeca.neighbors.push(tId);
      if (!tiles[tId].neighbors.includes(dodeca.id)) tiles[tId].neighbors.push(dodeca.id);
    }
  });

  let boardCx = 0, boardCy = 0, dCount = 0;
  tiles.filter(t => t.type === 'dodecagon').forEach(t => {
    const [cx, cy] = getDodecaCenter(t.q, t.r);
    boardCx += cx; boardCy += cy; dCount++;
  });
  boardCx /= dCount; boardCy /= dCount;

  const removedIds = new Set();
  tiles.filter(t => t.type === 'triangle' && t.neighbors.length <= 1).forEach(tri => {
    if (tri.neighbors.length === 0) { removedIds.add(tri.id); return; }
    const dodeca = tiles[tri.neighbors[0]];
    const [dcx, dcy] = getDodecaCenter(dodeca.q, dodeca.r);
    const tcx = tri.points.reduce((s, p) => s + p[0], 0) / 3;
    const tcy = tri.points.reduce((s, p) => s + p[1], 0) / 3;
    if ((tcx - dcx) * (tcx - boardCx) + (tcy - dcy) * (tcy - boardCy) > 0) removedIds.add(tri.id);
  });

  const filteredTiles = tiles.filter(t => !removedIds.has(t.id));
  const idMap = new Map();
  filteredTiles.forEach((t, i) => idMap.set(t.id, i));
  filteredTiles.forEach(t => {
    t.id = idMap.get(t.id);
    t.neighbors = t.neighbors.filter(n => !removedIds.has(n)).map(n => idMap.get(n));
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

  const startTileIds = [
    dodecaMap.get(`${0},${0}`),
    dodecaMap.get(`${cols - 1},0`),
    dodecaMap.get(`${-Math.floor((rows - 1) / 2)},${rows - 1}`),
    dodecaMap.get(`${cols - 1 - Math.floor((rows - 1) / 2)},${rows - 1}`)
  ].filter(id => id !== undefined && !removedIds.has(id)).map(id => idMap.get(id));

  const board = { version: 1, generator: "truncated-hexagonal", width: w, height: h, tiles: filteredTiles, startTileIds };
  validateBoard(board);
  return board;
}
