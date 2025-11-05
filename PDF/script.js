// --- 0. DOM ELEMENTLERİ ---
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// Ana Ekranlar
const fileInput = document.getElementById('file-input');
const uploadScreen = document.getElementById('upload-screen');
const editorScreen = document.getElementById('editor-screen');

// Orta Panel - Sekme Butonları ve İçerikleri
const tabSourceBtn = document.getElementById('tab-source');
const tabLayoutBtn = document.getElementById('tab-layout');
const sourceView = document.getElementById('source-view');
const layoutView = document.getElementById('layout-view');
const sourceScrollContainer = document.getElementById('source-scroll-container');
const layoutScrollContainer = document.getElementById('layout-scroll-container');

// Sekme 1: Kaynak PDF Elemanları
const pdfContainer = document.getElementById('pdf-viewer-container');
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumSpan = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');

// Sekme 1: Zoom
const zoomInSourceBtn = document.getElementById('zoom-in-source');
const zoomOutSourceBtn = document.getElementById('zoom-out-source');
const zoomLevelSourceSpan = document.getElementById('zoom-level-source');

// Sekme 1: YENİ Seçim Akışı Elemanları
const selectionBox = document.getElementById('selection-box');
const selectionConfirmBox = document.getElementById('selection-confirm-box');
const confirmSelectionBtn = document.getElementById('confirm-selection');
const cancelSelectionBtn = document.getElementById('cancel-selection');

// Sekme 2: Mizanpaj Sahnesi Elemanları
const pageStage = document.getElementById('page-stage');

// Sekme 2: Zoom
const zoomInLayoutBtn = document.getElementById('zoom-in-layout');
const zoomOutLayoutBtn = document.getElementById('zoom-out-layout');
const zoomLevelLayoutSpan = document.getElementById('zoom-level-layout');

// Sol Panel: Kırpma Listesi
const selectionList = document.getElementById('selection-list');

// Sağ Panel: Ayarlar
const pageLayoutSelect = document.getElementById('page-layout');
const generatePdfBtn = document.getElementById('generate-pdf');
const pdfTitleInput = document.getElementById('pdf-title');

// --- 1. GLOBAL VERİ DEPOLARI VE UYGULAMA DURUMU ---
let pdfDoc = null;
let currentPageNum = 1;
let clippings = []; // Tüm kırpma verilerini tutan ana dizi

// Zoom Durumları
let currentSourceZoom = 1.5; // pdf.js scale
let currentLayoutZoom = 1.0; // CSS scale

// Seçim Akışı Durumları
let isDrawing = false; // Kullanıcı şu an fare ile çizim mi yapıyor?
let activeSelectionRect = null; // Onay bekleyen seçimin {x, y, width, height} bilgisi
let isEditingClipId = null; // "Yeniden Kırpma" modunda mıyız? Hangi ID'yi düzenliyoruz?
let selectionStartPoint = {}; // Çizimin başladığı nokta

// --- 2. UYGULAMA BAŞLANGICI VE SEKMELER ---

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        alert("Lütfen bir PDF dosyası seçin.");
        return;
    }
    uploadScreen.classList.add('hidden');
    editorScreen.classList.remove('hidden');
    
    // Interact.js'i ilk seçim kutusu için hazırla (YENİ AKIŞ)
    setupSelectionBoxInteract();
    
    loadPdf(file);
});

// Sekme 1'i (Kaynak PDF) göster
tabSourceBtn.addEventListener('click', () => {
    tabSourceBtn.classList.add('active');
    sourceView.classList.add('active');
    tabLayoutBtn.classList.remove('active');
    layoutView.classList.remove('active');
});

// Sekme 2'yi (Mizanpaj Sahnesi) göster
tabLayoutBtn.addEventListener('click', () => {
    tabSourceBtn.classList.remove('active');
    sourceView.classList.remove('active');
    tabLayoutBtn.classList.add('active');
    layoutView.classList.add('active');
});

// --- 3. KAYNAK PDF (SEKME 1) - YÜKLEME, ÇİZDİRME VE ZOOM ---

async function loadPdf(file) {
    const fileReader = new FileReader();
    fileReader.onload = async function() {
        const typedarray = new Uint8Array(this.result);
        pdfDoc = await pdfjsLib.getDocument(typedarray).promise;
        pageCountSpan.textContent = pdfDoc.numPages;
        await renderPage(currentPageNum);
    };
    fileReader.readAsArrayBuffer(file);
}

