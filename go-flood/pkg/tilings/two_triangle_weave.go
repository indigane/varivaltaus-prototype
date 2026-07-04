package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
	"sort"
	"strings"
)

type twoTriangleWeaveRawTile struct {
	TileType   string
	VertexKeys []string
	Points     []core.Point
	Centroid   core.Point
}

type twoTriangleWeaveMotifTile struct {
	Kind string
	I    int
	J    int
}

// GenerateTwoTriangleWeaveBoard generates a woven equilateral-triangle tiling
// made from small side-1 triangles and large side-2 triangles. Large triangle
// sides are subdivided into two unit edges so long sides can border either one
// large triangle or two small triangles.
func GenerateTwoTriangleWeaveBoard(options Options) core.Board {
	side := options.TileSize
	const periodI = 6
	const periodJ = 3
	targetWidth := math.Max(float64(options.Cols), 1) * 2 * side
	targetHeight := math.Max(float64(options.Rows), 1) * math.Sqrt(3) * side
	pad := 5

	motif := []twoTriangleWeaveMotifTile{
		{Kind: "U", I: 3, J: 0},
		{Kind: "D", I: 5, J: 0},
		{Kind: "D", I: 1, J: 1},
		{Kind: "U", I: 5, J: 1},
		{Kind: "U", I: 0, J: 2},
		{Kind: "D", I: 2, J: 2},
		{Kind: "U", I: 2, J: 2},
		{Kind: "D", I: 4, J: 2},
	}

	rawTiles := []twoTriangleWeaveRawTile{}
	coveredCells := map[string]bool{}

	addRawTile := func(tileType string, vertexKeys []string) {
		points := make([]core.Point, len(vertexKeys))
		for i, key := range vertexKeys {
			points[i] = twoTriangleWeaveLatticePointFromKey(key, side)
		}
		rawTiles = append(rawTiles, twoTriangleWeaveRawTile{
			TileType:   tileType,
			VertexKeys: vertexKeys,
			Points:     points,
		})
	}

	addLarge := func(kind string, i, j int) {
		cellKeys := twoTriangleWeaveLargeTriangleCellKeys(kind, i, j)
		for _, key := range cellKeys {
			if coveredCells[key] {
				return
			}
		}
		tileType := "large-down"
		if kind == "U" {
			tileType = "large-up"
		}
		addRawTile(tileType, twoTriangleWeaveLargeTriangleVertexKeys(kind, i, j))
		for _, key := range cellKeys {
			coveredCells[key] = true
		}
	}

	repeatMinY := -pad
	repeatMaxY := int(math.Ceil(float64(options.Rows)*2/periodJ)) + pad
	shearPad := int(math.Ceil(math.Max(0, float64(repeatMaxY*periodJ))/(2*periodI))) + 2
	reverseShearPad := int(math.Ceil(math.Max(0, float64(-repeatMinY*periodJ))/(2*periodI))) + 2
	repeatMinX := -pad - shearPad
	repeatMaxX := int(math.Ceil(float64(options.Cols)*2/periodI)) + pad + reverseShearPad
	for ry := repeatMinY; ry <= repeatMaxY; ry++ {
		for rx := repeatMinX; rx <= repeatMaxX; rx++ {
			offsetI := rx * periodI
			offsetJ := ry * periodJ
			for _, tile := range motif {
				addLarge(tile.Kind, tile.I+offsetI, tile.J+offsetJ)
			}
		}
	}

	maxJ := int(math.Ceil(targetHeight/(math.Sqrt(3)*side/2))) + pad
	maxI := int(math.Ceil(targetWidth/side)) + pad + maxJ
	for j := -pad; j <= maxJ; j++ {
		for i := -pad - int(math.Ceil(float64(j)/2)); i <= maxI; i++ {
			for _, kind := range []string{"D", "U"} {
				key := twoTriangleWeaveUnitCellKey(kind, i, j)
				if coveredCells[key] {
					continue
				}
				vertexKeys := twoTriangleWeaveSmallTriangleVertexKeys(kind, i, j)
				points := make([]core.Point, len(vertexKeys))
				for idx, vertexKey := range vertexKeys {
					points[idx] = twoTriangleWeaveLatticePointFromKey(vertexKey, side)
				}
				centroid := twoTriangleWeaveAveragePoint(points)
				if centroid[0] < -2*side || centroid[0] > targetWidth+2*side || centroid[1] < -2*side || centroid[1] > targetHeight+2*side {
					continue
				}
				tileType := "small-down"
				if kind == "U" {
					tileType = "small-up"
				}
				addRawTile(tileType, vertexKeys)
			}
		}
	}

	cropped := []twoTriangleWeaveRawTile{}
	for _, tile := range rawTiles {
		tile.Centroid = twoTriangleWeaveAveragePoint(tile.Points)
		if tile.Centroid[0] >= 0 && tile.Centroid[0] <= targetWidth && tile.Centroid[1] >= 0 && tile.Centroid[1] <= targetHeight {
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
			key := twoTriangleWeaveCanonicalPairKey(a, b)
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

	minX, minY, _, _ := twoTriangleWeaveBoundingBox(tiles)
	for i := range tiles {
		for j, p := range tiles[i].Points {
			tiles[i].Points[j] = core.Point{p[0] - minX, p[1] - minY}
		}
	}

	_, _, width, height := twoTriangleWeaveBoundingBox(tiles)
	startTileIds := twoTriangleWeaveUniqueIds([]int{
		twoTriangleWeaveClosestTileID(tiles, 0, 0),
		twoTriangleWeaveClosestTileID(tiles, width, height),
		twoTriangleWeaveClosestTileID(tiles, width, 0),
		twoTriangleWeaveClosestTileID(tiles, 0, height),
	})

	return core.Board{
		Version:      1,
		Generator:    "two-triangle-weave",
		Width:        width,
		Height:       height,
		Cols:         options.Cols,
		Rows:         options.Rows,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}

func twoTriangleWeaveSmallTriangleVertexKeys(kind string, i, j int) []string {
	vertices := [][2]int{}
	if kind == "D" {
		vertices = [][2]int{{i, j}, {i + 1, j}, {i, j + 1}}
	} else {
		vertices = [][2]int{{i + 1, j + 1}, {i, j + 1}, {i + 1, j}}
	}
	keys := make([]string, len(vertices))
	for idx, vertex := range vertices {
		keys[idx] = twoTriangleWeaveLatticeKey(vertex[0], vertex[1])
	}
	return keys
}

func twoTriangleWeaveLargeTriangleVertexKeys(kind string, i, j int) []string {
	corners := [][2]int{}
	if kind == "D" {
		corners = [][2]int{{i, j}, {i + 2, j}, {i, j + 2}}
	} else {
		corners = [][2]int{{i + 2, j + 2}, {i, j + 2}, {i + 2, j}}
	}
	return twoTriangleWeaveSubdividedTriangleKeys(corners)
}

func twoTriangleWeaveLargeTriangleCellKeys(kind string, i, j int) []string {
	if kind == "D" {
		return []string{
			twoTriangleWeaveUnitCellKey("D", i, j),
			twoTriangleWeaveUnitCellKey("D", i+1, j),
			twoTriangleWeaveUnitCellKey("D", i, j+1),
			twoTriangleWeaveUnitCellKey("U", i, j),
		}
	}
	return []string{
		twoTriangleWeaveUnitCellKey("D", i+1, j+1),
		twoTriangleWeaveUnitCellKey("U", i, j+1),
		twoTriangleWeaveUnitCellKey("U", i+1, j),
		twoTriangleWeaveUnitCellKey("U", i+1, j+1),
	}
}

func twoTriangleWeaveUnitCellKey(kind string, i, j int) string {
	return fmt.Sprintf("%s:%d,%d", kind, i, j)
}

func twoTriangleWeaveSubdividedTriangleKeys(corners [][2]int) []string {
	keys := []string{}
	for sideIdx := 0; sideIdx < len(corners); sideIdx++ {
		a := corners[sideIdx]
		b := corners[(sideIdx+1)%len(corners)]
		stepI := twoTriangleWeaveSign(b[0] - a[0])
		stepJ := twoTriangleWeaveSign(b[1] - a[1])
		steps := int(math.Max(math.Abs(float64(b[0]-a[0])), math.Abs(float64(b[1]-a[1]))))
		for step := 0; step < steps; step++ {
			keys = append(keys, twoTriangleWeaveLatticeKey(a[0]+step*stepI, a[1]+step*stepJ))
		}
	}
	return keys
}

func twoTriangleWeaveLatticeKey(i, j int) string {
	return fmt.Sprintf("%d,%d", i, j)
}

func twoTriangleWeaveLatticePointFromKey(key string, side float64) core.Point {
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

func twoTriangleWeaveCanonicalPairKey(a, b string) string {
	if a < b {
		return a + "~" + b
	}
	return b + "~" + a
}

func twoTriangleWeaveAveragePoint(points []core.Point) core.Point {
	sumX := 0.0
	sumY := 0.0
	for _, point := range points {
		sumX += point[0]
		sumY += point[1]
	}
	return core.Point{sumX / float64(len(points)), sumY / float64(len(points))}
}

func twoTriangleWeaveBoundingBox(tiles []core.Tile) (float64, float64, float64, float64) {
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

func twoTriangleWeaveClosestTileID(tiles []core.Tile, tx, ty float64) int {
	bestID := -1
	bestDist := math.MaxFloat64
	for _, tile := range tiles {
		center := twoTriangleWeaveAveragePoint(tile.Points)
		dist := math.Hypot(center[0]-tx, center[1]-ty)
		if dist < bestDist {
			bestDist = dist
			bestID = tile.ID
		}
	}
	return bestID
}

func twoTriangleWeaveUniqueIds(ids []int) []int {
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

func twoTriangleWeaveSign(v int) int {
	if v > 0 {
		return 1
	}
	if v < 0 {
		return -1
	}
	return 0
}
