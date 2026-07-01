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

func TriangularMask(centerX, centerY, radius float64) MaskFn {
	return func(x, y float64, tile core.Tile) bool {
		dx := x - centerX
		dy := y - centerY
		return dy <= radius/2 &&
			dy+math.Sqrt(3)*dx >= -radius &&
			dy-math.Sqrt(3)*dx >= -radius
	}
}

func HexagonalMask(centerX, centerY, radius float64) MaskFn {
	return func(x, y float64, tile core.Tile) bool {
		dx := x - centerX
		dy := y - centerY
		return math.Abs(dx) <= radius*math.Sqrt(3)/2 &&
			math.Abs(dy)+math.Abs(dx)/math.Sqrt(3) <= radius
	}
}
