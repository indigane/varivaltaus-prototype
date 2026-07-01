import { isLegalMove } from '../core/rules.js';
import { createRNG, mixSeeds } from '../core/rng.js';

export function getMove(state, playerId) {
    const legalColors = [];
    for (let c = 0; c < state.colorCount; c++) {
        if (isLegalMove(state, playerId, c)) {
            legalColors.push(c);
        }
    }

    if (legalColors.length === 0) return null;

    const roll = Number.isFinite(state.playRngSeed)
        ? createRNG(mixSeeds(state.playRngSeed, state.turnNumber, playerId, state.moveLog?.length || 0))()
        : Math.random();

    return legalColors[Math.floor(roll * legalColors.length)];
}
