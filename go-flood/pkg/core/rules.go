package core

type Rules struct {
	WinCondition           string `json:"winCondition"`
	TurnOrder              string `json:"turnOrder"`
	TeamTerritory          string `json:"teamTerritory"`
	CaptureMode            string `json:"captureMode"`
	ColorRestrictions      string `json:"colorRestrictions"`
	StartingPositions      string `json:"startingPositions"`
	MaxTurns               int    `json:"maxTurns"`
	StartingAreaSize       int    `json:"startingAreaSize"`
	StartingAreaBuffer     bool   `json:"startingAreaBuffer"`
	AllowSameStartingColor bool   `json:"allowSameStartingColor"`
}

func DefaultRules() Rules {
	return Rules{
		WinCondition:           "mostTiles",
		TurnOrder:              "players",
		TeamTerritory:          "separatePlayers",
		CaptureMode:            "neutralOnly",
		ColorRestrictions:      "notAnyPlayerColor",
		StartingPositions:      "corners",
		MaxTurns:               1000,
		StartingAreaSize:       1,
		StartingAreaBuffer:     true,
		AllowSameStartingColor: false,
	}
}

func IsLegalMove(state *GameState, playerID int, colorID int) bool {
	if state.Status != "playing" {
		return false
	}
	if state.CurrentPlayerID != playerID {
		return false
	}
	if colorID < 0 || colorID >= state.ColorCount {
		return false
	}

	player := &state.Players[playerID]
	if !player.Alive {
		return false
	}

	rules := state.Rules
	var playerTiles []*Tile
	for i := range state.Board.Tiles {
		if state.Board.Tiles[i].OwnerID != nil && *state.Board.Tiles[i].OwnerID == playerID {
			playerTiles = append(playerTiles, &state.Board.Tiles[i])
		}
	}

	if len(playerTiles) == 0 {
		return true
	}

	currentColorID := playerTiles[0].ColorID

	if rules.ColorRestrictions == "notOwnColor" {
		return colorID != currentColorID
	}

	if rules.ColorRestrictions == "notAnyPlayerColor" {
		for i := range state.Board.Tiles {
			if state.Board.Tiles[i].OwnerID != nil && state.Board.Tiles[i].ColorID == colorID {
				return false
			}
		}
		return true
	}

	if rules.ColorRestrictions == "notAdjacentEnemyColor" {
		if colorID == currentColorID {
			return false
		}

		for _, tile := range playerTiles {
			for _, neighborID := range tile.Neighbors {
				neighbor := &state.Board.Tiles[neighborID]
				if neighbor.OwnerID != nil && *neighbor.OwnerID != playerID && neighbor.ColorID == colorID {
					return false
				}
			}
		}
		return true
	}

	return true
}

func CanCaptureTile(state *GameState, playerID int, tileID int) bool {
	tile := &state.Board.Tiles[tileID]
	rules := state.Rules
	player := &state.Players[playerID]

	if tile.OwnerID != nil {
		if rules.TeamTerritory == "merged" {
			tileOwner := &state.Players[*tile.OwnerID]
			if tileOwner.TeamID == player.TeamID {
				return false
			}
		}

		if rules.CaptureMode == "canCaptureEnemies" {
			if *tile.OwnerID == playerID {
				return false
			}

			tileOwner := &state.Players[*tile.OwnerID]
			if tileOwner.TeamID == player.TeamID {
				return false
			}

			return true
		}
		return false
	}

	return true
}
