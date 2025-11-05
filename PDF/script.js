/* === PARÇA 1/6: DOM ELEMENTLERİ VE GLOBAL DEĞİŞKENLER === */
'use strict'; // Hataları daha kolay bulmak için katı modu etkinleştir

// Kütüphane Yükleyicisi
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// Ana Ekranlar
const fileInput = document.getElementById('file-input');
const uploadScreen = document.getElementById('upload-screen');
const editorScreen = document.getElementById('editor-screen');

// Sol Panel
const sourceLibraryList = document.getElementById('source-library-list');
const selectionList = document.getElementById('selection-list');
const sourceListPlaceholder = document.getElementById('source-list-placeholder');
const selectionListPlaceholder = document.getElementById('selection-list-placeholder');

// Orta Panel - Sekme Butonları ve İçerikleri
const tabSourceBtn = document.getElementById('tab-source');
const tabLayoutBtn = document.getElementById('tab-layout');
const sourceView = document.getElementById('source-view');
const layoutView = document.getElementById('layout-view');
const sourceScrollContainer = document.getElementById('source-scroll-container');
const layoutScrollContainer = document.getElementById('layout-scroll-container');

// Sekme 1: Kaynak Editörü Elemanları
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

// YENİ v2.1: Header/Footer Ayar Elementleri
const headerLeftInput = document.getElementById('header-left');
const headerRightInput = document.getElementById('header-right');
const headerLogoToggle = document.getElementById('header-logo-toggle');
const headerLogoUrlInput = document.getElementById('header-logo-url');

// --- v2.1 GLOBAL VERİ DEPOLARI VE UYGULAMA DURUMU ---

// Yüklenen tüm kaynakları (PDF/Resim) tutan kütüphane
let sourceLibrary = []; 
// Kırpılan tüm alanları tutan dizi
let clippings = [];

// Aktif olarak düzenlenen/bakılan kaynağın ID'si
let activeSourceId = null;
let activePdfDoc = null; // Sadece o an aktif olan PDF'in dokümanı
let activePdfPageNum = 1; // Aktif PDF'in hangi sayfasında olduğu

// Zoom Durumları
let currentSourceZoom = 1.0; 
let currentLayoutZoom = 1.0;

// Seçim Akışı Durumları
let isDrawing = false;
let activeSelectionRect = null; // Onay bekleyen seçimin {x, y, width, height} bilgisi
let isEditingClipId = null; // Hata düzeltmesi için kritik
let selectionStartPoint = {};

/* === PARÇA 1/6 BİTTİ === */
/* === PARÇA 2/6: BAŞLANGIÇ VE ÇOKLU DOSYA YÜKLEME (v2.1) === */

// Uygulamayı başlatan ana olay dinleyicisi
fileInput.addEventListener('change', (e) => {
    // Birden fazla dosya yüklendi
    const files = e.target.files;
    if (!files || !files.length) return; // Dosya seçilmemişse çık

    // Yükleme ekranını gizle, editörü göster
    uploadScreen.classList.add('hidden');
    editorScreen.classList.remove('hidden');
    
    // v2.1: Gerekli tüm olay dinleyicilerini (event listeners) ayarla
    setupEventListeners();
    
    // YENİ v2.1: Dosyaları paralel olarak (aynı anda) yükle
    loadFiles(files);
});

// YENİ: Tek seferde tüm olay dinleyicilerini kuran fonksiyon
// Bu, kodun daha temiz ve yönetilebilir olmasını sağlar
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

    // YENİ v2.1 (Koordinat Hatası Düzeltmesi): Olayları doğrudan Canvas ve Image'a bağla
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', drawSelection);
    canvas.addEventListener('mouseup', stopDrawing);
    
    imageViewer.addEventListener('mousedown', startDrawing);
    imageViewer.addEventListener('mousemove', drawSelection);
    imageViewer.addEventListener('mouseup', stopDrawing);
    // Mouse elementin dışına çıkarsa çizimi iptal et
    sourceScrollContainer.addEventListener('mouseleave', cancelDrawing); 

    // Seçim Onay/İptal Butonları
    confirmSelectionBtn.addEventListener('click', confirmSelection);
    cancelSelectionBtn.addEventListener('click', cancelActiveSelection);

    // Mizanpaj Sahnesi Zoom
    zoomInLayoutBtn.addEventListener('click', () => zoomLayout(0.1));
    zoomOutLayoutBtn.addEventListener('click', () => zoomLayout(-0.1));

    // Sağ Panel Ayarları
    headerLogoToggle.addEventListener('change', () => {
        headerLogoUrlInput.classList.toggle('hidden', !headerLogoToggle.checked);
    });
    pageLayoutSelect.addEventListener('change', updatePageStageLayout);

    // Ana PDF Oluşturma Butonu
    generatePdfBtn.addEventListener('click', generatePdf);
    
    // Seçim kutusunu (interact.js) ayarla
    setupSelectionBoxInteract();
}

