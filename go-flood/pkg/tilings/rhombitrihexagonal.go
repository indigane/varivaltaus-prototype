package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
)

func GenerateRhombitrihexagonalBoard(options Options) core.Board {
	a := options.TileSize
	D := a * (1 + math.Sqrt(3))
	cols, rows := options.Cols, options.Rows
	colorCount := options.ColorCount
	rng := options.RNG

	tiles := []core.Tile{}
	hexMap := make(map[string]int)
	squareMap := make(map[string]int)
	triangleMap := make(map[string]int)
	idToTileIdx := make(map[int]int)

	getHexCenter := func(q, r int) (float64, float64) {
		x := D * (float64(q) + float64(r)/2.0)
		y := D * (math.Sqrt(3) / 2.0) * float64(r)
		return x, y
	}

	idCounter := 0
	// 1. Generate Hexagons
	for r := 0; r < rows; r++ {
		rOffset := int(math.Floor(float64(r) / 2.0))
		for q := -rOffset; q < cols-rOffset; q++ {
			cx, cy := getHexCenter(q, r)
			id := idCounter
			idCounter++

			points := make([]core.Point, 6)
			for i := 0; i < 6; i++ {
				angle := float64(60*i-30) * math.Pi / 180.0
				points[i] = core.Point{cx + a*math.Cos(angle), cy + a*math.Sin(angle)}
			}

			tile := core.Tile{
				ID:        id,
				ColorID:   int(rng() * float64(colorCount)),
				OwnerID:   nil,
				Points:    points,
				Neighbors: []int{},
			}
			hexMap[fmt.Sprintf("%d,%d", q, r)] = id
			idToTileIdx[id] = len(tiles)
			tiles = append(tiles, tile)
		}
	}

	// Helper for squares
	getSquare := func(cx, cy, angle float64) int {
		key := fmt.Sprintf("%d,%d", int(math.Round(cx*100)), int(math.Round(cy*100)))
		if id, ok := squareMap[key]; ok {
			return id
		}

		id := idCounter
		idCounter++
		points := make([]core.Point, 4)
		for i := 0; i < 4; i++ {
			vAngle := angle + (45.0+90.0*float64(i))*math.Pi/180.0
			points[i] = core.Point{
				cx + (a / math.Sqrt(2.0)) * math.Cos(vAngle),
				cy + (a / math.Sqrt(2.0)) * math.Sin(vAngle),
			}
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

	// Helper for triangles
	getTriangle := func(cx, cy, angle float64) int {
		key := fmt.Sprintf("%d,%d", int(math.Round(cx*100)), int(math.Round(cy*100)))
		if id, ok := triangleMap[key]; ok {
			return id
		}

		id := idCounter
		idCounter++
		points := make([]core.Point, 3)
		distToVertex := a / math.Sqrt(3.0)
		for i := 0; i < 3; i++ {
			vAngle := angle + (120.0*float64(i))*math.Pi/180.0
			points[i] = core.Point{
				cx + distToVertex*math.Cos(vAngle),
				cy + distToVertex*math.Sin(vAngle),
			}
		}

		tile := core.Tile{
			ID:        id,
			ColorID:   int(rng() * float64(colorCount)),
			OwnerID:   nil,
			Points:    points,
			Neighbors: []int{},
		}
		triangleMap[key] = id
		idToTileIdx[id] = len(tiles)
		tiles = append(tiles, tile)
		return id
	}

	distS := (a * math.Sqrt(3.0) / 2.0) + (a / 2.0)
	distT := a + (a / math.Sqrt(3.0))

	// 2. Build connectivity and generate squares/triangles
	for key, hId := range hexMap {
		var q, r int
		fmt.Sscanf(key, "%d,%d", &q, &r)
		cx, cy := getHexCenter(q, r)
		hIdx := idToTileIdx[hId]

		for i := 0; i < 6; i++ {
			// Squares
			angleS := float64(60*i) * math.Pi / 180.0
			scx := cx + distS*math.Cos(angleS)
			scy := cy + distS*math.Sin(angleS)
			sId := getSquare(scx, scy, angleS)
			sIdx := idToTileIdx[sId]

			addNeighbor := func(idx1, id2 int) {
				found := false
				for _, n := range tiles[idx1].Neighbors {
					if n == id2 {
						found = true
						break
					}
				}
				if !found {
					tiles[idx1].Neighbors = append(tiles[idx1].Neighbors, id2)
				}
			}

			addNeighbor(hIdx, sId)
			addNeighbor(sIdx, hId)

			// Triangles
			angleT := float64(60*i-30) * math.Pi / 180.0
			tcx := cx + distT*math.Cos(angleT)
			tcy := cy + distT*math.Sin(angleT)
			tId := getTriangle(tcx, tcy, angleT+math.Pi)
			tIdx := idToTileIdx[tId]

			// This triangle is adjacent to current square and next square (i-1)
			addNeighbor(tIdx, sId)
			addNeighbor(sIdx, tId)

			angleS2 := float64(60*(i-1)) * math.Pi / 180.0
			scx2 := cx + distS*math.Cos(angleS2)
			scy2 := cy + distS*math.Sin(angleS2)
			sId2 := getSquare(scx2, scy2, angleS2)
			sIdx2 := idToTileIdx[sId2]

			addNeighbor(tIdx, sId2)
			addNeighbor(sIdx2, tId)
		}
	}

	// 3. Finalize
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
	corners := []struct{ q, r int }{
		{0, 0},
		{cols - 1, 0},
		{-int(math.Floor(float64(rows-1) / 2.0)), rows - 1},
		{cols - 1 - int(math.Floor(float64(rows-1)/2.0)), rows - 1},
	}
	for _, c := range corners {
		if id, ok := hexMap[fmt.Sprintf("%d,%d", c.q, c.r)]; ok {
			startTileIds = append(startTileIds, id)
		}
	}

	return core.Board{
		Version:      1,
		Generator:    "rhombitrihexagonal",
		Width:        maxX - minX,
		Height:       maxY - minY,
		Cols:         cols,
		Rows:         rows,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}
