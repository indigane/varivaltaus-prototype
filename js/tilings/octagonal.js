/**
 * Generates a 4.8.8 semi-regular tessellation board.
 * Each vertex is surrounded by one square and two octagons.
 * The board consists of flat-topped regular octagons on a rectangular grid,
 * with squares filling the gaps between diagonal octagon pairs.
 */
export function generateOctagonalBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;

  // Apothem of a regular octagon with side length a (center to edge midpoint)
  const apothem = a * (1 + Math.sqrt(2)) / 2;
  // Circumradius (center to vertex)
  const R = apothem / Math.cos(Math.PI / 8);
  // Distance between adjacent octagon centers (horizontal/vertical)
  const D = 2 * apothem;

  const tiles = [];
  const octagonMap = new Map(); // key: "q,r", value: id
  const squareMap = new Map(); // key: "x,y", value: id

  const getOctagonCenter = (q, r) => [D * q, D * r];

  let idCounter = 0;
  const idToTile = new Map();

  // 1. Generate octagons
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      const [cx, cy] = getOctagonCenter(q, r);
      const id = idCounter++;

      const points = [];
      for (let i = 0; i < 8; i++) {
        const angle = (22.5 + 45 * i) * Math.PI / 180;
        points.push([cx + R * Math.cos(angle), cy + R * Math.sin(angle)]);
      }

      const tile = {
        id,
        type: 'octagon',
        q, r,
        colorId: Math.floor(rng() * colorCount),
        ownerId: null,
        points,
        neighbors: []
      };
      tiles.push(tile);
      octagonMap.set(`${q},${r}`, id);
      idToTile.set(id, tile);
    }
  }

  // Helper to add or get a square by position
  const getSquare = (cx, cy) => {
    const key = `${Math.round(cx * 100)},${Math.round(cy * 100)}`;
    if (squareMap.has(key)) return squareMap.get(key);

    const id = idCounter++;
    const apothemSq = a / Math.SQRT2;
    const points = [
      [cx, cy - apothemSq],
      [cx + apothemSq, cy],
      [cx, cy + apothemSq],
      [cx - apothemSq, cy]
    ];

    const tile = {
      id,
      type: 'square',
      colorId: Math.floor(rng() * colorCount),
      ownerId: null,
      points,
      neighbors: []
    };
    tiles.push(tile);
    squareMap.set(key, id);
    idToTile.set(id, tile);
    return id;
  };

  // 2. Build connectivity and generate squares
  const octagonIds = tiles.filter(t => t.type === 'octagon').map(t => t.id);

  for (const oId of octagonIds) {
    const oct = idToTile.get(oId);
    const [cx, cy] = getOctagonCenter(oct.q, oct.r);

    // Distance from octagon center to square center (diagonal direction)
    const distSq = apothem + a / 2;

    // Four diagonal squares (only create if all 4 surrounding octagons exist)
    const diagonalDirs = [
      [1, 1],   // northeast
      [-1, 1],  // northwest
      [-1, -1], // southwest
      [1, -1]   // southeast
    ];

    for (const [dq, dr] of diagonalDirs) {
      // Square requires octagons at (q+dq,r), (q,r+dr), and (q+dq,r+dr)
      const nq = oct.q + dq;
      const nr = oct.r + dr;
      if (nq < 0 || nq >= cols || nr < 0 || nr >= rows) continue;

      const dx = dq * distSq / Math.SQRT2;
      const dy = dr * distSq / Math.SQRT2;
      const scx = cx + dx;
      const scy = cy + dy;
      const sId = getSquare(scx, scy);
      const square = idToTile.get(sId);

      if (!oct.neighbors.includes(sId)) oct.neighbors.push(sId);
      if (!square.neighbors.includes(oId)) square.neighbors.push(oId);
    }

    // Four orthogonal octagon neighbors
    const orthogonalDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dq, dr] of orthogonalDirs) {
      const nq = oct.q + dq;
      const nr = oct.r + dr;
      if (nq < 0 || nq >= cols || nr < 0 || nr >= rows) continue;

      const nId = octagonMap.get(`${nq},${nr}`);
      if (nId === undefined) continue;
      const neighbor = idToTile.get(nId);

      if (!oct.neighbors.includes(nId)) oct.neighbors.push(nId);
      if (!neighbor.neighbors.includes(oId)) neighbor.neighbors.push(oId);
    }
  }

  // 3. Finalize
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
    octagonMap.get(`0,0`),
    octagonMap.get(`${cols - 1},0`),
    octagonMap.get(`0,${rows - 1}`),
    octagonMap.get(`${cols - 1},${rows - 1}`)
  ].filter(id => id !== undefined);

  return {
    version: 1,
    generator: "4.8.8",
    width: maxX - minX,
    height: maxY - minY,
    tiles,
    startTileIds
  };
}
