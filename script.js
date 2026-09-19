/* ============================================================
   Etch-a-Sketch
   ------------------------------------------------------------
   The drawing lives in two typed arrays (the model), never in
   the DOM: `colors` holds a packed 0xRRGGBB per cell (-1 = blank)
   and `levels` holds the shade depth per cell. The DOM grid is
   only a view that gets repainted cell by cell, which is what
   makes undo/redo, resizing without losing the art, autosave
   and PNG export straightforward.

   No build step, no dependencies: open index.html and draw.
   ============================================================ */
(() => {
  'use strict';

  // ---------- constants ----------
  const BLANK = -1;             // "no ink": the aluminium screen shows through
  const SHADE_STEPS = 8;        // passes needed for shade mode to reach full colour
  const MAX_HISTORY = 60;
  const MAX_CELLS_ANIMATED = 40 * 40;
  const STORE_ART = 'etch-a-sketch/art-v1';
  const STORE_PREFS = 'etch-a-sketch/prefs-v1';

  const TOOLS = [
    { id: 'pen',     label: 'Pen',     icon: 'i-pen' },
    { id: 'rainbow', label: 'Rainbow', icon: 'i-rainbow' },
    { id: 'shade',   label: 'Shade',   icon: 'i-shade' },
    { id: 'fill',    label: 'Fill',    icon: 'i-fill' },
    { id: 'pick',    label: 'Pick',    icon: 'i-pick' },
    { id: 'eraser',  label: 'Eraser',  icon: 'i-eraser' },
  ];
  // the knob cycles the painting tools only — the eyedropper is a detour
  const KNOB_CYCLE = ['pen', 'rainbow', 'shade', 'fill', 'eraser'];
  const TOOLS_WITHOUT_COLOUR = ['rainbow', 'eraser'];

  const SYMMETRIES = [
    { id: 'none',       glyph: '•', label: 'No symmetry' },
    { id: 'vertical',   glyph: '↔', label: 'Mirror left and right' },
    { id: 'horizontal', glyph: '↕', label: 'Mirror top and bottom' },
    { id: 'quad',       glyph: '✛', label: 'Mirror in four' },
    { id: 'kaleido',    glyph: '✻', label: 'Kaleidoscope, eight ways' },
  ];

  const PALETTE = [
    '#232323', '#ffffff', '#d6293b', '#f2b705', '#2ea44f',
    '#2f6fed', '#8b5cf6', '#ff7bb0', '#00b3ac', '#8b5e34',
  ];

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);

  const gridEl = $('grid');
  const screenEl = $('screen');
  const readoutTool = $('readoutTool');
  const readoutSize = $('readoutSize');
  const toolKnob = $('toolKnob');
  const clearKnob = $('clearKnob');
  const toolGrid = $('toolGrid');
  const colorBlock = $('colorBlock');
  const colorPicker = $('colorPicker');
  const swatchesEl = $('swatches');
  const brushInput = $('brushSize');
  const brushValue = $('brushSizeValue');
  const sizeInput = $('gridSize');
  const sizeValue = $('gridSizeValue');
  const symmetryEl = $('symmetry');
  const gridLinesToggle = $('gridLines');
  const darkModeToggle = $('darkMode');
  const undoBtn = $('undoBtn');
  const redoBtn = $('redoBtn');
  const clearBtn = $('clearBtn');
  const downloadBtn = $('downloadBtn');
  const copyBtn = $('copyBtn');
  const toastEl = $('toast');

  // ---------- state ----------
  const state = {
    size: 24,
    colors: new Int32Array(24 * 24).fill(BLANK),
    levels: new Uint8Array(24 * 24),
    tool: 'pen',
    lastPaintTool: 'pen',
    penColor: '#232323',
    brush: 1,
    symmetry: 'none',
    gridLines: false,
    theme: 'light',
    hue: Math.random() * 360,
    // transient
    cells: [],            // cached cell elements
    drawing: false,
    lastCell: null,       // { r, c } of the previous point in this stroke
    stampColor: 0,        // colour resolved once per stamp, so mirrors match
    cursor: { r: 0, c: 0 },
    keyStroking: false,
    screenBase: 0xcfcfc8,
  };

  const history = { undo: [], redo: [] };

  // ============================================================
  // colour helpers — colours travel as packed 0xRRGGBB integers
  // ============================================================
  function packHex(hex) {
    let h = String(hex).trim().replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return Number.isFinite(n) ? n & 0xffffff : 0;
  }

  function toHex(packed) {
    return '#' + (packed & 0xffffff).toString(16).padStart(6, '0');
  }

  function toCss(packed) {
    return `rgb(${(packed >> 16) & 255},${(packed >> 8) & 255},${packed & 255})`;
  }

  function mixPacked(from, to, t) {
    const r = Math.round(((from >> 16) & 255) + ((((to >> 16) & 255) - ((from >> 16) & 255)) * t));
    const g = Math.round(((from >> 8) & 255) + ((((to >> 8) & 255) - ((from >> 8) & 255)) * t));
    const b = Math.round((from & 255) + (((to & 255) - (from & 255)) * t));
    return (r << 16) | (g << 8) | b;
  }

  function hslPacked(h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
      const k = (n + h / 30) % 12;
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    return (f(0) << 16) | (f(8) << 8) | f(4);
  }

  /** The blank-screen colour, read from CSS so light and night themes agree. */
  function refreshScreenBase() {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--screen-base').trim();
    state.screenBase = raw ? packHex(raw) : 0xcfcfc8;
  }

  // ============================================================
  // grid: build the view, then only ever repaint single cells
  // ============================================================
  function buildGrid(size) {
    state.size = size;
    gridEl.style.setProperty('--size', size);
    gridEl.innerHTML = '<div class="cell"></div>'.repeat(size * size);
    gridEl.classList.toggle('animate', size * size <= MAX_CELLS_ANIMATED);
    state.cells = Array.from(gridEl.children);
    state.cursor.r = Math.min(state.cursor.r, size - 1);
    state.cursor.c = Math.min(state.cursor.c, size - 1);
    renderAll();
    readoutSize.textContent = `${size}×${size}`;
  }

  function renderCell(i) {
    const v = state.colors[i];
    // an empty background lets the aluminium gradient of the screen show through
    state.cells[i].style.backgroundColor = v === BLANK ? '' : toCss(v);
  }

  function renderAll() {
    for (let i = 0; i < state.colors.length; i++) renderCell(i);
  }

  function setCell(i, packed, level) {
    if (state.colors[i] === packed && state.levels[i] === level) return;
    state.colors[i] = packed;
    state.levels[i] = level;
    renderCell(i);
  }

  // ============================================================
  // painting
  // ============================================================
  /** Every place a single dab lands, once symmetry is applied. */
  function mirrorsOf(r, c) {
    const last = state.size - 1;
    const out = [[r, c]];
    const s = state.symmetry;
    if (s === 'vertical' || s === 'quad' || s === 'kaleido') out.push([r, last - c]);
    if (s === 'horizontal' || s === 'quad' || s === 'kaleido') out.push([last - r, c]);
    if (s === 'quad' || s === 'kaleido') out.push([last - r, last - c]);
    if (s === 'kaleido') out.push([c, r], [c, last - r], [last - c, r], [last - c, last - r]);
    return out;
  }

  function applyToolToCell(r, c) {
    if (r < 0 || c < 0 || r >= state.size || c >= state.size) return;
    const i = r * state.size + c;

    switch (state.tool) {
      case 'pen':
      case 'rainbow':
        setCell(i, state.stampColor, SHADE_STEPS);
        break;
      case 'shade': {
        const level = Math.min(SHADE_STEPS, state.levels[i] + 1);
        setCell(i, mixPacked(state.screenBase, state.stampColor, level / SHADE_STEPS), level);
        break;
      }
      case 'eraser':
        setCell(i, BLANK, 0);
        break;
      default:
        break;
    }
  }

  /** One dab of the brush at (r, c), mirrored and sized. */
  function stamp(r, c) {
    if (state.tool === 'rainbow') {
      state.hue = (state.hue + 11) % 360;
      state.stampColor = hslPacked(state.hue, 0.82, 0.58);
    } else {
      state.stampColor = packHex(state.penColor);
    }

    const reach = state.brush - 1;
    for (const [mr, mc] of mirrorsOf(r, c)) {
      for (let dr = -reach; dr <= reach; dr++) {
        for (let dc = -reach; dc <= reach; dc++) {
          applyToolToCell(mr + dr, mc + dc);
        }
      }
    }
  }

  /**
   * Pointer events arrive far apart on a fast drag, so walk the line
   * between the last point and this one (Bresenham) instead of leaving
   * a dotted trail.
   */
  function strokeTo(r, c) {
    const from = state.lastCell;
    if (!from) { stamp(r, c); state.lastCell = { r, c }; return; }

    let r0 = from.r, c0 = from.c;
    const dr = Math.abs(r - r0), dc = Math.abs(c - c0);
    const sr = r0 < r ? 1 : -1, sc = c0 < c ? 1 : -1;
    let err = dc - dr;

    for (;;) {
      stamp(r0, c0);
      if (r0 === r && c0 === c) break;
      const e2 = 2 * err;
      if (e2 > -dr) { err -= dr; c0 += sc; }
      if (e2 < dc) { err += dc; r0 += sr; }
    }
    state.lastCell = { r, c };
  }

  /** Flood fill from a seed, 4-connected, matching the exact cell colour. */
  function floodFill(r, c) {
    const size = state.size;
    const target = state.colors[r * size + c];
    const replacement = packHex(state.penColor);
    if (target === replacement) return;

    const stack = [r * size + c];
    const seen = new Uint8Array(size * size);
    seen[stack[0]] = 1;

    while (stack.length) {
      const i = stack.pop();
      if (state.colors[i] !== target) continue;
      setCell(i, replacement, SHADE_STEPS);

      const cr = (i / size) | 0, cc = i % size;
      if (cr > 0 && !seen[i - size]) { seen[i - size] = 1; stack.push(i - size); }
      if (cr < size - 1 && !seen[i + size]) { seen[i + size] = 1; stack.push(i + size); }
      if (cc > 0 && !seen[i - 1]) { seen[i - 1] = 1; stack.push(i - 1); }
      if (cc < size - 1 && !seen[i + 1]) { seen[i + 1] = 1; stack.push(i + 1); }
    }
  }

  function pickColour(r, c) {
    const v = state.colors[r * state.size + c];
    setPenColour(toHex(v === BLANK ? state.screenBase : v));
    toast('Colour picked');
    if (state.tool === 'pick') setTool(state.lastPaintTool);
  }

  // ============================================================
  // history
  // ============================================================
  function snapshot() {
    return {
      size: state.size,
      colors: state.colors.slice(),
      levels: state.levels.slice(),
    };
  }

  function restore(snap) {
    state.colors = snap.colors.slice();
    state.levels = snap.levels.slice();
    if (snap.size !== state.size) buildGrid(snap.size);
    else renderAll();
    sizeInput.value = snap.size;
    sizeValue.textContent = `${snap.size} × ${snap.size}`;
    readoutSize.textContent = `${snap.size}×${snap.size}`;
  }

  function pushHistory(snap) {
    history.undo.push(snap || snapshot());
    if (history.undo.length > MAX_HISTORY) history.undo.shift();
    history.redo.length = 0;
    updateHistoryButtons();
  }

  function undo() {
    if (!history.undo.length) return;
    history.redo.push(snapshot());
    restore(history.undo.pop());
    updateHistoryButtons();
    scheduleSave();
  }

  function redo() {
    if (!history.redo.length) return;
    history.undo.push(snapshot());
    restore(history.redo.pop());
    updateHistoryButtons();
    scheduleSave();
  }

  function updateHistoryButtons() {
    undoBtn.disabled = history.undo.length === 0;
    redoBtn.disabled = history.redo.length === 0;
  }

  // ============================================================
  // pointer drawing
  // ============================================================
  function cellFromPointer(e) {
    const rect = gridEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * state.size);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * state.size);
    if (r < 0 || c < 0 || r >= state.size || c >= state.size) return null;
    return { r, c };
  }

  gridEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const at = cellFromPointer(e);
    if (!at) return;
    e.preventDefault();
    gridEl.focus({ preventScroll: true });

    // Alt turns any tool into an eyedropper for one click
    if (e.altKey || state.tool === 'pick') { pickColour(at.r, at.c); return; }

    pushHistory();

    if (state.tool === 'fill') {
      for (const [mr, mc] of mirrorsOf(at.r, at.c)) floodFill(mr, mc);
      scheduleSave();
      return;
    }

    state.drawing = true;
    state.lastCell = null;
    try { gridEl.setPointerCapture(e.pointerId); } catch { /* not critical */ }
    strokeTo(at.r, at.c);
    moveCursor(at.r, at.c);
  });

  gridEl.addEventListener('pointermove', (e) => {
    if (!state.drawing) return;
    const at = cellFromPointer(e);
    if (!at) { state.lastCell = null; return; }  // left the screen: break the line
    strokeTo(at.r, at.c);
    moveCursor(at.r, at.c);
  });

  function endStroke() {
    if (!state.drawing) return;
    state.drawing = false;
    state.lastCell = null;
    scheduleSave();
  }

  gridEl.addEventListener('pointerup', endStroke);
  gridEl.addEventListener('pointercancel', endStroke);
  window.addEventListener('pointerup', endStroke);
  window.addEventListener('blur', endStroke);

  // ============================================================
  // keyboard drawing — the grid is reachable with Tab
  // ============================================================
  function moveCursor(r, c) {
    const prev = state.cursor.r * state.size + state.cursor.c;
    if (state.cells[prev]) state.cells[prev].classList.remove('is-cursor');
    state.cursor.r = Math.max(0, Math.min(state.size - 1, r));
    state.cursor.c = Math.max(0, Math.min(state.size - 1, c));
    if (document.activeElement === gridEl) showCursor();
  }

  function showCursor() {
    const i = state.cursor.r * state.size + state.cursor.c;
    if (state.cells[i]) state.cells[i].classList.add('is-cursor');
  }

  function hideCursor() {
    const i = state.cursor.r * state.size + state.cursor.c;
    if (state.cells[i]) state.cells[i].classList.remove('is-cursor');
  }

  gridEl.addEventListener('focus', showCursor);
  gridEl.addEventListener('blur', () => { hideCursor(); state.keyStroking = false; });

  gridEl.addEventListener('keydown', (e) => {
    const step = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];

    if (step) {
      e.preventDefault();
      const r = state.cursor.r + step[0] * (e.ctrlKey ? 5 : 1);
      const c = state.cursor.c + step[1] * (e.ctrlKey ? 5 : 1);
      if (e.shiftKey) {                       // shift + arrows = draw while moving
        if (!state.keyStroking) { pushHistory(); state.keyStroking = true; state.lastCell = null; }
        moveCursor(r, c);
        strokeTo(state.cursor.r, state.cursor.c);
        scheduleSave();
      } else {
        moveCursor(r, c);
      }
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const { r, c } = state.cursor;
      if (state.tool === 'pick') { pickColour(r, c); return; }
      if (!state.keyStroking) { pushHistory(); state.keyStroking = true; state.lastCell = null; }
      if (state.tool === 'fill') {
        for (const [mr, mc] of mirrorsOf(r, c)) floodFill(mr, mc);
      } else {
        stamp(r, c);
      }
      scheduleSave();
    }
  });

  gridEl.addEventListener('keyup', (e) => {
    if (e.key === 'Shift' || e.key === 'Enter' || e.key === ' ') {
      state.keyStroking = false;
      state.lastCell = null;
    }
  });

  // ============================================================
  // tools & controls
  // ============================================================
  function setTool(id) {
    state.tool = id;
    if (id !== 'pick') state.lastPaintTool = id;

    for (const btn of toolGrid.children) {
      btn.setAttribute('aria-pressed', String(btn.dataset.tool === id));
    }
    readoutTool.textContent = id.toUpperCase();
    // the colour controls do nothing for rainbow and eraser: say so
    colorBlock.style.opacity = TOOLS_WITHOUT_COLOUR.includes(id) ? '0.45' : '1';
    gridEl.classList.toggle('is-picking', id === 'pick');
    savePrefs();
  }

  function setPenColour(hex) {
    state.penColor = hex;
    colorPicker.value = hex;
    const packed = packHex(hex);
    for (const btn of swatchesEl.children) {
      btn.setAttribute('aria-pressed', String(packHex(btn.dataset.color) === packed));
    }
    savePrefs();
  }

  function setSymmetry(id) {
    state.symmetry = id;
    for (const btn of symmetryEl.children) {
      btn.setAttribute('aria-pressed', String(btn.dataset.symmetry === id));
    }
    savePrefs();
  }

  function setTheme(theme) {
    state.theme = theme;
    document.documentElement.dataset.theme = theme;
    darkModeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    refreshScreenBase();
    savePrefs();
  }

  function setGridLines(on) {
    state.gridLines = on;
    gridLinesToggle.setAttribute('aria-pressed', String(on));
    gridEl.classList.toggle('show-lines', on);
    savePrefs();
  }

  function setBrush(n) {
    state.brush = n;
    brushInput.value = n;
    brushValue.textContent = n;
    savePrefs();
  }

  function clearScreen() {
    // the screen always shakes — it is the whole joke — but an empty
    // screen is not worth a history entry
    screenEl.classList.remove('shake');
    void screenEl.offsetWidth;
    screenEl.classList.add('shake');

    if (state.colors.every((v) => v === BLANK)) return;
    pushHistory();
    state.colors.fill(BLANK);
    state.levels.fill(0);
    renderAll();
    scheduleSave();
  }

  function spin(knob) {
    knob.classList.remove('spin');
    void knob.offsetWidth;
    knob.classList.add('spin');
  }

  // ---------- build the tool buttons ----------
  for (const tool of TOOLS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tool';
    btn.dataset.tool = tool.id;
    btn.setAttribute('aria-pressed', 'false');
    btn.title = `${tool.label} (${TOOLS.indexOf(tool) + 1})`;
    btn.innerHTML = `<svg aria-hidden="true"><use href="#${tool.icon}"></use></svg><span>${tool.label}</span>`;
    btn.addEventListener('click', () => setTool(tool.id));
    toolGrid.appendChild(btn);
  }

  // ---------- build the swatches ----------
  for (const hex of PALETTE) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.dataset.color = hex;
    btn.style.background = hex;
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', `Use colour ${hex}`);
    btn.title = hex;
    btn.addEventListener('click', () => {
      setPenColour(hex);
      if (TOOLS_WITHOUT_COLOUR.includes(state.tool)) setTool('pen');
    });
    swatchesEl.appendChild(btn);
  }

  // ---------- build the symmetry control ----------
  for (const sym of SYMMETRIES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.symmetry = sym.id;
    btn.textContent = sym.glyph;
    btn.title = sym.label;
    btn.setAttribute('aria-label', sym.label);
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => setSymmetry(sym.id));
    symmetryEl.appendChild(btn);
  }

  // ---------- wiring ----------
  toolKnob.addEventListener('click', () => {
    const base = KNOB_CYCLE.includes(state.tool) ? state.tool : state.lastPaintTool;
    setTool(KNOB_CYCLE[(KNOB_CYCLE.indexOf(base) + 1) % KNOB_CYCLE.length]);
    spin(toolKnob);
  });

  clearKnob.addEventListener('click', () => { spin(clearKnob); clearScreen(); });
  clearBtn.addEventListener('click', clearScreen);
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);

  colorPicker.addEventListener('input', () => {
    setPenColour(colorPicker.value);
    if (TOOLS_WITHOUT_COLOUR.includes(state.tool)) setTool('pen');
  });

  brushInput.addEventListener('input', () => setBrush(Number(brushInput.value)));

  // Resizing resamples the art instead of wiping it. While the slider is
  // being dragged every step resamples from the same original, so sliding
  // back and forth does not erode the drawing.
  let resizeBase = null;
  let resizePending = 0;

  function beginResize() { if (!resizeBase) resizeBase = snapshot(); }

  function resample(src, n) {
    const colors = new Int32Array(n * n).fill(BLANK);
    const levels = new Uint8Array(n * n);
    for (let r = 0; r < n; r++) {
      const sr = Math.min(src.size - 1, Math.floor((r * src.size) / n));
      for (let c = 0; c < n; c++) {
        const sc = Math.min(src.size - 1, Math.floor((c * src.size) / n));
        colors[r * n + c] = src.colors[sr * src.size + sc];
        levels[r * n + c] = src.levels[sr * src.size + sc];
      }
    }
    return { size: n, colors, levels };
  }

  function applyResize(n) {
    const src = resizeBase || snapshot();
    const next = resample(src, n);
    state.colors = next.colors;
    state.levels = next.levels;
    buildGrid(n);
  }

  sizeInput.addEventListener('pointerdown', beginResize);
  sizeInput.addEventListener('keydown', beginResize);

  sizeInput.addEventListener('input', () => {
    const n = Number(sizeInput.value);
    sizeValue.textContent = `${n} × ${n}`;
    beginResize();
    cancelAnimationFrame(resizePending);
    resizePending = requestAnimationFrame(() => applyResize(n));
  });

  sizeInput.addEventListener('change', () => {
    if (resizeBase && resizeBase.size !== state.size) pushHistory(resizeBase);
    resizeBase = null;
    savePrefs();
    scheduleSave();
  });

  gridLinesToggle.addEventListener('click', () => setGridLines(!state.gridLines));
  darkModeToggle.addEventListener('click', () => setTheme(state.theme === 'dark' ? 'light' : 'dark'));

  // ============================================================
  // export
  // ============================================================
  function renderToCanvas() {
    const size = state.size;
    const cellPx = Math.max(6, Math.round(1400 / size));
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size * cellPx;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = toCss(state.screenBase);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < state.colors.length; i++) {
      const v = state.colors[i];
      if (v === BLANK) continue;
      ctx.fillStyle = toCss(v);
      ctx.fillRect(((i % size) * cellPx), (((i / size) | 0) * cellPx), cellPx, cellPx);
    }
    return canvas;
  }

  function fileStamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  }

  downloadBtn.addEventListener('click', () => {
    renderToCanvas().toBlob((blob) => {
      if (!blob) { toast('Could not export the drawing'); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `etch-a-sketch-${fileStamp()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Saved as PNG');
    }, 'image/png');
  });

  copyBtn.addEventListener('click', async () => {
    try {
      const blob = await new Promise((res) => renderToCanvas().toBlob(res, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('Image copied to the clipboard');
    } catch {
      // Safari, file:// pages and older browsers block this — say so plainly
      toast('Clipboard blocked here — use Save as PNG');
    }
  });

  // ============================================================
  // persistence — drawing and preferences survive a reload
  // ============================================================
  let saveTimer = 0;

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveArt, 500);
  }

  function encodeArt() {
    const out = [];
    let run = 0;
    let cur = null;
    for (let i = 0; i < state.colors.length; i++) {
      const key = state.colors[i] + '.' + state.levels[i];
      if (key === cur) { run++; continue; }
      if (cur !== null) out.push(run + '*' + cur);
      cur = key;
      run = 1;
    }
    if (cur !== null) out.push(run + '*' + cur);
    return state.size + '|' + out.join(',');
  }

  function decodeArt(str) {
    const bar = String(str).indexOf('|');
    if (bar < 0) return null;
    const size = Number(str.slice(0, bar));
    if (!Number.isInteger(size) || size < 8 || size > 80) return null;

    const total = size * size;
    const colors = new Int32Array(total).fill(BLANK);
    const levels = new Uint8Array(total);
    const body = str.slice(bar + 1);
    let i = 0;

    if (body) {
      for (const chunk of body.split(',')) {
        const star = chunk.indexOf('*');
        const dot = chunk.indexOf('.', star);
        if (star < 0 || dot < 0) return null;
        const run = Number(chunk.slice(0, star));
        const colour = Number(chunk.slice(star + 1, dot));
        const level = Number(chunk.slice(dot + 1));
        if (!Number.isFinite(run) || !Number.isFinite(colour) || !Number.isFinite(level)) return null;
        for (let k = 0; k < run && i < total; k++, i++) {
          colors[i] = colour;
          levels[i] = level;
        }
      }
    }
    return i === total ? { size, colors, levels } : null;
  }

  function saveArt() {
    try { localStorage.setItem(STORE_ART, encodeArt()); } catch { /* private mode, quota */ }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORE_PREFS, JSON.stringify({
        tool: state.tool,
        penColor: state.penColor,
        brush: state.brush,
        symmetry: state.symmetry,
        gridLines: state.gridLines,
        theme: state.theme,
      }));
    } catch { /* ignore */ }
  }

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORE_PREFS);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function loadArt() {
    try {
      const raw = localStorage.getItem(STORE_ART);
      return raw ? decodeArt(raw) : null;
    } catch { return null; }
  }

  // ============================================================
  // global shortcuts
  // ============================================================
  document.addEventListener('keydown', (e) => {
    const el = document.activeElement;
    const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); downloadBtn.click(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || typing) return;

    switch (e.key.toLowerCase()) {
      case '1': case '2': case '3': case '4': case '5': case '6':
        setTool(TOOLS[Number(e.key) - 1].id);
        break;
      case 'm':
        toolKnob.click();
        break;
      case 'x': {
        const idx = SYMMETRIES.findIndex((s) => s.id === state.symmetry);
        setSymmetry(SYMMETRIES[(idx + 1) % SYMMETRIES.length].id);
        toast(SYMMETRIES[(idx + 1) % SYMMETRIES.length].label);
        break;
      }
      case '[': setBrush(Math.max(1, state.brush - 1)); break;
      case ']': setBrush(Math.min(6, state.brush + 1)); break;
      case 'g': setGridLines(!state.gridLines); break;
      case 'n': setTheme(state.theme === 'dark' ? 'light' : 'dark'); break;
      case 'c': clearScreen(); break;
      default: break;
    }
  });

  // ============================================================
  // toast
  // ============================================================
  let toastTimer = 0;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1900);
  }

  // ============================================================
  // init
  // ============================================================
  function init() {
    const prefs = loadPrefs();
    const prefersDark = window.matchMedia
      && window.matchMedia('(prefers-color-scheme: dark)').matches;

    setTheme(prefs && prefs.theme ? prefs.theme : (prefersDark ? 'dark' : 'light'));
    refreshScreenBase();

    setPenColour(prefs && prefs.penColor
      ? prefs.penColor
      : (state.theme === 'dark' ? '#ffffff' : '#232323'));
    setBrush(prefs && prefs.brush ? Math.min(6, Math.max(1, prefs.brush)) : 1);
    setSymmetry(prefs && prefs.symmetry ? prefs.symmetry : 'none');
    setGridLines(prefs ? Boolean(prefs.gridLines) : false);
    setTool(prefs && prefs.tool && prefs.tool !== 'pick' ? prefs.tool : 'pen');

    const art = loadArt();
    if (art) {
      state.colors = art.colors;
      state.levels = art.levels;
      sizeInput.value = art.size;
      sizeValue.textContent = `${art.size} × ${art.size}`;
      buildGrid(art.size);
    } else {
      buildGrid(Number(sizeInput.value));
    }

    updateHistoryButtons();

    // follow the OS theme until the user picks one explicitly
    if (!prefs || !prefs.theme) {
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', (ev) => setTheme(ev.matches ? 'dark' : 'light'));
    }

    window.addEventListener('beforeunload', saveArt);
  }

  init();
})();
