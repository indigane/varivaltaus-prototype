import { getPalette } from './palettes.js';

let playerConfigs = [
    { name: "Player 1", control: "human", teamId: 0 },
    { name: "Player 2", control: "greedy", teamId: 1 }
];

export function setupUI(state, onColorSelect, onReset, onStep, onTogglePlay) {
    const setupPanel = document.getElementById('setup-panel');
    const controlsPanel = document.getElementById('controls-panel');

    if (state) {
        setupPanel.style.display = 'none';
        controlsPanel.style.display = 'block';
        updateStats(state);
        createColorButtons(state, onColorSelect);
        setupAutoplayUI(state, onStep, onTogglePlay);
    } else {
        setupPanel.style.display = 'block';
        controlsPanel.style.display = 'none';
        renderPlayerSetup();
    }

    const resetBtn = document.getElementById('reset-button');
    resetBtn.onclick = onReset;

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

function renderPlayerSetup() {
    const list = document.getElementById('player-setup-list');
    list.innerHTML = '';

    playerConfigs.forEach((config, index) => {
        const row = document.createElement('div');
        row.className = 'player-setup-row';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = config.name;
        nameInput.placeholder = "Name";
        nameInput.style.width = "80px";
        nameInput.onchange = (e) => config.name = e.target.value;

        const controlSelect = document.createElement('select');
        const controls = ["human", "random", "greedy", "aggressive", "lookahead", "hybrid"];
        controls.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c.charAt(0).toUpperCase() + c.slice(1);
            if (config.control === c) opt.selected = true;
            controlSelect.appendChild(opt);
        });
        controlSelect.onchange = (e) => config.control = e.target.value;

        const teamLabel = document.createElement('span');
        teamLabel.textContent = "Team:";
        const teamInput = document.createElement('input');
        teamInput.type = 'number';
        teamInput.value = config.teamId;
        teamInput.min = 0;
        teamInput.max = 8;
        teamInput.style.width = "40px";
        teamInput.onchange = (e) => config.teamId = parseInt(e.target.value);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-player-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = () => {
            playerConfigs.splice(index, 1);
            renderPlayerSetup();
        };

        row.appendChild(nameInput);
        row.appendChild(controlSelect);
        row.appendChild(teamLabel);
        row.appendChild(teamInput);
        if (playerConfigs.length > 1) row.appendChild(removeBtn);
        list.appendChild(row);
    });
}

export function getPlayerConfigs() {
    return playerConfigs;
}

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

export function updateStats(state) {
    document.getElementById('turn-count').textContent = state.turnNumber;

    const scoresContainer = document.getElementById('player-scores');
    scoresContainer.innerHTML = '';

    const palette = getPalette(state.paletteId);

    state.players.forEach(player => {
        const scoreEl = document.createElement('div');
        scoreEl.className = 'player-score';
        if (player.id === state.currentPlayerId && state.status === 'playing') {
            scoreEl.classList.add('active');
        }

        // Find current color of the player to show as a small indicator
        const ownedTile = state.board.tiles.find(t => t.ownerId === player.id);
        if (ownedTile) {
            scoreEl.style.borderLeft = `8px solid ${palette[ownedTile.colorId % palette.length]}`;
        }

        scoreEl.textContent = `${player.name}: ${player.score}`;
        scoresContainer.appendChild(scoreEl);
    });

    const statusEl = document.getElementById('game-status');
    if (state.status === 'finished') {
        const playerScores = state.players.map(p => p.score);
        const maxScore = Math.max(...playerScores);
        const winners = state.players.filter(p => p.score === maxScore);

        if (winners.length === 1) {
            statusEl.textContent = `Game Over! ${winners[0].name} Wins!`;
        } else {
            statusEl.textContent = `Game Over! It's a Tie!`;
        }
    } else {
        const currentPlayer = state.players[state.currentPlayerId];
        statusEl.textContent = `${currentPlayer.name} (${currentPlayer.control}) turn`;
    }
}

function createColorButtons(state, onColorSelect) {
    const container = document.getElementById('color-buttons');
    container.innerHTML = '';

    const palette = getPalette(state.paletteId);

    // Find current player color to disable it (optional, but good UX)
    const currentPlayerOwnedTile = state.board.tiles.find(t => t.ownerId === state.currentPlayerId);
    const currentColorId = currentPlayerOwnedTile ? currentPlayerOwnedTile.colorId : -1;

    for (let i = 0; i < state.colorCount; i++) {
        const btn = document.createElement('button');
        btn.className = 'color-btn';
        btn.style.backgroundColor = palette[i % palette.length];
        btn.disabled = (i === currentColorId) || (state.status !== 'playing') || (state.players[state.currentPlayerId].control !== 'human');
        btn.onclick = () => onColorSelect(i);
        container.appendChild(btn);
    }
}
