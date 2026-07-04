package tilings

import (
	"go-flood/pkg/core"
	"math"
	"sort"
)

type basketWeaveRawTile struct {
	weaveType string
	ix        int
	iy        int
	w         int
	h         int
}

// GenerateBasketWeaveBoard generates a basket-weave tiling from congruent 3x1
// rectangles in alternating orientations, with 1x1 square tiles in the gaps.
func GenerateBasketWeaveBoard(options Options) core.Board {
	pad := 4
	rawTiles := []basketWeaveRawTile{}
	seen := map[[4]int]bool{}

	mod := func(n, m int) int {
		return ((n % m) + m) % m
	}

	intersectsTarget := func(weaveType string, ix, iy, w, h int) bool {
		overlapsTarget := ix < options.Cols && ix+w > 0 && iy < options.Rows && iy+h > 0
		if overlapsTarget {
			return true
		}

		// Balance the natural top/right protrusions by also keeping the matching
		// vertical strips that touch both side edges and horizontal strips that
		// touch the bottom edge.
		touchesLeftEdge := weaveType == "vertical" && ix+w == 0 && iy < options.Rows && iy+h > 0
		touchesRightEdge := weaveType == "vertical" && ix == options.Cols && iy < options.Rows && iy+h > 0
		touchesBottomEdge := weaveType == "horizontal" && iy == options.Rows && ix < options.Cols && ix+w > 0
		return touchesLeftEdge || touchesRightEdge || touchesBottomEdge
	}

	addTile := func(weaveType string, ix, iy, w, h int) {
		if !intersectsTarget(weaveType, ix, iy, w, h) {
			return
		}
		key := [4]int{ix, iy, w, h}
		if seen[key] {
			return
		}
		seen[key] = true
		rawTiles = append(rawTiles, basketWeaveRawTile{weaveType: weaveType, ix: ix, iy: iy, w: w, h: h})
	}

	minX := -pad
	maxX := options.Cols + pad
	minY := -pad
	maxY := options.Rows + pad

	// Horizontal 3x1 rectangles: even rows, staggered by phase modulo 4.
	for iy := minY; iy <= maxY; iy++ {
		if mod(iy, 2) != 0 {
			continue
		}
		for ix := minX; ix <= maxX; ix++ {
			if mod(ix, 4) == mod(iy, 4) {
				addTile("horizontal", ix, iy, 3, 1)
			}
		}
	}

	// Vertical 1x3 rectangles: odd columns, staggered by phase modulo 4.
	for ix := minX; ix <= maxX; ix++ {
		if mod(ix, 2) != 1 {
			continue
		}
		for iy := minY; iy <= maxY; iy++ {
			if mod(iy, 4) == mod(ix, 4) {
				addTile("vertical", ix, iy, 1, 3)
			}
		}
	}

	// 1x1 squares sit on odd rows and even columns.
	for iy := minY; iy <= maxY; iy++ {
		if mod(iy, 2) != 1 {
			continue
		}
		for ix := minX; ix <= maxX; ix++ {
			if mod(ix, 2) == 0 {
				addTile("square", ix, iy, 1, 1)
			}
		}
	}

	sort.Slice(rawTiles, func(i, j int) bool {
		ai := rawTiles[i]
		aj := rawTiles[j]
		cyI := float64(ai.iy) + float64(ai.h)/2
		cyJ := float64(aj.iy) + float64(aj.h)/2
		if cyI != cyJ {
			return cyI < cyJ
		}
		cxI := float64(ai.ix) + float64(ai.w)/2
		cxJ := float64(aj.ix) + float64(aj.w)/2
		return cxI < cxJ
	})

	tiles := make([]core.Tile, len(rawTiles))
	for id, raw := range rawTiles {
		tiles[id] = core.Tile{
			ID:        id,
			ColorID:   int(options.RNG() * float64(options.ColorCount)),
			OwnerID:   nil,
			Points:    basketWeaveRectanglePoints(float64(raw.ix)*options.TileSize, float64(raw.iy)*options.TileSize, raw.w, raw.h, options.TileSize),
			Neighbors: []int{},
		}
	}

	cellToTile := map[[2]int]int{}
	for tileID, raw := range rawTiles {
		for dy := 0; dy < raw.h; dy++ {
			for dx := 0; dx < raw.w; dx++ {
				cellToTile[[2]int{raw.ix + dx, raw.iy + dy}] = tileID
			}
		}
	}

	neighborSets := make([]map[int]bool, len(tiles))
	for i := range neighborSets {
		neighborSets[i] = map[int]bool{}
	}

	for cell, tileID := range cellToTile {
		candidates := [][2]int{{cell[0] + 1, cell[1]}, {cell[0], cell[1] + 1}}
		for _, candidate := range candidates {
			neighborID, ok := cellToTile[candidate]
			if ok && neighborID != tileID {
				neighborSets[tileID][neighborID] = true
				neighborSets[neighborID][tileID] = true
			}
		}
	}

	for id := range tiles {
		neighbors := make([]int, 0, len(neighborSets[id]))
		for neighborID := range neighborSets[id] {
			neighbors = append(neighbors, neighborID)
		}
		sort.Ints(neighbors)
		tiles[id].Neighbors = neighbors
	}

	minPX, minPY, _, _ := basketWeaveBoundingBox(tiles)
	for i := range tiles {
		for j, p := range tiles[i].Points {
			tiles[i].Points[j] = core.Point{p[0] - minPX, p[1] - minPY}
		}
	}

	_, _, width, height := basketWeaveBoundingBox(tiles)
	startTileIds := basketWeaveUniqueIds([]int{
		basketWeaveClosestTileID(tiles, 0, 0),
		basketWeaveClosestTileID(tiles, width, height),
		basketWeaveClosestTileID(tiles, width, 0),
		basketWeaveClosestTileID(tiles, 0, height),
	})

	return core.Board{
		Version:      1,
		Generator:    "basket-weave",
		Width:        width,
		Height:       height,
		Cols:         options.Cols,
		Rows:         options.Rows,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}

func basketWeaveRectanglePoints(x, y float64, wCells, hCells int, unit float64) []core.Point {
	points := []core.Point{}

	for i := 0; i <= wCells; i++ {
		points = append(points, core.Point{x + float64(i)*unit, y})
	}
	for j := 1; j <= hCells; j++ {
		points = append(points, core.Point{x + float64(wCells)*unit, y + float64(j)*unit})
	}
	for i := wCells - 1; i >= 0; i-- {
		points = append(points, core.Point{x + float64(i)*unit, y + float64(hCells)*unit})
	}
	for j := hCells - 1; j >= 1; j-- {
		points = append(points, core.Point{x, y + float64(j)*unit})
	}

	return points
}

func basketWeaveBoundingBox(tiles []core.Tile) (float64, float64, float64, float64) {
	minX := math.MaxFloat64
	minY := math.MaxFloat64
	maxX := -math.MaxFloat64
	maxY := -math.MaxFloat64

	for _, tile := range tiles {
		for _, p := range tile.Points {
			minX = math.Min(minX, p[0])
			minY = math.Min(minY, p[1])
			maxX = math.Max(maxX, p[0])
			maxY = math.Max(maxY, p[1])
		}
	}

	return minX, minY, maxX, maxY
}

func basketWeaveClosestTileID(tiles []core.Tile, tx, ty float64) int {
	bestID := -1
	bestDist := math.MaxFloat64

	for _, tile := range tiles {
		cx, cy := basketWeaveCentroid(tile.Points)
		dist := math.Hypot(cx-tx, cy-ty)
		if dist < bestDist {
			bestDist = dist
			bestID = tile.ID
		}
	}

	return bestID
}

func basketWeaveCentroid(points []core.Point) (float64, float64) {
	x := 0.0
	y := 0.0
	for _, p := range points {
		x += p[0]
		y += p[1]
	}
	return x / float64(len(points)), y / float64(len(points))
}

func basketWeaveUniqueIds(ids []int) []int {
	seen := map[int]bool{}
	unique := []int{}
	for _, id := range ids {
		if id == -1 || seen[id] {
			continue
		}
		seen[id] = true
		unique = append(unique, id)
	}
	return unique
}
