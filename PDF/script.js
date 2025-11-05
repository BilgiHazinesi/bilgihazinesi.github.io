/* === v2.2 - ADIM 1: TEMEL (YÜKLEME, SEKMELER, GÖRÜNTÜLEME) === */
'use strict'; // Hataları daha kolay bulmak için katı modu etkinleştir

// Kütüphane Yükleyicisi
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// --- 1. DOM ELEMENTLERİ ---
// (index.html'deki tüm önemli ID'leri al)
const fileInput = document.getElementById('file-input');
const uploadScreen = document.getElementById('upload-screen');
const editorScreen = document.getElementById('editor-screen');

// Sol Panel
const sourceLibraryList = document.getElementById('source-library-list');
const sourceListPlaceholder = document.getElementById('source-list-placeholder');

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

// --- 2. GLOBAL DEĞİŞKENLER (v2.2 - Adım 1) ---

// Yüklenen tüm kaynakları (PDF/Resim) tutan kütüphane
let sourceLibrary = []; 
// Aktif olarak düzenlenen/bakılan kaynağın ID'si
let activeSourceId = null;
let activePdfDoc = null; // Sadece o an aktif olan PDF'in dokümanı
let activePdfPageNum = 1; // Aktif PDF'in hangi sayfasında olduğu
let currentSourceZoom = 1.0; 

// --- 3. UYGULAMA BAŞLANGICI ---

// Ana giriş noktası: Dosya seçildiğinde
fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    uploadScreen.classList.add('hidden');
    editorScreen.classList.remove('hidden');
    
    // Gerekli tüm olay dinleyicilerini (event listeners) ayarla
    setupEventListeners();
    
    // Dosyaları yükle
    loadFiles(files);
});

/**
 * Adım 1 için gerekli tüm olay dinleyicilerini kurar.
 */
function setupEventListeners() {
    // Sekme Kontrolleri
    tabSourceBtn.addEventListener('click', () => switchTab('source'));
    tabLayoutBtn.addEventListener('click', () => switchTab('layout'));

    // Kaynak Editörü Zoom
    zoomInSourceBtn.addEventListener('click', () => zoomSource(0.25));
    zoomOutSourceBtn.addEventListener('click', () => zoomSource(-0.25));

    // PDF Sayfa Kontrolleri
    prevPageBtn.addEventListener('click', () => changePdfPage(-1));
    nextPageBtn.addEventListener('click', () => changePdfPage(1));

    // ADIM 2'DE EKLENECEK DİNLEYİCİLER:
    // - Kırpma (mousedown, mousemove, mouseup)
    // - Onay butonları (confirm, cancel)
    // - Mizanpaj (interact.js)
    // - PDF Oluşturma
}

// --- 4. ÇOKLU DOSYA YÜKLEME MANTIĞI ---

/**
 * v2.2: Çoklu dosya yükleme yöneticisi (PDF, PNG, JPG)
 * "Sadece görsellerle çalışma" özgürlüğünü sağlar.
 */
async function loadFiles(files) {
    if (sourceListPlaceholder) sourceListPlaceholder.remove();

    // Paralel yükleme için Promise.all kullanıyoruz
    const filePromises = Array.from(files).map(file => {
        const sourceId = 'source-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        let sourceData = {
            id: sourceId,
            name: file.name,
            type: null,
            data: null, // pdfDoc veya image DataURL
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
                return null; // Başarısız yüklemeyi atla
            });
        } else if (file.type.startsWith('image/')) {
            sourceData.type = 'image';
            return loadImageData(file).then(imageDataUrl => {
                sourceData.data = imageDataUrl;
                return sourceData;
            }).catch(error => {
                console.error(`Resim yüklenemedi: ${file.name}`, error);
                return null; // Başarısız yüklemeyi atla
            });
        } else {
            console.warn(`Desteklenmeyen dosya tipi: ${file.name}`);
            return Promise.resolve(null); // Desteklenmeyen tipi atla
        }
    });

    // Tüm dosyaların yüklenmesini bekle
    const loadedSources = (await Promise.all(filePromises)).filter(Boolean); // null olanları filtrele

    // Global kütüphaneye ekle
    sourceLibrary.push(...loadedSources);
    
    // Sol panele listele
    loadedSources.forEach(addSourceToLibraryList);
    
    // Yükleme bittikten sonra ilk kaynağı otomatik olarak aç
    if (sourceLibrary.length > 0 && !activeSourceId) {
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
            } catch (error) {
                reject(error);
            }
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
        fileReader.onload = function() {
            resolve(this.result); // DataURL
        };
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
    
    // Tıklandığında o kaynağı editörde aç
    li.addEventListener('click', () => {
        showSourceInEditor(sourceData.id);
    });
    
    sourceLibraryList.appendChild(li);
}


