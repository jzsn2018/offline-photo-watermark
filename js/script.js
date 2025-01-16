var $, canvas, dataURItoBlob, graph, image, configInputSetting, inputItems,
    readFile, previewModal, previewImage;

$ = function (sel) {
    return document.querySelector(sel);
};

inputItems = ['text', 'color', 'alpha', 'space', 'size', 'rotate', 'watermarkPattern', 'watermarkCount', 'watermarkPosition', 'fontFamily'];

configInputSetting = {}; // 保存所有水印
allCanvas = []; // 保存所有的canvas

image = $('#image');

graph = $('#graph');

dataURItoBlob = function (dataURI) {
    var arr, binStr, i, len, _i, _ref;
    binStr = atob((dataURI.split(','))[1]);
    len = binStr.length;
    arr = new Uint8Array(len);
    for (i = _i = 0, _ref = len - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        arr[i] = binStr.charCodeAt(i);
    }
    return new Blob([arr], {
        type: 'image/png'
    });
};

const generateFileName = (fileName) => {
    var d, pad;
    pad = function (n) {
        if (n < 10) {
            return '0' + n;
        } else {
            return n;
        }
    };
    d = new Date;
    const timeStr = '' + d.getFullYear() + '-' + (pad(d.getMonth() + 1)) + '-' + (pad(d
        .getDate())) + ' ' + (
        pad(d
            .getHours())) + (pad(d.getMinutes())) + (pad(d.getSeconds()))
    return fileName + '_' + timeStr + '.png';
};
const redrawCanvas = (canvas, img) => {
    // 重新设置canvas的宽高，会清空画布
    var w = canvas.width;
    var h = canvas.height;
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0);
};

const downloadCanvasAsImage = (canvas, fileName) => {
    var blob, imageData, link;
    link = document.createElement('a');
    link.download = generateFileName(fileName);
    imageData = canvas.toDataURL('image/png');
    blob = dataURItoBlob(imageData);
    link.href = URL.createObjectURL(blob);
    graph.appendChild(link);
    return setTimeout(function () {
        link.click();
        return graph.removeChild(link);
    }, 10);
}

readFile = function (file) {
    const progressBar = $('.progress-inner');
    const progressText = $('.progress-text');
    const uploadProgress = $('#uploadProgress');

    uploadProgress.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = `准备处理 ${file.name}...`;

    var fileReader = new FileReader;

    // 添加进度监听
    fileReader.onprogress = (e) => {
        if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            const percentage = Math.round(progress);
            progressBar.style.width = percentage + '%';

            // 添加文件大小信息
            const loaded = (e.loaded / 1024 / 1024).toFixed(1);
            const total = (e.total / 1024 / 1024).toFixed(1);
            progressText.textContent = `正在处理 ${file.name}: ${percentage}% (${loaded}MB/${total}MB)`;

            // 添加进度条颜色渐变
            progressBar.style.background = `linear-gradient(90deg, 
                    var(--button-primary) ${percentage}%, 
                    var(--progress-bg) ${percentage}%)`;
        }
    };

    fileReader.onload = function () {
        progressBar.style.width = '100%';
        progressText.textContent = `正在处理 ${file.name}...`;
        progressBar.style.background = 'var(--button-primary)';

        var img = new Image;
        img.onload = function () {
            var ctx;
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // 建图片容器
            const container = document.createElement('div');
            container.className = 'image-container';

            // 添加画布，并增加点击预览功能
            canvas.style.cursor = 'zoom-in';
            canvas.addEventListener('click', () => {
                showPreview(canvas);
            });

            // 先添加到数组中
            allCanvas.push({
                img: img,
                canvas: canvas,
                fileName: file.name
            });

            // 然后绘制水印
            drawText(canvas, img);

            container.appendChild(canvas);

            // 添加图片信息和操作按钮
            const infoDiv = document.createElement('div');
            infoDiv.className = 'image-info';

            // 添加文件名
            const nameSpan = document.createElement('div');
            nameSpan.className = 'file-name';
            nameSpan.textContent = file.name;

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'button-group-container';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'download-btn copy-btn';
            copyBtn.textContent = '复制';
            copyBtn.onclick = (e) => {
                e.stopPropagation();
                copyImageToClipboard(canvas);
            };

            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'download-btn';
            downloadBtn.textContent = '下载';
            downloadBtn.onclick = (e) => {
                e.stopPropagation();
                downloadCanvasAsImage(canvas, file.name);
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'download-btn delete-btn';
            deleteBtn.textContent = '删除';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                const index = allCanvas.findIndex(item => item.canvas === canvas);
                if (index > -1) {
                    allCanvas.splice(index, 1);
                }
                container.remove();

                if (graph.children.length === 0) {
                    graph.classList.add('empty');
                }
            };

            buttonGroup.appendChild(copyBtn);
            buttonGroup.appendChild(downloadBtn);
            buttonGroup.appendChild(deleteBtn);

            infoDiv.appendChild(nameSpan);
            infoDiv.appendChild(buttonGroup);
            container.appendChild(infoDiv);

            graph.appendChild(container);
            graph.classList.remove('empty');

            progressText.textContent = `${file.name} 处理完成`;
            progressBar.style.background = 'var(--button-primary)';

            // 平滑过渡后隐藏进度条
            setTimeout(() => {
                uploadProgress.style.opacity = '0';
                setTimeout(() => {
                    uploadProgress.style.display = 'none';
                    uploadProgress.style.opacity = '1';
                    progressBar.style.width = '0%';
                }, 300);
            }, 1000);
        };

        img.onerror = function () {
            progressText.textContent = `${file.name} 处理失败`;
            progressBar.style.background = 'var(--button-delete)';
            setTimeout(() => {
                uploadProgress.style.opacity = '0';
                setTimeout(() => {
                    uploadProgress.style.display = 'none';
                    uploadProgress.style.opacity = '1';
                    progressBar.style.width = '0%';
                }, 300);
            }, 2000);
        };

        img.src = fileReader.result;
    };

    fileReader.onerror = function () {
        progressText.textContent = `${file.name} 读取失败`;
        progressBar.style.background = 'var(--button-delete)';
        setTimeout(() => {
            uploadProgress.style.opacity = '0';
            setTimeout(() => {
                uploadProgress.style.display = 'none';
                uploadProgress.style.opacity = '1';
                progressBar.style.width = '0%';
            }, 300);
        }, 2000);
    };

    fileReader.readAsDataURL(file);
};

