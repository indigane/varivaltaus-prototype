package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
	"sort"
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
	assertSemiRegularBoard(t, "rhombitrihexagonal", board, opts.TileSize, 3, 4, 6)

	board = GenerateOctagonalBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for 4.8.8 octagonal board")
	}
	assertSemiRegularBoard(t, "4.8.8 octagonal", board, opts.TileSize, 4, 8)

	board = GenerateTrihexagonalBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for trihexagonal board")
	}
	assertSemiRegularBoard(t, "trihexagonal", board, opts.TileSize, 3, 6)

	board = GenerateTruncatedHexagonalBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for truncated hexagonal board")
	}
	assertSemiRegularBoard(t, "truncated hexagonal", board, opts.TileSize, 3, 12)

	board = GenerateTruncatedTrihexagonalBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for truncated trihexagonal board")
	}
	assertSemiRegularBoard(t, "truncated trihexagonal", board, opts.TileSize, 4, 6, 12)

	board = GenerateSnubSquareBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for snub square board")
	}
	assertSemiRegularBoard(t, "snub square", board, opts.TileSize, 3, 4)

	board = GenerateSnubTrihexagonalBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for snub trihexagonal board")
	}
	assertSemiRegularBoard(t, "snub trihexagonal", board, opts.TileSize, 3, 6)

	board = GenerateElongatedTriangularBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for elongated triangular board")
	}
	assertSemiRegularBoard(t, "elongated triangular", board, opts.TileSize, 3, 4)

	board = GeneratePrismaticPentagonalBoard(opts)
	assertDualBoard(t, "prismatic pentagonal", board, 5)

	board = GenerateFloretPentagonalBoard(opts)
	assertDualBoard(t, "floret pentagonal", board, 5)

	board = GenerateDeltoidalTrihexagonalBoard(opts)
	assertDualBoard(t, "deltoidal trihexagonal", board, 4)

	board = GenerateRhombilleBoard(opts)
	assertDualBoard(t, "rhombille", board, 4)

	board = GenerateTriakisTriangularBoard(opts)
	assertDualBoard(t, "triakis triangular", board, 3)
	assertUniformSideSignature(t, "triakis triangular", board)

	board = GenerateKisrhombilleBoard(opts)
	assertDualBoard(t, "kisrhombille", board, 3)
	assertUniformSideSignature(t, "kisrhombille", board)

	board = GenerateTetrakisSquareBoard(opts)
	assertDualBoard(t, "tetrakis square", board, 3)

	board = GeneratePythagoreanBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for pythagorean board")
	}
	assertNeighborGraph(t, "pythagorean", board)

	board = GenerateVoronoiBoard(opts, "jittered")
	if len(board.Tiles) != 100 {
		t.Errorf("Expected 100 tiles for voronoi board, got %d", len(board.Tiles))
	}
}

func assertDualBoard(t *testing.T, name string, board core.Board, expectedSides int) {
	t.Helper()
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for %s board", name)
		return
	}

	ids := make(map[int]bool)
	for i, tile := range board.Tiles {
		if tile.ID != i {
			t.Errorf("%s board tile at index %d has non-contiguous id %d", name, i, tile.ID)
		}
		if ids[tile.ID] {
			t.Errorf("%s board has duplicate tile id %d", name, tile.ID)
		}
		ids[tile.ID] = true

		if len(tile.Points) != expectedSides {
			t.Errorf("%s board tile %d has %d sides, expected %d", name, tile.ID, len(tile.Points), expectedSides)
		}
	}

	for _, tile := range board.Tiles {
		seenNeighbors := make(map[int]bool)
		for _, neighborID := range tile.Neighbors {
			if neighborID < 0 || neighborID >= len(board.Tiles) {
				t.Errorf("%s board tile %d has invalid neighbor %d", name, tile.ID, neighborID)
				continue
			}
			if neighborID == tile.ID {
				t.Errorf("%s board tile %d has itself as a neighbor", name, tile.ID)
			}
			if seenNeighbors[neighborID] {
				t.Errorf("%s board tile %d has duplicate neighbor %d", name, tile.ID, neighborID)
			}
			seenNeighbors[neighborID] = true

			if !containsInt(board.Tiles[neighborID].Neighbors, tile.ID) {
				t.Errorf("%s board neighbor symmetry failed between %d and %d", name, tile.ID, neighborID)
			}
		}
	}
}

