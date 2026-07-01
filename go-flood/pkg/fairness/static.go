package fairness

import (
	"go-flood/pkg/core"
	"math"
	"sort"
)

// Config controls static, human-oriented board fairness analysis.
//
// The analysis intentionally does not play games with bots. It measures the
// board state that human players are handed: starting-territory geometry,
// opening options, nearby color opportunities, and graph access from each
// start position.
type Config struct {
	PlayerCount int
	ColorCount  int
	Rules       core.Rules
	LocalDepth  int
}

// Report summarizes how balanced a board looks before player skill enters.
type Report struct {
	Score            float64
	Rating           string
	TileCount        int
	PlayerCount      int
	StartTileIDs     []int
	ComponentSpreads ComponentSpreads
	Positions        []PositionMetrics
}

// ComponentSpreads are normalized to roughly 0..1, where lower is fairer.
type ComponentSpreads struct {
	Opening    float64
	Voronoi    float64
	Local      float64
	Mobility   float64
	Centrality float64
}

// PositionMetrics describes the static advantages available from one start.
type PositionMetrics struct {
	PositionIndex       int
	StartTileID         int
	StartDegree         int
	OwnedTiles          int
	LegalMoves          int
	OpeningGains        []int
	OpeningPotential    float64
	VoronoiShare        float64
	LocalColorPotential float64
	Mobility            float64
	Centrality          float64
}

// EvaluateHumanBoard scores a board for human-vs-human positional fairness.
// It deep-copies and initializes the board through core.CreateGame so the
// analysis sees the same starting-area expansion and buffer adjustments as an
// actual game.
func EvaluateHumanBoard(board core.Board, cfg Config) Report {
	if cfg.PlayerCount <= 0 {
		cfg.PlayerCount = len(board.StartTileIds)
	}
	if cfg.ColorCount <= 0 {
		cfg.ColorCount = inferColorCount(board)
	}
	if cfg.Rules.WinCondition == "" {
		cfg.Rules = core.DefaultRules()
	}
	if cfg.LocalDepth <= 0 {
		cfg.LocalDepth = defaultLocalDepth(len(board.Tiles))
	}

	workingBoard := cloneBoard(board)
	if len(workingBoard.Tiles) == 0 || cfg.PlayerCount <= 0 {
		return Report{
			Score:       1,
			Rating:      "empty",
			TileCount:   len(workingBoard.Tiles),
			PlayerCount: cfg.PlayerCount,
		}
	}
	if cfg.PlayerCount > len(workingBoard.Tiles) {
		cfg.PlayerCount = len(workingBoard.Tiles)
	}

	workingBoard.StartTileIds = validStartTileIDs(workingBoard.StartTileIds, len(workingBoard.Tiles))
	if len(workingBoard.StartTileIds) < cfg.PlayerCount {
		workingBoard.StartTileIds = core.FindFairStartTileIds(&workingBoard, cfg.PlayerCount)
		workingBoard.StartTileIds = validStartTileIDs(workingBoard.StartTileIds, len(workingBoard.Tiles))
	}
	if len(workingBoard.StartTileIds) > cfg.PlayerCount {
		workingBoard.StartTileIds = append([]int(nil), workingBoard.StartTileIds[:cfg.PlayerCount]...)
	}
	if len(workingBoard.StartTileIds) < cfg.PlayerCount {
		cfg.PlayerCount = len(workingBoard.StartTileIds)
	}

	players := make([]core.Player, cfg.PlayerCount)
	teams := make([]core.Team, cfg.PlayerCount)
	for i := 0; i < cfg.PlayerCount; i++ {
		players[i] = core.Player{ID: i, TeamID: i, Alive: true}
		teams[i] = core.Team{ID: i}
	}

	game := core.CreateGame(core.Config{
		Board:      workingBoard,
		Players:    players,
		Teams:      teams,
		ColorCount: cfg.ColorCount,
		Rules:      cfg.Rules,
	})

	startIDs := append([]int(nil), game.Board.StartTileIds...)
	if len(startIDs) > cfg.PlayerCount {
		startIDs = startIDs[:cfg.PlayerCount]
	}

	distMaps := make([]map[int]int, cfg.PlayerCount)
	for i := 0; i < cfg.PlayerCount; i++ {
		distMaps[i] = distancesFrom(&game.Board, startIDs[i])
	}
	voronoiShares := computeVoronoiShares(&game.Board, distMaps)

	positions := make([]PositionMetrics, cfg.PlayerCount)
	openingVals := make([]float64, cfg.PlayerCount)
	voronoiVals := make([]float64, cfg.PlayerCount)
	localVals := make([]float64, cfg.PlayerCount)
	mobilityVals := make([]float64, cfg.PlayerCount)
	centralityVals := make([]float64, cfg.PlayerCount)

	for i := 0; i < cfg.PlayerCount; i++ {
		openingGains := legalOpeningGains(game, i)
		openingPotential := weightedTopInts(openingGains, []float64{1.0, 0.6, 0.3})
		localPotential := localColorPotential(game, startIDs[i], cfg.LocalDepth)
		centrality := closenessCentrality(distMaps[i])
		startDegree := 0
		if startIDs[i] >= 0 && startIDs[i] < len(game.Board.Tiles) {
			startDegree = len(game.Board.Tiles[startIDs[i]].Neighbors)
		}
		legalMoves := len(openingGains)
		mobility := float64(legalMoves) + 0.35*float64(startDegree)

		positions[i] = PositionMetrics{
			PositionIndex:       i,
			StartTileID:         startIDs[i],
			StartDegree:         startDegree,
			OwnedTiles:          ownedCount(game, i),
			LegalMoves:          legalMoves,
			OpeningGains:        openingGains,
			OpeningPotential:    openingPotential,
			VoronoiShare:        voronoiShares[i],
			LocalColorPotential: localPotential,
			Mobility:            mobility,
			Centrality:          centrality,
		}

		openingVals[i] = openingPotential
		voronoiVals[i] = voronoiShares[i]
		localVals[i] = localPotential
		mobilityVals[i] = mobility
		centralityVals[i] = centrality
	}

	spreads := ComponentSpreads{
		Opening:    spreadRatio(openingVals),
		Voronoi:    spreadRange(voronoiVals),
		Local:      spreadRatio(localVals),
		Mobility:   spreadRatio(mobilityVals),
		Centrality: spreadRatio(centralityVals),
	}

	score := clamp01(0.30*spreads.Opening +
		0.30*spreads.Voronoi +
		0.20*spreads.Local +
		0.10*spreads.Mobility +
		0.10*spreads.Centrality)

	return Report{
		Score:            score,
		Rating:           rating(score),
		TileCount:        len(game.Board.Tiles),
		PlayerCount:      cfg.PlayerCount,
		StartTileIDs:     startIDs,
		ComponentSpreads: spreads,
		Positions:        positions,
	}
}

