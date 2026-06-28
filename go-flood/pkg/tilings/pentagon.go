package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
)

func GenerateCairoPentagonBoard(options Options) core.Board {
	size := options.TileSize
	hSize := size / 2
	offset := size * 0.2
	cols, rows := options.Cols, options.Rows

	getP1 := func(gx, gy int) core.Point {
		x := float64(gx) * size
		y := float64(gy) * size
		if (gx+gy)%2 == 0 {
			return core.Point{x + hSize, y + offset}
		}
		return core.Point{x + offset, y + hSize}
	}
	getP2 := func(gx, gy int) core.Point {
		x := float64(gx) * size
		y := float64(gy) * size
		if (gx+gy)%2 == 0 {
			return core.Point{x + hSize, y + size - offset}
		}
		return core.Point{x + size - offset, y + hSize}
	}
	getCorner := func(gx, gy int) core.Point {
		return core.Point{float64(gx) * size, float64(gy) * size}
	}

	type cairoTemp struct {
		core.Tile
		gx, gy, subId int
	}
	tempTiles := []cairoTemp{}

	addTile := func(points []core.Point, gx, gy, subId int) {
		id := (gy*cols+gx)*2 + subId
		colorId := int(options.RNG() * float64(options.ColorCount))
		tempTiles = append(tempTiles, cairoTemp{
			Tile: core.Tile{
				ID:        id,
				ColorID:   colorId,
				OwnerID:   nil,
				Neighbors: []int{},
				Points:    points,
			},
			gx: gx, gy: gy, subId: subId,
		})
	}

	for gy := 0; gy < rows; gy++ {
		for gx := 0; gx < cols; gx++ {
			isV := (gx+gy)%2 == 0
			p1 := getP1(gx, gy)
			p2 := getP2(gx, gy)

			if isV {
				// Left
				addTile([]core.Point{
					p1,
					getCorner(gx, gy),
					getP2(gx-1, gy),
					getCorner(gx, gy+1),
					p2,
				}, gx, gy, 0)
				// Right
				addTile([]core.Point{
					p1,
					getCorner(gx+1, gy),
					getP1(gx+1, gy),
					getCorner(gx+1, gy+1),
					p2,
				}, gx, gy, 1)
			} else {
				// Top
				addTile([]core.Point{
					p1,
					getCorner(gx, gy),
					getP2(gx, gy-1),
					getCorner(gx+1, gy),
					p2,
				}, gx, gy, 0)
				// Bottom
				addTile([]core.Point{
					p1,
					getCorner(gx, gy+1),
					getP1(gx, gy+1),
					getCorner(gx+1, gy+1),
					p2,
				}, gx, gy, 1)
			}
		}
	}

	tileMap := make(map[string]int)
	for i, t := range tempTiles {
		tileMap[fmt.Sprintf("%d,%d,%d", t.gx, t.gy, t.subId)] = i
	}

	for i := range tempTiles {
		t := &tempTiles[i]
		gx, gy, subId := t.gx, t.gy, t.subId
		isV := (gx+gy)%2 == 0
		var potential [][3]int

		if isV {
			if subId == 0 { // Left
				potential = [][3]int{
					{gx, gy, 1},
					{gx - 1, gy, 0},
					{gx - 1, gy, 1},
					{gx, gy - 1, 1},
					{gx, gy + 1, 0},
				}
			} else { // Right
				potential = [][3]int{
					{gx, gy, 0},
					{gx + 1, gy, 0},
					{gx + 1, gy, 1},
					{gx, gy - 1, 1},
					{gx, gy + 1, 0},
				}
			}
		} else {
			if subId == 0 { // Top
				potential = [][3]int{
					{gx, gy, 1},
					{gx, gy - 1, 0},
					{gx, gy - 1, 1},
					{gx - 1, gy, 1},
					{gx + 1, gy, 0},
				}
			} else { // Bottom
				potential = [][3]int{
					{gx, gy, 0},
					{gx, gy + 1, 0},
					{gx, gy + 1, 1},
					{gx - 1, gy, 1},
					{gx + 1, gy, 0},
				}
			}
		}

		for _, p := range potential {
			if idx, ok := tileMap[fmt.Sprintf("%d,%d,%d", p[0], p[1], p[2])]; ok {
				t.Neighbors = append(t.Neighbors, tempTiles[idx].ID)
			}
		}
	}

	minX, minY := math.MaxFloat64, math.MaxFloat64
	maxX, maxY := -math.MaxFloat64, -math.MaxFloat64

	for _, t := range tempTiles {
		for _, p := range t.Points {
			minX = math.Min(minX, p[0])
			minY = math.Min(minY, p[1])
			maxX = math.Max(maxX, p[0])
			maxY = math.Max(maxY, p[1])
		}
	}

	finalTiles := make([]core.Tile, len(tempTiles))
	for i, t := range tempTiles {
		newPoints := make([]core.Point, len(t.Points))
		for j, p := range t.Points {
			newPoints[j] = core.Point{p[0] - minX, p[1] - minY}
		}
		t.Points = newPoints
		finalTiles[i] = t.Tile
	}

	return core.Board{
		Version:      1,
		Generator:    "pentagon-cairo",
		Width:        maxX - minX,
		Height:       maxY - minY,
		Tiles:        finalTiles,
		StartTileIds: []int{0, len(finalTiles) - 1},
	}
}
