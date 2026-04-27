// Элементы DOM
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const brushSizeValue = document.getElementById('brushSizeValue');
const eraserBtn = document.getElementById('eraserBtn');
const fillBtn = document.getElementById('fillBtn');
const clearBtn = document.getElementById('clearBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const downloadSVG = document.getElementById('downloadSVG');
const downloadPNG = document.getElementById('downloadPNG');
const gridSizeInput = document.getElementById('gridSize');
const canvasInfo = document.getElementById('canvasInfo');

// Состояние
let isDrawing = false;
let isEraser = false;
let isFill = false;
let currentColor = '#000000';
let currentBrushSize = 1;
let gridSize = 20;
let history = [];
let historyStep = -1;

// Инициализация канваса
function initCanvas() {
    const pixelSize = 20; // размер пикселя в пикселях экрана
    const cols = gridSize;
    const rows = gridSize;
    
    canvas.width = cols * pixelSize;
    canvas.height = rows * pixelSize;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем бледную сетку
    drawGrid(pixelSize);
    
    saveHistory();
    updateCanvasInfo();
}

// Рисование бледной сетки
function drawGrid(pixelSize) {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    
    // Вертикальные линии
    for (let col = 1; col < gridSize; col++) {
        ctx.beginPath();
        ctx.moveTo(col * pixelSize, 0);
        ctx.lineTo(col * pixelSize, canvas.height);
        ctx.stroke();
    }
    
    // Горизонтальные линии
    for (let row = 1; row < gridSize; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * pixelSize);
        ctx.lineTo(canvas.width, row * pixelSize);
        ctx.stroke();
    }
}

// Сохранение состояния в историю
function saveHistory() {
    // Удалить все шаги после текущего
    if (historyStep < history.length - 1) {
        history = history.slice(0, historyStep + 1);
    }
    
    // Временно скрываем сетку перед сохранением
    const pixelSize = canvas.width / gridSize;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Копируем содержимое без сетки
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    tempCtx.putImageData(imageData, 0, 0);
    
    // Удаляем линии сетки из данных для сохранения
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        // Проверяем если пиксель это линия сетки (серый цвет #e0e0e0)
        if (data[i] === 224 && data[i+1] === 224 && data[i+2] === 224) {
            // Пропускаем линии сетки, оставляем только рисунок
            continue;
        }
    }
    
    history.push(imageData);
    historyStep = history.length - 1;
    
    updateUndoRedoButtons();
}

// Отмена
function undo() {
    if (historyStep > 0) {
        historyStep--;
        restoreHistory();
    }
}

// Вернуть
function redo() {
    if (historyStep < history.length - 1) {
        historyStep++;
        restoreHistory();
    }
}

// Восстановление из истории
function restoreHistory() {
    ctx.putImageData(history[historyStep], 0, 0);
    const pixelSize = canvas.width / gridSize;
    drawGrid(pixelSize);
    updateUndoRedoButtons();
}

// Обновление кнопок отмены/повтора
function updateUndoRedoButtons() {
    undoBtn.disabled = historyStep <= 0;
    redoBtn.disabled = historyStep >= history.length - 1;
}

// Получение координат пикселя на канвасе
function getPixelCoords(x, y) {
    const pixelSize = canvas.width / gridSize;
    const col = Math.floor(x / pixelSize);
    const row = Math.floor(y / pixelSize);
    return { col, row, pixelSize };
}

// Рисование пикселя
function drawPixel(col, row, pixelSize, color) {
    if (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
        ctx.fillStyle = color;
        ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
    }
}

// Рисование кисти
function drawBrush(col, row, pixelSize) {
    const color = isEraser ? '#ffffff' : currentColor;
    const brushRadius = Math.floor(currentBrushSize / 2);
    
    for (let dx = -brushRadius; dx <= brushRadius; dx++) {
        for (let dy = -brushRadius; dy <= brushRadius; dy++) {
            drawPixel(col + dx, row + dy, pixelSize, color);
        }
    }
}

