package main

import (
	"flag"
	"fmt"
	"go-flood/pkg/bots"
	"go-flood/pkg/core"
	"go-flood/pkg/tilings"
	"math"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

func main() {
	mode := flag.String("mode", "sim", "Mode: sim, fairness, or search")
	gameCount := flag.Int("games", 100, "Number of games (or batches) to simulate")
	boardTypeFlag := flag.String("board", "square", "Board type (square, triangle, hex, rhombitrihexagonal, pentagon-cairo, voronoi-jittered, voronoi-random)")
	colsFlag := flag.Int("cols", 20, "Number of columns")
	rowsFlag := flag.Int("rows", 20, "Number of rows")
	colorCountFlag := flag.Int("colors", 6, "Number of colors")
	concurrency := flag.Int("concurrency", 8, "Number of concurrent simulations")
	botTypesFlag := flag.String("bots", "greedy,random", "Comma-separated list of bot types for players")
	seed := flag.Uint("seed", uint(time.Now().UnixNano()), "Initial seed for the simulation")
	startTilesFlag := flag.String("start-tiles", "", "Comma-separated list of start tile IDs (for fairness mode)")

	// New study flags
	teamsFlag := flag.String("teams", "", "Comma-separated list of team IDs (e.g., 0,0,1,1)")
	teamTerritoryFlag := flag.String("team-territory", "separatePlayers", "Team territory mode: merged or separatePlayers")
	startPosFlag := flag.String("start-pos", "corners", "Starting positions: corners, center-clustered, center-distributed")
	startAreaSizeFlag := flag.Int("start-area-size", 1, "Starting area size")
	startAreaBufferFlag := flag.Bool("start-area-buffer", true, "Whether to apply starting area buffer")

	flag.Parse()

	config := studyConfig{
		boardType:       *boardTypeFlag,
		cols:            *colsFlag,
		rows:            *rowsFlag,
		colorCount:      *colorCountFlag,
		botTypes:        *botTypesFlag,
		seed:            *seed,
		concurrency:     *concurrency,
		teams:           *teamsFlag,
		teamTerritory:   *teamTerritoryFlag,
		startPos:        *startPosFlag,
		startAreaSize:   *startAreaSizeFlag,
		startAreaBuffer: *startAreaBufferFlag,
	}

	switch *mode {
	case "fairness":
		runFairnessAnalysis(*gameCount, config, *startTilesFlag)
	case "search":
		runFairnessSearch(*gameCount, config)
	default:
		runSimulation(*gameCount, config)
	}
}

type studyConfig struct {
	boardType       string
	cols            int
	rows            int
	colorCount      int
	botTypes        string
	seed            uint
	concurrency     int
	teams           string
	teamTerritory   string
	startPos        string
	startAreaSize   int
	startAreaBuffer bool
}

func runSimulation(gameCount int, cfg studyConfig) {
	fmt.Printf("Starting simulation of %d games on %dx%d %s board with %d colors\n", gameCount, cfg.cols, cfg.rows, cfg.boardType, cfg.colorCount)
	fmt.Printf("Bots: %s\n", cfg.botTypes)

	botNames := strings.Split(cfg.botTypes, ",")

	results := make(chan gameResult, gameCount)
	var wg sync.WaitGroup

	startTime := time.Now()

	for i := 0; i < cfg.concurrency; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			workerRNG := core.CreateRNG(uint32(cfg.seed) + uint32(workerID))

			gamesPerWorker := (gameCount) / (cfg.concurrency)
			if workerID < (gameCount)%cfg.concurrency {
				gamesPerWorker++
			}

			for g := 0; g < gamesPerWorker; g++ {
				res := runSingleGame(cfg, workerRNG, nil)
				results <- res
			}
		}(i)
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	winCounts := make(map[int]int)
	teamWinCounts := make(map[int]int)
	totalTurns := 0
	totalDominance := 0.0
	totalGames := 0
	totalTiles := 0
	for res := range results {
		winCounts[res.winner]++
		if res.winningTeam != -1 {
			teamWinCounts[res.winningTeam]++
		}
		totalTurns += res.turns
		totalDominance += res.dominance
		totalTiles = res.tileCount // All games in a simulation batch have same tile count
		totalGames++
	}

	duration := time.Since(startTime)
	fmt.Printf("\nSimulation finished in %v (%.2f games/sec)\n", duration, float64(totalGames)/duration.Seconds())
	fmt.Printf("Total tiles: %d\n", totalTiles)
	fmt.Printf("Average turns: %.2f\n", float64(totalTurns)/float64(totalGames))
	fmt.Printf("Turns per 100 tiles: %.2f\n", (float64(totalTurns)/float64(totalGames))/(float64(totalTiles)/100.0))
	fmt.Printf("Average winner dominance: %.1f%%\n", (totalDominance/float64(totalGames))*100)
	fmt.Println("Results:")

	for i := 0; i < len(botNames); i++ {
		wins := winCounts[i]
		fmt.Printf("  Player %d (%s): %d (%.1f%%)\n", i, botNames[i], wins, float64(wins)/float64(totalGames)*100)
	}

	if cfg.teams != "" {
		fmt.Println("Team Results:")
		teamIDs := strings.Split(cfg.teams, ",")
		uniqueTeams := make(map[int]bool)
		for _, tidStr := range teamIDs {
			tid, _ := strconv.Atoi(tidStr)
			uniqueTeams[tid] = true
		}
		for tid := range uniqueTeams {
			wins := teamWinCounts[tid]
			fmt.Printf("  Team %d: %d (%.1f%%)\n", tid, wins, float64(wins)/float64(totalGames)*100)
		}
	}
	if winCounts[-1] > 0 {
		fmt.Printf("  Draw: %d (%.1f%%)\n", winCounts[-1], float64(winCounts[-1])/float64(totalGames)*100)
	}
}

