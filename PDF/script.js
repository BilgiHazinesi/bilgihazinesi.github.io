// ÖNEMLİ: pdf.js'nin "worker" dosyasının yerini belirtmeliyiz.
// Bu, PDF'i arka planda işlemek için gereklidir.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// Global Değişkenler
const fileInput = document.getElementById('file-input');
const pdfContainer = document.getElementById('pdf-container');
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');
const selectionBox = document.getElementById('selection-box');
const generateBtn = document.getElementById('generate-pdf');
const selectionCountSpan = document.getElementById('selection-count');

let pdfDoc = null; // Yüklenen PDF dokümanını tutar
let pageNum = 1;   // O an görüntülenen sayfa
let isSelecting = false; // Kullanıcı şu an seçim yapıyor mu?
let selectionStart = {}; // Seçimin başladığı {x, y} koordinatları
let selections = [];     // Yakalanan tüm alanların resim verilerini tutan dizi

// 1. Dosya Yüklendiğinde
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file.type !== 'application/pdf') {
        alert("Lütfen bir PDF dosyası yükleyin.");
        return;
    }
    
    // Seçimleri sıfırla
    selections = [];
    updateSelectionCount();

    // PDF'i yükle
    const fileReader = new FileReader();
    fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            pdfDoc = pdf;
            document.getElementById('page-count').textContent = pdf.numPages;
            renderPage(pageNum);
        });
    };
    fileReader.readAsArrayBuffer(file);
});

// 2. Belirli Bir Sayfayı Çizme (Render) Fonksiyonu
function renderPage(num) {
    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale: 1.5 }); // PDF'i %150 büyüt
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        page.render(renderContext);
        
        document.getElementById('page-num').textContent = num;
    });
}

// 3. Seçim Mekanizması (Farenin 3 durumu: basma, hareket, bırakma)

// Fareye basıldığında: Seçimi başlat
pdfContainer.addEventListener('mousedown', (e) => {
    isSelecting = true;
    // 'e.offsetX' tuval üzerindeki X koordinatını verir
    selectionStart = { x: e.offsetX, y: e.offsetY };
    
    // Seçim kutusunu göster ve başlangıç pozisyonunu ayarla
    selectionBox.style.display = 'block';
    selectionBox.style.left = e.offsetX + 'px';
    selectionBox.style.top = e.offsetY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
});

// Fare hareket ettiğinde: Seçim kutusunu yeniden boyutlandır
pdfContainer.addEventListener('mousemove', (e) => {
    if (!isSelecting) return;

    const currentX = e.offsetX;
    const currentY = e.offsetY;

    // Başlangıca göre genişlik ve yüksekliği hesapla
    const width = currentX - selectionStart.x;
    const height = currentY - selectionStart.y;

    // CSS'in negatif genişlik/yükseklikle başa çıkması için
    selectionBox.style.left = (width > 0 ? selectionStart.x : currentX) + 'px';
    selectionBox.style.top = (height > 0 ? selectionStart.y : currentY) + 'px';
    selectionBox.style.width = Math.abs(width) + 'px';
    selectionBox.style.height = Math.abs(height) + 'px';
});

// Fare bırakıldığında: Seçimi yakala
pdfContainer.addEventListener('mouseup', (e) => {
    if (!isSelecting) return;
    isSelecting = false;
    selectionBox.style.display = 'none'; // Seçim kutusunu gizle

    const endX = e.offsetX;
    const endY = e.offsetY;

    // Gerçek koordinatları ve boyutları hesapla
    const x = Math.min(selectionStart.x, endX);
    const y = Math.min(selectionStart.y, endY);
    const width = Math.abs(endX - selectionStart.x);
    const height = Math.abs(endY - selectionStart.y);

    // Eğer çok küçük bir alanı seçtiyse (sadece tıkladıysa) dikkate alma
    if (width < 10 || height < 10) return;

    // Fonksiyonu çağır: Bu alanı yakala
    captureSelection(x, y, width, height);
});

// 4. Seçilen Alanı "Kırpma" ve Diziye Ekleme
function captureSelection(x, y, width, height) {
    // Yeni bir geçici tuval oluştur
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    // Ana tuvalin (pdf-canvas) seçilen bölgesini geçici tuvale çiz
    // drawImage(kaynak, kaynakX, kaynakY, kaynakGenişlik, kaynakYükseklik, hedefX, hedefY, hedefGenişlik, hedefYükseklik)
    tempCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

    // Geçici tuvalin resim verisini (Data URL) al
    // JPEG kullanmak, PNG'ye göre daha küçük dosya boyutu sağlar
    const imageData = tempCanvas.toDataURL('image/jpeg', 0.9);
    
    // Bu resim verisini 'selections' dizimize ekle
    selections.push({
        imageData: imageData,
        width: width,
        height: height
    });
    
    updateSelectionCount();
    console.log("Seçim eklendi. Toplam:", selections.length);
}

// 5. Yeni PDF Oluşturma Butonu
generateBtn.addEventListener('click', () => {
    if (selections.length === 0) {
        alert("Hiç alan seçmediniz!");
        return;
    }

    // jsPDF'i başlat
    const { jsPDF } = window.jspdf;
    // A4 boyutu (pt biriminde: 595 x 842)
    const doc = new jsPDF('p', 'pt', 'a4');
    
    const margin = 20;
    const a4Width = 595 - margin * 2;
    const a4Height = 842 - margin * 2;
    let currentY = margin; // Sayfadaki dikey konumumuz

    selections.forEach((selection, index) => {
        // Seçilen resmin boyutlarını A4'e sığacak şekilde ayarla
        let imgWidth = selection.width;
        let imgHeight = selection.height;

        // Eğer resim genişliği A4'ten büyükse, orantılı olarak küçült
        if (imgWidth > a4Width) {
            const ratio = a4Width / imgWidth;
            imgWidth = a4Width;
            imgHeight = imgHeight * ratio;
        }

        // Metin (Numara) için yer ayır
        const textHeight = 20;
        
        // Eğer resim ve metin mevcut sayfaya sığmıyorsa, yeni sayfa aç
        if (currentY + imgHeight + textHeight > a4Height) {
            doc.addPage();
            currentY = margin; // Yeni sayfada konumu sıfırla
        }

        // Numarayı ekle (örn: "1.", "2.")
        doc.setFontSize(12);
        doc.text(`${index + 1}. Seçim:`, margin, currentY);
        currentY += textHeight;

        // Resmi ekle
        doc.addImage(selection.imageData, 'JPEG', margin, currentY, imgWidth, imgHeight);
        
        currentY += imgHeight + 20; // Resimden sonra 20 birim boşluk bırak
    });

    // PDF'i kaydet
    doc.save('sectiklerim.pdf');
});

// 6. Sayfa Navigasyon Butonları
document.getElementById('prev-page').addEventListener('click', () => {
    if (pageNum <= 1) return;
    pageNum--;
    renderPage(pageNum);
});

document.getElementById('next-page').addEventListener('click', () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    renderPage(pageNum);
});

// Seçim sayacı güncelleme
function updateSelectionCount() {
    selectionCountSpan.textContent = selections.length;
}
