package core

import (
	"math"
)

type Config struct {
	Board      Board
	Players    []Player
	Teams      []Team
	ColorCount int
	PaletteID  string
	RNGSeed    uint32
	Rules      Rules
}

func CreateGame(config Config) *GameState {
	state := &GameState{
		Version:         1,
		Board:           config.Board,
		Players:         config.Players,
		Teams:           config.Teams,
		CurrentPlayerID: 0,
		ColorCount:      config.ColorCount,
		PaletteID:       config.PaletteID,
		Rules:           config.Rules,
		TurnNumber:      0,
		RNGSeed:         config.RNGSeed,
		MoveLog:         []MoveLogEntry{},
		Status:          "playing",
	}

	if len(state.Players) > 0 {
		usedColors := make(map[int]bool)

		for i := range state.Players {
			player := &state.Players[i]
			// IMPORTANT: use i instead of player.ID for start tile assignment
			// since startTileIds corresponds to player indices
			if len(state.Board.StartTileIds) > 0 {
				startTileID := state.Board.StartTileIds[i%len(state.Board.StartTileIds)]
				startTile := &state.Board.Tiles[startTileID]

				if startTile.OwnerID == nil {
					if !state.Rules.AllowSameStartingColor {
						attempts := 0
						for usedColors[startTile.ColorID] && attempts < state.ColorCount {
							startTile.ColorID = (startTile.ColorID + 1) % state.ColorCount
							attempts++
						}
						usedColors[startTile.ColorID] = true
					}

					pID := player.ID
					startTile.OwnerID = &pID

					if state.Rules.StartingAreaSize > 1 {
						queue := []int{startTileID}
						visited := map[int]bool{startTileID: true}
						ownedCount := 1

						for len(queue) > 0 && ownedCount < state.Rules.StartingAreaSize {
							tileID := queue[0]
							queue = queue[1:]
							tile := &state.Board.Tiles[tileID]

							for _, neighborID := range tile.Neighbors {
								if visited[neighborID] {
									continue
								}
								visited[neighborID] = true

								neighbor := &state.Board.Tiles[neighborID]
								if neighbor.OwnerID == nil {
									neighbor.OwnerID = &pID
									neighbor.ColorID = startTile.ColorID
									ownedCount++
									queue = append(queue, neighborID)
									if ownedCount >= state.Rules.StartingAreaSize {
										break
									}
								}
							}
						}
					}
				}
			}
		}

		if state.Rules.StartingAreaBuffer {
			for pass := 0; pass < 2; pass++ {
				for i := range state.Board.Tiles {
					tile := &state.Board.Tiles[i]
					if tile.OwnerID != nil {
						for _, neighborID := range tile.Neighbors {
							neighbor := &state.Board.Tiles[neighborID]
							if neighbor.OwnerID == nil && neighbor.ColorID == tile.ColorID {
								neighbor.ColorID = (neighbor.ColorID + 1) % state.ColorCount
							}
						}
					}
				}
			}
		}

		for i := range state.Players {
			var firstOwnedTileID int = -1
			for j := range state.Board.Tiles {
				if state.Board.Tiles[j].OwnerID != nil && *state.Board.Tiles[j].OwnerID == state.Players[i].ID {
					firstOwnedTileID = j
					break
				}
			}
			if firstOwnedTileID != -1 {
				floodCapture(state, state.Players[i].ID, state.Board.Tiles[firstOwnedTileID].ColorID)
			}
		}
	}

	playerScores := ComputePlayerScores(state)
	for i := range state.Players {
		state.Players[i].Score = playerScores[i]
	}

	teamScores := ComputeTeamScores(state, playerScores)
	for i := range state.Teams {
		state.Teams[i].Score = teamScores[i]
	}

	return state
}

func ApplyMove(state *GameState, playerID int, colorID int) ([]int, string) {
	if !IsLegalMove(state, playerID, colorID) {
		return nil, "Illegal move"
	}

	capturedTileIDs := floodCapture(state, playerID, colorID)

	playerScores := ComputePlayerScores(state)
	for i := range state.Players {
		state.Players[i].Score = playerScores[i]
	}

	teamScores := ComputeTeamScores(state, playerScores)
	for i := range state.Teams {
		state.Teams[i].Score = teamScores[i]
	}

	state.MoveLog = append(state.MoveLog, MoveLogEntry{
		Turn:            state.TurnNumber,
		PlayerID:        playerID,
		ColorID:         colorID,
		CapturedTileIds: capturedTileIDs,
		ScoresAfter: ScoresSummary{
			Players: playerScores,
			Teams:   teamScores,
		},
	})

	state.TurnNumber++

	neutralTilesCount := 0
	for i := range state.Board.Tiles {
		if state.Board.Tiles[i].OwnerID == nil {
			neutralTilesCount++
		}
	}

	winnerCertain := false
	for i := 0; i < len(state.Players); i++ {
		myScore := playerScores[i]
		bestOtherScore := 0
		for j := 0; j < len(state.Players); j++ {
			if i == j {
				continue
			}
			if playerScores[j] > bestOtherScore {
				bestOtherScore = playerScores[j]
			}
		}

		if myScore > bestOtherScore+neutralTilesCount {
			winnerCertain = true
			break
		}
	}

	if neutralTilesCount == 0 || winnerCertain || (state.Rules.MaxTurns > 0 && state.TurnNumber >= state.Rules.MaxTurns) {
		state.Status = "finished"
	}

	if state.Status == "playing" {
		state.CurrentPlayerID = (state.CurrentPlayerID + 1) % len(state.Players)
	}

	return capturedTileIDs, ""
}