const makeStyle = () => {
    var match;
    match = configInputSetting.color.value.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    return 'rgba(' + (parseInt(match[1], 16)) + ',' + (parseInt(match[2], 16)) + ',' + (parseInt(match[3],
        16)) + ',' + configInputSetting.alpha.value + ')';
};

let fontStyles = {
    bold: false,
    italic: false
};

function toggleFontStyle(style) {
    const btn = document.getElementById(style + 'Toggle');
    fontStyles[style] = !fontStyles[style];
    btn.classList.toggle('active');

    // 更新所有画布
    allCanvas.forEach(({canvas, img}) => {
        drawText(canvas, img);
    });
}

const drawText = (canvas, img) => {
    // 参数验证
    if (!canvas || !img) {
        console.warn('drawText: 缺少必要参数 canvas 或 img');
        return;
    }

    try {
        redrawCanvas(canvas, img);
        const textCtx = canvas.getContext('2d');
        if (!textCtx) {
            console.error('无法获取 canvas context');
            return;
        }

        // 获取并验证配置参数
        const pattern = configInputSetting.watermarkPattern?.value || 'tile';
        const position = configInputSetting.watermarkPosition?.value || 'center';
        const count = Math.max(1, parseInt(configInputSetting.watermarkCount?.value) || 1);

        // 字体设置
        const fontFamily = configInputSetting.fontFamily?.value || '黑体';
        const fontWeight = fontStyles.bold ? 'bold' : 'normal';
        const fontStyle = fontStyles.italic ? 'italic' : 'normal';

        // 安全的数值计算
        const diagonal = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height) || 1000;
        const textSize = Math.max(12, (configInputSetting.size?.value || 1) * Math.max(15, diagonal / 25));

        // 构建字体样式
        const fontString = `${fontStyle} ${fontWeight} ${textSize}px "${fontFamily}"`;
        textCtx.font = fontString;
        textCtx.fillStyle = makeStyle();

        const text = configInputSetting.text?.value?.trim() || '水印文字';
        const maxWidth = Math.min(Math.max(100, canvas.width * 0.8), 500); // 确保合理的最大宽度

        // 文本换行处理函数
        const wrapText = (text, maxWidth) => {
            // 参数验证和默认值
            if (!text || typeof text !== 'string') {
                console.warn('wrapText: 无效的文本输入');
                return ['水印文字'];
            }
            maxWidth = Math.max(50, maxWidth || 100); // 确保最小宽度

            try {
                // 优化分隔规则
                const splitPattern = /([，。！？；：、,.!?;:\s]|[0-9-\/年月日]+|[a-zA-Z]+|[\u4e00-\u9fa5]+|[^\u4e00-\u9fa5a-zA-Z0-9\s])/g;
                const segments = text.match(splitPattern) || [];

                const lines = [];
                let currentLine = '';

                // 辅助函数
                const isPunctuation = (str) => {
                    try {
                        return /^[，。！？；：、,.!?;:\s]$/.test(str);
                    } catch (e) {
                        console.warn('isPunctuation 检查失败:', e);
                        return false;
                    }
                };

                const measureWidth = (str) => {
                    try {
                        return textCtx.measureText(str).width;
                    } catch (e) {
                        console.warn('measureWidth 测量失败:', e);
                        return Infinity;
                    }
                };

                // 处理分段
                for (let i = 0; i < segments.length; i++) {
                    const segment = segments[i]?.trim() || '';
                    if (!segment) continue;

                    try {
                        const nextSegment = segments[i + 1]?.trim() || '';
                        const isNextPunctuation = isPunctuation(nextSegment);

                        // 标点符号处理
                        if (isPunctuation(segment)) {
                            if (!currentLine && lines.length > 0) {
                                const lastLine = lines[lines.length - 1];
                                const testLastLine = lastLine + segment;
                                if (measureWidth(testLastLine) <= maxWidth) {
                                    lines[lines.length - 1] = testLastLine;
                                } else {
                                    currentLine = segment;
                                }
                            } else {
                                currentLine += segment;
                            }
                            continue;
                        }

                        // 尝试添加新片段
                        const testLine = currentLine + segment + (isNextPunctuation ? nextSegment : '');
                        const testWidth = measureWidth(testLine);

                        if (testWidth <= maxWidth) {
                            currentLine += segment;
                            if (isNextPunctuation) {
                                currentLine += nextSegment;
                                i++;
                            }
                        } else {
                            if (currentLine) {
                                if (!isPunctuation(currentLine)) {
                                    lines.push(currentLine);
                                    currentLine = segment;
                                    if (isNextPunctuation && measureWidth(segment + nextSegment) <= maxWidth) {
                                        currentLine += nextSegment;
                                        i++;
                                    }
                                } else {
                                    currentLine += segment;
                                }
                            } else {
                                // 处理长文本
                                if (segment.length <= 4) {
                                    lines.push(segment);
                                    currentLine = '';
                                } else {
                                    let tempLine = '';
                                    for (const char of segment) {
                                        const testTemp = tempLine + char;
                                        if (measureWidth(testTemp) <= maxWidth) {
                                            tempLine = testTemp;
                                        } else {
                                            if (tempLine) {
                                                if (isPunctuation(char)) {
                                                    if (measureWidth(tempLine + char) <= maxWidth * 1.1) {
                                                        tempLine += char;
                                                    } else {
                                                        lines.push(tempLine);
                                                        tempLine = char;
                                                    }
                                                } else {
                                                    lines.push(tempLine);
                                                    tempLine = char;
                                                }
                                            } else {
                                                tempLine = char;
                                            }
                                        }
                                    }
                                    if (tempLine) {
                                        currentLine = tempLine;
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('处理文本片段时出错:', e);
                        if (currentLine) lines.push(currentLine);
                        currentLine = segment;
                    }
                }

                // 处理最后一行
                if (currentLine) {
                    try {
                        if (!isPunctuation(currentLine) || lines.length === 0) {
                            lines.push(currentLine);
                        } else if (lines.length > 0) {
                            const lastLine = lines[lines.length - 1];
                            const testLastLine = lastLine + currentLine;
                            if (measureWidth(testLastLine) <= maxWidth * 1.1) {
                                lines[lines.length - 1] = testLastLine;
                            } else {
                                lines.push(currentLine);
                            }
                        }
                    } catch (e) {
                        console.warn('处理最后一行时出错:', e);
                        lines.push(currentLine);
                    }
                }

                return lines.length > 0 ? lines : ['水印文字'];
            } catch (e) {
                console.error('wrapText 处理失败:', e);
                return ['水印文字'];
            }
        };

        const lines = wrapText(text, maxWidth);
        const lineHeight = textSize * 1.2; // 行高为字体大小的1.2倍
        const totalHeight = lineHeight * lines.length;

        // 修改绘制单个水印的函数
        const drawSingleWatermark = (x, y, angle) => {
            textCtx.save();
            textCtx.translate(x, y);
            textCtx.rotate(angle * Math.PI / 180);

            // 绘制多行文本
            lines.forEach((line, index) => {
                const lineY = (index - (lines.length - 1) / 2) * lineHeight;
                const lineWidth = textCtx.measureText(line).width;
                textCtx.fillText(line, -lineWidth / 2, lineY + textSize / 2);
            });

            textCtx.restore();
        };

        if (pattern === 'tile') {
            // 平铺模式
            textCtx.save();
            textCtx.translate(canvas.width / 2, canvas.height / 2);
            const angle = parseFloat(configInputSetting.rotate.value);
            textCtx.rotate(angle * Math.PI / 180);

            const maxLineWidth = Math.max(...lines.map(line => textCtx.measureText(line).width));
            const xStep = maxLineWidth + textCtx.measureText('啊').width;
            const yStep = configInputSetting.space.value * (totalHeight + textSize);
            const rectWidth = diagonal;
            const rectHeight = diagonal;
            const startX = -rectWidth / 2;
            const startY = -rectHeight / 2;

            const cols = Math.ceil(rectWidth / xStep);
            const rows = Math.ceil(rectHeight / yStep);

            for (let i = 0; i <= cols; i++) {
                for (let j = 0; j <= rows; j++) {
                    const x = startX + i * xStep;
                    const y = startY + j * yStep;
                    lines.forEach((line, index) => {
                        const lineY = y + (index - (lines.length - 1) / 2) * lineHeight;
                        const lineWidth = textCtx.measureText(line).width;
                        textCtx.fillText(line, x - lineWidth / 2, lineY + textSize / 2);
                    });
                }
            }
            textCtx.restore();
        } else {
            // 单个水印或自定义数量模式
            const positions = [];
            const padding = Math.min(canvas.width, canvas.height) * 0.1;

            if (pattern === 'single' || count === 1) {
                // 单个水印位置计算
                const maxLineWidth = Math.max(...lines.map(line => textCtx.measureText(line).width));

                switch (position) {
                    case 'center':
                        positions.push([canvas.width / 2, canvas.height / 2]);
                        break;
                    case 'top-left':
                        positions.push([maxLineWidth / 2 + padding, totalHeight / 2 + padding]);
                        break;
                    case 'top-right':
                        positions.push([canvas.width - maxLineWidth / 2 - padding, totalHeight / 2 + padding]);
                        break;
                    case 'bottom-left':
                        positions.push([maxLineWidth / 2 + padding, canvas.height - totalHeight / 2 - padding]);
                        break;
                    case 'bottom-right':
                        positions.push([canvas.width - maxLineWidth / 2 - padding, canvas.height - totalHeight / 2 - padding]);
                        break;
                    default:
                        positions.push([canvas.width / 2, canvas.height / 2]); // 默认居中
                }
            } else {
                // 自定义数量水印的均匀分布
                // const area = canvas.width * canvas.height;
                // const spacing = Math.sqrt(area / count); // 计算水印间距

                const cols = Math.ceil(Math.sqrt(count * canvas.width / canvas.height));
                const rows = Math.ceil(count / cols);

                const xStep = (canvas.width - 2 * padding) / (cols - 1 || 1);
                const yStep = (canvas.height - 2 * padding) / (rows - 1 || 1);

                let currentCount = 0;
                for (let i = 0; i < cols && currentCount < count; i++) {
                    for (let j = 0; j < rows && currentCount < count; j++) {
                        positions.push([
                            padding + i * xStep,
                            padding + j * yStep
                        ]);
                        currentCount++;
                    }
                }
            }

            const angle = parseFloat(configInputSetting.rotate.value);
            positions.forEach(([x, y]) => {
                drawSingleWatermark(x, y, angle);
            });
        }
    } catch (error) {
        console.error('绘制水印时发生错误:', error);
        // 尝试恢复原始图片
        try {
            redrawCanvas(canvas, img);
        } catch (e) {
            console.error('恢复原始图片失败:', e);
        }
    }
};

// 添加支持的图片类型设置
const SUPPORTED_IMAGE_TYPES = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'image/bmp': ['bmp'],
    'image/x-icon': ['ico'],
    'image/vnd.microsoft.icon': ['ico']
};

// 检查文件类型是否支持
function isImageTypeSupported(file) {
    return Object.keys(SUPPORTED_IMAGE_TYPES).includes(file.type);
}

// 获取文件扩展名
// function getFileExtension(file) {
//     const ext = file.name.split('.').pop().toLowerCase();
//     for (const [mimeType, extensions] of Object.entries(SUPPORTED_IMAGE_TYPES)) {
//         if (extensions.includes(ext)) {
//             return ext;
//         }
//     }
//     return null;
// }

image.addEventListener('change', function () {
    const batchFileHandler = function (file) {
        if (!isImageTypeSupported(file)) {
            const supportedFormats = Object.values(SUPPORTED_IMAGE_TYPES).flat().join('、');
            return alert(`不支持的图片格式。支持的格式：${supportedFormats}`);
        }
        readFile(file);
    };
    [...this.files].forEach(batchFileHandler);
});

inputItems.forEach(function (item) {
    var el;
    el = $('#' + item);
    configInputSetting[item] = el;
    return el.addEventListener('input', () => {
        allCanvas.forEach(({
                               canvas,
                               img
                           }) => {
            drawText(canvas, img);
        });
    });
});

const container = $('#container');

// 添加空状态类
graph.classList.add('drag-area', 'empty');

container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    graph.classList.add('dragover');
});