type gameResult struct {
	winner      int
	winningTeam int
	turns       int
	dominance   float64
	tileCount   int
}

func runSingleGame(cfg studyConfig, rng core.RNG, overrideStartTiles []int) gameResult {
	opts := tilings.Options{
		Cols:       cfg.cols,
		Rows:       cfg.rows,
		TileSize:   10,
		ColorCount: cfg.colorCount,
		RNG:        rng,
	}

	board := generateBaseBoard(cfg.boardType, opts)

	botNames := strings.Split(cfg.botTypes, ",")
	playerCount := len(botNames)

	if len(overrideStartTiles) > 0 {
		board.StartTileIds = overrideStartTiles
	} else if cfg.startPos != "corners" {
		board.StartTileIds = findStartTilesByPosition(&board, playerCount, cfg.startPos)
	} else if len(board.StartTileIds) < playerCount {
		board.StartTileIds = core.FindFairStartTileIds(&board, playerCount)
	}

	players := make([]core.Player, playerCount)
	playerBots := make([]bots.Bot, playerCount)

	teamIDs := make([]int, playerCount)
	if cfg.teams != "" {
		for i, tidStr := range strings.Split(cfg.teams, ",") {
			if i < playerCount {
				tid, _ := strconv.Atoi(tidStr)
				teamIDs[i] = tid
			}
		}
	} else {
		for i := 0; i < playerCount; i++ {
			teamIDs[i] = i
		}
	}

	maxTeamID := 0
	for _, tid := range teamIDs {
		if tid > maxTeamID {
			maxTeamID = tid
		}
	}
	teams := make([]core.Team, maxTeamID+1)
	for i := range teams {
		teams[i] = core.Team{ID: i}
	}

	for i := 0; i < playerCount; i++ {
		players[i] = core.Player{ID: i, Alive: true, TeamID: teamIDs[i]}

		switch botNames[i] {
		case "random":
			playerBots[i] = &bots.RandomBot{RNG: rng}
		case "greedy":
			playerBots[i] = &bots.GreedyBot{}
		case "aggressive":
			playerBots[i] = &bots.AggressiveBot{}
		case "lookahead":
			playerBots[i] = &bots.LookaheadBot{}
		case "hybrid":
			playerBots[i] = &bots.HybridBot{}
		default:
			playerBots[i] = &bots.RandomBot{RNG: rng}
		}
	}

	rules := core.DefaultRules()
	rules.TeamTerritory = cfg.teamTerritory
	rules.StartingAreaSize = cfg.startAreaSize
	rules.StartingAreaBuffer = cfg.startAreaBuffer

	game := core.CreateGame(core.Config{
		Board:      board,
		Players:    players,
		Teams:      teams,
		ColorCount: cfg.colorCount,
		Rules:      rules,
	})

	for game.Status == "playing" {
		pID := game.CurrentPlayerID
		move := playerBots[pID].GetMove(game, pID)
		core.ApplyMove(game, pID, move)
	}

	winners := core.GetWinner(game)
	winner := -1
	winningTeam := -1
	dominance := 0.0
	tileCount := len(game.Board.Tiles)

	if len(winners) == 1 {
		winner = winners[0]
		winningTeam = game.Players[winner].TeamID
		dominance = float64(game.Players[winner].Score) / float64(tileCount)
	} else if len(winners) > 1 {
		// Just take the first one for simplicity, or handle draw
	}

	return gameResult{winner: winner, winningTeam: winningTeam, turns: game.TurnNumber, dominance: dominance, tileCount: tileCount}
}