func inferColorCount(board core.Board) int {
	maxColor := -1
	for _, tile := range board.Tiles {
		if tile.ColorID > maxColor {
			maxColor = tile.ColorID
		}
	}
	return maxColor + 1
}

func validStartTileIDs(ids []int, tileCount int) []int {
	out := make([]int, 0, len(ids))
	seen := make(map[int]bool, len(ids))
	for _, id := range ids {
		if id < 0 || id >= tileCount || seen[id] {
			continue
		}
		seen[id] = true
		out = append(out, id)
	}
	return out
}

func defaultLocalDepth(tileCount int) int {
	if tileCount <= 0 {
		return 1
	}
	depth := int(math.Sqrt(float64(tileCount))) / 2
	if depth < 3 {
		return 3
	}
	if depth > 8 {
		return 8
	}
	return depth
}

func cloneBoard(board core.Board) core.Board {
	out := board
	out.StartTileIds = append([]int(nil), board.StartTileIds...)
	out.Tiles = make([]core.Tile, len(board.Tiles))
	for i := range board.Tiles {
		out.Tiles[i] = board.Tiles[i]
		out.Tiles[i].Neighbors = append([]int(nil), board.Tiles[i].Neighbors...)
		out.Tiles[i].Points = append([]core.Point(nil), board.Tiles[i].Points...)
		if board.Tiles[i].OwnerID != nil {
			owner := *board.Tiles[i].OwnerID
			out.Tiles[i].OwnerID = &owner
		}
	}
	return out
}

func distancesFrom(board *core.Board, startID int) map[int]int {
	d := map[int]int{startID: 0}
	queue := []int{startID}
	for len(queue) > 0 {
		id := queue[0]
		queue = queue[1:]
		for _, neighborID := range board.Tiles[id].Neighbors {
			if _, ok := d[neighborID]; ok {
				continue
			}
			d[neighborID] = d[id] + 1
			queue = append(queue, neighborID)
		}
	}
	return d
}

func computeVoronoiShares(board *core.Board, distMaps []map[int]int) []float64 {
	shares := make([]float64, len(distMaps))
	if len(board.Tiles) == 0 || len(distMaps) == 0 {
		return shares
	}

	for _, tile := range board.Tiles {
		minD := math.MaxInt32
		winners := []int{}
		for i, dMap := range distMaps {
			if d, ok := dMap[tile.ID]; ok {
				if d < minD {
					minD = d
					winners = []int{i}
				} else if d == minD {
					winners = append(winners, i)
				}
			}
		}
		if len(winners) == 0 {
			continue
		}
		share := 1.0 / float64(len(winners))
		for _, winner := range winners {
			shares[winner] += share
		}
	}

	for i := range shares {
		shares[i] /= float64(len(board.Tiles))
	}
	return shares
}