// YENİ v2.1: Çoklu dosya yükleme yöneticisi
// Sadece görsellerle veya PDF'lerle çalışabilmeyi sağlar
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
                sourceData.currentPage = 1; // PDF'ler için sayfa takibi
                return sourceData;
            });
        } else if (file.type.startsWith('image/')) {
            sourceData.type = 'image';
            return loadImageData(file).then(imageDataUrl => {
                sourceData.data = imageDataUrl;
                return sourceData;
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

// v2.1: PDF verisini (pdf.js doc) yükler
function loadPdfData(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = async function() {
            try {
                const typedarray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                resolve(pdf);
            } catch (error) {
                console.error(`PDF yüklenemedi: ${file.name}`, error);
                reject(error);
            }
        };
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(file);
    });
}

// v2.1: Resim verisini (DataURL) yükler
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

// v2.1: Sol panele (Kaynak Kütüphanesi) dosyayı ekler
function addSourceToLibraryList(sourceData) {
    const li = document.createElement('li');
    li.className = 'source-item';
    li.id = sourceData.id;
    // Dosya tipine göre ikon (basit metin)
    const icon = sourceData.type === 'pdf' ? '[PDF]' : '[IMG]';
    li.textContent = `${icon} ${sourceData.name}`;
    
    // Tıklandığında o kaynağı editörde aç
    li.addEventListener('click', () => {
        showSourceInEditor(sourceData.id);
    });
    
    sourceLibraryList.appendChild(li);
}

/* === PARÇA 2/6 BİTTİ === */
/* === PARÇA 3/6: KAYNAK EDİTÖRÜ MANTIĞI (v2.1) === */

/**
 * Ana Sekme Değiştirme Fonksiyonu
 * @param {'source' | 'layout'} tabName Gösterilecek sekmenin adı
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
    // Aktif bir seçim varsa iptal et
    cancelActiveSelection();
}

/**
 * v2.1 Ana Kaynak Görüntüleme Fonksiyonu
 * Sol panelden bir kaynak seçildiğinde (PDF veya Resim) orta paneli günceller.
 * @param {string} sourceId Gösterilecek kaynağın ID'si
 */
async function showSourceInEditor(sourceId) {
    // Zaten bu kaynak açıksa veya düzenleniyorsa (hata düzeltmesi)
    if (activeSourceId === sourceId && !isEditingClipId) return;

    // Düzenleme modu Dışında, aktif bir seçimi daima iptal et
    if (!isEditingClipId) {
        cancelActiveSelection();
    }
    
    // Kütüphaneden kaynağı bul
    const sourceData = sourceLibrary.find(s => s.id === sourceId);
    if (!sourceData) {
        console.error("Kaynak bulunamadı:", sourceId);
        return;
    }

    // Aktif kaynağı ayarla
    activeSourceId = sourceId;

    // Sol paneldeki listede "aktif" olanı vurgula
    document.querySelectorAll('#source-library-list .source-item').forEach(item => {
        item.classList.toggle('active', item.id === sourceId);
    });

    // Kaynak tipine göre editörü hazırla
    if (sourceData.type === 'pdf') {
        // === PDF GÖRÜNTÜLEYİCİYİ HAZIRLA ===
        activePdfDoc = sourceData.data; // Aktif PDF dokümanını ayarla
        activePdfPageNum = sourceData.currentPage; // Kaldığı sayfayı getir
        
        pdfViewerContainer.classList.remove('hidden');
        pdfControls.classList.remove('hidden');
        imageViewer.classList.add('hidden');
        
        // PDF'i render et (Zoom sıfırlanır, eğer düzenleme modu değilse)
        if (!isEditingClipId) {
            currentSourceZoom = 1.0; 
        }
        await renderPdfPage(activePdfPageNum);

    } else if (sourceData.type === 'image') {
        // === RESİM GÖRÜNTÜLEYİCİYİ HAZIRLA ===
        activePdfDoc = null; // Aktif PDF yok
        
        pdfViewerContainer.classList.add('hidden');
        pdfControls.classList.add('hidden');
        imageViewer.classList.remove('hidden');
        
        // Resmin yüklenmesini bekle (eğer tarayıcı önbelleğinde değilse)
        await new Promise((resolve) => {
            imageViewer.onload = resolve;
            imageViewer.src = sourceData.data;
        });

        // Resmi render et (Zoom sıfırlanır, eğer düzenleme modu değilse)
        if (!isEditingClipId) {
            currentSourceZoom = 1.0;
        }
        renderImageViewer();
    }
}

/**
 * v2.1: Aktif PDF sayfasını çizer (render eder).
 * @param {number} num Çizilecek sayfa numarası
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
 * v2.1: Aktif Resim görüntüleyiciyi zoom'a göre ayarlar.
 */
function renderImageViewer() {
    if (!imageViewer.src || !imageViewer.naturalWidth) {
         // Resim henüz yüklenmemişse (bu nadir bir durumdur)
         // onload olayı bunu tekrar tetikleyecektir.
        return;
    }
    
    // Orijinal boyutları al
    const naturalWidth = imageViewer.naturalWidth;
    
    // Genişliği zoom'a göre ayarla. Yükseklik 'auto' olarak CSS'ten gelir.
    imageViewer.style.width = (naturalWidth * currentSourceZoom) + 'px';
    
    zoomLevelSourceSpan.textContent = `${Math.round(currentSourceZoom * 100)}%`;
}

/**
 * v2.1: Kaynak Editörü Zoom Fonksiyonu (Hem PDF hem Resim)
 * @param {number} amount Zoom miktarındaki değişiklik (örn: +0.25 veya -0.25)
 */
function zoomSource(amount) {
    // Yarım kalan seçimi iptal et
    cancelActiveSelection();
    
    currentSourceZoom += amount;
    // Minimum zoom %25 olsun
    if (currentSourceZoom < 0.25) currentSourceZoom = 0.25; 

    // Aktif kaynağın (PDF veya Resim) görünümünü güncelle
    const sourceData = sourceLibrary.find(s => s.id === activeSourceId);
    if (!sourceData) return;

    if (sourceData.type === 'pdf') {
        renderPdfPage(activePdfPageNum);
    } else if (sourceData.type === 'image') {
        renderImageViewer();
    }
}

/**
 * v2.1: PDF Sayfa Değiştirme Fonksiyonu
 * @param {number} direction Yön (-1 veya +1)
 */
async function changePdfPage(direction) {
    if (!activePdfDoc) return; // Sadece PDF'ler için çalışır

    const newPageNum = activePdfPageNum + direction;

    if (newPageNum >= 1 && newPageNum <= activePdfDoc.numPages) {
        // Sayfa değişirken yarım kalan seçimi iptal et
        cancelActiveSelection();
        await renderPdfPage(newPageNum);
    }
}

/* === PARÇA 3/6 BİTTİ === */
/* === PARÇA 4/6: SEÇİM AKIŞI (ÇİZ, DÜZENLE, ONAYLA) (v2.1) === */

/**
 * v2.1 (KOORDİNAT HATASI DÜZELTİLDİ)
 * Adım 1: Kullanıcı fareye basar (Çizim Başlar)
 * Olay artık doğrudan 'canvas' veya 'imageViewer' üzerinden tetikleniyor.
 */
function startDrawing(e) {
    // Eğer zaten bir seçim kutusu onay bekliyorsa, yeni çizim başlatma
    if (activeSelectionRect) return; 
    
    // Sol tık olduğundan emin ol
    if (e.button !== 0) return;

    isDrawing = true;
    
    // KOORDİNAT DÜZELTMESİ:
    // Olayın tetiklendiği elemente (canvas/img) göre koordinatları al (e.offsetX/Y)
    // Bu, kaydırma (scroll) veya sayfa konumundan bağımsız, %100 doğru sonucu verir.
    const x = e.offsetX;
    const y = e.offsetY;

    selectionStartPoint = { x, y };
    
    // Seçim kutusunu başlat ve göster.
    // Konumunu, kaydırma alanına göre değil, kaynak elemente (canvas/img) göre ayarla.
    selectionBox.style.left = x + 'px';
    selectionBox.style.top = y + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
    
    // Seçim kutusunu, kaynak elementin (canvas/img) "çocuğu" yap (CSS'te 'relative' ayarlı)
    // Bu, koordinatların senkronize kalmasını sağlar.
    const activeElement = getActiveSourceElement();
    if (activeElement) {
        activeElement.parentElement.appendChild(selectionBox);
    }
}

/**
 * v2.1 (KOORDİNAT HATASI DÜZELTİLDİ)
 * Adım 2: Kullanıcı fareyi hareket ettirir (Çizim)
 */
function drawSelection(e) {
    if (!isDrawing) return;

    const currentX = e.offsetX;
    const currentY = e.offsetY;

    // Başlangıca göre genişlik ve yüksekliği hesapla
    const width = currentX - selectionStartPoint.x;
    const height = currentY - selectionStartPoint.y;

    // CSS'in negatif genişlik/yükseklikle başa çıkması için
    selectionBox.style.left = (width > 0 ? selectionStartPoint.x : currentX) + 'px';
    selectionBox.style.top = (height > 0 ? selectionStartPoint.y : currentY) + 'px';
    selectionBox.style.width = Math.abs(width) + 'px';
    selectionBox.style.height = Math.abs(height) + 'px';
}

/**
 * v2.1: Adım 3: Kullanıcı fareyi bırakır (Düzenleme Başlar)
 */
function stopDrawing(e) {
    if (!isDrawing) return;
    isDrawing = false;
    
    const width = parseFloat(selectionBox.style.width);
    const height = parseFloat(selectionBox.style.height);

    // Çok küçük bir tıklamaysa (seçim değilse) iptal et
    if (width < 10 || height < 10) {
        selectionBox.style.display = 'none';
        return;
    }

    // Seçimi "aktif" hale getir ve onay/iptal kutularını göster
    makeSelectionBoxInteractive();
}

/**
 * v2.1: Çizim sırasında fare elementin dışına çıkarsa çizimi iptal et
 */
function cancelDrawing(e) {
    if (isDrawing) {
        isDrawing = false;
        selectionBox.style.display = 'none';
    }
}

/**
 * v2.1: Adım 4: Seçim kutusunu taşınabilir/boyutlandırılabilir yap (interact.js)
 */
function setupSelectionBoxInteract() {
    interact(selectionBox)
        .draggable({
            listeners: {
                move(event) {
                    const x = (parseFloat(event.target.style.left) || 0) + event.dx;
                    const y = (parseFloat(event.target.style.top) || 0) + event.dy;

                    event.target.style.left = x + 'px';
                    event.target.style.top = y + 'px';
                    
                    // Onay kutusunu da taşı
                    positionConfirmBox(x, y, parseFloat(event.target.style.width));
                }
            },
            inertia: true
        })
        .resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            listeners: {
                move(event) {
                    // Boyutları güncelle
                    event.target.style.width = event.rect.width + 'px';
                    event.target.style.height = event.rect.height + 'px';

                    // Konumu güncelle
                    event.target.style.left = (parseFloat(event.target.style.left) + event.deltaRect.left) + 'px';
                    event.target.style.top = (parseFloat(event.target.style.top) + event.deltaRect.top) + 'px';

                    // Onay kutusunu yeniden konumlandır
                    positionConfirmBox(parseFloat(event.target.style.left), parseFloat(event.target.style.top), event.rect.width);
                }
            },
            inertia: true
        });
}

