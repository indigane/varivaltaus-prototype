/**
 * Generates a waffle tiling board as a graph.
 *
 * Each logical grid cell is subdivided into a smaller central square and four
 * congruent trapezoids around it.  The outer edges remain on a square lattice,
 * while the diagonal seams from each lattice corner to the central square give
 * the repeated waffle-like pattern.
 */
export function generateWaffleBoard(options) {
  const { cols, rows, tileSize, colorCount, rng } = options;
  const unit = tileSize;
  const cellSize = unit * 2;
  const inset = unit / 2;
  const tileTypes = ['center', 'top', 'right', 'bottom', 'left'];
  const typeIndex = Object.fromEntries(tileTypes.map((type, index) => [type, index]));
  const tiles = [];

  const idAt = (row, col, type) => ((row * cols + col) * tileTypes.length) + typeIndex[type];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cellSize;
      const y = row * cellSize;

      for (const type of tileTypes) {
        const id = idAt(row, col, type);
        tiles.push({
          id,
          colorId: Math.floor(rng() * colorCount),
          ownerId: null,
          points: waffleTilePoints(x, y, cellSize, inset, type),
          neighbors: [],
          waffleType: type
        });
      }
    }
  }

  const neighborSets = tiles.map(() => new Set());
  const addNeighbor = (a, b) => {
    if (a === b || a < 0 || b < 0 || a >= tiles.length || b >= tiles.length) return;
    neighborSets[a].add(b);
    neighborSets[b].add(a);
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const center = idAt(row, col, 'center');
      const top = idAt(row, col, 'top');
      const right = idAt(row, col, 'right');
      const bottom = idAt(row, col, 'bottom');
      const left = idAt(row, col, 'left');

      // Central square borders all four trapezoids.
      addNeighbor(center, top);
      addNeighbor(center, right);
      addNeighbor(center, bottom);
      addNeighbor(center, left);

      // Adjacent trapezoids in the same logical cell share the diagonal seams.
      addNeighbor(top, left);
      addNeighbor(top, right);
      addNeighbor(right, bottom);
      addNeighbor(bottom, left);

      // Trapezoids across square-lattice edges are also adjacent.
      if (row > 0) addNeighbor(top, idAt(row - 1, col, 'bottom'));
      if (col < cols - 1) addNeighbor(right, idAt(row, col + 1, 'left'));
      if (row < rows - 1) addNeighbor(bottom, idAt(row + 1, col, 'top'));
      if (col > 0) addNeighbor(left, idAt(row, col - 1, 'right'));
    }
  }

  tiles.forEach((tile, id) => {
    tile.neighbors = [...neighborSets[id]].sort((a, b) => a - b);
  });

  const width = cols * cellSize;
  const height = rows * cellSize;
  const startTileIds = uniqueIds([
    closestTileId(tiles, 0, 0),
    closestTileId(tiles, width, height),
    closestTileId(tiles, width, 0),
    closestTileId(tiles, 0, height)
  ]);

  return {
    version: 1,
    generator: 'waffle',
    width,
    height,
    cols,
    rows,
    tiles,
    startTileIds
  };
}

function waffleTilePoints(x, y, cellSize, inset, type) {
  const x0 = x;
  const x1 = x + inset;
  const x2 = x + cellSize - inset;
  const x3 = x + cellSize;
  const y0 = y;
  const y1 = y + inset;
  const y2 = y + cellSize - inset;
  const y3 = y + cellSize;

  if (type === 'center') {
    return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
  }
  if (type === 'top') {
    return [[x0, y0], [x3, y0], [x2, y1], [x1, y1]];
  }
  if (type === 'right') {
    return [[x3, y0], [x3, y3], [x2, y2], [x2, y1]];
  }
  if (type === 'bottom') {
    return [[x3, y3], [x0, y3], [x1, y2], [x2, y2]];
  }
  if (type === 'left') {
    return [[x0, y3], [x0, y0], [x1, y1], [x1, y2]];
  }

  throw new Error(`Unknown waffle tile type: ${type}`);
}

function closestTileId(tiles, tx, ty) {
  let bestId = -1;
  let bestDist = Infinity;

  for (const tile of tiles) {
    const [cx, cy] = centroid(tile.points);
    const dist = Math.hypot(cx - tx, cy - ty);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = tile.id;
    }
  }

  return bestId;
}

function centroid(points) {
  let x = 0, y = 0;
  for (const [px, py] of points) {
    x += px;
    y += py;
  }
  return [x / points.length, y / points.length];
}

function uniqueIds(ids) {
  return [...new Set(ids)].filter(id => id !== -1);
}
