package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
	"sort"
)

func GenerateElongatedTriangularBoard(options Options) core.Board {
	a := options.TileSize
	cols, rows := options.Cols, options.Rows
	colorCount := options.ColorCount
	rng := options.RNG

	tiles := []core.Tile{}
	addedShapes := make(map[string]bool)
	idCounter := 0

	type vertexInfo struct {
		id int
		p  core.Point
	}
	vertexMap := make(map[string]vertexInfo)
	getVertexId := func(p core.Point) int {
		key := fmt.Sprintf("%.3f,%.3f", p[0], p[1])
		if info, ok := vertexMap[key]; ok {
			return info.id
		}
		id := len(vertexMap)
		vertexMap[key] = vertexInfo{id, p}
		return id
	}

	hTri := (a * math.Sqrt(3)) / 2.0
	rowHeight := a + hTri

	type vTile struct {
		id   int
		vIds []int
	}
	var vTiles []vTile

	for r := 0; r < rows; r++ {
		for q := 0; q < cols; q++ {
			// 1. Squares
			sx := float64(q)*a + math.Mod(math.Abs(float64(r)), 2.0)*a/2.0
			sy := float64(r) * rowHeight

			points := []core.Point{
				{sx, sy},
				{sx + a, sy},
				{sx + a, sy + a},
				{sx, sy + a},
			}
			vIds := make([]int, 4)
			for i, p := range points {
				vIds[i] = getVertexId(p)
			}
			vIdsSorted := make([]int, 4)
			copy(vIdsSorted, vIds)
			sort.Ints(vIdsSorted)
			shapeKey := fmt.Sprintf("s%v", vIdsSorted)
			if !addedShapes[shapeKey] {
				addedShapes[shapeKey] = true
				tiles = append(tiles, core.Tile{
					ID:      idCounter,
					ColorID: int(rng() * float64(colorCount)),
					Points:  points,
				})
				vTiles = append(vTiles, vTile{idCounter, vIds})
				idCounter++
			}

			// 2. Triangles
			if r < rows-1 {
				tx := float64(q)*a + math.Mod(math.Abs(float64(r)), 2.0)*a/2.0
				ty := float64(r)*rowHeight + a

				// Tri 1
				tri1Points := []core.Point{
					{tx, ty},
					{tx + a, ty},
					{tx + a / 2.0, ty + hTri},
				}
				vIds1 := make([]int, 3)
				for i, p := range tri1Points {
					vIds1[i] = getVertexId(p)
				}
				vIdsSorted1 := make([]int, 3)
				copy(vIdsSorted1, vIds1)
				sort.Ints(vIdsSorted1)
				shapeKey1 := fmt.Sprintf("t%v", vIdsSorted1)
				if !addedShapes[shapeKey1] {
					addedShapes[shapeKey1] = true
					tiles = append(tiles, core.Tile{
						ID:      idCounter,
						ColorID: int(rng() * float64(colorCount)),
						Points:  tri1Points,
					})
					vTiles = append(vTiles, vTile{idCounter, vIds1})
					idCounter++
				}

				// Tri 2
				tri2Points := []core.Point{
					{tx + a / 2.0, ty + hTri},
					{tx + 3.0*a/2.0, ty + hTri},
					{tx + a, ty},
				}
				vIds2 := make([]int, 3)
				for i, p := range tri2Points {
					vIds2[i] = getVertexId(p)
				}
				vIdsSorted2 := make([]int, 3)
				copy(vIdsSorted2, vIds2)
				sort.Ints(vIdsSorted2)
				shapeKey2 := fmt.Sprintf("t%v", vIdsSorted2)
				if !addedShapes[shapeKey2] {
					addedShapes[shapeKey2] = true
					tiles = append(tiles, core.Tile{
						ID:      idCounter,
						ColorID: int(rng() * float64(colorCount)),
						Points:  tri2Points,
					})
					vTiles = append(vTiles, vTile{idCounter, vIds2})
					idCounter++
				}

				// Extra Tri for left edge
				if q == 0 {
					triLPoints := []core.Point{
						{tx - a / 2.0, ty + hTri},
						{tx + a / 2.0, ty + hTri},
						{tx, ty},
					}
					vIdsL := make([]int, 3)
					for i, p := range triLPoints {
						vIdsL[i] = getVertexId(p)
					}
					vIdsSortedL := make([]int, 3)
					copy(vIdsSortedL, vIdsL)
					sort.Ints(vIdsSortedL)
					shapeKeyL := fmt.Sprintf("t%v", vIdsSortedL)
					if !addedShapes[shapeKeyL] {
						addedShapes[shapeKeyL] = true
						tiles = append(tiles, core.Tile{
							ID:      idCounter,
							ColorID: int(rng() * float64(colorCount)),
							Points:  triLPoints,
						})
						vTiles = append(vTiles, vTile{idCounter, vIdsL})
						idCounter++
					}
				}
			}
		}
	}

	// Connectivity
	vertexToTiles := make([][]int, len(vertexMap))
	for tileIdx, vt := range vTiles {
		for _, vId := range vt.vIds {
			vertexToTiles[vId] = append(vertexToTiles[vId], tileIdx)
		}
	}

	for i := range tiles {
		neighborCounts := make(map[int]int)
		for _, vId := range vTiles[i].vIds {
			for _, j := range vertexToTiles[vId] {
				if i == j {
					continue
				}
				neighborCounts[j]++
			}
		}
		for j, count := range neighborCounts {
			if count >= 2 {
				tiles[i].Neighbors = append(tiles[i].Neighbors, tiles[j].ID)
			}
		}
	}

	// Finalize
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

	w, h := maxX-minX, maxY-minY
	findClosest := func(tx, ty float64) int {
		bestId := 0
		minDist := math.MaxFloat64
		for _, t := range tiles {
			var cx, cy float64
			for _, p := range t.Points {
				cx += p[0]
				cy += p[1]
			}
			cx /= float64(len(t.Points))
			cy /= float64(len(t.Points))
			d := math.Pow(cx-tx, 2) + math.Pow(cy-ty, 2)
			if d < minDist {
				minDist = d
				bestId = t.ID
			}
		}
		return bestId
	}

	startTileIds := []int{
		findClosest(0, 0),
		findClosest(w, 0),
		findClosest(0, h),
		findClosest(w, h),
	}

	return core.Board{
		Version:      1,
		Generator:    "elongated-triangular",
		Width:        w,
		Height:       h,
		Cols:         cols,
		Rows:         rows,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}