container.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    graph.classList.remove('dragover');
});

container.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    graph.classList.remove('dragover');

    const files = [...e.dataTransfer.files];
    files.forEach(file => {
        if (!isImageTypeSupported(file)) {
            const supportedFormats = Object.values(SUPPORTED_IMAGE_TYPES).flat().join('、');
            return alert(`不支持的图片格式。支持的格式：${supportedFormats}`);
        }
        readFile(file);
    });
});

previewModal = $('#previewModal');
previewImage = $('#previewImage');

previewModal.addEventListener('click', function (e) {
    // 如果点击的是模态框本身（而不是图片），则关闭预览
    if (e.target === this) {
        closePreview();
    }
});

// 添加预览图片的点击事件
previewImage.addEventListener('click', function (e) {
    e.stopPropagation(); // 阻止事件冒泡到模态框
    closePreview();
});

// 抽取关闭预览的函数
function closePreview() {
    const modal = document.getElementById('previewModal');
    const previewImg = document.getElementById('previewImage');

    modal.classList.remove('active');

    // 等待过渡动画完成后清理资源
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('loading');
        if (previewImg.src.startsWith('blob:')) {
            URL.revokeObjectURL(previewImg.src);
        }
        previewImg.src = '';
        previewImg.classList.remove('blur');
    }, 300);
}

