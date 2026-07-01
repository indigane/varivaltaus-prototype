/**
 * Generates a Pythagorean tiling board (two squares tessellation).
 * This tiling consists of squares of two different sizes.
 * Each large square is surrounded by four small squares and four large squares.
 * Each small square is surrounded by four large squares.
 */
export function generatePythagoreanBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;
  const b = a * 0.5; // Side length of the small square

  const tiles = [];
  const largeMap = new Map(); // key: "i,j", value: id
  const smallMap = new Map(); // key: "i,j", value: id

  // Lattice vectors for centers of large squares
  // V1 = (a, b), V2 = (-b, a)
  const getLargeCenter = (i, j) => [i * a - j * b, i * b + j * a];

  // Small square is in the hole between L(i,j), L(i+1,j), L(i+1,j-1), L(i,j-1)
  // Center is L(i,j) + ((a+b)/2, (b-a)/2) relative to L(i,j)
  // Wait, I calculated earlier: Hole center = L(i,j) + (a-b)/2, (a+b)/2 for S(i,j) between (i,j), (i+1,j), (i+1,j+1), (i,j+1)
  // Let's stick to the one I verified:
  // L(i,j) center: (ia - jb, ib + ja)
  // S(i,j) center: L(i,j) + (a/2 + b/2, b/2 - a/2) = (ia - jb + (a+b)/2, ib + ja + (b-a)/2)
  const getSmallCenter = (i, j) => {
    const [cx, cy] = getLargeCenter(i, j);
    return [cx + (a + b) / 2, cy + (b - a) / 2];
  };

  let idCounter = 0;
  const idToTile = new Map();

  // 1. Generate all large and small squares
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      // Large square
      const [lcx, lcy] = getLargeCenter(i, j);
      const lid = idCounter++;
      const lPoints = [
        [lcx - a / 2, lcy - a / 2],
        [lcx + a / 2, lcy - a / 2],
        [lcx + a / 2, lcy + a / 2],
        [lcx - a / 2, lcy + a / 2]
      ];
      const lTile = {
        id: lid,
        type: 'large',
        i, j,
        colorId: Math.floor(rng() * colorCount),
        ownerId: null,
        points: lPoints,
        neighbors: []
      };
      tiles.push(lTile);
      largeMap.set(`${i},${j}`, lid);
      idToTile.set(lid, lTile);

      // Small square
      const [scx, scy] = getSmallCenter(i, j);
      const sid = idCounter++;
      const sPoints = [
        [scx - b / 2, scy - b / 2],
        [scx + b / 2, scy - b / 2],
        [scx + b / 2, scy + b / 2],
        [scx - b / 2, scy + b / 2]
      ];
      const sTile = {
        id: sid,
        type: 'small',
        i, j,
        colorId: Math.floor(rng() * colorCount),
        ownerId: null,
        points: sPoints,
        neighbors: []
      };
      tiles.push(sTile);
      smallMap.set(`${i},${j}`, sid);
      idToTile.set(sid, sTile);
    }
  }

  // 2. Build connectivity
  for (const tile of tiles) {
    const { i, j, type } = tile;
    if (type === 'large') {
      // Large square neighbors: 4 Large, 4 Small
      const neighbors = [
        largeMap.get(`${i + 1},${j}`),
        largeMap.get(`${i - 1},${j}`),
        largeMap.get(`${i},${j + 1}`),
        largeMap.get(`${i},${j - 1}`),
        smallMap.get(`${i},${j}`),
        smallMap.get(`${i},${j + 1}`),
        smallMap.get(`${i - 1},${j + 1}`),
        smallMap.get(`${i - 1},${j}`)
      ];
      for (const nId of neighbors) {
        if (nId !== undefined) tile.neighbors.push(nId);
      }
    } else {
      // Small square S(i,j) neighbors: 4 Large
      // It touches L(i,j), L(i+1,j), L(i+1,j-1), L(i,j-1)
      const neighbors = [
        largeMap.get(`${i},${j}`),
        largeMap.get(`${i + 1},${j}`),
        largeMap.get(`${i + 1},${j - 1}`),
        largeMap.get(`${i},${j - 1}`)
      ];
      for (const nId of neighbors) {
        if (nId !== undefined) tile.neighbors.push(nId);
      }
    }
  }

  // 3. Finalize: Bounding box and offset to (0,0)
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
    largeMap.get('0,0'),
    largeMap.get(`${cols - 1},0`),
    largeMap.get(`0,${rows - 1}`),
    largeMap.get(`${cols - 1},${rows - 1}`)
  ].filter(id => id !== undefined);

  return {
    version: 1,
    generator: "pythagorean",
    width: maxX - minX,
    height: maxY - minY,
    tiles,
    startTileIds
  };
}
