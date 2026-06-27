export function defaultRules() {
  return {
    winCondition: "mostTiles",
    turnOrder: "players",
    teamTerritory: "separatePlayers",
    captureMode: "neutralOnly",
    colorRestrictions: "notOwnColor",
    startingPositions: "corners",
    maxTurns: 25
  };
}

export function isLegalMove(state, playerId, colorId) {
  if (state.status !== "playing") return false;
  if (state.currentPlayerId !== playerId) return false;
  if (colorId < 0 || colorId >= state.colorCount) return false;

  const player = state.players[playerId];
  if (!player.alive) return false;

  // Simple notOwnColor rule: cannot pick the color the player already has
  // In our simplified prototype, all player's tiles have the same color.
  // We can find any tile owned by the player to check its color.
  const ownedTile = state.board.tiles.find(t => t.ownerId === playerId);
  if (ownedTile && ownedTile.colorId === colorId) {
    return false;
  }

  return true;
}

export function canCaptureTile(state, playerId, tileId) {
  const tile = state.board.tiles[tileId];
  const rules = state.rules;

  if (tile.ownerId !== null) {
    if (rules.captureMode === "canCaptureEnemies") {
      // Cannot capture own tiles (already owned)
      if (tile.ownerId === playerId) return false;

      // In team games, maybe cannot capture teammates?
      // For now, assume separatePlayers means you can't capture anyone's tiles
      // unless specifically enabled.
      return true;
    }
    return false;
  }

  return true; // Neutral tiles are always capturable
}
