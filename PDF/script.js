// --- 0. DOM ELEMENTLERİ ---
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// Ana Ekranlar
const fileInput = document.getElementById('file-input');
const uploadScreen = document.getElementById('upload-screen');
const editorScreen = document.getElementById('editor-screen');

// Sol Panel
const sourceLibraryList = document.getElementById('source-library-list');
const selectionList = document.getElementById('selection-list');

// Orta Panel - Sekme Butonları ve İçerikleri
const tabSourceBtn = document.getElementById('tab-source');
const tabLayoutBtn = document.getElementById('tab-layout');
const sourceView = document.getElementById('source-view');
const layoutView = document.getElementById('layout-view');
const sourceScrollContainer = document.getElementById('source-scroll-container');
const layoutScrollContainer = document.getElementById('layout-scroll-container');

// Sekme 1: Kaynak Editörü Elemanları
const sourceViewerWrapper = document.getElementById('source-viewer-wrapper');
const pdfViewerContainer = document.getElementById('pdf-viewer-container');
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');
const imageViewer = document.getElementById('image-viewer');
const pdfControls = document.getElementById('pdf-controls');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumSpan = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');

// Sekme 1: Zoom
const zoomInSourceBtn = document.getElementById('zoom-in-source');
const zoomOutSourceBtn = document.getElementById('zoom-out-source');
const zoomLevelSourceSpan = document.getElementById('zoom-level-source');

// Sekme 1: Seçim Araçları
const selectionBox = document.getElementById('selection-box');
const selectionConfirmBox = document.getElementById('selection-confirm-box');
const confirmSelectionBtn = document.getElementById('confirm-selection');
const cancelSelectionBtn = document.getElementById('cancel-selection');

// Sekme 2: Mizanpaj Sahnesi Elemanları
const pageStage = document.getElementById('page-stage');
const zoomInLayoutBtn = document.getElementById('zoom-in-layout');
const zoomOutLayoutBtn = document.getElementById('zoom-out-layout');
const zoomLevelLayoutSpan = document.getElementById('zoom-level-layout');

// Sağ Panel: Ayarlar
const pageLayoutSelect = document.getElementById('page-layout');
const generatePdfBtn = document.getElementById('generate-pdf');
const pdfTitleInput = document.getElementById('pdf-title');

// --- 1. v2.0 GLOBAL VERİ DEPOLARI VE UYGULAMA DURUMU ---

// YENİ: Yüklenen tüm kaynakları (PDF/Resim) tutan kütüphane
let sourceLibrary = []; 
// Kırpılan tüm alanları tutan dizi (yapısı güncellendi)
let clippings = [];

// Aktif olarak düzenlenen/bakılan kaynağın ID'si
let activeSourceId = null;
let activePdfDoc = null; // Sadece o an aktif olan PDF'in dokümanı
let activePdfPageNum = 1; // Aktif PDF'in hangi sayfasında olduğu

// Zoom Durumları
let currentSourceZoom = 1.0; // Hem PDF scale hem de Resim width/height için ortak
let currentLayoutZoom = 1.0; // CSS scale

// Seçim Akışı Durumları
let isDrawing = false;
let activeSelectionRect = null;
let isEditingClipId = null;
let selectionStartPoint = {};

// --- 2. BAŞLANGIÇ VE ÇOKLU DOSYA YÜKLEME ---

fileInput.addEventListener('change', (e) => {
    // Birden fazla dosya yüklendi
    const files = e.target.files;
    if (!files.length) return;

    uploadScreen.classList.add('hidden');
    editorScreen.classList.remove('hidden');
    
    // Interact.js'i ilk seçim kutusu için hazırla
    setupSelectionBoxInteract();
    
    // YENİ: Dosyaları paralel olarak (aynı anda) yükle
    loadFiles(files);
});

