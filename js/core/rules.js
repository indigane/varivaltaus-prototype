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

  const rules = state.rules;
  const playerTiles = state.board.tiles.filter(t => t.ownerId === playerId);
  if (playerTiles.length === 0) return true; // Should not happen if alive

  const currentColorId = playerTiles[0].colorId;

  if (rules.colorRestrictions === "notOwnColor") {
    return colorId !== currentColorId;
  }

  if (rules.colorRestrictions === "notAnyPlayerColor") {
    for (const tile of state.board.tiles) {
      if (tile.ownerId !== null && tile.colorId === colorId) {
        return false;
      }
    }
    return true;
  }

  if (rules.colorRestrictions === "notAdjacentEnemyColor") {
    if (colorId === currentColorId) return false;

    // Check neighbors of all owned tiles
    for (const tile of playerTiles) {
      for (const neighborId of tile.neighbors) {
        const neighbor = state.board.tiles[neighborId];
        if (neighbor.ownerId !== null && neighbor.ownerId !== playerId && neighbor.colorId === colorId) {
          return false;
        }
      }
    }
    return true;
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