func findStartTilesByPosition(board *core.Board, playerCount int, pos string) []int {
	if pos == "corners" {
		return core.FindFairStartTileIds(board, playerCount)
	}

	minX, maxX, minY, maxY := math.MaxFloat64, -math.MaxFloat64, math.MaxFloat64, -math.MaxFloat64
	for _, t := range board.Tiles {
		for _, p := range t.Points {
			if p[0] < minX { minX = p[0] }
			if p[0] > maxX { maxX = p[0] }
			if p[1] < minY { minY = p[1] }
			if p[1] > maxY { maxY = p[1] }
		}
	}

	centerX, centerY := (minX+maxX)/2, (minY+maxY)/2

	// Find tile closest to center
	centerTileID := -1
	minDist := math.MaxFloat64
	for i, t := range board.Tiles {
		var cx, cy float64
		for _, p := range t.Points {
			cx += p[0]
			cy += p[1]
		}
		cx /= float64(len(t.Points))
		cy /= float64(len(t.Points))

		dist := math.Pow(cx-centerX, 2) + math.Pow(cy-centerY, 2)
		if dist < minDist {
			minDist = dist
			centerTileID = i
		}
	}

	if pos == "center-clustered" {
		// Find neighbors of center tile to cluster players
		selected := []int{centerTileID}
		queue := []int{centerTileID}
		visited := map[int]bool{centerTileID: true}

		for len(selected) < playerCount && len(queue) > 0 {
			curr := queue[0]
			queue = queue[1:]

			for _, neighborID := range board.Tiles[curr].Neighbors {
				if !visited[neighborID] {
					visited[neighborID] = true
					selected = append(selected, neighborID)
					queue = append(queue, neighborID)
					if len(selected) == playerCount {
						break
					}
				}
			}
		}
		return selected
	}

	if pos == "center-distributed" {
		// Find tiles at a moderate distance from center in different directions
		// For simplicity, let's just use BFS to find tiles a bit further out
		selected := []int{centerTileID}

		// Find tiles at distance D from center
		distances := computeDistances(board, centerTileID)

		// target distance should be enough to gap players but not send them to corners
		// maybe 1/4 of the board diameter
		maxD := 0
		for _, d := range distances {
			if d > maxD { maxD = d }
		}
		targetD := maxD / 4
		if targetD < 2 { targetD = 2 }

		var candidates []int
		for id, d := range distances {
			if d == targetD {
				candidates = append(candidates, id)
			}
		}

		if len(candidates) >= playerCount-1 {
			// Pick candidates that are far from each other
			for len(selected) < playerCount {
				bestC := -1
				maxMinD := -1
				for _, c := range candidates {
					alreadySelected := false
					for _, s := range selected {
						if s == c { alreadySelected = true; break }
					}
					if alreadySelected { continue }

					minD := 1000000
					for _, s := range selected {
						// we need distances between candidates, but let's just use coordinate distance for speed
						d := distBetweenTiles(board, c, s)
						if d < minD { minD = d }
					}
					if minD > maxMinD {
						maxMinD = minD
						bestC = c
					}
				}
				if bestC != -1 {
					selected = append(selected, bestC)
				} else {
					break
				}
			}
		}
		return selected
	}

	return core.FindFairStartTileIds(board, playerCount)
}