// Заливка цветом (flood fill)
function floodFill(col, row, pixelSize, newColor) {
    // Получить цвет начального пикселя
    const pixelData = ctx.getImageData(col * pixelSize, row * pixelSize, 1, 1);
    const originalColor = rgbToHex(pixelData.data[0], pixelData.data[1], pixelData.data[2]);
    
    if (originalColor === newColor) return;
    
    const stack = [[col, row]];
    const visited = new Set();
    
    while (stack.length > 0) {
        const [x, y] = stack.pop();
        const key = `${x},${y}`;
        
        if (visited.has(key) || x < 0 || x >= gridSize || y < 0 || y >= gridSize) continue;
        
        const pixData = ctx.getImageData(x * pixelSize, y * pixelSize, 1, 1);
        const pColor = rgbToHex(pixData.data[0], pixData.data[1], pixData.data[2]);
        
        if (pColor !== originalColor) continue;
        
        visited.add(key);
        drawPixel(x, y, pixelSize, newColor);
        
        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
    }
}

// Преобразование RGB в HEX
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
}

// Обновление информации о канвасе
function updateCanvasInfo() {
    canvasInfo.textContent = `${gridSize}x${gridSize}`;
}

// Экспорт в SVG
function exportToSVG() {
    const pixelSize = canvas.width / gridSize;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${canvas.width}" height="${canvas.height}" fill="white"/>
`;
    
    // Проходим по каждому пикселю
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const pixelIndex = (row * gridSize + col) * 4;
            const r = data[pixelIndex];
            const g = data[pixelIndex + 1];
            const b = data[pixelIndex + 2];
            const a = data[pixelIndex + 3];
            
            // Пропускаем белые пиксели (фон)
            if (r === 255 && g === 255 && b === 255 && a === 255) continue;
            
            const color = rgbToHex(r, g, b);
            const x = col * pixelSize;
            const y = row * pixelSize;
            
            svgContent += `  <rect x="${x}" y="${y}" width="${pixelSize}" height="${pixelSize}" fill="${color}"/>\n`;
        }
    }
    
    svgContent += `</svg>`;
    
    downloadFile(svgContent, 'pixel-art.svg', 'image/svg+xml');
}

// Экспорт в PNG
function exportToPNG() {
    canvas.toBlob(blob => {
        downloadBlob(blob, 'pixel-art.png');
    });
}

// Скачивание файла
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    downloadBlob(blob, filename);
}

// Скачивание Blob
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// События мыши
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { col, row, pixelSize } = getPixelCoords(x, y);
    
    if (isFill) {
        floodFill(col, row, pixelSize, currentColor);
        saveHistory();
    } else {
        drawBrush(col, row, pixelSize);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || isFill) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { col, row, pixelSize } = getPixelCoords(x, y);
    
    drawBrush(col, row, pixelSize);
});

canvas.addEventListener('mouseup', () => {
    if (isDrawing && !isFill) {
        saveHistory();
    }
    isDrawing = false;
});

canvas.addEventListener('mouseleave', () => {
    if (isDrawing && !isFill) {
        saveHistory();
    }
    isDrawing = false;
});

// Восстановление сетки после каждого действия
function restoreHistoryWithGrid() {
    restoreHistory();
    const pixelSize = canvas.width / gridSize;
    drawGrid(pixelSize);
}

// События кнопок
colorPicker.addEventListener('change', (e) => {
    currentColor = e.target.value;
    isEraser = false;
    eraserBtn.classList.remove('active');
});

brushSize.addEventListener('input', (e) => {
    currentBrushSize = parseInt(e.target.value);
    brushSizeValue.textContent = currentBrushSize + 'px';
});

eraserBtn.addEventListener('click', () => {
    isEraser = !isEraser;
    isFill = false;
    fillBtn.classList.remove('active');
    eraserBtn.classList.toggle('active');
});

fillBtn.addEventListener('click', () => {
    isFill = !isFill;
    isEraser = false;
    eraserBtn.classList.remove('active');
    fillBtn.classList.toggle('active');
});

clearBtn.addEventListener('click', () => {
    if (confirm('Вы уверены? Это очистит весь холст.')) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveHistory();
    }
});

undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);

downloadSVG.addEventListener('click', exportToSVG);
downloadPNG.addEventListener('click', exportToPNG);

gridSizeInput.addEventListener('change', (e) => {
    gridSize = parseInt(e.target.value);
    initCanvas();
});

// Инициализация
initCanvas();
