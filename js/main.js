import { createRNG } from './core/rng.js';
import { generateSquareBoard } from './tilings/square.js';
import { generateTriangleBoard } from './tilings/triangle.js';
import { generateHexBoard } from './tilings/hex.js';
import { generateTrihexagonalBoard } from './tilings/trihexagonal.js';
import { generateTruncatedHexagonalBoard } from './tilings/truncated-hexagonal.js';
import { generateGreatRhombitrihexagonalBoard } from './tilings/great-rhombitrihexagonal.js';
import { generateSnubSquareBoard } from './tilings/snub-square.js';
import { generateSnubTrihexagonalBoard } from './tilings/snub-trihexagonal.js';
import { generateElongatedTriangularBoard } from './tilings/elongated-triangular.js';
import { generateRhombitrihexagonalBoard } from './tilings/rhombitrihexagonal.js';
import { generateCairoPentagonBoard } from './tilings/pentagon.js';
import { generateOctagonalBoard } from './tilings/octagonal.js';
import { generateVoronoiBoard } from './tilings/voronoi.js';
import { applyMask, circularMask } from './tilings/masks.js';
import { findFairStartTileIds } from './core/fair-starts.js';
import { createGame, applyMove } from './core/game.js';
import { CanvasRenderer } from './ui/canvas-renderer.js';
import { setupUI, updateStats, getPlayerConfigs, setPlayerConfigs } from './ui/input.js';
import { saveSettings, loadSettings } from './ui/settings.js';

import { getMove as getRandomMove } from './bots/random.js';
import { getMove as getGreedyMove } from './bots/greedy.js';
import { getMove as getAggressiveMove } from './bots/aggressive.js';
import { getMove as getLookaheadMove } from './bots/lookahead.js';
import { getMove as getHybridMove } from './bots/hybrid.js';
import { getMove as getSpiteMove } from './bots/spite.js';

let gameState = null;
let renderer = null;
let isPlaying = false;
let autoplayTimeout = null;

const BOTS = {
    random: getRandomMove,
    greedy: getGreedyMove,
    aggressive: getAggressiveMove,
    lookahead: getLookaheadMove,
    hybrid: getHybridMove,
    spite: getSpiteMove
};

function init() {
    renderer = new CanvasRenderer('game-canvas');

    // Restore saved settings
    const savedPlayers = loadSettings();
    if (savedPlayers) setPlayerConfigs(savedPlayers);

    setupUI(null, handleColorSelect, handleReset, handleStep, handleTogglePlay);

    document.getElementById('start-button').onclick = handleStart;

    // Wire tile style selector
    const tsSel = document.getElementById('tile-style-selector');
    if (tsSel) {
        tsSel.onclick = (e) => {
            const btn = e.target.closest('.ts-btn');
            if (!btn) return;
            tsSel.querySelectorAll('.ts-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tile-style').value = btn.dataset.style;
            updateTileStyleOptions(btn.dataset.style);
        };
    }
}

function updateTileStyleOptions(style) {
    const embossOpts = document.getElementById('emboss-options');
    const gutterOpts = document.getElementById('gutter-options');
    if (embossOpts) embossOpts.hidden = (style !== 'embossed');
    if (gutterOpts) gutterOpts.hidden = (style !== 'rounded');
}

function handleStart() {
    const configs = getPlayerConfigs();
    saveSettings(configs);

    const boardType = document.getElementById('board-type').value;
    const boardShape = document.getElementById('board-shape').value;
    const cols = parseInt(document.getElementById('board-cols').value);
    const rows = parseInt(document.getElementById('board-rows').value);
    const tileSize = 25;
    const colorCount = parseInt(document.getElementById('color-count').value);
    const colorRestrictions = document.getElementById('color-restrictions').value;
    const turnOrder = document.getElementById('turn-order').value;
    const teamTerritory = document.getElementById('team-territory').value;
    const tileStyle = document.getElementById('tile-style').value;
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
        const adjCols = boardShape === 'triangular' ? cols : Math.floor(cols * 1.5);
        board = generateTriangleBoard({ ...commonOptions, cols: adjCols, rows, tileSize: tileSize * 1.2, shape: boardShape === 'triangular' ? 'triangular' : 'rectangular' });
    } else if (boardType === 'hex') {
        board = generateHexBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.6, shape: boardShape === 'hexagonal' ? 'hexagonal' : 'rectangular' });
    } else if (boardType === 'trihexagonal') {
        board = generateTrihexagonalBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.6 });
    } else if (boardType === 'truncated-hexagonal') {
        board = generateTruncatedHexagonalBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.4 });
    } else if (boardType === 'great-rhombitrihexagonal') {
        board = generateGreatRhombitrihexagonalBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.4 });
    } else if (boardType === 'snub-square') {
        board = generateSnubSquareBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.6 });
    } else if (boardType === 'snub-trihexagonal') {
        board = generateSnubTrihexagonalBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.5 });
    } else if (boardType === 'elongated-triangular') {
        board = generateElongatedTriangularBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.8 });
    } else if (boardType === 'rhombitrihexagonal') {
        board = generateRhombitrihexagonalBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.4 });
    } else if (boardType === 'pentagon-cairo') {
        board = generateCairoPentagonBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 1.5 });
    } else if (boardType === '4.8.8') {
        board = generateOctagonalBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.4 });
    } else if (boardType === 'voronoi-jittered') {
        board = generateVoronoiBoard({ ...commonOptions, cols, rows, tileSize, type: 'jittered' });
    } else if (boardType === 'voronoi-random') {
        board = generateVoronoiBoard({ ...commonOptions, cols, rows, tileSize, type: 'random' });
    }

    if (boardShape === 'circular') {
        const cx = board.width / 2;
        const cy = board.height / 2;
        const radius = Math.min(board.width, board.height) * 0.4;
        board = applyMask(board, circularMask(cx, cy, radius));
    }

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
            turnOrder,
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

    gameState.tileStyle = tileStyle;
    gameState.embossSize = parseFloat(document.getElementById('emboss-size').value);
    gameState.embossOpacity = parseInt(document.getElementById('emboss-opacity').value) / 100;
    gameState.gutterSize = parseInt(document.getElementById('gutter-size').value) / 100;

    setupUI(gameState, handleColorSelect, handleReset, handleStep, handleTogglePlay);
    renderer.render(gameState);

    const hasBots = configs.some(c => c.control !== 'human');
    if (hasBots) {
        isPlaying = true;
        const btn = document.getElementById('play-pause-button');
        if (btn) btn.textContent = '⏸';
    }

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
        if (btn) btn.textContent = '▶';
    } else if (isPlaying) {
        startAutoplay();
    } else {
        checkBotTurn();
    }
}

function checkBotTurn() {
    if (gameState && gameState.status === 'playing') {
        // Bot turns require user to press Step or Play
    }
}

function handleStep() {
    if (!gameState || gameState.status !== 'playing') return;

    const currentPlayer = gameState.players[gameState.currentPlayerId];
    if (currentPlayer.control === 'human') return;

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
    btn.textContent = isPlaying ? '⏸' : '▶';

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
    if (currentPlayer.control === 'human') return;

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
    if (btn) btn.textContent = '▶';
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
