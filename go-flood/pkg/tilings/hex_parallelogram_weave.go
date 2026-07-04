package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
	"sort"
	"strings"
)

type hexParallelogramWeaveRawTile struct {
	TileType   string
	VertexKeys []string
	Points     []core.Point
	Centroid   core.Point
}

type hexParallelogramWeaveMotifTile struct {
	Kind     string
	I        int
	J        int
	LongDir  [2]int
	ShortDir [2]int
}

// GenerateHexParallelogramWeaveBoard generates a woven triangular-lattice
// tiling made from side-1 triangles, side-2 regular hexagons, and skinny
// side-4-by-side-1 parallelograms. Longer edges are subdivided into unit
// segments so neighboring tiles can be matched across partial edges.
func GenerateHexParallelogramWeaveBoard(options Options) core.Board {
	side := options.TileSize
	const periodI = 10
	const periodJ = 5
	targetWidth := math.Max(float64(options.Cols), 1) * 3.2 * side
	targetHeight := math.Max(float64(options.Rows), 1) * math.Sqrt(3) * side
	pad := 4
	cropMarginX := periodI * side / 2
	cropMarginY := periodJ * math.Sqrt(3) * side / 4

	motif := []hexParallelogramWeaveMotifTile{
		{Kind: "hex", I: 0, J: 2},
		{Kind: "parallelogram", I: 3, J: 0, LongDir: [2]int{1, 0}, ShortDir: [2]int{-1, 1}},
		{Kind: "parallelogram", I: 4, J: 1, LongDir: [2]int{0, 1}, ShortDir: [2]int{1, 0}},
		{Kind: "triangle-up", I: 3, J: 4},
		{Kind: "parallelogram", I: 0, J: 1, LongDir: [2]int{1, 0}, ShortDir: [2]int{0, 1}},
		{Kind: "parallelogram", I: 1, J: 2, LongDir: [2]int{-1, 1}, ShortDir: [2]int{1, 0}},
		{Kind: "triangle-down", I: 0, J: 2},
		{Kind: "parallelogram", I: 9, J: 0, LongDir: [2]int{0, 1}, ShortDir: [2]int{1, -1}},
		{Kind: "parallelogram", I: 9, J: 3, LongDir: [2]int{-1, 1}, ShortDir: [2]int{0, 1}},
		{Kind: "triangle-up", I: 8, J: 0},
		{Kind: "triangle-down", I: 5, J: 1},
		{Kind: "hex", I: 5, J: 1},
	}

	rawTiles := []hexParallelogramWeaveRawTile{}
	addRawTile := func(tileType string, vertexKeys []string) {
		points := make([]core.Point, len(vertexKeys))
		for i, key := range vertexKeys {
			points[i] = hexParallelogramWeaveLatticePointFromKey(key, side)
		}
		rawTiles = append(rawTiles, hexParallelogramWeaveRawTile{
			TileType:   tileType,
			VertexKeys: vertexKeys,
			Points:     points,
		})
	}

	repeatMinY := -pad
	repeatMaxY := int(math.Ceil(targetHeight/(periodJ*math.Sqrt(3)*side/2))) + pad
	shearPad := int(math.Ceil(math.Max(0, float64(repeatMaxY*periodJ))/(2*periodI))) + 2
	reverseShearPad := int(math.Ceil(math.Max(0, float64(-repeatMinY*periodJ))/(2*periodI))) + 2
	repeatMinX := -pad - shearPad
	repeatMaxX := int(math.Ceil(targetWidth/(periodI*side))) + pad + reverseShearPad

	for ry := repeatMinY; ry <= repeatMaxY; ry++ {
		for rx := repeatMinX; rx <= repeatMaxX; rx++ {
			offsetI := rx * periodI
			offsetJ := ry * periodJ
			for _, tile := range motif {
				i := tile.I + offsetI
				j := tile.J + offsetJ
				switch tile.Kind {
				case "hex":
					addRawTile("hex", hexParallelogramWeaveHexVertexKeys(i, j))
				case "parallelogram":
					addRawTile("parallelogram", hexParallelogramWeaveParallelogramVertexKeys(i, j, tile.LongDir, tile.ShortDir))
				case "triangle-up":
					addRawTile("triangle-up", hexParallelogramWeaveSmallTriangleVertexKeys("U", i, j))
				case "triangle-down":
					addRawTile("triangle-down", hexParallelogramWeaveSmallTriangleVertexKeys("D", i, j))
				}
			}
		}
	}

	cropped := []hexParallelogramWeaveRawTile{}
	for _, tile := range rawTiles {
		tile.Centroid = hexParallelogramWeaveAveragePoint(tile.Points)
		if tile.Centroid[0] >= -cropMarginX && tile.Centroid[0] <= targetWidth+cropMarginX && tile.Centroid[1] >= -cropMarginY && tile.Centroid[1] <= targetHeight+cropMarginY {
			cropped = append(cropped, tile)
		}
	}

	sort.Slice(cropped, func(i, j int) bool {
		if math.Abs(cropped[i].Centroid[1]-cropped[j].Centroid[1]) > 1e-6 {
			return cropped[i].Centroid[1] < cropped[j].Centroid[1]
		}
		return cropped[i].Centroid[0] < cropped[j].Centroid[0]
	})

	tiles := make([]core.Tile, len(cropped))
	for id, tile := range cropped {
		points := make([]core.Point, len(tile.Points))
		copy(points, tile.Points)
		tiles[id] = core.Tile{
			ID:        id,
			ColorID:   int(options.RNG() * float64(options.ColorCount)),
			OwnerID:   nil,
			Points:    points,
			Neighbors: []int{},
		}
	}

	neighborSets := make([]map[int]bool, len(tiles))
	for i := range neighborSets {
		neighborSets[i] = map[int]bool{}
	}

	edgeToTiles := map[string][]int{}
	for tileID, tile := range cropped {
		for i, a := range tile.VertexKeys {
			b := tile.VertexKeys[(i+1)%len(tile.VertexKeys)]
			key := hexParallelogramWeaveCanonicalPairKey(a, b)
			edgeToTiles[key] = append(edgeToTiles[key], tileID)
		}
	}

	for _, tileIDs := range edgeToTiles {
		if len(tileIDs) < 2 {
			continue
		}
		for i := 0; i < len(tileIDs); i++ {
			for j := i + 1; j < len(tileIDs); j++ {
				a := tileIDs[i]
				b := tileIDs[j]
				if a != b {
					neighborSets[a][b] = true
					neighborSets[b][a] = true
				}
			}
		}
	}

	for id := range tiles {
		neighbors := make([]int, 0, len(neighborSets[id]))
		for neighborID := range neighborSets[id] {
			neighbors = append(neighbors, neighborID)
		}
		sort.Ints(neighbors)
		tiles[id].Neighbors = neighbors
	}

	minX, minY, _, _ := hexParallelogramWeaveBoundingBox(tiles)
	for i := range tiles {
		for j, p := range tiles[i].Points {
			tiles[i].Points[j] = core.Point{p[0] - minX, p[1] - minY}
		}
	}

	_, _, width, height := hexParallelogramWeaveBoundingBox(tiles)
	startTileIds := hexParallelogramWeaveUniqueIds([]int{
		hexParallelogramWeaveClosestTileID(tiles, 0, 0),
		hexParallelogramWeaveClosestTileID(tiles, width, height),
		hexParallelogramWeaveClosestTileID(tiles, width, 0),
		hexParallelogramWeaveClosestTileID(tiles, 0, height),
	})

	return core.Board{
		Version:      1,
		Generator:    "hex-parallelogram-weave",
		Width:        width,
		Height:       height,
		Cols:         options.Cols,
		Rows:         options.Rows,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}

func hexParallelogramWeaveHexVertexKeys(i, j int) []string {
	return hexParallelogramWeaveSubdividedPolygonKeys([][2]int{
		{i + 2, j},
		{i + 4, j},
		{i + 4, j + 2},
		{i + 2, j + 4},
		{i, j + 4},
		{i, j + 2},
	})
}

func hexParallelogramWeaveParallelogramVertexKeys(i, j int, longDir, shortDir [2]int) []string {
	longI := longDir[0] * 4
	longJ := longDir[1] * 4
	shortI := shortDir[0]
	shortJ := shortDir[1]
	return hexParallelogramWeaveSubdividedPolygonKeys([][2]int{
		{i, j},
		{i + longI, j + longJ},
		{i + longI + shortI, j + longJ + shortJ},
		{i + shortI, j + shortJ},
	})
}

func hexParallelogramWeaveSmallTriangleVertexKeys(kind string, i, j int) []string {
	vertices := [][2]int{}
	if kind == "D" {
		vertices = [][2]int{{i, j}, {i + 1, j}, {i, j + 1}}
	} else {
		vertices = [][2]int{{i + 1, j + 1}, {i, j + 1}, {i + 1, j}}
	}
	keys := make([]string, len(vertices))
	for idx, vertex := range vertices {
		keys[idx] = hexParallelogramWeaveLatticeKey(vertex[0], vertex[1])
	}
	return keys
}

func hexParallelogramWeaveSubdividedPolygonKeys(corners [][2]int) []string {
	keys := []string{}
	for sideIdx := 0; sideIdx < len(corners); sideIdx++ {
		a := corners[sideIdx]
		b := corners[(sideIdx+1)%len(corners)]
		steps := int(math.Max(math.Abs(float64(b[0]-a[0])), math.Abs(float64(b[1]-a[1]))))
		stepI := (b[0] - a[0]) / steps
		stepJ := (b[1] - a[1]) / steps
		for step := 0; step < steps; step++ {
			keys = append(keys, hexParallelogramWeaveLatticeKey(a[0]+step*stepI, a[1]+step*stepJ))
		}
	}
	return keys
}

func hexParallelogramWeaveLatticeKey(i, j int) string {
	return fmt.Sprintf("%d,%d", i, j)
}

func hexParallelogramWeaveLatticePointFromKey(key string, side float64) core.Point {
	parts := strings.Split(key, ",")
	if len(parts) != 2 {
		return core.Point{0, 0}
	}
	var i, j int
	_, _ = fmt.Sscanf(parts[0], "%d", &i)
	_, _ = fmt.Sscanf(parts[1], "%d", &j)
	return core.Point{
		side * (float64(i) + float64(j)/2),
		side * math.Sqrt(3) * float64(j) / 2,
	}
}

func hexParallelogramWeaveCanonicalPairKey(a, b string) string {
	if a < b {
		return a + "~" + b
	}
	return b + "~" + a
}

func hexParallelogramWeaveAveragePoint(points []core.Point) core.Point {
	sumX := 0.0
	sumY := 0.0
	for _, point := range points {
		sumX += point[0]
		sumY += point[1]
	}
	return core.Point{sumX / float64(len(points)), sumY / float64(len(points))}
}

func hexParallelogramWeaveBoundingBox(tiles []core.Tile) (float64, float64, float64, float64) {
	minX := math.MaxFloat64
	minY := math.MaxFloat64
	maxX := -math.MaxFloat64
	maxY := -math.MaxFloat64
	for _, tile := range tiles {
		for _, p := range tile.Points {
			minX = math.Min(minX, p[0])
			minY = math.Min(minY, p[1])
			maxX = math.Max(maxX, p[0])
			maxY = math.Max(maxY, p[1])
		}
	}
	return minX, minY, maxX, maxY
}

func hexParallelogramWeaveClosestTileID(tiles []core.Tile, tx, ty float64) int {
	bestID := -1
	bestDist := math.MaxFloat64
	for _, tile := range tiles {
		center := hexParallelogramWeaveAveragePoint(tile.Points)
		dist := math.Hypot(center[0]-tx, center[1]-ty)
		if dist < bestDist {
			bestDist = dist
			bestID = tile.ID
		}
	}
	return bestID
}

func hexParallelogramWeaveUniqueIds(ids []int) []int {
	seen := map[int]bool{}
	unique := []int{}
	for _, id := range ids {
		if id < 0 || seen[id] {
			continue
		}
		seen[id] = true
		unique = append(unique, id)
	}
	return unique
}
