/**
 * Helper functions for tiling generation.
 */

export function getVertexId(p, vertexMap) {
  const precision = 5;
  const x = Array.isArray(p) ? p[0] : p.x;
  const y = Array.isArray(p) ? p[1] : p.y;
  const key = `${x.toFixed(precision)},${y.toFixed(precision)}`;
  if (vertexMap.has(key)) return vertexMap.get(key);
  const id = vertexMap.size;
  vertexMap.set(key, id);
  return id;
}

export function distanceSq(p1, p2) {
  const x1 = Array.isArray(p1) ? p1[0] : p1.x;
  const y1 = Array.isArray(p1) ? p1[1] : p1.y;
  const x2 = Array.isArray(p2) ? p2[0] : p2.x;
  const y2 = Array.isArray(p2) ? p2[1] : p2.y;
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

export function validateBoard(board) {
  if (!board.tiles || board.tiles.length === 0) {
    throw new Error("Board has no tiles");
  }
  // Simple check for neighbor symmetry
  const tileMap = new Map(board.tiles.map(t => [t.id, t]));
  for (const tile of board.tiles) {
    for (const neighborId of tile.neighbors) {
      const neighbor = tileMap.get(neighborId);
      if (!neighbor) {
        // console.error(`Tile ${tile.id} has non-existent neighbor ${neighborId}`);
        continue;
      }
      if (!neighbor.neighbors.includes(tile.id)) {
        neighbor.neighbors.push(tile.id);
      }
    }
  }
}