// YENİ: Çoklu dosya yükleme yöneticisi
async function loadFiles(files) {
    const placeholder = document.getElementById('source-list-placeholder');
    if (placeholder) placeholder.remove();

    for (const file of files) {
        const sourceId = 'source-' + Date.now() + '-' + Math.random();
        let sourceData = {
            id: sourceId,
            name: file.name,
            type: null,
            data: null, // pdfDoc veya image DataURL
        };

        if (file.type === 'application/pdf') {
            sourceData.type = 'pdf';
            sourceData.data = await loadPdfData(file);
            sourceData.totalPages = sourceData.data.numPages;
            sourceData.currentPage = 1; // PDF'ler için sayfa takibi
        } else if (file.type.startsWith('image/')) {
            sourceData.type = 'image';
            sourceData.data = await loadImageData(file);
        } else {
            continue; // Desteklenmeyen dosya tipi
        }

        sourceLibrary.push(sourceData);
        addSourceToLibraryList(sourceData);
    }
    
    // Yükleme bittikten sonra ilk kaynağı otomatik olarak aç
    if (sourceLibrary.length > 0) {
        showSourceInEditor(sourceLibrary[0].id);
    }
}

// YENİ: PDF verisini (pdf.js doc) yükler
function loadPdfData(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            resolve(pdf);
        };
        fileReader.readAsArrayBuffer(file);
    });
}

// YENİ: Resim verisini (DataURL) yükler
function loadImageData(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = function() {
            resolve(this.result); // DataURL
        };
        fileReader.readAsDataURL(file);
    });
}

// YENİ: Sol panele (Kaynak Kütüphanesi) dosyayı ekler
function addSourceToLibraryList(sourceData) {
    const li = document.createElement('li');
    li.className = 'source-item';
    li.id = sourceData.id;
    li.textContent = `[${sourceData.type.toUpperCase()}] ${sourceData.name}`;
    
    // Tıklandığında o kaynağı editörde aç
    li.addEventListener('click', () => {
        showSourceInEditor(sourceData.id);
    });
    
    sourceLibraryList.appendChild(li);
}

// --- 3. KAYNAK EDİTÖRÜ (SEKME 1) - Kaynak Değiştirme ve Görüntüleme ---

// YENİ: Ana kaynak görüntüleme fonksiyonu
async function showSourceInEditor(sourceId) {
    // Yarım kalan seçimi iptal et
    cancelActiveSelection();
    
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
        // PDF GÖRÜNTÜLEYİCİYİ HAZIRLA
        activePdfDoc = sourceData.data; // Aktif PDF dokümanını ayarla
        activePdfPageNum = sourceData.currentPage; // Kaldığı sayfayı getir
        
        pdfViewerContainer.classList.remove('hidden');
        pdfControls.classList.remove('hidden');
        imageViewer.classList.add('hidden');
        
        // PDF'i render et
        currentSourceZoom = 1.0; // Zoom'u sıfırla
        await renderPdfPage(activePdfPageNum);

    } else if (sourceData.type === 'image') {
        // RESİM GÖRÜNTÜLEYİCİYİ HAZIRLA
        pdfViewerContainer.classList.add('hidden');
        pdfControls.classList.add('hidden');
        imageViewer.classList.remove('hidden');
        
        imageViewer.src = sourceData.data;
        
        // Resmi render et (Zoom ayarı)
        currentSourceZoom = 1.0; // Zoom'u sıfırla
        renderImageViewer();
    }
}

// PDF sayfasını çizen fonksiyon (eski renderPage)
async function renderPdfPage(num) {
    if (!activePdfDoc) return;
    
    // Aktif kaynağın sayfasını güncelle
    const sourceData = sourceLibrary.find(s => s.id === activeSourceId);
    if(sourceData) sourceData.currentPage = num;
    activePdfPageNum = num;
    
    const page = await activePdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: currentSourceZoom });
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = { canvasContext: ctx, viewport: viewport };
    await page.render(renderContext).promise;
    
    pageNumSpan.textContent = num;
    pageCountSpan.textContent = activePdfDoc.numPages;
}

// YENİ: Resim görüntüleyiciyi zoom'a göre ayarlayan fonksiyon
function renderImageViewer() {
    // Zoom için 'transform' kullanmak, 'width' değiştirmekten daha performanslıdır
    // Ancak 'width' değiştirmek, koordinat hesaplamalarını (kırpma) daha kolaylaştırır.
    // Şimdilik 'width' kullanalım.
    
    // Orijinal boyutları al (eğer yüklendiyse)
    const naturalWidth = imageViewer.naturalWidth;
    if (naturalWidth > 0) {
        imageViewer.style.width = (naturalWidth * currentSourceZoom) + 'px';
    }
    zoomLevelSourceSpan.textContent = `${Math.round(currentSourceZoom * 100)}%`;
}

