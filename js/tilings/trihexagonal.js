/**
 * Generates a Trihexagonal tiling board (3.6.3.6).
 * This tiling consists of hexagons and triangles.
 * Every vertex is shared by two hexagons and two triangles.
 */
export function generateTrihexagonalBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;
  const D = 2 * a; // distance between hexagon centers
  const distT = 2 * a / Math.sqrt(3); // distance from hex center to triangle center

  const tiles = [];
  const hexMap = new Map(); // key: "q,r", value: id
  const triangleMap = new Map(); // key: "x,y", value: id

  const getHexCenter = (q, r) => {
    const x = D * (q + r / 2);
    const y = D * (Math.sqrt(3) / 2) * r;
    return [x, y];
  };

  const idToTile = new Map();
  let idCounter = 0;

  // 1. Generate Hexagons
  for (let r = 0; r < rows; r++) {
    const r_offset = Math.floor(r / 2);
    for (let q = -r_offset; q < cols - r_offset; q++) {
      const [cx, cy] = getHexCenter(q, r);
      const id = idCounter++;

      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (60 * i) * Math.PI / 180;
        points.push([cx + a * Math.cos(angle), cy + a * Math.sin(angle)]);
      }

      const tile = {
        id,
        type: 'hex',
        q, r,
        colorId: Math.floor(rng() * colorCount),
        ownerId: null,
        points,
        neighbors: []
      };
      tiles.push(tile);
      hexMap.set(`${q},${r}`, id);
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
  const hexIds = tiles.filter(t => t.type === 'hex').map(t => t.id);

  for (const hId of hexIds) {
    const hex = idToTile.get(hId);
    const [cx, cy] = getHexCenter(hex.q, hex.r);

    for (let i = 0; i < 6; i++) {
      const angleT = (60 * i + 30) * Math.PI / 180;
      const tcx = cx + distT * Math.cos(angleT);
      const tcy = cy + distT * Math.sin(angleT);

      const tId = getTriangle(tcx, tcy, angleT);
      const triangle = idToTile.get(tId);

      if (!hex.neighbors.includes(tId)) hex.neighbors.push(tId);
      if (!triangle.neighbors.includes(hId)) triangle.neighbors.push(hId);
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
  const filteredTiles = tilesToKeep.map((tile, index) => {
    tile.neighbors = tile.neighbors.filter(nId => !removedIds.has(nId));
    return tile;
  });

  // Re-map IDs to be contiguous
  const idMap = new Map();
  filteredTiles.forEach((tile, i) => {
    idMap.set(tile.id, i);
  });

  filteredTiles.forEach(tile => {
    tile.id = idMap.get(tile.id);
    tile.neighbors = tile.neighbors.map(nId => idMap.get(nId));
  });

  const finalTiles = filteredTiles;

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
    hexMap.get(`${0},${0}`),
    hexMap.get(`${cols - 1},0`),
    hexMap.get(`${-Math.floor((rows - 1) / 2)},${rows - 1}`),
    hexMap.get(`${cols - 1 - Math.floor((rows - 1) / 2)},${rows - 1}`)
  ].filter(id => id !== undefined);

  return {
    version: 1,
    generator: "trihexagonal",
    width: maxX - minX,
    height: maxY - minY,
    tiles: finalTiles,
    startTileIds: startTileIds.filter(id => !removedIds.has(id)).map(id => idMap.get(id))
  };
}
