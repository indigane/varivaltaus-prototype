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

	board = GenerateBrickBoard(opts)
	if len(board.Tiles) != 100 {
		t.Errorf("Expected 100 tiles for brick board, got %d", len(board.Tiles))
	}
	assertNeighborGraph(t, "brick", board)

	board = GenerateBasketWeaveBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for basket-weave board")
	}
	assertNeighborGraph(t, "basket-weave", board)
	assertBasketWeaveBalancedEdges(t, board, opts.TileSize)

	board = GenerateWaffleBoard(opts)
	if len(board.Tiles) != opts.Rows*opts.Cols*5 {
		t.Errorf("Expected %d tiles for waffle board, got %d", opts.Rows*opts.Cols*5, len(board.Tiles))
	}
	assertNeighborGraph(t, "waffle", board)

	board = GenerateTriangularWeaveBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for triangular-weave board")
	}
	assertTriangularWeaveBoard(t, board, opts.TileSize)
	assertTopBottomEdgeTypeCoverage(t, "triangular-weave", board, 6, 9)

	board = GenerateTwoTriangleWeaveBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for two-triangle-weave board")
	}
	assertTwoTriangleWeaveBoard(t, board, opts.TileSize)

	board = GenerateHexParallelogramWeaveBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for hex-parallelogram-weave board")
	}
	assertHexParallelogramWeaveBoard(t, board, opts.TileSize)
	assertTopBottomEdgeTypeCoverage(t, "hex-parallelogram-weave", board, 3, 10, 12)

	board = GenerateTrapezoidTriangleWeaveBoard(opts)
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for trapezoid-triangle-weave board")
	}
	assertTrapezoidTriangleWeaveBoard(t, board, opts.TileSize)
	assertTrapezoidTriangleUnitsComplete(t, board)
	assertTrapezoidTriangleFlatTopBottom(t, opts)

	highRowOpts := opts
	highRowOpts.Cols = 8
	highRowOpts.Rows = 50
	highRowOpts.TileSize = 10
	highRowOpts.RNG = core.CreateRNG(2)
	assertHighRowBottomLeftCoverage(t, "triangular-weave", GenerateTriangularWeaveBoard(highRowOpts), 6, 9)
	highRowOpts.RNG = core.CreateRNG(3)
	assertHighRowBottomLeftCoverage(t, "two-triangle-weave", GenerateTwoTriangleWeaveBoard(highRowOpts), 3, 6)
	highRowOpts.RNG = core.CreateRNG(4)
	assertHighRowBottomLeftCoverage(t, "hex-parallelogram-weave", GenerateHexParallelogramWeaveBoard(highRowOpts), 3, 10, 12)
	highRowOpts.RNG = core.CreateRNG(5)
	assertHighRowBottomLeftCoverage(t, "trapezoid-triangle-weave", GenerateTrapezoidTriangleWeaveBoard(highRowOpts), 9, 11)

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

func assertHighRowBottomLeftCoverage(t *testing.T, name string, board core.Board, expectedSideCounts ...int) {
	t.Helper()
	if len(board.Tiles) == 0 {
		t.Errorf("%s high-row board generated no tiles", name)
		return
	}

	counts := map[int]int{}
	for _, tile := range board.Tiles {
		center := tileCenter(tile)
		if center[0] < board.Width*0.25 && center[1] > board.Height*0.75 {
			counts[len(tile.Points)]++
		}
	}

	for _, sideCount := range expectedSideCounts {
		if counts[sideCount] == 0 {
			t.Errorf("%s high-row bottom-left crop is missing %d-sided tiles", name, sideCount)
		}
	}
}

func assertBasketWeaveBalancedEdges(t *testing.T, board core.Board, unit float64) {
	t.Helper()
	hasLeftVertical := false
	hasRightVertical := false
	hasBottomHorizontal := false
	for _, tile := range board.Tiles {
		minX, minY, maxX, maxY := tileBoundingBox(tile)
		_ = minY
		width := maxX - minX
		height := maxY - minY
		if minX <= unit+1e-6 && math.Abs(width-unit) < 1e-6 && math.Abs(height-3*unit) < 1e-6 {
			hasLeftVertical = true
		}
		if maxX >= board.Width-unit-1e-6 && math.Abs(width-unit) < 1e-6 && math.Abs(height-3*unit) < 1e-6 {
			hasRightVertical = true
		}
		if maxY >= board.Height-unit-1e-6 && math.Abs(width-3*unit) < 1e-6 && math.Abs(height-unit) < 1e-6 {
			hasBottomHorizontal = true
		}
	}
	if !hasLeftVertical {
		t.Errorf("basket-weave board is missing left-edge vertical 1x3 balance tiles")
	}
	if !hasRightVertical {
		t.Errorf("basket-weave board is missing right-edge vertical 1x3 balance tiles")
	}
	if !hasBottomHorizontal {
		t.Errorf("basket-weave board is missing bottom-edge horizontal 3x1 balance tiles")
	}
}