/**
 * v2.1: Adım 5: Seçim kutusunu "aktif" hale getir (interact.js'i etkinleştir)
 * Bu fonksiyon artık "Yeniden Kırpma" (re-crop) için de kullanılıyor.
 */
function makeSelectionBoxInteractive(rect) {
    // Eğer dışarıdan (yeniden kırma) bir koordinat geldiyse onu kullan
    if (rect) {
        selectionBox.style.left = rect.x + 'px';
        selectionBox.style.top = rect.y + 'px';
        selectionBox.style.width = rect.width + 'px';
        selectionBox.style.height = rect.height + 'px';
        selectionBox.style.display = 'block';
    }

    // Seçim kutusunun son koordinatlarını global değişkene ata
    activeSelectionRect = {
        x: parseFloat(selectionBox.style.left),
        y: parseFloat(selectionBox.style.top),
        width: parseFloat(selectionBox.style.width),
        height: parseFloat(selectionBox.style.height)
    };
    
    // interact.js'nin bu kutuyu yakalayabilmesi için
    selectionBox.style.pointerEvents = 'auto'; 
    
    // Onay kutusunu göster ve konumlandır
    const confirmBoxContainer = getActiveSourceElement().parentElement;
    confirmBoxContainer.appendChild(selectionConfirmBox); // Onay kutusunu da doğru yere taşı
    positionConfirmBox(activeSelectionRect.x, activeSelectionRect.y, activeSelectionRect.width);
    selectionConfirmBox.classList.remove('hidden');
}