// --- 5. KAYNAK EDİTÖRÜ MANTIĞI (GÖRÜNTÜLEME) ---

/**
 * v2.2 (SEKME HATASI DÜZELTİLDİ)
 * Ana Sekme Değiştirme Fonksiyonu. Sadece 'active' sınıflarını değiştirir.
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
 * Sol panelden bir kaynak seçildiğinde (PDF veya Resim) orta paneli günceller.
 */
async function showSourceInEditor(sourceId) {
    // Zaten bu kaynak açıksa, tekrar yükleme
    if (activeSourceId === sourceId) return;

    // Kütüphaneden kaynağı bul
    const sourceData = sourceLibrary.find(s => s.id === sourceId);
    if (!sourceData) return;

    // Aktif kaynağı ayarla
    activeSourceId = sourceId;

    // Sol paneldeki listede "aktif" olanı vurgula
    document.querySelectorAll('#source-library-list .source-item').forEach(item => {
        item.classList.toggle('active', item.id === sourceId);
    });

    // Kaynak tipine göre editörü hazırla
    if (sourceData.type === 'pdf') {
        // === PDF GÖRÜNTÜLEYİCİYİ HAZIRLA ===
        activePdfDoc = sourceData.data;
        activePdfPageNum = sourceData.currentPage;
        
        pdfViewerContainer.classList.remove('hidden');
        pdfControls.classList.remove('hidden');
        imageViewer.classList.add('hidden');
        
        currentSourceZoom = 1.0; // Zoom'u sıfırla
        await renderPdfPage(activePdfPageNum);

    } else if (sourceData.type === 'image') {
        // === RESİM GÖRÜNTÜLEYİCİYİ HAZIRLA ===
        activePdfDoc = null; // Aktif PDF yok
        
        pdfViewerContainer.classList.add('hidden');
        pdfControls.classList.add('hidden');
        imageViewer.classList.remove('hidden');
        
        // Resmin yüklenmesini bekle (tarayıcı önbelleğinde değilse)
        await new Promise((resolve) => {
            imageViewer.onload = resolve;
            imageViewer.src = sourceData.data;
        });

        currentSourceZoom = 1.0; // Zoom'u sıfırla
        renderImageViewer();
    }
}

/**
 * v2.2: Aktif PDF sayfasını çizer (render eder).
 */
async function renderPdfPage(num) {
    if (!activePdfDoc) return;
    
    // Aktif kaynağın sayfasını global değişkende ve veri yapısında sakla
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
 * v2.2: Kaynak Editörü Zoom Fonksiyonu (Hem PDF hem Resim)
 */
function zoomSource(amount) {
    currentSourceZoom += amount;
    if (currentSourceZoom < 0.25) currentSourceZoom = 0.25; 

    // Aktif kaynağın (PDF veya Resim) görünümünü güncelle
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
    if (!activePdfDoc) return; // Sadece PDF'ler için çalışır

    const newPageNum = activePdfPageNum + direction;

    if (newPageNum >= 1 && newPageNum <= activePdfDoc.numPages) {
        await renderPdfPage(newPageNum);
    }
}

/* === v2.2 - ADIM 1/3 BİTTİ === */
