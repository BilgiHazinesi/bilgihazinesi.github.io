// --- ZEYNAL ÖĞRETMEN V77 (KESİN BAĞLANTI) ---

const firebaseConfig = {
  apiKey: "AIzaSyAP9qwq7rGzgruRI0tDv9s9bUKl5GWOXqo",
  authDomain: "veri-8e938.firebaseapp.com",
  projectId: "veri-8e938",
  storageBucket: "veri-8e938.firebasestorage.app",
  messagingSenderId: "155483919432",
  appId: "1:155483919432:web:3fa53293603368c037347d"
};

// Global Değişkenler
let db;
let teacherPassword = "14531453";
let studentPassObj = {};
let isDataLoaded = false;
let loginMode = 'teacher';

window.onload = function() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        console.log("Firebase Başlatıldı.");
        startRealTimeSync();
    } catch (e) {
        console.error("Firebase Hatası:", e);
        document.getElementById('loader').innerText = "Bağlantı Hatası!";
    }
};

function startRealTimeSync() {
    // Şifre ve Ayarları Dinle
    db.collection("settings").doc("general").onSnapshot(doc => {
        if(doc.exists) teacherPassword = String(doc.data().password || "14531453");
    });

    // Öğrencileri Dinle
    db.collection("students").onSnapshot(snap => {
        studentPassObj = {};
        snap.forEach(doc => { studentPassObj[doc.id] = String(doc.data().password); });
        isDataLoaded = true;
        document.getElementById('loader').innerText = "Bağlı ✅";
    });
}

function login() {
    const input = loginMode === 'teacher' ? 
        document.getElementById('appPassword').value : 
        document.getElementById('studentLoginPass').value;

    if(loginMode === 'teacher') {
        if(String(input).trim() === teacherPassword) {
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            document.getElementById('teacherContainer').style.display = 'block';
            document.getElementById('teacherNav').style.display = 'flex';
        } else { alert("Şifre Hatalı!"); }
    }
}

function setLoginMode(mode) {
    loginMode = mode;
    document.getElementById('teacherLoginForm').style.display = (mode === 'teacher' ? 'block' : 'none');
    document.getElementById('studentLoginForm').style.display = (mode === 'student' ? 'block' : 'none');
    document.getElementById('tabTeacher').classList.toggle('active', mode === 'teacher');
    document.getElementById('tabStudent').classList.toggle('active', mode === 'student');
}
