import { getPalette, getPalettesForCount } from './palettes.js';
import { isLegalMove } from '../core/rules.js';

// Player-color assignment (light, saturated colors for dark UI badges)
const PLAYER_HUES = [210, 0, 120, 45, 270, 180, 330, 90];
function playerHue(index) { return PLAYER_HUES[index % PLAYER_HUES.length]; }
function playerColor(index) { return `hsl(${playerHue(index)}, 70%, 60%)`; }

let playerConfigs = [
    { name: "Player 1", control: "human", teamId: 0 },
    { name: "Player 2", control: "greedy", teamId: 1 }
];

const CONTROL_LABELS = {
    human: "Human",
    random: "Random",
    greedy: "Greedy",
    aggressive: "Aggressive",
    lookahead: "Lookahead",
    hybrid: "Hybrid",
    spite: "Spite"
};

// ─── Public API ──────────────────────────────────────────────

export function updatePaletteOptions(colorCount) {
    const select = document.getElementById('palette');
    if (!select) return;

    const currentSelection = select.value;
    const viablePalettes = getPalettesForCount(colorCount);

    select.innerHTML = '';
    viablePalettes.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        if (p.id === currentSelection) opt.selected = true;
        select.appendChild(opt);
    });

    // If previous selection is no longer valid, pick the first one
    if (select.selectedIndex === -1 && select.options.length > 0) {
        select.selectedIndex = 0;
    }
}

export function setupUI(state, onColorSelect, onReset, onStep, onTogglePlay) {
    const setupScreen = document.getElementById('setup-screen');
    const gameScreen  = document.getElementById('game-screen');

    if (state) {
        setupScreen.hidden = true;
        gameScreen.hidden = false;
        hideGameOver();
        const showResultsBtn = document.getElementById('show-results-button');
        if (showResultsBtn) showResultsBtn.hidden = true;
        updateStats(state);
        createColorButtons(state, onColorSelect);
        setupAutoplayUI(state, onStep, onTogglePlay);
        wireGameOverButtons(onReset, state, onColorSelect, onStep, onTogglePlay);
    } else {
        setupScreen.hidden = false;
        gameScreen.hidden = true;
        hideGameOver();
        renderPlayerSetup();

        const colorCountInput = document.getElementById('color-count');
        if (colorCountInput) {
            updatePaletteOptions(parseInt(colorCountInput.value));
            colorCountInput.oninput = (e) => {
                const val = e.target.value;
                document.getElementById('color-count-val').textContent = val;
                updatePaletteOptions(parseInt(val));
            };
        }
    }

    const resetBtn = document.getElementById('reset-button');
    resetBtn.onclick = onReset;

    const shapeSelect = document.getElementById('board-shape');
    if (shapeSelect) {
        shapeSelect.onchange = () => updateBoardDimensionsVisibility();
        updateBoardDimensionsVisibility();
    }

    const addPlayerBtn = document.getElementById('add-player-button');
    if (addPlayerBtn) {
        addPlayerBtn.onclick = () => {
            if (playerConfigs.length < 8) {
                playerConfigs.push({
                    name: `Player ${playerConfigs.length + 1}`,
                    control: "greedy",
                    teamId: playerConfigs.length
                });
                renderPlayerSetup();
            }
        };
    }
}

export function getPlayerConfigs() {
    return playerConfigs;
}

export function setPlayerConfigs(configs) {
    if (Array.isArray(configs) && configs.length > 0) {
        playerConfigs = configs;
    }
}

