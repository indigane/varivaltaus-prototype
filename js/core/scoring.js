export function computePlayerScores(state) {
  const scores = Array(state.players.length).fill(0);
  for (const tile of state.board.tiles) {
    if (tile.ownerId !== null) {
      scores[tile.ownerId]++;
    }
  }
  return scores;
}

export function computeTeamScores(state, playerScores) {
  const scores = Array(state.teams.length).fill(0);
  const teamIdToIndex = new Map();
  state.teams.forEach((team, index) => {
    teamIdToIndex.set(team.id, index);
  });

  for (const player of state.players) {
    const teamIndex = teamIdToIndex.get(player.teamId);
    if (teamIndex !== undefined) {
      scores[teamIndex] += playerScores[player.id];
    }
  }
  return scores;
}

export function getWinner(state) {
  const playerScores = computePlayerScores(state);
  const maxScore = Math.max(...playerScores);

  if (maxScore === 0) return [];

  const winners = [];
  for (let i = 0; i < playerScores.length; i++) {
    if (playerScores[i] === maxScore) {
      winners.push(i);
    }
  }
  return winners;
}
