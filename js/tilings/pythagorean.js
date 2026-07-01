/**
 * Generates a Pythagorean tiling board (two squares tessellation).
 * This tiling consists of squares of two different sizes.
 * Each large square is surrounded by four small squares and four large squares.
 * Each small square is surrounded by four large squares.
 * This version fills a rectangular area.
 */
export function generatePythagoreanBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;
  const b = a * 0.5; // Side length of the small square

  const W = cols * a;
  const H = rows * a;
  const D = a * a + b * b;

  // Lattice range to cover the rectangle [0, W] x [0, H]
  const iMin = -2; // a bit of padding
  const iMax = Math.ceil((a * W + b * H) / D) + 2;
  const jMin = Math.floor(-b * W / D) - 2;
  const jMax = Math.ceil(a * H / D) + 2;

  const rawTiles = [];
  const largeMap = new Map(); // key: "i,j", value: rawTile
  const smallMap = new Map(); // key: "i,j", value: rawTile

  const getLargeCenter = (i, j) => [i * a - j * b, i * b + j * a];
  const getSmallCenter = (i, j) => {
    const [cx, cy] = getLargeCenter(i, j);
    return [cx + (a + b) / 2, cy + (b - a) / 2];
  };

  // 1. Generate candidate squares and filter by rectangle
  for (let j = jMin; j <= jMax; j++) {
    for (let i = iMin; i <= iMax; i++) {
      // Large square
      const [lcx, lcy] = getLargeCenter(i, j);
      if (lcx >= 0 && lcx <= W && lcy >= 0 && lcy <= H) {
        const lPoints = [
          [lcx - a / 2, lcy - a / 2],
          [lcx + a / 2, lcy - a / 2],
          [lcx + a / 2, lcy + a / 2],
          [lcx - a / 2, lcy + a / 2]
        ];
        const lTile = {
          type: 'large',
          i, j,
          colorId: Math.floor(rng() * colorCount),
          ownerId: null,
          points: lPoints,
          neighbors: []
        };
        rawTiles.push(lTile);
        largeMap.set(`${i},${j}`, lTile);
      }

      // Small square
      const [scx, scy] = getSmallCenter(i, j);
      if (scx >= 0 && scx <= W && scy >= 0 && scy <= H) {
        const sPoints = [
          [scx - b / 2, scy - b / 2],
          [scx + b / 2, scy - b / 2],
          [scx + b / 2, scy + b / 2],
          [scx - b / 2, scy + b / 2]
        ];
        const sTile = {
          type: 'small',
          i, j,
          colorId: Math.floor(rng() * colorCount),
          ownerId: null,
          points: sPoints,
          neighbors: []
        };
        rawTiles.push(sTile);
        smallMap.set(`${i},${j}`, sTile);
      }
    }
  }

  // 2. Build connectivity among filtered tiles
  for (const tile of rawTiles) {
    const { i, j, type } = tile;
    let candidates = [];
    if (type === 'large') {
      candidates = [
        { map: largeMap, k: `${i + 1},${j}` },
        { map: largeMap, k: `${i - 1},${j}` },
        { map: largeMap, k: `${i},${j + 1}` },
        { map: largeMap, k: `${i},${j - 1}` },
        { map: smallMap, k: `${i},${j}` },
        { map: smallMap, k: `${i},${j + 1}` },
        { map: smallMap, k: `${i - 1},${j + 1}` },
        { map: smallMap, k: `${i - 1},${j}` }
      ];
    } else {
      candidates = [
        { map: largeMap, k: `${i},${j}` },
        { map: largeMap, k: `${i + 1},${j}` },
        { map: largeMap, k: `${i + 1},${j - 1}` },
        { map: largeMap, k: `${i},${j - 1}` }
      ];
    }
    for (const cand of candidates) {
      const neighbor = cand.map.get(cand.k);
      if (neighbor) {
        tile.neighbors.push(neighbor);
      }
    }
  }

  // 3. Finalize: Re-index and normalize coordinates
  const tiles = rawTiles.map((tile, index) => {
    tile.id = index;
    return tile;
  });

  // Re-map neighbors from objects to IDs
  tiles.forEach(tile => {
    tile.neighbors = tile.neighbors.map(n => n.id);
  });

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

  // Start tiles: find tiles closest to corners
  const findClosestLarge = (tx, ty) => {
    let best = -1;
    let minDist = Infinity;
    for (const t of tiles) {
      if (t.type !== 'large') continue;
      // centroid
      let cx = 0, cy = 0;
      t.points.forEach(p => { cx += p[0]; cy += p[1]; });
      cx /= 4; cy /= 4;
      const d = Math.hypot(cx - tx, cy - ty);
      if (d < minDist) {
        minDist = d;
        best = t.id;
      }
    }
    return best;
  };

  const finalW = maxX - minX;
  const finalH = maxY - minY;

  const startTileIds = [...new Set([
    findClosestLarge(0, 0),
    findClosestLarge(finalW, 0),
    findClosestLarge(0, finalH),
    findClosestLarge(finalW, finalH)
  ])].filter(id => id !== -1);

  return {
    version: 1,
    generator: "pythagorean",
    width: finalW,
    height: finalH,
    tiles,
    startTileIds
  };
}
