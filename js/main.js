import { createRNG } from './core/rng.js';
import { generateSquareBoard } from './tilings/square.js';
import { generateTriangleBoard } from './tilings/triangle.js';
import { generateHexBoard } from './tilings/hex.js';
import { generateCairoPentagonBoard } from './tilings/pentagon.js';
import { applyMask, circularMask } from './tilings/masks.js';
import { findFairStartTileIds } from './core/fair-starts.js';
import { createGame, applyMove } from './core/game.js';
import { CanvasRenderer } from './ui/canvas-renderer.js';
import { setupUI, updateStats, getPlayerConfigs } from './ui/input.js';

import { getMove as getRandomMove } from './bots/random.js';
import { getMove as getGreedyMove } from './bots/greedy.js';
import { getMove as getAggressiveMove } from './bots/aggressive.js';
import { getMove as getLookaheadMove } from './bots/lookahead.js';
import { getMove as getHybridMove } from './bots/hybrid.js';

let gameState = null;
let renderer = null;
let isPlaying = false;
let autoplayTimeout = null;

const BOTS = {
    random: getRandomMove,
    greedy: getGreedyMove,
    aggressive: getAggressiveMove,
    lookahead: getLookaheadMove,
    hybrid: getHybridMove
};

function init() {
    renderer = new CanvasRenderer('game-canvas');
    setupUI(null, handleColorSelect, handleReset, handleStep, handleTogglePlay);

    document.getElementById('start-button').onclick = handleStart;
}

function handleStart() {
    const boardType = document.getElementById('board-type').value;
    const boardShape = document.getElementById('board-shape').value;
    const cols = parseInt(document.getElementById('board-cols').value);
    const rows = parseInt(document.getElementById('board-rows').value);
    const tileSize = parseInt(document.getElementById('tile-size').value);
    const colorCount = parseInt(document.getElementById('color-count').value);
    const colorRestrictions = document.getElementById('color-restrictions').value;
    const teamTerritory = document.getElementById('team-territory').value;
    const startingAreaSize = parseInt(document.getElementById('starting-area-size').value);
    const startingAreaBuffer = document.getElementById('starting-area-buffer').checked;
    const allowSameStartingColor = document.getElementById('allow-same-starting-color').checked;

    const seed = Math.floor(Math.random() * 1000000);
    const rng = createRNG(seed);

    let board;
    const commonOptions = { colorCount, rng };

    if (boardType === 'square') {
        board = generateSquareBoard({ ...commonOptions, cols, rows, tileSize });
    } else if (boardType === 'triangle') {
        // Adjust columns for triangles to roughly match square aspect ratio
        const adjCols = boardShape === 'triangular' ? cols : Math.floor(cols * 1.5);
        board = generateTriangleBoard({ ...commonOptions, cols: adjCols, rows, tileSize: tileSize * 1.2, shape: boardShape === 'triangular' ? 'triangular' : 'rectangular' });
    } else if (boardType === 'hex') {
        board = generateHexBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.6, shape: boardShape === 'hexagonal' ? 'hexagonal' : 'rectangular' });
    } else if (boardType === 'pentagon-cairo') {
        board = generateCairoPentagonBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 1.5 });
    }

    if (boardShape === 'circular') {
        const cx = board.width / 2;
        const cy = board.height / 2;
        const radius = Math.min(board.width, board.height) * 0.4;
        board = applyMask(board, circularMask(cx, cy, radius));
    }

    const configs = getPlayerConfigs();
    board.startTileIds = findFairStartTileIds(board, configs.length);

    const players = configs.map((c, i) => ({
        id: i,
        name: c.name,
        teamId: c.teamId,
        control: c.control,
        alive: true,
        score: 0
    }));

    const teamIds = [...new Set(players.map(p => p.teamId))];
    const teams = teamIds.map(id => ({
        id: id,
        name: `Team ${id}`,
        playerIds: players.filter(p => p.teamId === id).map(p => p.id),
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
            teamTerritory,
            captureMode: "neutralOnly",
            colorRestrictions,
            startingPositions: "corners",
            maxTurns: 500,
            startingAreaSize,
            startingAreaBuffer,
            allowSameStartingColor
        }
    });

    setupUI(gameState, handleColorSelect, handleReset, handleStep, handleTogglePlay);
    renderer.render(gameState);

    if (isPlaying) {
        startAutoplay();
    } else {
        checkBotTurn();
    }
}

function handleColorSelect(colorId) {
    const result = applyMove(gameState, gameState.currentPlayerId, colorId);
    if (!result.error) {
        gameState = result.state;
        afterMove();
    }
}

function afterMove() {
    updateStats(gameState);
    setupUI(gameState, handleColorSelect, handleReset, handleStep, handleTogglePlay);
    renderer.render(gameState);

    if (gameState.status === 'finished') {
        stopAutoplay();
        isPlaying = false;
        const btn = document.getElementById('play-pause-button');
        if (btn) btn.textContent = 'Play';
    } else if (isPlaying) {
        startAutoplay();
    } else {
        checkBotTurn();
    }
}

function checkBotTurn() {
    if (gameState && gameState.status === 'playing') {
        const currentPlayer = gameState.players[gameState.currentPlayerId];
        if (currentPlayer.control !== 'human') {
            // Even if not "playing" (autoplay), we might want a small delay for bots
            // But if autoplay is off, we wait for a manual "Step" or "Play"
        }
    }
}

function handleStep() {
    if (!gameState || gameState.status !== 'playing') return;

    const currentPlayer = gameState.players[gameState.currentPlayerId];
    if (currentPlayer.control === 'human') {
        // Human must click a color button
        return;
    }

    const botFn = BOTS[currentPlayer.control];
    if (botFn) {
        const colorId = botFn(gameState, gameState.currentPlayerId);
        if (colorId !== null) {
            handleColorSelect(colorId);
        }
    }
}

function handleTogglePlay() {
    isPlaying = !isPlaying;
    const btn = document.getElementById('play-pause-button');
    btn.textContent = isPlaying ? 'Pause' : 'Play';

    if (isPlaying) {
        startAutoplay();
    } else {
        stopAutoplay();
    }
}

function startAutoplay() {
    stopAutoplay();
    if (!gameState || gameState.status !== 'playing') return;

    const currentPlayer = gameState.players[gameState.currentPlayerId];
    if (currentPlayer.control === 'human') {
        // Wait for human input; don't disable autoplay
        return;
    }

    const speed = 1000 - parseInt(document.getElementById('speed-slider').value);
    autoplayTimeout = setTimeout(() => {
        handleStep();
    }, speed);
}

function stopAutoplay() {
    if (autoplayTimeout) {
        clearTimeout(autoplayTimeout);
        autoplayTimeout = null;
    }
}

function handleReset() {
    stopAutoplay();
    isPlaying = false;
    const btn = document.getElementById('play-pause-button');
    if (btn) btn.textContent = 'Play';
    gameState = null;
    setupUI(null, handleColorSelect, handleReset, handleStep, handleTogglePlay);
    renderer.clear();
}

window.addEventListener('load', init);
window.addEventListener('resize', () => {
    if (gameState && renderer) {
        renderer.render(gameState);
    }
});