// PDF Sayfa Kontrolleri (Sadece PDF aktifken çalışır)
prevPageBtn.addEventListener('click', async () => {
    if (activePdfPageNum <= 1) return;
    await renderPdfPage(--activePdfPageNum);
});
nextPageBtn.addEventListener('click', async () => {
    if (!activePdfDoc || activePdfPageNum >= activePdfDoc.numPages) return;
    await renderPdfPage(++activePdfPageNum);
});

// Kaynak Editörü Zoom Butonları (YENİ: Hem PDF hem Resim için)
zoomInSourceBtn.addEventListener('click', () => {
    currentSourceZoom += 0.25;
    updateActiveSourceView();
});
zoomOutSourceBtn.addEventListener('click', () => {
    if (currentSourceZoom <= 0.25) return;
    currentSourceZoom -= 0.25;
    updateActiveSourceView();
});

// YENİ: Aktif kaynağın (PDF veya Resim) görünümünü günceller
function updateActiveSourceView() {
    const sourceData = sourceLibrary.find(s => s.id === activeSourceId);
    if (!sourceData) return;

    zoomLevelSourceSpan.textContent = `${Math.round(currentSourceZoom * 100)}%`;
    if (sourceData.type === 'pdf') {
        renderPdfPage(activePdfPageNum);
    } else if (sourceData.type === 'image') {
        renderImageViewer();
    }
}


// --- 4. BİRLEŞTİRİLMİŞ SEÇİM AKIŞI (PDF & RESİM) ---

// Kapsayıcıya (wrapper) mousedown ekle
sourceViewerWrapper.addEventListener('mousedown', (e) => {
    if (activeSelectionRect) return; // Zaten bir seçim onay bekliyor
    if (!activeSourceId) return; // Kaynak yoksa seçim yapma
    
    isDrawing = true;
    
    // YENİ: Koordinatları aktif elemana (canvas veya image) göre al
    const activeElement = document.querySelector(`#${activeSourceId_to_elementId(activeSourceId)}`);
    if (!activeElement) return;
    
    const rect = activeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    selectionStartPoint = { x, y };
    
    selectionBox.style.left = x + 'px';
    selectionBox.style.top = y + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
});

// Kapsayıcıya mousemove ekle
sourceViewerWrapper.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;

    const activeElement = document.querySelector(`#${activeSourceId_to_elementId(activeSourceId)}`);
    if (!activeElement) return;

    const rect = activeElement.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const width = currentX - selectionStartPoint.x;
    const height = currentY - selectionStartPoint.y;

    selectionBox.style.left = (width > 0 ? selectionStartPoint.x : currentX) + 'px';
    selectionBox.style.top = (height > 0 ? selectionStartPoint.y : currentY) + 'px';
    selectionBox.style.width = Math.abs(width) + 'px';
    selectionBox.style.height = Math.abs(height) + 'px';
});

// Kapsayıcıya mouseup ekle
sourceViewerWrapper.addEventListener('mouseup', (e) => {
    if (!isDrawing) return;
    isDrawing = false;
    
    const width = parseFloat(selectionBox.style.width);
    const height = parseFloat(selectionBox.style.height);

    if (width < 10 || height < 10) {
        selectionBox.style.display = 'none';
        return;
    }

    makeSelectionBoxInteractive();
});

// YENİ: Hangi DOM elementinin (canvas/image) aktif olduğunu bulan helper
function activeSourceId_to_elementId() {
    const sourceData = sourceLibrary.find(s => s.id === activeSourceId);
    if (!sourceData) return null;
    return (sourceData.type === 'pdf') ? 'pdf-canvas' : 'image-viewer';
}

// Seçim kutusunu taşınabilir/boyutlandırılabilir yap (Değişiklik yok)
function setupSelectionBoxInteract() {
    interact(selectionBox)
        .draggable({
            listeners: {
                move(event) {
                    const x = (parseFloat(event.target.style.left) || 0) + event.dx;
                    const y = (parseFloat(event.target.style.top) || 0) + event.dy;
                    event.target.style.left = x + 'px';
                    event.target.style.top = y + 'px';
                    positionConfirmBox(x, y, parseFloat(event.target.style.width));
                }
            }
        })
        .resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            listeners: {
                move(event) {
                    event.target.style.width = event.rect.width + 'px';
                    event.target.style.height = event.rect.height + 'px';
                    event.target.style.left = (parseFloat(event.target.style.left) + event.deltaRect.left) + 'px';
                    event.target.style.top = (parseFloat(event.target.style.top) + event.deltaRect.top) + 'px';
                    positionConfirmBox(parseFloat(event.target.style.left), parseFloat(event.target.style.top), event.rect.width);
                }
            }
        });
}