const uploadBox = $('.upload-box');

uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.add('dragover');
});

uploadBox.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('dragover');
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('dragover');

    const files = [...e.dataTransfer.files];
    files.forEach(file => {
        if (!isImageTypeSupported(file)) {
            const supportedFormats = Object.values(SUPPORTED_IMAGE_TYPES).flat().join('、');
            return alert(`不支持的图片格式。支持的格式：${supportedFormats}`);
        }
        readFile(file);
    });
});

// 添加删除所有照片的函数
function deleteAll() {
    if (allCanvas.length === 0) {
        alert('没有可删除的图片');
        return;
    }

    if (confirm('确定要删除所有图片吗？')) {
        // 清空数组
        allCanvas.length = 0;
        // 清空显示区域
        const graph = document.getElementById('graph');
        graph.innerHTML = '';
        graph.classList.add('empty');
    }
}

// 修改 downloadAll 函数
function downloadAll() {
    const btn = document.querySelector('.btn-primary');
    if (allCanvas.length === 0) {
        alert('没有可下载的图片');
        return;
    }

    btn.classList.add('loading');

    // 检查是否加载了 JSZip
    if (typeof JSZip === 'undefined') {
        alert('正在加载必要组件，请稍后再试');
        btn.classList.remove('loading');
        return;
    }

    // 创建进度提示元素
    let progressElement = document.getElementById('downloadProgress');
    if (!progressElement) {
        progressElement = createProgressElement();
        btn.parentNode.insertBefore(progressElement, btn.nextSibling);
    }

    const progressBar = progressElement.querySelector('.progress-inner');
    const progressText = progressElement.querySelector('.progress-text');
    const progressEta = progressElement.querySelector('.progress-eta');
    const cancelBtn = progressElement.querySelector('.cancel-btn');
    const retryBtn = progressElement.querySelector('.retry-btn');

    progressElement.style.display = 'block';
    progressBar.style.width = '0%';
    retryBtn.style.display = 'none';
    cancelBtn.style.display = 'block';

    // 取消下载标志和控制器
    let isCancelled = false;
    let abortController = new AbortController();

    // 添加取消下载功能
    cancelBtn.onclick = () => {
        if (confirm('确定要取消下载吗？')) {
            isCancelled = true;
            abortController.abort(); // 中断所有操作
            progressText.textContent = '已取消下载';
            setTimeout(() => {
                progressElement.style.display = 'none';
                btn.classList.remove('loading');
            }, 500);
            showToast('已取消下载');
        }
    };

    // 添加重试功能
    let retryCount = 0;
    const maxRetries = 3;

    const startDownload = () => {
        // 重置控制器
        abortController = new AbortController();
        const signal = abortController.signal;

        const zip = new JSZip();
        const total = allCanvas.length;
        let completed = 0;
        let startTime = Date.now();

        // 根据设备性能自动调整 chunkSize
        const determineChunkSize = () => {
            const memory = navigator?.deviceMemory || 4; // 默认4GB内存
            const cores = navigator?.hardwareConcurrency || 4; // 默认4核

            // 根据设备性能计算合适的chunkSize
            const baseSize = Math.floor(Math.min(memory, cores) * 1.5);
            return Math.max(3, Math.min(baseSize, 10)); // 最小3,最大10
        };

        const chunkSize = determineChunkSize();
        const chunks = [];

        for (let i = 0; i < allCanvas.length; i += chunkSize) {
            chunks.push(allCanvas.slice(i, i + chunkSize));
        }

        // 更新预估时间
        const updateETA = (completed) => {
            if (completed === 0) return;

            const elapsed = Date.now() - startTime;
            const rate = completed / elapsed; // 每毫秒处理的数量
            const remaining = total - completed;
            const eta = remaining / rate; // 预估剩余毫秒数

            const formatTime = (ms) => {
                if (ms < 60000) return `${Math.ceil(ms / 1000)}秒`;
                return `${Math.ceil(ms / 60000)}分钟`;
            };

            progressEta.textContent = `预计剩余时间: ${formatTime(eta)}`;
        };

        // 处理单个图片的函数
        const processImage = (item) => {
            return new Promise((resolve, reject) => {
                // 检查是否已取消
                if (signal.aborted) {
                    reject(new Error('用户取消下载'));
                    return;
                }

                const attempt = (retryCount = 0) => {
                    item.canvas.toBlob((blob) => {
                        // 再次检查是否已取消
                        if (signal.aborted) {
                            reject(new Error('用户取消下载'));
                            return;
                        }

                        if (!blob) {
                            if (retryCount < 3) {
                                setTimeout(() => attempt(retryCount + 1), 1000);
                                return;
                            }
                            reject(new Error('转换图片失败'));
                            return;
                        }

                        let fileName = item.fileName.replace(/\.[^/.]+$/, "") + '.png';
                        zip.file(fileName, blob);
                        completed++;

                        // 更新进度
                        const progress = (completed / total * 100).toFixed(1);
                        progressBar.style.width = progress + '%';
                        progressText.textContent = `正在处理: ${completed}/${total} (${progress}%)`;
                        updateETA(completed);

                        resolve();
                    }, 'image/png');
                };

                attempt();
            });
        };

        // 按组处理图片
        return chunks.reduce((promise, chunk) => {
            return promise.then(() => {
                // 检查是否已取消
                if (signal.aborted) {
                    throw new Error('用户取消下载');
                }
                return Promise.all(chunk.map(processImage));
            });
        }, Promise.resolve())
            .then(() => {
                // 检查是否已取消
                if (signal.aborted) {
                    throw new Error('用户取消下载');
                }

                progressText.textContent = '正在生成压缩包...';

                return zip.generateAsync({
                    type: 'blob',
                    compression: 'DEFLATE',
                    compressionOptions: {level: 6}
                }, (metadata) => {
                    // 检查是否已取消
                    if (signal.aborted) {
                        throw new Error('用户取消下载');
                    }
                    if (metadata.percent) {
                        const progress = metadata.percent.toFixed(1);
                        progressBar.style.width = progress + '%';
                        progressText.textContent = `正在压缩: ${progress}%`;
                    }
                });
            })
            .then((content) => {
                // 最后一次检查是否已取消
                if (signal.aborted) {
                    throw new Error('用户取消下载');
                }

                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = '水印图片_' + new Date().getTime() + '.zip';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);

                setTimeout(() => {
                    progressElement.style.display = 'none';
                    progressBar.style.width = '0%';
                    btn.classList.remove('loading');
                    showToast('下载完成！');
                }, 1000);
            });
    };

    // 开始下载并处理错误
    startDownload().catch((error) => {
        console.error('下载失败:', error);

        // 如果是用户取消，不显示错误
        if (error.message === '用户取消下载') {
            return;
        }

        progressText.textContent = '下载失败';
        cancelBtn.style.display = 'none';

        if (retryCount < maxRetries) {
            retryBtn.style.display = 'block';
            retryBtn.onclick = () => {
                retryCount++;
                retryBtn.style.display = 'none';
                cancelBtn.style.display = 'block';
                startDownload();
            };
        } else {
            progressElement.style.display = 'none';
            btn.classList.remove('loading');
            showToast('下载失败，请重试');
        }
    });
}

