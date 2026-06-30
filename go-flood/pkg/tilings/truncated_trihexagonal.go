package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
)

func GenerateTruncatedTrihexagonalBoard(options Options) core.Board {
	a := options.TileSize
	cols, rows := options.Cols, options.Rows
	colorCount := options.ColorCount
	rng := options.RNG

	dist := a * (3.0 + math.Sqrt(3.0))

	type tileTemp struct {
		id        int
		tType     string
		points    []core.Point
		neighbors []int
	}

	var allTiles []tileTemp
	tileMap := make(map[string]int)
	idCounter := 0

	getDodecaCenter := func(q, r int) (float64, float64) {
		x := dist * (float64(q) + float64(r)/2.0)
		y := dist * (math.Sqrt(3.0) / 2.0) * float64(r)
		return x, y
	}

	getTile := func(cx, cy float64, sides int, angle float64, radius float64, prefix string) int {
		key := fmt.Sprintf("%s_%.1f,%.1f", prefix, cx, cy)
		if id, ok := tileMap[key]; ok {
			return id
		}

		id := idCounter
		idCounter++
		points := make([]core.Point, sides)
		for i := 0; i < sides; i++ {
			vAngle := (angle + (float64(i)*360.0/float64(sides))) * math.Pi / 180.0
			points[i] = core.Point{cx + radius*math.Cos(vAngle), cy + radius*math.Sin(vAngle)}
		}

		allTiles = append(allTiles, tileTemp{
			id:     id,
			tType:  prefix,
			points: points,
		})
		tileMap[key] = id
		return id
	}

	R12 := a / (2.0 * math.Sin(math.Pi/12.0))
	R6 := a
	R4 := a / math.Sqrt(2.0)

	distS := a * (3.0 + math.Sqrt(3.0)) / 2.0
	distH := a * (1.0 + math.Sqrt(3.0))

	var dodecaIds []int

	for r := -1; r <= rows; r++ {
		r_offset := r / 2
		for q := -r_offset - 1; q < cols-r_offset+1; q++ {
			cx, cy := getDodecaCenter(q, r)
			dId := getTile(cx, cy, 12, 15.0, R12, "d")
			if q >= -r_offset && q < cols-r_offset && r >= 0 && r < rows {
				dodecaIds = append(dodecaIds, dId)
			}

			for i := 0; i < 6; i++ {
				angleS := float64(i * 60)
				scx := cx + distS*math.Cos(angleS*math.Pi/180.0)
				scy := cy + distS*math.Sin(angleS*math.Pi/180.0)
				getTile(scx, scy, 4, angleS+45.0, R4, "s")

				angleH := float64(i*60 + 30)
				hcx := cx + distH*math.Cos(angleH*math.Pi/180.0)
				hcy := cy + distH*math.Sin(angleH*math.Pi/180.0)
				getTile(hcx, hcy, 6, 0.0, R6, "h")
			}
		}
	}

	// Connectivity
	vertexMap := make(map[string][]int)
	for _, t := range allTiles {
		for _, p := range t.points {
			key := fmt.Sprintf("%.1f,%.1f", p[0], p[1])
			vertexMap[key] = append(vertexMap[key], t.id)
		}
	}

	for _, ids := range vertexMap {
		for i := 0; i < len(ids); i++ {
			for j := i + 1; j < len(ids); j++ {
				id1, id2 := ids[i], ids[j]
				found := false
				for _, n := range allTiles[id1].neighbors {
					if n == id2 { found = true; break }
				}
				if !found {
					allTiles[id1].neighbors = append(allTiles[id1].neighbors, id2)
					allTiles[id2].neighbors = append(allTiles[id2].neighbors, id1)
				}
			}
		}
	}

	// Shared logic: Only count shared edges
	for i := range allTiles {
		var neighbors []int
		for _, nID := range allTiles[i].neighbors {
			count := 0
			for _, p1 := range allTiles[i].points {
				for _, p2 := range allTiles[nID].points {
					if math.Abs(p1[0]-p2[0]) < 0.1 && math.Abs(p1[1]-p2[1]) < 0.1 {
						count++
					}
				}
			}
			if count >= 2 {
				neighbors = append(neighbors, nID)
			}
		}
		allTiles[i].neighbors = neighbors
	}

	// Culling
	minCx, maxCx := 0.0, dist*float64(cols-1)
	minCy, maxCy := 0.0, dist*(math.Sqrt(3.0)/2.0)*float64(rows-1)
	buffer := a * 1.5

	var filteredTiles []core.Tile
	idMap := make(map[int]int)
	for _, t := range allTiles {
		var cx, cy float64
		for _, p := range t.points {
			cx += p[0]
			cy += p[1]
		}
		cx /= float64(len(t.points))
		cy /= float64(len(t.points))

		if cx >= minCx-buffer && cx <= maxCx+buffer && cy >= minCy-buffer && cy <= maxCy+buffer {
			idMap[t.id] = len(filteredTiles)
			filteredTiles = append(filteredTiles, core.Tile{
				ID:      t.id,
				ColorID: int(rng() * float64(colorCount)),
				Points:  t.points,
			})
		}
	}

	for i := range filteredTiles {
		originalID := filteredTiles[i].ID
		var originalIdx int
		for idx, t := range allTiles {
			if t.id == originalID {
				originalIdx = idx
				break
			}
		}
		for _, nID := range allTiles[originalIdx].neighbors {
			if newID, ok := idMap[nID]; ok {
				filteredTiles[i].Neighbors = append(filteredTiles[i].Neighbors, newID)
			}
		}
		filteredTiles[i].ID = i
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

	var finalStartIds []int
	for _, id := range dodecaIds {
		if newID, ok := idMap[id]; ok {
			finalStartIds = append(finalStartIds, newID)
		}
	}
	// Take corners from finalStartIds
	if len(finalStartIds) > 4 {
		finalStartIds = []int{finalStartIds[0], finalStartIds[cols-1], finalStartIds[len(finalStartIds)-cols], finalStartIds[len(finalStartIds)-1]}
	}

	return core.Board{
		Version:      1,
		Generator:    "truncated-trihexagonal",
		Width:        maxX - minX,
		Height:       maxY - minY,
		Cols:         cols,
		Rows:         rows,
		Tiles:        filteredTiles,
		StartTileIds: finalStartIds,
	}
}