func legalOpeningGains(state *core.GameState, playerID int) []int {
	gains := []int{}
	savedCurrent := state.CurrentPlayerID
	state.CurrentPlayerID = playerID
	for colorID := 0; colorID < state.ColorCount; colorID++ {
		if core.IsLegalMove(state, playerID, colorID) {
			gains = append(gains, simulateMoveGain(state, playerID, colorID))
		}
	}
	state.CurrentPlayerID = savedCurrent

	sort.Sort(sort.Reverse(sort.IntSlice(gains)))
	return gains
}

func simulateMoveGain(state *core.GameState, playerID int, colorID int) int {
	queue := []int{}
	visited := make(map[int]bool)
	gain := 0
	player := &state.Players[playerID]

	for i := range state.Board.Tiles {
		tile := &state.Board.Tiles[i]
		isOwner := tile.OwnerID != nil && *tile.OwnerID == playerID
		isTeammateMerged := state.Rules.TeamTerritory == "merged" &&
			tile.OwnerID != nil &&
			state.Players[*tile.OwnerID].TeamID == player.TeamID

		if isOwner || isTeammateMerged {
			queue = append(queue, tile.ID)
			visited[tile.ID] = true
		}
	}

	for len(queue) > 0 {
		tileID := queue[0]
		queue = queue[1:]
		for _, neighborID := range state.Board.Tiles[tileID].Neighbors {
			if visited[neighborID] {
				continue
			}
			visited[neighborID] = true
			neighbor := &state.Board.Tiles[neighborID]
			if neighbor.ColorID == colorID && core.CanCaptureTile(state, playerID, neighborID) {
				gain++
				queue = append(queue, neighborID)
			}
		}
	}

	return gain
}

func localColorPotential(state *core.GameState, startID int, depth int) float64 {
	if startID < 0 || startID >= len(state.Board.Tiles) || depth <= 0 {
		return 0
	}
	colorWeights := map[int]float64{}
	dist := map[int]int{startID: 0}
	queue := []int{startID}

	for len(queue) > 0 {
		id := queue[0]
		queue = queue[1:]
		d := dist[id]
		if d >= depth {
			continue
		}
		for _, neighborID := range state.Board.Tiles[id].Neighbors {
			if _, ok := dist[neighborID]; ok {
				continue
			}
			nextD := d + 1
			dist[neighborID] = nextD
			queue = append(queue, neighborID)

			neighbor := &state.Board.Tiles[neighborID]
			if neighbor.OwnerID != nil {
				continue
			}
			weight := float64(depth-nextD+1) / float64(depth)
			colorWeights[neighbor.ColorID] += weight
		}
	}

	vals := make([]float64, 0, len(colorWeights))
	for _, v := range colorWeights {
		vals = append(vals, v)
	}
	sort.Sort(sort.Reverse(sort.Float64Slice(vals)))
	return weightedTopFloat(vals, []float64{1.0, 0.55, 0.25})
}

func closenessCentrality(dists map[int]int) float64 {
	if len(dists) <= 1 {
		return 0
	}
	sum := 0
	for _, d := range dists {
		sum += d
	}
	if sum == 0 {
		return 0
	}
	return float64(len(dists)-1) / float64(sum)
}

func ownedCount(state *core.GameState, playerID int) int {
	count := 0
	for _, tile := range state.Board.Tiles {
		if tile.OwnerID != nil && *tile.OwnerID == playerID {
			count++
		}
	}
	return count
}

func weightedTopInts(vals []int, weights []float64) float64 {
	out := 0.0
	for i := 0; i < len(vals) && i < len(weights); i++ {
		out += float64(vals[i]) * weights[i]
	}
	return out
}

func weightedTopFloat(vals []float64, weights []float64) float64 {
	out := 0.0
	for i := 0; i < len(vals) && i < len(weights); i++ {
		out += vals[i] * weights[i]
	}
	return out
}

func spreadRange(vals []float64) float64 {
	if len(vals) <= 1 {
		return 0
	}
	minV, maxV := vals[0], vals[0]
	for _, v := range vals[1:] {
		if v < minV {
			minV = v
		}
		if v > maxV {
			maxV = v
		}
	}
	return maxV - minV
}

func spreadRatio(vals []float64) float64 {
	if len(vals) <= 1 {
		return 0
	}
	maxAbs := 0.0
	for _, v := range vals {
		if math.Abs(v) > maxAbs {
			maxAbs = math.Abs(v)
		}
	}
	if maxAbs == 0 {
		return 0
	}
	return clamp01(spreadRange(vals) / maxAbs)
}

func rating(score float64) string {
	switch {
	case score <= 0.05:
		return "excellent"
	case score <= 0.10:
		return "good"
	case score <= 0.20:
		return "playable"
	case score <= 0.35:
		return "biased"
	default:
		return "very biased"
	}
}

func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}