export function updateStats(state) {
    // Turn counter
    document.getElementById('turn-count').textContent = state.turnNumber;

    // Scoreboard
    const scoreboard = document.getElementById('scoreboard');
    scoreboard.innerHTML = '';

    const palette = getPalette(state.paletteId, state.colorCount);
    const totalTiles = state.board.tiles.length;
    const totalOwned = state.players.reduce((sum, p) => sum + p.score, 0);

    state.players.forEach(player => {
        const card = document.createElement('div');
        card.className = 'score-card';
        if (player.id === state.currentPlayerId && state.status === 'playing') {
            card.classList.add('active');
        }

        // Left color bar via pseudo-element
        const ownedTile = state.board.tiles.find(t => t.ownerId === player.id);
        const pColor = ownedTile ? palette[ownedTile.colorId % palette.length] : playerColor(player.id);
        card.style.setProperty('--pc', pColor);
        card.querySelector || null; // no-op
        card.innerHTML = `<style>.score-card[data-pid="${player.id}"]::before{background:${pColor}}</style>`;
        card.setAttribute('data-pid', player.id);

        // Name
        const nameEl = document.createElement('span');
        nameEl.className = 'sc-name';
        nameEl.textContent = player.name;
        card.appendChild(nameEl);

        // Bot type badge
        if (player.control !== 'human') {
            const typeEl = document.createElement('span');
            typeEl.className = 'sc-type';
            typeEl.textContent = CONTROL_LABELS[player.control] || player.control;
            card.appendChild(typeEl);
        }

        // Score
        const scoreEl = document.createElement('span');
        scoreEl.className = 'sc-score';
        scoreEl.textContent = `${player.score}`;
        card.appendChild(scoreEl);

        // Percentage
        const pctEl = document.createElement('span');
        pctEl.className = 'sc-pct';
        const pct = totalTiles > 0 ? Math.round((player.score / totalTiles) * 100) : 0;
        pctEl.textContent = `${pct}%`;
        card.appendChild(pctEl);

        // Bottom bar for territory visualization (relative to half of total tiles)
        const bar = document.createElement('div');
        bar.className = 'sc-bar';
        const relPct = totalTiles > 0 ? Math.round((player.score / (totalTiles / 2)) * 100) : 0;
        bar.style.width = `${relPct}%`;
        bar.style.background = pColor;
        card.appendChild(bar);

        scoreboard.appendChild(card);
    });

    // Current turn info
    const turnInfo = document.getElementById('current-turn-info');
    if (state.status === 'finished') {
        turnInfo.textContent = '';
    } else {
        const cp = state.players[state.currentPlayerId];
        if (cp.control === 'human') {
            turnInfo.innerHTML = `<span class="cti-name">${cp.name}</span> — pick a color`;
        } else {
            turnInfo.innerHTML = `<span class="cti-name">${cp.name}</span> <span class="cti-type">(${CONTROL_LABELS[cp.control] || cp.control})</span> thinking…`;
        }
    }

    // Game over?
    if (state.status === 'finished') {
        showGameOver(state, palette);
    }
}

// ─── Color Buttons (per-player strips) ───────────────────────

const STRIP_IDS = ['player-strip-bottom', 'player-strip-top', 'player-strip-right', 'player-strip-left'];
// On mobile (<=600px width) we only use top and bottom
function getAvailableStrips() {
    if (window.innerWidth <= 600) {
        return ['player-strip-bottom', 'player-strip-top'];
    }
    return STRIP_IDS;
}

/**
 * Assign strips to players based on proximity of their starting position
 * to each edge of the board.
 */
function assignStripsToPlayers(state, humanPlayers, availableStrips) {
    const board = state.board;

    // Compute normalized centroid position (0-1) for each human player's starting tile
    const playerPositions = humanPlayers.map(player => {
        const startTileId = board.startTileIds[player.id % board.startTileIds.length];
        const tile = board.tiles[startTileId];
        let cx = 0, cy = 0;
        for (const p of tile.points) { cx += p[0]; cy += p[1]; }
        cx /= tile.points.length;
        cy /= tile.points.length;
        // Normalize to 0-1
        return { player, nx: cx / board.width, ny: cy / board.height };
    });

    // Map strip IDs to edge distances (lower = closer to that edge)
    function edgeDistance(nx, ny, stripId) {
        switch (stripId) {
            case 'player-strip-bottom': return 1 - ny;  // close to bottom = high y
            case 'player-strip-top': return ny;          // close to top = low y
            case 'player-strip-left': return nx;         // close to left = low x
            case 'player-strip-right': return 1 - nx;   // close to right = high x
        }
        return Infinity;
    }

    // Greedy assignment: for each player, pick the closest available strip
    const usedStrips = new Set();
    const assignments = [];

    // Sort players by how strongly they prefer one edge (smallest min distance first)
    const scored = playerPositions.map(pp => {
        const dists = availableStrips.map(s => ({ stripId: s, dist: edgeDistance(pp.nx, pp.ny, s) }));
        dists.sort((a, b) => a.dist - b.dist);
        return { ...pp, dists };
    });
    // Assign players with the strongest preference first
    scored.sort((a, b) => a.dists[0].dist - b.dists[0].dist);

    for (const pp of scored) {
        let assigned = false;
        for (const { stripId } of pp.dists) {
            if (!usedStrips.has(stripId)) {
                usedStrips.add(stripId);
                assignments.push({ player: pp.player, stripId });
                assigned = true;
                break;
            }
        }
        // Fallback: if all strips taken, share the closest one
        if (!assigned) {
            assignments.push({ player: pp.player, stripId: pp.dists[0].stripId });
        }
    }

    return assignments;
}