func distBetweenTiles(board *core.Board, t1, t2 int) int {
	// Simple BFS distance
	dMap := computeDistances(board, t1)
	return dMap[t2]
}

func computeDistances(board *core.Board, startID int) map[int]int {
	distances := make(map[int]int)
	distances[startID] = 0
	queue := []int{startID}

	for len(queue) > 0 {
		id := queue[0]
		queue = queue[1:]
		d := distances[id]

		for _, neighborID := range board.Tiles[id].Neighbors {
			if _, ok := distances[neighborID]; !ok {
				distances[neighborID] = d + 1
				queue = append(queue, neighborID)
			}
		}
	}
	return distances
}

func runFairnessAnalysis(batchCount int, cfg studyConfig, startTiles string) {
	botNames := strings.Split(cfg.botTypes, ",")
	playerCount := len(botNames)

	var fixedStartTiles []int
	if startTiles != "" {
		for _, s := range strings.Split(startTiles, ",") {
			id, err := strconv.Atoi(s)
			if err == nil {
				fixedStartTiles = append(fixedStartTiles, id)
			}
		}
	}

	fmt.Printf("Starting fairness analysis of %d batches on %dx%d %s board\n", batchCount, cfg.cols, cfg.rows, cfg.boardType)
	fmt.Printf("Bots: %s\n", cfg.botTypes)

	perms := generatePermutations(playerCount)

	playerWins := make(map[int]int)
	positionWins := make(map[int]int)
	totalGames := 0

	results := performFairnessBatch(batchCount, cfg, fixedStartTiles, perms)

	for res := range results {
		if res.winnerPlayerIndex != -1 {
			playerWins[res.winnerPlayerIndex]++
			positionWins[res.winnerPositionIndex]++
		}
		totalGames++
	}

	fmt.Printf("\nTotal games: %d (%d batches of %d permutations)\n", totalGames, batchCount, len(perms))

	fmt.Println("\nWin rates by Turn Order (Player Index):")
	for i := 0; i < playerCount; i++ {
		wins := playerWins[i]
		fmt.Printf("  Player %d: %d (%.1f%%)\n", i, wins, float64(wins)/float64(totalGames)*100)
	}

	fmt.Println("\nWin rates by Spatial Position:")
	for i := 0; i < playerCount; i++ {
		wins := positionWins[i]
		fmt.Printf("  Position %d: %d (%.1f%%)\n", i, wins, float64(wins)/float64(totalGames)*100)
	}
}

type fairnessGameResult struct {
	winnerPlayerIndex   int
	winnerPositionIndex int
}

