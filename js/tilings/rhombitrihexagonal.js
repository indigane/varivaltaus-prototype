/**
 * Generates a Rhombitrihexagonal tiling board (3.4.6.4).
 * This tiling consists of hexagons, squares, and triangles.
 * Every vertex is shared by one hexagon, two squares, and one triangle.
 */
export function generateRhombitrihexagonalBoard(options) {
  const { cols, rows, tileSize: radius, colorCount, rng } = options;
  const a = radius; // side length of all polygons
  const D = a * (1 + Math.sqrt(3)); // distance between hexagon centers

  const tiles = [];
  const hexMap = new Map(); // key: "q,r", value: id
  const squareMap = new Map(); // key: "x,y", value: id
  const triangleMap = new Map(); // key: "x,y", value: id

  const getHexCenter = (q, r) => {
    const x = D * (q + r / 2);
    const y = D * (Math.sqrt(3) / 2) * r;
    return [x, y];
  };

  const idToTile = new Map();

  // 1. Generate Hexagons
  let idCounter = 0;
  for (let r = 0; r < rows; r++) {
    const r_offset = Math.floor(r / 2);
    for (let q = -r_offset; q < cols - r_offset; q++) {
      const [cx, cy] = getHexCenter(q, r);
      const id = idCounter++;

      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (60 * i - 30) * Math.PI / 180;
        points.push([cx + a * Math.cos(angle), cy + a * Math.sin(angle)]);
      }

      const tile = {
        id,
        type: 'hex',
        q, r,
        colorId: Math.floor(rng() * colorCount),
        ownerId: null,
        points,
        neighbors: []
      };
      tiles.push(tile);
      hexMap.set(`${q},${r}`, id);
      idToTile.set(id, tile);
    }
  }

  // Helper to add or get a tile by position
  const getSquare = (cx, cy, angle) => {
    const key = `${Math.round(cx * 100)},${Math.round(cy * 100)}`;
    if (squareMap.has(key)) return squareMap.get(key);

    const id = idCounter++;
    const points = [];
    for (let i = 0; i < 4; i++) {
      const vAngle = angle + (45 + 90 * i) * Math.PI / 180;
      points.push([
        cx + (a / Math.sqrt(2)) * Math.cos(vAngle),
        cy + (a / Math.sqrt(2)) * Math.sin(vAngle)
      ]);
    }

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

  const getTriangle = (cx, cy, angle) => {
    const key = `${Math.round(cx * 100)},${Math.round(cy * 100)}`;
    if (triangleMap.has(key)) return triangleMap.get(key);

    const id = idCounter++;
    const points = [];
    const distToVertex = a / Math.sqrt(3);
    for (let i = 0; i < 3; i++) {
      const vAngle = angle + (120 * i) * Math.PI / 180;
      points.push([
        cx + distToVertex * Math.cos(vAngle),
        cy + distToVertex * Math.sin(vAngle)
      ]);
    }

    const tile = {
      id,
      type: 'triangle',
      colorId: Math.floor(rng() * colorCount),
      ownerId: null,
      points,
      neighbors: []
    };
    tiles.push(tile);
    triangleMap.set(key, id);
    idToTile.set(id, tile);
    return id;
  };

  // 2. Build connectivity and generate squares/triangles
  const hexIds = tiles.filter(t => t.type === 'hex').map(t => t.id);
  const distS = (a * Math.sqrt(3) / 2) + (a / 2);
  const distT = a + (a / Math.sqrt(3));

  for (const hId of hexIds) {
    const hex = idToTile.get(hId);
    const [cx, cy] = getHexCenter(hex.q, hex.r);

    for (let i = 0; i < 6; i++) {
      // Squares
      const angleS = (60 * i) * Math.PI / 180;
      const scx = cx + distS * Math.cos(angleS);
      const scy = cy + distS * Math.sin(angleS);
      const sId = getSquare(scx, scy, angleS);
      const square = idToTile.get(sId);

      if (!hex.neighbors.includes(sId)) hex.neighbors.push(sId);
      if (!square.neighbors.includes(hId)) square.neighbors.push(hId);

      // Triangles
      const angleT = (60 * i - 30) * Math.PI / 180;
      const tcx = cx + distT * Math.cos(angleT);
      const tcy = cy + distT * Math.sin(angleT);

      const tId = getTriangle(tcx, tcy, angleT + Math.PI);
      const triangle = idToTile.get(tId);

      // This triangle tId is adjacent to Square at 60*i AND Square at 60*(i-1).
      const angleS1 = (60 * i) * Math.PI / 180;
      const scx1 = cx + distS * Math.cos(angleS1);
      const scy1 = cy + distS * Math.sin(angleS1);
      const sId1 = getSquare(scx1, scy1, angleS1);
      const square1 = idToTile.get(sId1);

      if (!triangle.neighbors.includes(sId1)) triangle.neighbors.push(sId1);
      if (!square1.neighbors.includes(tId)) square1.neighbors.push(tId);

      const angleS2 = (60 * (i - 1)) * Math.PI / 180;
      const scx2 = cx + distS * Math.cos(angleS2);
      const scy2 = cy + distS * Math.sin(angleS2);
      const sId2 = getSquare(scx2, scy2, angleS2);
      const square2 = idToTile.get(sId2);

      if (!triangle.neighbors.includes(sId2)) triangle.neighbors.push(sId2);
      if (!square2.neighbors.includes(tId)) square2.neighbors.push(tId);
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
    hexMap.get(`${0},${0}`),
    hexMap.get(`${cols - 1},0`),
    hexMap.get(`${-Math.floor((rows - 1) / 2)},${rows - 1}`),
    hexMap.get(`${cols - 1 - Math.floor((rows - 1) / 2)},${rows - 1}`)
  ].filter(id => id !== undefined);

  return {
    version: 1,
    generator: "rhombitrihexagonal",
    width: maxX - minX,
    height: maxY - minY,
    tiles,
    startTileIds
  };
}
