import { isLegalMove } from '../core/rules.js';

export function getMove(state, playerId) {
    const legalColors = [];
    for (let c = 0; c < state.colorCount; c++) {
        if (isLegalMove(state, playerId, c)) {
            legalColors.push(c);
        }
    }

    if (legalColors.length === 0) return null;
    return legalColors[Math.floor(Math.random() * legalColors.length)];
}