// Seçim kutusunu "aktif" hale getir (Değişiklik yok)
function makeSelectionBoxInteractive(rect) {
    if (rect) {
        selectionBox.style.left = rect.x + 'px';
        selectionBox.style.top = rect.y + 'px';
        selectionBox.style.width = rect.width + 'px';
        selectionBox.style.height = rect.height + 'px';
        selectionBox.style.display = 'block';
    }

    activeSelectionRect = {
        x: parseFloat(selectionBox.style.left),
        y: parseFloat(selectionBox.style.top),
        width: parseFloat(selectionBox.style.width),
        height: parseFloat(selectionBox.style.height)
    };
    
    selectionBox.style.pointerEvents = 'auto'; 
    positionConfirmBox(activeSelectionRect.x, activeSelectionRect.y, activeSelectionRect.width);
    selectionConfirmBox.classList.remove('hidden');
}

// Onay/İptal Butonları (Değişiklik yok)
confirmSelectionBtn.addEventListener('click', () => {
    activeSelectionRect = {
        x: parseFloat(selectionBox.style.left),
        y: parseFloat(selectionBox.style.top),
        width: parseFloat(selectionBox.style.width),
        height: parseFloat(selectionBox.style.height)
    };

    let defaultName = `Kırpma ${clippings.length + 1}`;
    if (isEditingClipId) {
        defaultName = clippings.find(c => c.id === isEditingClipId).name;
    }
    const clipName = prompt("Bu kırpmaya bir ad verin:", defaultName);

    if (clipName) {
        captureSelection(clipName, activeSelectionRect);
    }
    
    cancelActiveSelection();
});
cancelSelectionBtn.addEventListener('click', () => cancelActiveSelection() );
function positionConfirmBox(x, y, width) {
    selectionConfirmBox.style.left = (x + width - 65) + 'px';
    selectionConfirmBox.style.top = (y - 40) + 'px';
}
function cancelActiveSelection() {
    selectionBox.style.display = 'none';
    selectionBox.style.pointerEvents = 'none';
    selectionConfirmBox.classList.add('hidden');
    activeSelectionRect = null;
    isEditingClipId = null;
}

// --- 5. BİRLEŞTİRİLMİŞ KIRPMA İŞLEMİ VE "YENİDEN KIRPMA" (RE-CROP) ---