func assertTopBottomEdgeTypeCoverage(t *testing.T, name string, board core.Board, expectedSideCounts ...int) {
	t.Helper()
	topCounts := map[int]bool{}
	bottomCounts := map[int]bool{}
	for _, tile := range board.Tiles {
		center := tileCenter(tile)
		if center[1] < board.Height*0.2 {
			topCounts[len(tile.Points)] = true
		}
		if center[1] > board.Height*0.8 {
			bottomCounts[len(tile.Points)] = true
		}
	}
	for _, sideCount := range expectedSideCounts {
		if !topCounts[sideCount] {
			t.Errorf("%s board top edge is missing %d-sided tiles", name, sideCount)
		}
		if !bottomCounts[sideCount] {
			t.Errorf("%s board bottom edge is missing %d-sided tiles", name, sideCount)
		}
	}
}

func assertTrapezoidTriangleUnitsComplete(t *testing.T, board core.Board) {
	t.Helper()
	for _, tile := range board.Tiles {
		if len(tile.Points) != 9 {
			continue
		}
		trapezoidNeighbors := 0
		for _, neighborID := range tile.Neighbors {
			if neighborID >= 0 && neighborID < len(board.Tiles) && len(board.Tiles[neighborID].Points) == 11 {
				trapezoidNeighbors++
			}
		}
		if trapezoidNeighbors != 3 {
			t.Errorf("trapezoid-triangle-weave triangle tile %d has %d trapezoid neighbors, expected 3", tile.ID, trapezoidNeighbors)
		}
	}
}

func assertTriangularWeaveBoard(t *testing.T, board core.Board, expectedEdgeLength float64) {
	t.Helper()
	name := "triangular-weave"
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for %s board", name)
		return
	}

	ids := make(map[int]bool)
	interiorCount := 0
	interiorHexCount := 0
	interiorTriangleCount := 0
	margin := math.Min(expectedEdgeLength*5, math.Min(board.Width, board.Height)/3)
	for i, tile := range board.Tiles {
		if tile.ID != i {
			t.Errorf("%s board tile at index %d has non-contiguous id %d", name, i, tile.ID)
		}
		if ids[tile.ID] {
			t.Errorf("%s board has duplicate tile id %d", name, tile.ID)
		}
		ids[tile.ID] = true

		if len(tile.Points) != 6 && len(tile.Points) != 9 {
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
			if len(tile.Neighbors) != 6 {
				t.Errorf("%s board interior tile %d has %d neighbors, expected 6", name, tile.ID, len(tile.Neighbors))
			}
			if len(tile.Points) == 6 {
				interiorHexCount++
				for _, neighborID := range tile.Neighbors {
					if neighborID >= 0 && neighborID < len(board.Tiles) && len(board.Tiles[neighborID].Points) != 9 {
						t.Errorf("%s board interior hex tile %d has non-triangle neighbor %d", name, tile.ID, neighborID)
					}
				}
			} else if len(tile.Points) == 9 {
				interiorTriangleCount++
			}
		}
	}

	if interiorCount == 0 {
		t.Errorf("%s board did not have any interior tiles for validation", name)
	}
	if interiorHexCount == 0 {
		t.Errorf("%s board did not have any interior hexagons for validation", name)
	}
	if interiorTriangleCount == 0 {
		t.Errorf("%s board did not have any interior large triangles for validation", name)
	}

	assertNeighborGraph(t, name, board)
}

func assertTwoTriangleWeaveBoard(t *testing.T, board core.Board, expectedEdgeLength float64) {
	t.Helper()
	name := "two-triangle-weave"
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for %s board", name)
		return
	}

	ids := make(map[int]bool)
	smallCount := 0
	largeCount := 0
	for i, tile := range board.Tiles {
		if tile.ID != i {
			t.Errorf("%s board tile at index %d has non-contiguous id %d", name, i, tile.ID)
		}
		if ids[tile.ID] {
			t.Errorf("%s board has duplicate tile id %d", name, tile.ID)
		}
		ids[tile.ID] = true

		if len(tile.Points) == 3 {
			smallCount++
		} else if len(tile.Points) == 6 {
			largeCount++
		} else {
			t.Errorf("%s board tile %d has unexpected side count %d", name, tile.ID, len(tile.Points))
		}

		for edgeIdx, length := range edgeLengths(tile) {
			if math.Abs(length-expectedEdgeLength) > 1e-6 {
				t.Errorf("%s board tile %d edge %d has length %.6f, expected %.6f", name, tile.ID, edgeIdx, length, expectedEdgeLength)
			}
		}
	}

	if smallCount == 0 {
		t.Errorf("%s board did not include any small triangles", name)
	}
	if largeCount == 0 {
		t.Errorf("%s board did not include any large triangles", name)
	}

	assertNeighborGraph(t, name, board)
}

