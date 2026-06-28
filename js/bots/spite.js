import { isLegalMove, canCaptureTile } from '../core/rules.js';
import { simulateMove } from './greedy.js';
import { getMove as getGreedyMove } from './greedy.js';

export function getMove(state, playerId) {
    let bestColor = -1;
    let maxSpite = -1;

    for (let c = 0; c < state.colorCount; c++) {
        if (!isLegalMove(state, playerId, c)) continue;

        // Calculate own gain
        const ownGain = simulateMove(state, playerId, c);

        // Calculate total gain opponents would get if they could pick this color
        let totalOpponentGain = 0;
        for (let pIdx = 0; pIdx < state.players.length; pIdx++) {
            if (pIdx === playerId) continue;
            totalOpponentGain += simulateMove(state, pIdx, c);
        }

        // Spite score: prioritize denying opponents, use own gain as tiebreaker
        const spiteScore = totalOpponentGain * 1000 + ownGain;

        if (spiteScore > maxSpite) {
            maxSpite = spiteScore;
            bestColor = c;
        }
    }

    if (bestColor === -1) {
        return getGreedyMove(state, playerId);
    }

    return bestColor;
}
