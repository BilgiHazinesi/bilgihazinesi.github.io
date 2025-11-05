'use strict';

window.onload = () => {

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    // --- DOM ELEMENTLERİ ---
    const fileInput = document.getElementById('file-input');
    const uploadScreen = document.getElementById('upload-screen');
    const initialUploadButton = document.getElementById('initial-upload-button');
    const editorScreen = document.getElementById('editor-screen');

    // Sol Panel
    const sourceLibraryList = document.getElementById('source-library-list');
    const selectionList = document.getElementById('selection-list');
    const addMoreFilesBtn = document.getElementById('add-more-files-btn');

    // Orta Panel - Sekmeler
    const tabSourceBtn = document.getElementById('tab-source');
    const tabLayoutBtn = document.getElementById('tab-layout');
    const sourceView = document.getElementById('source-view');
    const layoutView = document.getElementById('layout-view');

    // Sekme 1: Kaynak Editörü
    const sourceScrollContainer = document.getElementById('source-scroll-container');
    const pdfViewerContainer = document.getElementById('pdf-viewer-container');
    const canvas = document.getElementById('pdf-canvas');
    const imageViewer = document.getElementById('image-viewer');
    const pdfControls = document.getElementById('pdf-controls');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageNumSpan = document.getElementById('page-num');
    const pageCountSpan = document.getElementById('page-count');
    const zoomInSourceBtn = document.getElementById('zoom-in-source');
    const zoomOutSourceBtn = document.getElementById('zoom-out-source');
    const zoomLevelSourceSpan = document.getElementById('zoom-level-source');

    // Sekme 2: Layout
    const layoutCanvas = document.getElementById('layout-canvas');

    // Sağ Panel - Ayarlar
    const titleInput = document.getElementById('pdf-title');
    const orientationSelect = document.getElementById('orientation');
    const leftHeaderInput = document.getElementById('left-header');
    const rightHeaderInput = document.getElementById('right-header');
    const logoCheckbox = document.getElementById('logo-checkbox');
    const layoutTypeSelect = document.getElementById('layout-type');
    const createPdfBtn = document.getElementById('create-pdf-btn');

    // --- GLOBAL DEĞİŞKENLER ---
    let sourceLibrary = [];
    let selectionListData = [];
    let activeSourceId = null;
    let activePdfDoc = null;
    let activePdfPageNum = 1;
    let currentSourceZoom = 1.0;
    let isEditorInitialized = false;
    
    let cropStart = null;
    let cropBox = null;
    let isCropping = false;

    const ctx = canvas.getContext('2d');

    // --- UYGULAMA BAŞLANGICI ---

    initialUploadButton.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (!files || !files.length) return;

        if (!isEditorInitialized) {
            uploadScreen.classList.add('hidden');
            editorScreen.classList.remove('hidden');
            setupEditorEventListeners();
            isEditorInitialized = true;
        }

        loadFiles(files);
        fileInput.value = '';
    });

    function setupEditorEventListeners() {
        tabSourceBtn.addEventListener('click', () => switchTab('source'));
        tabLayoutBtn.addEventListener('click', () => switchTab('layout'));

        addMoreFilesBtn.addEventListener('click', () => fileInput.click());

        zoomInSourceBtn.addEventListener('click', () => zoomSource(0.25));
        zoomOutSourceBtn.addEventListener('click', () => zoomSource(-0.25));

        prevPageBtn.addEventListener('click', () => changePdfPage(-1));
        nextPageBtn.addEventListener('click', () => changePdfPage(1));

        createPdfBtn.addEventListener('click', createPdf);

        // Kırpma olayları
        sourceScrollContainer.addEventListener('mousedown', startCrop);
        sourceScrollContainer.addEventListener('mousemove', moveCrop);
        sourceScrollContainer.addEventListener('mouseup', endCrop);
    }

    // --- DOSYA YÜKLEME ---

    async function loadFiles(files) {
        const placeholder = document.getElementById('source-list-placeholder');
        if (placeholder) placeholder.remove();

        const filePromises = Array.from(files).map(file => {
            const sourceId = 'source-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            let sourceData = {
                id: sourceId,
                name: file.name,
                type: null,
                data: null,
                file: file,
            };

            if (file.type === 'application/pdf') {
                sourceData.type = 'pdf';
                return loadPdfData(file).then(pdfDoc => {
                    sourceData.data = pdfDoc;
                    sourceData.totalPages = pdfDoc.numPages;
                    sourceData.currentPage = 1;
                    return sourceData;
                }).catch(error => {
                    console.error(`PDF yüklenemedi: ${file.name}`, error);
                    return null;
                });
            } else if (file.type.startsWith('image/')) {
                sourceData.type = 'image';
                return loadImageData(file).then(imageDataUrl => {
                    sourceData.data = imageDataUrl;
                    return sourceData;
                }).catch(error => {
                    console.error(`Resim yüklenemedi: ${file.name}`, error);
                    return null;
                });
            } else {
                console.warn(`Desteklenmeyen dosya tipi: ${file.name}`);
                return Promise.resolve(null);
            }
        });

        const loadedSources = (await Promise.all(filePromises)).filter(Boolean);
        sourceLibrary.push(...loadedSources);
        loadedSources.forEach(addSourceToLibraryList);

        if (sourceLibrary.length > 0 && !activeSourceId) {
            switchTab('source');
            showSourceInEditor(sourceLibrary[0].id);
        }
    }

    function loadPdfData(file) {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.onload = async function() {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    resolve(pdf);
                } catch (error) {
                    reject(error);
                }
            };
            fileReader.onerror = reject;
            fileReader.readAsArrayBuffer(file);
        });
    }

    function loadImageData(file) {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.onload = function() {
                resolve(this.result);
            };
            fileReader.onerror = reject;
            fileReader.readAsDataURL(file);
        });
    }

    function addSourceToLibraryList(sourceData) {
        const li = document.createElement('li');
        li.className = 'source-item';
        li.id = sourceData.id;
        const icon = sourceData.type === 'pdf' ? '[PDF]' : '[IMG]';
        li.textContent = `${icon} ${sourceData.name}`;

        li.addEventListener('click', () => {
            switchTab('source');
            showSourceInEditor(sourceData.id);
        });

        sourceLibraryList.appendChild(li);
    }

    // --- SEKME YÖNETİMİ ---

    function switchTab(tabName) {
        if (tabName === 'source') {
            tabSourceBtn.classList.add('active');
            sourceView.classList.add('active');
            tabLayoutBtn.classList.remove('active');
            layoutView.classList.remove('active');
        } else {
            tabSourceBtn.classList.remove('active');
            sourceView.classList.remove('active');
            tabLayoutBtn.classList.add('active');
            layoutView.classList.add('active');
            renderLayoutPage();
        }
    }

    // --- KAYNAK GÖRÜNTÜLEME ---

    async function showSourceInEditor(sourceId) {
        if (activeSourceId === sourceId) return;

        const sourceData = sourceLibrary.find(s => s.id === sourceId);
        if (!sourceData) return;

        activeSourceId = sourceId;

        document.querySelectorAll('#source-library-list .source-item').forEach(item => {
            item.classList.toggle('active', item.id === sourceId);
        });

        if (sourceData.type === 'pdf') {
            activePdfDoc = sourceData.data;
            activePdfPageNum = sourceData.currentPage;

            pdfViewerContainer.classList.remove('hidden');
            pdfControls.classList.remove('hidden');
            imageViewer.classList.add('hidden');

            currentSourceZoom = 1.0;
            await renderPdfPage(activePdfPageNum);

        } else if (sourceData.type === 'image') {
            activePdfDoc = null;

            pdfViewerContainer.classList.add('hidden');
            pdfControls.classList.add('hidden');
            imageViewer.classList.remove('hidden');

            await new Promise((resolve) => {
                imageViewer.onload = resolve;
                imageViewer.src = sourceData.data;
            });

            currentSourceZoom = 1.0;
            renderImageViewer();
        }
    }

    async function renderPdfPage(num) {
        if (!activePdfDoc) return;

        const sourceData = sourceLibrary.find(s => s.id === activeSourceId);
        if (sourceData) sourceData.currentPage = num;
        activePdfPageNum = num;

        try {
            const page = await activePdfDoc.getPage(num);
            const viewport = page.getViewport({ scale: currentSourceZoom });

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = { canvasContext: ctx, viewport: viewport };
            await page.render(renderContext).promise;

            pageNumSpan.textContent = num;
            pageCountSpan.textContent = activePdfDoc.numPages;
            zoomLevelSourceSpan.textContent = `${Math.round(currentSourceZoom * 100)}%`;

        } catch (error) {
            console.error("PDF sayfası render edilemedi:", error);
        }
    }

    function renderImageViewer() {
        if (!imageViewer.src || !imageViewer.naturalWidth) return;

        const naturalWidth = imageViewer.naturalWidth;
        imageViewer.style.width = (naturalWidth * currentSourceZoom) + 'px';
        zoomLevelSourceSpan.textContent = `${Math.round(currentSourceZoom * 100)}%`;
    }

    function zoomSource(amount) {
        currentSourceZoom += amount;
        if (currentSourceZoom < 0.25) currentSourceZoom = 0.25;

        if (activePdfDoc) {
            renderPdfPage(activePdfPageNum);
        } else if (imageViewer.src) {
            renderImageViewer();
        }
    }

    async function changePdfPage(direction) {
        if (!activePdfDoc) return;

        const newPageNum = activePdfPageNum + direction;

        if (newPageNum >= 1 && newPageNum <= activePdfDoc.numPages) {
            await renderPdfPage(newPageNum);
        }
    }

    // --- KIRPMA MANTIĞI ---

    function startCrop(e) {
        if (e.button !== 0) return;
        if (!activeSourceId) return;

        const rect = sourceScrollContainer.getBoundingClientRect();
        const x = e.clientX - rect.left + sourceScrollContainer.scrollLeft;
        const y = e.clientY - rect.top + sourceScrollContainer.scrollTop;

        cropStart = { x, y };
        isCropping = true;

        if (cropBox) cropBox.remove();
        cropBox = document.createElement('div');
        cropBox.id = 'crop-selection-box';
        cropBox.classList.add('visible');
        sourceScrollContainer.appendChild(cropBox);
    }

    function moveCrop(e) {
        if (!isCropping || !cropBox || !cropStart) return;

        const rect = sourceScrollContainer.getBoundingClientRect();
        const x = e.clientX - rect.left + sourceScrollContainer.scrollLeft;
        const y = e.clientY - rect.top + sourceScrollContainer.scrollTop;

        const width = Math.abs(x - cropStart.x);
        const height = Math.abs(y - cropStart.y);
        const left = Math.min(cropStart.x, x);
        const top = Math.min(cropStart.y, y);

        cropBox.style.left = left + 'px';
        cropBox.style.top = top + 'px';
        cropBox.style.width = width + 'px';
        cropBox.style.height = height + 'px';
    }

    function endCrop(e) {
        if (!isCropping || !cropBox) {
            isCropping = false;
            return;
        }

        isCropping = false;

        const width = parseInt(cropBox.style.width);
        const height = parseInt(cropBox.style.height);

        if (width > 20 && height > 20) {
            const cropName = prompt('Kırpma adını girin (örn: "Soru 1"):', 'Kırpma ' + (selectionListData.length + 1));
            
            if (cropName) {
                const cropData = {
                    id: 'crop-' + Date.now(),
                    name: cropName,
                    sourceId: activeSourceId,
                    pageNum: activePdfPageNum,
                    x: parseInt(cropBox.style.left),
                    y: parseInt(cropBox.style.top),
                    width: width,
                    height: height,
                    zoom: currentSourceZoom,
                };

                selectionListData.push(cropData);
                addCropToSelectionList(cropData);
            }
        }

        if (cropBox) {
            cropBox.remove();
            cropBox = null;
        }
        cropStart = null;
    }

    function addCropToSelectionList(cropData) {
        const li = document.createElement('li');
        li.className = 'selection-item';
        li.id = cropData.id;

        const label = document.createElement('span');
        label.className = 'item-label';
        label.textContent = cropData.name;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'item-delete-btn';
        deleteBtn.textContent = 'Sil';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            li.remove();
            selectionListData = selectionListData.filter(c => c.id !== cropData.id);
        });

        li.appendChild(label);
        li.appendChild(deleteBtn);
        selectionList.appendChild(li);
    }

    // --- LAYOUT PAGE ---

    function renderLayoutPage() {
        layoutCanvas.innerHTML = '';

        const a4Width = 210;
        const a4Height = 297;
        const scale = 0.5;

        const pageDiv = document.createElement('div');
        pageDiv.className = 'layout-page';
        pageDiv.style.width = (a4Width * scale) + 'mm';
        pageDiv.style.height = (a4Height * scale) + 'mm';
        pageDiv.style.left = '50px';
        pageDiv.style.top = '50px';

        selectionListData.forEach((crop, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'layout-item';
            itemDiv.id = 'layout-' + crop.id;
            itemDiv.style.left = (20 + index * 30) + 'px';
            itemDiv.style.top = (20 + index * 30) + 'px';
            itemDiv.style.width = '100px';
            itemDiv.style.height = '80px';

            const label = document.createElement('span');
            label.className = 'layout-item-label';
            label.textContent = crop.name;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'layout-item-delete';
            deleteBtn.textContent = 'Sil';
            deleteBtn.addEventListener('click', () => {
                selectionListData = selectionListData.filter(c => c.id !== crop.id);
                document.getElementById(crop.id).remove();
                renderLayoutPage();
            });

            itemDiv.appendChild(label);
            itemDiv.appendChild(deleteBtn);

            makeItemDraggable(itemDiv, crop);
            pageDiv.appendChild(itemDiv);
        });

        layoutCanvas.appendChild(pageDiv);
    }

    function makeItemDraggable(element, crop) {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        element.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
            element.classList.add('selected');
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            element.style.left = (e.clientX - layoutCanvas.getBoundingClientRect().left - offsetX) + 'px';
            element.style.top = (e.clientY - layoutCanvas.getBoundingClientRect().top - offsetY) + 'px';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            element.classList.remove('selected');
        });
    }

    // --- PDF OLUŞTURMA ---

    async function createPdf() {
        if (selectionListData.length === 0) {
            alert('Lütfen önce kırpmalar yapın!');
            return;
        }

        const title = titleInput.value || 'Raporunuz';
        const orientation = orientationSelect.value === 'landscape' ? 'l' : 'p';
        const leftHeader = leftHeaderInput.value;
        const rightHeader = rightHeaderInput.value;
        const includeLogo = logoCheckbox.checked;
        const layoutType = layoutTypeSelect.value;

        const doc = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Header ekle
        addHeaderToPage(doc, pageWidth, pageHeight, title, leftHeader, rightHeader, includeLogo);

        // İçerik ekle
        if (layoutType === 'free') {
            await addCropsToPageFree(doc, pageWidth, pageHeight);
        } else if (layoutType === 'column2') {
            await addCropsToPageAuto(doc, pageWidth, pageHeight, 2);
        } else if (layoutType === 'vertical') {
            await addCropsToPageAuto(doc, pageWidth, pageHeight, 1);
        }

        doc.save(title + '.pdf');
        alert('PDF başarıyla oluşturuldu: ' + title + '.pdf');
    }

    function addHeaderToPage(doc, pageWidth, pageHeight, title, leftHeader, rightHeader, includeLogo) {
        const headerY = 8;
        const logoSize = 8;

        // Başlık
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(title, pageWidth / 2, headerY + 5, { align: 'center' });

        // Logo
        if (includeLogo) {
            const logoUrl = 'https://i.imgur.com/hwSvPQK.jpeg';
            try {
                doc.addImage(logoUrl, 'JPEG', pageWidth / 2 - logoSize / 2, headerY, logoSize, logoSize);
            } catch (e) {
                console.warn('Logo yüklenemedi');
            }
        }

        // Üst bilgiler
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(leftHeader, 10, headerY + 15);
        doc.text(rightHeader, pageWidth - 10, headerY + 15, { align: 'right' });

        // Çizgi
        doc.setDrawColor(0);
        doc.line(10, headerY + 18, pageWidth - 10, headerY + 18);
    }

    async function addCropsToPageFree(doc, pageWidth, pageHeight) {
        let yPos = 35;
        const margin = 10;

        for (const crop of selectionListData) {
            const sourceData = sourceLibrary.find(s => s.id === crop.sourceId);
            if (!sourceData) continue;

            try {
                const cropCanvas = await generateCropCanvas(sourceData, crop);
                if (cropCanvas) {
                    const imgData = cropCanvas.toDataURL('image/png');
                    const maxWidth = pageWidth - 2 * margin;
                    const imgHeight = (maxWidth * cropCanvas.height) / cropCanvas.width;

                    if (yPos + imgHeight + 5 > pageHeight - 10) {
                        doc.addPage();
                        yPos = 10;
                        addHeaderToPage(doc, pageWidth, pageHeight, '', '', '', false);
                        yPos = 35;
                    }

                    doc.addImage(imgData, 'PNG', margin, yPos, maxWidth, imgHeight);
                    yPos += imgHeight + 3;

                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.text(crop.name, margin, yPos);
                    yPos += 6;
                }
            } catch (error) {
                console.error('Kırpma işlenemedi:', error);
            }
        }
    }

    async function addCropsToPageAuto(doc, pageWidth, pageHeight, columns) {
        let yPos = 35;
        const margin = 10;
        const itemWidth = (pageWidth - 2 * margin - 5) / columns;
        const columnHeights = Array(columns).fill(yPos);
        let currentColumn = 0;

        for (const crop of selectionListData) {
            const sourceData = sourceLibrary.find(s => s.id === crop.sourceId);
            if (!sourceData) continue;

            try {
                const cropCanvas = await generateCropCanvas(sourceData, crop);
                if (cropCanvas) {
                    const imgData = cropCanvas.toDataURL('image/png');
                    const imgHeight = (itemWidth * cropCanvas.height) / cropCanvas.width;
                    const xPos = margin + currentColumn * (itemWidth + 5);

                    if (columnHeights[currentColumn] + imgHeight > pageHeight - 10) {
                        doc.addPage();
                        columnHeights.fill(35);
                        currentColumn = 0;
                        addHeaderToPage(doc, pageWidth, pageHeight, '', '', '', false);
                    }

                    doc.addImage(imgData, 'PNG', xPos, columnHeights[currentColumn], itemWidth, imgHeight);
                    columnHeights[currentColumn] += imgHeight + 2;

                    currentColumn = (currentColumn + 1) % columns;
                }
            } catch (error) {
                console.error('Kırpma işlenemedi:', error);
            }
        }
    }

    async function generateCropCanvas(sourceData, crop) {
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');

        if (sourceData.type === 'pdf') {
            try {
                const page = await sourceData.data.getPage(crop.pageNum);
                const viewport = page.getViewport({ scale: crop.zoom });

                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.height = viewport.height;
                tempCanvas.width = viewport.width;

                await page.render({ canvasContext: tempCtx, viewport: viewport }).promise;

                cropCanvas.width = crop.width;
                cropCanvas.height = crop.height;
                cropCtx.drawImage(tempCanvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

                return cropCanvas;
            } catch (error) {
                console.error('PDF crop hatası:', error);
                return null;
            }
        } else if (sourceData.type === 'image') {
            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = sourceData.data;
                });

                cropCanvas.width = crop.width;
                cropCanvas.height = crop.height;
                cropCtx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

                return cropCanvas;
            } catch (error) {
                console.error('Image crop hatası:', error);
                return null;
            }
        }

        return null;
    }

};
