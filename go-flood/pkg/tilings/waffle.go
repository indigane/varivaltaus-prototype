package tilings

import (
	"go-flood/pkg/core"
	"math"
	"sort"
)

const (
	waffleCenter = iota
	waffleTop
	waffleRight
	waffleBottom
	waffleLeft
	waffleTileTypeCount
)

// GenerateWaffleBoard generates a square-lattice waffle tiling. Each logical
// grid cell is subdivided into a smaller central square and four trapezoids.
func GenerateWaffleBoard(options Options) core.Board {
	unit := options.TileSize
	cellSize := unit * 2
	inset := unit / 2
	totalTiles := options.Rows * options.Cols * waffleTileTypeCount
	tiles := make([]core.Tile, totalTiles)

	idAt := func(row, col, tileType int) int {
		return (row*options.Cols+col)*waffleTileTypeCount + tileType
	}

	for row := 0; row < options.Rows; row++ {
		for col := 0; col < options.Cols; col++ {
			x := float64(col) * cellSize
			y := float64(row) * cellSize

			for tileType := 0; tileType < waffleTileTypeCount; tileType++ {
				id := idAt(row, col, tileType)
				tiles[id] = core.Tile{
					ID:        id,
					ColorID:   int(options.RNG() * float64(options.ColorCount)),
					OwnerID:   nil,
					Points:    waffleTilePoints(x, y, cellSize, inset, tileType),
					Neighbors: []int{},
				}
			}
		}
	}

	neighborSets := make([]map[int]bool, len(tiles))
	for i := range neighborSets {
		neighborSets[i] = map[int]bool{}
	}
	addNeighbor := func(a, b int) {
		if a == b || a < 0 || b < 0 || a >= len(tiles) || b >= len(tiles) {
			return
		}
		neighborSets[a][b] = true
		neighborSets[b][a] = true
	}

	for row := 0; row < options.Rows; row++ {
		for col := 0; col < options.Cols; col++ {
			center := idAt(row, col, waffleCenter)
			top := idAt(row, col, waffleTop)
			right := idAt(row, col, waffleRight)
			bottom := idAt(row, col, waffleBottom)
			left := idAt(row, col, waffleLeft)

			// Central square borders all four trapezoids.
			addNeighbor(center, top)
			addNeighbor(center, right)
			addNeighbor(center, bottom)
			addNeighbor(center, left)

			// Adjacent trapezoids in the same logical cell share the diagonal seams.
			addNeighbor(top, left)
			addNeighbor(top, right)
			addNeighbor(right, bottom)
			addNeighbor(bottom, left)

			// Trapezoids across square-lattice edges are also adjacent.
			if row > 0 {
				addNeighbor(top, idAt(row-1, col, waffleBottom))
			}
			if col < options.Cols-1 {
				addNeighbor(right, idAt(row, col+1, waffleLeft))
			}
			if row < options.Rows-1 {
				addNeighbor(bottom, idAt(row+1, col, waffleTop))
			}
			if col > 0 {
				addNeighbor(left, idAt(row, col-1, waffleRight))
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

	width := float64(options.Cols) * cellSize
	height := float64(options.Rows) * cellSize
	startTileIds := waffleUniqueIds([]int{
		waffleClosestTileID(tiles, 0, 0),
		waffleClosestTileID(tiles, width, height),
		waffleClosestTileID(tiles, width, 0),
		waffleClosestTileID(tiles, 0, height),
	})

	return core.Board{
		Version:      1,
		Generator:    "waffle",
		Width:        width,
		Height:       height,
		Cols:         options.Cols,
		Rows:         options.Rows,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}

func waffleTilePoints(x, y, cellSize, inset float64, tileType int) []core.Point {
	x0 := x
	x1 := x + inset
	x2 := x + cellSize - inset
	x3 := x + cellSize
	y0 := y
	y1 := y + inset
	y2 := y + cellSize - inset
	y3 := y + cellSize

	switch tileType {
	case waffleCenter:
		return []core.Point{{x1, y1}, {x2, y1}, {x2, y2}, {x1, y2}}
	case waffleTop:
		return []core.Point{{x0, y0}, {x3, y0}, {x2, y1}, {x1, y1}}
	case waffleRight:
		return []core.Point{{x3, y0}, {x3, y3}, {x2, y2}, {x2, y1}}
	case waffleBottom:
		return []core.Point{{x3, y3}, {x0, y3}, {x1, y2}, {x2, y2}}
	case waffleLeft:
		return []core.Point{{x0, y3}, {x0, y0}, {x1, y1}, {x1, y2}}
	default:
		return nil
	}
}

func waffleClosestTileID(tiles []core.Tile, tx, ty float64) int {
	bestID := -1
	bestDist := math.MaxFloat64

	for _, tile := range tiles {
		cx, cy := waffleCentroid(tile.Points)
		dist := math.Hypot(cx-tx, cy-ty)
		if dist < bestDist {
			bestDist = dist
			bestID = tile.ID
		}
	}

	return bestID
}

func waffleCentroid(points []core.Point) (float64, float64) {
	x := 0.0
	y := 0.0
	for _, p := range points {
		x += p[0]
		y += p[1]
	}
	return x / float64(len(points)), y / float64(len(points))
}

func waffleUniqueIds(ids []int) []int {
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