function createColorButtons(state, onColorSelect) {
    const humanPlayers = state.players.filter(p => p.control === 'human');
    const hasBots = state.players.some(p => p.control !== 'human');

    // Show/hide autoplay controls
    const autoplay = document.getElementById('autoplay-controls');
    if (autoplay) autoplay.hidden = !hasBots;

    // Hide all strips first
    for (const id of STRIP_IDS) {
        const el = document.getElementById(id);
        if (el) { el.hidden = true; el.innerHTML = ''; }
    }

    if (humanPlayers.length <= 1) {
        // Single human (or zero): use bottom strip only
        const strip = document.getElementById('player-strip-bottom');
        if (strip) {
            strip.hidden = false;
            const currentPlayer = state.players[state.currentPlayerId];
            buildStripContent(strip, state, currentPlayer, onColorSelect, true);
        }
    } else {
        // Multiple humans: assign each to a strip/side closest to their starting position
        const strips = getAvailableStrips();
        const assignments = assignStripsToPlayers(state, humanPlayers, strips);
        assignments.forEach(({ player, stripId }) => {
            const strip = document.getElementById(stripId);
            if (!strip) return;
            strip.hidden = false;

            const isActive = player.id === state.currentPlayerId && state.status === 'playing';
            buildStripContent(strip, state, player, onColorSelect, isActive, assignments.filter(a => a.stripId === stripId).length > 1);
        });
    }
}

function buildStripContent(strip, state, player, onColorSelect, isActive, append = false) {
    if (!append) strip.innerHTML = '';

    const palette = getPalette(state.paletteId, state.colorCount);

    // Wrapper for this player's button set
    const wrapper = document.createElement('div');
    wrapper.className = 'strip-player-set';
    if (!isActive) wrapper.classList.add('strip-player-inactive');

    // Label
    const label = document.createElement('span');
    label.className = 'strip-label';
    label.textContent = player.name;
    wrapper.appendChild(label);

    // Buttons container
    const btns = document.createElement('div');
    btns.className = 'strip-buttons';

    // Find player's color
    const playerColorIds = new Map();
    for (const p of state.players) {
        const owned = state.board.tiles.find(t => t.ownerId === p.id);
        if (owned) playerColorIds.set(p.id, owned.colorId);
    }
    const myColorId = playerColorIds.get(player.id) ?? -1;

    for (let i = 0; i < state.colorCount; i++) {
        const btn = document.createElement('button');
        btn.className = 'color-btn';
        btn.style.backgroundColor = palette[i % palette.length];

        const legal = isLegalMove(state, player.id, i);

        if (i === myColorId) {
            btn.classList.add('is-current');
            btn.disabled = true;
            btn.title = 'Your current color';
        } else if (!legal) {
            btn.classList.add('is-opponent');
            btn.disabled = true;
            btn.title = 'Unavailable';
        } else if (!isActive || state.status !== 'playing') {
            btn.disabled = true;
        } else {
            btn.onclick = () => onColorSelect(i);
        }

        btns.appendChild(btn);
    }

    wrapper.appendChild(btns);
    strip.appendChild(wrapper);

    // Active/inactive styling on the strip itself
    if (strip.children.length === 1) {
        strip.classList.toggle('strip-active', isActive);
        strip.classList.toggle('strip-inactive', !isActive);
    } else {
        // Multiple players on one strip: don't dim the whole strip
        strip.classList.remove('strip-active', 'strip-inactive');
    }
}

// ─── Autoplay ────────────────────────────────────────────────

function setupAutoplayUI(state, onStep, onTogglePlay) {
    const stepBtn = document.getElementById('step-button');
    const playPauseBtn = document.getElementById('play-pause-button');

    stepBtn.onclick = onStep;
    playPauseBtn.onclick = onTogglePlay;

    if (state.status === 'finished') {
        stepBtn.disabled = true;
        playPauseBtn.disabled = true;
    } else {
        stepBtn.disabled = false;
        playPauseBtn.disabled = false;
    }
}