// renderPage artık async (await) çünkü render bitmeden işlem yapmamalıyız
async function renderPage(num) {
    // Sayfa değişirken, yarım kalan seçim işlemlerini iptal et
    cancelActiveSelection(); 
    
    const page = await pdfDoc.getPage(num);
    // YENİ: Zoom seviyesini global değişkenden al
    const viewport = page.getViewport({ scale: currentSourceZoom }); 
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = { canvasContext: ctx, viewport: viewport };
    await page.render(renderContext).promise;
    
    pageNumSpan.textContent = num;
    currentPageNum = num;
}

// Kaynak PDF Zoom Butonları
zoomInSourceBtn.addEventListener('click', () => {
    currentSourceZoom += 0.25;
    zoomLevelSourceSpan.textContent = `${Math.round(currentSourceZoom * 100)}%`;
    renderPage(currentPageNum);
});
zoomOutSourceBtn.addEventListener('click', () => {
    if (currentSourceZoom <= 0.25) return;
    currentSourceZoom -= 0.25;
    zoomLevelSourceSpan.textContent = `${Math.round(currentSourceZoom * 100)}%`;
    renderPage(currentPageNum);
});

// Sayfa Navigasyon Butonları
prevPageBtn.addEventListener('click', async () => {
    if (currentPageNum <= 1) return;
    await renderPage(--currentPageNum);
});
nextPageBtn.addEventListener('click', async () => {
    if (currentPageNum >= pdfDoc.numPages) return;
    await renderPage(++currentPageNum);
});

// --- 4. YENİ SEÇİM AKIŞI (SEKME 1) - ÇİZ, DÜZENLE, ONAYLA ---

// Adım 1: Kullanıcı fareye basar (Çizim Başlar)
pdfContainer.addEventListener('mousedown', (e) => {
    // Eğer zaten bir seçim kutusu onay bekliyorsa, yeni çizim başlatma
    if (activeSelectionRect) return; 
    
    isDrawing = true;
    
    // Koordinatları canvas'a göre al
    const canvasRect = canvas.getBoundingClientRect();
    const x = e.clientX - canvasRect.left + sourceScrollContainer.scrollLeft;
    const y = e.clientY - canvasRect.top + sourceScrollContainer.scrollTop;

    selectionStartPoint = { x, y };
    
    // Seçim kutusunu başlat ve göster
    selectionBox.style.left = x + 'px';
    selectionBox.style.top = y + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
});

// Adım 2: Kullanıcı fareyi hareket ettirir (Çizim)
pdfContainer.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;

    const canvasRect = canvas.getBoundingClientRect();
    const currentX = e.clientX - canvasRect.left + sourceScrollContainer.scrollLeft;
    const currentY = e.clientY - canvasRect.top + sourceScrollContainer.scrollTop;

    const width = currentX - selectionStartPoint.x;
    const height = currentY - selectionStartPoint.y;

    selectionBox.style.left = (width > 0 ? selectionStartPoint.x : currentX) + 'px';
    selectionBox.style.top = (height > 0 ? selectionStartPoint.y : currentY) + 'px';
    selectionBox.style.width = Math.abs(width) + 'px';
    selectionBox.style.height = Math.abs(height) + 'px';
});

// Adım 3: Kullanıcı fareyi bırakır (Düzenleme Başlar)
pdfContainer.addEventListener('mouseup', (e) => {
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
});

// Adım 4: Seçim kutusunu taşınabilir/boyutlandırılabilir yap
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
                    let { x, y } = event.target.dataset;
                    x = (parseFloat(x) || 0);
                    y = (parseFloat(y) || 0);

                    // Boyutları güncelle
                    event.target.style.width = event.rect.width + 'px';
                    event.target.style.height = event.rect.height + 'px';

                    // Yeniden boyutlandırmadan kaynaklanan pozisyon kaymasını düzelt
                    x += event.deltaRect.left;
                    y += event.deltaRect.top;
                    
                    event.target.style.left = (parseFloat(event.target.style.left) + event.deltaRect.left) + 'px';
                    event.target.style.top = (parseFloat(event.target.style.top) + event.deltaRect.top) + 'px';

                    // Onay kutusunu yeniden konumlandır
                    positionConfirmBox(parseFloat(event.target.style.left), parseFloat(event.target.style.top), event.rect.width);
                }
            },
            inertia: true
        });
}

// Adım 5: Seçim kutusunu "aktif" hale getir (interact.js'i etkinleştir)
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
    positionConfirmBox(activeSelectionRect.x, activeSelectionRect.y, activeSelectionRect.width);
    selectionConfirmBox.classList.remove('hidden');
}

