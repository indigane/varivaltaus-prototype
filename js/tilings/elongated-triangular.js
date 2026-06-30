/**
 * Generates an Elongated Triangular tiling board (3.3.3.4.4).
 * This tiling consists of squares and triangles.
 * Pattern around vertex: triangle-triangle-triangle-square-square.
 */
export function generateElongatedTriangularBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;

  const h = a * Math.sqrt(3) / 2;

  let tiles = [];
  let idCounter = 0;

  for (let r = 0; r < rows; r++) {
    const isSquareRow = (r % 2 === 0);
    const squareRowIdx = Math.floor(r / 2);
    let yBase = squareRowIdx * (a + h);
    if (!isSquareRow) yBase += a;

    let offset = 0;
    if (isSquareRow && (squareRowIdx % 2 === 0)) {
      offset = a / 2;
    }

    if (isSquareRow) {
      for (let q = 0; q < cols; q++) {
        const x = q * a + offset;
        const y = yBase;
        const points = [
          [x, y],
          [x + a, y],
          [x + a, y + a],
          [x, y + a]
        ];
        tiles.push({
          id: idCounter++,
          colorId: Math.floor(rng() * colorCount),
          ownerId: null,
          points,
          neighbors: []
        });
      }
    } else {
      const offsetBelow = (squareRowIdx % 2 === 0) ? a / 2 : 0;
      const offsetAbove = a / 2 - offsetBelow;

      for (let q = -1; q < cols + 1; q++) {
        const xBelow = q * a + offsetBelow;
        const xAbove = q * a + offsetAbove;

        // Up triangle
        const pUp = [
          [xBelow, yBase],
          [xBelow + a, yBase],
          [offsetBelow > offsetAbove ? xAbove : xAbove + a, yBase + h]
        ];
        tiles.push({
          id: idCounter++,
          colorId: Math.floor(rng() * colorCount),
          ownerId: null,
          points: pUp,
          neighbors: []
        });

        // Down triangle
        const pDown = [
          [xAbove, yBase + h],
          [xAbove + a, yBase + h],
          [offsetBelow < offsetAbove ? xBelow + a : xBelow, yBase]
        ];
        tiles.push({
          id: idCounter++,
          colorId: Math.floor(rng() * colorCount),
          ownerId: null,
          points: pDown,
          neighbors: []
        });
      }
    }
  }

  // Finalize
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

  const targetWidth = cols * a;
  const finalTiles = [];
  let newIdCounter = 0;

  for (const t of tiles) {
    const centroidX = t.points.reduce((sum, p) => sum + p[0], 0) / t.points.length;
    if (centroidX >= minX && centroidX <= minX + targetWidth) {
      t.id = newIdCounter++;
      t.points = t.points.map(p => [p[0] - minX, p[1] - minY]);
      t.neighbors = [];
      finalTiles.push(t);
    }
  }

  // Connectivity
  for (let i = 0; i < finalTiles.length; i++) {
    for (let j = i + 1; j < finalTiles.length; j++) {
      let common = 0;
      for (const p1 of finalTiles[i].points) {
        for (const p2 of finalTiles[j].points) {
          const dx = p1[0] - p2[0];
          const dy = p1[1] - p2[1];
          if (dx * dx + dy * dy < 0.01) {
            common++;
            break;
          }
        }
      }
      if (common >= 2) {
        finalTiles[i].neighbors.push(finalTiles[j].id);
        finalTiles[j].neighbors.push(finalTiles[i].id);
      }
    }
  }

  return {
    version: 1,
    generator: "elongated-triangular",
    width: targetWidth,
    height: maxY - minY,
    tiles: finalTiles,
    startTileIds: [0, finalTiles.length - 1]
  };
}
