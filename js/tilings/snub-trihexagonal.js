/**
 * Generates a Snub Trihexagonal tiling board (3.3.3.3.6).
 * This tiling consists of hexagons and triangles.
 * Every vertex is shared by one hexagon and four triangles.
 */
export function generateSnubTrihexagonalBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;

  const D = a * Math.sqrt(7);
  const alpha = Math.atan(1 / (3 * Math.sqrt(3)));

  const tiles = [];
  const hexMap = new Map();

  const getHexCenter = (q, r) => {
    const x = D * (q + r / 2);
    const y = D * (Math.sqrt(3) / 2) * r;
    return [x, y];
  };

  let idCounter = 0;
  const allVertices = [];

  // 1. Generate Hexagons
  for (let r = 0; r < rows; r++) {
    const r_offset = Math.floor(r / 2);
    for (let q = -r_offset; q < cols - r_offset; q++) {
      const [cx, cy] = getHexCenter(q, r);
      const id = idCounter++;

      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = alpha + (i * 60) * Math.PI / 180;
        const p = [cx + a * Math.cos(angle), cy + a * Math.sin(angle)];
        points.push(p);
        allVertices.push(p);
      }

      const tile = {
        id,
        colorId: Math.floor(rng() * colorCount),
        ownerId: null,
        points,
        neighbors: []
      };
      tiles.push(tile);
      hexMap.set(`${q},${r}`, id);
    }
  }

  // 2. Generate Triangles by finding equilateral triplets among hexagon vertices
  const distSq = (p1, p2) => {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    return dx * dx + dy * dy;
  };

  const targetSq = a * a;
  const tolerance = 0.1 * targetSq;

  // Spatial hash
  const grid = new Map();
  const getCellKey = (p) => `${Math.floor(p[0] / a)},${Math.floor(p[1] / a)}`;

  allVertices.forEach((v, idx) => {
    const key = getCellKey(v);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(idx);
  });

  for (let i = 0; i < allVertices.length; i++) {
    const v1 = allVertices[i];
    const cx = Math.floor(v1[0] / a);
    const cy = Math.floor(v1[1] / a);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key2 = `${cx + dx},${cy + dy}`;
        const cell2 = grid.get(key2);
        if (!cell2) continue;

        for (const j of cell2) {
          if (j <= i) continue;
          const v2 = allVertices[j];
          const d12 = distSq(v1, v2);
          if (Math.abs(d12 - targetSq) < tolerance) {
            for (let dx2 = -1; dx2 <= 1; dx2++) {
              for (let dy2 = -1; dy2 <= 1; dy2++) {
                const key3 = `${cx + dx2},${cy + dy2}`;
                const cell3 = grid.get(key3);
                if (!cell3) continue;

                for (const k of cell3) {
                  if (k <= j) continue;
                  const v3 = allVertices[k];
                  const d13 = distSq(v1, v3);
                  const d23 = distSq(v2, v3);
                  if (Math.abs(d13 - targetSq) < tolerance && Math.abs(d23 - targetSq) < tolerance) {
                    tiles.push({
                      id: idCounter++,
                      colorId: Math.floor(rng() * colorCount),
                      ownerId: null,
                      points: [v1, v2, v3],
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

  // 3. Connectivity via proximity
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
    hexMap.get(`${0},${0}`),
    hexMap.get(`${cols - 1},0`),
    hexMap.get(`${-Math.floor((rows - 1) / 2)},${rows - 1}`),
    hexMap.get(`${cols - 1 - Math.floor((rows - 1) / 2)},${rows - 1}`)
  ].filter(id => id !== undefined);

  return {
    version: 1,
    generator: "snub-trihexagonal",
    width: maxX - minX,
    height: maxY - minY,
    tiles,
    startTileIds
  };
}
