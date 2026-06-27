import { getPalette } from './palettes.js';

export function setupUI(state, onColorSelect, onReset) {
    updateStats(state);
    createColorButtons(state, onColorSelect);

    const resetBtn = document.getElementById('reset-button');
    resetBtn.onclick = onReset;

    const statusEl = document.getElementById('game-status');
    if (state.status === 'finished') {
        statusEl.textContent = 'Game Over!';
    } else {
        statusEl.textContent = `Player ${state.currentPlayerId + 1}'s turn`;
    }
}

export function updateStats(state) {
    document.getElementById('turn-count').textContent = state.turnNumber;
    // Show first player's score for solo
    document.getElementById('score').textContent = state.players[0].score;

    const statusEl = document.getElementById('game-status');
    if (state.status === 'finished') {
        statusEl.textContent = 'Game Over!';
    } else {
        statusEl.textContent = `Player ${state.currentPlayerId + 1}'s turn`;
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