// ─── Game Over ───────────────────────────────────────────────

function showGameOver(state, palette) {
    const overlay = document.getElementById('game-over-overlay');
    const titleEl = document.getElementById('game-over-title');
    const scoresEl = document.getElementById('game-over-scores');

    // Determine winner(s)
    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    const maxScore = sorted[0].score;
    const winners = sorted.filter(p => p.score === maxScore);

    if (winners.length === 1) {
        titleEl.textContent = `${winners[0].name} Wins!`;
    } else {
        titleEl.textContent = "It's a Tie!";
    }

    scoresEl.innerHTML = '';
    const totalTiles = sorted.reduce((sum, p) => sum + p.score, 0);
    sorted.forEach((player, idx) => {
        const row = document.createElement('div');
        row.className = 'go-score-row';
        if (player.score === maxScore) row.classList.add('winner');

        const ownedTile = state.board.tiles.find(t => t.ownerId === player.id);
        const pColor = ownedTile ? palette[ownedTile.colorId % palette.length] : playerColor(player.id);
        const pct = totalTiles > 0 ? (player.score / totalTiles * 100) : 0;
        const barPct = maxScore > 0 ? (player.score / maxScore * 100) : 0;

        row.innerHTML = `
            <div class="go-row-top">
                <span class="go-rank">${idx + 1}</span>
                <span class="go-color" style="background:${pColor}"></span>
                <span class="go-name">${player.name}</span>
                ${player.control !== 'human' ? `<span class="go-type">${CONTROL_LABELS[player.control] || player.control}</span>` : ''}
                <span class="go-tiles">${player.score} <span class="go-pct">(${pct.toFixed(1)}%)</span></span>
            </div>
            <div class="go-bar-track">
                <div class="go-bar-fill" style="width:${barPct}%;background:${pColor}"></div>
            </div>
        `;
        scoresEl.appendChild(row);
    });

    overlay.hidden = false;
}

function hideGameOver() {
    const overlay = document.getElementById('game-over-overlay');
    if (overlay) overlay.hidden = true;
}

function wireGameOverButtons(onReset, state, onColorSelect, onStep, onTogglePlay) {
    const playAgainBtn = document.getElementById('play-again-button');
    const backBtn = document.getElementById('back-to-setup-button');
    const viewBoardBtn = document.getElementById('view-board-button');
    const showResultsBtn = document.getElementById('show-results-button');

    if (playAgainBtn) {
        playAgainBtn.onclick = () => {
            hideGameOver();
            if (showResultsBtn) showResultsBtn.hidden = true;
            document.getElementById('start-button').click();
        };
    }
    if (backBtn) {
        backBtn.onclick = () => {
            hideGameOver();
            if (showResultsBtn) showResultsBtn.hidden = true;
            onReset();
        };
    }
    if (viewBoardBtn) {
        viewBoardBtn.onclick = () => {
            hideGameOver();
            if (showResultsBtn) showResultsBtn.hidden = false;
        };
    }
    if (showResultsBtn) {
        showResultsBtn.onclick = () => {
            const overlay = document.getElementById('game-over-overlay');
            if (overlay) overlay.hidden = false;
            showResultsBtn.hidden = true;
        };
    }
}

// ─── Player Setup ────────────────────────────────────────────

let teamsEnabled = false;

function initTeamsToggle() {
    const checkbox = document.getElementById('enable-teams');
    if (!checkbox) return;
    checkbox.onchange = () => {
        teamsEnabled = checkbox.checked;
        const panel = document.getElementById('team-assign-panel');
        const territorySelect = document.getElementById('team-territory');
        if (teamsEnabled) {
            panel.style.display = '';
            territorySelect.style.display = '';
            // Distribute players into 2 teams by default
            playerConfigs.forEach((c, i) => { c.teamId = i % 2; });
        } else {
            panel.style.display = 'none';
            territorySelect.style.display = 'none';
            // Everyone on their own team, but re-normalize to 0..N-1
            playerConfigs.forEach((c, i) => { c.teamId = i; });
        }
        renderTeamAssign();
    };
}

