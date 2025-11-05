// Global Değişkenler ve DOM Elementleri
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const fileInput = document.getElementById('file-input');
const uploadScreen = document.getElementById('upload-screen');
const editorScreen = document.getElementById('editor-screen');
const pdfContainer = document.getElementById('pdf-viewer-container');
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');
const selectionBox = document.getElementById('selection-box');
const selectionList = document.getElementById('selection-list');
const selectionListPlaceholder = document.getElementById('selection-list-placeholder');
const pageStage = document.getElementById('page-stage');

// PDF Kontrolleri
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumSpan = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');

// Sağ Panel Kontrolleri
const pageLayoutSelect = document.getElementById('page-layout');
const generatePdfBtn = document.getElementById('generate-pdf');

// Global Veri Depoları
let pdfDoc = null;
let currentPageNum = 1;
let isSelecting = false;
let selectionStart = {};
let clippings = []; // Tüm kırpma verilerini (isim, resim, boyut) tutan dizi

// --- 1. PDF YÜKLEME VE GÖRÜNTÜLEME ---

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        alert("Lütfen bir PDF dosyası seçin.");
        return;
    }
    uploadScreen.classList.add('hidden');
    editorScreen.classList.remove('hidden');
    
    loadPdf(file);
});

function loadPdf(file) {
    const fileReader = new FileReader();
    fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            pdfDoc = pdf;
            pageCountSpan.textContent = pdf.numPages;
            renderPage(currentPageNum);
        });
    };
    fileReader.readAsArrayBuffer(file);
}

function renderPage(num) {
    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        page.render(renderContext);
        pageNumSpan.textContent = num;
        currentPageNum = num;
    });
}

// Sayfa Navigasyon Butonları
prevPageBtn.addEventListener('click', () => {
    if (currentPageNum <= 1) return;
    renderPage(--currentPageNum);
});
nextPageBtn.addEventListener('click', () => {
    if (currentPageNum >= pdfDoc.numPages) return;
    renderPage(++currentPageNum);
});

// --- 2. ALAN SEÇME VE KIRPMA LİSTESİNE EKLEME ---

// Fare ile seçim mekanizması (mousedown, mousemove, mouseup)
pdfContainer.addEventListener('mousedown', (e) => {
    // Canvas'ın sol üst köşesine göre konum
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isSelecting = true;
    selectionStart = { x: x, y: y };
    
    selectionBox.style.display = 'block';
    selectionBox.style.left = x + 'px';
    selectionBox.style.top = y + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
});

pdfContainer.addEventListener('mousemove', (e) => {
    if (!isSelecting) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const width = currentX - selectionStart.x;
    const height = currentY - selectionStart.y;

    selectionBox.style.left = (width > 0 ? selectionStart.x : currentX) + 'px';
    selectionBox.style.top = (height > 0 ? selectionStart.y : currentY) + 'px';
    selectionBox.style.width = Math.abs(width) + 'px';
    selectionBox.style.height = Math.abs(height) + 'px';
});

pdfContainer.addEventListener('mouseup', (e) => {
    if (!isSelecting) return;
    isSelecting = false;
    selectionBox.style.display = 'none';

    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    const x = Math.min(selectionStart.x, endX);
    const y = Math.min(selectionStart.y, endY);
    const width = Math.abs(endX - selectionStart.x);
    const height = Math.abs(endY - selectionStart.y);

    if (width < 10 || height < 10) return; // Çok küçük seçimi yoksay

    // İSİM SORMA İŞLEVİ (SİZİN İSTEĞİNİZ)
    const defaultName = `Soru ${clippings.length + 1}`;
    const clipName = prompt("Bu kırpmaya bir ad verin:", defaultName);
    
    if (clipName) { // Eğer kullanıcı 'İptal' demezse
        captureSelection(clipName, x, y, width, height);
    }
});

function captureSelection(name, x, y, width, height) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
    const imageData = tempCanvas.toDataURL('image/jpeg', 0.9);

    // Kırpma verisini oluştur
    const clipData = {
        id: 'clip-' + Date.now(),
        name: name,
        imageData: imageData,
        width: width,
        height: height
    };

    // Global dizide sakla
    clippings.push(clipData);
    
    // Sol paneldeki listeye ekle
    addClipToLeftPanel(clipData);
}

function addClipToLeftPanel(clipData) {
    // Eğer varsa, "buraya eklenecek" yazısını kaldır
    if (selectionListPlaceholder) {
        selectionListPlaceholder.remove();
    }

    const li = document.createElement('li');
    li.className = 'clip-item';
    li.id = clipData.id;
    // interact.js'nin bu öğeyi bulup data alması için dataset kullanıyoruz
    li.dataset.clipId = clipData.id;

    li.innerHTML = `
        <img src="${clipData.imageData}" alt="Önizleme" class="clip-thumbnail">
        <span class="clip-name">${clipData.name}</span>
    `;
    
    selectionList.appendChild(li);
}

