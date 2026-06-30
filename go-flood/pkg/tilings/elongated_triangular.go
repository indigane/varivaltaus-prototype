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
	}
	var rawVTiles []vTile

	for s := 0; s < totalStrips; s++ {
		isSquareStrip := (s % 2 == 0)
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
				rawVTiles = append(rawVTiles, vTile{points, vIds})
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
					rawVTiles = append(rawVTiles, vTile{points, vIds})
				}
			}
		}
	}

	minXAll := math.MaxFloat64
	for _, info := range vertexMap {
		minXAll = math.Min(minXAll, info.p[0])
	}
	targetWidth := float64(cols) * a

	var filteredTiles []core.Tile
	type filteredVTile struct {
		vIds []int
	}
	var filteredVTiles []filteredVTile

	for _, rt := range rawVTiles {
		sumX := 0.0
		for _, p := range rt.points {
			sumX += p[0]
		}
		centroidX := sumX / float64(len(rt.points))
		if centroidX >= minXAll && centroidX <= minXAll+targetWidth {
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

	startTileIds := []int{}
	findTileWithVertex := func(p core.Point) int {
		vId := getVertexId(p)
		for idx, fvt := range filteredVTiles {
			for _, vid := range fvt.vIds {
				if vid == vId {
					return filteredTiles[idx].ID
				}
			}
		}
		return -1
	}

	s1 := findTileWithVertex(core.Point{minXAll, 0})
	s2 := findTileWithVertex(core.Point{minXAll + targetWidth, 0})
	s3 := findTileWithVertex(core.Point{minXAll, float64(rows-1) * (a + h)})
	s4 := findTileWithVertex(core.Point{minXAll + targetWidth, float64(rows-1) * (a + h)})

	for _, s := range []int{s1, s2, s3, s4} {
		if s != -1 {
			startTileIds = append(startTileIds, s)
		}
	}
	if len(startTileIds) == 0 {
		startTileIds = []int{0, len(filteredTiles) - 1}
	}

	return core.Board{
		Version:      1,
		Generator:    "elongated-triangular",
		Width:        maxX - minX,
		Height:       maxY - minY,
		Cols:         cols,
		Rows:         rows,
		Tiles:        filteredTiles,
		StartTileIds: startTileIds,
	}
}
