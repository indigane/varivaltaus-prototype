import { createRNG } from './core/rng.js';
import { generateSquareBoard } from './tilings/square.js';
import { createGame, applyMove } from './core/game.js';
import { CanvasRenderer } from './ui/canvas-renderer.js';
import { setupUI, updateStats } from './ui/input.js';

let gameState = null;
let renderer = null;

function init() {
    const seed = Math.floor(Math.random() * 1000000);
    const rng = createRNG(seed);
    const colorCount = 6;

    const board = generateSquareBoard({
        cols: 14,
        rows: 14,
        tileSize: 30,
        colorCount,
        rng
    });

    const players = [
        {
            id: 0,
            name: "Player 1",
            teamId: 0,
            control: "human",
            alive: true,
            score: 0
        }
    ];

    const teams = [
        {
            id: 0,
            name: "Team 1",
            playerIds: [0],
            score: 0
        }
    ];

    gameState = createGame({
        board,
        players,
        teams,
        colorCount,
        paletteId: "default-6",
        rngSeed: seed
    });

    renderer = new CanvasRenderer('game-canvas');

    setupUI(gameState, handleColorSelect, handleReset);
    renderer.render(gameState);
}

function handleColorSelect(colorId) {
    const result = applyMove(gameState, gameState.currentPlayerId, colorId);
    if (!result.error) {
        gameState = result.state;
        updateStats(gameState);
        setupUI(gameState, handleColorSelect, handleReset);
        renderer.render(gameState);
    }
}

function handleReset() {
    init();
}

window.addEventListener('load', init);
window.addEventListener('resize', () => {
    if (gameState && renderer) {
        renderer.render(gameState);
    }
});
