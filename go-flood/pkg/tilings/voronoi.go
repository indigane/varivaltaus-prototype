package tilings

import (
	"go-flood/pkg/core"
	"math"
	"sort"
)

func GenerateVoronoiBoard(options Options, voronoiType string) core.Board {
	width := float64(options.Cols) * options.TileSize
	height := float64(options.Rows) * options.TileSize
	sites := []site{}

	if voronoiType == "jittered" {
		for r := 0; r < options.Rows; r++ {
			for c := 0; c < options.Cols; c++ {
				x := (float64(c) + 0.5 + (options.RNG() - 0.5) * 0.7) * options.TileSize
				y := (float64(r) + 0.5 + (options.RNG() - 0.5) * 0.7) * options.TileSize
				sites = append(sites, site{x, y, len(sites)})
			}
		}
	} else {
		count := options.Cols * options.Rows
		for i := 0; i < count; i++ {
			sites = append(sites, site{
				options.RNG() * width,
				options.RNG() * height,
				i,
			})
		}
	}

	tiles := []core.Tile{}
	neighborMap := make(map[int]map[int]bool)

	for i := 0; i < len(sites); i++ {
		poly := []core.Point{
			{0, 0},
			{width, 0},
			{width, height},
			{0, height},
		}

		myNeighbors := make(map[int]bool)
		type distSite struct {
			id     int
			distSq float64
		}
		others := make([]distSite, 0, len(sites)-1)
		for j := 0; j < len(sites); j++ {
			if i == j {
				continue
			}
			distSq := math.Pow(sites[i].x-sites[j].x, 2) + math.Pow(sites[i].y-sites[j].y, 2)
			others = append(others, distSite{j, distSq})
		}
		sort.Slice(others, func(a, b int) bool {
			return others[a].distSq < others[b].distSq
		})

		for _, other := range others {
			j := other.id
			result := clipPolygon(poly, sites[i], sites[j])
			if result.clipped {
				poly = result.poly
				myNeighbors[j] = true
			}
			if len(poly) == 0 {
				break
			}
		}

		tiles = append(tiles, core.Tile{
			ID:        i,
			ColorID:   int(options.RNG() * float64(options.ColorCount)),
			OwnerID:   nil,
			Points:    poly,
			Neighbors: []int{},
		})
		neighborMap[i] = myNeighbors
	}

	for i := 0; i < len(sites); i++ {
		for j := range neighborMap[i] {
			if neighborMap[j] == nil {
				neighborMap[j] = make(map[int]bool)
			}
			neighborMap[j][i] = true
		}
	}

	for i := 0; i < len(tiles); i++ {
		nList := []int{}
		for j := range neighborMap[i] {
			nList = append(nList, j)
		}
		sort.Ints(nList)
		tiles[i].Neighbors = nList
	}

	return core.Board{
		Version:      1,
		Generator:    "voronoi-" + voronoiType,
		Width:        width,
		Height:       height,
		Cols:         options.Cols,
		Rows:         options.Rows,
		Tiles:        tiles,
		StartTileIds: []int{0, len(tiles) - 1},
	}
}

type site struct {
	x, y float64
	id   int
}

type clipResult struct {
	poly    []core.Point
	clipped bool
}

func clipPolygon(poly []core.Point, site1, site2 site) clipResult {
	midX := (site1.x + site2.x) / 2
	midY := (site1.y + site2.y) / 2
	nx := site2.x - site1.x
	ny := site2.y - site1.y

	isInside := func(p core.Point) bool {
		return (p[0]-midX)*nx+(p[1]-midY)*ny <= 1e-9
	}

	newPoly := []core.Point{}
	clipped := false

	for i := 0; i < len(poly); i++ {
		p1 := poly[i]
		p2 := poly[(i+1)%len(poly)]

		in1 := isInside(p1)
		in2 := isInside(p2)

		if !in1 {
			clipped = true
		}

		if in1 {
			if in2 {
				newPoly = append(newPoly, p2)
			} else {
				newPoly = append(newPoly, intersect(p1, p2, midX, midY, nx, ny))
			}
		} else if in2 {
			newPoly = append(newPoly, intersect(p1, p2, midX, midY, nx, ny))
			newPoly = append(newPoly, p2)
		}
	}

	return clipResult{poly: newPoly, clipped: clipped && len(newPoly) > 0}
}

func intersect(p1, p2 core.Point, midX, midY, nx, ny float64) core.Point {
	dx := p2[0] - p1[0]
	dy := p2[1] - p1[1]
	num := (p1[0]-midX)*nx + (p1[1]-midY)*ny
	den := dx*nx + dy*ny

	if math.Abs(den) < 1e-12 {
		return p1
	}

	t := -num / den
	return core.Point{p1[0] + t*dx, p1[1] + t*dy}
}
