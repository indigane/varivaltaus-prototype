/**
 * Helper functions for working with the board graph.
 */

export function getTile(board, id) {
  return board.tiles[id];
}

export function validateBoardGraph(board) {
  if (!board || !Array.isArray(board.tiles) || board.tiles.length === 0) {
    return false;
  }

  const ids = new Set();
  for (const tile of board.tiles) {
    if (ids.has(tile.id)) return false; // Duplicate ID
    ids.add(tile.id);
  }

  for (const tile of board.tiles) {
    for (const neighborId of tile.neighbors) {
      if (!ids.has(neighborId)) return false; // Neighbor does not exist

      // Symmetric check
      const neighbor = board.tiles[neighborId];
      if (!neighbor) {
        console.error(`Neighbor ${neighborId} of tile ${tile.id} not found`);
        return false;
      }
      if (!neighbor.neighbors.includes(tile.id)) {
        console.error(`Symmetry failed: Tile ${tile.id} has neighbor ${neighborId}, but ${neighborId} does not have ${tile.id}`);
        return false;
      }

      if (neighborId === tile.id) return false; // Self-neighbor
    }

    // Duplicate neighbor check
    if (new Set(tile.neighbors).size !== tile.neighbors.length) return false;
  }

  return true;
}
