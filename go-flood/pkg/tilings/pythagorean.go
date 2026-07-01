package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
)

func GeneratePythagoreanBoard(options Options) core.Board {
	a := options.TileSize
	b := a * 0.5

	tiles := make([]core.Tile, 0, options.Rows*options.Cols*2)
	largeMap := make(map[string]int)
	smallMap := make(map[string]int)

	getLargeCenter := func(i, j int) (float64, float64) {
		return float64(i)*a - float64(j)*b, float64(i)*b + float64(j)*a
	}

	getSmallCenter := func(i, j int) (float64, float64) {
		lcx, lcy := getLargeCenter(i, j)
		return lcx + (a+b)/2, lcy + (b-a)/2
	}

	idCounter := 0
	for j := 0; j < options.Rows; j++ {
		for i := 0; i < options.Cols; i++ {
			// Large square
			lcx, lcy := getLargeCenter(i, j)
			lid := idCounter
			idCounter++
			lPoints := []core.Point{
				{lcx - a/2, lcy - a/2},
				{lcx + a/2, lcy - a/2},
				{lcx + a/2, lcy + a/2},
				{lcx - a/2, lcy + a/2},
			}
			tiles = append(tiles, core.Tile{
				ID:      lid,
				ColorID: int(options.RNG() * float64(options.ColorCount)),
				Points:  lPoints,
			})
			largeMap[fmt.Sprintf("%d,%d", i, j)] = lid

			// Small square
			scx, scy := getSmallCenter(i, j)
			sid := idCounter
			idCounter++
			sPoints := []core.Point{
				{scx - b/2, scy - b/2},
				{scx + b/2, scy - b/2},
				{scx + b/2, scy + b/2},
				{scx - b/2, scy + b/2},
			}
			tiles = append(tiles, core.Tile{
				ID:      sid,
				ColorID: int(options.RNG() * float64(options.ColorCount)),
				Points:  sPoints,
			})
			smallMap[fmt.Sprintf("%d,%d", i, j)] = sid
		}
	}

	// Reverse maps for efficiency
	idToCoords := make(map[int]struct {
		i, j    int
		isLarge bool
	})
	for k, v := range largeMap {
		var i, j int
		fmt.Sscanf(k, "%d,%d", &i, &j)
		idToCoords[v] = struct {
			i, j    int
			isLarge bool
		}{i, j, true}
	}
	for k, v := range smallMap {
		var i, j int
		fmt.Sscanf(k, "%d,%d", &i, &j)
		idToCoords[v] = struct {
			i, j    int
			isLarge bool
		}{i, j, false}
	}

	// Connectivity
	for idx := range tiles {
		tile := &tiles[idx]
		coords := idToCoords[tile.ID]
		i, j := coords.i, coords.j

		if coords.isLarge {
			neighbors := []struct {
				i, j    int
				isLarge bool
			}{
				{i + 1, j, true},
				{i - 1, j, true},
				{i, j + 1, true},
				{i, j - 1, true},
				{i, j, false},
				{i, j + 1, false},
				{i - 1, j + 1, false},
				{i - 1, j, false},
			}
			for _, n := range neighbors {
				var nId int
				var ok bool
				if n.isLarge {
					nId, ok = largeMap[fmt.Sprintf("%d,%d", n.i, n.j)]
				} else {
					nId, ok = smallMap[fmt.Sprintf("%d,%d", n.i, n.j)]
				}
				if ok {
					tile.Neighbors = append(tile.Neighbors, nId)
				}
			}
		} else {
			neighbors := []struct{ i, j int }{
				{i, j},
				{i + 1, j},
				{i + 1, j - 1},
				{i, j - 1},
			}
			for _, n := range neighbors {
				if nId, ok := largeMap[fmt.Sprintf("%d,%d", n.i, n.j)]; ok {
					tile.Neighbors = append(tile.Neighbors, nId)
				}
			}
		}
	}

	// Bounding box and offset
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

	for idx := range tiles {
		for pIdx := range tiles[idx].Points {
			tiles[idx].Points[pIdx][0] -= minX
			tiles[idx].Points[pIdx][1] -= minY
		}
	}

	startTileIds := []int{}
	corners := []string{"0,0", fmt.Sprintf("%d,0", options.Cols-1), fmt.Sprintf("0,%d", options.Rows-1), fmt.Sprintf("%d,%d", options.Cols-1, options.Rows-1)}
	for _, c := range corners {
		if id, ok := largeMap[c]; ok {
			startTileIds = append(startTileIds, id)
		}
	}

	return core.Board{
		Version:      1,
		Generator:    "pythagorean",
		Width:        maxX - minX,
		Height:       maxY - minY,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}
