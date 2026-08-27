/**
 * Quick setup: presets + a few coarse knobs layered on top of the full
 * settings form. The form (inside #advanced-panel) stays the single source of
 * truth that js/main.js reads on start; this module only writes into it and
 * reads back from it, so the game start path is unchanged.
 *
 * Mappings are informed by the simulation studies in research/:
 *  - 6–8 colors is the "fun" sweet spot; each color adds ~5–6 turns.
 *  - Hex / Voronoi boards are fairer and flow faster than square.
 *  - Snake turn order is required for fair 3+ player and team games.
 *  - Hybrid > Greedy > Random as bot strength.
 *  - A hole in the center (donut) makes games faster and more decisive.
 */

import {
    getPlayerConfigs,
    setPlayerConfigs,
    refreshPlayerSetup,
    setTeamsEnabled
} from './input.js';

const PRESET_STORAGE_KEY = 'flood-quick-preset';

const DIFFICULTY = { easy: 'random', normal: 'greedy', hard: 'hybrid' };
const DIFFICULTY_BY_CONTROL = Object.fromEntries(Object.entries(DIFFICULTY).map(([k, v]) => [v, k]));
const DIFFICULTY_LABEL = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

// cols/rows for rectangular shapes, size for masked shapes.
const LENGTHS = {
    quick:  { cols: 14, rows: 14, size: 18, colors: 5 },
    normal: { cols: 20, rows: 20, size: 26, colors: 6 },
    long:   { cols: 30, rows: 30, size: 38, colors: 8 }
};

const BOARDS = {
    classic: 'square',
    hex: 'hex',
    organic: 'voronoi-jittered',
    exotic: null // rolled from EXOTIC_TILINGS
};
const BOARD_BY_TILING = { square: 'classic', hex: 'hex', 'voronoi-jittered': 'organic' };

// Visually distinct, readable Archimedean/dual tilings for "surprise me".
const EXOTIC_TILINGS = [
    'pentagon-cairo', 'snub-square', 'trihexagonal', 'rhombitrihexagonal',
    'truncated-hexagonal', '4.8.8', 'pentagon-floret', 'rhombille',
    'basket-weave', 'voronoi-random'
];

const PRESETS = [
    { id: 'duel',    icon: '⚔️', name: 'Duel',         desc: 'You vs one bot',
      humans: 1, bots: 1, difficulty: 'normal', length: 'normal', board: 'hex' },
    { id: 'hotseat', icon: '👥', name: 'Hot Seat',     desc: 'Two people, one screen',
      humans: 2, bots: 0, difficulty: 'normal', length: 'normal', board: 'hex' },
    { id: 'party',   icon: '🎉', name: 'Free-for-all', desc: 'Four players, organic board',
      humans: 1, bots: 3, difficulty: 'normal', length: 'normal', board: 'organic' },
    { id: 'teams',   icon: '🤝', name: '2 vs 2',       desc: 'Shared team territory',
      humans: 1, bots: 3, difficulty: 'normal', length: 'normal', board: 'hex', teams: true },
    { id: 'arena',   icon: '⭕', name: 'Arena',        desc: 'Ring board, fast & decisive',
      humans: 1, bots: 2, difficulty: 'normal', length: 'normal', board: 'hex', shape: 'donut' },
    { id: 'exotic',  icon: '🔮', name: 'Exotic',       desc: 'Surprise tiling, hard bot',
      humans: 1, bots: 1, difficulty: 'hard',   length: 'normal', board: 'exotic' }
];

const MAX_PLAYERS = 8;
const MAX_HUMANS = 4;

// Knob state. null means "doesn't match any bucket" (custom).
const state = {
    preset: 'duel',
    humans: 1,
    bots: 1,
    difficulty: 'normal',
    length: 'normal',
    board: 'hex',
    shape: 'rectangular',
    teams: false,
    rollNow: false,      // one-shot: roll a new exotic tiling on next apply
    rerollExotic: false  // roll a new exotic tiling on every game start
};

let applying = false; // suppress custom-detection while we write into the form

// ─── Form helpers ────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function setVal(id, value) {
    const el = $(id);
    if (!el || String(el.value) === String(value)) return;
    el.value = value;
    // Fire the same events a user would, so existing handlers
    // (palette list, dimension visibility, range outputs) update.
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
}

function setChecked(id, checked) {
    const el = $(id);
    if (!el || el.checked === checked) return;
    el.checked = checked;
    el.dispatchEvent(new Event('change', { bubbles: true }));
}

function rollExotic() {
    return EXOTIC_TILINGS[Math.floor(Math.random() * EXOTIC_TILINGS.length)];
}

// ─── State → form ────────────────────────────────────────────

function buildPlayerConfigs() {
    const existing = getPlayerConfigs();
    const existingHumans = existing.filter(c => c.control === 'human');
    const configs = [];
    for (let i = 0; i < state.humans; i++) {
        configs.push({
            name: existingHumans[i]?.name || `Player ${i + 1}`,
            control: 'human',
            teamId: 0
        });
    }
    for (let i = 0; i < state.bots; i++) {
        configs.push({
            name: state.bots === 1 ? 'Bot' : `Bot ${i + 1}`,
            control: DIFFICULTY[state.difficulty] || 'greedy',
            teamId: 0
        });
    }
    configs.forEach((c, i) => { c.teamId = state.teams ? i % 2 : i; });
    return configs;
}

