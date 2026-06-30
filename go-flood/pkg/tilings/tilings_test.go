package tilings

import (
	"go-flood/pkg/core"
	"testing"
)

func TestGenerators(t *testing.T) {
	rng := core.CreateRNG(1)
	opts := Options{
		Cols:       10,
		Rows:       10,
		TileSize:   10,
		ColorCount: 6,
		RNG:        rng,
	}

	board := GenerateSquareBoard(opts)
	if len(board.Tiles) != 100 {
		t.Errorf("Expected 100 tiles, got %d", len(board.Tiles))
	}

	board = GenerateTriangleBoard(opts)
	if len(board.Tiles) != 100 {
		t.Errorf("Expected 100 tiles for triangle board, got %d", len(board.Tiles))
	}

	board = GenerateHexBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for hex board")
	}

	board = GenerateCairoPentagonBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for cairo board")
	}

	board = GenerateRhombitrihexagonalBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for rhombitrihexagonal board")
	}

	board = GenerateOctagonalBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for 4.8.8 octagonal board")
	}

	board = GenerateVoronoiBoard(opts, "jittered")
	if len(board.Tiles) != 100 {
		t.Errorf("Expected 100 tiles for voronoi board, got %d", len(board.Tiles))
	}
}