func floodCapture(state *GameState, playerID int, colorID int) []int {
	queue := []int{}
	visited := make(map[int]bool)
	captured := []int{}
	player := &state.Players[playerID]

	for i := range state.Board.Tiles {
		tile := &state.Board.Tiles[i]
		isOwner := tile.OwnerID != nil && *tile.OwnerID == playerID
		isTeammateMerged := state.Rules.TeamTerritory == "merged" &&
			tile.OwnerID != nil &&
			state.Players[*tile.OwnerID].TeamID == player.TeamID

		if isOwner || isTeammateMerged {
			tile.ColorID = colorID
			queue = append(queue, tile.ID)
			visited[tile.ID] = true
		}
	}

	for len(queue) > 0 {
		tileID := queue[0]
		queue = queue[1:]
		tile := &state.Board.Tiles[tileID]

		for _, neighborID := range tile.Neighbors {
			if visited[neighborID] {
				continue
			}
			visited[neighborID] = true

			neighbor := &state.Board.Tiles[neighborID]
			if !CanCaptureTile(state, playerID, neighborID) {
				continue
			}

			if neighbor.ColorID == colorID {
				pID := playerID
				neighbor.OwnerID = &pID
				captured = append(captured, neighborID)
				queue = append(queue, neighborID)
			}
		}
	}

	return captured
}

func ComputePlayerScores(state *GameState) []int {
	scores := make([]int, len(state.Players))
	for i := range state.Board.Tiles {
		if state.Board.Tiles[i].OwnerID != nil {
			scores[*state.Board.Tiles[i].OwnerID]++
		}
	}
	return scores
}

func ComputeTeamScores(state *GameState, playerScores []int) []int {
	scores := make([]int, len(state.Teams))
	for i := range state.Players {
		scores[state.Players[i].TeamID] += playerScores[i]
	}
	return scores
}

func GetWinner(state *GameState) []int {
	playerScores := ComputePlayerScores(state)
	maxScore := 0
	for _, s := range playerScores {
		if s > maxScore {
			maxScore = s
		}
	}

	if maxScore == 0 {
		return []int{}
	}

	winners := []int{}
	for i, s := range playerScores {
		if s == maxScore {
			winners = append(winners, i)
		}
	}
	return winners
}

func FindFairStartTileIds(board *Board, playerCount int) []int {
	if playerCount <= 0 {
		return []int{}
	}
	if playerCount == 1 {
		return []int{board.Tiles[0].ID}
	}

	selectedIds := []int{}
	candidates := make(map[int]bool)

	minDeg := math.MaxInt32
	for _, t := range board.Tiles {
		if len(t.Neighbors) < minDeg {
			minDeg = len(t.Neighbors)
		}
	}
	for _, t := range board.Tiles {
		if len(t.Neighbors) == minDeg {
			candidates[t.ID] = true
		}
	}

	minX, maxX, minY, maxY := math.MaxFloat64, -math.MaxFloat64, math.MaxFloat64, -math.MaxFloat64
	var minXT, maxXT, minYT, maxYT int

	for i, t := range board.Tiles {
		var cx, cy float64
		for _, p := range t.Points {
			cx += p[0]
			cy += p[1]
		}
		cx /= float64(len(t.Points))
		cy /= float64(len(t.Points))

		if cx < minX {
			minX = cx
			minXT = i
		}
		if cx > maxX {
			maxX = cx
			maxXT = i
		}
		if cy < minY {
			minY = cy
			minYT = i
		}
		if cy > maxY {
			maxY = cy
			maxYT = i
		}
	}
	candidates[minXT] = true
	candidates[maxXT] = true
	candidates[minYT] = true
	candidates[maxYT] = true

	candidateIds := []int{}
	for id := range candidates {
		candidateIds = append(candidateIds, id)
	}

	if playerCount == 2 {
		maxDist := -1
		bestPair := []int{candidateIds[0], candidateIds[0]}
		if len(candidateIds) > 1 {
			bestPair[1] = candidateIds[1]
		}

		for _, startId := range candidateIds {
			dMap := computeDistances(board, startId)
			for j := range board.Tiles {
				if d, ok := dMap[j]; ok && d > maxDist {
					maxDist = d
					bestPair = []int{startId, j}
				}
			}
		}
		selectedIds = append(selectedIds, bestPair...)
	} else {
		selectedIds = append(selectedIds, minXT)
	}

	for len(selectedIds) < playerCount {
		bestTileID := -1
		maxMinDistance := -1

		distances := make([]map[int]int, len(selectedIds))
		for i, startID := range selectedIds {
			distances[i] = computeDistances(board, startID)
		}

		for i := range board.Tiles {
			alreadySelected := false
			for _, sid := range selectedIds {
				if sid == i {
					alreadySelected = true
					break
				}
			}
			if alreadySelected {
				continue
			}

			minDistance := math.MaxInt32
			for _, dMap := range distances {
				if d, ok := dMap[i]; ok {
					if d < minDistance {
						minDistance = d
					}
				}
			}

			if minDistance != math.MaxInt32 && minDistance > maxMinDistance {
				maxMinDistance = minDistance
				bestTileID = i
			}
		}

		if bestTileID == -1 {
			break
		}
		selectedIds = append(selectedIds, bestTileID)
	}

	return selectedIds
}

func computeDistances(board *Board, startID int) map[int]int {
	distances := make(map[int]int)
	distances[startID] = 0
	queue := []int{startID}

	for len(queue) > 0 {
		id := queue[0]
		queue = queue[1:]
		d := distances[id]

		for _, neighborID := range board.Tiles[id].Neighbors {
			if _, ok := distances[neighborID]; !ok {
				distances[neighborID] = d + 1
				queue = append(queue, neighborID)
			}
		}
	}
	return distances
}
