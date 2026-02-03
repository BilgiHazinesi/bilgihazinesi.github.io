// --- ZEYNAL ÖĞRETMEN V81 (GÜVENLİ & DATABASE KONTROLLÜ) ---

const firebaseConfig = {
  apiKey: "AIzaSyAP9qwq7rGzgruRI0tDv9s9bUKl5GWOXqo",
  authDomain: "veri-8e938.firebaseapp.com",
  projectId: "veri-8e938",
  storageBucket: "veri-8e938.firebasestorage.app",
  messagingSenderId: "155483919432",
  appId: "1:155483919432:web:3fa53293603368c037347d"
};

// Firebase Başlatma
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

// DEĞİŞKENLER (Şifre burada YOK)
let settings = null; // Başlangıçta boş
let students = []; 
let books = []; 
let records = []; 
let studentPassObj = {}; 
let isDataLoaded = false;

// Rütbeler
const RANKS = [
    {c:0, t:"🌱 Başlangıç"}, {c:5, t:"🥉 Okuma Çırağı"}, {c:10, t:"📖 Kitap Kurdu"},
    {c:20, t:"🏹 Kelime Avcısı"}, {c:40, t:"💎 EFSANE"}
];

window.onload = function() { startRealTimeSync(); };

function startRealTimeSync() {
    console.log("Veritabanı bağlantısı kuruluyor...");

    // 1. AYARLAR VE ŞİFREYİ ÇEK (Şifre sadece burada, gizli gelir)
    db.collection("settings").doc("general").onSnapshot(doc => {
        if(doc.exists) { 
            settings = doc.data(); 
            console.log("Güvenlik ayarları yüklendi.");
        }
    });

    // 2. ÖĞRENCİLERİ ÇEK
    db.collection("students").onSnapshot(snap => {
        students = []; studentPassObj = {};
        snap.forEach(doc => { 
            students.push(doc.id); 
            studentPassObj[doc.id] = doc.data().password; 
        });
        populateDatalists();
    });

    // 3. KİTAPLARI ÇEK
    db.collection("books").onSnapshot(snap => {
        books = []; 
        snap.forEach(doc => { books.push(doc.id); });
        if(document.getElementById('bookManagerList')) renderBookManager();
    });

    // 4. KAYITLARI ÇEK
    db.collection("records").orderBy("timestamp", "desc").onSnapshot(snap => {
        records = [];
        snap.forEach(doc => { let d = doc.data(); d.id = doc.id; records.push(d); });
        
        isDataLoaded = true;
        // Yükleme ekranını kapat
        const loader = document.getElementById('loader');
        if(loader) loader.style.display = 'none';
        
        updateUI();
    });
}

// --- GİRİŞ FONKSİYONU (KRİTİK GÜNCELLEME) ---
function login() {
    // Veritabanı henüz yüklenmediyse bekle
    if (settings === null) {
        alert("Veritabanı bağlantısı bekleniyor, lütfen 2 saniye sonra tekrar deneyin.");
        return;
    }

    const inputPass = document.getElementById('appPassword').value.trim();
    
    // BURADA ŞİFREYİ VERİTABANINDAN GELEN 'settings.password' İLE KIYASLIYORUZ
    // Kodun içinde şifre yok.
    if (String(inputPass) === String(settings.password)) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        document.getElementById('teacherContainer').style.display = 'block';
        document.getElementById('teacherNav').style.display = 'flex';
        updateUI();
    } else {
        alert("Hatalı Şifre! (Veritabanı ile eşleşmedi)");
    }
}

// --- DİĞER FONKSİYONLAR ---

function switchTab(id, btn) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById('tab-' + id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    if(id === 'stats') renderRanking();
    if(id === 'books') renderBookManager();
}

function updateUI() {
    updateProgressBar();
    renderHistory();
}

function updateProgressBar() {
    if(!settings) return;
    let completed = records.filter(r => r.status === "İade Etti").length;
    let percent = Math.floor((completed / settings.classTarget) * 100);
    const pBar = document.getElementById('progressBar');
    if(pBar) pBar.style.width = percent + "%";
    const tText = document.getElementById('targetText');
    if(tText) tText.innerText = `${completed} / ${settings.classTarget}`;
}

function renderHistory() {
    const div = document.getElementById('historyList');
    if(!div) return;
    div.innerHTML = "";
    
    let activeList = records.filter(r => r.status === "Okuyor");
    if(activeList.length === 0) {
        div.innerHTML = "<p style='color:#666; text-align:center; padding:10px;'>Şu an kimse kitap okumuyor.</p>";
        return;
    }

    activeList.forEach(r => {
        div.innerHTML += `
            <div class="list-item" style="display:flex; justify-content:space-between; align-items:center; background:#1e1e1e; margin-bottom:8px; padding:12px; border-radius:8px;">
                <div><strong style="color:#fff;">${r.book}</strong><br><small style="color:#aaa;">${r.student}</small></div>
                <button onclick="returnBook('${r.id}')" style="background:#f97316; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">İade Al</button>
            </div>`;
    });
}

function renderRanking() {
    const div = document.getElementById('rankingList');
    if(!div) return;
    let counts = {};
    records.filter(r => r.status === "İade Etti").forEach(r => { counts[r.student] = (counts[r.student] || 0) + 1; });
    let sorted = Object.keys(counts).map(k => ({n:k, c:counts[k]})).sort((a,b) => b.c - a.c);
    div.innerHTML = "";
    sorted.forEach((s, i) => {
        let rank = getRank(s.c);
        div.innerHTML += `
            <div class="list-item" style="display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid #333;">
                <div><span style="color:#facc15; margin-right:10px;">${i+1}.</span><span style="color:#fff; font-weight:bold;">${s.n}</span><div style="font-size:0.8rem; color:#3b82f6;">${rank}</div></div>
                <div style="color:#fff; font-weight:bold;">${s.c} 📚</div>
            </div>`;
    });
}

function renderBookManager() {
    const div = document.getElementById('bookManagerList');
    if(!div) return;
    div.innerHTML = "";
    books.sort().forEach(b => {
        div.innerHTML += `<div class="list-item" style="padding:10px; border-bottom:1px solid #333; color:#ccc;">${b}</div>`;
    });
}

function lendBook() {
    const s = document.getElementById('studentInput').value.trim().toUpperCase();
    const b = document.getElementById('bookInput').value.trim();
    if(!s || !b) return alert("Eksik bilgi.");
    db.collection("records").add({
        student: s, book: b, status: "Okuyor",
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        date: new Date().toLocaleDateString('tr-TR')
    }).then(() => {
        document.getElementById('bookInput').value = "";
        alert("Kitap verildi.");
        updateUI();
    });
}

function returnBook(id) {
    if(confirm("İade alınıyor mu?")) {
        db.collection("records").doc(id).update({
            status: "İade Etti", returnDate: new Date().toLocaleDateString('tr-TR')
        });
    }
}

function getRank(count) {
    let r = RANKS[0].t;
    for(let i=0; i<RANKS.length; i++) { if(count >= RANKS[i].c) r = RANKS[i].t; }
    return r;
}

function populateDatalists() {
    const sl = document.getElementById('studentList');
    if(sl) sl.innerHTML = students.map(s => `<option value="${s}">`).join("");
    const bl = document.getElementById('bookList');
    if(bl) bl.innerHTML = books.map(b => `<option value="${b}">`).join("");
}
