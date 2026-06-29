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
            this._drawRoundedRegions(board, palette);
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
            this.drawEmbossedBoundaries(colorEdges);
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

    drawEmbossedBoundaries(edges) {
        const { ctx, scale, offsetX, offsetY } = this;
        const d = 1.5 / this.dpr;

        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';

        // Highlight pass (bottom-right) — light from top-left makes raised edges bright here
        ctx.strokeStyle = 'rgba(255,255,255,0.30)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (const e of edges) {
            ctx.moveTo(e.p1[0] * scale + offsetX + d, e.p1[1] * scale + offsetY + d);
            ctx.lineTo(e.p2[0] * scale + offsetX + d, e.p2[1] * scale + offsetY + d);
        }
        ctx.stroke();

        // Shadow pass (top-left) — raised surface casts shadow on this side
        ctx.strokeStyle = 'rgba(0,0,0,0.40)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (const e of edges) {
            ctx.moveTo(e.p1[0] * scale + offsetX - d, e.p1[1] * scale + offsetY - d);
            ctx.lineTo(e.p2[0] * scale + offsetX - d, e.p2[1] * scale + offsetY - d);
        }
        ctx.stroke();
    }

    // ─── Rounded Style ───────────────────────────────────────

    _drawRoundedRegions(board, palette) {
        const { ctx, scale, offsetX, offsetY } = this;

        // Compute radius from first tile's edge length (≈ half tile size)
        const t0 = board.tiles[0];
        const p0 = t0.points[0], p1 = t0.points[1];
        const edgeLen = Math.hypot((p1[0] - p0[0]) * scale, (p1[1] - p0[1]) * scale);
        const radius = edgeLen * 0.45;
        const gutterHalf = Math.max(1, edgeLen * 0.04);

        // Find connected same-color regions and draw each as a rounded blob
        const regions = this._findColorRegions(board);

        for (const region of regions) {
            const color = palette[region.colorId % palette.length];
            const edges = this._regionBoundaryEdges(region.tiles);
            const paths = this._buildConnectedPaths(edges);

            for (const rawPts of paths) {
                // Fill the rounded region
                ctx.fillStyle = color;
                this._traceRoundedPath(rawPts, radius);
                ctx.fill();

                // Erase a thin stroke along the SAME rounded path for the gutter
                ctx.save();
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(255,255,255,1)';
                ctx.lineWidth = gutterHalf * 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                this._traceRoundedPath(rawPts, radius);
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    _traceRoundedPath(rawPts, maxRadius) {
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

        ctx.beginPath();
        // Start from midpoint of last→first edge
        ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
        for (let i = 0; i < n; i++) {
            const curr = pts[i];
            const next = pts[(i + 1) % n];
            // Cap radius by half the shorter adjacent edge
            const eBefore = edgeLen[(i - 1 + n) % n];
            const eAfter = edgeLen[i];
            const r = Math.min(maxRadius, eBefore * 0.45, eAfter * 0.45);
            ctx.arcTo(curr[0], curr[1], next[0], next[1], r);
        }
        ctx.closePath();
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