// YENİ: Hem PDF (canvas) hem Resim (img) kırpabilen fonksiyon
function captureSelection(name, rect) {
    const sourceData = sourceLibrary.find(s => s.id === activeSourceId);
    if (!sourceData) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = rect.width;
    tempCanvas.height = rect.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // YENİ: Kaynak tipine göre kırpma
    if (sourceData.type === 'pdf') {
        // PDF (Canvas) üzerinden kırp
        tempCtx.drawImage(canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
    } else if (sourceData.type === 'image') {
        // RESİM (Image) üzerinden kırp
        // Orijinal zoom'suz koordinatları bulmamız lazım
        const scale = imageViewer.width / imageViewer.naturalWidth;
        const origX = rect.x / scale;
        const origY = rect.y / scale;
        const origWidth = rect.width / scale;
        const origHeight = rect.height / scale;

        tempCanvas.width = origWidth; // Tuval boyutunu orijinal kırpma boyutuna ayarla
        tempCanvas.height = origHeight;
        
        tempCtx.drawImage(imageViewer, origX, origY, origWidth, origHeight, 0, 0, origWidth, origHeight);
    }
    
    const imageData = tempCanvas.toDataURL('image/jpeg', 0.9);
    const originalWidth = tempCanvas.width;
    const originalHeight = tempCanvas.height;
    
    // YENİDEN KIRPMA (RE-CROP) KONTROLÜ
    if (isEditingClipId) {
        const clipData = clippings.find(c => c.id === isEditingClipId);
        clipData.name = name;
        clipData.imageData = imageData;
        clipData.sourceId = activeSourceId; // Kaynak değişmiş olabilir
        clipData.sourceType = sourceData.type;
        clipData.sourceRect = rect; // Ekrana göre koordinatlar
        clipData.sourcePage = (sourceData.type === 'pdf') ? activePdfPageNum : null;
        clipData.originalWidth = originalWidth;
        clipData.originalHeight = originalHeight;
        
        updateClipInLeftPanel(clipData);
    } else { 
        const clipData = {
            id: 'clip-' + Date.now(),
            name: name,
            imageData: imageData,
            sourceId: activeSourceId, // YENİ: Hangi kaynaktan geldi
            sourceType: sourceData.type, // YENİ: Kaynak tipi
            sourcePage: (sourceData.type === 'pdf') ? activePdfPageNum : null,
            sourceRect: rect, // Ekrana göre koordinatlar
            originalWidth: originalWidth,
            originalHeight: originalHeight
        };

        clippings.push(clipData);
        addClipToLeftPanel(clipData);
    }
    
    isEditingClipId = null;
}

// Sol panele YENİ kırpma ekle
function addClipToLeftPanel(clipData) {
    const placeholder = document.getElementById('selection-list-placeholder');
    if (placeholder) placeholder.remove();

    const li = document.createElement('li');
    li.className = 'clip-item';
    li.id = clipData.id;
    li.dataset.clipId = clipData.id;

    li.innerHTML = `
        <img src="${clipData.imageData}" alt="Önizleme" class="clip-thumbnail">
        <span class.clip-name">${clipData.name}</span>
    `;
    
    // YENİDEN KIRPMA (RE-CROP) İÇİN ÇİFT TIKLAMA
    li.addEventListener('dblclick', () => {
        editClipping(clipData.id);
    });
    
    selectionList.appendChild(li);
}

// Sol paneldeki VAROLAN kırpmayı güncelle
function updateClipInLeftPanel(clipData) {
    const li = document.getElementById(clipData.id);
    if (li) {
        li.querySelector('.clip-thumbnail').src = clipData.imageData;
        li.querySelector('.clip-name').textContent = clipData.name;
    }
}

// YENİDEN KIRPMA (RE-CROP) Ana Fonksiyonu (Güncellendi)
async function editClipping(clipId) {
    cancelActiveSelection();

    const clipData = clippings.find(c => c.id === clipId);
    if (!clipData) return;
    
    isEditingClipId = clipId;
    
    // 1. Doğru kaynağı editörde aç (Bu fonksiyon PDF/Resim ayrımını kendi yapar)
    await showSourceInEditor(clipData.sourceId);
    
    // 2. Kaynak PDF ise, doğru sayfaya git
    if (clipData.sourceType === 'pdf' && activePdfPageNum !== clipData.sourcePage) {
        await renderPdfPage(clipData.sourcePage);
    }
    
    // 3. Render bittikten SONRA, eski seçim kutusunu ekrana getir
    // Not: Zoom'un 1.0 olduğunu varsayıyoruz (showSourceInEditor sıfırlıyor)
    // TODO: Zoom'u da saklamak gerekir, şimdilik 1.0 kabul edelim.
    makeSelectionBoxInteractive(clipData.sourceRect);
    
    // 4. O bölgeye scroll yap
    sourceScrollContainer.scrollTop = clipData.sourceRect.y - 50;
    sourceScrollContainer.scrollLeft = clipData.sourceRect.x - 50;
}

// --- 6. MİZANPAJ (SEKME 2) - SÜRÜKLE, BIRAK, ZOOM (Değişiklik yok) ---

// Sol paneldeki Kırpma Listesini SÜRÜKLENEBİLİR yap
interact('.clip-item')
    .draggable({
        inertia: true,
        autoScroll: true,
        listeners: {
            move(event) {
                const target = event.target;
                const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                target.style.transform = `translate(${x}px, ${y}px)`;
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);
            },
            end(event) {
                event.target.style.transform = 'none';
                event.target.removeAttribute('data-x');
                event.target.removeAttribute('data-y');
            }
        }
    });

