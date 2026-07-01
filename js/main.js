import { createRNG, mixSeeds } from './core/rng.js';
import { generateSquareBoard } from './tilings/square.js';
import { generateBrickBoard } from './tilings/brick.js';
import { generateTriangleBoard } from './tilings/triangle.js';
import { generateHexBoard } from './tilings/hex.js';
import { generateTrihexagonalBoard } from './tilings/trihexagonal.js';
import { generateTruncatedHexagonalBoard } from './tilings/truncated-hexagonal.js';
import { generateTruncatedTrihexagonalBoard } from './tilings/truncated-trihexagonal.js';
import { generateSnubSquareBoard } from './tilings/snub-square.js';
import { generateSnubTrihexagonalBoard } from './tilings/snub-trihexagonal.js';
import { generateElongatedTriangularBoard } from './tilings/elongated-triangular.js';
import { generateRhombitrihexagonalBoard } from './tilings/rhombitrihexagonal.js';
import { generateCairoPentagonBoard } from './tilings/pentagon.js';
import {
    generateDeltoidalTrihexagonalBoard,
    generateFloretPentagonalBoard,
    generateKisrhombilleBoard,
    generatePrismaticPentagonalBoard,
    generateRhombilleBoard,
    generateTetrakisSquareBoard,
    generateTriakisTriangularBoard
} from './tilings/dual-semi-regular.js';
import { generateOctagonalBoard } from './tilings/octagonal.js';
import { generatePythagoreanBoard } from './tilings/pythagorean.js';
import { generateVoronoiBoard } from './tilings/voronoi.js';
import {
    applyMask,
    circularMask,
    triangularMask,
    hexagonalMask,
    ellipticalMask,
    gemstoneMask,
    donutMask,
    hourglassMask,
    plusMask
} from './tilings/masks.js';
import { findFairStartTileIds } from './core/fair-starts.js';
import { evaluateHumanFairness, acceptsFairnessReport, describeFairnessReport } from './core/human-fairness.js';
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

/**
 * Manual fine-tuning for specific tiling and shape combinations.
 * dx, dy are in pixels (applied after initial centering).
 * scale is a multiplier for the mask's radius.
 * rotation is in degrees (clockwise).
 */
const MASK_ADJUSTMENTS = {
    // Example:
    // 'triakis-triangular': {
    //     'triangular': { dx: 0, dy: 0, scale: 1.0, rotation: 30 }
    // }
};

const MASK_DEBUG = false;