func performFairnessBatch(batchCount int, cfg studyConfig, fixedStartTiles []int, perms [][]int) chan fairnessGameResult {
	botNames := strings.Split(cfg.botTypes, ",")
	playerCount := len(botNames)
	totalGamesToRun := batchCount * len(perms)
	results := make(chan fairnessGameResult, totalGamesToRun)
	var wg sync.WaitGroup

	for i := 0; i < cfg.concurrency; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			workerRNG := core.CreateRNG(uint32(cfg.seed) + uint32(workerID))

			batchesPerWorker := batchCount / cfg.concurrency
			if workerID < batchCount%cfg.concurrency {
				batchesPerWorker++
			}

			for b := 0; b < batchesPerWorker; b++ {
				opts := tilings.Options{
					Cols:       cfg.cols,
					Rows:       cfg.rows,
					TileSize:   10,
					ColorCount: cfg.colorCount,
					RNG:        workerRNG,
				}
				baseBoard := generateBaseBoard(cfg.boardType, opts)

				var startTileIDs []int
				if len(fixedStartTiles) > 0 {
					startTileIDs = fixedStartTiles
				} else if cfg.startPos != "corners" {
					startTileIDs = findStartTilesByPosition(&baseBoard, playerCount, cfg.startPos)
				} else {
					startTileIDs = core.FindFairStartTileIds(&baseBoard, playerCount)
				}

				for _, perm := range perms {
					permutedStartTiles := make([]int, playerCount)
					for i, posIdx := range perm {
						permutedStartTiles[i] = startTileIDs[posIdx]
					}

					boardCopy := copyBoard(baseBoard)
					boardCopy.StartTileIds = permutedStartTiles

					res := runGameOnBoard(boardCopy, botNames, cfg, workerRNG)

					winnerPos := -1
					if res.winner != -1 {
						winnerPos = perm[res.winner]
					}

					results <- fairnessGameResult{
						winnerPlayerIndex:   res.winner,
						winnerPositionIndex: winnerPos,
					}
				}
			}
		}(i)
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	return results
}

func generateBaseBoard(boardType string, opts tilings.Options) core.Board {
	switch boardType {
	case "square":
		return tilings.GenerateSquareBoard(opts)
	case "triangle":
		return tilings.GenerateTriangleBoard(opts)
	case "hex":
		return tilings.GenerateHexBoard(opts)
	case "pentagon-cairo":
		return tilings.GenerateCairoPentagonBoard(opts)
	case "rhombitrihexagonal":
		return tilings.GenerateRhombitrihexagonalBoard(opts)
	case "voronoi-jittered":
		return tilings.GenerateVoronoiBoard(opts, "jittered")
	case "voronoi-random":
		return tilings.GenerateVoronoiBoard(opts, "random")
	default:
		return tilings.GenerateSquareBoard(opts)
	}
}

