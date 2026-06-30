/**
 * Generates a Truncated Trihexagonal tiling board (4.6.12).
 * This tiling consists of dodecagons, hexagons, and squares.
 * Every vertex is shared by one dodecagon, one hexagon, and one square.
 */
export function generateTruncatedTrihexagonalBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;

  // Side length 'a' for all polygons.
  // Distance between centers of dodecagons.
  const dist = a * (3 + Math.sqrt(3));

  const tiles = [];
  const tileMap = new Map();

  const getDodecaCenter = (q, r) => {
    const x = dist * (q + r / 2);
    const y = dist * (Math.sqrt(3) / 2) * r;
    return [x, y];
  };

  let idCounter = 0;

  const getTile = (cx, cy, sides, angle, radius, prefix) => {
    const key = `${prefix}_${Math.round(cx * 100)},${Math.round(cy * 100)}`;
    if (tileMap.has(key)) return tileMap.get(key);

    const id = idCounter++;
    const points = [];
    for (let i = 0; i < sides; i++) {
      const vAngle = (angle + (i * 360 / sides)) * Math.PI / 180;
      points.push([cx + radius * Math.cos(vAngle), cy + radius * Math.sin(vAngle)]);
    }

    const tile = {
      id,
      colorId: Math.floor(rng() * colorCount),
      ownerId: null,
      points,
      neighbors: []
    };
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

  // 1. Generate Dodecagons and their surrounding squares and hexagons
  for (let r = 0; r < rows; r++) {
    const r_offset = Math.floor(r / 2);
    for (let q = -r_offset; q < cols - r_offset; q++) {
      const [cx, cy] = getDodecaCenter(q, r);

      const dId = getTile(cx, cy, 12, 15, R12, "d");
      dodecaIds.push(dId);

      for (let i = 0; i < 6; i++) {
        // Squares
        const angleS = i * 60;
        const scx = cx + distS * Math.cos(angleS * Math.PI / 180);
        const scy = cy + distS * Math.sin(angleS * Math.PI / 180);
        getTile(scx, scy, 4, angleS + 45, R4, "s");

        // Hexagons
        const angleH = i * 60 + 30;
        const hcx = cx + distH * Math.cos(angleH * Math.PI / 180);
        const hcy = cy + distH * Math.sin(angleH * Math.PI / 180);
        // Corrected hexagon rotation: 0 (multiples of 60) ensures side aligned with dodecagon
        getTile(hcx, hcy, 6, 0, R6, "h");
      }
    }
  }

  // 2. Build connectivity based on vertex proximity (optimized with spatial hash)
  const addNeighbor = (idx1, id2) => {
    if (!tiles[idx1].neighbors.includes(id2)) {
      tiles[idx1].neighbors.push(id2);
    }
  };

  const vertexMap = new Map();
  tiles.forEach(tile => {
    tile.points.forEach(p => {
      const vx = Math.round(p[0] * 100);
      const vy = Math.round(p[1] * 100);
      const key = `${vx},${vy}`;
      if (!vertexMap.has(key)) vertexMap.set(key, []);
      vertexMap.get(key).push(tile.id);
    });
  });

  const neighborCounts = new Map();
  vertexMap.forEach(tileIds => {
    for (let i = 0; i < tileIds.length; i++) {
      for (let j = i + 1; j < tileIds.length; j++) {
        const id1 = Math.min(tileIds[i], tileIds[j]);
        const id2 = Math.max(tileIds[i], tileIds[j]);
        const key = `${id1},${id2}`;
        neighborCounts.set(key, (neighborCounts.get(key) || 0) + 1);
      }
    }
  });

  neighborCounts.forEach((count, key) => {
    if (count >= 2) {
      const [id1, id2] = key.split(',').map(Number);
      addNeighbor(id1, id2);
      addNeighbor(id2, id1);
    }
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
    dodecaIds[0],
    dodecaIds[cols - 1],
    dodecaIds[(rows - 1) * cols],
    dodecaIds[dodecaIds.length - 1]
  ].filter(id => id !== undefined);

  return {
    version: 1,
    generator: "truncated-trihexagonal",
    width: maxX - minX,
    height: maxY - minY,
    tiles,
    startTileIds
  };
}