// Orta paneli (Mizanpaj Alanı) BIRAKILABİLİR alan (Dropzone) yap
interact('#page-stage')
    .dropzone({
        accept: '.clip-item',
        ondrop: function (event) {
            const draggableElement = event.relatedTarget;
            const clipId = draggableElement.dataset.clipId;
            const stageRect = pageStage.getBoundingClientRect();
            const dropX = (event.clientX - stageRect.left + layoutScrollContainer.scrollLeft) / currentLayoutZoom;
            const dropY = (event.clientY - stageRect.top + layoutScrollContainer.scrollTop) / currentLayoutZoom;
            createStageItem(clipId, dropX, dropY);
            tabLayoutBtn.click();
        }
    });

// Sahneye bırakılan öğeyi oluşturan fonksiyon
function createStageItem(clipId, x, y) {
    const clipData = clippings.find(c => c.id === clipId);
    if (!clipData) return;
    if (document.getElementById(clipData.id + '-stage')) return;

    const stageItem = document.createElement('div');
    stageItem.className = 'stage-item';
    stageItem.id = clipData.id + '-stage';
    
    // Orantılı başlangıç boyutu
    const initialWidth = clipData.originalWidth > 200 ? 200 : clipData.originalWidth;
    const initialHeight = clipData.originalHeight * (initialWidth / clipData.originalWidth);
    stageItem.style.width = initialWidth + 'px';
    stageItem.style.height = initialHeight + 'px';
    
    stageItem.style.position = 'absolute';
    stageItem.style.left = (x - initialWidth / 2) + 'px';
    stageItem.style.top = (y - initialHeight / 2) + 'px';
    stageItem.setAttribute('data-x', 0);
    stageItem.setAttribute('data-y', 0);
    
    stageItem.innerHTML = `<img src="${clipData.imageData}" style="width: 100%; height: 100%;"><div class="resize-handle bottom-right"></div>`;
    
    pageStage.appendChild(stageItem);
}

// Sahne üzerindeki öğeleri TAŞINABİLİR ve YENİDEN BOYUTLANDIRILABİLİR yap
interact('.stage-item')
    .draggable({
        inertia: true,
        modifiers: [interact.modifiers.restrictRect({ restriction: 'parent' })],
        listeners: {
            move(event) {
                const target = event.target;
                const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx / currentLayoutZoom;
                const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy / currentLayoutZoom;
                target.style.transform = `translate(${x}px, ${y}px)`;
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);
            }
        }
    })
    .resizable({
        edges: { right: true, bottom: true },
        listeners: {
            move(event) {
                let { x, y } = event.target.dataset;
                x = (parseFloat(x) || 0); y = (parseFloat(y) || 0);
                event.target.style.width = event.rect.width + 'px';
                event.target.style.height = event.rect.height + 'px';
                x += event.deltaRect.left / currentLayoutZoom;
                y += event.deltaRect.top / currentLayoutZoom;
                event.target.style.transform = `translate(${x}px, ${y}px)`;
                event.target.dataset.x = x; event.target.dataset.y = y;
            }
        }
    });

// Mizanpaj (Sahne) Zoom Butonları
zoomInLayoutBtn.addEventListener('click', () => {
    currentLayoutZoom += 0.1;
    updateLayoutZoom();
});
zoomOutLayoutBtn.addEventListener('click', () => {
    if (currentLayoutZoom <= 0.2) return;
    currentLayoutZoom -= 0.1;
    updateLayoutZoom();
});

function updateLayoutZoom() {
    pageStage.style.transform = `scale(${currentLayoutZoom})`;
    zoomLevelLayoutSpan.textContent = `${Math.round(currentLayoutZoom * 100)}%`;
}

// --- 7. FİNAL PDF OLUŞTURMA (TÜM MODLAR) ---
// Bu bölümde hiçbir değişiklik gerekmiyor.
// PDF oluşturucu, 'clippings' dizisindeki 'imageData'ya bakar.
// Bu 'imageData'nın PDF'ten mi PNG'den mi geldiği onun için önemsizdir.