func runFairnessSearch(batchCount int, cfg studyConfig) {
	botNames := strings.Split(cfg.botTypes, ",")
	playerCount := len(botNames)

	fmt.Printf("Starting fairness search on %dx%d %s board\n", cfg.cols, cfg.rows, cfg.boardType)
	fmt.Printf("Bots: %s\n", cfg.botTypes)

	// 1. Generate a sample board to find candidate tiles
	sampleOpts := tilings.Options{
		Cols:       cfg.cols,
		Rows:       cfg.rows,
		TileSize:   10,
		ColorCount: cfg.colorCount,
		RNG:        core.CreateRNG(uint32(cfg.seed)),
	}
	sampleBoard := generateBaseBoard(cfg.boardType, sampleOpts)
	candidates := findCandidateTiles(&sampleBoard)
	fmt.Printf("Found %d candidate tiles\n", len(candidates))

	combinations := generateCombinations(candidates, playerCount)
	fmt.Printf("Evaluating %d combinations...\n", len(combinations))

	perms := generatePermutations(playerCount)

	type comboResult struct {
		tiles    []int
		fairness float64
		winRates []float64
	}

	var results []comboResult
	var mu sync.Mutex

	// We use a smaller number of batches for the search phase
	searchBatchCount := batchCount

	var wg sync.WaitGroup
	comboChan := make(chan []int, len(combinations))
	for _, combo := range combinations {
		comboChan <- combo
	}
	close(comboChan)

	for i := 0; i < cfg.concurrency; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for combo := range comboChan {
				resChan := performFairnessBatch(searchBatchCount, cfg, combo, perms)

				positionWins := make(map[int]int)
				totalGames := 0
				for res := range resChan {
					if res.winnerPositionIndex != -1 {
						positionWins[res.winnerPositionIndex]++
					}
					totalGames++
				}

				winRates := make([]float64, playerCount)
				minWR := 1.0
				maxWR := 0.0
				for j := 0; j < playerCount; j++ {
					wr := float64(positionWins[j]) / float64(totalGames)
					winRates[j] = wr
					if wr < minWR { minWR = wr }
					if wr > maxWR { maxWR = wr }
				}

				fairness := maxWR - minWR

				mu.Lock()
				results = append(results, comboResult{
					tiles:    combo,
					fairness: fairness,
					winRates: winRates,
				})
				mu.Unlock()
			}
		}(i)
	}

	wg.Wait()

	sort.Slice(results, func(i, j int) bool {
		return results[i].fairness < results[j].fairness
	})

	fmt.Println("\nTop 10 Fairest Combinations:")
	for i := 0; i < 10 && i < len(results); i++ {
		res := results[i]
		fmt.Printf("%d. Tiles %v, Fairness: %.4f, Win Rates: ", i+1, res.tiles, res.fairness)
		for _, wr := range res.winRates {
			fmt.Printf("%.1f%% ", wr*100)
		}
		fmt.Println()
	}
}

func findCandidateTiles(board *core.Board) []int {
	minX, maxX, minY, maxY := math.MaxFloat64, -math.MaxFloat64, math.MaxFloat64, -math.MaxFloat64
	for _, t := range board.Tiles {
		for _, p := range t.Points {
			if p[0] < minX { minX = p[0] }
			if p[0] > maxX { maxX = p[0] }
			if p[1] < minY { minY = p[1] }
			if p[1] > maxY { maxY = p[1] }
		}
	}

	targets := []core.Point{
		{minX, minY}, {maxX, minY}, {minX, maxY}, {maxX, maxY}, // Corners
		{(minX + maxX) / 2, minY}, {(minX + maxX) / 2, maxY},   // Top/Bottom mid
		{minX, (minY + maxY) / 2}, {maxX, (minY + maxY) / 2},   // Left/Right mid
		{(minX + maxX) / 2, (minY + maxY) / 2},                 // Center
	}

	candidateSet := make(map[int]bool)
	for _, target := range targets {
		bestID := -1
		minDist := math.MaxFloat64
		for i, t := range board.Tiles {
			var cx, cy float64
			for _, p := range t.Points {
				cx += p[0]
				cy += p[1]
			}
			cx /= float64(len(t.Points))
			cy /= float64(len(t.Points))

			dist := math.Sqrt(math.Pow(cx-target[0], 2) + math.Pow(cy-target[1], 2))
			if dist < minDist {
				minDist = dist
				bestID = i
			}
		}
		candidateSet[bestID] = true
	}

	var candidates []int
	for id := range candidateSet {
		candidates = append(candidates, id)
	}
	return candidates
}

func generateCombinations(arr []int, k int) [][]int {
	var res [][]int
	var helper func(int, []int)
	helper = func(start int, current []int) {
		if len(current) == k {
			tmp := make([]int, k)
			copy(tmp, current)
			res = append(res, tmp)
			return
		}
		for i := start; i < len(arr); i++ {
			helper(i+1, append(current, arr[i]))
		}
	}
	helper(0, []int{})
	return res
}

