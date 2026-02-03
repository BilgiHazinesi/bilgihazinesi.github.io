// --- ZEYNAL ÖĞRETMEN V70 (FIREBASE REAL-TIME EDITION) ---

// 1. FIREBASE YAPILANDIRMASI
const firebaseConfig = {
  apiKey: "AIzaSyAP9qwq7rGzgruRI0tDv9s9bUKl5GWOXqo",
  authDomain: "veri-8e938.firebaseapp.com",
  projectId: "veri-8e938",
  storageBucket: "veri-8e938.firebasestorage.app",
  messagingSenderId: "155483919432",
  appId: "1:155483919432:web:3fa53293603368c037347d"
};

// Firebase Başlatma
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global Değişkenler
let settings = { classTarget: 830, silverLimit: 4, goldLimit: 6 }; // Varsayılanlar resimdeki gibi güncellendi
let students = []; 
let books = []; 
let bookPages = {}; 
let records = []; 
let studentPassObj = {};
let teacherPassword = "14531453"; // Varsayılan şifre
let currentFilter = 'all'; 
let statsSortMode = 'book_desc'; 
let loginMode = 'teacher'; 
let loggedInStudent = "";
let isDataLoaded = false;
let tempReturnId = null;
let currentRating = 0;
let isEditMode = false;

// Sabitler
const RANKS = [{c:0, t:"🌱 Başlangıç"}, {c:5, t:"🥉 Okuma Çırağı"}, {c:10, t:"📖 Kitap Kurdu"},{c:15, t:"🚀 Bilgi Kaşifi"}, {c:20, t:"🏹 Kelime Avcısı"}, {c:25, t:"👑 Kütüphane Muhafızı"},{c:30, t:"🎩 Edebiyat Ustası"}, {c:35, t:"🌍 Bilge Okur"}, {c:40, t:"💎 EFSANE"}];
const EXIT_CARDS = {"1":{title:"Macera Hatırası",prompt:"En unutulmaz sahne neydi?"},"2":{title:"Öğrenen Profil",prompt:"Karakter hangi özelliği taşıyor?"},"3":{title:"Duygu Kartı",prompt:"Hangi duyguları hissettin?"},"4":{title:"Bağlantı Kartı",prompt:"Nasıl bir bağ kurdun?"},"5":{title:"Eleştiri Kartı",prompt:"Katılmadığın bir olay var mı?"},"6":{title:"Soru Kartı",prompt:"Seni düşündüren soru neydi?"},"7":{title:"Yaratıcı Son",prompt:"Sonunu nasıl değiştirirdin?"},"8":{title:"Gelişim Kartı",prompt:"Hangi becerini geliştirdi?"},"9":{title:"Tavsiye Kartı",prompt:"Tavsiye eder misin?"}};

// --- BAŞLANGIÇ ---
window.onload = function() {
    console.log("Zeynal Öğretmen Işık Hızı Modu Aktif! V70");
    if(localStorage.getItem('theme') === 'dark') { 
        document.body.classList.add('dark-mode'); 
        document.getElementById('themeIcon').innerText = '☀️'; 
    }
    
    // Çıkış kartlarını yükle
    let select = document.getElementById('exitCardSelect'); 
    if(select) {
        select.innerHTML = '<option value="">Bir Kart Seç...</option>'; 
        for (const [key, value] of Object.entries(EXIT_CARDS)) { 
            let opt = document.createElement('option'); 
            opt.value = key; 
            opt.innerText = value.title; 
            select.appendChild(opt); 
        }
    }

    startRealTimeSync();
};

// --- 🔥 FIREBASE GERÇEK ZAMANLI SENKRONİZASYON ---
function startRealTimeSync() {
    // 1. Ayarları Dinle
    db.collection("settings").doc("general").onSnapshot((doc) => {
        if (doc.exists) {
            settings = doc.data();
            teacherPassword = settings.password || "14531453";
            updateUI();
        }
    });

    // 2. Öğrencileri Dinle
    db.collection("students").onSnapshot((querySnapshot) => {
        students = [];
        studentPassObj = {};
        querySnapshot.forEach((doc) => {
            let data = doc.data();
            students.push(doc.id);
            studentPassObj[doc.id] = data.password;
        });
        students.sort();
        populateDatalists();
        updateUI();
    });

    // 3. Kitapları Dinle
    db.collection("books").onSnapshot((querySnapshot) => {
        books = [];
        bookPages = {};
        querySnapshot.forEach((doc) => {
            books.push(doc.id);
            bookPages[doc.id] = doc.data().pageCount;
        });
        books.sort();
        populateDatalists();
        updateUI();
    });

    // 4. Kayıtları Dinle (En Önemli Kısım)
    db.collection("records").orderBy("timestamp", "desc").onSnapshot((querySnapshot) => {
        records = [];
        querySnapshot.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id; // Firestore belge ID'sini kullan
            records.push(data);
        });
        
        isDataLoaded = true;
        document.getElementById('loader').style.display = 'none';
        document.getElementById('syncStatus').innerText = "Anlık Bağlı ✅";
        updateUI();
        if(loginMode === 'student' && loggedInStudent) renderStudentPanel();
    }, (error) => {
        console.error("Firebase Hatası:", error);
        document.getElementById('syncStatus').innerText = "Bağlantı Koptu ❌";
    });
}