/**
 * v2.1: Adım 6: Onay (✓) Butonu
 * Kullanıcı seçimi onaylar, isim sorulur ve kırpma işlemi başlar.
 */
function confirmSelection() {
    // Güncel koordinatları al
    activeSelectionRect = {
        x: parseFloat(selectionBox.style.left),
        y: parseFloat(selectionBox.style.top),
        width: parseFloat(selectionBox.style.width),
        height: parseFloat(selectionBox.style.height)
    };

    // İsim sor
    let defaultName = `Kırpma ${clippings.length + 1}`;
    // YENİDEN KIRPMA HATASI DÜZELTMESİ:
    // Eğer "yeniden kırpma" modundaysak, eski adı getir
    if (isEditingClipId) {
        const clipData = clippings.find(c => c.id === isEditingClipId);
        if (clipData) defaultName = clipData.name;
    }
    const clipName = prompt("Bu kırpmaya bir ad verin:", defaultName);

    if (clipName) {
        // İsim verilmişse, KIRPMA İŞLEMİNİ BAŞLAT (Parça 5'te)
        captureSelection(clipName, activeSelectionRect);
    }
    
    // İptal'e basılmış gibi (veya işlem bitince) temizle
    cancelActiveSelection();
}

/**
 * v2.1: Adım 7: İptal (X) Butonu veya İşlem Bitimi
 * Aktif seçimi iptal eder ve tüm seçim durumlarını temizler.
 */
function cancelActiveSelection() {
    selectionBox.style.display = 'none';
    selectionBox.style.pointerEvents = 'none'; // Dokunulamaz yap
    selectionConfirmBox.classList.add('hidden');
    
    // Tüm global seçim durumlarını sıfırla
    activeSelectionRect = null;
    isDrawing = false;
    selectionStartPoint = {};
    
    // YENİDEN KIRPMA HATASI DÜZELTMESİ:
    // İster iptal edilsin, ister onaylansın, "düzenleme modu" daima kapanmalıdır.
    isEditingClipId = null; 
}

/**
 * v2.1 (KOORDİNAT HATASI DÜZELTMESİ İÇİN YARDIMCI)
 * O an aktif olan kaynak elementini (canvas veya image) döndürür.
 */
function getActiveSourceElement() {
    const sourceData = sourceLibrary.find(s => s.id === activeSourceId);
    if (!sourceData) return null;
    return (sourceData.type === 'pdf') ? canvas : imageViewer;
}

/**
 * v2.1: Onay kutusunu seçim kutusunun yanına/altına konumlandırır
 */
function positionConfirmBox(x, y, width) {
    // Kutunun pozisyonunu, seçim kutusunun sağ alt köşesine yakın ayarla
    let newLeft = x + width - 65; // 65px = kutunun genişliği
    let newTop = y + parseFloat(selectionBox.style.height) + 5; // Kutunun 5px altına

    // TODO: Eğer ekran dışına taşıyorsa, pozisyonu ayarla (şimdilik basit)
    
    selectionConfirmBox.style.left = newLeft + 'px';
    selectionConfirmBox.style.top = newTop + 'px';
}


/* === PARÇA 4/6 BİTTİ === */
/* === PARÇA 5/6: KIRPMA, YENİDEN KIRPMA (RE-CROP) VE MİZANPAJ SAHNESİ (v2.1) === */

/**
 * v2.1: Hem PDF (canvas) hem Resim (img) kırpabilen ana fonksiyon
 * @param {string} name - Kırpmaya verilen isim
 * @param {object} rect - Seçim kutusunun son konumu {x, y, width, height}
 */
