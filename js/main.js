import { createRNG } from './core/rng.js';
import { generateSquareBoard } from './tilings/square.js';
import { createGame, applyMove } from './core/game.js';
import { CanvasRenderer } from './ui/canvas-renderer.js';
import { setupUI, updateStats } from './ui/input.js';

let gameState = null;
let renderer = null;

function init() {
    renderer = new CanvasRenderer('game-canvas');
    setupUI(null, handleColorSelect, handleReset);

    document.getElementById('start-button').onclick = handleStart;
}

function handleStart() {
    const playerCount = parseInt(document.getElementById('player-count').value);
    const colorCount = parseInt(document.getElementById('color-count').value);
    const colorRestrictions = document.getElementById('color-restrictions').value;

    const seed = Math.floor(Math.random() * 1000000);
    const rng = createRNG(seed);

    const board = generateSquareBoard({
        cols: 14,
        rows: 14,
        tileSize: 30,
        colorCount,
        rng
    });

    const players = [];
    for (let i = 0; i < playerCount; i++) {
        players.push({
            id: i,
            name: `Player ${i + 1}`,
            teamId: i,
            control: "human",
            alive: true,
            score: 0
        });
    }

    const teams = players.map(p => ({
        id: p.id,
        name: `Team ${p.id + 1}`,
        playerIds: [p.id],
        score: 0
    }));

    gameState = createGame({
        board,
        players,
        teams,
        colorCount,
        paletteId: colorCount <= 6 ? "default-6" : "default-10",
        rngSeed: seed,
        rules: {
            winCondition: "mostTiles",
            turnOrder: "players",
            teamTerritory: "separatePlayers",
            captureMode: "neutralOnly",
            colorRestrictions,
            startingPositions: "corners",
            maxTurns: 100
        }
    });

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
    gameState = null;
    setupUI(null, handleColorSelect, handleReset);
    renderer.clear();
}

window.addEventListener('load', init);
window.addEventListener('resize', () => {
    if (gameState && renderer) {
        renderer.render(gameState);
    }
});
