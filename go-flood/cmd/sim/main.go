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

	flag.Parse()

	switch *mode {
	case "fairness":
		runFairnessAnalysis(*gameCount, *boardTypeFlag, *colsFlag, *rowsFlag, *colorCountFlag, *botTypesFlag, *seed, *concurrency, *startTilesFlag)
	case "search":
		runFairnessSearch(*gameCount, *boardTypeFlag, *colsFlag, *rowsFlag, *colorCountFlag, *botTypesFlag, *seed, *concurrency)
	default:
		runSimulation(*gameCount, *boardTypeFlag, *colsFlag, *rowsFlag, *colorCountFlag, *botTypesFlag, *seed, *concurrency)
	}
}

func runSimulation(gameCount int, boardType string, cols, rows, colorCount int, botTypes string, seed uint, concurrency int) {
	fmt.Printf("Starting simulation of %d games on %dx%d %s board with %d colors\n", gameCount, cols, rows, boardType, colorCount)
	fmt.Printf("Bots: %s\n", botTypes)

	botNames := strings.Split(botTypes, ",")

	results := make(chan gameResult, gameCount)
	var wg sync.WaitGroup

	startTime := time.Now()

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			workerRNG := core.CreateRNG(uint32(seed) + uint32(workerID))

			gamesPerWorker := (gameCount) / (concurrency)
			if workerID < (gameCount)%concurrency {
				gamesPerWorker++
			}

			for g := 0; g < gamesPerWorker; g++ {
				res := runSingleGame(boardType, cols, rows, colorCount, botNames, workerRNG, nil)
				results <- res
			}
		}(i)
	}

	go func() {
		wg.Wait()
		close(results)
	}()

	winCounts := make(map[int]int)
	totalTurns := 0
	totalGames := 0
	for res := range results {
		winCounts[res.winner]++
		totalTurns += res.turns
		totalGames++
	}

	duration := time.Since(startTime)
	fmt.Printf("\nSimulation finished in %v (%.2f games/sec)\n", duration, float64(totalGames)/duration.Seconds())
	fmt.Printf("Average turns: %.2f\n", float64(totalTurns)/float64(totalGames))
	fmt.Println("Results:")

	for i := 0; i < len(botNames); i++ {
		wins := winCounts[i]
		fmt.Printf("  Player %d (%s): %d (%.1f%%)\n", i, botNames[i], wins, float64(wins)/float64(totalGames)*100)
	}
	if winCounts[-1] > 0 {
		fmt.Printf("  Draw: %d (%.1f%%)\n", winCounts[-1], float64(winCounts[-1])/float64(totalGames)*100)
	}
}

type gameResult struct {
	winner int
	turns  int
}

