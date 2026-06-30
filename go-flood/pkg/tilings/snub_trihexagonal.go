package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
	"sort"
)

func GenerateSnubTrihexagonalBoard(options Options) core.Board {
	a := options.TileSize
	D := a * math.Sqrt(7.0)
	alpha := math.Atan(math.Sqrt(3.0) / 5.0)
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

	getHexCenter := func(q, r int) (float64, float64) {
		x := D * (float64(q) + float64(r)/2.0)
		y := D * (math.Sqrt(3.0) / 2.0) * float64(r)
		return x, y
	}

	type vTile struct {
		id   int
		vIds []int
	}
	var vTiles []vTile

	// 1. Generate Hexagons (wider range)
	qPad, rPad := 2, 2
	for r := -rPad; r < rows+rPad; r++ {
		rOffset := int(math.Floor(float64(r) / 2.0))
		for q := -rOffset - qPad; q < cols-rOffset+qPad; q++ {
			cx, cy := getHexCenter(q, r)
			points := make([]core.Point, 6)
			vIds := make([]int, 6)
			for i := 0; i < 6; i++ {
				angle := alpha + float64(i*60)*math.Pi/180.0
				p := core.Point{cx + a*math.Cos(angle), cy + a*math.Sin(angle)}
				points[i] = p
				vIds[i] = getVertexId(p)
			}

			vIdsSorted := make([]int, 6)
			copy(vIdsSorted, vIds)
			sort.Ints(vIdsSorted)
			key := fmt.Sprintf("h%v", vIdsSorted)
			if !addedShapes[key] {
				addedShapes[key] = true
				tiles = append(tiles, core.Tile{
					ID:      idCounter,
					ColorID: int(rng() * float64(colorCount)),
					Points:  points,
				})
				vTiles = append(vTiles, vTile{idCounter, vIds})
				idCounter++
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
										vIds := []int{i, j, k}
										vIdsSorted := make([]int, 3)
										copy(vIdsSorted, vIds)
										sort.Ints(vIdsSorted)
										key := fmt.Sprintf("t%v", vIdsSorted)
										if !addedShapes[key] {
											addedShapes[key] = true
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
	maxXHex := (float64(cols) - 0.5) * D
	maxYHex := (float64(rows) - 0.5) * D * math.Sqrt(3.0) / 2.0

	for i, t := range tiles {
		var cx, cy float64
		for _, p := range t.Points {
			cx += p[0]
			cy += p[1]
		}
		cx /= float64(len(t.Points))
		cy /= float64(len(t.Points))

		if cx >= -a && cx <= maxXHex && cy >= -a && cy <= maxYHex {
			t.ID = len(filteredTiles)
			filteredTiles = append(filteredTiles, t)
			filteredVTiles = append(filteredVTiles, vTiles[i])
		}
	}

	// Connectivity
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
		Generator:    "snub-trihexagonal",
		Width:        w,
		Height:       h,
		Cols:         cols,
		Rows:         rows,
		Tiles:        filteredTiles,
		StartTileIds: startTileIds,
	}
}