function captureSelection(name, rect) {
    const sourceData = sourceLibrary.find(s => s.id === activeSourceId);
    if (!sourceData) return cancelActiveSelection(); // Kaynak yoksa iptal et

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = rect.width;
    tempCanvas.height = rect.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    let originalWidth, originalHeight; // PDF çıktısı için orijinal boyutları sakla

    // Kaynak tipine göre kırpma
    if (sourceData.type === 'pdf') {
        // === PDF (Canvas) üzerinden kırp ===
        // Koordinatlar zaten 1:1 (zoom'suz canvas'a göre değil, zoom'lu canvas'a göre)
        // Ancak biz 'currentSourceZoom'u hesaba katmalıyız.
        const scale = currentSourceZoom;
        const origX = rect.x / scale;
        const origY = rect.y / scale;
        originalWidth = rect.width / scale;
        originalHeight = rect.height / scale;

        // Geçici tuvalin boyutunu zoom'suz boyuta ayarla
        tempCanvas.width = originalWidth;
        tempCanvas.height = originalHeight;
        
        // Orijinal (zoom'suz) canvas'tan kırpmak için yeni bir viewport ile yeniden render etmemiz gerekir
        // DAHA KOLAY YÖNTEM: Görünen (zoom'lu) canvas'tan al, sonra küçült
        // Görünen (zoom'lu) canvas'tan al
        tempCtx.drawImage(canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
        
        // Orijinal boyutları kaydet
        originalWidth = rect.width;
        originalHeight = rect.height;
        // Not: Bu, zoom'lu boyuttur. PDF çıktısında sorun yaratabilir.
        // Düzeltme: Orijinal boyutları kullanalım.
        const viewport = activePdfDoc.getPage(activePdfPageNum).getViewport({ scale: 1.0 });
        originalWidth = rect.width / (canvas.width / viewport.width);
        originalHeight = rect.height / (canvas.height / viewport.height);
        tempCanvas.width = originalWidth;
        tempCanvas.height = originalHeight;
        tempCtx.drawImage(canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, originalWidth, originalHeight);


    } else if (sourceData.type === 'image') {
        // === RESİM (Image) üzerinden kırp ===
        // Orijinal (zoom'suz) koordinatları bul
        const scale = imageViewer.width / imageViewer.naturalWidth;
        const origX = rect.x / scale;
        const origY = rect.y / scale;
        originalWidth = rect.width / scale;
        originalHeight = rect.height / scale;

        // Geçici tuvalin boyutunu zoom'suz (orijinal) kırpma boyutuna ayarla
        tempCanvas.width = originalWidth;
        tempCanvas.height = originalHeight;
        
        // Orijinal resmi (imageViewer) kullanarak zoom'suz koordinatlara göre kırp
        tempCtx.drawImage(imageViewer, origX, origY, originalWidth, originalHeight, 0, 0, originalWidth, originalHeight);
    }
    
    const imageData = tempCanvas.toDataURL('image/jpeg', 0.9);
    
    // v2.1 YENİDEN KIRPMA (RE-CROP) HATASI DÜZELTMESİ:
    // 'isEditingClipId' doluysa, yeni oluşturma, eskisini GÜNCELLE
    if (isEditingClipId) {
        const clipData = clippings.find(c => c.id === isEditingClipId);
        if (clipData) {
            clipData.name = name;
            clipData.imageData = imageData;
            clipData.sourceId = activeSourceId; // Kaynak değişmiş olabilir
            clipData.sourceType = sourceData.type;
            clipData.sourceRect = rect; // Ekrana göre koordinatlar (sonraki düzenleme için)
            clipData.sourcePage = (sourceData.type === 'pdf') ? activePdfPageNum : null;
            clipData.originalWidth = originalWidth;
            clipData.originalHeight = originalHeight;
            
            // Sol paneldeki listeyi (thumbnail ve isim) güncelle
            updateClipInLeftPanel(clipData);
        }
        isEditingClipId = null; // Düzenleme bitti, durumu sıfırla
    } else { 
        // 'isEditingClipId' boşsa, YENİ KIRPMA oluştur
        const clipData = {
            id: 'clip-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            name: name,
            imageData: imageData,
            sourceId: activeSourceId, // Hangi kaynaktan geldi
            sourceType: sourceData.type, // Kaynak tipi
            sourcePage: (sourceData.type === 'pdf') ? activePdfPageNum : null,
            sourceRect: rect, // Ekrana göre koordinatlar (sonraki düzenleme için)
            originalWidth: originalWidth, // Orijinal (zoom'suz) genişlik
            originalHeight: originalHeight // Orijinal (zoom'suz) yükseklik
        };

        clippings.push(clipData);
        addClipToLeftPanel(clipData);
    }
}

/**
 * v2.1: Sol panele (Kırpma Listesi) YENİ kırpma ekler
 */
function addClipToLeftPanel(clipData) {
    if (selectionListPlaceholder) selectionListPlaceholder.remove();

    const li = document.createElement('li');
    li.className = 'clip-item';
    li.id = clipData.id;
    li.dataset.clipId = clipData.id;

    li.innerHTML = `
        <img src="${clipData.imageData}" alt="Önizleme" class="clip-thumbnail">
        <span class="clip-name">${clipData.name}</span>
    `;
    
    // YENİDEN KIRPMA (RE-CROP) İÇİN ÇİFT TIKLAMA OLAYI
    li.addEventListener('dblclick', () => {
        editClipping(clipData.id);
    });
    
    selectionList.appendChild(li);
}

/**
 * v2.1: Sol paneldeki (Kırpma Listesi) VAROLAN kırpmayı günceller
 */
function updateClipInLeftPanel(clipData) {
    const li = document.getElementById(clipData.id);
    if (li) {
        li.querySelector('.clip-thumbnail').src = clipData.imageData;
        li.querySelector('.clip-name').textContent = clipData.name;
    }
}

/**
 * v2.1 YENİDEN KIRPMA (RE-CROP) Ana Fonksiyonu (Hata Düzeltmeli)
 * Sol paneldeki bir kırpmaya çift tıklandığında tetiklenir.
 */
async function editClipping(clipId) {
    // Yarım kalan başka bir seçim varsa iptal et
    cancelActiveSelection();

    const clipData = clippings.find(c => c.id === clipId);
    if (!clipData) return;
    
    // v2.1 HATA DÜZELTMESİ:
    // Düzenleme modunu global olarak ayarla. Bu, 'confirmSelection' fonksiyonunun
    // yeni bir ID oluşturmak yerine 'update' yapmasını sağlar.
    isEditingClipId = clipId;
    
    // 1. Doğru kaynağı editörde aç (Bu fonksiyon PDF/Resim ayrımını kendi yapar)
    // 'showSourceInEditor' artık 'isEditingClipId' doluysa zoom'u sıfırlamayacak.
    await showSourceInEditor(clipData.sourceId);
    
    // 2. Kaynak PDF ise, doğru sayfaya git
    if (clipData.sourceType === 'pdf' && activePdfPageNum !== clipData.sourcePage) {
        await renderPdfPage(clipData.sourcePage);
    }
    
    // 3. Render bittikten SONRA, eski seçim kutusunu ekrana getir
    // ve "aktif" hale getir (düzenlenebilir)
    makeSelectionBoxInteractive(clipData.sourceRect);
    
    // 4. Kullanıcının görebilmesi için o bölgeye scroll yap
    sourceScrollContainer.scrollTop = clipData.sourceRect.y - 50; // Biraz üstten
    sourceScrollContainer.scrollLeft = clipData.sourceRect.x - 50;
    
    // 5. Kaynak Editörü sekmesine geç
    switchTab('source');
}


// --- MİZANPAJ SAHNESİ (SEKME 2) MANTIĞI ---

/**
 * v2.1: Sol panelden Mizanpaj Sahnesine bir öğe bırakıldığında tetiklenir
 */
interact('#page-stage')
    .dropzone({
        accept: '.clip-item',
        ondrop: function (event) {
            const draggableElement = event.relatedTarget;
            const clipId = draggableElement.dataset.clipId;
            const stageRect = pageStage.getBoundingClientRect();
            
            // Bırakılan yerin sahneye göre pozisyonunu al (kaydırma ve ZOOM'u hesaba kat)
            const dropX = (event.clientX - stageRect.left + layoutScrollContainer.scrollLeft) / currentLayoutZoom;
            const dropY = (event.clientY - stageRect.top + layoutScrollContainer.scrollTop) / currentLayoutZoom;

            createStageItem(clipId, dropX, dropY);
            
            // Bıraktıktan sonra otomatik olarak Mizanpaj sekmesine geç
            switchTab('layout');
        }
    });

/**
 * v2.1: Mizanpaj Sahnesine yeni bir kırpma öğesi (ve sil butonu) ekler
 */
function createStageItem(clipId, x, y) {
    const clipData = clippings.find(c => c.id === clipId);
    if (!clipData) return;
    
    // Sahnede zaten varsa (örn: yanlışlıkla çift sürükleme), tekrar ekleme
    if (document.getElementById(clipData.id + '-stage')) return;

    const stageItem = document.createElement('div');
    stageItem.className = 'stage-item';
    stageItem.id = clipData.id + '-stage';
    
    // Orantılı başlangıç boyutu
    const initialWidth = clipData.originalWidth > 200 ? 200 : clipData.originalWidth; // Max 200px başla
    const initialHeight = clipData.originalHeight * (initialWidth / clipData.originalWidth);
    stageItem.style.width = initialWidth + 'px';
    stageItem.style.height = initialHeight + 'px';
    
    // Bırakıldığı yere ortalayarak konumlandır
    stageItem.style.position = 'absolute';
    stageItem.style.left = (x - initialWidth / 2) + 'px';
    stageItem.style.top = (y - initialHeight / 2) + 'px';
    stageItem.setAttribute('data-x', 0); // interact.js için başlangıç
    stageItem.setAttribute('data-y', 0);
    
    // YENİ v2.1: Silme Butonu
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'stage-item-delete-btn';
    deleteBtn.innerHTML = '&times;'; // 'X' işareti
    deleteBtn.title = 'Sahneden Sil';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Arka plandaki 'drag' olayını tetiklemesin
        // Öğeyi (kendisini değil, ebeveynini) sahneden kaldır
        stageItem.remove(); 
    });

    stageItem.innerHTML = `<img src="${clipData.imageData}" style="width: 100%; height: 100%;">`;
    stageItem.appendChild(deleteBtn); // Sil butonunu ekle
    stageItem.innerHTML += `<div class="resize-handle bottom-right"></div>`; // Boyutlandırma tutamacını ekle
    
    pageStage.appendChild(stageItem);
}

