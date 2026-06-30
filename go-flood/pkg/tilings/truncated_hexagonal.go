package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
)

func GenerateTruncatedHexagonalBoard(options Options) core.Board {
	a := options.TileSize
	dist := a * (2.0 + math.Sqrt(3.0))
	cols, rows := options.Cols, options.Rows
	colorCount := options.ColorCount
	rng := options.RNG

	tiles := []core.Tile{}
	dodecaMap := make(map[string]int)
	triangleMap := make(map[string]int)
	idToTileIdx := make(map[int]int)

	getDodecaCenter := func(q, r int) (float64, float64) {
		x := dist * (float64(q) + float64(r)/2.0)
		y := dist * (math.Sqrt(3.0) / 2.0) * float64(r)
		return x, y
	}

	idCounter := 0
	// 1. Generate Dodecagons
	R12 := a / (2.0 * math.Sin(math.Pi/12.0))
	for r := 0; r < rows; r++ {
		rOffset := int(math.Floor(float64(r) / 2.0))
		for q := -rOffset; q < cols-rOffset; q++ {
			cx, cy := getDodecaCenter(q, r)
			id := idCounter
			idCounter++

			points := make([]core.Point, 12)
			for i := 0; i < 12; i++ {
				angle := (30.0*float64(i) + 15.0) * math.Pi / 180.0
				points[i] = core.Point{cx + R12*math.Cos(angle), cy + R12*math.Sin(angle)}
			}

			tile := core.Tile{
				ID:        id,
				ColorID:   int(rng() * float64(colorCount)),
				OwnerID:   nil,
				Points:    points,
				Neighbors: []int{},
			}
			dodecaMap[fmt.Sprintf("%d,%d", q, r)] = id
			idToTileIdx[id] = len(tiles)
			tiles = append(tiles, tile)
		}
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
		rT := a / math.Sqrt(3.0)
		for i := 0; i < 3; i++ {
			vAngle := angle + (float64(i)*120.0)*math.Pi/180.0
			points[i] = core.Point{
				cx + rT*math.Cos(vAngle),
				cy + rT*math.Sin(vAngle),
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

	distT := dist / math.Sqrt(3.0)

	// 2. Build connectivity and generate triangles
	for key, dId := range dodecaMap {
		var q, r int
		fmt.Sscanf(key, "%d,%d", &q, &r)
		cx, cy := getDodecaCenter(q, r)
		dIdx := idToTileIdx[dId]

		directions := [][2]int{{1, 0}, {1, -1}, {0, -1}, {-1, 0}, {-1, 1}, {0, 1}}
		for _, d := range directions {
			if nID, ok := dodecaMap[fmt.Sprintf("%d,%d", q+d[0], r+d[1])]; ok {
				nIdx := idToTileIdx[nID]
				addNeighbor(dIdx, nID)
				addNeighbor(nIdx, dId)
			}
		}

		for i := 0; i < 6; i++ {
			angleT := (60.0*float64(i) + 30.0) * math.Pi / 180.0
			tcx := cx + distT*math.Cos(angleT)
			tcy := cy + distT*math.Sin(angleT)
			tId := getTriangle(tcx, tcy, angleT+math.Pi)
			tIdx := idToTileIdx[tId]

			addNeighbor(dIdx, tId)
			addNeighbor(tIdx, dId)
		}
	}

	// 2.5 Edge culling: remove triangles with fewer than 3 neighbors
	removedIds := make(map[int]bool)
	finalTiles := []core.Tile{}
	for _, t := range tiles {
		isTriangle := false
		for _, id := range triangleMap {
			if t.ID == id {
				isTriangle = true
				break
			}
		}
		if isTriangle && len(t.Neighbors) < 3 {
			removedIds[t.ID] = true
		} else {
			finalTiles = append(finalTiles, t)
		}
	}

	// Re-map IDs and update neighbors
	idMap := make(map[int]int)
	for i := range finalTiles {
		oldId := finalTiles[i].ID
		finalTiles[i].ID = i
		idMap[oldId] = i
	}

	for i := range finalTiles {
		newNeighbors := []int{}
		for _, nId := range finalTiles[i].Neighbors {
			if !removedIds[nId] {
				newNeighbors = append(newNeighbors, idMap[nId])
			}
		}
		finalTiles[i].Neighbors = newNeighbors
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
		if id, ok := dodecaMap[fmt.Sprintf("%d,%d", c.q, c.r)]; ok {
			startTileIds = append(startTileIds, id)
		}
	}

	finalStartTileIds := []int{}
	for _, id := range startTileIds {
		if !removedIds[id] {
			finalStartTileIds = append(finalStartTileIds, idMap[id])
		}
	}

	return core.Board{
		Version:      1,
		Generator:    "truncated-hexagonal",
		Width:        maxX - minX,
		Height:       maxY - minY,
		Cols:         cols,
		Rows:         rows,
		Tiles:        finalTiles,
		StartTileIds: finalStartTileIds,
	}
}
