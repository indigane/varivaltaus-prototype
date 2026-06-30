/**
 * Generates a Trihexagonal tiling board (3.6.3.6).
 * This tiling consists of hexagons and triangles.
 * Every vertex is shared by two hexagons and two triangles.
 */
export function generateTrihexagonalBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;
  const D = 2 * a; // distance between hexagon centers
  const distT = a * 2 / Math.sqrt(3); // distance from hex center to triangle center

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
  const getTriangle = (cx, cy, angle, outward) => {
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
      outward: outward,
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

      // A triangle is "outward" if it's attached to only one hex in the grid?
      // Actually simpler: in 3.6.3.6, around each hex, 3 triangles point "out" from center and 3 point "in" relative to the hex?
      // No, they all look the same around one hex.
      // Let's use the user's advice: "non-outward-pointing triangles at the edges"
      // In a hexagonal grid, "outward" usually means the apex points away from the center of the board.

      const tId = getTriangle(tcx, tcy, angleT, false); // outward flag not used yet
      const triangle = idToTile.get(tId);

      if (!hex.neighbors.includes(tId)) hex.neighbors.push(tId);
      if (!triangle.neighbors.includes(hId)) triangle.neighbors.push(hId);
    }
  }

  // Calculate board center for outward check
  let avgX = 0, avgY = 0;
  let count = 0;
  for (const t of tiles) {
    if (t.type === 'hex') {
      const [cx, cy] = getHexCenter(t.q, t.r);
      avgX += cx; avgY += cy; count++;
    }
  }
  avgX /= count; avgY /= count;

  // 2.5 Edge culling: remove triangles that point outward and have only 1 neighbor
  const removedIds = new Set();
  for (const tile of tiles) {
    if (tile.type === 'triangle' && tile.neighbors.length === 1) {
       // Check if it points outward.
       // For a triangle with 1 neighbor (a hex), it points outward if its vertex NOT shared with the hex
       // is further from the board center than the shared side.
       const hexId = tile.neighbors[0];
       const hex = idToTile.get(hexId);
       const [hcx, hcy] = getHexCenter(hex.q, hex.r);

       // Center of the triangle
       let tcx = 0, tcy = 0;
       tile.points.forEach(p => { tcx += p[0]; tcy += p[1]; });
       tcx /= 3; tcy /= 3;

       // Vector from hex center to triangle center
       const vhx = tcx - hcx;
       const vhy = tcy - hcy;

       // Vector from board center to triangle center
       const vbx = tcx - avgX;
       const vby = tcy - avgY;

       // If dot product > 0, it's pointing "away" from board center relative to its hex
       const dot = vhx * vbx + vhy * vby;
       if (dot > 0) {
         removedIds.add(tile.id);
       }
    }
  }

  // Update neighbors and re-index
  const filteredTiles = tiles.filter(t => !removedIds.has(t.id)).map((tile, index) => {
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

  // 3. Finalize
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const t of filteredTiles) {
    for (const p of t.points) {
      minX = Math.min(minX, p[0]);
      minY = Math.min(minY, p[1]);
      maxX = Math.max(maxX, p[0]);
      maxY = Math.max(maxY, p[1]);
    }
  }

  filteredTiles.forEach(t => {
    t.points = t.points.map(p => [p[0] - minX, p[1] - minY]);
  });

  const startTileIds = [
    hexMap.get(`${0},${0}`),
    hexMap.get(`${cols - 1},0`),
    hexMap.get(`${-Math.floor((rows - 1) / 2)},${rows - 1}`),
    hexMap.get(`${cols - 1 - Math.floor((rows - 1) / 2)},${rows - 1}`)
  ].filter(id => id !== undefined && !removedIds.has(id)).map(id => idMap.get(id));

  return {
    version: 1,
    generator: "trihexagonal",
    width: maxX - minX,
    height: maxY - minY,
    tiles: filteredTiles,
    startTileIds: startTileIds
  };
}
