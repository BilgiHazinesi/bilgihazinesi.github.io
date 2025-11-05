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
    let selectionList_data = [];
    let activeSourceId = null;
    let activePdfDoc = null;
    let activePdfPageNum = 1;
    let currentSourceZoom = 1.0;
    let isEditorInitialized = false;
    let currentCropBox = null;
    let isDrawingCrop = false;
    let cropStartX = 0;
    let cropStartY = 0;

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

    /**
     * Editör arayüzü için olay dinleyicileri
     */
    function setupEditorEventListeners() {
        tabSourceBtn.addEventListener('click', () => switchTab('source'));
        tabLayoutBtn.addEventListener('click', () => switchTab('layout'));

        addMoreFilesBtn.addEventListener('click', () => fileInput.click());

        zoomInSourceBtn.addEventListener('click', () => zoomSource(0.25));
        zoomOutSourceBtn.addEventListener('click', () => zoomSource(-0.25));

        prevPageBtn.addEventListener('click', () => changePdfPage(-1));
        nextPageBtn.addEventListener('click', () => changePdfPage(1));

        createPdfBtn.addEventListener('click', createPdf);

        // Kırpma alanı fare olayları
        pdfViewerContainer.addEventListener('mousedown', startCrop);
        document.addEventListener('mousemove', updateCrop);
        document.addEventListener('mouseup', endCrop);
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
        if (e.button !== 0) return; // Sadece sol fare butonu
        isDrawingCrop = true;
        cropStartX = e.offsetX;
        cropStartY = e.offsetY;
    }

    function updateCrop(e) {
        if (!isDrawingCrop) return;

        if (!currentCropBox) {
            currentCropBox = document.createElement('div');
            currentCropBox.id = 'crop-selection-box';
            currentCropBox.classList.add('visible');
            pdfViewerContainer.appendChild(currentCropBox);
        }

        const currentX = e.offsetX || cropStartX;
        const currentY = e.offsetY || cropStartY;
        const width = Math.abs(currentX - cropStartX);
        const height = Math.abs(currentY - cropStartY);
        const left = Math.min(cropStartX, currentX);
        const top = Math.min(cropStartY, currentY);

        currentCropBox.style.left = left + 'px';
        currentCropBox.style.top = top + 'px';
        currentCropBox.style.width = width + 'px';
        currentCropBox.style.height = height + 'px';
    }

    function endCrop(e) {
        if (!isDrawingCrop) return;
        isDrawingCrop = false;

        if (currentCropBox && parseInt(currentCropBox.style.width) > 20 && parseInt(currentCropBox.style.height) > 20) {
            // Kırpma kutusu yeterince büyük, onay butonları ekle
            showCropConfirmation();
        } else if (currentCropBox) {
            currentCropBox.remove();
            currentCropBox = null;
        }
    }

    function showCropConfirmation() {
        const name = prompt('Kırpma adını girin (örn: "Soru 1"):', '');
        if (!name) {
            currentCropBox.remove();
            currentCropBox = null;
            return;
        }

        const cropData = {
            id: 'crop-' + Date.now(),
            name: name,
            sourceId: activeSourceId,
            pageNum: activePdfPageNum,
            x: parseInt(currentCropBox.style.left),
            y: parseInt(currentCropBox.style.top),
            width: parseInt(currentCropBox.style.width),
            height: parseInt(currentCropBox.style.height),
            zoom: currentSourceZoom,
        };

        selectionList_data.push(cropData);
        addCropToSelectionList(cropData);
        currentCropBox.remove();
        currentCropBox = null;
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
        deleteBtn.addEventListener('click', () => {
            li.remove();
            selectionList_data = selectionList_data.filter(c => c.id !== cropData.id);
        });

        li.appendChild(label);
        li.appendChild(deleteBtn);
        selectionList.appendChild(li);
    }

    // --- PDF OLUŞTURMA ---

    async function createPdf() {
        if (selectionList_data.length === 0) {
            alert('Lütfen önce kırpmalar yapın!');
            return;
        }

        const title = titleInput.value || 'Raporunuz';
        const orientation = orientationSelect.value;
        const leftHeader = leftHeaderInput.value;
        const rightHeader = rightHeaderInput.value;
        const includelogo = logoCheckbox.checked;
        const layoutType = layoutTypeSelect.value;

        const doc = new jsPDF({
            orientation: orientation === 'landscape' ? 'l' : 'p',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPosition = 15;

        // Header ekle
        addHeaderToPage(doc, pageWidth, title, leftHeader, rightHeader, includelogo);
        yPosition = 45;

        if (layoutType === 'free') {
            // Serbest düzen: kırpmalar manuel olarak yerleştirildi
            // (Bu versionda basit layout yapıyoruz)
            yPosition = await addCropsToPage(doc, pageWidth, pageHeight, yPosition);
        } else if (layoutType === 'column2') {
            // 2 sütunlu otomatik layout
            yPosition = await addCropsToPageAuto(doc, pageWidth, pageHeight, yPosition, 2);
        } else if (layoutType === 'vertical') {
            // Alt alta layout
            yPosition = await addCropsToPageAuto(doc, pageWidth, pageHeight, yPosition, 1);
        }

        doc.save(title + '.pdf');
    }

    function addHeaderToPage(doc, pageWidth, title, leftHeader, rightHeader, includeLogo) {
        const pageHeight = doc.internal.pageSize.getHeight();

        // Başlık
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(title, pageWidth / 2, 10, { align: 'center' });

        // Logo (eğer seçildiyse)
        if (includeLogo) {
            const logoUrl = 'https://i.imgur.com/hwSvPQK.jpeg';
            try {
                doc.addImage(logoUrl, 'JPEG', pageWidth / 2 - 5, 12, 10, 10);
            } catch (e) {
                console.warn('Logo yüklenemedi:', e);
            }
        }

        // Üst bilgiler
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(leftHeader, 10, 28);
        doc.text(rightHeader, pageWidth - 10, 28, { align: 'right' });

        // Ayırıcı çizgi
        doc.setDrawColor(0, 0, 0);
        doc.line(10, 32, pageWidth - 10, 32);
    }

    async function addCropsToPage(doc, pageWidth, pageHeight, startY) {
        let yPos = startY;
        const xMargin = 10;
        const maxWidth = pageWidth - 2 * xMargin;

        for (const crop of selectionList_data) {
            const sourceData = sourceLibrary.find(s => s.id === crop.sourceId);
            if (!sourceData) continue;

            try {
                const canvas_crop = await generateCropCanvas(sourceData, crop);
                if (canvas_crop) {
                    const imgData = canvas_crop.toDataURL('image/png');
                    const imgHeight = (maxWidth * canvas_crop.height) / canvas_crop.width;

                    if (yPos + imgHeight > pageHeight - 10) {
                        doc.addPage();
                        yPos = 10;
                    }

                    doc.addImage(imgData, 'PNG', xMargin, yPos, maxWidth, imgHeight);
                    yPos += imgHeight + 5;

                    // Kırpma adı
                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.text(crop.name, xMargin, yPos);
                    yPos += 8;
                }
            } catch (error) {
                console.error('Kırpma işlenemedi:', error);
            }
        }

        return yPos;
    }

    async function addCropsToPageAuto(doc, pageWidth, pageHeight, startY, columns) {
        let yPos = startY;
        const xMargin = 10;
        const itemWidth = (pageWidth - 2 * xMargin - 5) / columns;
        let columnHeights = Array(columns).fill(yPos);
        let currentColumn = 0;

        for (const crop of selectionList_data) {
            const sourceData = sourceLibrary.find(s => s.id === crop.sourceId);
            if (!sourceData) continue;

            try {
                const canvas_crop = await generateCropCanvas(sourceData, crop);
                if (canvas_crop) {
                    const imgHeight = (itemWidth * canvas_crop.height) / canvas_crop.width;
                    const xPos = xMargin + currentColumn * (itemWidth + 5);
                    const currentY = columnHeights[currentColumn];

                    if (currentY + imgHeight > pageHeight - 10) {
                        doc.addPage();
                        columnHeights = Array(columns).fill(10);
                        currentColumn = 0;
                    }

                    const imgData = canvas_crop.toDataURL('image/png');
                    doc.addImage(imgData, 'PNG', xPos, columnHeights[currentColumn], itemWidth, imgHeight);

                    columnHeights[currentColumn] += imgHeight + 2;

                    currentColumn = (currentColumn + 1) % columns;
                }
            } catch (error) {
                console.error('Kırpma işlenemedi:', error);
            }
        }

        return Math.max(...columnHeights);
    }

    async function generateCropCanvas(sourceData, crop) {
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');

        if (sourceData.type === 'pdf') {
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
        } else if (sourceData.type === 'image') {
            const img = new Image();
            await new Promise((resolve) => {
                img.onload = resolve;
                img.src = sourceData.data;
            });

            cropCanvas.width = crop.width;
            cropCanvas.height = crop.height;
            cropCtx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

            return cropCanvas;
        }

        return null;
    }

};