function init() {
    renderer = new CanvasRenderer('game-canvas');

    // Restore saved settings
    const savedPlayers = loadSettings();
    if (savedPlayers) setPlayerConfigs(savedPlayers);

    setupUI(null, handleColorSelect, handleReset, handleStep, handleTogglePlay);
    setupHumanFairnessControls();

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

function setupHumanFairnessControls() {
    const enabled = document.getElementById('human-fairness-enabled');
    const mode = document.getElementById('human-fairness-mode');
    const threshold = document.getElementById('human-fairness-threshold');
    const attempts = document.getElementById('human-fairness-attempts');
    const strength = document.getElementById('human-fairness-strength');
    const target = document.getElementById('human-fairness-target');

    if (!enabled) return;

    const update = () => updateHumanFairnessControlState();
    enabled.onchange = update;
    if (mode) mode.onchange = update;
    if (threshold) threshold.oninput = (event) => {
        const output = document.getElementById('human-fairness-threshold-val');
        if (output) output.textContent = Number(event.target.value).toFixed(2);
    };
    if (attempts) attempts.oninput = (event) => {
        const output = document.getElementById('human-fairness-attempts-val');
        if (output) output.textContent = event.target.value;
    };
    if (strength) strength.onchange = update;
    if (target) target.onchange = update;

    document.addEventListener('player-configs-changed', update);
    update();
}

function updateHumanFairnessControlState() {
    const enabled = document.getElementById('human-fairness-enabled');
    const mode = document.getElementById('human-fairness-mode');
    const target = document.getElementById('human-fairness-target');
    const threshold = document.getElementById('human-fairness-threshold');
    const attempts = document.getElementById('human-fairness-attempts');
    const strength = document.getElementById('human-fairness-strength');
    const targetGroup = document.getElementById('human-fairness-target-group');
    const thresholdGroup = document.getElementById('human-fairness-threshold-group');
    const strengthGroup = document.getElementById('human-fairness-strength-group');
    if (!enabled || !mode) return;

    const isEnabled = enabled.checked;
    const isHandicap = mode.value === 'handicap';

    refreshHumanFairnessTargetOptions();

    mode.disabled = !isEnabled;
    if (target) target.disabled = !isEnabled || !isHandicap;
    if (threshold) threshold.disabled = !isEnabled || isHandicap;
    if (attempts) attempts.disabled = !isEnabled;
    if (strength) strength.disabled = !isEnabled || !isHandicap;

    if (targetGroup) targetGroup.hidden = !isHandicap;
    if (thresholdGroup) thresholdGroup.hidden = isHandicap;
    if (strengthGroup) strengthGroup.hidden = !isHandicap;
}

function refreshHumanFairnessTargetOptions() {
    const target = document.getElementById('human-fairness-target');
    if (!target) return;

    const currentValue = target.value;
    const configs = getPlayerConfigs();
    target.innerHTML = '';

    configs.forEach((config, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = config.name || `Player ${index + 1}`;
        target.appendChild(option);
    });

    if ([...target.options].some(option => option.value === currentValue)) {
        target.value = currentValue;
    } else if (target.options.length > 0) {
        target.value = target.options[0].value;
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

    const gameConfig = readGameConfig(configs);
    const fairnessConfig = readHumanFairnessConfig(configs);
    const baseSeed = Math.floor(Math.random() * 1000000);
    const candidate = createFilteredGameState(gameConfig, fairnessConfig, baseSeed);

    gameState = candidate.state;
    gameState.tileStyle = gameConfig.tileStyle;
    gameState.embossSize = parseFloat(document.getElementById('emboss-size').value);
    gameState.embossOpacity = parseInt(document.getElementById('emboss-opacity').value) / 100;
    gameState.gutterSize = parseInt(document.getElementById('gutter-size').value) / 100;
    gameState.fairnessReport = candidate.report;
    gameState.fairnessFiltering = candidate.filtering;

    setupUI(gameState, handleColorSelect, handleReset, handleStep, handleTogglePlay);
    updateFairnessBadge(gameState);
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

function readGameConfig(configs) {
    const boardType = document.getElementById('board-type').value;
    const boardShape = document.getElementById('board-shape').value;
    let cols = parseInt(document.getElementById('board-cols').value);
    let rows = parseInt(document.getElementById('board-rows').value);
    if (boardShape !== 'rectangular') {
        const size = parseInt(document.getElementById('board-size').value);
        cols = size;
        rows = size;
    }

    return {
        configs,
        boardType,
        boardShape,
        cols,
        rows,
        tileSize: 25,
        colorCount: parseInt(document.getElementById('color-count').value),
        colorRestrictions: document.getElementById('color-restrictions').value,
        paletteId: document.getElementById('palette').value,
        turnOrder: document.getElementById('turn-order').value,
        teamTerritory: document.getElementById('team-territory').value,
        tileStyle: document.getElementById('tile-style').value,
        startingAreaSize: parseInt(document.getElementById('starting-area-size').value),
        startingAreaBuffer: document.getElementById('starting-area-buffer').checked,
        allowSameStartingColor: document.getElementById('allow-same-starting-color').checked
    };
}

function readHumanFairnessConfig(configs) {
    const enabled = Boolean(document.getElementById('human-fairness-enabled')?.checked);
    const mode = document.getElementById('human-fairness-mode')?.value || 'balanced';
    const strength = document.getElementById('human-fairness-strength')?.value || 'mild';
    const targetPlayerId = parseInt(document.getElementById('human-fairness-target')?.value || '0', 10);
    const maxAttempts = clamp(parseInt(document.getElementById('human-fairness-attempts')?.value || '32', 10), 1, 256);
    const threshold = parseFloat(document.getElementById('human-fairness-threshold')?.value || '0.10');

    const handicapRanges = {
        mild: [0.10, 0.20],
        medium: [0.20, 0.30],
        strong: [0.30, 0.50]
    };
    const [handicapMin, handicapMax] = handicapRanges[strength] || handicapRanges.mild;

    return {
        enabled: enabled && configs.length >= 2,
        mode: enabled ? mode : 'off',
        threshold,
        strength,
        handicapMin,
        handicapMax,
        targetPlayerId,
        maxAttempts
    };
}

function createFilteredGameState(gameConfig, fairnessConfig, baseSeed) {
    const attempts = fairnessConfig.enabled ? fairnessConfig.maxAttempts : 1;
    let best = null;

    for (let attempt = 0; attempt < attempts; attempt++) {
        const boardSeed = (baseSeed + attempt) >>> 0;
        const candidate = createGameStateForSeed(gameConfig, boardSeed);
        const report = evaluateHumanFairness(candidate.state);
        const filtering = {
            enabled: fairnessConfig.enabled,
            mode: fairnessConfig.mode,
            accepted: acceptsFairnessReport(report, fairnessConfig),
            attempt: attempt + 1,
            maxAttempts: attempts,
            boardSeed,
            baseSeed,
            playSeed: candidate.playSeed,
            bestEffort: false
        };

        const scored = { ...candidate, report, filtering };

        if (!best || isBetterFairnessCandidate(scored, best, fairnessConfig)) {
            best = scored;
        }

        if (!fairnessConfig.enabled || filtering.accepted) {
            return scored;
        }
    }

    if (best) {
        best.filtering.accepted = false;
        best.filtering.bestEffort = true;
        return best;
    }

    return createGameStateForSeed(gameConfig, baseSeed);
}

function isBetterFairnessCandidate(candidate, best, fairnessConfig) {
    if (!fairnessConfig.enabled) return false;

    if (fairnessConfig.mode === 'handicap') {
        const candidateTargetsPlayer = candidate.report.favoredPlayerId === fairnessConfig.targetPlayerId;
        const bestTargetsPlayer = best.report.favoredPlayerId === fairnessConfig.targetPlayerId;
        if (candidateTargetsPlayer !== bestTargetsPlayer) return candidateTargetsPlayer;

        const targetMid = (fairnessConfig.handicapMin + fairnessConfig.handicapMax) / 2;
        return Math.abs(candidate.report.score - targetMid) < Math.abs(best.report.score - targetMid);
    }

    return candidate.report.score < best.report.score;
}

function createGameStateForSeed(gameConfig, boardSeed) {
    const board = generateConfiguredBoard(gameConfig, boardSeed);

    board.startTileIds = findFairStartTileIds(board, gameConfig.configs.length, {
        boardType: gameConfig.boardType,
        boardShape: gameConfig.boardShape,
        cols: gameConfig.cols,
        rows: gameConfig.rows
    });

    const { players, teams } = buildPlayersAndTeams(gameConfig.configs);
    const playSeed = mixSeeds(boardSeed, 0x706c6179); // independent "play" stream

    const state = createGame({
        board,
        players,
        teams,
        colorCount: gameConfig.colorCount,
        paletteId: gameConfig.paletteId,
        rngSeed: boardSeed,
        playRngSeed: playSeed,
        rules: {
            winCondition: "mostTiles",
            turnOrder: gameConfig.turnOrder,
            teamTerritory: gameConfig.teamTerritory,
            captureMode: "neutralOnly",
            colorRestrictions: gameConfig.colorRestrictions,
            startingPositions: "corners",
            maxTurns: 500,
            startingAreaSize: gameConfig.startingAreaSize,
            startingAreaBuffer: gameConfig.startingAreaBuffer,
            allowSameStartingColor: gameConfig.allowSameStartingColor
        }
    });

    return { state, boardSeed, playSeed };
}

function buildPlayersAndTeams(configs) {
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
        id,
        name: `Team ${id}`,
        playerIds: players.filter(p => p.teamId === id).map(p => p.id),
        score: 0
    }));

    return { players, teams };
}

