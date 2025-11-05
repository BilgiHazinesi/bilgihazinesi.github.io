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

// Sekme 1: Kaynak PDF Elemanları
const pdfContainer = document.getElementById('pdf-viewer-container');
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');
const selectionBox = document.getElementById('selection-box');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumSpan = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');

// Sekme 2: Mizanpaj Sahnesi Elemanları
const pageStage = document.getElementById('page-stage');

// Sol Panel: Kırpma Listesi
const selectionList = document.getElementById('selection-list');

// Sağ Panel: Ayarlar
const pageLayoutSelect = document.getElementById('page-layout');
const generatePdfBtn = document.getElementById('generate-pdf');
const pdfTitleInput = document.getElementById('pdf-title');

// Global Veri Depoları
let pdfDoc = null;
let currentPageNum = 1;
let isSelecting = false;
let selectionStart = {};
let clippings = []; // Tüm kırpma verilerini (isim, resim, boyut) tutan dizi

// --- 1. UYGULAMA BAŞLANGICI VE SEKMELER ---

// Dosya yüklendiğinde editör ekranını göster
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

// --- 2. PDF YÜKLEME VE GÖRÜNTÜLEME (SEKME 1) ---

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
        const renderContext = { canvasContext: ctx, viewport: viewport };
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

// --- 3. ALAN SEÇME VE SOL PANELE EKLEME (SEKME 1) ---

pdfContainer.addEventListener('mousedown', (e) => {
    const rect = pdfContainer.getBoundingClientRect(); // Konteynerin konumunu al
    const canvasRect = canvas.getBoundingClientRect();

    // Fare pozisyonunu, konteynerin kaydırma (scroll) durumunu ve tuvalin ofsetini hesaba katarak bul
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    isSelecting = true;
    selectionStart = { x: x, y: y };
    
    // Seçim kutusunun pozisyonunu, tuvalin konteyner içindeki ofsetine göre ayarla
    selectionBox.style.display = 'block';
    selectionBox.style.left = (canvas.offsetLeft + x) + 'px';
    selectionBox.style.top = (canvas.offsetTop + y) + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
});

pdfContainer.addEventListener('mousemove', (e) => {
    if (!isSelecting) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    const currentX = e.clientX - canvasRect.left;
    const currentY = e.clientY - canvasRect.top;

    const width = currentX - selectionStart.x;
    const height = currentY - selectionStart.y;
    
    const newLeft = (width > 0 ? selectionStart.x : currentX) + canvas.offsetLeft;
    const newTop = (height > 0 ? selectionStart.y : currentY) + canvas.offsetTop;

    selectionBox.style.left = newLeft + 'px';
    selectionBox.style.top = newTop + 'px';
    selectionBox.style.width = Math.abs(width) + 'px';
    selectionBox.style.height = Math.abs(height) + 'px';
});

pdfContainer.addEventListener('mouseup', (e) => {
    if (!isSelecting) return;
    isSelecting = false;
    selectionBox.style.display = 'none';

    const canvasRect = canvas.getBoundingClientRect();
    const endX = e.clientX - canvasRect.left;
    const endY = e.clientY - canvasRect.top;

    const x = Math.min(selectionStart.x, endX);
    const y = Math.min(selectionStart.y, endY);
    const width = Math.abs(endX - selectionStart.x);
    const height = Math.abs(endY - selectionStart.y);

    if (width < 10 || height < 10) return;

    const defaultName = `Soru ${clippings.length + 1}`;
    const clipName = prompt("Bu kırpmaya bir ad verin:", defaultName);
    
    if (clipName) {
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

    const clipData = {
        id: 'clip-' + Date.now(),
        name: name,
        imageData: imageData,
        width: width,
        height: height
    };

    clippings.push(clipData);
    addClipToLeftPanel(clipData);
}

function addClipToLeftPanel(clipData) {
    // Eğer varsa, "buraya eklenecek" yazısını kaldır
    const placeholder = selectionList.querySelector('p');
    if (placeholder) placeholder.remove();

    const li = document.createElement('li');
    li.className = 'clip-item';
    li.id = clipData.id;
    li.dataset.clipId = clipData.id;

    li.innerHTML = `
        <img src="${clipData.imageData}" alt="Önizleme" class="clip-thumbnail">
        <span class="clip-name">${clipData.name}</span>
    `;
    
    selectionList.appendChild(li);
}

// --- 4. SÜRÜKLE, BIRAK VE DÜZENLE (SEKME 2 & SOL PANEL) ---

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
            // Bırakılan yerin sahneye göre pozisyonunu al (sayfa kaydırmasını da hesaba kat)
            const dropX = event.clientX - stageRect.left + layoutView.scrollLeft;
            const dropY = event.clientY - stageRect.top + layoutView.scrollTop;

            createStageItem(clipId, dropX, dropY);
            
            // Bıraktıktan sonra otomatik olarak Mizanpaj sekmesine geç
            tabLayoutBtn.click();
        }
    });

