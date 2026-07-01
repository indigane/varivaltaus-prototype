package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
	"sort"
)

const dualKeyScale = 1000000.0

func dualPointKey(p core.Point) string {
	return fmt.Sprintf("%d,%d", int(math.Round(p[0]*dualKeyScale)), int(math.Round(p[1]*dualKeyScale)))
}

func dualEdgeKey(a, b core.Point) string {
	ak := dualPointKey(a)
	bk := dualPointKey(b)
	if ak < bk {
		return ak + "|" + bk
	}
	return bk + "|" + ak
}

func dualCentroid(points []core.Point) core.Point {
	var x, y float64
	for _, p := range points {
		x += p[0]
		y += p[1]
	}
	return core.Point{x / float64(len(points)), y / float64(len(points))}
}

func dualMidpoint(a, b core.Point) core.Point {
	return core.Point{(a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0}
}

func dualSortAround(points []core.Point, center core.Point) []core.Point {
	sorted := append([]core.Point(nil), points...)
	sort.Slice(sorted, func(i, j int) bool {
		ai := math.Atan2(sorted[i][1]-center[1], sorted[i][0]-center[0])
		aj := math.Atan2(sorted[j][1]-center[1], sorted[j][0]-center[0])
		return ai < aj
	})
	return sorted
}

func dualAddNeighbor(neighborSets []map[int]bool, a, b int) {
	if a == b || a < 0 || b < 0 || a >= len(neighborSets) || b >= len(neighborSets) {
		return
	}
	neighborSets[a][b] = true
	neighborSets[b][a] = true
}

func dualFinishBoard(tiles []core.Tile, generator string, cols, rows int) core.Board {
	if len(tiles) == 0 {
		return core.Board{Version: 1, Generator: generator, Cols: cols, Rows: rows, Tiles: []core.Tile{}, StartTileIds: []int{}}
	}

	minX, minY := math.MaxFloat64, math.MaxFloat64
	maxX, maxY := -math.MaxFloat64, -math.MaxFloat64
	for _, tile := range tiles {
		for _, p := range tile.Points {
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

	width := maxX - minX
	height := maxY - minY
	targets := []core.Point{{0, 0}, {width, 0}, {0, height}, {width, height}}
	startTileIds := []int{}
	seenStarts := make(map[int]bool)

	for _, target := range targets {
		bestID := -1
		bestDist := math.MaxFloat64
		for _, tile := range tiles {
			c := dualCentroid(tile.Points)
			dx := c[0] - target[0]
			dy := c[1] - target[1]
			dist := dx*dx + dy*dy
			if dist < bestDist {
				bestDist = dist
				bestID = tile.ID
			}
		}
		if bestID >= 0 && !seenStarts[bestID] {
			seenStarts[bestID] = true
			startTileIds = append(startTileIds, bestID)
		}
	}

	return core.Board{
		Version:      1,
		Generator:    generator,
		Width:        width,
		Height:       height,
		Cols:         cols,
		Rows:         rows,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}

func dualBoardFromPolygons(polygons [][]core.Point, options Options, generator string) core.Board {
	tiles := []core.Tile{}
	for _, points := range polygons {
		if len(points) < 3 {
			continue
		}
		copied := append([]core.Point(nil), points...)
		id := len(tiles)
		tiles = append(tiles, core.Tile{
			ID:        id,
			ColorID:   int(options.RNG() * float64(options.ColorCount)),
			OwnerID:   nil,
			Points:    copied,
			Neighbors: []int{},
		})
	}

	edgeMap := make(map[string][]int)
	for _, tile := range tiles {
		for i := range tile.Points {
			a := tile.Points[i]
			b := tile.Points[(i+1)%len(tile.Points)]
			key := dualEdgeKey(a, b)
			edgeMap[key] = append(edgeMap[key], tile.ID)
		}
	}

	neighborSets := make([]map[int]bool, len(tiles))
	for i := range neighborSets {
		neighborSets[i] = make(map[int]bool)
	}
	for _, ids := range edgeMap {
		for i := 0; i < len(ids); i++ {
			for j := i + 1; j < len(ids); j++ {
				dualAddNeighbor(neighborSets, ids[i], ids[j])
			}
		}
	}

	for i := range tiles {
		for neighbor := range neighborSets[i] {
			tiles[i].Neighbors = append(tiles[i].Neighbors, neighbor)
		}
		sort.Ints(tiles[i].Neighbors)
	}

	return dualFinishBoard(tiles, generator, options.Cols, options.Rows)
}

type dualPrimalTile struct {
	id     int
	points []core.Point
	center core.Point
}

type dualVertexEntry struct {
	point   core.Point
	tileIDs map[int]bool
}

type dualPrimalEdgeEntry struct {
	aKey    string
	bKey    string
	tileIDs map[int]bool
}

func dualFromPrimalPolygons(primalPolygons [][]core.Point, expectedSides int, options Options, generator string) core.Board {
	primalTiles := []dualPrimalTile{}
	for _, points := range primalPolygons {
		if len(points) < 3 {
			continue
		}
		copied := append([]core.Point(nil), points...)
		id := len(primalTiles)
		primalTiles = append(primalTiles, dualPrimalTile{id: id, points: copied, center: dualCentroid(copied)})
	}

	vertexMap := make(map[string]*dualVertexEntry)
	vertexOrder := []string{}
	primalEdgeMap := make(map[string]*dualPrimalEdgeEntry)

	for _, tile := range primalTiles {
		for _, p := range tile.points {
			key := dualPointKey(p)
			entry, ok := vertexMap[key]
			if !ok {
				entry = &dualVertexEntry{point: p, tileIDs: make(map[int]bool)}
				vertexMap[key] = entry
				vertexOrder = append(vertexOrder, key)
			}
			entry.tileIDs[tile.id] = true
		}

		for i := range tile.points {
			a := tile.points[i]
			b := tile.points[(i+1)%len(tile.points)]
			key := dualEdgeKey(a, b)
			entry, ok := primalEdgeMap[key]
			if !ok {
				entry = &dualPrimalEdgeEntry{aKey: dualPointKey(a), bKey: dualPointKey(b), tileIDs: make(map[int]bool)}
				primalEdgeMap[key] = entry
			}
			entry.tileIDs[tile.id] = true
		}
	}

	tiles := []core.Tile{}
	vertexToDualID := make(map[string]int)

	for _, key := range vertexOrder {
		entry := vertexMap[key]
		if len(entry.tileIDs) != expectedSides {
			continue
		}

		tileIDs := make([]int, 0, len(entry.tileIDs))
		for tileID := range entry.tileIDs {
			tileIDs = append(tileIDs, tileID)
		}
		sort.Slice(tileIDs, func(i, j int) bool {
			ci := primalTiles[tileIDs[i]].center
			cj := primalTiles[tileIDs[j]].center
			ai := math.Atan2(ci[1]-entry.point[1], ci[0]-entry.point[0])
			aj := math.Atan2(cj[1]-entry.point[1], cj[0]-entry.point[0])
			return ai < aj
		})

		points := make([]core.Point, len(tileIDs))
		for i, tileID := range tileIDs {
			points[i] = primalTiles[tileID].center
		}

		id := len(tiles)
		vertexToDualID[key] = id
		tiles = append(tiles, core.Tile{
			ID:        id,
			ColorID:   int(options.RNG() * float64(options.ColorCount)),
			OwnerID:   nil,
			Points:    points,
			Neighbors: []int{},
		})
	}

	neighborSets := make([]map[int]bool, len(tiles))
	for i := range neighborSets {
		neighborSets[i] = make(map[int]bool)
	}
	for _, edge := range primalEdgeMap {
		if len(edge.tileIDs) < 2 {
			continue
		}
		a, okA := vertexToDualID[edge.aKey]
		b, okB := vertexToDualID[edge.bKey]
		if okA && okB {
			dualAddNeighbor(neighborSets, a, b)
		}
	}

	for i := range tiles {
		for neighbor := range neighborSets[i] {
			tiles[i].Neighbors = append(tiles[i].Neighbors, neighbor)
		}
		sort.Ints(tiles[i].Neighbors)
	}

	return dualFinishBoard(tiles, generator, options.Cols, options.Rows)
}

func dualTriangularCells(cols, rows int, a float64) [][]core.Point {
	h := a * math.Sqrt(3.0) / 2.0
	cells := [][]core.Point{}

	for r := 0; r < rows; r++ {
		for c := 0; c < cols; c++ {
			rowOffset := float64(r%2) * a / 2.0
			nextRowOffset := float64((r+1)%2) * a / 2.0
			p00 := core.Point{float64(c)*a + rowOffset, float64(r) * h}
			p10 := core.Point{float64(c+1)*a + rowOffset, float64(r) * h}
			p01 := core.Point{float64(c)*a + nextRowOffset, float64(r+1) * h}
			p11 := core.Point{float64(c+1)*a + nextRowOffset, float64(r+1) * h}
			if nextRowOffset > rowOffset {
				cells = append(cells, []core.Point{p00, p10, p01})
				cells = append(cells, []core.Point{p10, p11, p01})
			} else {
				cells = append(cells, []core.Point{p00, p10, p11})
				cells = append(cells, []core.Point{p00, p11, p01})
			}
		}
	}

	return cells
}

type dualHexCell struct {
	center   core.Point
	vertices []core.Point
}

func dualRegularHexCells(cols, rows int, a float64) []dualHexCell {
	cells := []dualHexCell{}

	for r := 0; r < rows; r++ {
		for q := 0; q < cols; q++ {
			center := core.Point{a * math.Sqrt(3.0) * (float64(q) + float64(r%2)/2.0), a * 1.5 * float64(r)}
			vertices := make([]core.Point, 6)
			for i := 0; i < 6; i++ {
				angle := (30.0 + 60.0*float64(i)) * math.Pi / 180.0
				vertices[i] = core.Point{center[0] + a*math.Cos(angle), center[1] + a*math.Sin(angle)}
			}
			cells = append(cells, dualHexCell{center: center, vertices: vertices})
		}
	}

	return cells
}

func dualElongatedTriangularPrimalPolygons(cols, rows int, a float64) [][]core.Point {
	h := a * math.Sqrt(3.0) / 2.0
	polygons := [][]core.Point{}

	for row := 0; row < rows; row++ {
		offset := 0.0
		if row%2 != 0 {
			offset = a / 2.0
		}
		y := float64(row) * (a + h)
		for c := 0; c < cols; c++ {
			x := float64(c)*a + offset
			polygons = append(polygons, []core.Point{{x, y}, {x + a, y}, {x + a, y + a}, {x, y + a}})
		}
	}

	for row := 0; row < rows-1; row++ {
		y := float64(row)*(a+h) + a
		lowerOffset := 0.0
		if row%2 != 0 {
			lowerOffset = a / 2.0
		}
		upperOffset := 0.0
		if (row+1)%2 != 0 {
			upperOffset = a / 2.0
		}

		for c := -1; c <= cols; c++ {
			xLower := float64(c)*a + lowerOffset
			xUpper := float64(c)*a + upperOffset
			upApexX := xUpper + a
			downApexX := xLower
			if lowerOffset < upperOffset {
				upApexX = xUpper
				downApexX = xLower + a
			}

			polygons = append(polygons, []core.Point{{xLower, y}, {xLower + a, y}, {upApexX, y + h}})
			polygons = append(polygons, []core.Point{{xUpper, y + h}, {xUpper + a, y + h}, {downApexX, y}})
		}
	}

	return polygons
}

type dualCellKey struct{ x, y int }

func dualSnubTrihexagonalPrimalPolygons(cols, rows int, a float64) [][]core.Point {
	d := a * math.Sqrt(7.0)
	alpha := math.Atan(math.Sqrt(3.0) / 5.0)
	polygons := [][]core.Point{}
	vertices := []core.Point{}
	vertexIDs := make(map[string]int)

	addVertex := func(p core.Point) int {
		key := dualPointKey(p)
		if id, ok := vertexIDs[key]; ok {
			return id
		}
		id := len(vertices)
		vertices = append(vertices, p)
		vertexIDs[key] = id
		return id
	}

	for r := 0; r < rows; r++ {
		for q := 0; q < cols; q++ {
			center := core.Point{d * (float64(q) + float64(r%2)/2.0), d * (math.Sqrt(3.0) / 2.0) * float64(r)}
			hex := make([]core.Point, 6)
			for i := 0; i < 6; i++ {
				angle := alpha + 60.0*float64(i)*math.Pi/180.0
				p := core.Point{center[0] + a*math.Cos(angle), center[1] + a*math.Sin(angle)}
				hex[i] = p
				addVertex(p)
			}
			polygons = append(polygons, hex)
		}
	}

	cellSize := a
	grid := make(map[dualCellKey][]int)
	cellFor := func(p core.Point) dualCellKey {
		return dualCellKey{int(math.Floor(p[0] / cellSize)), int(math.Floor(p[1] / cellSize))}
	}
	for id, p := range vertices {
		cell := cellFor(p)
		grid[cell] = append(grid[cell], id)
	}

	targetSq := a * a
	tolerance := targetSq * 0.0001
	sqrt3Over2 := math.Sqrt(3.0) / 2.0
	triangleKeys := make(map[string]bool)

	for i, p := range vertices {
		cell := cellFor(p)
		for dx := -2; dx <= 2; dx++ {
			for dy := -2; dy <= 2; dy++ {
				for _, j := range grid[dualCellKey{cell.x + dx, cell.y + dy}] {
					if j <= i {
						continue
					}
					q := vertices[j]
					vx := q[0] - p[0]
					vy := q[1] - p[1]
					distSq := vx*vx + vy*vy
					if math.Abs(distSq-targetSq) > tolerance {
						continue
					}

					candidates := []core.Point{
						{(p[0]+q[0])/2.0 - sqrt3Over2*vy, (p[1]+q[1])/2.0 + sqrt3Over2*vx},
						{(p[0]+q[0])/2.0 + sqrt3Over2*vy, (p[1]+q[1])/2.0 - sqrt3Over2*vx},
					}

					for _, candidate := range candidates {
						k, ok := vertexIDs[dualPointKey(candidate)]
						if !ok || k == i || k == j {
							continue
						}
						ids := []int{i, j, k}
						sort.Ints(ids)
						triangleKeys[fmt.Sprintf("%d,%d,%d", ids[0], ids[1], ids[2])] = true
					}
				}
			}
		}
	}

	keys := make([]string, 0, len(triangleKeys))
	for key := range triangleKeys {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		var i, j, k int
		fmt.Sscanf(key, "%d,%d,%d", &i, &j, &k)
		points := []core.Point{vertices[i], vertices[j], vertices[k]}
		polygons = append(polygons, dualSortAround(points, dualCentroid(points)))
	}

	return polygons
}

func GenerateTetrakisSquareBoard(options Options) core.Board {
	a := options.TileSize
	polygons := [][]core.Point{}

	for r := 0; r < options.Rows; r++ {
		for c := 0; c < options.Cols; c++ {
			x := float64(c) * a
			y := float64(r) * a
			center := core.Point{x + a/2.0, y + a/2.0}
			corners := []core.Point{{x, y}, {x + a, y}, {x + a, y + a}, {x, y + a}}
			for i := 0; i < 4; i++ {
				polygons = append(polygons, []core.Point{corners[i], corners[(i+1)%4], center})
			}
		}
	}

	return dualBoardFromPolygons(polygons, options, "tetrakis-square")
}

func GenerateTriakisTriangularBoard(options Options) core.Board {
	polygons := [][]core.Point{}

	for _, triangle := range dualTriangularCells(options.Cols, options.Rows, options.TileSize) {
		center := dualCentroid(triangle)
		for i := 0; i < 3; i++ {
			polygons = append(polygons, []core.Point{triangle[i], triangle[(i+1)%3], center})
		}
	}

	return dualBoardFromPolygons(polygons, options, "triakis-triangular")
}

func GenerateKisrhombilleBoard(options Options) core.Board {
	polygons := [][]core.Point{}

	for _, triangle := range dualTriangularCells(options.Cols, options.Rows, options.TileSize) {
		a := triangle[0]
		b := triangle[1]
		c := triangle[2]
		center := dualCentroid(triangle)
		ab := dualMidpoint(a, b)
		bc := dualMidpoint(b, c)
		ca := dualMidpoint(c, a)

		polygons = append(polygons, []core.Point{a, ab, center})
		polygons = append(polygons, []core.Point{b, center, ab})
		polygons = append(polygons, []core.Point{b, bc, center})
		polygons = append(polygons, []core.Point{c, center, bc})
		polygons = append(polygons, []core.Point{c, ca, center})
		polygons = append(polygons, []core.Point{a, center, ca})
	}

	return dualBoardFromPolygons(polygons, options, "kisrhombille")
}

func GenerateDeltoidalTrihexagonalBoard(options Options) core.Board {
	polygons := [][]core.Point{}

	for _, hex := range dualRegularHexCells(options.Cols, options.Rows, options.TileSize) {
		for i := 0; i < 6; i++ {
			vertex := hex.vertices[i]
			prevMid := dualMidpoint(hex.vertices[(i+5)%6], vertex)
			nextMid := dualMidpoint(vertex, hex.vertices[(i+1)%6])
			polygons = append(polygons, []core.Point{hex.center, nextMid, vertex, prevMid})
		}
	}

	return dualBoardFromPolygons(polygons, options, "deltoidal-trihexagonal")
}

func GenerateRhombilleBoard(options Options) core.Board {
	type edgeEntry struct {
		a, b    core.Point
		centers []core.Point
	}
	edgeMap := make(map[string]*edgeEntry)

	for _, hex := range dualRegularHexCells(options.Cols, options.Rows, options.TileSize) {
		for i := 0; i < 6; i++ {
			a := hex.vertices[i]
			b := hex.vertices[(i+1)%6]
			key := dualEdgeKey(a, b)
			entry, ok := edgeMap[key]
			if !ok {
				entry = &edgeEntry{a: a, b: b, centers: []core.Point{}}
				edgeMap[key] = entry
			}
			entry.centers = append(entry.centers, hex.center)
		}
	}

	keys := make([]string, 0, len(edgeMap))
	for key := range edgeMap {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	polygons := [][]core.Point{}
	for _, key := range keys {
		edge := edgeMap[key]
		if len(edge.centers) != 2 {
			continue
		}
		points := []core.Point{edge.a, edge.centers[0], edge.b, edge.centers[1]}
		polygons = append(polygons, dualSortAround(points, dualCentroid(points)))
	}

	return dualBoardFromPolygons(polygons, options, "rhombille")
}

func GeneratePrismaticPentagonalBoard(options Options) core.Board {
	return dualFromPrimalPolygons(
		dualElongatedTriangularPrimalPolygons(options.Cols, options.Rows, options.TileSize),
		5,
		options,
		"pentagon-prismatic",
	)
}

func GenerateFloretPentagonalBoard(options Options) core.Board {
	return dualFromPrimalPolygons(
		dualSnubTrihexagonalPrimalPolygons(options.Cols, options.Rows, options.TileSize),
		5,
		options,
		"pentagon-floret",
	)
}