// 添加主题切换功能
function toggleTheme() {
    const html = document.documentElement;
    const themeIcon = document.querySelector('.theme-icon');
    const currentTheme = html.getAttribute('data-theme');

    if (currentTheme === 'dark') {
        html.removeAttribute('data-theme');
        themeIcon.textContent = '🌞';
        localStorage.setItem('theme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    }
}

// 页面加载时检查主题设置
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const themeIcon = document.querySelector('.theme-icon');

    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '🌙';
    }
});

// 优化移动端触摸体验
function initTouchEvents() {
    // 防止双击缩放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // 优化触摸反馈
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('touchstart', () => {
            button.style.transform = 'scale(0.98)';
        });
        button.addEventListener('touchend', () => {
            button.style.transform = 'none';
        });
    });
}

// 页面加载完成后初始化触摸事件
document.addEventListener('DOMContentLoaded', () => {
    initTouchEvents();
    // 现有的 DOMContentLoaded 代码...
});

// 添加粘贴上传功能
document.addEventListener('paste', (e) => {
    e.preventDefault();
    const items = e.clipboardData.items;

    for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (isImageTypeSupported(file)) {
                readFile(file);
            } else {
                const supportedFormats = Object.values(SUPPORTED_IMAGE_TYPES).flat().join('、');
                alert(`不支持的图片格式。支持的格式：${supportedFormats}`);
            }
        }
    }
});

// 添加图片计数功能
// function updateImageCount() {
//     const countElement = document.getElementById('imageCount');
//     if (!countElement) {
//         const container = document.querySelector('.upload-container');
//         const countDiv = document.createElement('div');
//         countDiv.id = 'imageCount';
//         countDiv.style.marginTop = '10px';
//         countDiv.style.fontSize = '14px';
//         countDiv.style.color = 'var(--secondary-text)';
//         container.appendChild(countDiv);
//     }
//     const count = allCanvas.length;
//     document.getElementById('imageCount').textContent =
//         `已选择 ${count} 张图片${count > 0 ? '，可以拖动图片调整顺序' : ''}`;
// }

