// script.js
const container = document.getElementById('gridContainer');
const resizeBtn = document.getElementById('resizeBtn');

function createGrid(size) {
  container.innerHTML = ''; // Clear previous grid
  const squareSize = 960 / size;
  for (let i = 0; i < size * size; i++) {
    const square = document.createElement('div');
    square.classList.add('grid-square');
    square.style.width = `${squareSize}px`;
    square.style.height = `${squareSize}px`;
    square.style.backgroundColor = 'white';
    square.style.opacity = 0;

    square.addEventListener('mouseenter', () => {
      const currentOpacity = parseFloat(square.style.opacity);
      if (currentOpacity < 1) {
        square.style.opacity = currentOpacity + 0.1;
      }
      square.style.backgroundColor = randomColor();
    });

    container.appendChild(square);
  }
}

function randomColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return `rgb(${r}, ${g}, ${b})`;
}

resizeBtn.addEventListener('click', () => {
  let newSize = prompt('Enter new grid size (max 100):');
  newSize = parseInt(newSize);
  if (newSize > 0 && newSize <= 100) {
    createGrid(newSize);
  } else {
    alert('Invalid size. Please enter a number between 1 and 100.');
  }
});

// Initial grid
createGrid(16);
