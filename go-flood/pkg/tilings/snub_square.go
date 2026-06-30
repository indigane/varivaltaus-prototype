package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
	"sort"
)

func isPointInSquare(px, py, cx, cy, alpha, a float64) bool {
	dx := px - cx
	dy := py - cy
	cosA := math.Cos(-alpha)
	sinA := math.Sin(-alpha)
	rx := dx*cosA - dy*sinA
	ry := dx*sinA + dy*cosA

	half := a / 2.0
	epsilon := 0.01 * a
	return rx > -half+epsilon && rx < half-epsilon && ry > -half+epsilon && ry < half-epsilon
}

func GenerateSnubSquareBoard(options Options) core.Board {
	a := options.TileSize
	D := a * math.Sqrt(2.0+math.Sqrt(3.0))
	alpha := 15.0 * math.Pi / 180.0
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
		key := fmt.Sprintf("%.5f,%.5f", p[0], p[1])
		if info, ok := vertexMap[key]; ok {
			return info.id
		}
		id := len(vertexMap)
		vertexMap[key] = vertexInfo{id, p}
		return id
	}

	Rsq := a / math.Sqrt(2.0)
	squareCentroids := []core.Point{}

	type vTile struct {
		id   int
		vIds []int
	}
	var vTiles []vTile

	// 1. Generate Squares
	for r := -2; r <= rows+1; r++ {
		for q := -2; q <= cols+1; q++ {
			centers := []core.Point{
				{D * float64(q), D * float64(r)},
				{D * (float64(q) + 0.5), D * (float64(r) + 0.5)},
			}

			for _, center := range centers {
				points := make([]core.Point, 4)
				vIds := make([]int, 4)
				for i := 0; i < 4; i++ {
					vAngle := alpha + math.Pi/4.0 + float64(i)*math.Pi/2.0
					p := core.Point{center[0] + Rsq*math.Cos(vAngle), center[1] + Rsq*math.Sin(vAngle)}
					points[i] = p
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
					squareCentroids = append(squareCentroids, center)
					idCounter++
				}
			}
		}
	}

	// 2. Generate Triangles
	verticesById := make([]core.Point, len(vertexMap))
	for _, info := range vertexMap {
		verticesById[info.id] = info.p
	}

	distSq := func(p1, p2 core.Point) float64 {
		dx := p1[0] - p2[0]
		dy := p1[1] - p2[1]
		return dx*dx + dy*dy
	}

	targetSq := a * a
	tolerance := 0.05 * targetSq

	cellSize := a * 1.5
	type cell struct{ x, y int }
	grid := make(map[cell][]int)
	getCell := func(p core.Point) cell {
		return cell{int(math.Floor(p[0] / cellSize)), int(math.Floor(p[1] / cellSize))}
	}
	for i, v := range verticesById {
		c := getCell(v)
		grid[c] = append(grid[c], i)
	}

	for i := 0; i < len(verticesById); i++ {
		v1 := verticesById[i]
		c1 := getCell(v1)

		for dx := -1; dx <= 1; dx++ {
			for dy := -1; dy <= 1; dy++ {
				c2 := cell{c1.x + dx, c1.y + dy}
				for _, j := range grid[c2] {
					if j <= i {
						continue
					}
					v2 := verticesById[j]
					if math.Abs(distSq(v1, v2)-targetSq) < tolerance {
						for dx2 := -1; dx2 <= 1; dx2++ {
							for dy2 := -1; dy2 <= 1; dy2++ {
								c3 := cell{c1.x + dx2, c1.y + dy2}
								for _, k := range grid[c3] {
									if k <= j {
										continue
									}
									v3 := verticesById[k]
									if math.Abs(distSq(v1, v3)-targetSq) < tolerance && math.Abs(distSq(v2, v3)-targetSq) < tolerance {
										tx := (v1[0] + v2[0] + v3[0]) / 3.0
										ty := (v1[1] + v2[1] + v3[1]) / 3.0

										overlapping := false
										for _, sc := range squareCentroids {
											if isPointInSquare(tx, ty, sc[0], sc[1], alpha, a) {
												overlapping = true
												break
											}
										}

										if overlapping {
											continue
										}

										vIds := []int{i, j, k}
										vIdsSorted := make([]int, 3)
										copy(vIdsSorted, vIds)
										sort.Ints(vIdsSorted)
										shapeKey := fmt.Sprintf("t%v", vIdsSorted)
										if !addedShapes[shapeKey] {
											addedShapes[shapeKey] = true
											tiles = append(tiles, core.Tile{
												ID:      idCounter,
												ColorID: int(rng() * float64(colorCount)),
												Points:  []core.Point{v1, v2, v3},
											})
											vTiles = append(vTiles, vTile{idCounter, vIds})
											idCounter++
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

	// 3. Filter and Finalize
	var filteredTiles []core.Tile
	var filteredVTiles []vTile
	for i, t := range tiles {
		var cx, cy float64
		for _, p := range t.Points {
			cx += p[0]
			cy += p[1]
		}
		cx /= float64(len(t.Points))
		cy /= float64(len(t.Points))

		if cx >= -a/2.0 && cx <= (float64(cols)-0.5)*D && cy >= -a/2.0 && cy <= (float64(rows)-0.5)*D {
			t.ID = len(filteredTiles)
			filteredTiles = append(filteredTiles, t)
			filteredVTiles = append(filteredVTiles, vTiles[i])
		}
	}

	vertexToTiles := make([][]int, len(vertexMap))
	for tileIdx, vt := range filteredVTiles {
		for _, vId := range vt.vIds {
			vertexToTiles[vId] = append(vertexToTiles[vId], tileIdx)
		}
	}

	for i := range filteredTiles {
		neighborCounts := make(map[int]int)
		for _, vId := range filteredVTiles[i].vIds {
			for _, j := range vertexToTiles[vId] {
				if i == j {
					continue
				}
				neighborCounts[j]++
			}
		}
		for j, count := range neighborCounts {
			if count >= 2 {
				filteredTiles[i].Neighbors = append(filteredTiles[i].Neighbors, filteredTiles[j].ID)
			}
		}
	}

	minX, minY := math.MaxFloat64, math.MaxFloat64
	maxX, maxY := -math.MaxFloat64, -math.MaxFloat64
	for _, t := range filteredTiles {
		for _, p := range t.Points {
			minX = math.Min(minX, p[0])
			minY = math.Min(minY, p[1])
			maxX = math.Max(maxX, p[0])
			maxY = math.Max(maxY, p[1])
		}
	}

	for i := range filteredTiles {
		for j := range filteredTiles[i].Points {
			filteredTiles[i].Points[j][0] -= minX
			filteredTiles[i].Points[j][1] -= minY
		}
	}

	w, h := maxX-minX, maxY-minY
	findClosest := func(tx, ty float64) int {
		bestId := 0
		minDist := math.MaxFloat64
		for _, t := range filteredTiles {
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
		Generator:    "snub-square",
		Width:        w,
		Height:       h,
		Cols:         cols,
		Rows:         rows,
		Tiles:        filteredTiles,
		StartTileIds: startTileIds,
	}
}