func assertHexParallelogramWeaveBoard(t *testing.T, board core.Board, expectedEdgeLength float64) {
	t.Helper()
	name := "hex-parallelogram-weave"
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for %s board", name)
		return
	}

	ids := make(map[int]bool)
	triangleCount := 0
	parallelogramCount := 0
	hexCount := 0
	for i, tile := range board.Tiles {
		if tile.ID != i {
			t.Errorf("%s board tile at index %d has non-contiguous id %d", name, i, tile.ID)
		}
		if ids[tile.ID] {
			t.Errorf("%s board has duplicate tile id %d", name, tile.ID)
		}
		ids[tile.ID] = true

		switch len(tile.Points) {
		case 3:
			triangleCount++
		case 10:
			parallelogramCount++
		case 12:
			hexCount++
		default:
			t.Errorf("%s board tile %d has unexpected side count %d", name, tile.ID, len(tile.Points))
		}

		for edgeIdx, length := range edgeLengths(tile) {
			if math.Abs(length-expectedEdgeLength) > 1e-6 {
				t.Errorf("%s board tile %d edge %d has length %.6f, expected %.6f", name, tile.ID, edgeIdx, length, expectedEdgeLength)
			}
		}
	}

	if triangleCount == 0 {
		t.Errorf("%s board did not include any small triangles", name)
	}
	if parallelogramCount == 0 {
		t.Errorf("%s board did not include any parallelograms", name)
	}
	if hexCount == 0 {
		t.Errorf("%s board did not include any hexagons", name)
	}

	assertNeighborGraph(t, name, board)
}

func assertTrapezoidTriangleFlatTopBottom(t *testing.T, opts Options) {
	t.Helper()
	for _, rows := range []int{5, 6, 7, opts.Rows} {
		rowOpts := opts
		rowOpts.Rows = rows
		rowOpts.RNG = core.CreateRNG(uint32(5000 + rows))
		board := GenerateTrapezoidTriangleWeaveBoard(rowOpts)
		if !hasHorizontalBoundaryEdge(board, 0) {
			t.Errorf("trapezoid-triangle-weave rows=%d has a spiky top edge", rows)
		}
		if !hasHorizontalBoundaryEdge(board, board.Height) {
			t.Errorf("trapezoid-triangle-weave rows=%d has a spiky bottom edge", rows)
		}
	}
}

func hasHorizontalBoundaryEdge(board core.Board, y float64) bool {
	for _, tile := range board.Tiles {
		for i, a := range tile.Points {
			b := tile.Points[(i+1)%len(tile.Points)]
			if math.Abs(a[1]-y) < 1e-6 && math.Abs(b[1]-y) < 1e-6 && math.Abs(a[0]-b[0]) > 1e-6 {
				return true
			}
		}
	}
	return false
}

func assertTrapezoidTriangleWeaveBoard(t *testing.T, board core.Board, expectedEdgeLength float64) {
	t.Helper()
	name := "trapezoid-triangle-weave"
	if len(board.Tiles) == 0 {
		t.Errorf("Expected some tiles for %s board", name)
		return
	}

	ids := make(map[int]bool)
	triangleCount := 0
	trapezoidCount := 0
	for i, tile := range board.Tiles {
		if tile.ID != i {
			t.Errorf("%s board tile at index %d has non-contiguous id %d", name, i, tile.ID)
		}
		if ids[tile.ID] {
			t.Errorf("%s board has duplicate tile id %d", name, tile.ID)
		}
		ids[tile.ID] = true

		switch len(tile.Points) {
		case 9:
			triangleCount++
		case 11:
			trapezoidCount++
		default:
			t.Errorf("%s board tile %d has unexpected side count %d", name, tile.ID, len(tile.Points))
		}

		for edgeIdx, length := range edgeLengths(tile) {
			if math.Abs(length-expectedEdgeLength) > 1e-6 {
				t.Errorf("%s board tile %d edge %d has length %.6f, expected %.6f", name, tile.ID, edgeIdx, length, expectedEdgeLength)
			}
		}
	}

	if triangleCount == 0 {
		t.Errorf("%s board did not include any triangles", name)
	}
	if trapezoidCount == 0 {
		t.Errorf("%s board did not include any trapezoids", name)
	}

	assertNeighborGraph(t, name, board)
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

func tileBoundingBox(tile core.Tile) (float64, float64, float64, float64) {
	minX := math.MaxFloat64
	minY := math.MaxFloat64
	maxX := -math.MaxFloat64
	maxY := -math.MaxFloat64
	for _, p := range tile.Points {
		minX = math.Min(minX, p[0])
		minY = math.Min(minY, p[1])
		maxX = math.Max(maxX, p[0])
		maxY = math.Max(maxY, p[1])
	}
	return minX, minY, maxX, maxY
}

func tileCenter(tile core.Tile) core.Point {
	var x, y float64
	for _, p := range tile.Points {
		x += p[0]
		y += p[1]
	}
	return core.Point{x / float64(len(tile.Points)), y / float64(len(tile.Points))}
}