function applyToForm() {
    applying = true;
    try {
        const len = LENGTHS[state.length] || LENGTHS.normal;
        setVal('board-cols', len.cols);
        setVal('board-rows', len.rows);
        setVal('board-size', len.size);
        setVal('color-count', len.colors);

        if (state.board === 'exotic') {
            if (state.rollNow || !EXOTIC_TILINGS.includes($('board-type').value)) {
                setVal('board-type', rollExotic());
            }
            state.rollNow = false;
        } else if (BOARDS[state.board]) {
            setVal('board-type', BOARDS[state.board]);
        }
        setVal('board-shape', state.shape);

        // Fairness defaults from research.
        const total = state.humans + state.bots;
        setVal('turn-order', total >= 3 ? 'snake' : 'players');
        setVal('color-restrictions', 'notAnyPlayerColor');
        setVal('starting-area-size', 3);
        setChecked('starting-area-buffer', true);
        setChecked('allow-same-starting-color', false);

        setPlayerConfigs(buildPlayerConfigs());
        setVal('team-territory', state.teams ? 'merged' : 'separatePlayers');
        refreshPlayerSetup();
        setTeamsEnabled(state.teams);
    } finally {
        applying = false;
    }
}

// ─── Form → state ────────────────────────────────────────────

function syncFromForm() {
    const configs = getPlayerConfigs();
    state.humans = configs.filter(c => c.control === 'human').length;
    state.bots = configs.length - state.humans;

    const botControls = configs.filter(c => c.control !== 'human').map(c => c.control);
    const uniq = [...new Set(botControls)];
    state.difficulty = uniq.length === 1 ? (DIFFICULTY_BY_CONTROL[uniq[0]] ?? null)
                     : uniq.length === 0 ? state.difficulty
                     : null;

    state.shape = $('board-shape').value;
    const cols = +$('board-cols').value, rows = +$('board-rows').value;
    const size = +$('board-size').value, colors = +$('color-count').value;
    state.length = Object.keys(LENGTHS).find(k => {
        const l = LENGTHS[k];
        const dimsOk = state.shape === 'rectangular' ? (l.cols === cols && l.rows === rows) : l.size === size;
        return dimsOk && l.colors === colors;
    }) || null;

    const tiling = $('board-type').value;
    state.board = BOARD_BY_TILING[tiling] || (EXOTIC_TILINGS.includes(tiling) ? 'exotic' : null);

    state.teams = $('enable-teams').checked;
}

function matchesPreset(p) {
    return p.humans === state.humans && p.bots === state.bots
        && p.difficulty === state.difficulty && p.length === state.length
        && p.board === state.board && !!p.teams === state.teams
        && (p.shape || 'rectangular') === state.shape;
}

// ─── Rendering ───────────────────────────────────────────────

function render() {
    // Presets
    document.querySelectorAll('.preset-card').forEach(card => {
        card.classList.toggle('active', card.dataset.preset === state.preset);
    });
    $('preset-status').hidden = state.preset !== null;

    // Steppers
    const total = state.humans + state.bots;
    document.querySelectorAll('.stepper').forEach(st => {
        const knob = st.dataset.knob;
        const val = state[knob];
        st.querySelector('.stepper-val').textContent = val;
        const minus = st.querySelector('[data-dir="-1"]');
        const plus = st.querySelector('[data-dir="1"]');
        const min = 0;
        const max = knob === 'humans' ? MAX_HUMANS : MAX_PLAYERS;
        minus.disabled = val <= min || total <= 2;
        plus.disabled = val >= max || total >= MAX_PLAYERS;
    });

    // Segmented controls
    document.querySelectorAll('.seg').forEach(seg => {
        const knob = seg.dataset.knob;
        seg.querySelectorAll('.seg-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === state[knob]);
            btn.setAttribute('aria-checked', btn.dataset.value === state[knob] ? 'true' : 'false');
        });
        if (knob === 'difficulty') seg.classList.toggle('seg-disabled', state.bots === 0);
    });

    // Teams chip only makes sense with 4+ players in even numbers.
    const teamsChip = $('teams-chip');
    const canTeam = total >= 4 && total % 2 === 0;
    teamsChip.hidden = !canTeam;
    $('quick-teams').checked = state.teams && canTeam;

    $('setup-summary').textContent = buildSummary();
}

