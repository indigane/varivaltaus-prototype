/**
 * Generates a square tiling board as a graph.
 */
export function generateSquareBoard(options) {
  const { cols, rows, tileSize, colorCount, rng } = options;
  const tiles = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const id = row * cols + col;
      const x = col * tileSize;
      const y = row * tileSize;

      const points = [
        [x, y],
        [x + tileSize, y],
        [x + tileSize, y + tileSize],
        [x, y + tileSize]
      ];

      const neighbors = [];
      if (col > 0) neighbors.push(id - 1); // left
      if (col < cols - 1) neighbors.push(id + 1); // right
      if (row > 0) neighbors.push(id - cols); // up
      if (row < rows - 1) neighbors.push(id + cols); // down

      tiles.push({
        id,
        colorId: Math.floor(rng() * colorCount),
        ownerId: null,
        points,
        neighbors
      });
    }
  }

  return {
    version: 1,
    generator: "square",
    width: cols * tileSize,
    height: rows * tileSize,
    cols,
    rows,
    tiles
  };
}