generatePdfBtn.addEventListener('click', () => {
    const title = pdfTitleInput.value || "Mizanpajım";
    const layoutMode = document.querySelector('input[name="layout-type"]:checked').value;
    const pageOrientation = (pageLayoutSelect.value === 'a4-landscape') ? 'l' : 'p';

    if (clippings.length === 0) {
        alert("PDF oluşturmak için lütfen önce en az bir alan kırpın.");
        return;
    }

    if (layoutMode === 'freeform') {
        if (pageStage.querySelectorAll('.stage-item').length === 0) {
            alert("Serbest Düzen için lütfen Mizanpaj Sahnesine en az bir öğe sürükleyin.");
            return;
        }
        generateFreeformPdf(title, pageOrientation);
    } 
    else if (layoutMode === 'auto-1col') {
        generateAuto1ColPdf(title, pageOrientation);
    } 
    else if (layoutMode === 'auto-2col') {
        generateAuto2ColPdf(title, pageOrientation);
    }
});

// MOD 1: SERBEST DÜZEN
function generateFreeformPdf(title, orientation) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(orientation, 'pt', 'a4');
    const stageItems = pageStage.querySelectorAll('.stage-item');
    doc.setFontSize(16); doc.text(title, 40, 40);
    stageItems.forEach(item => {
        const baseId = item.id.replace('-stage', '');
        const clipData = clippings.find(c => c.id === baseId); if (!clipData) return;
        const x = parseFloat(item.style.left) + (parseFloat(item.dataset.x) || 0);
        const y = parseFloat(item.style.top) + (parseFloat(item.dataset.y) || 0);
        const width = parseFloat(item.style.width);
        const height = parseFloat(item.style.height);
        doc.setFontSize(8); doc.text(clipData.name, x, y - 5);
        doc.addImage(clipData.imageData, 'JPEG', x, y, width, height);
    });
    doc.save(title.replace(/ /g, '_') + '.pdf');
}

// MOD 2: OTOMATİK DÜZEN - ALT ALTA
function generateAuto1ColPdf(title, orientation) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(orientation, 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40; const usableWidth = pageWidth - margin * 2;
    let currentY = margin;
    doc.setFontSize(16); doc.text(title, margin, currentY); currentY += 30;
    clippings.forEach((clip, index) => {
        const ratio = usableWidth / clip.originalWidth;
        const scaledHeight = clip.originalHeight * ratio;
        const itemTotalHeight = scaledHeight + 20 + 15;
        if (currentY + itemTotalHeight > pageHeight - margin) {
            doc.addPage(); currentY = margin;
        }
        doc.setFontSize(10); doc.text(clip.name, margin, currentY); currentY += 20;
        doc.addImage(clip.imageData, 'JPEG', margin, currentY, usableWidth, scaledHeight);
        currentY += scaledHeight;
        if (index < clippings.length - 1) {
            doc.setDrawColor(180, 180, 180);
            doc.line(margin, currentY + 10, pageWidth - margin, currentY + 10);
            currentY += 20;
        }
    });
    doc.save(title.replace(/ /g, '_') + '.pdf');
}

// MOD 3: OTOMATİK DÜZEN - 2 SÜTUNLU
function generateAuto2ColPdf(title, orientation) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(orientation, 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40; const gutter = 20;
    const usableWidth = (pageWidth - margin * 2 - gutter) / 2;
    const col1_X = margin; const col2_X = margin + usableWidth + gutter;
    let colHeights = [margin, margin];
    doc.setFontSize(16); doc.text(title, margin, colHeights[0]);
    colHeights[0] += 30; colHeights[1] += 30;
    clippings.forEach((clip, index) => {
        const ratio = usableWidth / clip.originalWidth;
        const scaledHeight = clip.originalHeight * ratio;
        const itemTotalHeight = scaledHeight + 20 + 15;
        let targetCol = (colHeights[0] <= colHeights[1]) ? 0 : 1;
        if (colHeights[targetCol] + itemTotalHeight > pageHeight - margin) {
            if (targetCol === 0 && colHeights[1] + itemTotalHeight <= pageHeight - margin) {
                targetCol = 1;
            } else {
                doc.addPage(); colHeights = [margin, margin]; targetCol = 0;
            }
        }
        let targetX = (targetCol === 0) ? col1_X : col2_X;
        let currentY = colHeights[targetCol];
        doc.setFontSize(10); doc.text(clip.name, targetX, currentY); currentY += 20;
        doc.addImage(clip.imageData, 'JPEG', targetX, currentY, usableWidth, scaledHeight);
        colHeights[targetCol] = currentY + scaledHeight + 15;
    });
    doc.save(title.replace(/ /g, '_') + '.pdf');
}
