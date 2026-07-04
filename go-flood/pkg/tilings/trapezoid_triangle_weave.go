package tilings

import (
	"fmt"
	"go-flood/pkg/core"
	"math"
	"sort"
	"strings"
)

type trapezoidTriangleWeaveRawTile struct {
	TileType   string
	VertexKeys []string
	Points     []core.Point
	Centroid   core.Point
}

type trapezoidTriangleWeaveMotifTile struct {
	TileType string
	Corners  [][2]int
}

type trapezoidTriangleWeaveUnitGroup struct {
	Orientation string
	MinJ        int
	MaxJ        int
	Tiles       []trapezoidTriangleWeaveRawTile
}

// GenerateTrapezoidTriangleWeaveBoard generates a triangular-lattice weave
// made from side-3 equilateral triangles and isosceles trapezoids.  Each
// triangle is surrounded by three trapezoids whose inner edge has length 4,
// opposite edge has length 5, and two short legs have length 1.  The inner
// length-4 trapezoid edge is offset against the triangle side so one endpoint
// aligns with the triangle and one unit segment extends past the other
// endpoint.  Mirrored up/down units share the length-5 outer edges to create
// the woven pattern. Longer edges are subdivided into unit segments so graph
// neighbors can be matched across partial edges.
func GenerateTrapezoidTriangleWeaveBoard(options Options) core.Board {
	side := options.TileSize
	const periodI = 6
	const periodJ = 6
	targetWidth := math.Max(float64(options.Cols), 1) * 3.0 * side
	targetHeight := math.Max(float64(options.Rows), 1) * math.Sqrt(3) * side
	pad := 4
	cropMarginX := periodI * side / 2
	cropMarginY := periodJ * math.Sqrt(3) * side / 4

	upUnit := []trapezoidTriangleWeaveMotifTile{
		{TileType: "triangle-up", Corners: [][2]int{{0, 0}, {3, 0}, {0, 3}}},
		{TileType: "trapezoid", Corners: [][2]int{{0, 0}, {4, 0}, {5, -1}, {0, -1}}},
		{TileType: "trapezoid", Corners: [][2]int{{3, 0}, {-1, 4}, {-1, 5}, {4, 0}}},
		{TileType: "trapezoid", Corners: [][2]int{{0, 3}, {0, -1}, {-1, -1}, {-1, 4}}},
	}

	downUnit := []trapezoidTriangleWeaveMotifTile{}
	for _, tile := range upUnit {
		reflected := trapezoidTriangleWeaveMotifTile{TileType: tile.TileType}
		if tile.TileType == "triangle-up" {
			reflected.TileType = "triangle-down"
		}
		reflected.Corners = make([][2]int, len(tile.Corners))
		for i, corner := range tile.Corners {
			reflected.Corners[i] = trapezoidTriangleWeaveReflectAcrossHorizontalLatticeLine(corner[0], corner[1], -1)
		}
		downUnit = append(downUnit, reflected)
	}
	unitTemplates := [][]trapezoidTriangleWeaveMotifTile{upUnit, downUnit}

	makeRawTile := func(tileType string, vertexKeys []string) trapezoidTriangleWeaveRawTile {
		points := make([]core.Point, len(vertexKeys))
		for i, key := range vertexKeys {
			points[i] = trapezoidTriangleWeaveLatticePointFromKey(key, side)
		}
		return trapezoidTriangleWeaveRawTile{
			TileType:   tileType,
			VertexKeys: vertexKeys,
			Points:     points,
		}
	}

	unitGroups := []trapezoidTriangleWeaveUnitGroup{}
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
			for _, unit := range unitTemplates {
				orientation := "down"
				if unit[0].TileType == "triangle-up" {
					orientation = "up"
				}

				unitTiles := []trapezoidTriangleWeaveRawTile{}
				var triangle *trapezoidTriangleWeaveRawTile
				minJ := maxIntValue()
				maxJ := -maxIntValue()
				for _, tile := range unit {
					corners := make([][2]int, len(tile.Corners))
					for i, corner := range tile.Corners {
						corners[i] = [2]int{corner[0] + offsetI, corner[1] + offsetJ}
						minJ = minInt(minJ, corners[i][1])
						maxJ = maxInt(maxJ, corners[i][1])
					}
					raw := makeRawTile(tile.TileType, trapezoidTriangleWeaveSubdividedPolygonKeys(corners))
					unitTiles = append(unitTiles, raw)
					if strings.HasPrefix(raw.TileType, "triangle") {
						triangle = &unitTiles[len(unitTiles)-1]
					}
				}
				if triangle == nil {
					continue
				}
				anchor := trapezoidTriangleWeaveAveragePoint(triangle.Points)
				if anchor[0] >= -cropMarginX && anchor[0] <= targetWidth+cropMarginX && anchor[1] >= -cropMarginY && anchor[1] <= targetHeight+cropMarginY {
					unitGroups = append(unitGroups, trapezoidTriangleWeaveUnitGroup{Orientation: orientation, MinJ: minJ, MaxJ: maxJ, Tiles: unitTiles})
				}
			}
		}
	}

	// Keep whole triangle+three-trapezoid units, but choose horizontal lattice
	// lines where the top row of up units and bottom row of down units have
	// flat outer trapezoid edges. This avoids the single-vertex spikes that
	// appear when the crop starts on a down-unit apex or ends on an up-unit apex.
	topFlatJ := maxIntValue()
	bottomFlatJ := -maxIntValue()
	for _, group := range unitGroups {
		if group.Orientation == "up" {
			topFlatJ = minInt(topFlatJ, group.MinJ)
		}
		if group.Orientation == "down" {
			bottomFlatJ = maxInt(bottomFlatJ, group.MaxJ)
		}
	}

	rawTiles := []trapezoidTriangleWeaveRawTile{}
	for _, group := range unitGroups {
		if group.MinJ >= topFlatJ && group.MaxJ <= bottomFlatJ {
			rawTiles = append(rawTiles, group.Tiles...)
		}
	}

	cropped := []trapezoidTriangleWeaveRawTile{}
	for _, tile := range rawTiles {
		tile.Centroid = trapezoidTriangleWeaveAveragePoint(tile.Points)
		cropped = append(cropped, tile)
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
			key := trapezoidTriangleWeaveCanonicalPairKey(a, b)
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

	minX, minY, _, _ := trapezoidTriangleWeaveBoundingBox(tiles)
	for i := range tiles {
		for j, p := range tiles[i].Points {
			tiles[i].Points[j] = core.Point{p[0] - minX, p[1] - minY}
		}
	}

	_, _, width, height := trapezoidTriangleWeaveBoundingBox(tiles)
	startTileIds := trapezoidTriangleWeaveUniqueIds([]int{
		trapezoidTriangleWeaveClosestTileID(tiles, 0, 0),
		trapezoidTriangleWeaveClosestTileID(tiles, width, height),
		trapezoidTriangleWeaveClosestTileID(tiles, width, 0),
		trapezoidTriangleWeaveClosestTileID(tiles, 0, height),
	})

	return core.Board{
		Version:      1,
		Generator:    "trapezoid-triangle-weave",
		Width:        width,
		Height:       height,
		Cols:         options.Cols,
		Rows:         options.Rows,
		Tiles:        tiles,
		StartTileIds: startTileIds,
	}
}

