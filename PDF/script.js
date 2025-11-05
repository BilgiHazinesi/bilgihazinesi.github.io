/* === v2.2 - ADIM 1 (DÜZELTİLMİŞ v3): YÜKLEME HATASI DÜZELTMESİ === */
'use strict';

// PDF HATA DÜZELTMESİ: PDF Worker'ı burada tanımlıyoruz.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// YENİ v2.2.2: Tarayıcının HTML'i tamamen yüklemesini bekle!
// Bu, "dosya seçme çalışmadı" hatasını düzeltecektir.
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DOM ELEMENTLERİ ---
    const fileInput = document.getElementById('file-input');
    const uploadScreen = document.getElementById('upload-screen');
    const initialUploadButton = document.getElementById('initial-upload-button');
    const editorScreen = document.getElementById('editor-screen');

    // Sol Panel
    const sourceLibraryList = document.getElementById('source-library-list');
    const sourceListPlaceholder = document.getElementById('source-list-placeholder');
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

    // --- 2. GLOBAL DEĞİŞKENLER ---
    let sourceLibrary = []; 
    let activeSourceId = null;
    let activePdfDoc = null; 
    let activePdfPageNum = 1; 
    let currentSourceZoom = 1.0; 
    let isEditorInitialized = false;

    // --- 3. UYGULAMA BAŞLANGICI ---

    // Başlangıçtaki "Dosyaları Seç" butonu gizli fileInput'u tetikler
    initialUploadButton.addEventListener('click', () => fileInput.click());

    /**
     * Ana giriş noktası: Dosya seçildiğinde tetiklenir
     */
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
        fileInput.value = null; 
    });

    /**
     * Editör arayüzü için gerekli tüm olay dinleyicilerini bir kez kurar.
     */
    function setupEditorEventListeners() {
        tabSourceBtn.addEventListener('click', () => switchTab('source'));
        tabLayoutBtn.addEventListener('click', () => switchTab('layout'));

        addMoreFilesBtn.addEventListener('click', () => fileInput.click());

        zoomInSourceBtn.addEventListener('click', () => zoomSource(0.25));
        zoomOutSourceBtn.addEventListener('click', () => zoomSource(-0.25));

        prevPageBtn.addEventListener('click', () => changePdfPage(-1));
        nextPageBtn.addEventListener('click', () => changePdfPage(1));
    }

    // --- 4. ÇOKLU DOSYA YÜKLEME MANTIĞI ---

    /**
     * v2.2: Gelen dosyaları işler ve kütüphaneye ekler.
     */
    async function loadFiles(files) {
        if (sourceListPlaceholder) sourceListPlaceholder.remove();

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

    /**
     * v2.2: PDF verisini (pdf.js doc) yükler
     */
    function loadPdfData(file) {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.onload = async function() {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    resolve(pdf);
                } catch (error) { reject(error); }
            };
            fileReader.onerror = reject;
            fileReader.readAsArrayBuffer(file);
        });
    }

    /**
     * v2.2: Resim verisini (DataURL) yükler
     */
    function loadImageData(file) {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.onload = function() { resolve(this.result); };
            fileReader.onerror = reject;
            fileReader.readAsDataURL(file);
        });
    }

    /**
     * v2.2: Sol panele (Kaynak Kütüphanesi) dosyayı ekler
     */
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

    // --- 5. KAYNAK EDİTÖRÜ MANTIĞI (GÖRÜNTÜLEME) ---

    /**
     * v2.2: Ana Sekme Değiştirme Fonksiyonu
     */
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

    /**
     * v2.2 Ana Kaynak Görüntüleme Fonksiyonu
     */
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

    /**
     * v2.2: Aktif PDF sayfasını çizer (render eder).
     */
    async function renderPdfPage(num) {
        if (!activePdfDoc) return;
        
        const sourceData = sourceLibrary.find(s => s.id === sourceId);
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

    /**
     * v2.2: Aktif Resim görüntüleyiciyi zoom'a göre ayarlar.
     */
    function renderImageViewer() {
        if (!imageViewer.src || !imageViewer.naturalWidth) return;
        
        const naturalWidth = imageViewer.naturalWidth;
        imageViewer.style.width = (naturalWidth * currentSourceZoom) + 'px';
        zoomLevelSourceSpan.textContent = `${Math.round(currentSourceZoom * 100)}%`;
    }

    /**
     * v2.2: Kaynak Editörü Zoom Fonksiyonu
     */
    function zoomSource(amount) {
        currentSourceZoom += amount;
        if (currentSourceZoom < 0.25) currentSourceZoom = 0.25; 

        if (activePdfDoc) {
            renderPdfPage(activePdfPageNum);
        } else if (imageViewer.src) {
            renderImageViewer();
        }
    }

    /**
     * v2.2: PDF Sayfa Değiştirme Fonksiyonu
     */
    async function changePdfPage(direction) {
        if (!activePdfDoc) return;

        const newPageNum = activePdfPageNum + direction;

        if (newPageNum >= 1 && newPageNum <= activePdfDoc.numPages) {
            await renderPdfPage(newPageNum);
        }
    }

}); // <-- YENİ v2.2.2: DOMContentLoaded burada biter

/* === v2.2 - ADIM 1 (DÜZELTİLMİŞ v3) BİTTİ === */