// --- VERİ YAZMA İŞLEMLERİ (FIREBASE) ---
function lendBook() { 
    const s = document.getElementById('studentInput').value.trim().toUpperCase(); 
    const b = document.getElementById('bookInput').value.trim(); 
    if(!s || !b) { alert("Eksik bilgi!"); return; } 

    const newRecord = {
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        date: getLocalTime(),
        student: s,
        book: b,
        status: "Okuyor",
        returnDate: "-",
        rating: 0,
        comment: "",
        cardId: ""
    };

    // Kaydı ekle
    db.collection("records").add(newRecord).then(() => {
        document.getElementById('bookInput').value = "";
        handleInput(document.getElementById('bookInput'));
    });
}

function submitReturn() {
    if (!tempReturnId) return;

    let cardId = document.getElementById('exitCardSelect').value;
    let comment = document.getElementById('returnComment').value;

    const updateData = {
        status: "İade Etti",
        returnDate: getLocalTime(),
        rating: currentRating,
        cardId: cardId,
        cardTitle: cardId ? EXIT_CARDS[cardId].title : "",
        comment: comment
    };

    db.collection("records").doc(tempReturnId).update(updateData).then(() => {
        closeRatingModal();
    });
}

// --- DİĞER FONKSİYONLAR (ARAYÜZ VE MANTIK) ---
function updateUI() { 
    try {
        analyzeData(); 
        renderHistory(); 
        renderBookManager(); 
        renderRanking(); 
        updateProgressBar(); 
        if(document.getElementById('studentPassList')) renderPassManager();
    } catch(e) {
        console.error("UI Güncelleme Hatası:", e);
    }
}

function analyzeData() { 
    activeBooksMap = {}; 
    lastHistoryMap = {}; 
    records.forEach(r => { 
        let key = normalizeStr(r.book); 
        if(r.status === "Okuyor") { 
            if(!activeBooksMap[key]) activeBooksMap[key] = []; 
            activeBooksMap[key].push(r); 
        } else if (r.status === "İade Etti") { 
            if(!lastHistoryMap[key]) lastHistoryMap[key] = { student: r.student, date: r.returnDate }; 
        } 
    }); 
    
    let totalPagesRead = 0; 
    records.forEach(r => { 
        if(r.status === "İade Etti") totalPagesRead += (parseInt(bookPages[r.book]) || 0); 
    }); 
    if(document.getElementById('statTotalPages')) document.getElementById('statTotalPages').innerText = totalPagesRead.toLocaleString(); 
}

// ... (Buradan sonrası senin mevcut renderRanking, renderStudentPanel vb. fonksiyonlarınla aynı kalacak) ...
// Not: syncData() fonksiyonuna artık ihtiyaç yok çünkü Firebase her işlemi anında senkronize eder.

function deleteRecord(id) { 
    if(confirm("Silmek istiyor musunuz?")) { 
        db.collection("records").doc(id).delete();
    } 
}

function normalizeStr(str) { return str ? str.toString().trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR') : ""; }
function getLocalTime() { let now = new Date(); return now.toLocaleDateString('tr-TR') + " " + now.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'}); }
function handleInput(input) { let btn = input.nextElementSibling; if(btn && btn.classList.contains('clear-btn')) { btn.style.display = input.value.length > 0 ? 'block' : 'none'; } }
function toggleTheme() { document.body.classList.toggle('dark-mode'); let isDark = document.body.classList.contains('dark-mode'); document.getElementById('themeIcon').innerText = isDark ? '☀️' : '🌙'; localStorage.setItem('theme', isDark ? 'dark' : 'light'); }
