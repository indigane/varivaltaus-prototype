/**
 * Generates a triangle tiling board as a graph.
 */
export function generateTriangleBoard(options) {
  const { cols, rows, tileSize, colorCount, rng, shape = "rectangular" } = options;
  const tiles = [];
  const h = tileSize * Math.sqrt(3) / 2;
  const s = tileSize;

  const tileMap = new Map(); // key: "r,c", value: id

  if (shape === "rectangular") {
    let idCounter = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = idCounter++;
        tileMap.set(`${r},${c}`, id);
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = tileMap.get(`${r},${c}`);
        const isUp = (r + c) % 2 === 0;

        let points;
        if (isUp) {
          points = [
            [c * s / 2, (r + 1) * h],
            [(c + 2) * s / 2, (r + 1) * h],
            [(c + 1) * s / 2, r * h]
          ];
        } else {
          points = [
            [c * s / 2, r * h],
            [(c + 2) * s / 2, r * h],
            [(c + 1) * s / 2, (r + 1) * h]
          ];
        }

        const neighbors = [];
        if (c > 0) neighbors.push(tileMap.get(`${r},${c - 1}`));
        if (c < cols - 1) neighbors.push(tileMap.get(`${r},${c + 1}`));

        if (isUp) {
          if (r < rows - 1) neighbors.push(tileMap.get(`${r + 1},${c}`));
        } else {
          if (r > 0) neighbors.push(tileMap.get(`${r - 1},${c}`));
        }

        tiles.push({
          id,
          colorId: Math.floor(rng() * colorCount),
          ownerId: null,
          points,
          neighbors: neighbors.filter(n => n !== undefined)
        });
      }
    }

    const startTileIds = [
      tileMap.get("0,0"),
      tileMap.get(`${rows - 1},${cols - 1}`),
      tileMap.get(`0,${cols - 1}`),
      tileMap.get(`${rows - 1},0`)
    ].filter(id => id !== undefined);

    return {
      version: 1,
      generator: "triangle",
      width: (cols + 1) * s / 2,
      height: rows * h,
      tiles,
      startTileIds
    };
  } else if (shape === "triangular") {
    // Triangular board shape: 1 tri in first row, 3 in second, 5 in third...
    // rows here means the height of the large triangle
    let idCounter = 0;
    for (let r = 0; r < rows; r++) {
      const rowCols = 2 * r + 1;
      for (let c = 0; c < rowCols; c++) {
        const id = idCounter++;
        tileMap.set(`${r},${c}`, id);
      }
    }

    for (let r = 0; r < rows; r++) {
      const rowCols = 2 * r + 1;
      // Offset to center the triangle
      const rowOffset = (rows - 1 - r) * s / 2;
      for (let c = 0; c < rowCols; c++) {
        const id = tileMap.get(`${r},${c}`);
        // Row 0: Up (c=0)
        // Row 1: Up (c=0), Down (c=1), Up (c=2)
        // Row 2: Up (c=0), Down (c=1), Up (c=2), Down (c=3), Up (c=4)
        const isUp = c % 2 === 0;

        let points;
        if (isUp) {
          points = [
            [rowOffset + c * s / 2, (r + 1) * h],
            [rowOffset + (c + 2) * s / 2, (r + 1) * h],
            [rowOffset + (c + 1) * s / 2, r * h]
          ];
        } else {
          points = [
            [rowOffset + c * s / 2, r * h],
            [rowOffset + (c + 2) * s / 2, r * h],
            [rowOffset + (c + 1) * s / 2, (r + 1) * h]
          ];
        }

        const neighbors = [];
        if (c > 0) neighbors.push(tileMap.get(`${r},${c - 1}`));
        if (c < rowCols - 1) neighbors.push(tileMap.get(`${r},${c + 1}`));

        if (isUp) {
          if (r < rows - 1) neighbors.push(tileMap.get(`${r + 1},${c + 1}`));
        } else {
          if (r > 0) neighbors.push(tileMap.get(`${r - 1},${c - 1}`));
        }

        tiles.push({
          id,
          colorId: Math.floor(rng() * colorCount),
          ownerId: null,
          points,
          neighbors: neighbors.filter(n => n !== undefined)
        });
      }
    }

    const startTileIds = [
      tileMap.get("0,0"),
      tileMap.get(`${rows - 1},0`),
      tileMap.get(`${rows - 1},${2 * (rows - 1)}`)
    ].filter(id => id !== undefined);

    return {
      version: 1,
      generator: "triangle",
      width: rows * s,
      height: rows * h,
      tiles,
      startTileIds
    };
  }
}
