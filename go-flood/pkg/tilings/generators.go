package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
)

type Options struct {
	Cols       int
	Rows       int
	TileSize   float64
	ColorCount int
	RNG        core.RNG
	Shape      string
}

func GenerateSquareBoard(options Options) core.Board {
	tiles := make([]core.Tile, 0, options.Rows*options.Cols)

	for row := 0; row < options.Rows; row++ {
		for col := 0; col < options.Cols; col++ {
			id := row*options.Cols + col
			x := float64(col) * options.TileSize
			y := float64(row) * options.TileSize

			points := []core.Point{
				{x, y},
				{x + options.TileSize, y},
				{x + options.TileSize, y + options.TileSize},
				{x, y + options.TileSize},
			}

			neighbors := []int{}
			if col > 0 {
				neighbors = append(neighbors, id-1)
			}
			if col < options.Cols-1 {
				neighbors = append(neighbors, id+1)
			}
			if row > 0 {
				neighbors = append(neighbors, id-options.Cols)
			}
			if row < options.Rows-1 {
				neighbors = append(neighbors, id+options.Cols)
			}

			tiles = append(tiles, core.Tile{
				ID:        id,
				ColorID:   int(options.RNG() * float64(options.ColorCount)),
				OwnerID:   nil,
				Points:    points,
				Neighbors: neighbors,
			})
		}
	}

	startTileIds := []int{
		0,
		options.Rows*options.Cols - 1,
		options.Cols - 1,
		(options.Rows - 1) * options.Cols,
	}

	return core.Board{
		Version:      1,
		Generator:    "square",
		Width:        float64(options.Cols) * options.TileSize,
		Height:       float64(options.Rows) * options.TileSize,
		Cols:         options.Cols,
		Rows:         options.Rows,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}

func GenerateBrickBoard(options Options) core.Board {
	w := options.TileSize * 2
	h := options.TileSize
	tiles := make([]core.Tile, 0, options.Rows*options.Cols)

	for r := 0; r < options.Rows; r++ {
		isOffset := (r % 2 == 1)
		for c := 0; c < options.Cols; c++ {
			id := r*options.Cols + c
			x := float64(c) * w
			if isOffset {
				x += w / 2
			}
			y := float64(r) * h

			points := []core.Point{
				{x, y},
				{x + w, y},
				{x + w, y + h},
				{x, y + h},
			}

			neighbors := []int{}
			// Left/Right
			if c > 0 {
				neighbors = append(neighbors, id-1)
			}
			if c < options.Cols-1 {
				neighbors = append(neighbors, id+1)
			}

			// Up/Down
			otherRows := []int{r - 1, r + 1}
			for _, nr := range otherRows {
				if nr >= 0 && nr < options.Rows {
					if isOffset {
						// Odd row (offset right) connects to c and c+1 in even rows above/below
						if c >= 0 && c < options.Cols {
							neighbors = append(neighbors, nr*options.Cols+c)
						}
						if c+1 < options.Cols {
							neighbors = append(neighbors, nr*options.Cols+c+1)
						}
					} else {
						// Even row (offset zero) connects to c-1 and c in odd rows above/below
						if c-1 >= 0 {
							neighbors = append(neighbors, nr*options.Cols+c-1)
						}
						if c < options.Cols {
							neighbors = append(neighbors, nr*options.Cols+c)
						}
					}
				}
			}

			tiles = append(tiles, core.Tile{
				ID:        id,
				ColorID:   int(options.RNG() * float64(options.ColorCount)),
				OwnerID:   nil,
				Points:    points,
				Neighbors: neighbors,
			})
		}
	}

	// Calculate bounding box for normalization
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
		newPoints := make([]core.Point, len(tiles[i].Points))
		for j, p := range tiles[i].Points {
			newPoints[j] = core.Point{p[0] - minX, p[1] - minY}
		}
		tiles[i].Points = newPoints
	}

	startTileIds := []int{
		0,
		len(tiles) - 1,
		options.Cols - 1,
		(options.Rows - 1) * options.Cols,
	}

	return core.Board{
		Version:      1,
		Generator:    "brick",
		Width:        maxX - minX,
		Height:       maxY - minY,
		Cols:         options.Cols,
		Rows:         options.Rows,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}

func GenerateTriangleBoard(options Options) core.Board {
	tiles := []core.Tile{}
	h := options.TileSize * math.Sqrt(3) / 2
	s := options.TileSize

	tileMap := make(map[string]int)

	if options.Shape == "" || options.Shape == "rectangular" {
		idCounter := 0
		for r := 0; r < options.Rows; r++ {
			for c := 0; c < options.Cols; c++ {
				id := idCounter
				idCounter++
				tileMap[fmt.Sprintf("%d,%d", r, c)] = id
			}
		}

		for r := 0; r < options.Rows; r++ {
			for c := 0; c < options.Cols; c++ {
				id := tileMap[fmt.Sprintf("%d,%d", r, c)]
				isUp := (r+c)%2 == 0

				var points []core.Point
				if isUp {
					points = []core.Point{
						{float64(c) * s / 2, float64(r+1) * h},
						{float64(c+2) * s / 2, float64(r+1) * h},
						{float64(c+1) * s / 2, float64(r) * h},
					}
				} else {
					points = []core.Point{
						{float64(c) * s / 2, float64(r) * h},
						{float64(c+2) * s / 2, float64(r) * h},
						{float64(c+1) * s / 2, float64(r+1) * h},
					}
				}

				neighbors := []int{}
				if c > 0 {
					neighbors = append(neighbors, tileMap[fmt.Sprintf("%d,%d", r, c-1)])
				}
				if c < options.Cols-1 {
					neighbors = append(neighbors, tileMap[fmt.Sprintf("%d,%d", r, c+1)])
				}

				if isUp {
					if r < options.Rows-1 {
						neighbors = append(neighbors, tileMap[fmt.Sprintf("%d,%d", r+1, c)])
					}
				} else {
					if r > 0 {
						neighbors = append(neighbors, tileMap[fmt.Sprintf("%d,%d", r-1, c)])
					}
				}

				tiles = append(tiles, core.Tile{
					ID:        id,
					ColorID:   int(options.RNG() * float64(options.ColorCount)),
					OwnerID:   nil,
					Points:    points,
					Neighbors: neighbors,
				})
			}
		}

		startTileIds := []int{}
		keys := []string{"0,0", fmt.Sprintf("%d,%d", options.Rows-1, options.Cols-1), fmt.Sprintf("0,%d", options.Cols-1), fmt.Sprintf("%d,0", options.Rows-1)}
		for _, k := range keys {
			if id, ok := tileMap[k]; ok {
				startTileIds = append(startTileIds, id)
			}
		}

		return core.Board{
			Version:      1,
			Generator:    "triangle",
			Width:        float64(options.Cols+1) * s / 2,
			Height:       float64(options.Rows) * h,
			Tiles:        tiles,
			StartTileIds: startTileIds,
		}
	} else if options.Shape == "triangular" {
		idCounter := 0
		for r := 0; r < options.Rows; r++ {
			rowCols := 2*r + 1
			for c := 0; c < rowCols; c++ {
				id := idCounter
				idCounter++
				tileMap[fmt.Sprintf("%d,%d", r, c)] = id
			}
		}

		for r := 0; r < options.Rows; r++ {
			rowCols := 2*r + 1
			rowOffset := float64(options.Rows-1-r) * s / 2
			for c := 0; c < rowCols; c++ {
				id := tileMap[fmt.Sprintf("%d,%d", r, c)]
				isUp := c%2 == 0

				var points []core.Point
				if isUp {
					points = []core.Point{
						{rowOffset + float64(c)*s/2, float64(r+1)*h},
						{rowOffset + float64(c+2)*s/2, float64(r+1)*h},
						{rowOffset + float64(c+1)*s/2, float64(r)*h},
					}
				} else {
					points = []core.Point{
						{rowOffset + float64(c)*s/2, float64(r)*h},
						{rowOffset + float64(c+2)*s/2, float64(r)*h},
						{rowOffset + float64(c+1)*s/2, float64(r+1)*h},
					}
				}

				neighbors := []int{}
				if c > 0 {
					neighbors = append(neighbors, tileMap[fmt.Sprintf("%d,%d", r, c-1)])
				}
				if c < rowCols-1 {
					neighbors = append(neighbors, tileMap[fmt.Sprintf("%d,%d", r, c+1)])
				}

				if isUp {
					if r < options.Rows-1 {
						neighbors = append(neighbors, tileMap[fmt.Sprintf("%d,%d", r+1, c+1)])
					}
				} else {
					if r > 0 {
						neighbors = append(neighbors, tileMap[fmt.Sprintf("%d,%d", r-1, c-1)])
					}
				}

				tiles = append(tiles, core.Tile{
					ID:        id,
					ColorID:   int(options.RNG() * float64(options.ColorCount)),
					OwnerID:   nil,
					Points:    points,
					Neighbors: neighbors,
				})
			}
		}

		startTileIds := []int{}
		keys := []string{"0,0", fmt.Sprintf("%d,0", options.Rows-1), fmt.Sprintf("%d,%d", options.Rows-1, 2*(options.Rows-1))}
		for _, k := range keys {
			if id, ok := tileMap[k]; ok {
				startTileIds = append(startTileIds, id)
			}
		}

		return core.Board{
			Version:      1,
			Generator:    "triangle",
			Width:        float64(options.Rows) * s,
			Height:       float64(options.Rows) * h,
			Tiles:        tiles,
			StartTileIds: startTileIds,
		}
	}
	return core.Board{}
}

func GenerateHexBoard(options Options) core.Board {
	radius := options.TileSize
	tileMap := make(map[string]int)

	if options.Shape == "" || options.Shape == "rectangular" {
		idCounter := 0
		for r := 0; r < options.Rows; r++ {
			rOffset := int(math.Floor(float64(r) / 2))
			for q := -rOffset; q < options.Cols-rOffset; q++ {
				id := idCounter
				idCounter++
				tileMap[fmt.Sprintf("%d,%d", q, r)] = id
			}
		}

		rawTiles := []core.Tile{}
		minX, minY := math.MaxFloat64, math.MaxFloat64
		maxX, maxY := -math.MaxFloat64, -math.MaxFloat64

		for key, id := range tileMap {
			var q, r int
			fmt.Sscanf(key, "%d,%d", &q, &r)

			x := radius * math.Sqrt(3) * (float64(q) + float64(r)/2)
			y := radius * 1.5 * float64(r)

			points := []core.Point{}
			for i := 0; i < 6; i++ {
				angleDeg := float64(60*i - 30)
				angleRad := math.Pi / 180 * angleDeg
				px := x + radius*math.Cos(angleRad)
				py := y + radius*math.Sin(angleRad)
				points = append(points, core.Point{px, py})
				minX = math.Min(minX, px)
				minY = math.Min(minY, py)
				maxX = math.Max(maxX, px)
				maxY = math.Max(maxY, py)
			}

			neighbors := []int{}
			directions := [][2]int{{1, 0}, {1, -1}, {0, -1}, {-1, 0}, {-1, 1}, {0, 1}}
			for _, d := range directions {
				if nID, ok := tileMap[fmt.Sprintf("%d,%d", q+d[0], r+d[1])]; ok {
					neighbors = append(neighbors, nID)
				}
			}

			rawTiles = append(rawTiles, core.Tile{
				ID:        id,
				ColorID:   int(options.RNG() * float64(options.ColorCount)),
				OwnerID:   nil,
				Points:    points,
				Neighbors: neighbors,
			})
		}

		finalTiles := make([]core.Tile, len(rawTiles))
		for _, t := range rawTiles {
			newPoints := make([]core.Point, len(t.Points))
			for j, p := range t.Points {
				newPoints[j] = core.Point{p[0] - minX, p[1] - minY}
			}
			t.Points = newPoints
			finalTiles[t.ID] = t
		}

		startTileIds := []int{0, len(finalTiles) - 1}
		if id, ok := tileMap[fmt.Sprintf("%d,0", options.Cols-1)]; ok {
			startTileIds = append(startTileIds, id)
		}
		if id, ok := tileMap[fmt.Sprintf("%d,%d", -int(math.Floor(float64(options.Rows-1)/2)), options.Rows-1)]; ok {
			startTileIds = append(startTileIds, id)
		}

		return core.Board{
			Version:      1,
			Generator:    "hex",
			Width:        maxX - minX,
			Height:       maxY - minY,
			Tiles:        finalTiles,
			StartTileIds: startTileIds,
		}
	} else if options.Shape == "hexagonal" {
		N := options.Rows - 1
		idCounter := 0
		for q := -N; q <= N; q++ {
			r1 := int(math.Max(float64(-N), float64(-q-N)))
			r2 := int(math.Min(float64(N), float64(-q+N)))
			for r := r1; r <= r2; r++ {
				id := idCounter
				idCounter++
				tileMap[fmt.Sprintf("%d,%d", q, r)] = id
			}
		}

		rawTiles := []core.Tile{}
		minX, minY := math.MaxFloat64, math.MaxFloat64
		maxX, maxY := -math.MaxFloat64, -math.MaxFloat64

		for key, id := range tileMap {
			var q, r int
			fmt.Sscanf(key, "%d,%d", &q, &r)

			x := radius * math.Sqrt(3) * (float64(q) + float64(r)/2)
			y := radius * 1.5 * float64(r)

			points := []core.Point{}
			for i := 0; i < 6; i++ {
				angleDeg := float64(60*i - 30)
				angleRad := math.Pi / 180 * angleDeg
				px := x + radius*math.Cos(angleRad)
				py := y + radius*math.Sin(angleRad)
				points = append(points, core.Point{px, py})
				minX = math.Min(minX, px)
				minY = math.Min(minY, py)
				maxX = math.Max(maxX, px)
				maxY = math.Max(maxY, py)
			}

			neighbors := []int{}
			directions := [][2]int{{1, 0}, {1, -1}, {0, -1}, {-1, 0}, {-1, 1}, {0, 1}}
			for _, d := range directions {
				if nID, ok := tileMap[fmt.Sprintf("%d,%d", q+d[0], r+d[1])]; ok {
					neighbors = append(neighbors, nID)
				}
			}

			rawTiles = append(rawTiles, core.Tile{
				ID:        id,
				ColorID:   int(options.RNG() * float64(options.ColorCount)),
				OwnerID:   nil,
				Points:    points,
				Neighbors: neighbors,
			})
		}

		finalTiles := make([]core.Tile, len(rawTiles))
		for _, t := range rawTiles {
			newPoints := make([]core.Point, len(t.Points))
			for j, p := range t.Points {
				newPoints[j] = core.Point{p[0] - minX, p[1] - minY}
			}
			t.Points = newPoints
			finalTiles[t.ID] = t
		}

		startTileIds := []int{}
		sKeys := []string{fmt.Sprintf("0,%d", -N), fmt.Sprintf("0,%d", N), fmt.Sprintf("%d,0", N), fmt.Sprintf("%d,0", -N), fmt.Sprintf("%d,%d", N, -N), fmt.Sprintf("%d,%d", -N, N)}
		for _, k := range sKeys {
			if id, ok := tileMap[k]; ok {
				startTileIds = append(startTileIds, id)
			}
		}

		return core.Board{
			Version:      1,
			Generator:    "hex",
			Width:        maxX - minX,
			Height:       maxY - minY,
			Tiles:        finalTiles,
			StartTileIds: startTileIds,
		}
	}
	return core.Board{}
}
