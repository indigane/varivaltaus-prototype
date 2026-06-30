import { getVertexId, validateBoard } from "../core/utils.js";

/**
 * Trihexagonal Tiling (3.6.3.6)
 */
export function generateTrihexagonalBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;
  const D = 2 * a;
  const distT = a * 2 / Math.sqrt(3);

  const tiles = [];
  const vertexMap = new Map();
  const hexMap = new Map();
  const triangleMap = new Map();
  let idCounter = 0;

  const getHexCenter = (q, r) => {
    const x = D * (q + r / 2);
    const y = D * (Math.sqrt(3) / 2) * r;
    return [x, y];
  };

  for (let r = 0; r < rows; r++) {
    const r_offset = Math.floor(r / 2);
    for (let q = -r_offset; q < cols - r_offset; q++) {
      const [cx, cy] = getHexCenter(q, r);
      const points = [];
      const vIds = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60) * Math.PI / 180;
        const p = [cx + a * Math.cos(angle), cy + a * Math.sin(angle)];
        points.push(p);
        vIds.push(getVertexId(p, vertexMap));
      }
      const tile = {
        id: idCounter++,
        type: 'hex',
        colorId: Math.floor(rng() * colorCount),
        points,
        vIds,
        neighbors: []
      };
      tiles.push(tile);
      hexMap.set(`${q},${r}`, tile.id);
    }
  }

  // Connectivity and triangles
  tiles.filter(t => t.type === 'hex').forEach(hex => {
    const cx = hex.points.reduce((s, p) => s + p[0], 0) / 6;
    const cy = hex.points.reduce((s, p) => s + p[1], 0) / 6;

    for (let i = 0; i < 6; i++) {
      const angleT = (60 * i + 30) * Math.PI / 180;
      const tcx = cx + distT * Math.cos(angleT);
      const tcy = cy + distT * Math.sin(angleT);
      const key = `${Math.round(tcx * 100)},${Math.round(tcy * 100)}`;

      if (!triangleMap.has(key)) {
        const rT = a / Math.sqrt(3);
        const triPoints = [];
        const triVIds = [];
        for (let j = 0; j < 3; j++) {
          const vAngle = angleT + (j * 120) * Math.PI / 180;
          const p = [tcx + rT * Math.cos(vAngle), tcy + rT * Math.sin(vAngle)];
          triPoints.push(p);
          triVIds.push(getVertexId(p, vertexMap));
        }
        const triTile = {
          id: idCounter++,
          type: 'triangle',
          colorId: Math.floor(rng() * colorCount),
          points: triPoints,
          vIds: triVIds,
          neighbors: []
        };
        tiles.push(triTile);
        triangleMap.set(key, triTile.id);
      }
    }
  });

  // Calculate board center for outward culling
  let boardCx = 0, boardCy = 0, hexCount = 0;
  tiles.filter(t => t.type === 'hex').forEach(t => {
    const cx = t.points.reduce((s, p) => s + p[0], 0) / 6;
    const cy = t.points.reduce((s, p) => s + p[1], 0) / 6;
    boardCx += cx; boardCy += cy; hexCount++;
  });
  boardCx /= hexCount; boardCy /= hexCount;

  // Build temporary vertex-to-tile map for filtering
  const vertexToTiles = [];
  tiles.forEach(tile => {
    tile.vIds.forEach(vId => {
      if (!vertexToTiles[vId]) vertexToTiles[vId] = [];
      vertexToTiles[vId].push(tile.id);
    });
  });

  // Connect neighbors
  tiles.forEach(tile => {
    tile.vIds.forEach(vId => {
      vertexToTiles[vId].forEach(otherId => {
        if (otherId === tile.id) return;
        const other = tiles[otherId];
        const shared = tile.vIds.filter(v => other.vIds.includes(v)).length;
        if (shared >= 2 && !tile.neighbors.includes(otherId)) tile.neighbors.push(otherId);
      });
    });
  });

  const removedIds = new Set();
  tiles.filter(t => t.type === 'triangle' && t.neighbors.length === 1).forEach(tri => {
    const hex = tiles[tri.neighbors[0]];
    const hcx = hex.points.reduce((s, p) => s + p[0], 0) / 6;
    const hcy = hex.points.reduce((s, p) => s + p[1], 0) / 6;
    const tcx = tri.points.reduce((s, p) => s + p[0], 0) / 3;
    const tcy = tri.points.reduce((s, p) => s + p[1], 0) / 3;
    if ((tcx - hcx) * (tcx - boardCx) + (tcy - hcy) * (tcy - boardCy) > 0) removedIds.add(tri.id);
  });

  const filteredTiles = tiles.filter(t => !removedIds.has(t.id));
  const idMap = new Map();
  filteredTiles.forEach((t, i) => idMap.set(t.id, i));
  filteredTiles.forEach(t => {
    t.id = idMap.get(t.id);
    t.neighbors = t.neighbors.filter(n => !removedIds.has(n)).map(n => idMap.get(n));
    delete t.vIds;
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
    hexMap.get(`${0},${0}`),
    hexMap.get(`${cols - 1},0`),
    hexMap.get(`${-Math.floor((rows - 1) / 2)},${rows - 1}`),
    hexMap.get(`${cols - 1 - Math.floor((rows - 1) / 2)},${rows - 1}`)
  ].filter(id => id !== undefined && !removedIds.has(id)).map(id => idMap.get(id));

  const board = { version: 1, generator: "trihexagonal", width: w, height: h, tiles: filteredTiles, startTileIds };
  validateBoard(board);
  return board;
}
