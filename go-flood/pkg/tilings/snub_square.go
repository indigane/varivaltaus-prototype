package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
)

func GenerateSnubSquareBoard(options Options) core.Board {
	a := options.TileSize
	D := a * math.Sqrt(2.0+math.Sqrt(3.0))
	alpha := 15.0 * math.Pi / 180.0
	cols, rows := options.Cols, options.Rows
	colorCount := options.ColorCount
	rng := options.RNG

	tiles := []core.Tile{}

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

	Rsq := a / math.Sqrt(2.0)
	type vTile struct {
		id   int
		vIds []int
	}
	var vTiles []vTile

	// 1. Generate Squares
	for r := -1; r <= rows; r++ {
		for q := -1; q <= cols; q++ {
			centers := []struct {
				x, y float64
			}{
				{D * float64(q), D * float64(r)},
				{D * (float64(q) + 0.5), D * (float64(r) + 0.5)},
			}

			for _, center := range centers {
				centroidX := center.x
				centroidY := center.y

				if centroidX >= -D/2 && centroidX <= (float64(cols)-0.5)*D && centroidY >= -D/2 && centroidY <= (float64(rows)-0.5)*D {
					points := make([]core.Point, 4)
					vIds := make([]int, 4)
					for i := 0; i < 4; i++ {
						vAngle := alpha + math.Pi/4.0 + float64(i)*math.Pi/2.0
						p := core.Point{center.x + Rsq*math.Cos(vAngle), center.y + Rsq*math.Sin(vAngle)}
						points[i] = p
						vIds[i] = getVertexId(p)
					}

					id := idCounter
					idCounter++
					tiles = append(tiles, core.Tile{
						ID:        id,
						ColorID:   int(rng() * float64(colorCount)),
						OwnerID:   nil,
						Points:    points,
						Neighbors: []int{},
					})
					vTiles = append(vTiles, vTile{id, vIds})
				}
			}
		}
	}

	// 2. Generate Triangles
	verticesById := make([]core.Point, len(vertexMap))
	for _, info := range vertexMap {
		verticesById[info.id] = info.p
	}
	allVertices := verticesById

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
										centroidX := (v1[0] + v2[0] + v3[0]) / 3.0
										centroidY := (v1[1] + v2[1] + v3[1]) / 3.0

										if centroidX >= -D/2 && centroidX <= (float64(cols)-0.5)*D && centroidY >= -D/2 && centroidY <= (float64(rows)-0.5)*D {
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

	w, h := maxX-minX, maxY-minY
	startTileIds := []int{
		findClosest(0, 0),
		findClosest(w, 0),
		findClosest(0, h),
		findClosest(w, h),
	}

	return core.Board{
		Version:      1,
		Generator:    "snub-square",
		Width:        w,
		Height:       h,
		Cols:         cols,
		Rows:         rows,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}