func assertSemiRegularBoard(t *testing.T, name string, board core.Board, expectedEdgeLength float64, expectedSides ...int) {
	t.Helper()
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for %s board", name)
		return
	}

	validSideCounts := make(map[int]bool)
	for _, sideCount := range expectedSides {
		validSideCounts[sideCount] = true
	}

	ids := make(map[int]bool)
	interiorCount := 0
	margin := math.Min(expectedEdgeLength*5, math.Min(board.Width, board.Height)/3)
	for i, tile := range board.Tiles {
		if tile.ID != i {
			t.Errorf("%s board tile at index %d has non-contiguous id %d", name, i, tile.ID)
		}
		if ids[tile.ID] {
			t.Errorf("%s board has duplicate tile id %d", name, tile.ID)
		}
		ids[tile.ID] = true

		if !validSideCounts[len(tile.Points)] {
			t.Errorf("%s board tile %d has unexpected side count %d", name, tile.ID, len(tile.Points))
		}

		for edgeIdx, length := range edgeLengths(tile) {
			if math.Abs(length-expectedEdgeLength) > 1e-6 {
				t.Errorf("%s board tile %d edge %d has length %.6f, expected %.6f", name, tile.ID, edgeIdx, length, expectedEdgeLength)
			}
		}

		center := tileCenter(tile)
		if center[0] > margin && center[1] > margin && center[0] < board.Width-margin && center[1] < board.Height-margin {
			interiorCount++
			if len(tile.Neighbors) != len(tile.Points) {
				t.Errorf("%s board interior tile %d has %d neighbors, expected %d", name, tile.ID, len(tile.Neighbors), len(tile.Points))
			}
		}
	}

	if interiorCount == 0 {
		t.Errorf("%s board did not have any interior tiles for validation", name)
	}

	assertNeighborGraph(t, name, board)
}

func assertNeighborGraph(t *testing.T, name string, board core.Board) {
	t.Helper()
	for _, tile := range board.Tiles {
		seenNeighbors := make(map[int]bool)
		for _, neighborID := range tile.Neighbors {
			if neighborID < 0 || neighborID >= len(board.Tiles) {
				t.Errorf("%s board tile %d has invalid neighbor %d", name, tile.ID, neighborID)
				continue
			}
			if neighborID == tile.ID {
				t.Errorf("%s board tile %d has itself as a neighbor", name, tile.ID)
			}
			if seenNeighbors[neighborID] {
				t.Errorf("%s board tile %d has duplicate neighbor %d", name, tile.ID, neighborID)
			}
			seenNeighbors[neighborID] = true

			if !containsInt(board.Tiles[neighborID].Neighbors, tile.ID) {
				t.Errorf("%s board neighbor symmetry failed between %d and %d", name, tile.ID, neighborID)
			}
		}
	}
}

func containsInt(values []int, target int) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func assertUniformSideSignature(t *testing.T, name string, board core.Board) {
	t.Helper()
	if len(board.Tiles) == 0 {
		return
	}

	expected := sideSignature(board.Tiles[0])
	for _, tile := range board.Tiles[1:] {
		if got := sideSignature(tile); got != expected {
			t.Errorf("%s board tile %d has side signature %s, expected %s", name, tile.ID, got, expected)
		}
	}
}

func sideSignature(tile core.Tile) string {
	lengths := edgeLengths(tile)
	sort.Float64s(lengths)
	return fmt.Sprint(lengths)
}

func edgeLengths(tile core.Tile) []float64 {
	lengths := make([]float64, len(tile.Points))
	for i, p := range tile.Points {
		next := tile.Points[(i+1)%len(tile.Points)]
		dx := p[0] - next[0]
		dy := p[1] - next[1]
		lengths[i] = math.Round(math.Sqrt(dx*dx+dy*dy)*1_000_000) / 1_000_000
	}
	return lengths
}

func tileCenter(tile core.Tile) core.Point {
	var x, y float64
	for _, p := range tile.Points {
		x += p[0]
		y += p[1]
	}
	return core.Point{x / float64(len(tile.Points)), y / float64(len(tile.Points))}
}
