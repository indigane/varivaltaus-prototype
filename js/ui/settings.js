const STORAGE_KEY = 'flood-settings';

const RANGE_IDS = ['board-cols', 'board-rows', 'color-count', 'starting-area-size'];
const SELECT_IDS = ['board-type', 'board-shape', 'color-restrictions', 'turn-order', 'team-territory', 'palette'];
const CHECKBOX_IDS = ['starting-area-buffer', 'allow-same-starting-color', 'enable-teams'];
const OTHER_IDS = ['speed-slider', 'tile-style', 'emboss-size', 'emboss-opacity', 'gutter-size'];

export function saveSettings(playerConfigs) {
    const data = {};

    for (const id of [...RANGE_IDS, ...OTHER_IDS]) {
        const el = document.getElementById(id);
        if (el) data[id] = el.value;
    }
    for (const id of SELECT_IDS) {
        const el = document.getElementById(id);
        if (el) data[id] = el.value;
    }
    for (const id of CHECKBOX_IDS) {
        const el = document.getElementById(id);
        if (el) data[id] = el.checked;
    }

    data.playerConfigs = playerConfigs;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        // Storage full or unavailable — silently ignore
    }
}

export function loadSettings() {
    let data;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        data = JSON.parse(raw);
    } catch (e) {
        return null;
    }

    for (const id of [...RANGE_IDS, ...OTHER_IDS]) {
        const el = document.getElementById(id);
        if (el && data[id] !== undefined) {
            el.value = data[id];
            // Update output displays for range sliders
            const output = document.getElementById(id + '-val');
            if (output) output.textContent = data[id];
        }
    }
    for (const id of SELECT_IDS) {
        const el = document.getElementById(id);
        if (el && data[id] !== undefined) el.value = data[id];
    }
    for (const id of CHECKBOX_IDS) {
        const el = document.getElementById(id);
        if (el && data[id] !== undefined) el.checked = data[id];
    }

    // Update tile-style button group and options visibility
    const tsInput = document.getElementById('tile-style');
    const tsSel = document.getElementById('tile-style-selector');
    if (tsInput && tsSel) {
        tsSel.querySelectorAll('.ts-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.style === tsInput.value);
        });
        const embossOpts = document.getElementById('emboss-options');
        const gutterOpts = document.getElementById('gutter-options');
        if (embossOpts) embossOpts.hidden = (tsInput.value !== 'embossed');
        if (gutterOpts) gutterOpts.hidden = (tsInput.value !== 'rounded');
    }

    return data.playerConfigs || null;
}