function generateConfiguredBoard(gameConfig, seed) {
    const rng = createRNG(seed);
    const { boardType, boardShape, cols, rows, tileSize, colorCount } = gameConfig;
    const commonOptions = { colorCount, rng };
    let board;

    if (boardType === 'square') {
        board = generateSquareBoard({ ...commonOptions, cols, rows, tileSize });
    } else if (boardType === 'brick') {
        board = generateBrickBoard({ ...commonOptions, cols, rows, tileSize });
    } else if (boardType === 'triangle') {
        const adjCols = boardShape === 'triangular' ? cols : Math.floor(cols * 1.5);
        board = generateTriangleBoard({ ...commonOptions, cols: adjCols, rows, tileSize: tileSize * 1.2, shape: boardShape === 'triangular' ? 'triangular' : 'rectangular' });
    } else if (boardType === 'hex') {
        board = generateHexBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.6, shape: boardShape === 'hexagonal' ? 'hexagonal' : 'rectangular' });
    } else if (boardType === 'trihexagonal') {
        board = generateTrihexagonalBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.6 });
    } else if (boardType === 'truncated-hexagonal') {
        board = generateTruncatedHexagonalBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.4 });
    } else if (boardType === 'truncated-trihexagonal') {
        board = generateTruncatedTrihexagonalBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.4 });
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
    } else if (boardType === 'pentagon-prismatic') {
        board = generatePrismaticPentagonalBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 1.0 });
    } else if (boardType === 'pentagon-floret') {
        board = generateFloretPentagonalBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.65 });
    } else if (boardType === 'deltoidal-trihexagonal') {
        board = generateDeltoidalTrihexagonalBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.9 });
    } else if (boardType === 'rhombille') {
        board = generateRhombilleBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.9 });
    } else if (boardType === 'triakis-triangular') {
        board = generateTriakisTriangularBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 1.1 });
    } else if (boardType === 'kisrhombille') {
        board = generateKisrhombilleBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 1.1 });
    } else if (boardType === 'tetrakis-square') {
        board = generateTetrakisSquareBoard({ ...commonOptions, cols, rows, tileSize });
    } else if (boardType === '4.8.8') {
        board = generateOctagonalBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.4 });
    } else if (boardType === 'pythagorean') {
        board = generatePythagoreanBoard({ ...commonOptions, cols, rows, tileSize: tileSize * 0.8 });
    } else if (boardType === 'voronoi-jittered') {
        board = generateVoronoiBoard({ ...commonOptions, cols, rows, tileSize, type: 'jittered' });
    } else if (boardType === 'voronoi-random') {
        board = generateVoronoiBoard({ ...commonOptions, cols, rows, tileSize, type: 'random' });
    } else {
        board = generateSquareBoard({ ...commonOptions, cols, rows, tileSize });
    }

    return applyConfiguredMask(board, gameConfig);
}

