package fairness

import (
	"go-flood/pkg/core"
	"go-flood/pkg/tilings"
	"testing"
)

func TestEvaluateHumanBoardProducesBoundedReport(t *testing.T) {
	board := tilings.GenerateSquareBoard(tilings.Options{
		Cols:       6,
		Rows:       6,
		TileSize:   10,
		ColorCount: 5,
		RNG:        core.CreateRNG(1),
	})

	report := EvaluateHumanBoard(board, Config{
		PlayerCount: 2,
		ColorCount:  5,
		Rules:       core.DefaultRules(),
	})

	if report.PlayerCount != 2 {
		t.Fatalf("PlayerCount = %d, want 2", report.PlayerCount)
	}
	if len(report.Positions) != 2 {
		t.Fatalf("len(Positions) = %d, want 2", len(report.Positions))
	}
	if report.TileCount != 36 {
		t.Fatalf("TileCount = %d, want 36", report.TileCount)
	}
	if report.Score < 0 || report.Score > 1 {
		t.Fatalf("Score = %f, want 0..1", report.Score)
	}
	if report.Rating == "" {
		t.Fatal("Rating should not be empty")
	}
}

func TestEvaluateHumanBoardDetectsOpeningImbalance(t *testing.T) {
	board := core.Board{
		Version:      1,
		Generator:    "line-test",
		Tiles:        make([]core.Tile, 5),
		StartTileIds: []int{0, 4},
	}

	colors := []int{0, 1, 1, 2, 3}
	neighbors := [][]int{{1}, {0, 2}, {1, 3}, {2, 4}, {3}}
	for i := range board.Tiles {
		board.Tiles[i] = core.Tile{
			ID:        i,
			ColorID:   colors[i],
			Points:    []core.Point{{float64(i), 0}},
			Neighbors: neighbors[i],
		}
	}

	rules := core.DefaultRules()
	rules.StartingAreaBuffer = false
	rules.AllowSameStartingColor = true

	report := EvaluateHumanBoard(board, Config{
		PlayerCount: 2,
		ColorCount:  4,
		Rules:       rules,
		LocalDepth:  3,
	})

	if report.ComponentSpreads.Opening == 0 {
		t.Fatalf("Opening spread = 0, want imbalance; report = %+v", report)
	}
	if report.Positions[0].OpeningPotential <= report.Positions[1].OpeningPotential {
		t.Fatalf("position 0 opening potential = %.2f, position 1 = %.2f; want position 0 higher", report.Positions[0].OpeningPotential, report.Positions[1].OpeningPotential)
	}
}
