// Элементы DOM
const gridCanvas = document.getElementById('gridCanvas');
const gridCtx = gridCanvas.getContext('2d');
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
const copySVG = document.getElementById('copySVG');
const copyPNG = document.getElementById('copyPNG');
const gridWidthInput = document.getElementById('gridWidth');
const gridHeightInput = document.getElementById('gridHeight');
const canvasInfo = document.getElementById('canvasInfo');

// Состояние
let isDrawing = false;
let isEraser = false;
let isFill = false;
let currentColor = '#000000';
let currentBrushSize = 1;
let gridWidth = 20;
let gridHeight = 20;
let history = [];
let historyStep = -1;

// Инициализация канваса
function initCanvas() {
    const pixelSize = 20; // размер пикселя в пикселях экрана
    
    canvas.width = gridWidth * pixelSize;
    canvas.height = gridHeight * pixelSize;
    gridCanvas.width = gridWidth * pixelSize;
    gridCanvas.height = gridHeight * pixelSize;
    
    // Очищаем canvas без белого фона (прозрачный)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawGridOnGridCanvas();
    saveHistory();
    updateCanvasInfo();
}

// Рисование сетки на отдельном gridCanvas
function drawGridOnGridCanvas() {
    // Очищаем gridCanvas
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    
    const pixelSize = 20;
    gridCtx.strokeStyle = '#e0e0e0';
    gridCtx.lineWidth = 0.5;
    
    // Вертикальные линии
    for (let col = 1; col < gridWidth; col++) {
        gridCtx.beginPath();
        gridCtx.moveTo(col * pixelSize, 0);
        gridCtx.lineTo(col * pixelSize, gridCanvas.height);
        gridCtx.stroke();
    }
    
    // Горизонтальные линии
    for (let row = 1; row < gridHeight; row++) {
        gridCtx.beginPath();
        gridCtx.moveTo(0, row * pixelSize);
        gridCtx.lineTo(gridCanvas.width, row * pixelSize);
        gridCtx.stroke();
    }
}

// Сохранение состояния в историю
function saveHistory() {
    // Удалить все шаги после текущего
    if (historyStep < history.length - 1) {
        history = history.slice(0, historyStep + 1);
    }
    
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
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
    updateUndoRedoButtons();
}

// Обновление кнопок отмены/повтора
function updateUndoRedoButtons() {
    undoBtn.disabled = historyStep <= 0;
    redoBtn.disabled = historyStep >= history.length - 1;
}

// Получение координат пикселя на канвасе
function getPixelCoords(x, y) {
    const pixelSize = 20;
    const col = Math.floor(x / pixelSize);
    const row = Math.floor(y / pixelSize);
    return { col, row, pixelSize };
}

// Рисование пикселя
function drawPixel(col, row, pixelSize, color) {
    if (col >= 0 && col < gridWidth && row >= 0 && row < gridHeight) {
        ctx.fillStyle = color;
        ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
    }
}

// Рисование кисти
function drawBrush(col, row, pixelSize) {
    const brushRadius = Math.floor(currentBrushSize / 2);
    
    if (isEraser) {
        // Стирание - используем clearRect для прозрачности
        for (let dx = -brushRadius; dx <= brushRadius; dx++) {
            for (let dy = -brushRadius; dy <= brushRadius; dy++) {
                const c = col + dx;
                const r = row + dy;
                if (c >= 0 && c < gridWidth && r >= 0 && r < gridHeight) {
                    ctx.clearRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
                }
            }
        }
    } else {
        // Рисование цветом
        const color = currentColor;
        for (let dx = -brushRadius; dx <= brushRadius; dx++) {
            for (let dy = -brushRadius; dy <= brushRadius; dy++) {
                drawPixel(col + dx, row + dy, pixelSize, color);
            }
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
        
        if (visited.has(key) || x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) continue;
        
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
    canvasInfo.textContent = `${gridWidth}x${gridHeight}`;
}

// Экспорт в SVG
function exportToSVG() {
    const pixelSize = 20;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${canvas.width}" height="${canvas.height}" fill="white"/>
`;
    
    // Проходим по каждому пикселю
    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            const pixelIndex = (row * gridWidth + col) * 4;
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveHistory();
    }
});

undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);

downloadSVG.addEventListener('click', exportToSVG);
downloadPNG.addEventListener('click', exportToPNG);
copySVG.addEventListener('click', copyToClipboardSVG);
copyPNG.addEventListener('click', copyToClipboardPNG);

// Копирование SVG в буфер обмена
function copyToClipboardSVG() {
    const pixelSize = 20;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${canvas.width}" height="${canvas.height}" fill="white"/>
`;
    
    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            const pixelIndex = (row * gridWidth + col) * 4;
            const r = data[pixelIndex];
            const g = data[pixelIndex + 1];
            const b = data[pixelIndex + 2];
            const a = data[pixelIndex + 3];
            
            if (r === 255 && g === 255 && b === 255 && a === 255) continue;
            
            const color = rgbToHex(r, g, b);
            const x = col * pixelSize;
            const y = row * pixelSize;
            
            svgContent += `  <rect x="${x}" y="${y}" width="${pixelSize}" height="${pixelSize}" fill="${color}"/>\n`;
        }
    }
    
    svgContent += `</svg>`;
    
    navigator.clipboard.writeText(svgContent).then(() => {
        alert('SVG скопирован в буфер обмена!');
    }).catch(() => {
        alert('Не удалось скопировать в буфер обмена');
    });
}

