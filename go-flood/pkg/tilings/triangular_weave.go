package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
	"sort"
	"strings"
)

type triangularWeaveRawTile struct {
	VertexKeys []string
	Points     []core.Point
	Centroid   core.Point
}

type triangularWeaveMotifTile struct {
	Kind string
	I    int
	J    int
}

// GenerateTriangularWeaveBoard generates a woven triangular tiling made from
// regular hexagons and larger equilateral triangles.  The triangle sides are
// subdivided into three unit edges, so each visible triangle side is 3x the
// hexagon side.  Interior hexagons are surrounded by six large triangles with
// alternating up/down orientations.
func GenerateTriangularWeaveBoard(options Options) core.Board {
	side := options.TileSize
	const ratio = 3
	const period = 6
	targetWidth := math.Max(float64(options.Cols), 1) * ratio * side
	targetHeight := math.Max(float64(options.Rows), 1) * ratio * math.Sqrt(3) * side / 2
	pad := 4
	cropMarginX := period * side / 2
	cropMarginY := period * math.Sqrt(3) * side / 4

	// One repeat on a unit triangular grid.  H is a regular side-1 hexagon.
	// Tup/Tdn are side-3 equilateral triangles whose long sides are represented
	// as three unit edge segments for accurate tile-neighbor detection.
	motif := []triangularWeaveMotifTile{
		{Kind: "Tdn", I: 2, J: 2}, {Kind: "Tup", I: 1, J: 5}, {Kind: "H", I: 0, J: 2},
		{Kind: "Tdn", I: 4, J: 4}, {Kind: "Tup", I: 5, J: 3}, {Kind: "Tdn", I: 0, J: 0},
		{Kind: "H", I: 2, J: 4}, {Kind: "H", I: 4, J: 0}, {Kind: "Tup", I: 3, J: 1},
	}

	rawTiles := []triangularWeaveRawTile{}
	addRawTile := func(vertexKeys []string) {
		points := make([]core.Point, len(vertexKeys))
		for i, key := range vertexKeys {
			points[i] = triangularWeaveLatticePointFromKey(key, side)
		}
		rawTiles = append(rawTiles, triangularWeaveRawTile{
			VertexKeys: vertexKeys,
			Points:     points,
		})
	}

	repeatMinY := -pad
	repeatMaxY := int(math.Ceil(float64(options.Rows)/2)) + pad
	shearPad := int(math.Ceil(math.Max(0, float64(repeatMaxY*period))/(2*period))) + 2
	reverseShearPad := int(math.Ceil(math.Max(0, float64(-repeatMinY*period))/(2*period))) + 2
	repeatMinX := -pad - shearPad
	repeatMaxX := int(math.Ceil(float64(options.Cols)/2)) + pad + reverseShearPad

	for ry := repeatMinY; ry <= repeatMaxY; ry++ {
		for rx := repeatMinX; rx <= repeatMaxX; rx++ {
			offsetI := rx * period
			offsetJ := ry * period
			for _, tile := range motif {
				i := tile.I + offsetI
				j := tile.J + offsetJ
				switch tile.Kind {
				case "H":
					addRawTile(triangularWeaveHexVertexKeys(i, j))
				case "Tup":
					addRawTile(triangularWeaveSubdividedTriangleKeys([][2]int{{i, j}, {i + ratio, j}, {i, j + ratio}}))
				case "Tdn":
					addRawTile(triangularWeaveSubdividedTriangleKeys([][2]int{{i + ratio, j + ratio}, {i, j + ratio}, {i + ratio, j}}))
				}
			}
		}
	}

	cropped := []triangularWeaveRawTile{}
	for _, tile := range rawTiles {
		tile.Centroid = triangularWeaveAveragePoint(tile.Points)
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
			key := triangularWeaveCanonicalPairKey(a, b)
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

	minX, minY, _, _ := triangularWeaveBoundingBox(tiles)
	for i := range tiles {
		for j, p := range tiles[i].Points {
			tiles[i].Points[j] = core.Point{p[0] - minX, p[1] - minY}
		}
	}

	_, _, width, height := triangularWeaveBoundingBox(tiles)
	startTileIds := triangularWeaveUniqueIds([]int{
		triangularWeaveClosestTileID(tiles, 0, 0),
		triangularWeaveClosestTileID(tiles, width, height),
		triangularWeaveClosestTileID(tiles, width, 0),
		triangularWeaveClosestTileID(tiles, 0, height),
	})

	return core.Board{
		Version:      1,
		Generator:    "triangular-weave",
		Width:        width,
		Height:       height,
		Cols:         options.Cols,
		Rows:         options.Rows,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}

func triangularWeaveHexVertexKeys(i, j int) []string {
	vertices := [][2]int{
		{i + 1, j},
		{i, j + 1},
		{i - 1, j + 1},
		{i - 1, j},
		{i, j - 1},
		{i + 1, j - 1},
	}
	keys := make([]string, len(vertices))
	for idx, vertex := range vertices {
		keys[idx] = triangularWeaveLatticeKey(vertex[0], vertex[1])
	}
	return keys
}

func triangularWeaveSubdividedTriangleKeys(corners [][2]int) []string {
	keys := []string{}
	for sideIdx := 0; sideIdx < len(corners); sideIdx++ {
		a := corners[sideIdx]
		b := corners[(sideIdx+1)%len(corners)]
		stepI := triangularWeaveSign(b[0] - a[0])
		stepJ := triangularWeaveSign(b[1] - a[1])
		steps := int(math.Max(math.Abs(float64(b[0]-a[0])), math.Abs(float64(b[1]-a[1]))))
		for step := 0; step < steps; step++ {
			keys = append(keys, triangularWeaveLatticeKey(a[0]+step*stepI, a[1]+step*stepJ))
		}
	}
	return keys
}

func triangularWeaveLatticeKey(i, j int) string {
	return fmt.Sprintf("%d,%d", i, j)
}

func triangularWeaveLatticePointFromKey(key string, side float64) core.Point {
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

func triangularWeaveCanonicalPairKey(a, b string) string {
	if a < b {
		return a + "~" + b
	}
	return b + "~" + a
}

func triangularWeaveSign(value int) int {
	if value > 0 {
		return 1
	}
	if value < 0 {
		return -1
	}
	return 0
}

func triangularWeaveAveragePoint(points []core.Point) core.Point {
	var x, y float64
	for _, p := range points {
		x += p[0]
		y += p[1]
	}
	return core.Point{x / float64(len(points)), y / float64(len(points))}
}

func triangularWeaveBoundingBox(tiles []core.Tile) (float64, float64, float64, float64) {
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
	if len(tiles) == 0 {
		return 0, 0, 0, 0
	}
	return minX, minY, maxX - minX, maxY - minY
}

func triangularWeaveClosestTileID(tiles []core.Tile, tx, ty float64) int {
	bestID := 0
	bestDist := math.MaxFloat64
	for _, tile := range tiles {
		centroid := triangularWeaveAveragePoint(tile.Points)
		dx := centroid[0] - tx
		dy := centroid[1] - ty
		dist := dx*dx + dy*dy
		if dist < bestDist {
			bestDist = dist
			bestID = tile.ID
		}
	}
	return bestID
}

func triangularWeaveUniqueIds(ids []int) []int {
	seen := map[int]bool{}
	result := []int{}
	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			result = append(result, id)
		}
	}
	return result
}
