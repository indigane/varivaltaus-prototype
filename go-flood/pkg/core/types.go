package core

type Point [2]float64

type Tile struct {
	ID        int      `json:"id"`
	ColorID   int      `json:"colorId"`
	OwnerID   *int     `json:"ownerId"`
	Points    []Point  `json:"points"`
	Neighbors []int    `json:"neighbors"`
}

type Board struct {
	Version      int     `json:"version"`
	Generator    string  `json:"generator"`
	Width        float64 `json:"width"`
	Height       float64 `json:"height"`
	Cols         int     `json:"cols"`
	Rows         int     `json:"rows"`
	Tiles        []Tile  `json:"tiles"`
	StartTileIds []int   `json:"startTileIds"`
}

type Player struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
	TeamID int   `json:"teamId"`
	Bot    string `json:"bot"` // "random", "greedy", etc.
	Alive  bool   `json:"alive"`
	Score  int    `json:"score"`
}

type Team struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Score int    `json:"score"`
}

type MoveLogEntry struct {
	Turn            int           `json:"turn"`
	PlayerID        int           `json:"playerId"`
	ColorID         int           `json:"colorId"`
	CapturedTileIds []int         `json:"capturedTileIds"`
	ScoresAfter     ScoresSummary `json:"scoresAfter"`
}

type ScoresSummary struct {
	Players []int `json:"players"`
	Teams   []int `json:"teams"`
}

type GameState struct {
	Version         int            `json:"version"`
	Board           Board          `json:"board"`
	Players         []Player       `json:"players"`
	Teams           []Team         `json:"teams"`
	CurrentPlayerID int            `json:"currentPlayerId"`
	ColorCount      int            `json:"colorCount"`
	PaletteID       string         `json:"paletteId"`
	Rules           Rules          `json:"rules"`
	TurnNumber      int            `json:"turnNumber"`
	RNGSeed         uint32         `json:"rngSeed"`
	MoveLog         []MoveLogEntry `json:"moveLog"`
	Status          string         `json:"status"` // "playing", "finished"
}
