/**
 * Generates a Great Rhombitrihexagonal tiling board (4.6.12).
 * This tiling consists of dodecagons, hexagons, and squares.
 * Every vertex is shared by one dodecagon, one hexagon, and one square.
 */
export function generateGreatRhombitrihexagonalBoard(options) {
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
        getTile(hcx, hcy, 6, angleH, R6, "h");
      }
    }
  }

  // 2. Build connectivity based on vertex proximity
  const addNeighbor = (idx1, id2) => {
    if (!tiles[idx1].neighbors.includes(id2)) {
      tiles[idx1].neighbors.push(id2);
    }
  };

  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      let common = 0;
      for (const p1 of tiles[i].points) {
        for (const p2 of tiles[j].points) {
          const dx = p1[0] - p2[0];
          const dy = p1[1] - p2[1];
          if (dx * dx + dy * dy < 0.01) {
            common++;
            break;
          }
        }
      }
      if (common >= 2) {
        addNeighbor(i, tiles[j].id);
        addNeighbor(j, tiles[i].id);
      }
    }
  }

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
    generator: "great-rhombitrihexagonal",
    width: maxX - minX,
    height: maxY - minY,
    tiles,
    startTileIds
  };
}