// --- 3. SÜRÜKLE, BIRAK VE YENİDEN BOYUTLANDIR (INTERACT.JS) ---

// Sol paneldeki Kırpma Listesini SÜRÜKLENEBİLİR yap
interact('.clip-item')
    .draggable({
        inertia: true,
        autoScroll: true,
        listeners: {
            // Sürükleme başladığında öğeyi görsel olarak hareket ettir
            move(event) {
                const target = event.target;
                const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                target.style.transform = `translate(${x}px, ${y}px)`;
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);
            },
            // Sürükleme bittiğinde öğeyi eski yerine döndür
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
        accept: '.clip-item', // Sadece bu sınıftaki öğeler bırakılabilir
        ondrop: function (event) {
            const draggableElement = event.relatedTarget; // Sürüklenen <li>
            const clipId = draggableElement.dataset.clipId;
            
            // Sahnenin sol üst köşesine göre bırakma koordinatları
            const stageRect = pageStage.getBoundingClientRect();
            const dropX = event.clientX - stageRect.left;
            const dropY = event.clientY - stageRect.top;

            createStageItem(clipId, dropX, dropY);
        }
    });

// Sahneye bırakılan öğeyi oluşturan fonksiyon
function createStageItem(clipId, x, y) {
    // Kırpma verisini global diziden bul
    const clipData = clippings.find(c => c.id === clipId);
    if (!clipData) return;

    const stageItem = document.createElement('div');
    stageItem.className = 'stage-item';
    stageItem.id = clipData.id + '-stage'; // Sahne kopyası için benzersiz ID
    stageItem.style.width = (clipData.width > 300 ? 300 : clipData.width) + 'px'; // Başlangıç boyutu (çok büyükse küçült)
    
    // Bırakıldığı yere konumlandır
    stageItem.style.position = 'absolute';
    stageItem.style.left = x + 'px';
    stageItem.style.top = y + 'px';
    stageItem.style.transform = `translate(0px, 0px)`; // interact.js için başlangıç
    stageItem.setAttribute('data-x', 0);
    stageItem.setAttribute('data-y', 0);

    // İçine resmi koy
    stageItem.innerHTML = `<img src="${clipData.imageData}" style="width: 100%; height: 100%;">`;
    
    pageStage.appendChild(stageItem);
}

// Sahne üzerindeki öğeleri TAŞINABİLİR ve YENİDEN BOYUTLANDIRILABİLİR yap
interact('.stage-item')
    .draggable({
        inertia: true,
        modifiers: [
            interact.modifiers.restrictRect({
                restriction: 'parent' // Sadece 'page-stage' içinde hareket etsin
            })
        ],
        listeners: {
            move(event) {
                const target = event.target;
                const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                
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
                let { x, y } = event.target.dataset;
                x = (parseFloat(x) || 0);
                y = (parseFloat(y) || 0);

                // Boyutu güncelle
                event.target.style.width = event.rect.width + 'px';
                event.target.style.height = event.rect.height + 'px';

                // Yeniden boyutlandırmadan kaynaklanan pozisyon kaymasını düzelt
                x += event.deltaRect.left;
                y += event.deltaRect.top;

                event.target.style.transform = `translate(${x}px, ${y}px)`;
                event.target.dataset.x = x;
                event.target.dataset.y = y;
            }
        }
    });

// --- 4. AYARLAR VE FİNAL PDF OLUŞTURMA (BİR SONRAKİ ADIM) ---

// Sağ panel - Sayfa Yönü değiştirme
pageLayoutSelect.addEventListener('change', (e) => {
    if (e.target.value === 'a4-landscape') {
        pageStage.classList.remove('a4-portrait');
        pageStage.classList.add('a4-landscape');
    } else {
        pageStage.classList.remove('a4-landscape');
        pageStage.classList.add('a4-portrait');
    }
});

// PDF Oluşturma Butonu (Henüz işlev atanmadı, bu bir sonraki adımdır)
generatePdfBtn.addEventListener('click', () => {
    alert("PDF oluşturma işlevi bir sonraki adımda eklenecek.");
    
    // BİR SONRAKİ ADIMDA:
    // 1. Sağ paneldeki 'Başlık' ve 'Sayfa Yönü' ayarlarını alacağız.
    // 2. 'page-stage' içindeki TÜM '.stage-item' öğelerini gezeceğiz.
    // 3. Her öğenin son 'transform' (konum) ve 'style' (boyut) değerlerini okuyacağız.
    // 4. Bu bilgilere göre jsPDF ile PDF'i oluşturacağız.
});
