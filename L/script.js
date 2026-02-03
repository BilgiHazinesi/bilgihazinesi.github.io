// --- ZEYNAL ÖĞRETMEN V78 (TAM FONKSİYONEL SÜRÜM) ---

const firebaseConfig = {
  apiKey: "AIzaSyAP9qwq7rGzgruRI0tDv9s9bUKl5GWOXqo",
  authDomain: "veri-8e938.firebaseapp.com",
  projectId: "veri-8e938",
  storageBucket: "veri-8e938.firebasestorage.app",
  messagingSenderId: "155483919432",
  appId: "1:155483919432:web:3fa53293603368c037347d"
};

// Firebase Güvenli Başlatma
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

// Değişkenler
let settings = { classTarget: 830, silverLimit: 4, goldLimit: 6 };
let students = []; let books = []; let bookPages = {}; let records = []; 
let studentPassObj = {}; let teacherPassword = "14531453";
let loginMode = 'teacher'; let currentTab = 'lend';

// SİSTEMİ BAŞLAT
window.onload = function() { startRealTimeSync(); };

function startRealTimeSync() {
    console.log("Veriler Firebase'den çekiliyor...");
    
    // 1. Ayarları Dinle
    db.collection("settings").doc("general").onSnapshot(doc => {
        if(doc.exists) { 
            settings = doc.data(); 
            teacherPassword = String(settings.password || "14531453");
            updateUI(); 
        }
    });

    // 2. Öğrencileri Dinle
    db.collection("students").onSnapshot(snap => {
        students = []; studentPassObj = {};
        snap.forEach(doc => { 
            students.push(doc.id); 
            studentPassObj[doc.id] = doc.data().password; 
        });
        populateDatalists();
    });

    // 3. Kitapları Dinle
    db.collection("books").onSnapshot(snap => {
        books = []; bookPages = {};
        snap.forEach(doc => { 
            books.push(doc.id); 
            bookPages[doc.id] = doc.data().pageCount; 
        });
    });

    // 4. Kayıtları Dinle (Can Damarı)
    db.collection("records").orderBy("timestamp", "desc").onSnapshot(snap => {
        records = [];
        snap.forEach(doc => { let d = doc.data(); d.id = doc.id; records.push(d); });
        document.getElementById('loader').style.display = 'none';
        updateUI();
    });
}

// SEKME GEÇİŞLERİ (TIKLANMA SORUNUNU ÇÖZER)
function switchTab(id, btn) {
    console.log("Sekme değiştirildi: " + id);
    // Tüm bölümleri gizle
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    // Seçilen bölümü göster
    const targetSection = document.getElementById('tab-' + id);
    if(targetSection) targetSection.style.display = 'block';
    
    // Navigasyon ikonlarını güncelle
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    // Verileri yenile
    if(id === 'stats') renderRanking();
    if(id === 'books') renderBookManager();
}

// ARAYÜZ GÜNCELLEME
function updateUI() {
    updateProgressBar();
    renderHistory();
}

function updateProgressBar() {
    let completed = records.filter(r => r.status === "İade Etti").length;
    let percent = Math.min(100, Math.floor((completed / settings.classTarget) * 100));
    const pBar = document.getElementById('progressBar');
    if(pBar) pBar.style.width = percent + "%";
    document.getElementById('progressPercent').innerText = percent + "%";
    document.getElementById('targetText').innerText = `${completed} / ${settings.classTarget} Kitap`;
}

function renderHistory() {
    const div = document.getElementById('historyList');
    if(!div) return;
    div.innerHTML = "";
    // Sadece henüz iade edilmemiş (Okuyor) olanları göster
    records.filter(r => r.status === "Okuyor").forEach(r => {
        div.innerHTML += `
            <div class="list-item" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); margin-bottom:10px; padding:12px; border-radius:10px;">
                <div>
                    <h4 style="margin:0; color:white;">${r.book}</h4>
                    <small style="color:#aaa;">${r.student}</small>
                </div>
                <button onclick="returnBook('${r.id}')" style="background:#f97316; color:white; border:none; padding:5px 10px; border-radius:8px; cursor:pointer;">İade Al</button>
            </div>`;
    });
}

// Kitap Teslim Etme
function lendBook() {
    const s = document.getElementById('studentInput').value.trim().toUpperCase();
    const b = document.getElementById('bookInput').value.trim();
    if(!s || !b) return alert("Lütfen öğrenci ve kitap seçiniz.");

    db.collection("records").add({
        student: s,
        book: b,
        status: "Okuyor",
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        date: new Date().toLocaleDateString('tr-TR') + " " + new Date().toLocaleTimeString('tr-TR')
    }).then(() => {
        document.getElementById('bookInput').value = "";
        alert("Kitap teslim edildi!");
    });
}