func trapezoidTriangleWeaveReflectAcrossHorizontalLatticeLine(i, j, lineJ int) [2]int {
	return [2]int{i + j - lineJ, 2*lineJ - j}
}

func trapezoidTriangleWeaveSubdividedPolygonKeys(corners [][2]int) []string {
	keys := []string{}
	for sideIdx := 0; sideIdx < len(corners); sideIdx++ {
		a := corners[sideIdx]
		b := corners[(sideIdx+1)%len(corners)]
		steps := int(math.Max(math.Abs(float64(b[0]-a[0])), math.Abs(float64(b[1]-a[1]))))
		stepI := (b[0] - a[0]) / steps
		stepJ := (b[1] - a[1]) / steps
		for step := 0; step < steps; step++ {
			keys = append(keys, trapezoidTriangleWeaveLatticeKey(a[0]+step*stepI, a[1]+step*stepJ))
		}
	}
	return keys
}

func trapezoidTriangleWeaveLatticeKey(i, j int) string {
	return fmt.Sprintf("%d,%d", i, j)
}

func trapezoidTriangleWeaveLatticePointFromKey(key string, side float64) core.Point {
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

func trapezoidTriangleWeaveCanonicalPairKey(a, b string) string {
	if a < b {
		return a + "~" + b
	}
	return b + "~" + a
}

func trapezoidTriangleWeaveAveragePoint(points []core.Point) core.Point {
	sumX := 0.0
	sumY := 0.0
	for _, point := range points {
		sumX += point[0]
		sumY += point[1]
	}
	return core.Point{sumX / float64(len(points)), sumY / float64(len(points))}
}

func trapezoidTriangleWeaveBoundingBox(tiles []core.Tile) (float64, float64, float64, float64) {
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

func trapezoidTriangleWeaveClosestTileID(tiles []core.Tile, tx, ty float64) int {
	bestID := -1
	bestDist := math.MaxFloat64
	for _, tile := range tiles {
		center := trapezoidTriangleWeaveAveragePoint(tile.Points)
		dist := math.Hypot(center[0]-tx, center[1]-ty)
		if dist < bestDist {
			bestDist = dist
			bestID = tile.ID
		}
	}
	return bestID
}

func trapezoidTriangleWeaveUniqueIds(ids []int) []int {
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

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func maxIntValue() int {
	return int(^uint(0) >> 1)
}