// 添加拖拽排序功能
function initDragSort() {
    const graph = document.getElementById('graph');
    let draggedItem = null;

    graph.addEventListener('dragstart', (e) => {
        if (e.target.closest('.image-container')) {
            draggedItem = e.target.closest('.image-container');
            e.target.style.opacity = '0.5';
        }
    });

    graph.addEventListener('dragend', (e) => {
        if (e.target.closest('.image-container')) {
            e.target.style.opacity = '1';
        }
    });

    graph.addEventListener('dragover', (e) => {
        e.preventDefault();
        const container = e.target.closest('.image-container');
        if (container && container !== draggedItem) {
            const rect = container.getBoundingClientRect();
            const midpoint = rect.x + rect.width / 2;
            if (e.clientX < midpoint) {
                container.style.borderLeft = '3px solid var(--button-primary)';
                container.style.borderRight = '';
            } else {
                container.style.borderRight = '3px solid var(--button-primary)';
                container.style.borderLeft = '';
            }
        }
    });

    graph.addEventListener('dragleave', (e) => {
        const container = e.target.closest('.image-container');
        if (container) {
            container.style.borderLeft = '';
            container.style.borderRight = '';
        }
    });

    graph.addEventListener('drop', (e) => {
        e.preventDefault();
        const container = e.target.closest('.image-container');
        if (container && draggedItem) {
            const rect = container.getBoundingClientRect();
            const midpoint = rect.x + rect.width / 2;
            const insertAfter = e.clientX > midpoint;

            if (insertAfter) {
                container.parentNode.insertBefore(draggedItem, container.nextSibling);
            } else {
                container.parentNode.insertBefore(draggedItem, container);
            }

            // 更新 allCanvas 数组顺序
            const newOrder = [...graph.children].map(child => {
                return allCanvas.find(item => item.canvas === child.querySelector('canvas'));
            });
            allCanvas.length = 0;
            allCanvas.push(...newOrder);
        }

        // 清除所有边框样式
        graph.querySelectorAll('.image-container').forEach(container => {
            container.style.borderLeft = '';
            container.style.borderRight = '';
        });
    });
}

// 在页面加载完成后初始化拖拽排序
document.addEventListener('DOMContentLoaded', () => {
    initDragSort();
    // ... 其他初始化代码 ...
});

// 添加布局方式切换的事件监听
document.addEventListener('DOMContentLoaded', () => {
    const patternSelect = document.getElementById('watermarkPattern');
    const customControls = document.getElementById('customPatternControls');
    const positionControls = document.getElementById('positionControls');

    patternSelect.addEventListener('change', () => {
        const pattern = patternSelect.value;
        customControls.style.display = pattern === 'custom' ? 'block' : 'none';
        positionControls.style.display = pattern === 'single' ? 'block' : 'none';

        // 更新所有画布
        allCanvas.forEach(({canvas, img}) => {
            drawText(canvas, img);
        });
    });

    // 初始化其他控件的事件监听
    ['watermarkCount', 'watermarkPosition'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                allCanvas.forEach(({canvas, img}) => {
                    drawText(canvas, img);
                });
            });
        }
    });
});

// 添加角度显示的实时更新
document.addEventListener('DOMContentLoaded', () => {
    const rotateInput = document.getElementById('rotate');
    const rotateValue = document.getElementById('rotateValue');

    rotateInput.addEventListener('input', () => {
        rotateValue.textContent = `${rotateInput.value}°`;
    });

    // ... 其他初始化代码 ...
});

document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text');

    // 处理粘贴事件
    textInput.addEventListener('paste', (e) => {
        e.preventDefault();

        // 获取粘贴的文本
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');

        // 将文本插入到当前光标位置
        const start = textInput.selectionStart;
        // const end = textInput.selectionEnd;
        // const text = textInput.value;
        // const newText = text.slice(0, start) + pastedText + text.slice(end);
        textInput.value = newText;

        // 更新光标位置
        const newCursorPos = start + pastedText.length;
        textInput.setSelectionRange(newCursorPos, newCursorPos);

        // 触发 input 事件以更新水印
        textInput.dispatchEvent(new Event('input'));
    });

    // 优化输入体验
    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // 防止回车提交表单
            textInput.blur(); // 失去焦点
        }
    });

    // 添加输入限制（可选）
    textInput.addEventListener('input', () => {
        // 如果需要限制输入长度，可以在这里添加
        if (textInput.value.length > 100) { // 假设最大长度为100
            textInput.value = textInput.value.slice(0, 100);
        }
    });
});

// 添加复制到剪贴板的函数
function copyImageToClipboard(canvas) {
    canvas.toBlob(blob => {
        try {
            const item = new ClipboardItem({"image/png": blob});
            navigator.clipboard.write([item]).then(() => {
                // 显示成功提示
                showToast('图片已复制到剪贴板');
            }).catch(err => {
                console.error('复制失败:', err);
                showToast('复制失败，请重试');
            });
        } catch (err) {
            console.error('复制失败:', err);
            showToast('您的浏览器不支持此功能');
        }
    }, 'image/png');
}

