import { getPalette } from './palettes.js';

export function setupUI(state, onColorSelect, onReset) {
    const setupPanel = document.getElementById('setup-panel');
    const controlsPanel = document.getElementById('controls-panel');

    if (state) {
        setupPanel.style.display = 'none';
        controlsPanel.style.display = 'block';
        updateStats(state);
        createColorButtons(state, onColorSelect);
    } else {
        setupPanel.style.display = 'block';
        controlsPanel.style.display = 'none';
    }

    const resetBtn = document.getElementById('reset-button');
    resetBtn.onclick = onReset;
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
        statusEl.textContent = `${state.players[state.currentPlayerId].name}'s turn`;
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
        btn.disabled = (i === currentColorId) || (state.status !== 'playing');
        btn.onclick = () => onColorSelect(i);
        container.appendChild(btn);
    }
}
