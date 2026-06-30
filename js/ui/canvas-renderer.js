import { getPalette } from './palettes.js';

export class CanvasRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.scale = 1;
        this.dpr = window.devicePixelRatio || 1;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    render(state) {
        const { board, paletteId } = state;
        const palette = getPalette(paletteId);
        const tileStyle = state.tileStyle || 'flat';

        this.fitToContainer(board);
        this.clear();

        if (tileStyle === 'rounded') {
            this._drawRoundedRegions(board, palette, state.gutterSize);
            return;
        }

        // 1. Draw all tile fills
        for (const tile of board.tiles) {
            this.drawTileFill(tile, palette[tile.colorId % palette.length]);
        }

        // 2. Style-specific rendering
        if (tileStyle === 'embossed') {
            const edgeMap = this._buildEdgeMap(board);
            const colorEdges = this._collectColorBoundaryEdges(edgeMap);
            this.drawEmbossedBoundaries(colorEdges, palette, state.embossSize, state.embossOpacity);
        } else {
            this.drawSubtleGrid(board);
            const edgeMap = this._buildEdgeMap(board);
            const boundaryEdges = this._collectBoundaryEdges(edgeMap);
            this.drawFlatBoundaries(boundaryEdges);
        }
    }

    clear() {
        const { canvas, ctx, dpr } = this;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    fitToContainer(board) {
        const container = this.canvas.parentElement;
        if (!container) return;

        const availableWidth = container.clientWidth;
        const availableHeight = container.clientHeight;
        if (availableWidth <= 0 || availableHeight <= 0) return;

        const padding = 12;
        const maxW = availableWidth - padding * 2;
        const maxH = availableHeight - padding * 2;

        const inset = 4;
        this.scale = Math.min((maxW - inset * 2) / board.width, (maxH - inset * 2) / board.height);
        this.offsetX = inset;
        this.offsetY = inset;

        const displayW = board.width * this.scale + inset * 2;
        const displayH = board.height * this.scale + inset * 2;

        this.dpr = window.devicePixelRatio || 1;

        this.canvas.style.width = displayW + 'px';
        this.canvas.style.height = displayH + 'px';
        this.canvas.width = Math.round(displayW * this.dpr);
        this.canvas.height = Math.round(displayH * this.dpr);

        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    // ─── Tile Fill ───────────────────────────────────────────

    drawTileFill(tile, color) {
        const { ctx, scale, offsetX, offsetY } = this;
        const points = tile.points;

        ctx.beginPath();
        ctx.moveTo(points[0][0] * scale + offsetX, points[0][1] * scale + offsetY);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0] * scale + offsetX, points[i][1] * scale + offsetY);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    drawSubtleGrid(board) {
        const { ctx, scale, offsetX, offsetY } = this;
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5;

        for (const tile of board.tiles) {
            if (tile.ownerId !== null) continue;
            const points = tile.points;
            ctx.beginPath();
            ctx.moveTo(points[0][0] * scale + offsetX, points[0][1] * scale + offsetY);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i][0] * scale + offsetX, points[i][1] * scale + offsetY);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }

    // ─── Edge Map (shared) ───────────────────────────────────

    _buildEdgeMap(board) {
        const edgeMap = new Map();
        for (const tile of board.tiles) {
            const pts = tile.points;
            for (let i = 0; i < pts.length; i++) {
                const p1 = pts[i];
                const p2 = pts[(i + 1) % pts.length];
                const key = this._edgeKey(p1, p2);
                if (!edgeMap.has(key)) {
                    edgeMap.set(key, { p1, p2, tiles: [tile] });
                } else {
                    edgeMap.get(key).tiles.push(tile);
                }
            }
        }
        return edgeMap;
    }

    _collectBoundaryEdges(edgeMap) {
        const edges = [];
        for (const [, edge] of edgeMap) {
            const tiles = edge.tiles;
            let isBoundary = false;
            if (tiles.length === 1) {
                isBoundary = tiles[0].ownerId !== null;
            } else if (tiles.length === 2) {
                const o1 = tiles[0].ownerId;
                const o2 = tiles[1].ownerId;
                isBoundary = (o1 !== null || o2 !== null) && o1 !== o2;
            }
            if (isBoundary) edges.push(edge);
        }
        return edges;
    }

    _collectColorBoundaryEdges(edgeMap) {
        const edges = [];
        for (const [, edge] of edgeMap) {
            const tiles = edge.tiles;
            if (tiles.length === 1) {
                edges.push(edge); // board boundary
            } else if (tiles.length === 2 && tiles[0].colorId !== tiles[1].colorId) {
                edges.push(edge);
            }
        }
        return edges;
    }

    _collectInteriorColorEdges(edgeMap) {
        const edges = [];
        for (const [, edge] of edgeMap) {
            const tiles = edge.tiles;
            if (tiles.length === 2 && tiles[0].colorId !== tiles[1].colorId) {
                edges.push(edge);
            }
        }
        return edges;
    }

    // ─── Flat Style ──────────────────────────────────────────

    drawFlatBoundaries(boundaryEdges) {
        const { ctx, scale, offsetX, offsetY } = this;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (const edge of boundaryEdges) {
            ctx.moveTo(edge.p1[0] * scale + offsetX, edge.p1[1] * scale + offsetY);
            ctx.lineTo(edge.p2[0] * scale + offsetX, edge.p2[1] * scale + offsetY);
        }
        ctx.stroke();
    }

    // ─── Embossed Style ──────────────────────────────────────

    drawEmbossedBoundaries(edges, palette, embossSize, embossOpacity) {
        const { ctx, scale, offsetX, offsetY } = this;
        const sz = embossSize || 1.5;
        const d = sz / this.dpr;
        const strength = embossOpacity !== undefined ? embossOpacity : 0.5;

        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        ctx.lineWidth = sz;

        for (const e of edges) {
            const tiles = e.tiles;

            const x1 = e.p1[0] * scale + offsetX;
            const y1 = e.p1[1] * scale + offsetY;
            const x2 = e.p2[0] * scale + offsetX;
            const y2 = e.p2[1] * scale + offsetY;

            // Compute edge direction and canonical perpendicular
            const dx = x2 - x1, dy = y2 - y1;
            const len = Math.hypot(dx, dy);
            if (len < 0.1) continue;

            // Canonical perpendicular: always pick the one with nx > 0,
            // or if nx == 0, the one with ny > 0. This ensures all parallel
            // edges get the same normal direction regardless of p1/p2 order.
            let nx = -dy / len * d, ny = dx / len * d;
            if (nx < 0 || (nx === 0 && ny < 0)) {
                nx = -nx; ny = -ny;
            }

            // Directional lighting: light from top-left.
            // The +normal side's bevel faces outward in direction (nx, ny).
            // It catches light if dot((nx,ny), (-1,-1)) > 0 → -(nx+ny) > 0.
            // For edges at exactly 45° where nx+ny=0, use a tie-breaker
            // based on a secondary axis (nx-ny) for consistent results.
            const lightAlignment = (nx + ny);
            const plusSideLit = Math.abs(lightAlignment) > 1e-6 * d
                ? lightAlignment > 0
                : (ny - nx) > 0;

            // Determine which tile is on which side of the canonical normal
            const t0pts = tiles[0].points;
            let cx0 = 0, cy0 = 0;
            for (const p of t0pts) { cx0 += p[0]; cy0 += p[1]; }
            cx0 = cx0 / t0pts.length * scale + offsetX;
            cy0 = cy0 / t0pts.length * scale + offsetY;
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
            const tile0OnPlusSide = (nx * (cx0 - mx) + ny * (cy0 - my)) > 0;

            const t0FacesLight = tile0OnPlusSide ? plusSideLit : !plusSideLit;

            // Tile 0 side
            const c0 = this._parseColor(palette[tiles[0].colorId % palette.length]);
            const t0shift = t0FacesLight ? strength * 25 : -strength * 25;
            const col0 = this._shiftLightness(c0, t0shift);
            ctx.strokeStyle = `rgb(${col0[0]},${col0[1]},${col0[2]})`;
            ctx.beginPath();
            if (tile0OnPlusSide) {
                ctx.moveTo(x1 + nx, y1 + ny);
                ctx.lineTo(x2 + nx, y2 + ny);
            } else {
                ctx.moveTo(x1 - nx, y1 - ny);
                ctx.lineTo(x2 - nx, y2 - ny);
            }
            ctx.stroke();

            // Tile 1 side — only for interior edges
            if (tiles.length > 1) {
                const c1 = this._parseColor(palette[tiles[1].colorId % palette.length]);
                const t1shift = t0FacesLight ? -strength * 25 : strength * 25;
                const col1 = this._shiftLightness(c1, t1shift);
                ctx.strokeStyle = `rgb(${col1[0]},${col1[1]},${col1[2]})`;
                ctx.beginPath();
                if (tile0OnPlusSide) {
                    ctx.moveTo(x1 - nx, y1 - ny);
                    ctx.lineTo(x2 - nx, y2 - ny);
                } else {
                    ctx.moveTo(x1 + nx, y1 + ny);
                    ctx.lineTo(x2 + nx, y2 + ny);
                }
                ctx.stroke();
            }
        }
    }

    _parseColor(color) {
        // Handle hex (#rrggbb or #rgb) and rgb() strings
        if (color[0] === '#') {
            let hex = color.slice(1);
            if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
            return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
        }
        const m = color.match(/(\d+)/g);
        if (m) return [+m[0], +m[1], +m[2]];
        return [128, 128, 128];
    }

    _shiftLightness(rgb, amount) {
        // Convert RGB to HSL, shift L and desaturate, convert back
        let [r, g, b] = rgb.map(c => c / 255);
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            else if (max === g) h = ((b - r) / d + 2) / 6;
            else h = ((r - g) / d + 4) / 6;
        }

        // Shift lightness by amount (in percentage points, 0-100 scale)
        l = Math.max(0, Math.min(1, l + amount / 100));
        // Desaturate proportionally — shadows and highlights lose saturation
        s = Math.max(0, s * (1 - Math.abs(amount) / 100 * 0.6));

        // HSL to RGB
        if (s === 0) {
            const v = Math.round(l * 255);
            return [v, v, v];
        }
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        return [
            Math.round(hue2rgb(p, q, h + 1/3) * 255),
            Math.round(hue2rgb(p, q, h) * 255),
            Math.round(hue2rgb(p, q, h - 1/3) * 255)
        ];
    }

    // ─── Rounded Style ───────────────────────────────────────

    _drawRoundedRegions(board, palette, gutterFraction) {
        const { ctx, scale, offsetX, offsetY } = this;

        // Compute radius from first tile's edge length
        const t0 = board.tiles[0];
        const p0 = t0.points[0], p1 = t0.points[1];
        const edgeLen = Math.hypot((p1[0] - p0[0]) * scale, (p1[1] - p0[1]) * scale);
        const radius = edgeLen * 0.45;
        const gf = gutterFraction !== undefined ? gutterFraction : 0.04;
        const gutterHalf = Math.max(0, edgeLen * gf);

        // Find connected same-color regions and draw each as a rounded blob
        const regions = this._findColorRegions(board);

        for (const region of regions) {
            const color = palette[region.colorId % palette.length];
            const edges = this._regionBoundaryEdges(region.tiles);
            const paths = this._buildConnectedPaths(edges);

            // Fill all boundary loops as a single compound path with evenodd
            // so that interior holes are properly cut out.
            ctx.fillStyle = color;
            ctx.beginPath();
            for (const rawPts of paths) {
                this._addRoundedSubpath(rawPts, radius);
            }
            ctx.fill('evenodd');

            // Erase a thin stroke along all boundary loops for the gutter
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(255,255,255,1)';
            ctx.lineWidth = gutterHalf * 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (const rawPts of paths) {
                this._addRoundedSubpath(rawPts, radius);
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    _traceRoundedPath(rawPts, maxRadius) {
        const { ctx } = this;
        ctx.beginPath();
        this._addRoundedSubpath(rawPts, maxRadius);
    }

    _addRoundedSubpath(rawPts, maxRadius) {
        const { ctx, scale, offsetX, offsetY } = this;

        // Convert to screen coords
        let pts = rawPts.map(p => [p[0] * scale + offsetX, p[1] * scale + offsetY]);

        // Remove duplicate closing point
        if (pts.length > 1) {
            const f = pts[0], l = pts[pts.length - 1];
            if (Math.abs(f[0] - l[0]) < 0.5 && Math.abs(f[1] - l[1]) < 0.5) {
                pts = pts.slice(0, -1);
            }
        }
        if (pts.length < 3) return;

        const n = pts.length;

        // Precompute edge lengths
        const edgeLen = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            const a = pts[i], b = pts[(i + 1) % n];
            edgeLen[i] = Math.hypot(b[0] - a[0], b[1] - a[1]);
        }

        // Compute first corner's incoming tangent to set the start point
        const eBefore0 = edgeLen[(n - 1)];
        const eAfter0 = edgeLen[0];
        let r0 = Math.min(maxRadius, eBefore0 * 0.45, eAfter0 * 0.45);
        const prev0 = pts[n - 1], curr0 = pts[0], next0 = pts[1];
        const dx1_0 = prev0[0] - curr0[0], dy1_0 = prev0[1] - curr0[1];
        const angle0 = this._cornerAngle(prev0, curr0, next0);
        const cross0 = dx1_0 * (next0[1] - curr0[1]) - dy1_0 * (next0[0] - curr0[0]);
        if (angle0 < Math.PI / 2) r0 *= angle0 / (Math.PI / 2);
        if (cross0 > 0 && angle0 < Math.PI / 2) r0 *= angle0 / (Math.PI / 2);

        const cut0 = Math.min(r0, eBefore0 * 0.45);
        // Start at the incoming tangent of the first corner
        const startX = curr0[0] + (prev0[0] - curr0[0]) / eBefore0 * cut0;
        const startY = curr0[1] + (prev0[1] - curr0[1]) / eBefore0 * cut0;
        ctx.moveTo(startX, startY);

        for (let i = 0; i < n; i++) {
            const prev = pts[(i - 1 + n) % n];
            const curr = pts[i];
            const next = pts[(i + 1) % n];

            const eBef = edgeLen[(i - 1 + n) % n];
            const eAft = edgeLen[i];
            let r = Math.min(maxRadius, eBef * 0.45, eAft * 0.45);

            const angle = this._cornerAngle(prev, curr, next);
            const dx1 = prev[0] - curr[0], dy1 = prev[1] - curr[1];
            const cross = dx1 * (next[1] - curr[1]) - dy1 * (next[0] - curr[0]);
            if (angle < Math.PI / 2) r *= angle / (Math.PI / 2);
            if (cross > 0 && angle < Math.PI / 2) r *= angle / (Math.PI / 2);

            const cutIn = Math.min(r, eBef * 0.45);
            const cutOut = Math.min(r, eAft * 0.45);

            // Tangent point on incoming edge
            const inX = curr[0] + (prev[0] - curr[0]) / eBef * cutIn;
            const inY = curr[1] + (prev[1] - curr[1]) / eBef * cutIn;
            // Tangent point on outgoing edge
            const outX = curr[0] + (next[0] - curr[0]) / eAft * cutOut;
            const outY = curr[1] + (next[1] - curr[1]) / eAft * cutOut;

            // Line to incoming tangent, then curve around corner
            ctx.lineTo(inX, inY);
            ctx.quadraticCurveTo(curr[0], curr[1], outX, outY);
        }
        ctx.closePath();
    }

    _cornerAngle(prev, curr, next) {
        const dx1 = prev[0] - curr[0], dy1 = prev[1] - curr[1];
        const dx2 = next[0] - curr[0], dy2 = next[1] - curr[1];
        const dot = dx1 * dx2 + dy1 * dy2;
        const cross = dx1 * dy2 - dy1 * dx2;
        return Math.atan2(Math.abs(cross), dot);
    }

    _findColorRegions(board) {
        const visited = new Set();
        const regions = [];
        for (const tile of board.tiles) {
            if (visited.has(tile.id)) continue;
            const region = [];
            const queue = [tile];
            visited.add(tile.id);
            while (queue.length > 0) {
                const t = queue.shift();
                region.push(t);
                for (const nid of t.neighbors) {
                    if (visited.has(nid)) continue;
                    const nb = board.tiles[nid];
                    if (nb.colorId === tile.colorId) {
                        visited.add(nid);
                        queue.push(nb);
                    }
                }
            }
            regions.push({ colorId: tile.colorId, tiles: region });
        }
        return regions;
    }

    _regionBoundaryEdges(tiles) {
        const edgeCount = new Map();
        for (const tile of tiles) {
            const pts = tile.points;
            for (let i = 0; i < pts.length; i++) {
                const p1 = pts[i];
                const p2 = pts[(i + 1) % pts.length];
                const key = this._edgeKey(p1, p2);
                if (edgeCount.has(key)) {
                    edgeCount.get(key).count++;
                } else {
                    edgeCount.set(key, { p1, p2, count: 1 });
                }
            }
        }
        const boundary = [];
        for (const [, edge] of edgeCount) {
            if (edge.count === 1) boundary.push(edge);
        }
        return boundary;
    }

    _buildConnectedPaths(boundaryEdges) {
        // Build adjacency map: pointKey → [{idx, otherPt, otherKey}]
        const adj = new Map();
        for (let i = 0; i < boundaryEdges.length; i++) {
            const e = boundaryEdges[i];
            const k1 = this._pointKey(e.p1);
            const k2 = this._pointKey(e.p2);
            if (!adj.has(k1)) adj.set(k1, []);
            if (!adj.has(k2)) adj.set(k2, []);
            adj.get(k1).push({ idx: i, otherPt: e.p2, otherKey: k2 });
            adj.get(k2).push({ idx: i, otherPt: e.p1, otherKey: k1 });
        }

        const visited = new Set();
        const paths = [];

        for (let i = 0; i < boundaryEdges.length; i++) {
            if (visited.has(i)) continue;
            visited.add(i);

            const e = boundaryEdges[i];
            const points = [e.p1, e.p2];

            // Extend forward from last point
            let extended = true;
            while (extended) {
                extended = false;
                const key = this._pointKey(points[points.length - 1]);
                const neighbors = adj.get(key);
                if (!neighbors) break;
                for (const n of neighbors) {
                    if (!visited.has(n.idx)) {
                        visited.add(n.idx);
                        points.push(n.otherPt);
                        extended = true;
                        break;
                    }
                }
            }

            // Extend backward from first point
            extended = true;
            while (extended) {
                extended = false;
                const key = this._pointKey(points[0]);
                const neighbors = adj.get(key);
                if (!neighbors) break;
                for (const n of neighbors) {
                    if (!visited.has(n.idx)) {
                        visited.add(n.idx);
                        points.unshift(n.otherPt);
                        extended = true;
                        break;
                    }
                }
            }

            paths.push(points);
        }

        return paths;
    }

    // ─── Helpers ─────────────────────────────────────────────

    _edgeKey(p1, p2) {
        const k1 = this._pointKey(p1);
        const k2 = this._pointKey(p2);
        return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
    }

    _pointKey(p) {
        return `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
    }
}
