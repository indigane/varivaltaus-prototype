export function defaultRules() {
  return {
    winCondition: "mostTiles",
    turnOrder: "players",
    teamTerritory: "separatePlayers", // "separatePlayers" or "merged"
    captureMode: "neutralOnly",
    colorRestrictions: "notOwnColor",
    startingPositions: "corners",
    maxTurns: 100,
    startingAreaSize: 1,
    startingAreaBuffer: true,
    allowSameStartingColor: false
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
  const player = state.players[playerId];

  if (tile.ownerId !== null) {
    // If team territory is merged, you already "own" teammates' tiles logically
    // but the engine might still track individual ownership for scoring.
    // However, floodCapture should treat teammates as already captured.
    if (rules.teamTerritory === "merged") {
      const tileOwner = state.players[tile.ownerId];
      if (tileOwner.teamId === player.teamId) {
        return false; // Already "yours" through team
      }
    }

    if (rules.captureMode === "canCaptureEnemies") {
      if (tile.ownerId === playerId) return false;

      // Cannot capture teammates
      const tileOwner = state.players[tile.ownerId];
      if (tileOwner.teamId === player.teamId) return false;

      return true;
    }
    return false;
  }

  return true; // Neutral tiles are always capturable
}
