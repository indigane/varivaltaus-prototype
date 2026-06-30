package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
)

func GenerateTruncatedTrihexagonalBoard(options Options) core.Board {
	a := options.TileSize
	// Distance between dodecagon centers
	dist := a * (3.0 + math.Sqrt(3.0))
	cols, rows := options.Cols, options.Rows
	colorCount := options.ColorCount
	rng := options.RNG

	tiles := []core.Tile{}
	tileMap := make(map[string]int)

	getDodecaCenter := func(q, r int) (float64, float64) {
		x := dist * (float64(q) + float64(r)/2.0)
		y := dist * (math.Sqrt(3.0) / 2.0) * float64(r)
		return x, y
	}

	idCounter := 0

	getTile := func(cx, cy float64, sides int, angle float64, radius float64, prefix string) int {
		key := fmt.Sprintf("%s_%d,%d", prefix, int(math.Round(cx*100)), int(math.Round(cy*100)))
		if id, ok := tileMap[key]; ok {
			return id
		}

		id := idCounter
		idCounter++
		points := make([]core.Point, sides)
		for i := 0; i < sides; i++ {
			vAngle := angle*math.Pi/180.0 + (float64(i)*2.0*math.Pi/float64(sides))
			points[i] = core.Point{cx + radius*math.Cos(vAngle), cy + radius*math.Sin(vAngle)}
		}

		tile := core.Tile{
			ID:        id,
			ColorID:   int(rng() * float64(colorCount)),
			OwnerID:   nil,
			Points:    points,
			Neighbors: []int{},
		}
		tileMap[key] = id
		tiles = append(tiles, tile)
		return id
	}

	R12 := a / (2.0 * math.Sin(math.Pi/12.0))
	R6 := a // Circumradius of hexagon with side a
	R4 := a / math.Sqrt(2.0)

	distS := a * (3.0 + math.Sqrt(3.0)) / 2.0
	distH := a * (1.0 + math.Sqrt(3.0))

	dodecaIds := []int{}

	// 1. Generate Dodecagons and their surrounding squares and hexagons
	for r := 0; r < rows; r++ {
		rOffset := int(math.Floor(float64(r) / 2.0))
		for q := -rOffset; q < cols-rOffset; q++ {
			cx, cy := getDodecaCenter(q, r)

			// Dodecagon (rotated so edges are at 0, 30, 60...)
			dId := getTile(cx, cy, 12, 15, R12, "d")
			dodecaIds = append(dodecaIds, dId)

			for i := 0; i < 6; i++ {
				// Squares at 0, 60, 120...
				angleS := float64(i * 60)
				scx := cx + distS*math.Cos(angleS*math.Pi/180.0)
				scy := cy + distS*math.Sin(angleS*math.Pi/180.0)
				getTile(scx, scy, 4, angleS+45, R4, "s")

				// Hexagons at 30, 90, 150...
				angleH := float64(i*60 + 30)
				hcx := cx + distH*math.Cos(angleH*math.Pi/180.0)
				hcy := cy + distH*math.Sin(angleH*math.Pi/180.0)
				// Corrected hexagon rotation: 0 (side aligned with dodecagon)
				getTile(hcx, hcy, 6, 0, R6, "h")
			}
		}
	}

	// 2. Build connectivity based on vertex proximity (optimized with spatial hash)
	addNeighbor := func(idx1, id2 int) {
		for _, n := range tiles[idx1].Neighbors {
			if n == id2 {
				return
			}
		}
		tiles[idx1].Neighbors = append(tiles[idx1].Neighbors, id2)
	}

	vertexMap := make(map[string][]int)
	for _, t := range tiles {
		for _, p := range t.Points {
			key := fmt.Sprintf("%d,%d", int(math.Round(p[0]*100)), int(math.Round(p[1]*100)))
			vertexMap[key] = append(vertexMap[key], t.ID)
		}
	}

	neighborCounts := make(map[string]int)
	for _, tileIds := range vertexMap {
		for i := 0; i < len(tileIds); i++ {
			for j := i + 1; j < len(tileIds); j++ {
				id1, id2 := tileIds[i], tileIds[j]
				if id1 > id2 {
					id1, id2 = id2, id1
				}
				key := fmt.Sprintf("%d,%d", id1, id2)
				neighborCounts[key]++
			}
		}
	}

	for key, count := range neighborCounts {
		if count >= 2 {
			var id1, id2 int
			fmt.Sscanf(key, "%d,%d", &id1, &id2)
			addNeighbor(id1, id2)
			addNeighbor(id2, id1)
		}
	}

	// 3. Finalize
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

	startTileIds := []int{}
	// Use dodecagons near corners
	cornerIndices := []int{0, cols - 1, (rows-1)*cols, rows*cols - 1}
	for _, idx := range cornerIndices {
		if idx < len(dodecaIds) {
			startTileIds = append(startTileIds, dodecaIds[idx])
		}
	}

	return core.Board{
		Version:      1,
		Generator:    "truncated-trihexagonal",
		Width:        maxX - minX,
		Height:       maxY - minY,
		Cols:         cols,
		Rows:         rows,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}
