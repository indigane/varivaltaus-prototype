package tilings

import (
	"go-flood/pkg/core"
	"math"
)

type MaskFn func(x, y float64, tile core.Tile) bool

func ApplyMask(board core.Board, maskFn MaskFn) core.Board {
	type tileWithMeta struct {
		core.Tile
		originalId int
		newId      int
	}

	tilesToKeep := []tileWithMeta{}
	newIdCounter := 0
	for _, tile := range board.Tiles {
		var cx, cy float64
		for _, p := range tile.Points {
			cx += p[0]
			cy += p[1]
		}
		cx /= float64(len(tile.Points))
		cy /= float64(len(tile.Points))

		if maskFn(cx, cy, tile) {
			tilesToKeep = append(tilesToKeep, tileWithMeta{
				Tile:       tile,
				originalId: tile.ID,
				newId:      newIdCounter,
			})
			newIdCounter++
		}
	}

	oldIdToNewId := make(map[int]int)
	for _, t := range tilesToKeep {
		oldIdToNewId[t.originalId] = t.newId
	}

	finalTiles := make([]core.Tile, len(tilesToKeep))
	for i, t := range tilesToKeep {
		newNeighbors := []int{}
		for _, oldId := range t.Neighbors {
			if newId, ok := oldIdToNewId[oldId]; ok {
				newNeighbors = append(newNeighbors, newId)
			}
		}
		t.Tile.ID = t.newId
		t.Tile.Neighbors = newNeighbors
		finalTiles[i] = t.Tile
	}

	newStartTileIds := []int{}
	for _, oldId := range board.StartTileIds {
		if newId, ok := oldIdToNewId[oldId]; ok {
			newStartTileIds = append(newStartTileIds, newId)
		}
	}

	if len(newStartTileIds) == 0 && len(finalTiles) > 0 {
		newStartTileIds = append(newStartTileIds, 0)
	}

	newBoard := board
	newBoard.Tiles = finalTiles
	newBoard.StartTileIds = newStartTileIds
	return newBoard
}

func CircularMask(centerX, centerY, radius float64) MaskFn {
	return func(x, y float64, tile core.Tile) bool {
		dx := x - centerX
		dy := y - centerY
		return math.Sqrt(dx*dx+dy*dy) <= radius
	}
}

func TriangularMask(centerX, centerY, radius, rotation float64) MaskFn {
	cos := math.Cos(-rotation)
	sin := math.Sin(-rotation)
	return func(x, y float64, tile core.Tile) bool {
		dx := x - centerX
		dy := y - centerY
		rdx := dx*cos - dy*sin
		rdy := dx*sin + dy*cos
		return rdy <= radius/2 &&
			rdy+math.Sqrt(3)*rdx >= -radius &&
			rdy-math.Sqrt(3)*rdx >= -radius
	}
}

func HexagonalMask(centerX, centerY, radius, rotation float64) MaskFn {
	cos := math.Cos(-rotation)
	sin := math.Sin(-rotation)
	return func(x, y float64, tile core.Tile) bool {
		dx := x - centerX
		dy := y - centerY
		rdx := dx*cos - dy*sin
		rdy := dx*sin + dy*cos
		return math.Abs(rdx) <= radius*math.Sqrt(3)/2 &&
			math.Abs(rdy)+math.Abs(rdx)/math.Sqrt(3) <= radius
	}
}

func EllipticalMask(centerX, centerY, rx, ry, rotation float64) MaskFn {
	cos := math.Cos(-rotation)
	sin := math.Sin(-rotation)
	return func(x, y float64, t core.Tile) bool {
		dx := x - centerX
		dy := y - centerY
		rdx := dx*cos - dy*sin
		rdy := dx*sin + dy*cos
		return (rdx*rdx)/(rx*rx)+(rdy*rdy)/(ry*ry) <= 1
	}
}

func GemstoneMask(centerX, centerY, radius, rotation float64) MaskFn {
	cos := math.Cos(-rotation)
	sin := math.Sin(-rotation)
	return func(x, y float64, t core.Tile) bool {
		dx := x - centerX
		dy := y - centerY
		rdx := dx*cos - dy*sin
		rdy := dx*sin + dy*cos

		nx := rdx / radius
		ny := rdy / radius

		// Pentagon from image: 3 right angles, 2 135-deg angles.
		// Standing on the clipped "pointy" edge.
		return ny >= -0.4 &&
			ny-nx <= 1.0 &&
			ny+nx <= 1.0 &&
			ny-nx >= -0.8 &&
			ny+nx >= -0.8
	}
}

func DonutMask(centerX, centerY, innerRadius, outerRadius float64) MaskFn {
	i2 := innerRadius * innerRadius
	o2 := outerRadius * outerRadius
	return func(x, y float64, t core.Tile) bool {
		dx := x - centerX
		dy := y - centerY
		d2 := dx*dx + dy*dy
		return d2 >= i2 && d2 <= o2
	}
}

func HourglassMask(centerX, centerY, radius, rotation float64) MaskFn {
	cos := math.Cos(-rotation)
	sin := math.Sin(-rotation)
	waist := radius * 0.25
	return func(x, y float64, t core.Tile) bool {
		dx := x - centerX
		dy := y - centerY
		rdx := dx*cos - dy*sin
		rdy := dx*sin + dy*cos
		return math.Abs(rdx) <= math.Abs(rdy)*0.75+waist && math.Abs(rdy) <= radius
	}
}

func PlusMask(centerX, centerY, radius, thickness, rotation float64) MaskFn {
	cos := math.Cos(-rotation)
	sin := math.Sin(-rotation)
	halfThick := thickness / 2
	return func(x, y float64, t core.Tile) bool {
		dx := x - centerX
		dy := y - centerY
		rdx := dx*cos - dy*sin
		rdy := dx*sin + dy*cos
		return (math.Abs(rdx) <= radius && math.Abs(rdy) <= halfThick) ||
			(math.Abs(rdy) <= radius && math.Abs(rdx) <= halfThick)
	}
}