// Adım 6: Onay/İptal Butonları
confirmSelectionBtn.addEventListener('click', () => {
    // Güncel koordinatları al
    activeSelectionRect = {
        x: parseFloat(selectionBox.style.left),
        y: parseFloat(selectionBox.style.top),
        width: parseFloat(selectionBox.style.width),
        height: parseFloat(selectionBox.style.height)
    };

    // İsim sor
    let defaultName = `Soru ${clippings.length + 1}`;
    // Eğer "yeniden kırpma" modundaysak, eski adı getir
    if (isEditingClipId) {
        defaultName = clippings.find(c => c.id === isEditingClipId).name;
    }
    const clipName = prompt("Bu kırpmaya bir ad verin:", defaultName);

    if (clipName) {
        captureSelection(clipName, activeSelectionRect);
    }
    
    // İptal'e basılmış gibi temizle
    cancelActiveSelection();
});

cancelSelectionBtn.addEventListener('click', () => {
    cancelActiveSelection();
});

// Helper: Onay kutusunu seçim kutusunun yanına/altına konumlandır
function positionConfirmBox(x, y, width) {
    selectionConfirmBox.style.left = (x + width - 65) + 'px'; // 65px = kutunun genişliği
    selectionConfirmBox.style.top = (y - 40) + 'px'; // 40px = kutunun yüksekliği
}

// Helper: Aktif seçimi iptal et ve temizle
function cancelActiveSelection() {
    selectionBox.style.display = 'none';
    selectionBox.style.pointerEvents = 'none';
    selectionConfirmBox.classList.add('hidden');
    activeSelectionRect = null;
    isEditingClipId = null; // Düzenleme modunu daima kapat
}

// --- 5. KIRPMA İŞLEMİ VE "YENİDEN KIRPMA" (RE-CROP) ---

