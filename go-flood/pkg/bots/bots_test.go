package bots

import (
	"go-flood/pkg/core"
	"testing"
)

func TestBots(t *testing.T) {
	rng := core.CreateRNG(1)
	board := core.Board{
		Tiles: []core.Tile{
			{ID: 0, ColorID: 0, Neighbors: []int{1}},
			{ID: 1, ColorID: 1, Neighbors: []int{0}},
		},
		StartTileIds: []int{0},
	}
	p0id := 0
	board.Tiles[0].OwnerID = &p0id

	players := []core.Player{
		{ID: 0, Alive: true, TeamID: 0},
	}
	teams := []core.Team{{ID: 0}}
	rules := core.DefaultRules()
	rules.ColorRestrictions = "notOwnColor"
	config := core.Config{
		Board:      board,
		Players:    players,
		Teams:      teams,
		ColorCount: 6,
		Rules:      rules,
	}
	game := core.CreateGame(config)

	bots_to_test := []Bot{
		&RandomBot{RNG: rng},
		&GreedyBot{},
		&AggressiveBot{},
		&LookaheadBot{},
		&HybridBot{},
	}

	for _, b := range bots_to_test {
		move := b.GetMove(game, 0)
		if move < 0 || move >= 6 {
			t.Errorf("Bot %T returned invalid move %d", b, move)
		}
	}
}
