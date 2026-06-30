package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
)

func GenerateElongatedTriangularBoard(options Options) core.Board {
	a := options.TileSize
	cols, rows := options.Cols, options.Rows
	colorCount := options.ColorCount
	rng := options.RNG

	h := a * math.Sqrt(3.0) / 2.0
	numSquareRows := rows
	numTriangleRows := rows - 1
	totalStrips := numSquareRows + numTriangleRows

	idCounter := 0

	type vertexInfo struct {
		id int
		p  core.Point
	}
	vertexMap := make(map[string]vertexInfo)
	vertexEdgeKey := func(a, b int) string {
		if a < b {
			return fmt.Sprintf("%d,%d", a, b)
		}
		return fmt.Sprintf("%d,%d", b, a)
	}
	getVertexId := func(p core.Point) int {
		key := fmt.Sprintf("%.3f,%.3f", p[0], p[1])
		if info, ok := vertexMap[key]; ok {
			return info.id
		}
		id := len(vertexMap)
		vertexMap[key] = vertexInfo{id, p}
		return id
	}

	type vTile struct {
		points []core.Point
		vIds   []int
		tType  string
	}
	var rawVTiles []vTile

	for s := 0; s < totalStrips; s++ {
		isSquareStrip := (s%2 == 0)
		stripIdx := s / 2
		yBase := float64(stripIdx)*(a+h) + func() float64 {
			if isSquareStrip {
				return 0
			}
			return a
		}()

		currentSquareOffset := func() float64 {
			if stripIdx%2 == 0 {
				return 0
			}
			return a / 2.0
		}()
		nextSquareOffset := func() float64 {
			if (stripIdx+1)%2 == 0 {
				return 0
			}
			return a / 2.0
		}()

		if isSquareStrip {
			for q := 0; q < cols; q++ {
				x := float64(q)*a + currentSquareOffset
				y := yBase
				points := []core.Point{
					{x, y}, {x + a, y}, {x + a, y + a}, {x, y + a},
				}
				vIds := make([]int, 4)
				for i, p := range points {
					vIds[i] = getVertexId(p)
				}
				rawVTiles = append(rawVTiles, vTile{points, vIds, "square"})
			}
		} else {
			offsetBelow := currentSquareOffset
			offsetAbove := nextSquareOffset
			for q := -1; q < cols+1; q++ {
				xBelow := float64(q)*a + offsetBelow
				xAbove := float64(q)*a + offsetAbove

				apexUpX := func() float64 {
					if offsetBelow < offsetAbove {
						return xAbove
					}
					return xAbove + a
				}()
				pUp := []core.Point{
					{xBelow, yBase}, {xBelow + a, yBase}, {apexUpX, yBase + h},
				}

				apexDownX := func() float64 {
					if offsetBelow < offsetAbove {
						return xBelow + a
					}
					return xBelow
				}()
				pDown := []core.Point{
					{xAbove, yBase + h}, {xAbove + a, yBase + h}, {apexDownX, yBase},
				}

				for _, points := range [][]core.Point{pUp, pDown} {
					vIds := make([]int, 3)
					for i, p := range points {
						vIds[i] = getVertexId(p)
					}
					rawVTiles = append(rawVTiles, vTile{points, vIds, "triangle"})
				}
			}
		}
	}

	squareEdgeKeys := make(map[string]bool)
	for _, rt := range rawVTiles {
		if rt.tType != "square" {
			continue
		}
		for i := range rt.vIds {
			squareEdgeKeys[vertexEdgeKey(rt.vIds[i], rt.vIds[(i+1)%len(rt.vIds)])] = true
		}
	}
	sharesSquareEdge := func(vIds []int) bool {
		return squareEdgeKeys[vertexEdgeKey(vIds[0], vIds[1])] ||
			squareEdgeKeys[vertexEdgeKey(vIds[1], vIds[2])] ||
			squareEdgeKeys[vertexEdgeKey(vIds[2], vIds[0])]
	}

	var filteredTiles []core.Tile
	type filteredVTile struct {
		vIds []int
	}
	var filteredVTiles []filteredVTile

	for _, rt := range rawVTiles {
		if rt.tType == "square" || sharesSquareEdge(rt.vIds) {
			id := idCounter
			idCounter++
			filteredTiles = append(filteredTiles, core.Tile{
				ID:        id,
				ColorID:   int(rng() * float64(colorCount)),
				OwnerID:   nil,
				Points:    rt.points,
				Neighbors: []int{},
			})
			filteredVTiles = append(filteredVTiles, filteredVTile{rt.vIds})
		}
	}

	vertexToTiles := make([][]int, len(vertexMap))
	for tileIdx, fvt := range filteredVTiles {
		for _, vId := range fvt.vIds {
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

	w, hBoard := maxX-minX, maxY-minY
	startTileIds := []int{
		findClosest(0, 0),
		findClosest(w, 0),
		findClosest(0, hBoard),
		findClosest(w, hBoard),
	}

	return core.Board{
		Version:      1,
		Generator:    "elongated-triangular",
		Width:        w,
		Height:       hBoard,
		Cols:         cols,
		Rows:         rows,
		Tiles:        filteredTiles,
		StartTileIds: startTileIds,
	}
}