/**
 * v2.1: Sahne üzerindeki öğeleri (interact.js) TAŞINABİLİR ve YENİDEN BOYUTLANDIRILABİLİR yap
 */
interact('.stage-item')
    .draggable({
        inertia: true,
        modifiers: [interact.modifiers.restrictRect({ restriction: 'parent' })],
        listeners: {
            move(event) {
                const target = event.target;
                // Zoom'u hesaba katarak hareketi ayarla
                const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx / currentLayoutZoom;
                const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy / currentLayoutZoom;
                
                target.style.transform = `translate(${x}px, ${y}px)`;
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);
            }
        }
    })
    .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        listeners: {
            move(event) {
                const target = event.target;
                let { x, y } = target.dataset;
                x = (parseFloat(x) || 0); y = (parseFloat(y) || 0);

                // Boyutları güncelle
                target.style.width = event.rect.width + 'px';
                target.style.height = event.rect.height + 'px';
                
                // Zoom'u hesaba katarak pozisyonu düzelt
                x += event.deltaRect.left / currentLayoutZoom;
                y += event.deltaRect.top / currentLayoutZoom;

                target.style.transform = `translate(${x}px, ${y}px)`;
                target.dataset.x = x; target.dataset.y = y;
            }
        }
    });

/* === PARÇA 5/6 BİTTİ === */
/* === PARÇA 6/6: MİZANPAJ ZOOM VE FİNAL PDF OLUŞTURMA (v2.1) === */

/**
 * v2.1: Mizanpaj (Sahne) Zoom Fonksiyonu
 * @param {number} amount Zoom miktarındaki değişiklik (örn: +0.1 veya -0.1)
 */
