package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
)

func GenerateTrihexagonalBoard(options Options) core.Board {
	a := options.TileSize
	cols, rows := options.Cols, options.Rows
	colorCount := options.ColorCount
	rng := options.RNG

	D := 2.0 * a
	distT := 2.0 * a / math.Sqrt(3.0)

	type tileTemp struct {
		id        int
		tType     string
		q, r      int
		colorId   int
		points    []core.Point
		neighbors []int
	}

	var allTiles []tileTemp
	hexMap := make(map[string]int)
	triangleMap := make(map[string]int)
	idCounter := 0

	getHexCenter := func(q, r int) (float64, float64) {
		x := D * (float64(q) + float64(r)/2.0)
		y := D * (math.Sqrt(3.0) / 2.0) * float64(r)
		return x, y
	}

	// 1. Generate Hexagons
	for r := 0; r < rows; r++ {
		r_offset := r / 2
		for q := -r_offset; q < cols-r_offset; q++ {
			cx, cy := getHexCenter(q, r)
			id := idCounter
			idCounter++

			points := make([]core.Point, 6)
			for i := 0; i < 6; i++ {
				angle := float64(60*i) * math.Pi / 180.0
				points[i] = core.Point{cx + a*math.Cos(angle), cy + a*math.Sin(angle)}
			}

			allTiles = append(allTiles, tileTemp{
				id:      id,
				tType:   "hex",
				q:       q,
				r:       r,
				colorId: int(rng() * float64(colorCount)),
				points:  points,
			})
			hexMap[fmt.Sprintf("%d,%d", q, r)] = id
		}
	}

	getTriangle := func(cx, cy, angle float64) int {
		key := fmt.Sprintf("%.2f,%.2f", cx, cy)
		if id, ok := triangleMap[key]; ok {
			return id
		}

		id := idCounter
		idCounter++
		points := make([]core.Point, 3)
		rT := a / math.Sqrt(3.0)
		for i := 0; i < 3; i++ {
			vAngle := angle + float64(i*120)*math.Pi/180.0
			points[i] = core.Point{cx + rT*math.Cos(vAngle), cy + rT*math.Sin(vAngle)}
		}

		allTiles = append(allTiles, tileTemp{
			id:      id,
			tType:   "triangle",
			colorId: int(rng() * float64(colorCount)),
			points:  points,
		})
		triangleMap[key] = id
		return id
	}

	// 2. Build connectivity and generate triangles
	for i := range allTiles {
		if allTiles[i].tType == "hex" {
			cx, cy := getHexCenter(allTiles[i].q, allTiles[i].r)
			hId := allTiles[i].id
			for j := 0; j < 6; j++ {
				angleT := float64(60*j+30) * math.Pi / 180.0
				tcx := cx + distT*math.Cos(angleT)
				tcy := cy + distT*math.Sin(angleT)

				tId := getTriangle(tcx, tcy, angleT)

				// Add neighbors (need to find index in allTiles)
				// This is inefficient but works for small boards
				var tIdx int
				for idx, t := range allTiles {
					if t.id == tId {
						tIdx = idx
						break
					}
				}

				found := false
				for _, n := range allTiles[i].neighbors {
					if n == tId {
						found = true
						break
					}
				}
				if !found {
					allTiles[i].neighbors = append(allTiles[i].neighbors, tId)
				}

				found = false
				for _, n := range allTiles[tIdx].neighbors {
					if n == hId {
						found = true
						break
					}
				}
				if !found {
					allTiles[tIdx].neighbors = append(allTiles[tIdx].neighbors, hId)
				}
			}
		}
	}

	// Calculate board center
	var avgX, avgY float64
	var count float64
	for _, t := range allTiles {
		if t.tType == "hex" {
			cx, cy := getHexCenter(t.q, t.r)
			avgX += cx
			avgY += cy
			count++
		}
	}
	avgX /= count
	avgY /= count

	// 2.5 Edge culling
	removedIds := make(map[int]bool)
	for _, t := range allTiles {
		if t.tType == "triangle" && len(t.neighbors) == 1 {
			hexId := t.neighbors[0]
			var hIdx int
			for idx, ht := range allTiles {
				if ht.id == hexId {
					hIdx = idx
					break
				}
			}
			hcx, hcy := getHexCenter(allTiles[hIdx].q, allTiles[hIdx].r)

			var tcx, tcy float64
			for _, p := range t.points {
				tcx += p[0]
				tcy += p[1]
			}
			tcx /= 3.0
			tcy /= 3.0

			vhx, vhy := tcx-hcx, tcy-hcy
			vbx, vby := tcx-avgX, tcy-avgY

			if vhx*vbx+vhy*vby > 0 {
				removedIds[t.id] = true
			}
		} else if t.tType == "triangle" && len(t.neighbors) == 0 {
			removedIds[t.id] = true
		}
	}

	var filteredTiles []core.Tile
	idMap := make(map[int]int)

	for _, t := range allTiles {
		if !removedIds[t.id] {
			idMap[t.id] = len(filteredTiles)
			filteredTiles = append(filteredTiles, core.Tile{
				ID:        t.id,
				ColorID:   t.colorId,
				Points:    t.points,
				Neighbors: []int{},
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
			if !removedIds[nID] {
				filteredTiles[i].Neighbors = append(filteredTiles[i].Neighbors, idMap[nID])
			}
		}
		filteredTiles[i].ID = idMap[originalID]
	}

	// 3. Finalize
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

	startTileIds := []int{}
	corners := []string{
		fmt.Sprintf("%d,%d", 0, 0),
		fmt.Sprintf("%d,%d", cols-1, 0),
		fmt.Sprintf("%d,%d", -((rows - 1) / 2), rows-1),
		fmt.Sprintf("%d,%d", cols-1-((rows-1)/2), rows-1),
	}
	for _, c := range corners {
		if id, ok := hexMap[c]; ok {
			if !removedIds[id] {
				startTileIds = append(startTileIds, idMap[id])
			}
		}
	}

	return core.Board{
		Version:      1,
		Generator:    "trihexagonal",
		Width:        maxX - minX,
		Height:       maxY - minY,
		Cols:         cols,
		Rows:         rows,
		Tiles:        filteredTiles,
		StartTileIds: startTileIds,
	}
}
