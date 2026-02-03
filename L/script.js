// --- ZEYNAL ÖĞRETMEN V74 (FULL FEATURES & FIREBASE) ---

const firebaseConfig = {
  apiKey: "AIzaSyAP9qwq7rGzgruRI0tDv9s9bUKl5GWOXqo",
  authDomain: "veri-8e938.firebaseapp.com",
  projectId: "veri-8e938",
  storageBucket: "veri-8e938.firebasestorage.app",
  messagingSenderId: "155483919432",
  appId: "1:155483919432:web:3fa53293603368c037347d"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Değişkenler
let settings = { classTarget: 830, silverLimit: 4, goldLimit: 6 };
let students = []; let books = []; let bookPages = {}; let records = []; 
let studentPassObj = {}; let teacherPassword = "14531453";
let loginMode = 'teacher'; let isDataLoaded = false;

// BAŞLATMA
window.onload = function() {
    startRealTimeSync();
};

function startRealTimeSync() {
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
            studentPassObj[doc.id] = String(doc.data().password); 
        });
        populateDatalists();
    });

    // 3. Kayıtları Dinle (İstatistik ve Geçmiş Buradan Beslenir)
    db.collection("records").orderBy("timestamp", "desc").onSnapshot(snap => {
        records = [];
        snap.forEach(doc => { let d = doc.data(); d.id = doc.id; records.push(d); });
        isDataLoaded = true;
        document.getElementById('loader').innerText = "Bağlı ✅";
        updateUI();
    });
}

// SEKME DEĞİŞTİRME (Artık Donmayacak!)
function setLoginMode(mode) {
    loginMode = mode;
    document.getElementById('tabTeacher').classList.toggle('active', mode === 'teacher');
    document.getElementById('tabStudent').classList.toggle('active', mode === 'student');
    document.getElementById('teacherLoginForm').style.display = (mode === 'teacher' ? 'block' : 'none');
    document.getElementById('studentLoginForm').style.display = (mode === 'student' ? 'block' : 'none');
}

function switchTab(id, btn) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById('tab-' + id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    btn.classList.add('active');
    if(id === 'stats') renderRanking();
    if(id === 'books') renderBookManager();
}

// GİRİŞ YAP
function login() {
    const pass = loginMode === 'teacher' ? 
        document.getElementById('appPassword').value.trim() : 
        document.getElementById('studentLoginPass').value.trim();

    if(loginMode === 'teacher') {
        if(pass === teacherPassword) {
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            document.getElementById('teacherContainer').style.display = 'block';
            document.getElementById('teacherNav').style.display = 'flex';
            updateUI();
        } else { alert("Şifre Hatalı!"); }
    } else {
        const student = Object.keys(studentPassObj).find(s => studentPassObj[s] === pass);
        if(student) {
            alert("Hoş geldin " + student);
            // Öğrenci paneli render kodları buraya
        } else { alert("Öğrenci şifresi bulunamadı!"); }
    }
}

// --- TÜM ÖZELLİKLERİN RENDER FONKSİYONLARI ---
function updateUI() {
    analyzeData();
    renderHistory();
    updateProgressBar();
}

function updateProgressBar() {
    let completed = records.filter(r => r.status === "İade Etti").length;
    let percent = Math.floor((completed / settings.classTarget) * 100);
    document.getElementById('progressBar').style.width = percent + "%";
    document.getElementById('progressPercent').innerText = percent + "%";
    document.getElementById('targetText').innerText = `${completed} / ${settings.classTarget} Kitap`;
}

function populateDatalists() {
    let sl = document.getElementById('studentList');
    sl.innerHTML = "";
    students.sort().forEach(s => sl.innerHTML += `<option value="${s}">`);
}

function renderHistory() {
    const div = document.getElementById('historyList');
    div.innerHTML = "";
    records.slice(0, 10).forEach(r => {
        div.innerHTML += `<div class="list-item"><h4>${r.book}</h4><p>${r.student} - ${r.status}</p></div>`;
    });
}
