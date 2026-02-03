// --- ZEYNAL ÖĞRETMEN V79 (SEKME VE İÇERİK AKTİF) ---

const firebaseConfig = {
  apiKey: "AIzaSyAP9qwq7rGzgruRI0tDv9s9bUKl5GWOXqo",
  authDomain: "veri-8e938.firebaseapp.com",
  projectId: "veri-8e938",
  storageBucket: "veri-8e938.firebasestorage.app",
  messagingSenderId: "155483919432",
  appId: "1:155483919432:web:3fa53293603368c037347d"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

let settings = { classTarget: 830 };
let studentPassObj = {}; let records = []; let students = []; let books = [];
let isDataLoaded = false; let loginMode = 'teacher';

window.onload = function() { startRealTimeSync(); };

function startRealTimeSync() {
    db.collection("students").onSnapshot(snap => {
        studentPassObj = {}; students = [];
        snap.forEach(doc => { studentPassObj[doc.id] = doc.data().password; students.push(doc.id); });
        populateDatalists();
    });

    db.collection("books").onSnapshot(snap => {
        books = []; snap.forEach(doc => books.push(doc.id));
        populateDatalists();
    });

    db.collection("records").orderBy("timestamp", "desc").onSnapshot(snap => {
        records = []; snap.forEach(doc => { let d = doc.data(); d.id = doc.id; records.push(d); });
        isDataLoaded = true;
        document.getElementById('loader').innerText = "Bağlı ✅";
        updateUI();
    });
}

// SEKME GEÇİŞİ (BU FONKSİYON TIKLANMAYI SAĞLAR)
function switchTab(id, btn) {
    // 1. Tüm bölümleri gizle
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    // 2. Tıklanan bölümü göster
    document.getElementById('tab-' + id).style.display = 'block';
    // 3. Menü ikonlarını güncelle
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(btn) btn.classList.add('active');
}

function login() {
    const input = document.getElementById('appPassword').value;
    if(input === "14531453") {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        document.getElementById('teacherContainer').style.display = 'block';
        document.getElementById('teacherNav').style.display = 'flex';
        updateUI();
    } else { alert("Şifre Hatalı!"); }
}

function updateUI() {
    renderHistory();
    let completed = records.filter(r => r.status === "İade Etti").length;
    let percent = Math.floor((completed / settings.classTarget) * 100);
    document.getElementById('progressBar').style.width = percent + "%";
    document.getElementById('targetText').innerText = `${completed} / 830 Kitap`;
}

function renderHistory() {
    const div = document.getElementById('historyList');
    div.innerHTML = "";
    records.filter(r => r.status === "Okuyor").slice(0, 10).forEach(r => {
        div.innerHTML += `<div class="list-item" style="padding:10px; border-bottom:1px solid #eee;">
            <strong>${r.book}</strong><br><small>${r.student}</small>
        </div>`;
    });
}

function populateDatalists() {
    let sl = document.getElementById('studentList');
    sl.innerHTML = students.map(s => `<option value="${s}">`).join("");
    let bl = document.getElementById('bookList');
    bl.innerHTML = books.map(b => `<option value="${b}">`).join("");
}
