// --- ZEYNAL ÖĞRETMEN V75 (TAM GÖRSEL SÜRÜM - FIREBASE) ---

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

// Global Değişkenler
let settings = { classTarget: 830, silverLimit: 4, goldLimit: 6 };
let students = []; let books = []; let bookPages = {}; let records = []; 
let studentPassObj = {}; let teacherPassword = "14531453";
let loginMode = 'teacher'; let isDataLoaded = false;
let statsSortMode = 'book_desc';

const RANKS = [
    {c:0, t:"🌱 Başlangıç"}, {c:5, t:"🥉 Okuma Çırağı"}, {c:10, t:"📖 Kitap Kurdu"},
    {c:15, t:"🚀 Bilgi Kaşifi"}, {c:20, t:"🏹 Kelime Avcısı"}, {c:25, t:"👑 Kütüphane Muhafızı"},
    {c:30, t:"🎩 Edebiyat Ustası"}, {c:35, t:"🌍 Bilge Okur"}, {c:40, t:"💎 EFSANE"}
];

window.onload = function() { startRealTimeSync(); };

function startRealTimeSync() {
    db.collection("settings").doc("general").onSnapshot(doc => {
        if(doc.exists) { settings = doc.data(); teacherPassword = String(settings.password); updateUI(); }
    });

    db.collection("students").onSnapshot(snap => {
        students = []; studentPassObj = {};
        snap.forEach(doc => { students.push(doc.id); studentPassObj[doc.id] = doc.data().password; });
        populateDatalists();
    });

    db.collection("books").onSnapshot(snap => {
        books = []; bookPages = {};
        snap.forEach(doc => { books.push(doc.id); bookPages[doc.id] = doc.data().pageCount; });
    });

    db.collection("records").orderBy("timestamp", "desc").onSnapshot(snap => {
        records = [];
        snap.forEach(doc => { let d = doc.data(); d.id = doc.id; records.push(d); });
        isDataLoaded = true;
        document.getElementById('loader').style.display = "none";
        updateUI();
    });
}

// --- ARAYÜZÜ ESKİ HALİNE GETİREN RENDER FONKSİYONLARI ---

function updateUI() {
    renderHistory(); //
    updateProgressBar(); //
    renderRanking(); //
}

function renderHistory() {
    const div = document.getElementById('historyList');
    div.innerHTML = "";
    records.filter(r => r.status === "Okuyor").slice(0, 15).forEach(r => {
        div.innerHTML += `
            <div class="list-item" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); margin-bottom:10px; padding:15px; border-radius:12px;">
                <div class="item-content">
                    <h4 style="margin:0; color:#fff;">${r.book}</h4>
                    <p style="margin:5px 0 0 0; font-size:0.85rem; color:#aaa;">${r.student} • ${r.date || ''}</p>
                </div>
                <button class="btn-return" onclick="returnBook('${r.id}')" style="background:#f97316; color:white; border:none; padding:8px 15px; border-radius:10px; cursor:pointer; font-weight:bold;">İade Al</button>
            </div>`;
    });
}

function renderRanking() {
    const div = document.getElementById('rankingList');
    if(!div) return;
    
    let counts = {};
    records.filter(r => r.status === "İade Etti").forEach(r => {
        counts[r.student] = (counts[r.student] || 0) + 1;
    });

    let sorted = Object.keys(counts).map(k => ({n:k, c:counts[k]})).sort((a,b) => b.c - a.c);
    
    div.innerHTML = "";
    sorted.forEach((s, i) => {
        let rank = getRank(s.c);
        div.innerHTML += `
            <div class="list-item" style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom:1px solid rgba(255,255,255,0.1);">
                <div>
                    <span style="font-weight:bold; color:#aaa; margin-right:10px;">${i+1}.</span>
                    <span style="font-weight:bold; color:#fff;">${s.n}</span>
                    <div style="font-size:0.75rem; color:#3b82f6; font-weight:bold;">${rank}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:bold; color:#3b82f6; font-size:1.1rem;">${s.c} Kitap</div>
                </div>
            </div>`;
    });
}

function updateProgressBar() {
    let completed = records.filter(r => r.status === "İade Etti").length;
    let percent = Math.min(100, Math.floor((completed / settings.classTarget) * 100));
    document.getElementById('progressBar').style.width = percent + "%";
    document.getElementById('progressPercent').innerText = percent + "%";
    document.getElementById('targetText').innerText = `${completed} / ${settings.classTarget} Kitap`;
}

// YARDIMCI FONKSİYONLAR
function getRank(count) {
    let r = RANKS[0].t;
    for(let i=0; i<RANKS.length; i++) { if(count >= RANKS[i].c) r = RANKS[i].t; }
    return r;
}

function returnBook(id) {
    if(confirm("Kitap iade edilsin mi?")) {
        db.collection("records").doc(id).update({
            status: "İade Etti",
            returnDate: new Date().toLocaleDateString('tr-TR')
        });
    }
}

function lendBook() {
    const s = document.getElementById('studentInput').value.trim().toUpperCase();
    const b = document.getElementById('bookInput').value.trim();
    if(!s || !b) return alert("Eksik bilgi!");

    db.collection("records").add({
        student: s,
        book: b,
        status: "Okuyor",
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        date: new Date().toLocaleDateString('tr-TR')
    }).then(() => {
        document.getElementById('bookInput').value = "";
    });
}