function zoomLayout(amount) {
    currentLayoutZoom += amount;
    if (currentLayoutZoom < 0.1) currentLayoutZoom = 0.1; // Min %10 zoom
    updateLayoutZoom();
}

/**
 * v2.1: Mizanpaj Sahnesinin CSS'ini (zoom) günceller
 */
function updateLayoutZoom() {
    pageStage.style.transform = `scale(${currentLayoutZoom})`;
    zoomLevelLayoutSpan.textContent = `${Math.round(currentLayoutZoom * 100)}%`;
}

/**
 * v2.1: Sağ panelden Dikey/Yatay A4 seçimi yapıldığında sahneyi günceller
 */
function updatePageStageLayout() {
    const layout = pageLayoutSelect.value;
    if (layout === 'a4-landscape') {
        pageStage.classList.remove('a4-portrait');
        pageStage.classList.add('a4-landscape');
    } else {
        pageStage.classList.remove('a4-portrait');
        pageStage.classList.add('a4-portrait');
    }
}


// --- FİNAL PDF OLUŞTURMA (v2.1 - HEADER/LOGO EKLENDİ) ---

/**
 * v2.1: Ana PDF Oluşturma Dağıtıcı Fonksiyonu
 * Artık 'async' çünkü logo'yu URL'den çekmesi gerekebilir.
 */
async function generatePdf() {
    // 1. Ayarları al
    const title = pdfTitleInput.value || "Mizanpajım";
    const layoutMode = document.querySelector('input[name="layout-type"]:checked').value;
    const orientation = (pageLayoutSelect.value === 'a4-landscape') ? 'l' : 'p';

    // 2. Kırpma listesi boş mu?
    if (clippings.length === 0) {
        alert("PDF oluşturmak için lütfen önce en az bir alan kırpın.");
        return;
    }

    // 3. (YENİ v2.1) Header ayarlarını al
    const headerSettings = {
        left: headerLeftInput.value || "",
        right: headerRightInput.value || "",
        useLogo: headerLogoToggle.checked,
        logoUrl: headerLogoUrlInput.value || ""
    };
    
    // 4. (YENİ v2.1) Eğer logo kullanılacaksa, önce logoyu çek
    let logoData = null;
    if (headerSettings.useLogo && headerSettings.logoUrl) {
        try {
            console.log("Logo yükleniyor...");
            logoData = await getBase64ImageFromUrl(headerSettings.logoUrl);
            console.log("Logo yüklendi.");
        } catch (error) {
            console.error("Logo yüklenemedi:", error);
            alert("Uyarı: Logo URL'si yüklenemedi, log_o_ olmadan devam ediliyor.");
        }
    }
    headerSettings.logoData = logoData; // Çekilen veriyi ayarlara ekle

    // 5. Seçilen moda göre ilgili fonksiyonu çağır
    if (layoutMode === 'freeform') {
        if (pageStage.querySelectorAll('.stage-item').length === 0) {
            alert("Serbest Düzen için lütfen Mizanpaj Sahnesine en az bir öğe sürükleyin.");
            return;
        }
        generateFreeformPdf(title, orientation, headerSettings);
    } 
    else if (layoutMode === 'auto-1col') {
        generateAuto1ColPdf(title, orientation, headerSettings);
    } 
    else if (layoutMode === 'auto-2col') {
        generateAuto2ColPdf(title, orientation, headerSettings);
    }
}

/**
 * v2.1 YARDIMCI: URL'den resmi alır ve Base64'e çevirir (jsPDF için gerekli)
 * @param {string} imageUrl Logo'nun URL'si
 */
function getBase64ImageFromUrl(imageUrl) {
    // Not: Bu fonksiyon, 'CORS' hatası nedeniyle bazı sunuculardan (Facebook gibi) resim çekemeyebilir.
    // Bu, tarayıcının bir güvenlik kısıtlamasıdır.
    return new Promise((resolve, reject) => {
        // Logoyu proxy üzerinden çekmeyi deneyebiliriz (CORS için)
        // Ancak şimdilik doğrudan deniyoruz:
        fetch(imageUrl)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.blob();
            })
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(reader.result); // Base64 Data URL
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            })
            .catch(error => {
                console.warn(`Doğrudan fetch başarısız (CORS hatası olabilir): ${error.message}. Proxy deneniyor...`);
                // Güvenli bir CORS proxy'si (ücretsiz servis)
                const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
                fetch(proxyUrl + imageUrl)
                    .then(response => {
                        if (!response.ok) throw new Error('Proxy response was not ok');
                        return response.blob();
                    })
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    })
                    .catch(proxyError => {
                        console.error('Proxy ile de logo alınamadı:', proxyError);
                        reject(proxyError);
                    });
            });
    });
}

/**
 * v2.1 YARDIMCI: Her sayfanın üst bilgisi (Header) çizer
 * @param {jsPDF} doc - jsPDF dokümanı
 * @param {object} settings - Header ayarları (logoData dahil)
 * @returns {number} Header'ın bittiği Y pozisyonu (içeriğin başlaması için)
 */
function generateHeader(doc, settings) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    let currentY = margin;

    // Sol Üst (Ad Soyad)
    if (settings.left) {
        doc.setFontSize(10);
        doc.text(settings.left, margin, currentY);
    }

    // Sağ Üst (Tarih)
    if (settings.right) {
        doc.setFontSize(10);
        const textWidth = doc.getTextWidth(settings.right);
        doc.text(settings.right, pageWidth - margin - textWidth, currentY);
    }
    
    // Orta Üst (Logo)
    if (settings.logoData) {
        try {
            // Logo boyutları (uygun şekilde küçült)
            const logoWidth = 50; // 50pt genişlik
            const logoHeight = 50; // 50pt yükseklik (veya orantılı)
            const logoX = (pageWidth / 2) - (logoWidth / 2); // Ortala
            
            // Logo verisi JPEG veya PNG olabilir, formatı otomatik algıla
            const format = settings.logoData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            doc.addImage(settings.logoData, format, logoX, currentY - 10, logoWidth, logoHeight);
            
            currentY += logoHeight - 10; // Logonun kapladığı alan
        } catch(e) {
            console.error("PDF'e logo eklenirken hata:", e);
        }
    }
    
    currentY += 10; // Metinler için boşluk
    
    // Header ayırıcı çizgisi
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    
    return currentY + 15; // İçeriğin başlayacağı Y pozisyonu
}