function renderTeamAssign() {
    const panel = document.getElementById('team-assign-panel');
    if (!panel || !teamsEnabled) { if (panel) panel.innerHTML = ''; return; }

    // Determine how many teams: max teamId + 1
    const teamCount = Math.max(2, ...playerConfigs.map(c => c.teamId + 1));

    panel.innerHTML = '';
    playerConfigs.forEach((config, index) => {
        const row = document.createElement('div');
        row.className = 'team-assign-row';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'team-assign-name';
        nameSpan.textContent = config.name;

        const badge = document.createElement('span');
        badge.className = 'player-badge';
        badge.style.background = playerColor(index);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'team-btn-group';

        for (let t = 0; t < teamCount; t++) {
            const btn = document.createElement('button');
            btn.className = 'team-btn';
            btn.textContent = String.fromCharCode(65 + t); // A, B, C...
            if (config.teamId === t) btn.classList.add('active');
            btn.style.setProperty('--team-hue', t === 0 ? '210' : t === 1 ? '0' : t === 2 ? '120' : '45');
            btn.onclick = () => {
                config.teamId = t;
                renderTeamAssign();
            };
            btnGroup.appendChild(btn);
        }

        // Add team button (to create a new team)
        if (teamCount < 4) {
            const addBtn = document.createElement('button');
            addBtn.className = 'team-btn team-btn-add';
            addBtn.textContent = '+';
            addBtn.title = 'New team';
            addBtn.onclick = () => {
                config.teamId = teamCount;
                renderTeamAssign();
            };
            btnGroup.appendChild(addBtn);
        }

        row.appendChild(badge);
        row.appendChild(nameSpan);
        row.appendChild(btnGroup);
        panel.appendChild(row);
    });
}

function updateBoardDimensionsVisibility() {
    const shapeSelect = document.getElementById('board-shape');
    const colsGroup = document.getElementById('cols-group');
    const rowsGroup = document.getElementById('rows-group');
    const sizeGroup = document.getElementById('size-group');

    if (!shapeSelect || !colsGroup || !rowsGroup || !sizeGroup) return;

    if (shapeSelect.value === 'rectangular') {
        colsGroup.style.display = '';
        rowsGroup.style.display = '';
        sizeGroup.style.display = 'none';
    } else {
        colsGroup.style.display = 'none';
        rowsGroup.style.display = 'none';
        sizeGroup.style.display = '';
    }
}

function renderPlayerSetup() {
    const list = document.getElementById('player-setup-list');
    list.innerHTML = '';

    playerConfigs.forEach((config, index) => {
        const row = document.createElement('div');
        row.className = 'player-setup-row';

        // Color badge
        const badge = document.createElement('span');
        badge.className = 'player-badge';
        badge.style.background = playerColor(index);
        row.appendChild(badge);

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = config.name;
        nameInput.placeholder = "Name";
        nameInput.onchange = (e) => { config.name = e.target.value; renderTeamAssign(); };

        const controlSelect = document.createElement('select');
        const controls = ["human", "random", "greedy", "aggressive", "lookahead", "hybrid", "spite"];
        controls.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = CONTROL_LABELS[c];
            if (config.control === c) opt.selected = true;
            controlSelect.appendChild(opt);
        });
        controlSelect.onchange = (e) => config.control = e.target.value;

        row.appendChild(nameInput);
        row.appendChild(controlSelect);

        if (playerConfigs.length > 1) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-player-btn';
            removeBtn.textContent = '×';
            removeBtn.onclick = () => {
                playerConfigs.splice(index, 1);
                // After removal, re-normalize teamIds if teams are disabled
                if (!teamsEnabled) {
                    playerConfigs.forEach((c, i) => { c.teamId = i; });
                } else {
                    // If teams are enabled, we should at least ensure they are within a reasonable range
                    // but the user can re-assign them in the team panel.
                    // A simple normalization here helps keep things clean.
                    const uniqueTeams = [...new Set(playerConfigs.map(c => c.teamId))].sort((a, b) => a - b);
                    const tMap = new Map();
                    uniqueTeams.forEach((tid, i) => tMap.set(tid, i));
                    playerConfigs.forEach(c => c.teamId = tMap.get(c.teamId));
                }
                renderPlayerSetup();
                renderTeamAssign();
            };
            row.appendChild(removeBtn);
        }

        list.appendChild(row);
    });

    initTeamsToggle();
    renderTeamAssign();
}
