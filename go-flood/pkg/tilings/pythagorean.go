package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
)

func GeneratePythagoreanBoard(options Options) core.Board {
	a := options.TileSize
	b := a * 0.5

	W := float64(options.Cols) * a
	H := float64(options.Rows) * a
	D := a*a + b*b

	iMax := int(math.Ceil((a*W + b*H) / D)) + 2
	jMin := int(math.Floor(-b * W / D)) - 2
	jMax := int(math.Ceil(a * H / D)) + 2

	type rawTile struct {
		ID        int
		Type      string
		I, J      int
		Points    []core.Point
		Neighbors []*rawTile
	}

	rawTiles := []*rawTile{}
	largeMap := make(map[string]*rawTile)
	smallMap := make(map[string]*rawTile)

	getLargeCenter := func(i, j int) (float64, float64) {
		return float64(i)*a - float64(j)*b, float64(i)*b + float64(j)*a
	}

	getSmallCenter := func(i, j int) (float64, float64) {
		lcx, lcy := getLargeCenter(i, j)
		return lcx + (a+b)/2, lcy + (b-a)/2
	}

	for j := jMin; j <= jMax; j++ {
		for i := -2; i <= iMax; i++ {
			// Large square
			lcx, lcy := getLargeCenter(i, j)
			if lcx >= 0 && lcx <= W && lcy >= 0 && lcy <= H {
				lPoints := []core.Point{
					{lcx - a/2, lcy - a/2},
					{lcx + a/2, lcy - a/2},
					{lcx + a/2, lcy + a/2},
					{lcx - a/2, lcy + a/2},
				}
				tile := &rawTile{
					Type:   "large",
					I:      i,
					J:      j,
					Points: lPoints,
				}
				rawTiles = append(rawTiles, tile)
				largeMap[fmt.Sprintf("%d,%d", i, j)] = tile
			}

			// Small square
			scx, scy := getSmallCenter(i, j)
			if scx >= 0 && scx <= W && scy >= 0 && scy <= H {
				sPoints := []core.Point{
					{scx - b/2, scy - b/2},
					{scx + b/2, scy - b/2},
					{scx + b/2, scy + b/2},
					{scx - b/2, scy + b/2},
				}
				tile := &rawTile{
					Type:   "small",
					I:      i,
					J:      j,
					Points: sPoints,
				}
				rawTiles = append(rawTiles, tile)
				smallMap[fmt.Sprintf("%d,%d", i, j)] = tile
			}
		}
	}

	// Connectivity
	for _, tile := range rawTiles {
		i, j := tile.I, tile.J
		if tile.Type == "large" {
			candidates := []struct {
				m map[string]*rawTile
				k string
			}{
				{largeMap, fmt.Sprintf("%d,%d", i+1, j)},
				{largeMap, fmt.Sprintf("%d,%d", i-1, j)},
				{largeMap, fmt.Sprintf("%d,%d", i, j+1)},
				{largeMap, fmt.Sprintf("%d,%d", i, j-1)},
				{smallMap, fmt.Sprintf("%d,%d", i, j)},
				{smallMap, fmt.Sprintf("%d,%d", i, j+1)},
				{smallMap, fmt.Sprintf("%d,%d", i-1, j+1)},
				{smallMap, fmt.Sprintf("%d,%d", i-1, j)},
			}
			for _, c := range candidates {
				if n, ok := c.m[c.k]; ok {
					tile.Neighbors = append(tile.Neighbors, n)
				}
			}
		} else {
			candidates := []struct {
				m map[string]*rawTile
				k string
			}{
				{largeMap, fmt.Sprintf("%d,%d", i, j)},
				{largeMap, fmt.Sprintf("%d,%d", i+1, j)},
				{largeMap, fmt.Sprintf("%d,%d", i+1, j-1)},
				{largeMap, fmt.Sprintf("%d,%d", i, j-1)},
			}
			for _, c := range candidates {
				if n, ok := c.m[c.k]; ok {
					tile.Neighbors = append(tile.Neighbors, n)
				}
			}
		}
	}

	// Finalize: Re-index and normalize
	tiles := make([]core.Tile, len(rawTiles))
	for idx, rt := range rawTiles {
		rt.ID = idx
	}

	minX, minY := math.MaxFloat64, math.MaxFloat64
	maxX, maxY := -math.MaxFloat64, -math.MaxFloat64

	for idx, rt := range rawTiles {
		neighborIDs := make([]int, len(rt.Neighbors))
		for nIdx, n := range rt.Neighbors {
			neighborIDs[nIdx] = n.ID
		}

		for _, p := range rt.Points {
			minX = math.Min(minX, p[0])
			minY = math.Min(minY, p[1])
			maxX = math.Max(maxX, p[0])
			maxY = math.Max(maxY, p[1])
		}

		tiles[idx] = core.Tile{
			ID:        idx,
			ColorID:   int(options.RNG() * float64(options.ColorCount)),
			Points:    rt.Points,
			Neighbors: neighborIDs,
		}
	}

	for idx := range tiles {
		for pIdx := range tiles[idx].Points {
			tiles[idx].Points[pIdx][0] -= minX
			tiles[idx].Points[pIdx][1] -= minY
		}
	}

	finalW := maxX - minX
	finalH := maxY - minY

	findClosestLarge := func(tx, ty float64) int {
		best := -1
		minDist := math.MaxFloat64
		for idx, rt := range rawTiles {
			if rt.Type != "large" {
				continue
			}
			var cx, cy float64
			for _, p := range rt.Points {
				cx += p[0]
				cy += p[1]
			}
			cx /= float64(len(rt.Points))
			cy /= float64(len(rt.Points))
			d := math.Hypot(cx-tx, cy-ty)
			if d < minDist {
				minDist = d
				best = idx
			}
		}
		return best
	}

	startTileIds := []int{
		findClosestLarge(0, 0),
		findClosestLarge(finalW, 0),
		findClosestLarge(0, finalH),
		findClosestLarge(finalW, finalH),
	}
	// Deduplicate and filter out -1
	uniqueStarts := make(map[int]bool)
	finalStarts := []int{}
	for _, id := range startTileIds {
		if id != -1 && !uniqueStarts[id] {
			uniqueStarts[id] = true
			finalStarts = append(finalStarts, id)
		}
	}

	return core.Board{
		Version:      1,
		Generator:    "pythagorean",
		Width:        finalW,
		Height:       finalH,
		Tiles:        tiles,
		StartTileIds: finalStarts,
	}
}