// Sahneye bırakılan öğeyi oluşturan fonksiyon
function createStageItem(clipId, x, y) {
    const clipData = clippings.find(c => c.id === clipId);
    if (!clipData) return;

    // Bu öğe sahnede zaten var mı?
    if (document.getElementById(clipData.id + '-stage')) return;

    const stageItem = document.createElement('div');
    stageItem.className = 'stage-item';
    stageItem.id = clipData.id + '-stage';
    
    // Boyutu ayarla, ama çok büyükse başlangıçta küçült (max 300px genişlik)
    const initialWidth = clipData.width > 300 ? 300 : clipData.width;
    const initialHeight = clipData.height * (initialWidth / clipData.width);
    stageItem.style.width = initialWidth + 'px';
    stageItem.style.height = initialHeight + 'px';
    
    stageItem.style.position = 'absolute';
    stageItem.style.left = (x - initialWidth / 2) + 'px'; // Ortalayarak bırak
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
        edges: { left: false, right: true, bottom: true, top: false },
        // Sadece sağ-alt köşedeki tutamaçtan boyutlandırma
        restrictEdges: {
            outer: 'parent',
        },
        listeners: {
            move(event) {
                let { x, y } = event.target.dataset;
                x = (parseFloat(x) || 0);
                y = (parseFloat(y) || 0);

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

// --- 5. PDF OLUŞTURMA BUTONU (ANA DAĞITICI) ---

generatePdfBtn.addEventListener('click', () => {
    // 1. Ayarları al
    const title = pdfTitleInput.value || "Mizanpajım";
    const layoutMode = document.querySelector('input[name="layout-type"]:checked').value;
    const pageOrientation = (pageLayoutSelect.value === 'a4-landscape') ? 'l' : 'p';

    // 2. Kırpma listesi boş mu?
    if (clippings.length === 0) {
        alert("PDF oluşturmak için lütfen önce en az bir alan kırpın.");
        return;
    }

    // 3. Seçilen moda göre ilgili fonksiyonu çağır
    if (layoutMode === 'freeform') {
        // Serbest Düzen seçiliyse, sahne boş mu kontrol et
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


// --- 6. PDF OLUŞTURMA FONKSİYONLARI ---

/**
 * MOD 1: SERBEST DÜZEN (Mizanpaj Sahnesindekileri alır)
 */
function generateFreeformPdf(title, orientation) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(orientation, 'pt', 'a4');

    const stageItems = pageStage.querySelectorAll('.stage-item');

    // Başlığı ekle
    doc.setFontSize(16);
    doc.text(title, 40, 40);

    // Her sahne öğesini PDF'e ekle
    stageItems.forEach(item => {
        const baseId = item.id.replace('-stage', '');
        const clipData = clippings.find(c => c.id === baseId);
        if (!clipData) return;

        // Son konum ve boyutları al
        const x = parseFloat(item.style.left) + (parseFloat(item.dataset.x) || 0);
        const y = parseFloat(item.style.top) + (parseFloat(item.dataset.y) || 0);
        const width = parseFloat(item.style.width);
        const height = parseFloat(item.style.height);

        // İsmini ekle (resmin biraz üstüne)
        doc.setFontSize(8);
        doc.text(clipData.name, x, y - 5); // Resimden 5pt yukarıya
        
        doc.addImage(clipData.imageData, 'JPEG', x, y, width, height);
    });

    doc.save(title.replace(/ /g, '_') + '.pdf');
}


/**
 * MOD 2: OTOMATİK DÜZEN - ALT ALTA (Kırpma Listesindekileri alır)
 */
function generateAuto1ColPdf(title, orientation) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(orientation, 'pt', 'a4');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const usableWidth = pageWidth - margin * 2;
    let currentY = margin; // Dikey konum izleyici

    // Başlığı ekle
    doc.setFontSize(16);
    doc.text(title, margin, currentY);
    currentY += 30; // Başlık sonrası boşluk

    // TÜM Kırpmaları (clippings) gez
    clippings.forEach((clip, index) => {
        // Görüntüyü orantılı olarak ölçekle
        const ratio = usableWidth / clip.width;
        const scaledHeight = clip.height * ratio;
        
        const itemTotalHeight = scaledHeight + 20 + 15; // İsim (20) + Çizgi (15)

        // Sayfada yer kalmadıysa yeni sayfa aç
        if (currentY + itemTotalHeight > pageHeight - margin) {
            doc.addPage();
            currentY = margin; // Yeni sayfada Y'yi sıfırla
        }

        // Kırpma Adını (Soru 1 vb.) ekle
        doc.setFontSize(10);
        doc.text(clip.name, margin, currentY);
        currentY += 20;

        // Kırpılan Görüntüyü ekle
        doc.addImage(clip.imageData, 'JPEG', margin, currentY, usableWidth, scaledHeight);
        currentY += scaledHeight;

        // İsteğiniz üzerine: Ayırıcı Çizgi ekle (son öğe hariç)
        if (index < clippings.length - 1) {
            doc.setDrawColor(180, 180, 180); // Gri çizgi
            doc.line(margin, currentY + 10, pageWidth - margin, currentY + 10);
            currentY += 20; // Çizgi sonrası boşluk
        }
    });

    doc.save(title.replace(/ /g, '_') + '.pdf');
}


/**
 * MOD 3: OTOMATİK DÜZEN - 2 SÜTUNLU (Kırpma Listesindekileri alır)
 */
function generateAuto2ColPdf(title, orientation) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(orientation, 'pt', 'a4');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const gutter = 20; // Sütunlar arası boşluk
    
    const usableWidth = (pageWidth - margin * 2 - gutter) / 2; // Tek bir sütunun genişliği
    const col1_X = margin;
    const col2_X = margin + usableWidth + gutter;

    // Her iki sütunun da dikey konumunu ayrı ayrı takip et
    let colHeights = [margin, margin]; // [sol_Y, sag_Y]

    // Başlığı ekle (tam genişlik)
    doc.setFontSize(16);
    doc.text(title, margin, colHeights[0]);
    colHeights[0] += 30;
    colHeights[1] += 30;

    // TÜM Kırpmaları (clippings) gez
    clippings.forEach((clip, index) => {
        // Görüntüyü sütun genişliğine göre ölçekle
        const ratio = usableWidth / clip.width;
        const scaledHeight = clip.height * ratio;
        
        const itemTotalHeight = scaledHeight + 20 + 15; // İsim (20) + Boşluk (15)

        // Hangi sütun daha kısaysa oraya ekle
        let targetCol = (colHeights[0] <= colHeights[1]) ? 0 : 1; // 0 = sol, 1 = sağ
        let targetX = (targetCol === 0) ? col1_X : col2_X;
        
        // Sayfada yer kalmadıysa (her iki sütun için de)
        // Bu basit modelde, eğer herhangi biri sığmazsa yeni sayfa açılır
        if (colHeights[targetCol] + itemTotalHeight > pageHeight - margin) {
            // Eğer sığmayan yer sol sütunsa ve sağ sütun da doluysa
            // veya sığmayan yer sağ sütunsa, yeni sayfa aç.
            if (targetCol === 1 || (targetCol === 0 && colHeights[1] + itemTotalHeight > pageHeight - margin)) {
                doc.addPage();
                colHeights[0] = margin; // Y'leri sıfırla
                colHeights[1] = margin;
                targetCol = 0; // Yeni sayfada soldan başla
            } else {
                 // Sol sütun doldu ama sağda yer var, sağa geç
                 targetCol = 1;
            }
        }
        
        targetX = (targetCol === 0) ? col1_X : col2_X;
        let currentY = colHeights[targetCol];

        // Kırpma Adını ekle
        doc.setFontSize(10);
        doc.text(clip.name, targetX, currentY);
        currentY += 20;

        // Görüntüyü ekle
        doc.addImage(clip.imageData, 'JPEG', targetX, currentY, usableWidth, scaledHeight);
        
        // O sütunun Y yüksekliğini güncelle
        colHeights[targetCol] = currentY + scaledHeight + 15; // Boşluk
    });

    doc.save(title.replace(/ /g, '_') + '.pdf');
}
