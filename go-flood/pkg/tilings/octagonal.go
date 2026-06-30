package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
)

// GenerateOctagonalBoard generates a 4.8.8 semi-regular tessellation board.
// Each vertex is surrounded by one square and two octagons.
// The board consists of flat-topped regular octagons on a rectangular grid,
// with squares filling the gaps between diagonal octagon pairs.
func GenerateOctagonalBoard(options Options) core.Board {
	a := options.TileSize
	// Apothem of a regular octagon with side length a
	// For a regular octagon: apothem = a / (2 * tan(π/8)) = a(1+√2)/2
	apothem := a * (1 + math.Sqrt(2)) / 2.0
	// Distance between adjacent octagon centers (horizontal/vertical)
	D := 2.0 * apothem
	cols, rows := options.Cols, options.Rows
	colorCount := options.ColorCount
	rng := options.RNG

	tiles := []core.Tile{}
	octagonMap := make(map[string]int)
	squareMap := make(map[string]int)
	idToTileIdx := make(map[int]int)

	getOctagonCenter := func(q, r int) (float64, float64) {
		x := D * float64(q)
		y := D * float64(r)
		return x, y
	}

	idCounter := 0

	// 1. Generate octagons
	for r := 0; r < rows; r++ {
		for q := 0; q < cols; q++ {
			cx, cy := getOctagonCenter(q, r)
			id := idCounter
			idCounter++

			points := make([]core.Point, 8)
			for i := 0; i < 8; i++ {
				angle := (22.5 + 45.0*float64(i)) * math.Pi / 180.0
				points[i] = core.Point{
					cx + apothem*math.Cos(angle),
					cy + apothem*math.Sin(angle),
				}
			}

			tile := core.Tile{
				ID:        id,
				ColorID:   int(rng() * float64(colorCount)),
				OwnerID:   nil,
				Points:    points,
				Neighbors: []int{},
			}
			octagonMap[fmt.Sprintf("%d,%d", q, r)] = id
			idToTileIdx[id] = len(tiles)
			tiles = append(tiles, tile)
		}
	}

	// Helper for squares - uses position key for deduplication
	getSquare := func(cx, cy float64) int {
		key := fmt.Sprintf("%d,%d", int(math.Round(cx*100)), int(math.Round(cy*100)))
		if id, ok := squareMap[key]; ok {
			return id
		}

		id := idCounter
		idCounter++

		// Square rotated 45° (diamond) so sides face the octagons
		apothemSq := a / math.Sqrt(2.0)
		points := []core.Point{
			{cx, cy - apothemSq},
			{cx + apothemSq, cy},
			{cx, cy + apothemSq},
			{cx - apothemSq, cy},
		}

		tile := core.Tile{
			ID:        id,
			ColorID:   int(rng() * float64(colorCount)),
			OwnerID:   nil,
			Points:    points,
			Neighbors: []int{},
		}
		squareMap[key] = id
		idToTileIdx[id] = len(tiles)
		tiles = append(tiles, tile)
		return id
	}

	// 2. Build connectivity and generate squares
	for key, oId := range octagonMap {
		var q, r int
		fmt.Sscanf(key, "%d,%d", &q, &r)
		cx, cy := getOctagonCenter(q, r)
		oIdx := idToTileIdx[oId]

		// Distance from octagon center to square center
		// Square is at diagonal direction, at distance apothem + a/2
		distSq := apothem + a/2.0

		// Four diagonal squares
		diagonalDirs := [][2]float64{
			{distSq / math.Sqrt(2), distSq / math.Sqrt(2)},   // northeast
			{-distSq / math.Sqrt(2), distSq / math.Sqrt(2)},  // northwest
			{-distSq / math.Sqrt(2), -distSq / math.Sqrt(2)}, // southwest
			{distSq / math.Sqrt(2), -distSq / math.Sqrt(2)},  // southeast
		}

		for _, d := range diagonalDirs {
			scx := cx + d[0]
			scy := cy + d[1]
			sId := getSquare(scx, scy)
			sIdx := idToTileIdx[sId]

			addNeighbor := func(idx1, id2 int) {
				for _, n := range tiles[idx1].Neighbors {
					if n == id2 {
						return
					}
				}
				tiles[idx1].Neighbors = append(tiles[idx1].Neighbors, id2)
			}

			addNeighbor(oIdx, sId)
			addNeighbor(sIdx, oId)
		}

		// Four orthogonal octagon neighbors
		orthogonalDirs := [][2]int{
			{1, 0}, {-1, 0}, {0, 1}, {0, -1},
		}
		for _, d := range orthogonalDirs {
			nq, nr := q+d[0], r+d[1]
			if nq < 0 || nq >= cols || nr < 0 || nr >= rows {
				continue
			}
			if nId, ok := octagonMap[fmt.Sprintf("%d,%d", nq, nr)]; ok {
				nIdx := idToTileIdx[nId]
				addNeighbor := func(idx1, id2 int) {
					for _, n := range tiles[idx1].Neighbors {
						if n == id2 {
							return
						}
					}
					tiles[idx1].Neighbors = append(tiles[idx1].Neighbors, id2)
				}
				addNeighbor(oIdx, nId)
				addNeighbor(nIdx, oId)
			}
		}
	}

	// 3. Finalize - bounds normalization
	minX, minY := math.MaxFloat64, math.MaxFloat64
	maxX, maxY := -math.MaxFloat64, -math.MaxFloat64
	for _, t := range tiles {
		for _, p := range t.Points {
			minX = math.Min(minX, p[0])
			minY = math.Min(minY, p[1])
			maxX = math.Max(maxX, p[0])
			maxY = math.Max(maxY, p[1])
		}
	}

	for i := range tiles {
		for j := range tiles[i].Points {
			tiles[i].Points[j][0] -= minX
			tiles[i].Points[j][1] -= minY
		}
	}

	startTileIds := []int{}
	corners := [][2]int{
		{0, 0},
		{cols - 1, 0},
		{0, rows - 1},
		{cols - 1, rows - 1},
	}
	for _, c := range corners {
		if id, ok := octagonMap[fmt.Sprintf("%d,%d", c[0], c[1])]; ok {
			startTileIds = append(startTileIds, id)
		}
	}

	return core.Board{
		Version:      1,
		Generator:    "4.8.8",
		Width:        maxX - minX,
		Height:       maxY - minY,
		Cols:         cols,
		Rows:         rows,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}