// 添加提示框功能
function showToast(message) {
    // 检查是否已存在toast元素
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }

    // 设置消息并显示
    toast.textContent = message;
    toast.classList.add('show');

    // 3秒后隐藏
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 修改 showPreview 函数，优化性能
function showPreview(canvas, direction = null) {
    const modal = document.getElementById('previewModal');
    const previewImg = document.getElementById('previewImage');

    // 添加加载状态
    modal.classList.add('loading');
    modal.style.display = 'flex';

    // 存储当前预览的画布索引
    const currentIndex = allCanvas.findIndex(item => item.canvas === canvas);
    previewModal.dataset.currentCanvas = currentIndex;

    // 预加载相邻图片
    const preloadAdjacentImages = () => {
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : allCanvas.length - 1;
        const nextIndex = currentIndex < allCanvas.length - 1 ? currentIndex + 1 : 0;

        [prevIndex, nextIndex].forEach(index => {
            const adjacentCanvas = allCanvas[index].canvas;
            if (adjacentCanvas) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'image';
                link.href = adjacentCanvas.toDataURL('image/jpeg', 0.5);
                document.head.appendChild(link);
                setTimeout(() => document.head.removeChild(link), 1000);
            }
        });
    };

    // 优化过渡动画
    const applyTransition = () => {
        if (direction) {
            previewImg.style.transition = 'transform 0.2s ease-out';
            previewImg.style.transform = `translateX(${direction === 'prev' ? '100%' : '-100%'})`;

            requestAnimationFrame(() => {
                previewImg.style.transform = 'translateX(0)';
            });
        }
    };

    // 使用 createImageBitmap 优化图片处理
    createImageBitmap(canvas)
        .then(bitmap => {
            const thumbnailCanvas = document.createElement('canvas');
            const maxThumbnailSize = 800;
            const scale = Math.min(1, maxThumbnailSize / Math.max(canvas.width, canvas.height));
            thumbnailCanvas.width = canvas.width * scale;
            thumbnailCanvas.height = canvas.height * scale;

            const ctx = thumbnailCanvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);

            // 先显示缩略图
            previewImg.src = thumbnailCanvas.toDataURL('image/jpeg', 0.5);
            previewImg.classList.add('blur');

            // 应用过渡动画
            applyTransition();

            requestAnimationFrame(() => {
                modal.classList.add('active');

                // 使用 OffscreenCanvas 进行高质量渲染（如果支持）
                const renderHighQuality = () => {
                    if (typeof OffscreenCanvas !== 'undefined') {
                        const offscreen = new OffscreenCanvas(canvas.width, canvas.height);
                        const octx = offscreen.getContext('2d');
                        octx.drawImage(canvas, 0, 0);
                        return offscreen.convertToBlob({type: 'image/jpeg', quality: 0.92});
                    } else {
                        return new Promise(resolve => {
                            canvas.toBlob(resolve, 'image/jpeg', 0.92);
                        });
                    }
                };

                renderHighQuality().then(blob => {
                    const url = URL.createObjectURL(blob);
                    const highQualityImg = new Image();

                    highQualityImg.onload = () => {
                        previewImg.src = url;
                        previewImg.classList.remove('blur');
                        modal.classList.remove('loading');

                        // 清理资源
                        bitmap.close();
                        thumbnailCanvas.remove();
                        URL.revokeObjectURL(url);

                        // 预加载相邻图片
                        preloadAdjacentImages();
                    };

                    highQualityImg.src = url;
                });
            });
        })
        .catch(error => {
            console.error('图片处理失败:', error);
            modal.classList.remove('loading');
            showToast('图片加载失败，请重试');
        });
}

// 优化图片切换函数
function switchPreviewImage(direction) {
    const currentIndex = parseInt(previewModal.dataset.currentCanvas);
    if (isNaN(currentIndex) || allCanvas.length <= 1) return;

    let nextIndex;
    if (direction === 'prev') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : allCanvas.length - 1;
    } else {
        nextIndex = currentIndex < allCanvas.length - 1 ? currentIndex + 1 : 0;
    }

    showPreview(allCanvas[nextIndex].canvas, direction);
}

// 修改键盘事件监听中的图片切换部分
document.addEventListener('keydown', (e) => {
    if (previewModal.style.display === 'flex') {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            switchPreviewImage('prev');
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            switchPreviewImage('next');
        }
    }
});

// 添加触摸滑动支持
let touchStartX = 0;
previewModal.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
});

previewModal.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;

    if (Math.abs(diff) > 50) { // 最小滑动距离
        if (diff > 0) {
            switchPreviewImage('prev');
        } else {
            switchPreviewImage('next');
        }
    }
});

// 添加预览导航按钮（可选）
const navigationHtml = `
    <button class="preview-nav prev" onclick="switchPreviewImage('prev')">&lt;</button>
    <button class="preview-nav next" onclick="switchPreviewImage('next')">&gt;</button>
    `;

previewModal.insertAdjacentHTML('beforeend', navigationHtml);


/**
 * 水印渲染器类
 * 负责处理水印的绘制和样式设置
 */
class WatermarkRenderer {
    /**
     * 构造函数
     * @param {HTMLCanvasElement} canvas - 目标画布
     * @param {Object} config - 水印配置
     */
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        // this.config = config;

        // 初始化缓存
        this.initCache();
    }

    /**
     * 初始化计算缓存
     * @private
     */
    // initCache() {
    //     this._cache = {
    //         diagonal: 0,
    //         fontSize: 0,
    //         style: null,
    //         configHash: null,
    //         textMetrics: new Map()
    //     };
    // }

    /**
     * 渲染水印
     * @param {HTMLImageElement} img - 源图片
     */
    render(img) {
        this.clearCanvas();
        this.drawImage(img);
        this.drawWatermark();
    }

    /**
     * 清空画布
     * @private
     */
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * 绘制源图片
     * @private
     * @param {HTMLImageElement} img - 源图片
     */
    drawImage(img) {
        this.ctx.drawImage(img, 0, 0);
    }

}

/**
 * 文件处理类
 * 负责处理文件上传和读取
 */
class FileHandler {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     * @param {Function} options.onFileRead - 文件读取成功回调
     * @param {Function} options.onError - 错误处理回调
     */
    constructor(options = {}) {
        this.onFileRead = options.onFileRead;
        this.onError = options.onError;
    }

    // ... 其他方法
}

/**
 * UI 管理类
 * 负责处理界面交互和事件绑定
 */
class WatermarkUI {
    constructor() {
        this.initElements();
        this.bindEvents();
    }

    // ... 其他方法
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const ui = new WatermarkUI();
    const fileHandler = new FileHandler({
        onFileRead: (img, file) => {
            const canvas = document.createElement('canvas');
            const renderer = new WatermarkRenderer(canvas, configInputSetting);
            renderer.render(img);
            ui.addImageToGallery(canvas, file.name);
        },
        onError: (msg) => ui.showError(msg)
    });
});

