/**
 * Generates a Truncated Hexagonal tiling board (3.12.12).
 * This tiling consists of dodecagons and triangles.
 * Every vertex is shared by two dodecagons and one triangle.
 */
export function generateTruncatedHexagonalBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;

  // Distance between centers of dodecagons (sharing a side 'a')
  const dist = a * (2 + Math.sqrt(3));

  const tiles = [];
  const dodecaMap = new Map(); // key: "q,r", value: id
  const triangleMap = new Map(); // key: "x,y", value: id

  const getDodecaCenter = (q, r) => {
    const x = dist * (q + r / 2);
    const y = dist * (Math.sqrt(3) / 2) * r;
    return [x, y];
  };

  const idToTile = new Map();
  let idCounter = 0;

  // 1. Generate Dodecagons
  const R12 = a / (2 * Math.sin(Math.PI / 12));
  for (let r = 0; r < rows; r++) {
    const r_offset = Math.floor(r / 2);
    for (let q = -r_offset; q < cols - r_offset; q++) {
      const [cx, cy] = getDodecaCenter(q, r);
      const id = idCounter++;

      const points = [];
      for (let i = 0; i < 12; i++) {
        const angle = (30 * i + 15) * Math.PI / 180;
        points.push([cx + R12 * Math.cos(angle), cy + R12 * Math.sin(angle)]);
      }

      const tile = {
        id,
        type: 'dodecagon',
        q, r,
        colorId: Math.floor(rng() * colorCount),
        ownerId: null,
        points,
        neighbors: []
      };
      tiles.push(tile);
      dodecaMap.set(`${q},${r}`, id);
      idToTile.set(id, tile);
    }
  }

  // Helper to add or get a triangle by position
  const getTriangle = (cx, cy, angle) => {
    const key = `${Math.round(cx * 100)},${Math.round(cy * 100)}`;
    if (triangleMap.has(key)) return triangleMap.get(key);

    const id = idCounter++;
    const points = [];
    const rT = a / Math.sqrt(3);
    for (let i = 0; i < 3; i++) {
      const vAngle = angle + (i * 120) * Math.PI / 180;
      points.push([cx + rT * Math.cos(vAngle), cy + rT * Math.sin(vAngle)]);
    }

    const tile = {
      id,
      type: 'triangle',
      colorId: Math.floor(rng() * colorCount),
      ownerId: null,
      points,
      neighbors: []
    };
    tiles.push(tile);
    triangleMap.set(key, id);
    idToTile.set(id, tile);
    return id;
  };

  // 2. Build connectivity and generate triangles
  const dodecaIds = tiles.filter(t => t.type === 'dodecagon').map(t => t.id);
  const distT = dist / Math.sqrt(3);

  for (const dId of dodecaIds) {
    const dodeca = idToTile.get(dId);
    const [cx, cy] = getDodecaCenter(dodeca.q, dodeca.r);

    // Neighbors: 6 other dodecagons and 6 triangles
    const directions = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    for (const [dq, dr] of directions) {
      const neighborId = dodecaMap.get(`${dodeca.q + dq},${dodeca.r + dr}`);
      if (neighborId !== undefined) {
        const neighbor = idToTile.get(neighborId);
        if (!dodeca.neighbors.includes(neighborId)) dodeca.neighbors.push(neighborId);
        if (!neighbor.neighbors.includes(dId)) neighbor.neighbors.push(dId);
      }
    }

    for (let i = 0; i < 6; i++) {
      const angleT = (60 * i + 30) * Math.PI / 180;
      const tcx = cx + distT * Math.cos(angleT);
      const tcy = cy + distT * Math.sin(angleT);

      const tId = getTriangle(tcx, tcy, angleT + Math.PI);
      const triangle = idToTile.get(tId);

      if (!dodeca.neighbors.includes(tId)) dodeca.neighbors.push(tId);
      if (!triangle.neighbors.includes(dId)) triangle.neighbors.push(dId);
    }
  }

  // 2.5 Edge culling: remove triangles with fewer than 3 neighbors
  const tilesToKeep = [];
  const removedIds = new Set();
  for (const tile of tiles) {
    if (tile.type === 'triangle' && tile.neighbors.length < 3) {
      removedIds.add(tile.id);
    } else {
      tilesToKeep.push(tile);
    }
  }

  // Update neighbors and re-index
  const idMap = new Map();
  const finalTiles = tilesToKeep.map((tile, index) => {
    tile.neighbors = tile.neighbors.filter(nId => !removedIds.has(nId));
    idMap.set(tile.id, index);
    tile.id = index;
    return tile;
  });

  finalTiles.forEach(tile => {
    tile.neighbors = tile.neighbors.map(nId => idMap.get(nId));
  });

  // 3. Finalize
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
    dodecaMap.get(`${0},${0}`),
    dodecaMap.get(`${cols - 1},0`),
    dodecaMap.get(`${-Math.floor((rows - 1) / 2)},${rows - 1}`),
    dodecaMap.get(`${cols - 1 - Math.floor((rows - 1) / 2)},${rows - 1}`)
  ].filter(id => id !== undefined);

  return {
    version: 1,
    generator: "truncated-hexagonal",
    width: maxX - minX,
    height: maxY - minY,
    tiles: finalTiles,
    startTileIds: startTileIds.filter(id => !removedIds.has(id)).map(id => idMap.get(id))
  };
}
