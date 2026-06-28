package core

import (
	"testing"
)

func TestRNG(t *testing.T) {
	rng := CreateRNG(123)
	v1 := rng()
	v2 := rng()
	if v1 == v2 {
		t.Errorf("RNG should produce different values: %f, %f", v1, v2)
	}

	rng2 := CreateRNG(123)
	if rng2() != v1 {
		t.Errorf("RNG with same seed should produce same first value")
	}
}

func TestBasicGame(t *testing.T) {
	p0id := 0
	board := Board{
		Tiles: []Tile{
			{ID: 0, ColorID: 0, Neighbors: []int{1}, OwnerID: &p0id},
			{ID: 1, ColorID: 1, Neighbors: []int{0}},
		},
		StartTileIds: []int{0},
	}
	players := []Player{
		{ID: 0, Alive: true, TeamID: 0},
		{ID: 1, Alive: true, TeamID: 1},
	}
	teams := []Team{{ID: 0}, {ID: 1}}
	rules := DefaultRules()
	rules.ColorRestrictions = "notOwnColor"
	config := Config{
		Board:      board,
		Players:    players,
		Teams:      teams,
		ColorCount: 6,
		Rules:      rules,
	}
	game := CreateGame(config)

	if game.Players[0].Score != 1 {
		t.Errorf("Expected player 0 score 1, got %d", game.Players[0].Score)
	}

	t.Logf("Tile 1: ColorID=%d, OwnerID=%v", game.Board.Tiles[1].ColorID, game.Board.Tiles[1].OwnerID)

	captured, err := ApplyMove(game, 0, 1)
	if err != "" {
		t.Errorf("ApplyMove failed: %s", err)
	}
	if len(captured) != 1 {
		t.Errorf("Expected 1 captured tile, got %d", len(captured))
	}
	if game.Players[0].Score != 2 {
		t.Errorf("Expected player 0 score 2, got %d", game.Players[0].Score)
	}
	if game.Status != "finished" {
		t.Errorf("Expected game to be finished, got %s", game.Status)
	}
}
