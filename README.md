# 🖍️ Etch-a-Sketch

Una recreación digital e interactiva del clásico juguete Etch-A-Sketch, con estética skeuomórfica fiel al original: marco rojo, pantalla de aluminio y mandos giratorios funcionales — pero con herramientas de dibujo que el juguete de verdad nunca tuvo.

Proyecto basado en el ejercicio de [The Odin Project](https://www.theodinproject.com/), llevado varios pasos más allá.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Sin dependencias](https://img.shields.io/badge/dependencias-0-2ea44f?style=flat)

---

## ✨ Características

### Dibujo

- **Trazo continuo de verdad** — el ratón (o el dedo) se mueve más rápido de lo que llegan los eventos del navegador, así que el hueco entre dos puntos se rellena con el algoritmo de Bresenham. Nada de líneas punteadas al arrastrar rápido.
- **6 herramientas**
  - ✏️ **Pen** — pincel sólido con el color elegido.
  - 🌈 **Rainbow** — recorre el círculo cromático en HSL, así que los colores siempre combinan (nada de RGB aleatorio y embarrado).
  - 🎚️ **Shade** — oscurece progresivamente hacia el color elegido, en 8 pasadas.
  - 🪣 **Fill** — bote de pintura: rellena por inundación toda la región contigua del mismo color.
  - 💧 **Pick** — cuentagotas: toma el color de una celda. También con `Alt` + clic desde cualquier herramienta.
  - 🧽 **Eraser** — devuelve la celda a la pantalla desnuda.
- **Simetría** — ninguna, espejo horizontal, espejo vertical, cuádruple o **caleidoscopio de 8 ejes**. Un garabato cualquiera se convierte en un mandala.
- **Pincel de 1 a 6** celdas.

### Control

- **Deshacer y rehacer** hasta 60 pasos, con `Ctrl+Z` / `Ctrl+Shift+Z`. Borrar la pantalla también se deshace.
- **Cuadrícula de 8×8 a 80×80** que **remuestrea el dibujo en vez de borrarlo**: puedes cambiar la densidad a mitad de un dibujo sin perderlo.
- **Guardado automático** — el dibujo y tus preferencias se conservan en `localStorage` entre sesiones.
- **Atajos de teclado** para todo (ver tabla abajo).
- **Exportar a PNG** con nombre fechado, o **copiar la imagen al portapapeles**.

### Presentación

- **Modo oscuro** que respeta `prefers-color-scheme` la primera vez y recuerda tu elección después. La pantalla del juguete también cambia de color, no solo la página.
- **Líneas de cuadrícula** activables.
- **Responsive** de móvil a escritorio, con la pantalla siempre cuadrada y ajustada al alto de la ventana.
- **Accesible**: la pantalla se puede enfocar con `Tab` y dibujar solo con el teclado, los controles tienen `aria-pressed` y etiquetas, el modo de dibujo se anuncia por `aria-live`, y todo respeta `prefers-reduced-motion`.

## 🚀 Cómo usarlo

No requiere instalación, compilación ni dependencias. Solo necesitas un navegador.

1. Descarga o clona los 3 archivos (`index.html`, `style.css`, `script.js`) manteniéndolos en la misma carpeta.
2. Abre `index.html` en tu navegador.
3. ¡A dibujar!

```bash
git clone https://github.com/Chijopana/etch-a-sketch
cd etch-a-sketch
open index.html   # o simplemente haz doble clic en el archivo
```

> El botón **Copy image** necesita permisos de portapapeles que los navegadores no conceden a páginas abiertas con `file://`. Si lo usas así, **Save as PNG** funciona siempre.

## 🎮 Controles

| Acción | Cómo hacerlo |
|---|---|
| Dibujar | Clic (o toque) y arrastra sobre la pantalla |
| Cambiar herramienta | Panel lateral, o el mando izquierdo ("TOOL") para ciclar |
| Tomar un color de la pantalla | Herramienta *Pick*, o `Alt` + clic |
| Borrar todo | Mando derecho ("SHAKE TO CLEAR") o el botón 🗑 |
| Cambiar color | Selector de color o los 10 colores predefinidos |
| Grosor del pincel | Slider "Brush size" |
| Densidad de cuadrícula | Slider "Grid density" |
| Simetría | Control segmentado "Symmetry" |
| Ver/ocultar líneas | Interruptor "Grid lines" |
| Modo oscuro | Interruptor "Night light" |
| Deshacer / rehacer | Botones ↶ ↷ del panel |
| Guardar el dibujo | Botón "Save as PNG" |

### ⌨️ Atajos de teclado

| Tecla | Acción |
|---|---|
| `1` … `6` | Elegir herramienta |
| `M` | Ciclar herramientas |
| `[` `]` | Reducir / aumentar el pincel |
| `X` | Ciclar el modo de simetría |
| `G` | Líneas de cuadrícula |
| `N` | Modo oscuro |
| `C` | Borrar la pantalla |
| `Ctrl` + `Z` | Deshacer |
| `Ctrl` + `Shift` + `Z` | Rehacer |
| `Ctrl` + `S` | Guardar como PNG |
| `Alt` + clic | Cuentagotas |

Con la pantalla enfocada (`Tab`): las **flechas** mueven el cursor, `Ctrl` + flechas lo mueven de 5 en 5, `Enter` o `Espacio` pintan, y `Shift` + flechas dibujan mientras te mueves.

## 🗂️ Estructura del proyecto

```
etch-a-sketch/
├── index.html   # Estructura, controles y los iconos SVG en línea
├── style.css    # Estética del juguete y del panel, temas claro/oscuro
├── script.js    # Modelo de datos, herramientas, historial, guardado y exportación
└── README.md
```

## 🛠️ Tecnologías

Construido con **HTML, CSS y JavaScript puro (vanilla)** — sin frameworks, sin librerías, sin paso de compilación. El único recurso externo son las fuentes de Google Fonts (Baloo 2 y Space Mono), que degradan a fuentes del sistema si no cargan.

## 🧠 Cómo funciona (por dentro)

La decisión de diseño que sostiene todo lo demás: **el dibujo no vive en el DOM**.

- El estado es un par de arrays tipados: `colors` guarda un entero `0xRRGGBB` por celda (`-1` = vacía) y `levels` guarda la profundidad de sombreado. El DOM es solo una *vista* que se repinta celda a celda.
- Eso es lo que hace baratos **deshacer/rehacer** (una copia del array), **cambiar de densidad sin perder el dibujo** (un remuestreo por vecino más cercano), **el guardado automático** (los arrays se serializan con codificación *run-length*, así un dibujo de 80×80 ocupa unos pocos cientos de bytes) y **la exportación a PNG** (se dibuja desde el modelo, no leyendo estilos del DOM).
- Las celdas vacías son **transparentes**, no pintadas del color de fondo: así se ve el degradado de aluminio de la pantalla y el dibujo se adapta solo al cambiar entre tema claro y oscuro.
- La posición del puntero se calcula con aritmética sobre `getBoundingClientRect()` en lugar de `document.elementFromPoint()` en cada `pointermove`, que fuerza un recálculo de layout. En una cuadrícula de 80×80 (6400 celdas) un trazo diagonal completo cuesta unos 7 ms.
- El dibujo usa `pointerdown` / `pointermove` con captura de puntero, no `mouseenter`, lo que da soporte a ratón, dedo y lápiz con el mismo código.
- El remuestreo al cambiar de densidad parte siempre del dibujo *original* mientras arrastras el slider, no del último remuestreo, para que mover el control adelante y atrás no degrade la imagen.

## 📌 Posibles mejoras futuras

- Modo "línea recta" y rectángulos/círculos manteniendo `Shift`.
- Exportar a SVG además de PNG.
- Galería de dibujos guardados en vez de uno solo.
- Compartir el dibujo por URL (el estado ya está comprimido, cabría en un hash).

## 📄 Licencia

Proyecto de práctica de front-end, de uso libre para aprender o modificar.

---

Hecho con HTML, CSS, JS y ganas de mejorar un ejercicio "básico".
