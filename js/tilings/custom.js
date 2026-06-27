/**
 * Loads a board from a JSON object.
 */
export function loadCustomJsonBoard(json, options = {}) {
  const { colorCount, rng } = options;
  const board = typeof json === 'string' ? JSON.parse(json) : json;

  // Basic validation
  if (!board.tiles || !Array.isArray(board.tiles)) {
    throw new Error("Invalid board: missing tiles array");
  }

  // Ensure all tiles have required fields
  for (const tile of board.tiles) {
    if (tile.id === undefined) throw new Error(`Tile missing id`);
    if (tile.points === undefined) throw new Error(`Tile ${tile.id} missing points`);
    if (tile.neighbors === undefined) throw new Error(`Tile ${tile.id} missing neighbors`);

    if (tile.colorId === undefined && colorCount !== undefined && rng !== undefined) {
      tile.colorId = Math.floor(rng() * colorCount);
    }

    if (tile.ownerId === undefined) {
      tile.ownerId = null;
    }
  }

  // Default start positions if not provided
  if (!board.startTileIds) {
    board.startTileIds = [
      board.tiles[0].id,
      board.tiles[board.tiles.length - 1].id
    ];
  }

  return {
    version: board.version || 1,
    generator: "custom",
    width: board.width || 800,
    height: board.height || 600,
    tiles: board.tiles,
    startTileIds: board.startTileIds
  };
}
