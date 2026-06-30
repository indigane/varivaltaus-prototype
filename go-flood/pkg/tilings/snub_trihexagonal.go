package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
)

func GenerateSnubTrihexagonalBoard(options Options) core.Board {
	a := options.TileSize
	D := a * math.Sqrt(7.0)
	alpha := math.Atan(1.0 / (3.0 * math.Sqrt(3.0)))
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
	var allVertices []core.Point

	// 1. Generate Hexagons
	for r := 0; r < rows; r++ {
		rOffset := int(math.Floor(float64(r) / 2.0))
		for q := -rOffset; q < cols-rOffset; q++ {
			cx, cy := getHexCenter(q, r)
			id := idCounter
			idCounter++

			points := make([]core.Point, 6)
			for i := 0; i < 6; i++ {
				angle := alpha + float64(i*60)*math.Pi/180.0
				points[i] = core.Point{cx + a*math.Cos(angle), cy + a*math.Sin(angle)}
				allVertices = append(allVertices, points[i])
			}

			tile := core.Tile{
				ID:        id,
				ColorID:   int(rng() * float64(colorCount)),
				OwnerID:   nil,
				Points:    points,
				Neighbors: []int{},
			}
			hexMap[fmt.Sprintf("%d,%d", q, r)] = id
			tiles = append(tiles, tile)
		}
	}

	// 2. Generate Triangles by finding equilateral triplets among hexagon vertices
	distSq := func(p1, p2 core.Point) float64 {
		dx := p1[0] - p2[0]
		dy := p1[1] - p2[1]
		return dx*dx + dy*dy
	}

	targetSq := a * a
	tolerance := 0.1 * targetSq

	// Spatial hash for vertices
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

		// Search nearby cells for v2
		for dx := -1; dx <= 1; dx++ {
			for dy := -1; dy <= 1; dy++ {
				c2 := cell{c1.x + dx, c1.y + dy}
				for _, j := range grid[c2] {
					if j <= i {
						continue
					}
					v2 := allVertices[j]
					d12 := distSq(v1, v2)
					if math.Abs(d12-targetSq) < tolerance {
						// Found edge (i, j). Now look for v3.
						// Search nearby cells again.
						for dx2 := -1; dx2 <= 1; dx2++ {
							for dy2 := -1; dy2 <= 1; dy2++ {
								c3 := cell{c1.x + dx2, c1.y + dy2}
								for _, k := range grid[c3] {
									if k <= j {
										continue
									}
									v3 := allVertices[k]
									d13 := distSq(v1, v3)
									d23 := distSq(v2, v3)
									if math.Abs(d13-targetSq) < tolerance && math.Abs(d23-targetSq) < tolerance {
										// Found triangle (i, j, k)!
										id := idCounter
										idCounter++
										tiles = append(tiles, core.Tile{
											ID:      id,
											ColorID: int(rng() * float64(colorCount)),
											OwnerID: nil,
											Points:  []core.Point{v1, v2, v3},
											Neighbors: []int{},
										})
									}
								}
							}
						}
					}
				}
			}
		}
	}

	// 3. Build connectivity based on vertex proximity
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
