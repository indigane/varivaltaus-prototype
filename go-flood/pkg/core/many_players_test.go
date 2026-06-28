package core

import (
	"fmt"
	"testing"
)

func TestManyPlayersRealBoard(t *testing.T) {
	playerCount := 8
	board := Board{
		Tiles: make([]Tile, 100),
	}
	for i := 0; i < 100; i++ {
		board.Tiles[i] = Tile{ID: i, ColorID: i % 8}
		if i%10 < 9 { board.Tiles[i].Neighbors = append(board.Tiles[i].Neighbors, i+1) }
		if i%10 > 0 { board.Tiles[i].Neighbors = append(board.Tiles[i].Neighbors, i-1) }
		if i < 90 { board.Tiles[i].Neighbors = append(board.Tiles[i].Neighbors, i+10) }
		if i > 9 { board.Tiles[i].Neighbors = append(board.Tiles[i].Neighbors, i-10) }
	}
	board.StartTileIds = []int{0, 9, 90, 99, 44, 45, 54, 55}

	players := make([]Player, playerCount)
	teams := make([]Team, playerCount)
	for i := 0; i < playerCount; i++ {
		players[i] = Player{ID: i, Alive: true, TeamID: i}
		teams[i] = Team{ID: i}
	}

	game := CreateGame(Config{
		Board:      board,
		Players:    players,
		Teams:      teams,
		ColorCount: 8,
		Rules:      DefaultRules(),
	})

	fmt.Printf("Game status: %s\n", game.Status)
	for i := 0; i < 20 && game.Status == "playing"; i++ {
		pID := game.CurrentPlayerID
		var firstOwned int = -1
		for j := range game.Board.Tiles {
			if game.Board.Tiles[j].OwnerID != nil && *game.Board.Tiles[j].OwnerID == pID {
				firstOwned = j
				break
			}
		}
		currColor := game.Board.Tiles[firstOwned].ColorID
		move := (currColor + 1) % 8
		fmt.Printf("Turn %d, Player %d, currentColor %d, attempting %d\n", i, pID, currColor, move)
		for !IsLegalMove(game, pID, move) {
			move = (move + 1) % 8
			if move == currColor {
				fmt.Printf("No legal moves for player %d\n", pID)
				break
			}
		}
		ApplyMove(game, pID, move)
	}
	fmt.Printf("Game turns: %d status: %s\n", game.TurnNumber, game.Status)
}
