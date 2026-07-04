/**
 * Generates a basket-weave tiling board as a graph.
 *
 * The pattern is built on a square unit grid from congruent 3x1 rectangles
 * in alternating horizontal/vertical orientations, with 1x1 square tiles in
 * the gaps.  Rectangles are emitted with collinear perimeter vertices at unit
 * intervals so renderer edge maps can match the smaller neighboring edges.
 */
export function generateBasketWeaveBoard(options) {
  const { cols, rows, tileSize, colorCount, rng } = options;
  const unit = tileSize;
  const rawTiles = [];
  const seen = new Set();
  const pad = 4;

  const mod = (n, m) => ((n % m) + m) % m;

  const intersectsTarget = (weaveType, ix, iy, w, h) => {
    const overlapsTarget = ix < cols && ix + w > 0 && iy < rows && iy + h > 0;
    if (overlapsTarget) return true;

    // Balance the natural top/right protrusions by also keeping the matching
    // vertical strips that touch both side edges and horizontal strips that
    // touch the bottom edge.
    const touchesLeftEdge = weaveType === 'vertical' && ix + w === 0 && iy < rows && iy + h > 0;
    const touchesRightEdge = weaveType === 'vertical' && ix === cols && iy < rows && iy + h > 0;
    const touchesBottomEdge = weaveType === 'horizontal' && iy === rows && ix < cols && ix + w > 0;
    return touchesLeftEdge || touchesRightEdge || touchesBottomEdge;
  };

  const addTile = (weaveType, ix, iy, w, h) => {
    if (!intersectsTarget(weaveType, ix, iy, w, h)) return;
    const key = `${ix},${iy},${w},${h}`;
    if (seen.has(key)) return;
    seen.add(key);
    rawTiles.push({ weaveType, ix, iy, w, h });
  };

  const minX = -pad;
  const maxX = cols + pad;
  const minY = -pad;
  const maxY = rows + pad;

  // Horizontal 3x1 rectangles: even rows, staggered by phase modulo 4.
  for (let iy = minY; iy <= maxY; iy++) {
    if (mod(iy, 2) !== 0) continue;
    for (let ix = minX; ix <= maxX; ix++) {
      if (mod(ix, 4) === mod(iy, 4)) {
        addTile('horizontal', ix, iy, 3, 1);
      }
    }
  }

  // Vertical 1x3 rectangles: odd columns, staggered by phase modulo 4.
  for (let ix = minX; ix <= maxX; ix++) {
    if (mod(ix, 2) !== 1) continue;
    for (let iy = minY; iy <= maxY; iy++) {
      if (mod(iy, 4) === mod(ix, 4)) {
        addTile('vertical', ix, iy, 1, 3);
      }
    }
  }

  // 1x1 squares sit on odd rows and even columns.
  for (let iy = minY; iy <= maxY; iy++) {
    if (mod(iy, 2) !== 1) continue;
    for (let ix = minX; ix <= maxX; ix++) {
      if (mod(ix, 2) === 0) {
        addTile('square', ix, iy, 1, 1);
      }
    }
  }

  // Stable spatial order keeps tile IDs predictable and start positions sane.
  rawTiles.sort((a, b) => {
    const ay = a.iy + a.h / 2;
    const by = b.iy + b.h / 2;
    if (ay !== by) return ay - by;
    const ax = a.ix + a.w / 2;
    const bx = b.ix + b.w / 2;
    return ax - bx;
  });

  const tiles = rawTiles.map((raw, id) => ({
    id,
    colorId: Math.floor(rng() * colorCount),
    ownerId: null,
    points: rectanglePoints(raw.ix * unit, raw.iy * unit, raw.w, raw.h, unit),
    neighbors: [],
    weaveType: raw.weaveType
  }));

  const cellToTile = new Map();
  rawTiles.forEach((tile, tileId) => {
    for (let dy = 0; dy < tile.h; dy++) {
      for (let dx = 0; dx < tile.w; dx++) {
        cellToTile.set(`${tile.ix + dx},${tile.iy + dy}`, tileId);
      }
    }
  });

  const neighborSets = tiles.map(() => new Set());
  for (const [key, tileId] of cellToTile.entries()) {
    const [x, y] = key.split(',').map(Number);
    for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) {
      const neighborId = cellToTile.get(`${nx},${ny}`);
      if (neighborId !== undefined && neighborId !== tileId) {
        neighborSets[tileId].add(neighborId);
        neighborSets[neighborId].add(tileId);
      }
    }
  }

  tiles.forEach((tile, id) => {
    tile.neighbors = [...neighborSets[id]].sort((a, b) => a - b);
  });

  let bbox = computeBoundingBox(tiles);
  for (const tile of tiles) {
    tile.points = tile.points.map(([x, y]) => [x - bbox.minX, y - bbox.minY]);
  }
  bbox = computeBoundingBox(tiles);

  const startTileIds = uniqueIds([
    closestTileId(tiles, 0, 0),
    closestTileId(tiles, bbox.maxX, bbox.maxY),
    closestTileId(tiles, bbox.maxX, 0),
    closestTileId(tiles, 0, bbox.maxY)
  ]);

  return {
    version: 1,
    generator: 'basket-weave',
    width: bbox.maxX,
    height: bbox.maxY,
    cols,
    rows,
    tiles,
    startTileIds
  };
}

function rectanglePoints(x, y, wCells, hCells, unit) {
  const points = [];

  for (let i = 0; i <= wCells; i++) points.push([x + i * unit, y]);
  for (let j = 1; j <= hCells; j++) points.push([x + wCells * unit, y + j * unit]);
  for (let i = wCells - 1; i >= 0; i--) points.push([x + i * unit, y + hCells * unit]);
  for (let j = hCells - 1; j >= 1; j--) points.push([x, y + j * unit]);

  return points;
}

function computeBoundingBox(tiles) {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const tile of tiles) {
    for (const [x, y] of tile.points) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return { minX, minY, maxX, maxY };
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
