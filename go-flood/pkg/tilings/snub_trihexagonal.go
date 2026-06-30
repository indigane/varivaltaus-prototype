package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
)

func GenerateSnubTrihexagonalBoard(options Options) core.Board {
	a := options.TileSize
	D := a * math.Sqrt(7.0)
	alpha := math.Atan(math.Sqrt(3.0) / 5.0)
	cols, rows := options.Cols, options.Rows
	colorCount := options.ColorCount
	rng := options.RNG

	tiles := []core.Tile{}
	hexMap := make(map[string]int)

	getHexCenter := func(q, r int) (float64, float64) {
		x := D * (float64(q) + float64(r)/2.0)
		y := D * (math.Sqrt(3.0) / 2.0) * float64(r)
		return x, y
	}

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

	// 1. Generate Hexagons
	type vTile struct {
		id   int
		vIds []int
	}
	var vTiles []vTile

	for r := 0; r < rows; r++ {
		rOffset := int(math.Floor(float64(r) / 2.0))
		for q := -rOffset; q < cols-rOffset; q++ {
			cx, cy := getHexCenter(q, r)
			id := idCounter
			idCounter++

			points := make([]core.Point, 6)
			vIds := make([]int, 6)
			for i := 0; i < 6; i++ {
				angle := alpha + float64(i*60)*math.Pi/180.0
				p := core.Point{cx + a*math.Cos(angle), cy + a*math.Sin(angle)}
				points[i] = p
				vIds[i] = getVertexId(p)
			}

			tiles = append(tiles, core.Tile{
				ID:        id,
				ColorID:   int(rng() * float64(colorCount)),
				OwnerID:   nil,
				Points:    points,
				Neighbors: []int{},
			})
			vTiles = append(vTiles, vTile{id, vIds})
			hexMap[fmt.Sprintf("%d,%d", q, r)] = id
		}
	}

	// 2. Generate Triangles
	var allVertices []core.Point
	verticesById := make([]core.Point, len(vertexMap))
	for _, info := range vertexMap {
		verticesById[info.id] = info.p
	}
	allVertices = verticesById

	distSq := func(p1, p2 core.Point) float64 {
		dx := p1[0] - p2[0]
		dy := p1[1] - p2[1]
		return dx*dx + dy*dy
	}

	targetSq := a * a
	tolerance := 0.1 * targetSq

	type cell struct{ x, y int }
	grid := make(map[cell][]int)
	getCell := func(p core.Point) cell {
		return cell{int(math.Floor(p[0] / a)), int(math.Floor(p[1] / a))}
	}
	for i, v := range allVertices {
		c := getCell(v)
		grid[c] = append(grid[c], i)
	}

	for i := 0; i < len(allVertices); i++ {
		v1 := allVertices[i]
		c1 := getCell(v1)

		for dx := -1; dx <= 1; dx++ {
			for dy := -1; dy <= 1; dy++ {
				c2 := cell{c1.x + dx, c1.y + dy}
				for _, j := range grid[c2] {
					if j <= i {
						continue
					}
					v2 := allVertices[j]
					if math.Abs(distSq(v1, v2)-targetSq) < tolerance {
						for dx2 := -1; dx2 <= 1; dx2++ {
							for dy2 := -1; dy2 <= 1; dy2++ {
								c3 := cell{c1.x + dx2, c1.y + dy2}
								for _, k := range grid[c3] {
									if k <= j {
										continue
									}
									v3 := allVertices[k]
									if math.Abs(distSq(v1, v3)-targetSq) < tolerance && math.Abs(distSq(v2, v3)-targetSq) < tolerance {
										id := idCounter
										idCounter++
										tiles = append(tiles, core.Tile{
											ID:        id,
											ColorID:   int(rng() * float64(colorCount)),
											OwnerID:   nil,
											Points:    []core.Point{v1, v2, v3},
											Neighbors: []int{},
										})
										vTiles = append(vTiles, vTile{id, []int{i, j, k}})
									}
								}
							}
						}
					}
				}
			}
		}
	}

	// 3. Optimized Connectivity
	vertexToTiles := make([][]int, len(allVertices))
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

	// 4. Finalize
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
		Generator:    "snub-trihexagonal",
		Width:        maxX - minX,
		Height:       maxY - minY,
		Cols:         cols,
		Rows:         rows,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}