// Adım 7: Seçimi yakala, veriye dönüştür ve sol panele ekle
function captureSelection(name, rect) {
    // Geçici tuval kullanarak görüntüyü canvas'tan kopyala
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = rect.width;
    tempCanvas.height = rect.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.drawImage(canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
    const imageData = tempCanvas.toDataURL('image/jpeg', 0.9);

    // YENİDEN KIRPMA (RE-CROP) KONTROLÜ
    // Eğer 'isEditingClipId' doluysa, yeni oluşturma, eskisini GÜNCELLE
    if (isEditingClipId) {
        const clipData = clippings.find(c => c.id === isEditingClipId);
        clipData.name = name;
        clipData.imageData = imageData;
        clipData.sourceRect = rect;
        clipData.sourcePage = currentPageNum; // Sayfa değişmiş olabilir
        
        // Sol paneldeki listeyi güncelle
        updateClipInLeftPanel(clipData);
        
    } else { 
        // 'isEditingClipId' boşsa, YENİ KIRPMA oluştur
        const clipData = {
            id: 'clip-' + Date.now(),
            name: name,
            imageData: imageData,
            sourcePage: currentPageNum, // YENİDEN KIRPMA için kaynak sayfa
            sourceRect: rect, // YENİDEN KIRPMA için kaynak koordinatlar
            originalWidth: rect.width, // Orijinal boyutları da sakla
            originalHeight: rect.height
        };

        clippings.push(clipData);
        addClipToLeftPanel(clipData);
    }
    
    isEditingClipId = null; // İşlem bitti, düzenleme modunu sıfırla
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
        <span class="clip-name">${clipData.name}</span>
    `;
    
    // YENİDEN KIRPMA (RE-CROP) İÇİN ÇİFT TIKLAMA OLAYI
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

// YENİDEN KIRPMA (RE-CROP) Ana Fonksiyonu
async function editClipping(clipId) {
    // Yarım kalan başka bir seçim varsa iptal et
    cancelActiveSelection();

    const clipData = clippings.find(c => c.id === clipId);
    if (!clipData) return;
    
    console.log(`Düzenleniyor: ${clipData.name}`);

    // 1. Düzenleme modunu global olarak ayarla
    isEditingClipId = clipId;
    
    // 2. Kaynak PDF sekmesine geç
    tabSourceBtn.click();
    
    // 3. Doğru sayfayı ve zoom'u ayarla (async/await ile render'ı bekle)
    // Zoom'u sıfırlamak, koordinatların tutarlı kalmasını sağlar
    currentSourceZoom = 1.5; 
    zoomLevelSourceSpan.textContent = `150%`;
    await renderPage(clipData.sourcePage);
    
    // 4. Render bittikten SONRA, eski seçim kutusunu ekrana getir
    // ve "aktif" hale getir
    makeSelectionBoxInteractive(clipData.sourceRect);
    
    // 5. Kullanıcının görebilmesi için o bölgeye scroll yap
    sourceScrollContainer.scrollTop = clipData.sourceRect.y - 50; // Biraz üstten
}


// --- 6. MİZANPAJ (SEKME 2) - SÜRÜKLE, BIRAK, ZOOM ---

// Sol paneldeki Kırpma Listesini SÜRÜKLENEBİLİR yap (Değişiklik yok)
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
            
            // Bırakılan yerin sahneye göre pozisyonunu al (sayfa kaydırması ve ZOOM'u hesaba kat)
            const dropX = (event.clientX - stageRect.left + layoutScrollContainer.scrollLeft) / currentLayoutZoom;
            const dropY = (event.clientY - stageRect.top + layoutScrollContainer.scrollTop) / currentLayoutZoom;

            createStageItem(clipId, dropX, dropY);
            
            // Bıraktıktan sonra otomatik olarak Mizanpaj sekmesine geç
            tabLayoutBtn.click();
        }
    });

// Sahneye bırakılan öğeyi oluşturan fonksiyon
function createStageItem(clipId, x, y) {
    const clipData = clippings.find(c => c.id === clipId);
    if (!clipData) return;
    if (document.getElementById(clipData.id + '-stage')) return; // Zaten sahnede

    const stageItem = document.createElement('div');
    stageItem.className = 'stage-item';
    stageItem.id = clipData.id + '-stage';
    
    // Başlangıç boyutunu ayarla (orantılı)
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
        modifiers: [
            interact.modifiers.restrictRect({
                restriction: 'parent'
            })
        ],
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
                x = (parseFloat(x) || 0);
                y = (parseFloat(y) || 0);

                event.target.style.width = event.rect.width + 'px';
                event.target.style.height = event.rect.height + 'px';
                
                // Zoom'u hesaba katarak pozisyonu düzelt
                x += event.deltaRect.left / currentLayoutZoom;
                y += event.deltaRect.top / currentLayoutZoom;

                event.target.style.transform = `translate(${x}px, ${y}px)`;
                event.target.dataset.x = x;
                event.target.dataset.y = y;
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

// (Bu bölümde bir değişiklik yok, önceki kodla aynı)
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

    doc.setFontSize(16);
    doc.text(title, 40, 40);

    stageItems.forEach(item => {
        const baseId = item.id.replace('-stage', '');
        const clipData = clippings.find(c => c.id === baseId);
        if (!clipData) return;

        // Son konumu (style + transform) al
        const x = parseFloat(item.style.left) + (parseFloat(item.dataset.x) || 0);
        const y = parseFloat(item.style.top) + (parseFloat(item.dataset.y) || 0);
        const width = parseFloat(item.style.width);
        const height = parseFloat(item.style.height);

        doc.setFontSize(8);
        doc.text(clipData.name, x, y - 5);
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
    const margin = 40;
    const usableWidth = pageWidth - margin * 2;
    let currentY = margin;

    doc.setFontSize(16);
    doc.text(title, margin, currentY);
    currentY += 30;

    clippings.forEach((clip, index) => {
        const ratio = usableWidth / clip.originalWidth;
        const scaledHeight = clip.originalHeight * ratio;
        const itemTotalHeight = scaledHeight + 20 + 15;

        if (currentY + itemTotalHeight > pageHeight - margin) {
            doc.addPage();
            currentY = margin;
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

// MOD 3: OTOMATİK DÜZEN - 2 SÜTUNLU
function generateAuto2ColPdf(title, orientation) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(orientation, 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const gutter = 20;
    const usableWidth = (pageWidth - margin * 2 - gutter) / 2;
    const col1_X = margin;
    const col2_X = margin + usableWidth + gutter;
    let colHeights = [margin, margin];

    doc.setFontSize(16);
    doc.text(title, margin, colHeights[0]);
    colHeights[0] += 30;
    colHeights[1] += 30;

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
                colHeights = [margin, margin]; // Yeni sayfa, Y'leri sıfırla
                targetCol = 0; // Soldan başla
            }
        }
        
        let targetX = (targetCol === 0) ? col1_X : col2_X;
        let currentY = colHeights[targetCol];

        doc.setFontSize(10);
        doc.text(clip.name, targetX, currentY);
        currentY += 20;

        doc.addImage(clip.imageData, 'JPEG', targetX, currentY, usableWidth, scaledHeight);
        colHeights[targetCol] = currentY + scaledHeight + 15;
    });
    doc.save(title.replace(/ /g, '_') + '.pdf');
}