function buildSummary() {
    const typeSel = $('board-type');
    const tiling = typeSel.options[typeSel.selectedIndex]?.text || typeSel.value;
    const shapeSel = $('board-shape');
    const shape = shapeSel.value === 'rectangular' ? '' : ` ${shapeSel.options[shapeSel.selectedIndex].text.toLowerCase()}`;
    const dims = shapeSel.value === 'rectangular'
        ? `${$('board-cols').value}×${$('board-rows').value}`
        : `size ${$('board-size').value}`;
    const colors = `${$('color-count').value} colors`;

    const configs = getPlayerConfigs();
    const humans = configs.filter(c => c.control === 'human').length;
    const bots = configs.length - humans;
    const botLabel = state.difficulty ? `${DIFFICULTY_LABEL[state.difficulty]} bot` : 'bot';
    let who;
    if (bots === 0) who = `${humans} humans`;
    else if (humans === 0) who = `${bots} bots (watch)`;
    else if (humans === 1) who = `You vs ${bots} ${botLabel}${bots > 1 ? 's' : ''}`;
    else who = `${humans} humans vs ${bots} ${botLabel}${bots > 1 ? 's' : ''}`;
    if ($('enable-teams').checked) who += ', 2 teams';

    return `${tiling}${shape} · ${dims} · ${colors} · ${who}`;
}

function renderPresetCards() {
    const grid = $('preset-grid');
    grid.innerHTML = '';
    PRESETS.forEach(p => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'preset-card';
        card.dataset.preset = p.id;
        card.innerHTML = `<span class="preset-icon">${p.icon}</span>
            <span class="preset-name">${p.name}</span>
            <span class="preset-desc">${p.desc}</span>`;
        card.onclick = () => applyPreset(p.id);
        grid.appendChild(card);
    });
}

// ─── Actions ─────────────────────────────────────────────────

function applyPreset(id) {
    const p = PRESETS.find(x => x.id === id);
    if (!p) return;
    Object.assign(state, {
        preset: p.id,
        humans: p.humans,
        bots: p.bots,
        difficulty: p.difficulty,
        length: p.length,
        board: p.board,
        shape: p.shape || 'rectangular',
        teams: !!p.teams,
        rollNow: p.board === 'exotic',
        rerollExotic: p.board === 'exotic'
    });
    commit();
}

function commit() {
    applyToForm();
    // Presets are the only thing worth persisting here; the form itself is
    // saved by settings.js on start.
    try { localStorage.setItem(PRESET_STORAGE_KEY, state.preset || ''); } catch (e) { /* ignore */ }
    render();
}

function onKnobChanged() {
    // A tweaked preset is still that preset if it happens to match; else custom.
    const match = PRESETS.find(matchesPreset);
    state.preset = match ? match.id : null;
    commit();
}

function wireKnobs() {
    document.querySelectorAll('.stepper-btn').forEach(btn => {
        btn.onclick = () => {
            const knob = btn.closest('.stepper').dataset.knob;
            state[knob] += +btn.dataset.dir;
            const total = state.humans + state.bots;
            if (total < 2 || total > MAX_PLAYERS) { state[knob] -= +btn.dataset.dir; return; }
            if (total % 2 !== 0 || total < 4) state.teams = false;
            if (state.bots > 0 && !state.difficulty) state.difficulty = 'normal';
            onKnobChanged();
        };
    });

    document.querySelectorAll('.seg-btn').forEach(btn => {
        btn.onclick = () => {
            const knob = btn.closest('.seg').dataset.knob;
            state[knob] = btn.dataset.value;
            if (knob === 'board') state.rollNow = state.rerollExotic = btn.dataset.value === 'exotic';
            onKnobChanged();
        };
    });

    $('quick-teams').onchange = (e) => {
        state.teams = e.target.checked;
        onKnobChanged();
    };

    // Anything edited directly in the advanced panel turns the selection into "Custom".
    const adv = $('advanced-panel');
    const onAdvancedEdit = () => {
        if (applying) return;
        setTimeout(() => {
            syncFromForm();
            state.rerollExotic = false;
            const match = PRESETS.find(matchesPreset);
            state.preset = match ? match.id : null;
            render();
        }, 0);
    };
    adv.addEventListener('input', onAdvancedEdit);
    adv.addEventListener('change', onAdvancedEdit);
    adv.addEventListener('click', (e) => {
        if (e.target.closest('button')) onAdvancedEdit();
    });

    // "Exotic" should surprise you again on every start / Play Again.
    document.addEventListener('click', (e) => {
        if (e.target.id !== 'start-button') return;
        if (state.board === 'exotic' && state.rerollExotic) {
            applying = true;
            try { setVal('board-type', rollExotic()); } finally { applying = false; }
        }
    }, true);
}

// ─── Init ────────────────────────────────────────────────────

/**
 * @param {boolean} hasSavedSettings whether settings.js restored a saved form.
 */
export function initQuickSetup(hasSavedSettings) {
    if (!$('quick-setup')) return;

    renderPresetCards();
    wireKnobs();

    if (!hasSavedSettings) {
        applyPreset('duel');
        return;
    }

    // Returning player: respect whatever the form restored, then see if it
    // still matches the last-chosen preset.
    syncFromForm();
    let saved = null;
    try { saved = localStorage.getItem(PRESET_STORAGE_KEY); } catch (e) { /* ignore */ }
    const savedPreset = PRESETS.find(p => p.id === saved);
    state.preset = savedPreset && matchesPreset(savedPreset) ? savedPreset.id
                 : (PRESETS.find(matchesPreset)?.id ?? null);
    state.rerollExotic = state.preset === 'exotic' || (state.board === 'exotic' && state.preset !== null);
    render();
}