// Копирование PNG в буфер обмена
function copyToClipboardPNG() {
    canvas.toBlob((blob) => {
        navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]).then(() => {
            alert('PNG скопирован в буфер обмена!');
        }).catch(() => {
            alert('Не удалось скопировать в буфер обмена');
        });
    });
}

// Обработчики событий для изменения размера сетки
gridWidthInput.addEventListener('change', (e) => {
    gridWidth = parseInt(e.target.value);
    initCanvas();
});

gridHeightInput.addEventListener('change', (e) => {
    gridHeight = parseInt(e.target.value);
    initCanvas();
});

// Функция для расширения холста с сохранением рисунка
function expandGridWithOffset(offsetLeft, offsetTop, offsetRight, offsetBottom) {
    const pixelSize = 20;
    
    // Сохраняем текущий рисунок
    const oldImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Новые размеры
    const newWidth = gridWidth + offsetLeft + offsetRight;
    const newHeight = gridHeight + offsetTop + offsetBottom;
    
    // Обновляем размеры сетки
    gridWidth = newWidth;
    gridHeight = newHeight;
    gridWidthInput.value = gridWidth;
    gridHeightInput.value = gridHeight;
    
    // Пересчитываем размеры холста
    canvas.width = gridWidth * pixelSize;
    canvas.height = gridHeight * pixelSize;
    gridCanvas.width = gridWidth * pixelSize;
    gridCanvas.height = gridHeight * pixelSize;
    
    // Очищаем холсты
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Копируем старый рисунок в новое место
    ctx.putImageData(oldImageData, offsetLeft * pixelSize, offsetTop * pixelSize);
    
    // Перерисовываем сетку
    drawGridOnGridCanvas();
    
    // Сохраняем в историю
    saveHistory();
    updateCanvasInfo();
}

// Обработчики событий для кнопок управления размером сетки
document.getElementById('gridBtn-all').addEventListener('click', () => {
    expandGridWithOffset(1, 1, 1, 1);
});

document.getElementById('gridBtn-up').addEventListener('click', () => {
    expandGridWithOffset(0, 1, 0, 0);
});

document.getElementById('gridBtn-down').addEventListener('click', () => {
    expandGridWithOffset(0, 0, 0, 1);
});

document.getElementById('gridBtn-left').addEventListener('click', () => {
    expandGridWithOffset(1, 0, 0, 0);
});

document.getElementById('gridBtn-right').addEventListener('click', () => {
    expandGridWithOffset(0, 0, 1, 0);
});

document.getElementById('gridBtn-up-left').addEventListener('click', () => {
    expandGridWithOffset(1, 1, 0, 0);
});

document.getElementById('gridBtn-up-right').addEventListener('click', () => {
    expandGridWithOffset(0, 1, 1, 0);
});

document.getElementById('gridBtn-down-left').addEventListener('click', () => {
    expandGridWithOffset(1, 0, 0, 1);
});

document.getElementById('gridBtn-down-right').addEventListener('click', () => {
    expandGridWithOffset(0, 0, 1, 1);
});

// Инициализация
initCanvas();
