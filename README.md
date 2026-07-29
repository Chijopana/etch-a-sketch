# 🖍️ Etch-a-Sketch
 
Una recreación digital e interactiva del clásico juguete Etch-A-Sketch, con estética skeuomórfica fiel al original: marco rojo, pantalla de aluminio y mandos giratorios funcionales — pero con herramientas de dibujo que el juguete de verdad nunca tuvo.
 
Proyecto basado en el ejercicio de [The Odin Project](https://www.theodinproject.com/), llevado varios pasos más allá.
 
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
 
---
 
## ✨ Características
 
- **Dibujo con arrastre real** — clic y arrastra para dibujar (no solo al pasar el cursor), con soporte táctil para móvil y tablet.
- **4 modos de dibujo**
  - 🎨 **Color** — pincel sólido con selector de color.
  - 🌈 **Rainbow** — cada celda recibe un color aleatorio.
  - 🖤 **Shade** — oscurece progresivamente hacia el color elegido con cada pasada.
  - 🧹 **Eraser** — borra celdas individuales.
- **Pincel ajustable** (1–4) para pintar áreas más grandes de una vez.
- **Cuadrícula configurable** de 8×8 a 64×64 mediante slider.
- **Líneas de cuadrícula** activables/desactivables.
- **Modo oscuro** ("Night light") para toda la interfaz.
- **Exportar a PNG** — descarga tu dibujo como imagen real, generada con `<canvas>`.
- **Controles con personalidad**: el mando izquierdo cicla entre modos y el derecho hace "shake to clear" (la pantalla tiembla y se borra), en vez de un simple botón de reinicio.
## 🚀 Cómo usarlo
 
No requiere instalación ni dependencias. Solo necesitas un navegador.
 
1. Descarga o clona los 3 archivos (`index.html`, `style.css`, `script.js`) manteniéndolos en la misma carpeta.
2. Abre `index.html` en tu navegador.
3. ¡A dibujar!
```bash
git clone <https://github.com/Chijopana/etch-a-sketch>
cd etch-a-sketch
open index.html   # o simplemente haz doble clic en el archivo
```
 
## 🎮 Controles
 
| Acción | Cómo hacerlo |
|---|---|
| Dibujar | Clic (o toque) y arrastra sobre la pantalla |
| Cambiar modo de dibujo | Clic en el mando izquierdo ("MODE") |
| Borrar todo | Clic en el mando derecho ("SHAKE TO CLEAR") |
| Cambiar color del pincel | Selector de color en el panel lateral |
| Ajustar grosor del pincel | Slider "Brush size" |
| Cambiar tamaño de cuadrícula | Slider "Grid density" |
| Ver/ocultar líneas de cuadrícula | Interruptor "Grid lines" |
| Modo oscuro | Interruptor "Night light" |
| Guardar el dibujo | Botón "Save drawing as PNG" |
 
## 🗂️ Estructura del proyecto
 
```
etch-a-sketch/
├── index.html   # Estructura y controles
├── style.css    # Estética del juguete (marco, pantalla, mandos, panel)
├── script.js    # Lógica de dibujo, modos, exportación e interacción
└── README.md
```
 
## 🛠️ Tecnologías
 
Construido con **HTML, CSS y JavaScript puro (vanilla)** — sin frameworks ni librerías externas. El único recurso externo son las fuentes de Google Fonts (Baloo 2 y Space Mono).
 
## 🧠 Cómo funciona (por dentro)
 
- La cuadrícula se genera dinámicamente con **CSS Grid**, recalculando `grid-template-columns`/`rows` cada vez que cambia la densidad.
- El **modo Shade** guarda un `data-level` por celda y mezcla su color en RGB hacia el color elegido en pasos, en vez de usar transparencia — así el color exportado a PNG es siempre exacto.
- La **exportación a PNG** dibuja cada celda en un `<canvas>` a una resolución fija de 1000×1000 px, independientemente del tamaño en pantalla, para que la imagen descargada tenga siempre buena calidad.
- El dibujo funciona con eventos `pointerdown` / `pointermove` (no `mouseenter`), lo que permite arrastrar el cursor y también dibujar con el dedo en pantallas táctiles.
## 📌 Posibles mejoras futuras
 
- Undo / Redo.
- Guardar el dibujo en `localStorage` para conservarlo entre sesiones.
- Paleta de colores predefinida además del selector libre.
- Compartir el dibujo directamente en redes sociales.
## 📄 Licencia
 
Proyecto de práctica de front-end, de uso libre para aprender o modificar.
 
---
 
Hecho con HTML, CSS, JS y ganas de mejorar un ejercicio "básico".