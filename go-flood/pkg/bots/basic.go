package bots

import (
	"go-flood/pkg/core"
)

type Bot interface {
	GetMove(state *core.GameState, playerID int) int
}

type RandomBot struct {
	RNG core.RNG
}

func (b *RandomBot) GetMove(state *core.GameState, playerID int) int {
	legalColors := []int{}
	for c := 0; c < state.ColorCount; c++ {
		if core.IsLegalMove(state, playerID, c) {
			legalColors = append(legalColors, c)
		}
	}
	if len(legalColors) == 0 {
		return 0
	}
	return legalColors[int(b.RNG()*float64(len(legalColors)))]
}

type GreedyBot struct{}

func (b *GreedyBot) GetMove(state *core.GameState, playerID int) int {
	bestColor := -1
	maxGain := -1

	for c := 0; c < state.ColorCount; c++ {
		if !core.IsLegalMove(state, playerID, c) {
			continue
		}

		gain := SimulateMove(state, playerID, c)
		if gain > maxGain {
			maxGain = gain
			bestColor = c
		}
	}

	return bestColor
}

func SimulateMove(state *core.GameState, playerID int, colorID int) int {
	queue := []int{}
	visited := make(map[int]bool)
	gain := 0

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
				if core.CanCaptureTile(state, playerID, neighborID) {
					gain++
					queue = append(queue, neighborID)
				}
			}
		}
	}

	return gain
}
