import { getVertexId, validateBoard } from "../core/utils.js";

/**
 * Elongated Triangular Tiling (3.3.3.4.4)
 * Consists of strips of triangles separated by strips of squares.
 */
export function generateElongatedTriangularBoard(options) {
  const { cols, rows, tileSize: a, colorCount, rng } = options;
  const tiles = [];
  const vertexMap = new Map();
  const addedShapes = new Set();

  const h_tri = (a * Math.sqrt(3)) / 2;
  const rowHeight = a + h_tri;

  // We want to ensure it starts and ends with squares if possible.
  // The loop generates one unit (square row + triangle row) per 'r'.
  // We'll generate r from 0 to rows-1, and then one extra square row.

  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      // 1. Squares
      let sx = q * a + (r % 2 === 1 ? a / 2 : 0);
      let sy = r * rowHeight;

      const sqPoints = [
        [sx, sy],
        [sx + a, sy],
        [sx + a, sy + a],
        [sx, sy + a],
      ];
      const sqVIds = sqPoints.map((p) => getVertexId(p, vertexMap));
      const sqKey = "s" + [...sqVIds].sort((a, b) => a - b).join(",");
      if (!addedShapes.has(sqKey)) {
        addedShapes.add(sqKey);
        tiles.push({
          id: tiles.length,
          colorId: Math.floor(rng() * colorCount),
          points: sqPoints,
          vIds: sqVIds,
          neighbors: []
        });
      }

      // 2. Triangles (only if not the very last row, to end with squares)
      // Actually, if we want to end with squares, we just don't add triangles after the last square row.
      if (r < rows - 1) {
        let tx = q * a + (r % 2 === 1 ? a / 2 : 0);
        let ty = r * rowHeight + a;

        // Tri 1 (Up)
        const tri1Points = [
          [tx, ty],
          [tx + a, ty],
          [tx + a / 2, ty + h_tri],
        ];
        const tri1VIds = tri1Points.map((p) => getVertexId(p, vertexMap));
        const tri1Key = "t" + [...tri1VIds].sort((a, b) => a - b).join(",");
        if (!addedShapes.has(tri1Key)) {
          addedShapes.add(tri1Key);
          tiles.push({
            id: tiles.length,
            colorId: Math.floor(rng() * colorCount),
            points: tri1Points,
            vIds: tri1VIds,
            neighbors: []
          });
        }

        // Tri 2 (Down) - need to handle offset
        const tri2Points = [
          [tx + a / 2, ty + h_tri],
          [tx + 3 * (a / 2), ty + h_tri],
          [tx + a, ty],
        ];
        const tri2VIds = tri2Points.map((p) => getVertexId(p, vertexMap));
        const tri2Key = "t" + [...tri2VIds].sort((a, b) => a - b).join(",");
        if (!addedShapes.has(tri2Key)) {
          addedShapes.add(tri2Key);
          tiles.push({
            id: tiles.length,
            colorId: Math.floor(rng() * colorCount),
            points: tri2Points,
            vIds: tri2VIds,
            neighbors: []
          });
        }

        // Extra Tri 2 to the left for odd rows
        if (q === 0) {
           const triLPoints = [
             [tx - a / 2, ty + h_tri],
             [tx + a / 2, ty + h_tri],
             [tx, ty]
           ];
           const triLVIds = triLPoints.map(p => getVertexId(p, vertexMap));
           const triLKey = "t" + [...triLVIds].sort((a,b)=>a-b).join(",");
           if (!addedShapes.has(triLKey)) {
             addedShapes.add(triLKey);
             tiles.push({
               id: tiles.length,
               colorId: Math.floor(rng() * colorCount),
               points: triLPoints,
               vIds: triLVIds,
               neighbors: []
             });
           }
        }
      }
    }
  }

  // Connectivity
  const vertexToTiles = [];
  tiles.forEach((tile) => {
    tile.vIds.forEach((vId) => {
      if (!vertexToTiles[vId]) vertexToTiles[vId] = [];
      vertexToTiles[vId].push(tile.id);
    });
  });

  tiles.forEach((tile) => {
    const counts = new Map();
    tile.vIds.forEach(vId => {
      vertexToTiles[vId].forEach(otherId => {
        if (otherId === tile.id) return;
        counts.set(otherId, (counts.get(otherId) || 0) + 1);
      });
    });
    counts.forEach((count, otherId) => {
      if (count >= 2) tile.neighbors.push(otherId);
    });
  });

  // Finalize bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  tiles.forEach((t) => {
    t.points.forEach((p) => {
      if (p[0] < minX) minX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] > maxY) maxY = p[1];
    });
  });

  tiles.forEach((t) => {
    t.points.forEach((p) => {
      p[0] -= minX;
      p[1] -= minY;
    });
  });

  const width = maxX - minX;
  const height = maxY - minY;

  const findClosest = (tx, ty) => {
    let bestId = 0;
    let minDist = Infinity;
    tiles.forEach((t) => {
      const cx = t.points.reduce((sum, p) => sum + p[0], 0) / t.points.length;
      const cy = t.points.reduce((sum, p) => sum + p[1], 0) / t.points.length;
      const d = Math.pow(cx - tx, 2) + Math.pow(cy - ty, 2);
      if (d < minDist) {
        minDist = d;
        bestId = t.id;
      }
    });
    return bestId;
  };

  const startTileIds = [
    findClosest(0, 0),
    findClosest(width, 0),
    findClosest(0, height),
    findClosest(width, height),
  ];

  const board = {
    version: 1,
    generator: "elongated-triangular",
    width,
    height,
    cols,
    rows,
    tiles,
    startTileIds,
  };

  validateBoard(board);
  return board;
}