function applyConfiguredMask(board, gameConfig) {
    const { boardType, boardShape, cols } = gameConfig;
    const adjLookup = (MASK_ADJUSTMENTS[boardType] && MASK_ADJUSTMENTS[boardType][boardShape]) || { dx: 0, dy: 0, scale: 1.0, rotation: 0 };
    const adj = adjLookup[cols] || adjLookup;
    const rotationRad = (adj.rotation || 0) * Math.PI / 180;

    if (boardShape === 'circular') {
        const cx = board.width / 2 + adj.dx;
        const cy = board.height / 2 + adj.dy;
        const radius = Math.min(board.width, board.height) * 0.45 * adj.scale;
        board = applyMask(board, circularMask(cx, cy, radius));
        if (MASK_DEBUG) board.debugMask = { shape: 'circular', cx, cy, radius, rotation: rotationRad };
    } else if (boardShape === 'triangular' && boardType !== 'triangle') {
        const cx = board.width / 2 + adj.dx;
        const radius = Math.min(board.width, board.height) * 0.5 * adj.scale;
        const cy = board.height / 2 + radius / 4 + adj.dy;
        board = applyMask(board, triangularMask(cx, cy, radius, rotationRad));
        if (MASK_DEBUG) board.debugMask = { shape: 'triangular', cx, cy, radius, rotation: rotationRad };
    } else if (boardShape === 'hexagonal' && boardType !== 'hex') {
        const cx = board.width / 2 + adj.dx;
        const cy = board.height / 2 + adj.dy;
        const radius = Math.min(board.width, board.height) * 0.45 * adj.scale;
        board = applyMask(board, hexagonalMask(cx, cy, radius, rotationRad));
        if (MASK_DEBUG) board.debugMask = { shape: 'hexagonal', cx, cy, radius, rotation: rotationRad };
    } else if (boardShape === 'ellipse-v') {
        const cx = board.width / 2 + adj.dx;
        const cy = board.height / 2 + adj.dy;
        const ry = board.height * 0.45 * adj.scale;
        const rx = ry * 0.6;
        board = applyMask(board, ellipticalMask(cx, cy, rx, ry, rotationRad));
        if (MASK_DEBUG) board.debugMask = { shape: 'elliptical', cx, cy, rx, ry, rotation: rotationRad };
    } else if (boardShape === 'ellipse-h') {
        const cx = board.width / 2 + adj.dx;
        const cy = board.height / 2 + adj.dy;
        const rx = board.width * 0.45 * adj.scale;
        const ry = rx * 0.6;
        board = applyMask(board, ellipticalMask(cx, cy, rx, ry, rotationRad));
        if (MASK_DEBUG) board.debugMask = { shape: 'elliptical', cx, cy, rx, ry, rotation: rotationRad };
    } else if (boardShape === 'gemstone') {
        const cx = board.width / 2 + adj.dx;
        const cy = board.height / 2 + adj.dy;
        const radius = Math.min(board.width, board.height) * 0.45 * adj.scale;
        board = applyMask(board, gemstoneMask(cx, cy, radius, rotationRad));
        if (MASK_DEBUG) board.debugMask = { shape: 'gemstone', cx, cy, radius, rotation: rotationRad };
    } else if (boardShape === 'donut') {
        const cx = board.width / 2 + adj.dx;
        const cy = board.height / 2 + adj.dy;
        const outer = Math.min(board.width, board.height) * 0.45 * adj.scale;
        const inner = outer * 0.4;
        board = applyMask(board, donutMask(cx, cy, inner, outer));
        if (MASK_DEBUG) board.debugMask = { shape: 'donut', cx, cy, inner, outer, rotation: rotationRad };
    } else if (boardShape === 'hourglass-v') {
        const cx = board.width / 2 + adj.dx;
        const cy = board.height / 2 + adj.dy;
        const radius = Math.min(board.width, board.height) * 0.45 * adj.scale;
        board = applyMask(board, hourglassMask(cx, cy, radius, rotationRad));
        if (MASK_DEBUG) board.debugMask = { shape: 'hourglass', cx, cy, radius, rotation: rotationRad };
    } else if (boardShape === 'hourglass-h') {
        const cx = board.width / 2 + adj.dx;
        const cy = board.height / 2 + adj.dy;
        const radius = Math.min(board.width, board.height) * 0.45 * adj.scale;
        board = applyMask(board, hourglassMask(cx, cy, radius, rotationRad + Math.PI / 2));
        if (MASK_DEBUG) board.debugMask = { shape: 'hourglass', cx, cy, radius, rotation: rotationRad + Math.PI / 2 };
    } else if (boardShape === 'plus') {
        const cx = board.width / 2 + adj.dx;
        const cy = board.height / 2 + adj.dy;
        const radius = Math.min(board.width, board.height) * 0.45 * adj.scale;
        const thick = radius * 0.5;
        board = applyMask(board, plusMask(cx, cy, radius, thick, rotationRad));
        if (MASK_DEBUG) board.debugMask = { shape: 'plus', cx, cy, radius, thick, rotation: rotationRad };
    }

    return board;
}

function updateFairnessBadge(state) {
    const badge = document.getElementById('fairness-badge');
    if (!badge) return;

    if (!state?.fairnessReport) {
        badge.hidden = true;
        badge.textContent = '';
        return;
    }

    const filtering = state.fairnessFiltering || {};
    const suffix = filtering.enabled
        ? filtering.accepted
            ? ` · accepted ${filtering.attempt}/${filtering.maxAttempts}`
            : ` · best of ${filtering.maxAttempts}`
        : '';

    badge.textContent = `${describeFairnessReport(state.fairnessReport)}${suffix}`;
    badge.className = `fairness-badge fairness-${state.fairnessReport.rating.replace(/\s+/g, '-')}`;
    badge.hidden = false;
}

function clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
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
