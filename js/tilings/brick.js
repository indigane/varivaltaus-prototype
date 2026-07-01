/**
 * Generates a brick tiling board as a graph.
 * This is essentially a staggered square grid with 2:1 aspect ratio.
 */
export function generateBrickBoard(options) {
  const { cols, rows, tileSize, colorCount, rng } = options;
  const w = tileSize * 2;
  const h = tileSize;
  const tiles = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = r * cols + c;
      const isOffset = (r % 2 === 1);
      const x = c * w + (isOffset ? w / 2 : 0);
      const y = r * h;

      const points = [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h]
      ];

      const neighbors = [];
      // Left/Right
      if (c > 0) neighbors.push(id - 1);
      if (c < cols - 1) neighbors.push(id + 1);

      // Up/Down
      const otherRows = [r - 1, r + 1];
      for (const nr of otherRows) {
        if (nr >= 0 && nr < rows) {
          if (isOffset) {
            // Odd row (offset right) connects to c and c+1 in even rows above/below
            if (c >= 0 && c < cols) neighbors.push(nr * cols + c);
            if (c + 1 < cols) neighbors.push(nr * cols + c + 1);
          } else {
            // Even row (offset zero) connects to c-1 and c in odd rows above/below
            if (c - 1 >= 0) neighbors.push(nr * cols + c - 1);
            if (c < cols) neighbors.push(nr * cols + c);
          }
        }
      }

      tiles.push({
        id,
        colorId: Math.floor(rng() * colorCount),
        ownerId: null,
        points,
        neighbors
      });
    }
  }

  // Calculate bounding box for normalization
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

  const width = maxX - minX;
  const height = maxY - minY;

  const startTileIds = [
    0,
    tiles.length - 1,
    cols - 1,
    (rows - 1) * cols
  ];

  return {
    version: 1,
    generator: "brick",
    width,
    height,
    tiles,
    startTileIds
  };
}