func runSingleGame(boardType string, cols, rows, colorCount int, botNames []string, rng core.RNG, overrideStartTiles []int) gameResult {
	opts := tilings.Options{
		Cols:       cols,
		Rows:       rows,
		TileSize:   10,
		ColorCount: colorCount,
		RNG:        rng,
	}

	var board core.Board
	switch boardType {
	case "square":
		board = tilings.GenerateSquareBoard(opts)
	case "triangle":
		board = tilings.GenerateTriangleBoard(opts)
	case "hex":
		board = tilings.GenerateHexBoard(opts)
	case "pentagon-cairo":
		board = tilings.GenerateCairoPentagonBoard(opts)
	case "rhombitrihexagonal":
		board = tilings.GenerateRhombitrihexagonalBoard(opts)
	case "voronoi-jittered":
		board = tilings.GenerateVoronoiBoard(opts, "jittered")
	case "voronoi-random":
		board = tilings.GenerateVoronoiBoard(opts, "random")
	default:
		board = tilings.GenerateSquareBoard(opts)
	}

	playerCount := len(botNames)

	if len(overrideStartTiles) > 0 {
		board.StartTileIds = overrideStartTiles
	} else if len(board.StartTileIds) < playerCount {
		board.StartTileIds = core.FindFairStartTileIds(&board, playerCount)
	}

	players := make([]core.Player, playerCount)
	teams := make([]core.Team, playerCount)
	playerBots := make([]bots.Bot, playerCount)

	for i := 0; i < playerCount; i++ {
		players[i] = core.Player{ID: i, Alive: true, TeamID: i}
		teams[i] = core.Team{ID: i}

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

	game := core.CreateGame(core.Config{
		Board:      board,
		Players:    players,
		Teams:      teams,
		ColorCount: colorCount,
		Rules:      core.DefaultRules(),
	})

	for game.Status == "playing" {
		pID := game.CurrentPlayerID
		move := playerBots[pID].GetMove(game, pID)
		core.ApplyMove(game, pID, move)
	}

	winners := core.GetWinner(game)
	winner := -1
	if len(winners) == 1 {
		winner = winners[0]
	}

	return gameResult{winner: winner, turns: game.TurnNumber}
}

func runFairnessAnalysis(batchCount int, boardType string, cols, rows, colorCount int, botTypes string, seed uint, concurrency int, startTiles string) {
	botNames := strings.Split(botTypes, ",")
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

	fmt.Printf("Starting fairness analysis of %d batches on %dx%d %s board\n", batchCount, cols, rows, boardType)
	fmt.Printf("Bots: %s\n", botTypes)

	perms := generatePermutations(playerCount)

	playerWins := make(map[int]int)
	positionWins := make(map[int]int)
	totalGames := 0

	results := performFairnessBatch(batchCount, boardType, cols, rows, colorCount, botNames, fixedStartTiles, seed, concurrency, perms)

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

func performFairnessBatch(batchCount int, boardType string, cols, rows, colorCount int, botNames []string, fixedStartTiles []int, seed uint, concurrency int, perms [][]int) chan fairnessGameResult {
	playerCount := len(botNames)
	totalGamesToRun := batchCount * len(perms)
	results := make(chan fairnessGameResult, totalGamesToRun)
	var wg sync.WaitGroup

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			workerRNG := core.CreateRNG(uint32(seed) + uint32(workerID))

			batchesPerWorker := batchCount / concurrency
			if workerID < batchCount%concurrency {
				batchesPerWorker++
			}

			for b := 0; b < batchesPerWorker; b++ {
				opts := tilings.Options{
					Cols:       cols,
					Rows:       rows,
					TileSize:   10,
					ColorCount: colorCount,
					RNG:        workerRNG,
				}
				baseBoard := generateBaseBoard(boardType, opts)

				var startTileIDs []int
				if len(fixedStartTiles) > 0 {
					startTileIDs = fixedStartTiles
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

					res := runGameOnBoard(boardCopy, botNames, colorCount, workerRNG)

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

func runFairnessSearch(batchCount int, boardType string, cols, rows, colorCount int, botTypes string, seed uint, concurrency int) {
	botNames := strings.Split(botTypes, ",")
	playerCount := len(botNames)

	fmt.Printf("Starting fairness search on %dx%d %s board\n", cols, rows, boardType)
	fmt.Printf("Bots: %s\n", botTypes)

	// 1. Generate a sample board to find candidate tiles
	sampleOpts := tilings.Options{
		Cols:       cols,
		Rows:       rows,
		TileSize:   10,
		ColorCount: colorCount,
		RNG:        core.CreateRNG(uint32(seed)),
	}
	sampleBoard := generateBaseBoard(boardType, sampleOpts)
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

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for combo := range comboChan {
				resChan := performFairnessBatch(searchBatchCount, boardType, cols, rows, colorCount, botNames, combo, seed+uint(workerID), 1, perms)

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

func runGameOnBoard(board core.Board, botNames []string, colorCount int, rng core.RNG) gameResult {
	playerCount := len(botNames)
	players := make([]core.Player, playerCount)
	teams := make([]core.Team, playerCount)
	playerBots := make([]bots.Bot, playerCount)

	for i := 0; i < playerCount; i++ {
		players[i] = core.Player{ID: i, Alive: true, TeamID: i}
		teams[i] = core.Team{ID: i}

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

	game := core.CreateGame(core.Config{
		Board:      board,
		Players:    players,
		Teams:      teams,
		ColorCount: colorCount,
		Rules:      core.DefaultRules(),
	})

	for game.Status == "playing" {
		pID := game.CurrentPlayerID
		move := playerBots[pID].GetMove(game, pID)
		core.ApplyMove(game, pID, move)
	}

	winners := core.GetWinner(game)
	winner := -1
	if len(winners) == 1 {
		winner = winners[0]
	}

	return gameResult{winner: winner, turns: game.TurnNumber}
}
