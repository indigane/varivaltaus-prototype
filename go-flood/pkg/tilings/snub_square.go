package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
)

func GenerateSnubSquareBoard(options Options) core.Board {
	a := options.TileSize
	// Lattice constant for snub square tiling
	D := a * math.Sqrt(1.0+math.Sqrt(3.0))
	alpha := 15.0 * math.Pi / 180.0
	cols, rows := options.Cols, options.Rows
	colorCount := options.ColorCount
	rng := options.RNG

	tiles := []core.Tile{}
	squareMap := make(map[string]int)

	getSquareCenter := func(q, r int) (float64, float64) {
		return D * float64(q), D * float64(r)
	}

	idCounter := 0
	var allVertices []core.Point

	// 1. Generate Squares
	Rsq := a / math.Sqrt(2.0)
	for r := 0; r < rows; r++ {
		for q := 0; q < cols; q++ {
			cx, cy := getSquareCenter(q, r)
			id := idCounter
			idCounter++

			points := make([]core.Point, 4)
			for i := 0; i < 4; i++ {
				// Vertices of square rotated by alpha
				vAngle := alpha + math.Pi/4.0 + float64(i)*math.Pi/2.0
				points[i] = core.Point{cx + Rsq*math.Cos(vAngle), cy + Rsq*math.Sin(vAngle)}
				allVertices = append(allVertices, points[i])
			}

			tile := core.Tile{
				ID:        id,
				ColorID:   int(rng() * float64(colorCount)),
				OwnerID:   nil,
				Points:    points,
				Neighbors: []int{},
			}
			squareMap[fmt.Sprintf("%d,%d", q, r)] = id
			tiles = append(tiles, tile)
		}
	}

	// 2. Generate Triangles by finding equilateral triplets among square vertices
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
										// Found triangle!
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
		{0, 0}, {cols - 1, 0}, {0, rows - 1}, {cols - 1, rows - 1},
	}
	for _, c := range corners {
		if id, ok := squareMap[fmt.Sprintf("%d,%d", c.q, c.r)]; ok {
			startTileIds = append(startTileIds, id)
		}
	}

	return core.Board{
		Version:      1,
		Generator:    "snub-square",
		Width:        maxX - minX,
		Height:       maxY - minY,
		Cols:         cols,
		Rows:         rows,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}