// 修改进度条HTML结构
function createProgressElement() {
    const progressElement = document.createElement('div');
    progressElement.id = 'downloadProgress';
    progressElement.className = 'download-progress';
    progressElement.innerHTML = `
            <div class="progress-container">
                <div class="progress-text">准备下载...</div>
                <div class="progress-bar">
                    <div class="progress-inner"></div>
                </div>
                <div class="progress-eta"></div>
            </div>
            <div class="progress-actions">
                <button class="cancel-btn">
                    <span class="btn-icon">✕</span>
                    <span>取消</span>
                </button>
                <button class="retry-btn">
                    <span class="btn-icon">↻</span>
                    <span>重试</span>
                </button>
            </div>
        `;
    return progressElement;
}


// 添加键盘快捷键支持
document.addEventListener('keydown', (e) => {
    // 如果正在输入文本,不触发快捷键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    // Ctrl/Command + D: 下载全部图片
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        downloadAll();
    }

    // Delete: 删除全部图片
    if (e.key === 'Delete') {
        e.preventDefault();
        deleteAll();
    }

    // Ctrl/Command + V: 触发粘贴
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // 已有粘贴事件处理,无需额外处理
        return;
    }

    // Escape: 关闭预览
    if (e.key === 'Escape' && previewModal.style.display === 'flex') {
        e.preventDefault();
        closePreview();
    }

    // 左右方向键: 在预览模式下切换图片
    if (previewModal.style.display === 'flex' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const currentCanvas = allCanvas.find(item =>
            item.canvas.toDataURL() === previewImage.src ||
            URL.createObjectURL(dataURItoBlob(item.canvas.toDataURL())) === previewImage.src
        );
        if (currentCanvas) {
            const currentIndex = allCanvas.indexOf(currentCanvas);
            let nextIndex;
            if (e.key === 'ArrowLeft') {
                nextIndex = currentIndex > 0 ? currentIndex - 1 : allCanvas.length - 1;
            } else {
                nextIndex = currentIndex < allCanvas.length - 1 ? currentIndex + 1 : 0;
            }
            showPreview(allCanvas[nextIndex].canvas);
        }
    }

    // 数字键1-9: 快速调整水印大小
    if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const sizeInput = document.getElementById('size');
        const newSize = parseFloat(e.key) / 3; // 将1-9映射到0.33-3的范围
        sizeInput.value = newSize;
        sizeInput.dispatchEvent(new Event('input'));
    }

    // Ctrl/Command + Z: 撤销最后一次删除
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (lastDeletedCanvas) {
            const container = document.createElement('div');
            container.className = 'image-container';
            container.appendChild(lastDeletedCanvas.canvas);
            graph.appendChild(container);
            allCanvas.push(lastDeletedCanvas);
            lastDeletedCanvas = null;
            showToast('已恢复上一次删除的图片');
        }
    }
});

// 添加变量用于存储最后删除的图片
let lastDeletedCanvas = null;

// 修改删除按钮的点击处理函数
const deleteBtn = document.createElement('button');
deleteBtn.className = 'download-btn delete-btn';
deleteBtn.textContent = '删除';
deleteBtn.onclick = (e) => {
    e.stopPropagation();
    const index = allCanvas.findIndex(item => item.canvas === canvas);
    if (index > -1) {
        lastDeletedCanvas = allCanvas[index]; // 保存被删除的图片
        allCanvas.splice(index, 1);
    }
    container.remove();

    if (graph.children.length === 0) {
        graph.classList.add('empty');
    }
    showToast('图片已删除，按 Ctrl+Z 可恢复');
};

// 添加键盘快捷键提示到页面上
const shortcutsHtml = `
    <div class="shortcuts-info" style="margin-top: 20px; color: var(--secondary-text); font-size: 14px;">
        <p>键盘快捷键:</p>
        <ul style="list-style: none; padding-left: 0; columns: 2;">
            <li>⌘/Ctrl + D: 下载全部图片</li>
            <li>⌘/Ctrl + V: 粘贴图片</li>
            <li>Delete: 删除全部图片</li>
            <li>⌘/Ctrl + Z: 撤销删除</li>
            <li>Esc: 关闭预览</li>
            <li>←/→: 预览时切换图片</li>
            <li>1-9: 快速调整水印大小</li>
        </ul>
    </div>
    `;

// 将快捷键说明添加到页面中
document.querySelector('article').insertAdjacentHTML('afterend', shortcutsHtml);

// 在 <input id="text"> 后面添加模板选择按钮组
const textInput = document.querySelector('#text').parentElement;
const templateHtml = `
    <div class="template-buttons" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px;">
        <button class="template-btn" data-text="仅供办理XX使用，他用无效">办事模板</button>
        <button class="template-btn" data-text="仅用于XX认证，他用无效">认证模板</button>
        <button class="template-btn" data-text="复印件与原件相符">复印核验</button>
        <button class="template-btn" data-text="该证件仅供XX查看，不得他用">证件模板</button>
        <button class="template-btn" data-text="内部资料，请勿外传">内部资料</button>
        <button class="template-btn" data-text="版权所有，严禁外传">版权声明</button>
    </div>
    `;

textInput.insertAdjacentHTML('beforeend', templateHtml);

// 添加模板按钮点击事件
document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const text = btn.dataset.text;
        const textInput = document.getElementById('text');
        textInput.value = text;
        textInput.dispatchEvent(new Event('input')); // 触发更新水印

        // 添加点击反馈
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => btn.style.transform = '', 100);
    });
});

    // 尝试加载本地 jszip
    function loadJSZip() {
    return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = './js/jszip.min.js';
    script.onload = resolve;
    script.onerror = () => {
    // 本地加载失败，尝试从 CDN 加载
    const cdnScript = document.createElement('script');
    cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    cdnScript.onload = resolve;
    cdnScript.onerror = reject;
    document.head.appendChild(cdnScript);
};
    document.head.appendChild(script);
});
}

    // 页面加载完成后加载 JSZip
    document.addEventListener('DOMContentLoaded', () => {
    loadJSZip().catch(err => {
        console.error('JSZip 加载失败:', err);
        alert('组件加载失败，部分功能可能无法使用。请检查网络连接后刷新页面重试。');
    });
});
