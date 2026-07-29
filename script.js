// ============================================================
// Etch-a-Sketch — state
// ============================================================
const gridEl = document.getElementById('grid');
const screenEl = document.getElementById('screen');
const readoutEl = document.getElementById('readout');
 
const modeKnob = document.getElementById('modeKnob');
const clearKnob = document.getElementById('clearKnob');
 
const colorPicker = document.getElementById('colorPicker');
const colorControl = document.getElementById('colorControl');
const brushSizeInput = document.getElementById('brushSize');
const brushSizeValue = document.getElementById('brushSizeValue');
const gridSizeInput = document.getElementById('gridSize');
const gridSizeValue = document.getElementById('gridSizeValue');
const gridLinesToggle = document.getElementById('gridLines');
const darkModeToggle = document.getElementById('darkMode');
const downloadBtn = document.getElementById('downloadBtn');
 
const MODES = ['color', 'rainbow', 'shade', 'eraser'];
const SHADE_STEPS = 8;
 
const state = {
  mode: 'color',
  penColor: colorPicker.value,
  brush: 1,
  size: 24,
  isPointerDown: false,
  gridLines: false,
};
 
// screen base colour, used as the "blank" state and as the
// starting point for the shade mode's darkening blend
const SCREEN_BASE = { r: 201, g: 201, b: 194 };
 
// ============================================================
// helpers
// ============================================================
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
 
function rgbToCss({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}
 
function mix(from, to, t) {
  return {
    r: Math.round(from.r + (to.r - from.r) * t),
    g: Math.round(from.g + (to.g - from.g) * t),
    b: Math.round(from.b + (to.b - from.b) * t),
  };
}
 
function randomRgb() {
  return {
    r: Math.floor(Math.random() * 256),
    g: Math.floor(Math.random() * 256),
    b: Math.floor(Math.random() * 256),
  };
}
 
// ============================================================
// grid
// ============================================================
function buildGrid(size) {
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  gridEl.style.gridTemplateRows = `repeat(${size}, 1fr)`;
 
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cell = document.createElement('div');
      cell.className = 'grid-square';
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.dataset.level = '0';
      cell.style.backgroundColor = rgbToCss(SCREEN_BASE);
      gridEl.appendChild(cell);
    }
  }
}
 
function getCell(row, col) {
  if (row < 0 || col < 0 || row >= state.size || col >= state.size) return null;
  return gridEl.children[row * state.size + col] || null;
}
 
function paintCell(cell) {
  if (!cell) return;
 
  if (state.mode === 'color') {
    cell.style.backgroundColor = state.penColor;
    cell.dataset.level = String(SHADE_STEPS);
  } else if (state.mode === 'rainbow') {
    cell.style.backgroundColor = rgbToCss(randomRgb());
  } else if (state.mode === 'shade') {
    const level = Math.min(SHADE_STEPS, parseInt(cell.dataset.level, 10) + 1);
    cell.dataset.level = String(level);
    const target = hexToRgb(state.penColor);
    cell.style.backgroundColor = rgbToCss(mix(SCREEN_BASE, target, level / SHADE_STEPS));
  } else if (state.mode === 'eraser') {
    cell.style.backgroundColor = rgbToCss(SCREEN_BASE);
    cell.dataset.level = '0';
  }
}
 
function paintAt(row, col) {
  const radius = state.brush - 1;
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      paintCell(getCell(row + dr, col + dc));
    }
  }
}
 
// ============================================================
// drawing interaction (mouse + touch)
// ============================================================
function cellFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  if (el && el.classList.contains('grid-square')) return el;
  return null;
}
 
gridEl.addEventListener('pointerdown', (e) => {
  state.isPointerDown = true;
  const cell = e.target.closest('.grid-square');
  if (cell) paintAt(Number(cell.dataset.row), Number(cell.dataset.col));
  e.preventDefault();
});
 
gridEl.addEventListener('pointermove', (e) => {
  if (!state.isPointerDown) return;
  const cell = cellFromPoint(e.clientX, e.clientY);
  if (cell) paintAt(Number(cell.dataset.row), Number(cell.dataset.col));
});
 
window.addEventListener('pointerup', () => { state.isPointerDown = false; });
window.addEventListener('pointercancel', () => { state.isPointerDown = false; });
 
// ============================================================
// mode knob
// ============================================================
function setMode(mode) {
  state.mode = mode;
  readoutEl.textContent = `MODE: ${mode.toUpperCase()}`;
  colorControl.style.opacity = mode === 'rainbow' || mode === 'eraser' ? 0.4 : 1;
}
 
modeKnob.addEventListener('click', () => {
  const idx = (MODES.indexOf(state.mode) + 1) % MODES.length;
  setMode(MODES[idx]);
  modeKnob.classList.remove('spin');
  void modeKnob.offsetWidth; // restart animation
  modeKnob.classList.add('spin');
});
 
// ============================================================
// clear knob ("shake to clear")
// ============================================================
clearKnob.addEventListener('click', () => {
  clearKnob.classList.remove('spin');
  screenEl.classList.remove('shake');
  void clearKnob.offsetWidth;
  clearKnob.classList.add('spin');
  screenEl.classList.add('shake');
  setTimeout(() => buildGrid(state.size), 150);
});
 
// ============================================================
// controls
// ============================================================
colorPicker.addEventListener('input', () => { state.penColor = colorPicker.value; });
 
brushSizeInput.addEventListener('input', () => {
  state.brush = Number(brushSizeInput.value);
  brushSizeValue.textContent = state.brush;
});
 
gridSizeInput.addEventListener('input', () => {
  state.size = Number(gridSizeInput.value);
  gridSizeValue.textContent = `${state.size} × ${state.size}`;
  buildGrid(state.size);
});
 
gridLinesToggle.addEventListener('click', () => {
  state.gridLines = !state.gridLines;
  gridLinesToggle.setAttribute('aria-pressed', String(state.gridLines));
  gridEl.classList.toggle('show-lines', state.gridLines);
});
 
darkModeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark');
  darkModeToggle.setAttribute('aria-pressed', String(isDark));
});
 
// ============================================================
// export as PNG
// ============================================================
downloadBtn.addEventListener('click', () => {
  const resolution = 1000;
  const cellPx = resolution / state.size;
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');
 
  for (const cell of gridEl.children) {
    ctx.fillStyle = cell.style.backgroundColor;
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    ctx.fillRect(col * cellPx, row * cellPx, cellPx + 0.5, cellPx + 0.5);
  }
 
  const link = document.createElement('a');
  link.download = 'etch-a-sketch.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});
 
// ============================================================
// init
// ============================================================
setMode('color');
buildGrid(state.size);
 