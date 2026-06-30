package tilings

import (
	"go-flood/pkg/core"
	"math"
)

func GenerateElongatedTriangularBoard(options Options) core.Board {
	a := options.TileSize
	h := a * math.Sqrt(3.0) / 2.0
	cols, rows := options.Cols, options.Rows
	colorCount := options.ColorCount
	rng := options.RNG

	tiles := []core.Tile{}
	idCounter := 0

	for r := 0; r < rows; r++ {
		isSquareRow := (r % 2 == 0)
		// yBase is the accumulation of heights of previous rows
		yBase := float64(r/2) * (a + h)
		if !isSquareRow {
			yBase += a
		}

		// Offset for square rows to ensure they align with triangle tips
		// Row 0 (Square): offset a/2
		// Row 1 (Triangle): connects a/2 to 0
		// Row 2 (Square): offset 0
		// Row 3 (Triangle): connects 0 to a/2

		squareRowIdx := r / 2
		offset := 0.0
		if isSquareRow && (squareRowIdx%2 == 0) {
			offset = a / 2.0
		}

		if isSquareRow {
			for q := 0; q < cols; q++ {
				x := float64(q)*a + offset
				y := yBase
				points := []core.Point{
					{x, y},
					{x + a, y},
					{x + a, y + a},
					{x, y + a},
				}
				tiles = append(tiles, core.Tile{
					ID:        idCounter,
					ColorID:   int(rng() * float64(colorCount)),
					OwnerID:   nil,
					Points:    points,
					Neighbors: []int{},
				})
				idCounter++
			}
		} else {
			// Triangle row
			// It connects square row below (offset_below) to square row above (offset_above)
			offsetBelow := 0.0
			if (squareRowIdx % 2 == 0) {
				offsetBelow = a / 2.0
			}
			offsetAbove := a / 2.0 - offsetBelow

			for q := -1; q < cols+1; q++ {
				// isUp triangle: base at yBase (bottom), tip at yBase + h (top)
				// tip should be at offsetAbove + q*a
				// base should be from offsetBelow + (q-1)*a + a/2 to offsetBelow + q*a + a/2

				// Wait, let's simplify.
				// Vertex set A (bottom): offsetBelow + q*a
				// Vertex set B (top): offsetAbove + q*a

				// Up-triangles: (offsetBelow + q*a, yBase), (offsetBelow + (q+1)*a, yBase), (offsetAbove + q*a or q+1? * a, yBase + h)
				// Let's check: if offsetBelow = a/2, offsetAbove = 0.
				// Bottom vertices: ... -a/2, a/2, 3a/2 ...
				// Top vertices: ... 0, a, 2a ...
				// Up-triangle 1: (a/2, yBase), (3a/2, yBase), (a, yBase+h)
				// Down-triangle 1: (0, yBase+h), (a, yBase+h), (a/2, yBase)

				xBelow := float64(q)*a + offsetBelow
				xAbove := float64(q)*a + offsetAbove

				// Up triangle
				pUp := []core.Point{
					{xBelow, yBase},
					{xBelow + a, yBase},
					{xAbove + a, yBase + h},
				}
				if offsetBelow > offsetAbove {
					pUp[2] = core.Point{xAbove, yBase + h}
				}

				tiles = append(tiles, core.Tile{
					ID:        idCounter,
					ColorID:   int(rng() * float64(colorCount)),
					OwnerID:   nil,
					Points:    pUp,
					Neighbors: []int{},
				})
				idCounter++

				// Down triangle
				pDown := []core.Point{
					{xAbove, yBase + h},
					{xAbove + a, yBase + h},
					{xBelow, yBase},
				}
				if offsetBelow < offsetAbove {
					pDown[2] = core.Point{xBelow + a, yBase}
				}

				tiles = append(tiles, core.Tile{
					ID:        idCounter,
					ColorID:   int(rng() * float64(colorCount)),
					OwnerID:   nil,
					Points:    pDown,
					Neighbors: []int{},
				})
				idCounter++
			}
		}
	}

	// Connectivity via vertex proximity
	addNeighbor := func(idx1, id2 int) {
		for _, n := range tiles[idx1].Neighbors {
			if n == id2 {
				return
			}
		}
		tiles[idx1].Neighbors = append(tiles[idx1].Neighbors, id2)
	}

	for i := 0; i < len(tiles); i++ {
		for j := i + 1; j < len(tiles); j++ {
			common := 0
			for _, p1 := range tiles[i].Points {
				for _, p2 := range tiles[j].Points {
					dx := p1[0] - p2[0]
					dy := p1[1] - p2[1]
					if dx*dx+dy*dy < 0.01 {
						common++
						break
					}
				}
			}
			if common >= 2 {
				addNeighbor(i, tiles[j].ID)
				addNeighbor(j, tiles[i].ID)
			}
		}
	}

	// Finalize: normalize coordinates and filter out-of-bounds tiles
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

	// Crop to roughly cols * a width
	targetWidth := float64(cols) * a
	finalTiles := []core.Tile{}
	newIdCounter := 0

	for _, t := range tiles {
		centroidX := 0.0
		for _, p := range t.Points { centroidX += p[0] }
		centroidX /= float64(len(t.Points))

		if centroidX >= minX && centroidX <= minX + targetWidth {
			t.ID = newIdCounter
			newIdCounter++
			for i := range t.Points {
				t.Points[i][0] -= minX
				t.Points[i][1] -= minY
			}
			t.Neighbors = []int{} // Will rebuild
			finalTiles = append(finalTiles, t)
		}
	}

	// Rebuild connectivity for finalTiles
	for i := 0; i < len(finalTiles); i++ {
		for j := i + 1; j < len(finalTiles); j++ {
			common := 0
			for _, p1 := range finalTiles[i].Points {
				for _, p2 := range finalTiles[j].Points {
					dx := p1[0] - p2[0]
					dy := p1[1] - p2[1]
					if dx*dx+dy*dy < 0.01 {
						common++
						break
					}
				}
			}
			if common >= 2 {
				finalTiles[i].Neighbors = append(finalTiles[i].Neighbors, finalTiles[j].ID)
				finalTiles[j].Neighbors = append(finalTiles[j].Neighbors, finalTiles[i].ID)
			}
		}
	}

	startTileIds := []int{}
	if len(finalTiles) > 0 {
		startTileIds = append(startTileIds, 0)
		startTileIds = append(startTileIds, finalTiles[len(finalTiles)-1].ID)
	}

	return core.Board{
		Version:      1,
		Generator:    "elongated-triangular",
		Width:        targetWidth,
		Height:       maxY - minY,
		Cols:         cols,
		Rows:         rows,
		Tiles:        finalTiles,
		StartTileIds: startTileIds,
	}
}
