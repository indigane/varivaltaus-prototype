/**
 * Generates an Elongated Triangular tiling board (3.3.3.4.4).
 * This tiling consists of alternating strips of squares and triangles.
 * Every vertex is shared by two squares and three triangles.
 */
export function generateElongatedTriangularBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;

  const h = a * Math.sqrt(3) / 2;

  // We want 'rows' rows of squares, with triangle strips in between.
  // Total number of strips = rows (squares) + (rows - 1) (triangles)
  const numSquareRows = rows;
  const numTriangleRows = rows - 1;
  const totalStrips = numSquareRows + numTriangleRows;

  let tiles = [];
  let idCounter = 0;
  const vertexMap = new Map();
  const vertexEdgeKey = (a, b) => a < b ? `${a},${b}` : `${b},${a}`;
  const getVertexId = (p) => {
    const key = `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
    if (vertexMap.has(key)) return vertexMap.get(key).id;
    const id = vertexMap.size;
    vertexMap.set(key, { id, p });
    return id;
  };

  const squareMap = new Map();

  for (let s = 0; s < totalStrips; s++) {
    const isSquareStrip = (s % 2 === 0);
    const stripIdx = Math.floor(s / 2);

    // yBase calculation:
    // s=0 (S): 0
    // s=1 (T): a
    // s=2 (S): a + h
    // s=3 (T): 2a + h
    // ...
    const yBase = stripIdx * (a + h) + (isSquareStrip ? 0 : a);
    const offset = (stripIdx % 2 === 1 && isSquareStrip) ? a / 2 :
                   (stripIdx % 2 === 0 && !isSquareStrip) ? 0 :
                   (stripIdx % 2 === 1 && !isSquareStrip) ? a / 2 : 0;

    // Actually simpler:
    // Square Row 0 (strip 0): offset 0
    // Square Row 1 (strip 2): offset a/2
    // Square Row 2 (strip 4): offset 0
    const currentSquareOffset = (stripIdx % 2 === 0) ? 0 : a / 2;
    const nextSquareOffset = ((stripIdx + 1) % 2 === 0) ? 0 : a / 2;

    if (isSquareStrip) {
      for (let q = 0; q < cols; q++) {
        const x = q * a + currentSquareOffset;
        const y = yBase;
        const points = [
          [x, y],
          [x + a, y],
          [x + a, y + a],
          [x, y + a]
        ];
        const vIds = points.map(getVertexId);
        const tile = {
          id: idCounter++,
          colorId: Math.floor(rng() * colorCount),
          ownerId: null,
          points,
          vIds,
          type: 'square',
          neighbors: []
        };
        tiles.push(tile);
        squareMap.set(`${q},${stripIdx}`, tile.id);
      }
    } else {
      // Triangles between Square strip 'stripIdx' and 'stripIdx + 1'
      const offsetBelow = currentSquareOffset;
      const offsetAbove = nextSquareOffset;

      for (let q = -1; q < cols + 1; q++) {
        const xBelow = q * a + offsetBelow;
        const xAbove = q * a + offsetAbove;

        // Up triangle
        // If offsetBelow=0, offsetAbove=0.5a: vertices at yBase: q*a, (q+1)*a. Apex at yBase+h: (q+0.5)a
        // If offsetBelow=0.5a, offsetAbove=0: vertices at yBase: (q+0.5)a, (q+1.5)a. Apex at yBase+h: (q+1)a
        const apexUpX = (offsetBelow < offsetAbove) ? xAbove : xAbove + a;
        const pUp = [
          [xBelow, yBase],
          [xBelow + a, yBase],
          [apexUpX, yBase + h]
        ];

        // Down triangle
        // If offsetBelow=0, offsetAbove=0.5a: vertices at yBase+h: (q+0.5)a, (q+1.5)a. Apex at yBase: (q+1)a
        // If offsetBelow=0.5a, offsetAbove=0: vertices at yBase+h: q*a, (q+1)a. Apex at yBase: (q+0.5)a
        const apexDownX = (offsetBelow < offsetAbove) ? xBelow + a : xBelow;
        const pDown = [
          [xAbove, yBase + h],
          [xAbove + a, yBase + h],
          [apexDownX, yBase]
        ];

        [pUp, pDown].forEach(points => {
          tiles.push({
            id: idCounter++,
            colorId: Math.floor(rng() * colorCount),
            ownerId: null,
            points,
            vIds: points.map(getVertexId),
            type: 'triangle',
            neighbors: []
          });
        });
      }
    }
  }

  const squareEdgeKeys = new Set();
  tiles.filter(t => t.type === 'square').forEach(tile => {
    for (let i = 0; i < tile.vIds.length; i++) {
      squareEdgeKeys.add(vertexEdgeKey(tile.vIds[i], tile.vIds[(i + 1) % tile.vIds.length]));
    }
  });

  const sharesSquareEdge = (tile) => (
    squareEdgeKeys.has(vertexEdgeKey(tile.vIds[0], tile.vIds[1])) ||
    squareEdgeKeys.has(vertexEdgeKey(tile.vIds[1], tile.vIds[2])) ||
    squareEdgeKeys.has(vertexEdgeKey(tile.vIds[2], tile.vIds[0]))
  );

  const filteredTiles = tiles.filter(t => t.type === 'square' || sharesSquareEdge(t));

  // Re-index
  filteredTiles.forEach((t, idx) => t.id = idx);

  // Connectivity via vIds
  const vertexToTiles = new Map();
  filteredTiles.forEach((tile, idx) => {
    tile.vIds.forEach(vId => {
      if (!vertexToTiles.has(vId)) vertexToTiles.set(vId, []);
      vertexToTiles.get(vId).push(idx);
    });
  });

  filteredTiles.forEach((tile, i) => {
    const neighborCounts = new Map();
    tile.vIds.forEach(vId => {
      vertexToTiles.get(vId).forEach(j => {
        if (i === j) return;
        neighborCounts.set(j, (neighborCounts.get(j) || 0) + 1);
      });
    });
    neighborCounts.forEach((count, j) => {
      if (count >= 2) {
        tile.neighbors.push(filteredTiles[j].id);
      }
    });
  });

  // Final bounding box and normalization
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

  const findClosest = (tx, ty) => {
    let bestId = 0;
    let minDist = Infinity;
    filteredTiles.forEach(t => {
      const cx = t.points.reduce((sum, p) => sum + p[0], 0) / t.points.length;
      const cy = t.points.reduce((sum, p) => sum + p[1], 0) / t.points.length;
      const d = Math.pow(cx - tx, 2) + Math.pow(cy - ty, 2);
      if (d < minDist) {
        minDist = d;
        bestId = t.id;
      }
    });
    return bestId;
  };

  const width = maxX - minX;
  const height = maxY - minY;
  const startTileIds = [
    findClosest(0, 0),
    findClosest(width, 0),
    findClosest(0, height),
    findClosest(width, height)
  ];

  return {
    version: 1,
    generator: "elongated-triangular",
    width,
    height,
    tiles: filteredTiles,
    startTileIds
  };
}