// --- GÜNCELLENMİŞ PDF OLUŞTURMA FONKSİYONLARI ---

/**
 * MOD 1: SERBEST DÜZEN (v2.1 - Header eklendi)
 */
function generateFreeformPdf(title, orientation, headerSettings) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(orientation, 'pt', 'a4');
    const stageItems = pageStage.querySelectorAll('.stage-item');

    // 1. Header'ı çiz
    const startY = generateHeader(doc, headerSettings);

    // 2. Ana Başlığı çiz (Header'dan sonra)
    doc.setFontSize(16);
    doc.text(title, 40, startY);
    const titleHeight = 30;

    // 3. Kırpmaları ekle
    stageItems.forEach(item => {
        const baseId = item.id.replace('-stage', '');
        const clipData = clippings.find(c => c.id === baseId); if (!clipData) return;

        // Koordinatları al
        let x = parseFloat(item.style.left) + (parseFloat(item.dataset.x) || 0);
        let y = parseFloat(item.style.top) + (parseFloat(item.dataset.y) || 0);
        const width = parseFloat(item.style.width);
        const height = parseFloat(item.style.height);
        
        // Not: Öğeleri başlığın altına sığdır (opsiyonel)
        // y = y + startY + titleHeight; 
        // (Şimdilik serbest düzende bunu yapmıyoruz, koordinatlar mutlak)
        
        doc.setFontSize(8);
        doc.text(clipData.name, x, y - 5);
        doc.addImage(clipData.imageData, 'JPEG', x, y, width, height);
    });
    
    doc.save(title.replace(/ /g, '_') + '.pdf');
}

/**
 * MOD 2: OTOMATİK DÜZEN - ALT ALTA (v2.1 - Header eklendi)
 */
function generateAuto1ColPdf(title, orientation, headerSettings) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(orientation, 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40; const usableWidth = pageWidth - margin * 2;
    
    // 1. Header'ı çiz ve başlangıç Y pozisyonunu al
    let currentY = generateHeader(doc, headerSettings);

    // 2. Ana Başlığı çiz
    doc.setFontSize(16);
    doc.text(title, margin, currentY);
    currentY += 30;
    
    const pageTopY = currentY; // Her yeni sayfanın başı

    // 3. Kırpmaları ekle
    clippings.forEach((clip, index) => {
        const ratio = usableWidth / clip.originalWidth;
        const scaledHeight = clip.originalHeight * ratio;
        const itemTotalHeight = scaledHeight + 20 + 15; // İsim + Çizgi

        if (currentY + itemTotalHeight > pageHeight - margin) {
            doc.addPage();
            currentY = generateHeader(doc, headerSettings); // Yeni sayfaya da header çiz
            // currentY = pageTopY; // Veya sadece içerik
        }

        doc.setFontSize(10);
        doc.text(clip.name, margin, currentY);
        currentY += 20;

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

/**
 * MOD 3: OTOMATİK DÜZEN - 2 SÜTUNLU (v2.1 - Header eklendi)
 */
function generateAuto2ColPdf(title, orientation, headerSettings) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(orientation, 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40; const gutter = 20;
    const usableWidth = (pageWidth - margin * 2 - gutter) / 2;
    const col1_X = margin; const col2_X = margin + usableWidth + gutter;
    
    // 1. Header'ı çiz ve başlangıç Y pozisyonunu al
    let startY = generateHeader(doc, headerSettings);

    // 2. Ana Başlığı çiz
    doc.setFontSize(16);
    doc.text(title, margin, startY);
    startY += 30;

    let colHeights = [startY, startY]; // Her iki sütun da başlığın altından başlar

    // 3. Kırpmaları ekle
    clippings.forEach((clip, index) => {
        const ratio = usableWidth / clip.originalWidth;
        const scaledHeight = clip.originalHeight * ratio;
        const itemTotalHeight = scaledHeight + 20 + 15;

        let targetCol = (colHeights[0] <= colHeights[1]) ? 0 : 1;
        
        if (colHeights[targetCol] + itemTotalHeight > pageHeight - margin) {
            if (targetCol === 0 && colHeights[1] + itemTotalHeight <= pageHeight - margin) {
                targetCol = 1; // Solda yer yoksa sağa geç
            } else {
                doc.addPage();
                startY = generateHeader(doc, headerSettings); // Yeni sayfaya da header çiz
                colHeights = [startY, startY]; // Y'leri sıfırla
                targetCol = 0; // Soldan başla
            }
        }
        
        let targetX = (targetCol === 0) ? col1_X : col2_X;
        let currentY = colHeights[targetCol];

        doc.setFontSize(10);
        doc.text(clip.name, targetX, currentY);
        currentY += 20;

        doc.addImage(clip.imageData, 'JPEG', targetX, currentY, usableWidth, scaledHeight);
        colHeights[targetCol] = currentY + scaledHeight + 15; // Boşluk
    });
    doc.save(title.replace(/ /g, '_') + '.pdf');
}

/* === TÜM PARÇALAR BİTTİ (v2.1 Tamamlandı) === */
