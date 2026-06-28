package bots

import (
	"go-flood/pkg/core"
	"math"
)

type AggressiveBot struct{}

func (b *AggressiveBot) GetMove(state *core.GameState, playerID int) int {
	startTileID := state.Board.StartTileIds[playerID%len(state.Board.StartTileIds)]
	startTile := &state.Board.Tiles[startTileID]
	startPos := GetCentroid(startTile.Points)

	bestColor := -1
	maxDistance := -1.0
	maxGain := -1

	for c := 0; c < state.ColorCount; c++ {
		if !core.IsLegalMove(state, playerID, c) {
			continue
		}

		gain, furthestDist := SimulateMoveDistance(state, playerID, c, startPos)

		if furthestDist > maxDistance || (furthestDist == maxDistance && gain > maxGain) {
			maxDistance = furthestDist
			maxGain = gain
			bestColor = c
		}
	}

	return bestColor
}

func GetCentroid(points []core.Point) core.Point {
	var x, y float64
	for _, p := range points {
		x += p[0]
		y += p[1]
	}
	if len(points) == 0 {
		return core.Point{0, 0}
	}
	return core.Point{x / float64(len(points)), y / float64(len(points))}
}

func GetDistance(p1, p2 core.Point) float64 {
	return math.Sqrt(math.Pow(p1[0]-p2[0], 2) + math.Pow(p1[1]-p2[1], 2))
}

func SimulateMoveDistance(state *core.GameState, playerID int, colorID int, startPos core.Point) (int, float64) {
	queue := []int{}
	visited := make(map[int]bool)
	gain := 0
	furthestDist := 0.0
	player := &state.Players[playerID]

	for i := range state.Board.Tiles {
		tile := &state.Board.Tiles[i]
		isOwner := tile.OwnerID != nil && *tile.OwnerID == playerID
		isTeammateMerged := state.Rules.TeamTerritory == "merged" &&
			tile.OwnerID != nil &&
			state.Players[*tile.OwnerID].TeamID == player.TeamID

		if isOwner || isTeammateMerged {
			queue = append(queue, tile.ID)
			visited[tile.ID] = true

			dist := GetDistance(GetCentroid(tile.Points), startPos)
			if dist > furthestDist {
				furthestDist = dist
			}
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
			if neighbor.OwnerID == nil && neighbor.ColorID == colorID {
				if core.CanCaptureTile(state, playerID, neighborID) {
					gain++
					queue = append(queue, neighborID)

					dist := GetDistance(GetCentroid(neighbor.Points), startPos)
					if dist > furthestDist {
						furthestDist = dist
					}
				}
			}
		}
	}

	return gain, furthestDist
}

type LookaheadBot struct{}

func (b *LookaheadBot) GetMove(state *core.GameState, playerID int) int {
	bestColorID := -1
	maxScore := -math.MaxFloat64

	for c := 0; c < state.ColorCount; c++ {
		if !core.IsLegalMove(state, playerID, c) {
			continue
		}

		gain := SimulateMove(state, playerID, c)
		potentialGain := simulateLookahead(state, playerID, c)
		totalScore := float64(gain) + float64(potentialGain)*0.5

		if totalScore > maxScore {
			maxScore = totalScore
			bestColorID = c
		}
	}

	return bestColorID
}

func simulateLookahead(state *core.GameState, playerID int, colorID int) int {
	capturedIDs := []int{}
	queue := []int{}
	visited := make(map[int]bool)
	player := &state.Players[playerID]

	for i := range state.Board.Tiles {
		tile := &state.Board.Tiles[i]
		isOwner := tile.OwnerID != nil && *tile.OwnerID == playerID
		isTeammateMerged := state.Rules.TeamTerritory == "merged" &&
			tile.OwnerID != nil &&
			state.Players[*tile.OwnerID].TeamID == player.TeamID
		if isOwner || isTeammateMerged {
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
			if neighbor.OwnerID == nil && neighbor.ColorID == colorID {
				capturedIDs = append(capturedIDs, neighborID)
				queue = append(queue, neighborID)
			}
		}
	}

	maxNextGain := 0
	for nextC := 0; nextC < state.ColorCount; nextC++ {
		if nextC == colorID {
			continue
		}

		nextGain := 0
		nextVisited := make(map[int]bool)
		for k, v := range visited {
			nextVisited[k] = v
		}
		nextQueue := make([]int, len(capturedIDs))
		copy(nextQueue, capturedIDs)

		for len(nextQueue) > 0 {
			tileID := nextQueue[0]
			nextQueue = nextQueue[1:]
			tile := &state.Board.Tiles[tileID]
			for _, neighborID := range tile.Neighbors {
				if nextVisited[neighborID] {
					continue
				}
				nextVisited[neighborID] = true
				neighbor := &state.Board.Tiles[neighborID]
				if neighbor.OwnerID == nil && neighbor.ColorID == nextC {
					nextGain++
					nextQueue = append(nextQueue, neighborID)
				}
			}
		}
		if nextGain > maxNextGain {
			maxNextGain = nextGain
		}
	}

	return maxNextGain
}

type HybridBot struct{}

func (b *HybridBot) GetMove(state *core.GameState, playerID int) int {
	hasContact := checkOpponentContact(state, playerID)
	if hasContact {
		greedy := GreedyBot{}
		return greedy.GetMove(state, playerID)
	} else {
		aggressive := AggressiveBot{}
		return aggressive.GetMove(state, playerID)
	}
}

func checkOpponentContact(state *core.GameState, playerID int) bool {
	player := &state.Players[playerID]
	for i := range state.Board.Tiles {
		tile := &state.Board.Tiles[i]
		if (tile.OwnerID != nil && *tile.OwnerID == playerID) || (state.Rules.TeamTerritory == "merged" && tile.OwnerID != nil && state.Players[*tile.OwnerID].TeamID == player.TeamID) {
			for _, neighborID := range tile.Neighbors {
				neighbor := &state.Board.Tiles[neighborID]
				if neighbor.OwnerID != nil && state.Players[*neighbor.OwnerID].TeamID != player.TeamID {
					return true
				}
			}
		}
	}
	return false
}
