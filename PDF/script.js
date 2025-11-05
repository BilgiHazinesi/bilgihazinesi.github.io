// Başlangıçta sadece Yükleme ve Editör ekranlarını yönetelim.
// Kalan tüm mantık (pdf.js, jsPDF, interact.js) bir sonraki adımda eklenecek.

const fileInput = document.getElementById('file-input');
const uploadScreen = document.getElementById('upload-screen');
const editorScreen = document.getElementById('editor-screen');

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        alert("Lütfen bir PDF dosyası seçin.");
        return;
    }

    // Ekranları değiştir
    uploadScreen.classList.add('hidden');
    editorScreen.classList.remove('hidden');

    // BİR SONRAKİ ADIM:
    // PDF YÜKLEME MANTIĞINI BURAYA ÇAĞIRACAĞIZ
    // (Eski kodumuzdaki pdf.js yükleyicisini buraya taşıyacağız)
});

// Ayarlar panelindeki Dikey/Yatay değişimini dinle
document.getElementById('page-layout').addEventListener('change', (e) => {
    const pageStage = document.getElementById('page-stage');
    if (e.target.value === 'a4-landscape') {
        pageStage.classList.remove('a4-portrait');
        pageStage.classList.add('a4-landscape');
    } else {
        pageStage.classList.remove('a4-landscape');
        pageStage.classList.add('a4-portrait');
    }
});
