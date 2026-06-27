import { defaultRules, isLegalMove, canCaptureTile } from './rules.js';
import { computePlayerScores, computeTeamScores, getWinner } from './scoring.js';

export function createGame(config) {
  const {
    board,
    players,
    teams,
    colorCount,
    paletteId,
    rngSeed,
    rules = defaultRules()
  } = config;

  const state = {
    version: 1,
    board,
    players,
    teams,
    currentPlayerId: 0,
    colorCount,
    paletteId,
    rules,
    turnNumber: 0,
    rngSeed,
    moveLog: [],
    status: "playing"
  };

  // Assign initial ownership based on starting positions
  if (state.players.length > 0) {
    state.players.forEach((player, index) => {
      const startTileId = state.board.startTileIds[index % state.board.startTileIds.length];
      const startTile = state.board.tiles[startTileId];

      // Ensure starting tiles don't overlap if possible
      if (startTile.ownerId === null) {
        startTile.ownerId = player.id;
        // Initial flood to capture same-colored adjacent tiles
        floodCapture(state, player.id, startTile.colorId);
      }
    });
  }

  // Initial scores
  const playerScores = computePlayerScores(state);
  playerScores.forEach((score, id) => {
    state.players[id].score = score;
  });

  const teamScores = computeTeamScores(state, playerScores);
  teamScores.forEach((score, id) => {
    state.teams[id].score = score;
  });

  return state;
}

export function applyMove(state, playerId, colorId) {
  if (!isLegalMove(state, playerId, colorId)) {
    return { state, error: "Illegal move" };
  }

  const newState = JSON.parse(JSON.stringify(state));
  const capturedTileIds = floodCapture(newState, playerId, colorId);

  // Update scores in player objects
  const playerScores = computePlayerScores(newState);
  playerScores.forEach((score, id) => {
    newState.players[id].score = score;
  });

  // Update team scores
  const teamScores = computeTeamScores(newState, playerScores);
  teamScores.forEach((score, id) => {
    newState.teams[id].score = score;
  });

  newState.moveLog.push({
    turn: newState.turnNumber,
    playerId,
    colorId,
    capturedTileIds,
    scoresAfter: {
      players: playerScores,
      teams: teamScores
    }
  });

  newState.turnNumber++;

  // Check win conditions
  const totalTiles = newState.board.tiles.length;
  const neutralTilesCount = newState.board.tiles.filter(t => t.ownerId === null).length;

  // Re-use playerScores from above
  const maxScore = Math.max(...playerScores);
  const otherPlayersMaxPotential = totalTiles - maxScore; // All other tiles (neutral + other players)

  // Winner is certain if they have more tiles than anyone else could possibly get
  // In a 2-player game, if P1 has 51% of tiles, they win.
  // More generally: if P1.score > (totalTiles - P1.score), they win.
  // Actually, it's: if P1.score > P2.score + neutralTiles, they win (assuming neutralTiles will be captured by P2).

  let winnerCertain = false;
  for (let i = 0; i < newState.players.length; i++) {
    const myScore = playerScores[i];
    const otherScores = playerScores.filter((s, idx) => idx !== i);
    const bestOtherScore = otherScores.length > 0 ? Math.max(...otherScores) : 0;

    if (myScore > bestOtherScore + neutralTilesCount) {
      winnerCertain = true;
      break;
    }
  }

  if (neutralTilesCount === 0 || winnerCertain || (newState.rules.maxTurns && newState.turnNumber >= newState.rules.maxTurns)) {
    newState.status = "finished";
  }

  // Advance turn (simple for solo/2p)
  if (newState.status === "playing") {
    newState.currentPlayerId = (newState.currentPlayerId + 1) % newState.players.length;
  }

  return {
    state: newState,
    capturedTileIds
  };
}

function floodCapture(state, playerId, colorId) {
  const queue = [];
  const visited = new Set();
  const captured = [];

  // 1. Recolor existing territory and use it as BFS start
  for (const tile of state.board.tiles) {
    if (tile.ownerId === playerId) {
      tile.colorId = colorId;
      queue.push(tile.id);
      visited.add(tile.id);
    }
  }

  // 2. BFS to find reachable tiles of the same color
  while (queue.length > 0) {
    const tileId = queue.shift();
    const tile = state.board.tiles[tileId];

    for (const neighborId of tile.neighbors) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);

      const neighbor = state.board.tiles[neighborId];
      if (!canCaptureTile(state, playerId, neighborId)) continue;

      if (neighbor.colorId === colorId) {
        neighbor.ownerId = playerId;
        captured.push(neighborId);
        queue.push(neighborId);
      }
    }
  }

  return captured;
}
