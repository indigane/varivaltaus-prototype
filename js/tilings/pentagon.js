/**
 * Generates a Cairo-like pentagonal tiling board.
 * This is implemented as a "shifted house" tiling,
 * which is a common way to represent Cairo tiling.
 */
export function generatePentagonBoard(options) {
  const { cols, rows, tileSize, colorCount, rng } = options;
  const tiles = [];
  const s = tileSize;
  const h = s * 0.8; // Height of the "square" part
  const p = s * 0.3; // Height of the "roof" part

  const tileMap = new Map(); // "r,c" -> id

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = r * cols + c;
      tileMap.set(`${r},${c}`, id);
    }
  }

  for (let r = 0; r < rows; r++) {
    const pairIndex = Math.floor(r / 2);
    const xOffset = (pairIndex % 2 === 1) ? s / 2 : 0;

    // yOffset calculation to make them touch perfectly in the peak-to-peak tiling
    let yOffset;
    if (r % 2 === 0) {
        // Down-pointing house
        yOffset = pairIndex * (2 * h + 3 * p);
    } else {
        // Up-pointing house
        yOffset = pairIndex * (2 * h + 3 * p) + h + 2 * p;
    }

    for (let c = 0; c < cols; c++) {
      const id = tileMap.get(`${r},${c}`);
      const x = c * s + xOffset;
      const y = yOffset;

      // Every tile is a "house" pointing up or down.
      // To tile perfectly, they must alternate or be shifted.
      // Let's use:
      // Even rows: House pointing Down.
      // Odd rows: House pointing Up.

      let points;
      if (r % 2 === 0) {
        // Pointing Down
        points = [
          [x, y],           // Top-left
          [x + s, y],       // Top-right
          [x + s, y + h],   // Bottom-right shoulder
          [x + s / 2, y + h + p], // Bottom peak
          [x, y + h]        // Bottom-left shoulder
        ];
      } else {
        // Pointing Up
        points = [
          [x + s / 2, y - p], // Top peak
          [x + s, y + p],     // Top-right shoulder
          [x + s, y + h + p], // Bottom-right
          [x, y + h + p],     // Bottom-left
          [x, y + p]          // Top-left shoulder
        ];
      }

      const neighbors = [];
      // Left/Right
      if (c > 0) neighbors.push(tileMap.get(`${r},${c - 1}`));
      if (c < cols - 1) neighbors.push(tileMap.get(`${r},${c + 1}`));

      // Up/Down
      if (r % 2 === 0) {
        // Down-pointing house
        // Top edge (flat) shared with row above (r-1, which is Up-pointing)
        if (r > 0) {
            // Row r and r-1 have DIFFERENT xOffsets.
            // If r is Down (r=2, offset s/2), r-1 is Up (r=1, offset 0).
            // Tile (2, c) at x = c*s + s/2.
            // Tile (1, c) at x = c*s. Tile (1, c+1) at x = (c+1)*s.
            // So (2, c) shares top with (1, c) and (1, c+1).
            if (xOffset > 0) {
                neighbors.push(tileMap.get(`${r - 1},${c}`));
                neighbors.push(tileMap.get(`${r - 1},${c + 1}`));
            } else {
                // If r=0, offset 0. r-1 would have been Up, offset s/2.
                neighbors.push(tileMap.get(`${r - 1},${c}`));
                neighbors.push(tileMap.get(`${r - 1},${c - 1}`));
            }
        }
        // Bottom peak shared with row below (r+1, which is Up-pointing)
        // Row r and r+1 have SAME xOffset.
        if (r < rows - 1) {
          neighbors.push(tileMap.get(`${r + 1},${c}`));
        }
      } else {
        // Up-pointing house
        // Top peak shared with row above (r-1, which is Down-pointing)
        // Row r and r-1 have SAME xOffset.
        if (r > 0) {
          neighbors.push(tileMap.get(`${r - 1},${c}`));
        }
        // Bottom edge (flat) shared with row below (r+1, which is Down-pointing)
        if (r < rows - 1) {
            // Row r and r+1 have DIFFERENT xOffsets.
            if (xOffset > 0) {
                neighbors.push(tileMap.get(`${r + 1},${c}`));
                neighbors.push(tileMap.get(`${r + 1},${c + 1}`));
            } else {
                neighbors.push(tileMap.get(`${r + 1},${c}`));
                neighbors.push(tileMap.get(`${r + 1},${c - 1}`));
            }
        }
      }

      tiles.push({
        id,
        colorId: Math.floor(rng() * colorCount),
        ownerId: null,
        points,
        neighbors: [...new Set(neighbors.filter(n => n !== undefined))]
      });
    }
  }

  const startTileIds = [
    0,
    rows * cols - 1,
    cols - 1,
    (rows - 1) * cols
  ];

  return {
    version: 1,
    generator: "pentagon",
    width: (cols + 1) * s,
      height: (Math.ceil(rows / 2)) * (2 * h + 3 * p),
    tiles,
    startTileIds
  };
}
