package main

import (
	"flag"
	"fmt"
	"go-flood/pkg/bots"
	"go-flood/pkg/core"
	"go-flood/pkg/tilings"
	"strings"
	"sync"
	"time"
)

func main() {
	gameCount := flag.Int("games", 100, "Number of games to simulate")
	boardTypeFlag := flag.String("board", "square", "Board type (square, triangle, hex, rhombitrihexagonal, pentagon-cairo, voronoi-jittered, voronoi-random)")
	colsFlag := flag.Int("cols", 20, "Number of columns")
	rowsFlag := flag.Int("rows", 20, "Number of rows")
	colorCountFlag := flag.Int("colors", 6, "Number of colors")
	concurrency := flag.Int("concurrency", 8, "Number of concurrent simulations")
	botTypesFlag := flag.String("bots", "greedy,random", "Comma-separated list of bot types for players")
	seed := flag.Uint("seed", uint(time.Now().UnixNano()), "Initial seed for the simulation")

	flag.Parse()

	fmt.Printf("Starting simulation of %d games on %dx%d %s board with %d colors\n", *gameCount, *colsFlag, *rowsFlag, *boardTypeFlag, *colorCountFlag)
	fmt.Printf("Bots: %s\n", *botTypesFlag)

	botNames := strings.Split(*botTypesFlag, ",")

	results := make(chan gameResult, *gameCount)
	var wg sync.WaitGroup

	startTime := time.Now()

	for i := 0; i < *concurrency; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			workerRNG := core.CreateRNG(uint32(*seed) + uint32(workerID))

			gamesPerWorker := (*gameCount) / (*concurrency)
			if workerID < (*gameCount)%(*concurrency) {
				gamesPerWorker++
			}

			for g := 0; g < gamesPerWorker; g++ {
				res := runSingleGame(*boardTypeFlag, *colsFlag, *rowsFlag, *colorCountFlag, botNames, workerRNG)
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

	// Ensure all players are listed even if 0 wins
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

func runSingleGame(boardType string, cols, rows, colorCount int, botNames []string, rng core.RNG) gameResult {
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

	// Ensure enough start tile IDs
	if len(board.StartTileIds) < playerCount {
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