func generatePermutations(n int) [][]int {
	var helper func([]int, int)
	res := [][]int{}

	helper = func(arr []int, k int) {
		if k == 1 {
			tmp := make([]int, len(arr))
			copy(tmp, arr)
			res = append(res, tmp)
		} else {
			for i := 0; i < k; i++ {
				helper(arr, k-1)
				if k%2 == 1 {
					arr[0], arr[k-1] = arr[k-1], arr[0]
				} else {
					arr[i], arr[k-1] = arr[k-1], arr[i]
				}
			}
		}
	}

	arr := make([]int, n)
	for i := 0; i < n; i++ {
		arr[i] = i
	}
	helper(arr, n)
	return res
}

func copyBoard(b core.Board) core.Board {
	newBoard := b
	newBoard.Tiles = make([]core.Tile, len(b.Tiles))
	for i := range b.Tiles {
		newBoard.Tiles[i] = b.Tiles[i]
		newBoard.Tiles[i].Neighbors = make([]int, len(b.Tiles[i].Neighbors))
		copy(newBoard.Tiles[i].Neighbors, b.Tiles[i].Neighbors)
		newBoard.Tiles[i].Points = make([]core.Point, len(b.Tiles[i].Points))
		copy(newBoard.Tiles[i].Points, b.Tiles[i].Points)
		// Ensure OwnerID is nil for the copy
		newBoard.Tiles[i].OwnerID = nil
	}
	return newBoard
}

func runGameOnBoard(board core.Board, botNames []string, cfg studyConfig, rng core.RNG) gameResult {
	playerCount := len(botNames)
	players := make([]core.Player, playerCount)
	playerBots := make([]bots.Bot, playerCount)

	teamIDs := make([]int, playerCount)
	if cfg.teams != "" {
		for i, tidStr := range strings.Split(cfg.teams, ",") {
			if i < playerCount {
				tid, _ := strconv.Atoi(tidStr)
				teamIDs[i] = tid
			}
		}
	} else {
		for i := 0; i < playerCount; i++ {
			teamIDs[i] = i
		}
	}

	maxTeamID := 0
	for _, tid := range teamIDs {
		if tid > maxTeamID {
			maxTeamID = tid
		}
	}
	teams := make([]core.Team, maxTeamID+1)
	for i := range teams {
		teams[i] = core.Team{ID: i}
	}

	for i := 0; i < playerCount; i++ {
		players[i] = core.Player{ID: i, Alive: true, TeamID: teamIDs[i]}

		switch botNames[i] {
		case "random":
			playerBots[i] = &bots.RandomBot{RNG: rng}
		case "greedy":
			playerBots[i] = &bots.GreedyBot{}
		case "aggressive":
			playerBots[i] = &bots.AggressiveBot{}
		case "lookahead":
			playerBots[i] = &bots.LookaheadBot{}
		case "hybrid":
			playerBots[i] = &bots.HybridBot{}
		default:
			playerBots[i] = &bots.RandomBot{RNG: rng}
		}
	}

	rules := core.DefaultRules()
	rules.TeamTerritory = cfg.teamTerritory
	rules.StartingAreaSize = cfg.startAreaSize
	rules.StartingAreaBuffer = cfg.startAreaBuffer

	game := core.CreateGame(core.Config{
		Board:      board,
		Players:    players,
		Teams:      teams,
		ColorCount: cfg.colorCount,
		Rules:      rules,
	})

	for game.Status == "playing" {
		pID := game.CurrentPlayerID
		move := playerBots[pID].GetMove(game, pID)
		core.ApplyMove(game, pID, move)
	}

	winners := core.GetWinner(game)
	winner := -1
	winningTeam := -1
	dominance := 0.0
	tileCount := len(game.Board.Tiles)

	if len(winners) == 1 {
		winner = winners[0]
		winningTeam = game.Players[winner].TeamID
		dominance = float64(game.Players[winner].Score) / float64(tileCount)
	}

	return gameResult{winner: winner, winningTeam: winningTeam, turns: game.TurnNumber, dominance: dominance, tileCount: tileCount}
}
