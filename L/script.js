// --- ZEYNAL ÖĞRETMEN V72 (FIREBASE FULL SYNC - BUG FIX) ---

const firebaseConfig = {
  apiKey: "AIzaSyAP9qwq7rGzgruRI0tDv9s9bUKl5GWOXqo",
  authDomain: "veri-8e938.firebaseapp.com",
  projectId: "veri-8e938",
  storageBucket: "veri-8e938.firebasestorage.app",
  messagingSenderId: "155483919432",
  appId: "1:155483919432:web:3fa53293603368c037347d"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Değişkenler
let settings = { classTarget: 830, silverLimit: 4, goldLimit: 6 }; 
let students = []; 
let studentPassObj = {};
let teacherPassword = "14531453"; 
let records = []; 
let loginMode = 'teacher'; 
let isDataLoaded = false;

window.onload = function() {
    startRealTimeSync();
};

function startRealTimeSync() {
    // Ayarları Dinle
    db.collection("settings").doc("general").onSnapshot((doc) => {
        if (doc.exists) {
            settings = doc.data();
            teacherPassword = String(settings.password || "14531453");
        }
    });

    // Öğrencileri Dinle
    db.collection("students").onSnapshot((querySnapshot) => {
        students = [];
        studentPassObj = {};
        querySnapshot.forEach((doc) => {
            students.push(doc.id);
            studentPassObj[doc.id] = String(doc.data().password);
        });
        isDataLoaded = true;
        document.getElementById('loader').style.display = 'none';
        console.log("Veriler Firebase'den yüklendi.");
    });
}

// SEKME DEĞİŞTİRME HATASI İÇİN (Öğrenci/Öğretmen Sekmesi)
function setLoginMode(mode) {
    loginMode = mode;
    const tabTeacher = document.getElementById('tabTeacher');
    const tabStudent = document.getElementById('tabStudent');
    const teacherForm = document.getElementById('teacherLoginForm');
    const studentForm = document.getElementById('studentLoginForm');

    if(mode === 'teacher') {
        tabTeacher.classList.add('active');
        tabStudent.classList.remove('active');
        teacherForm.style.display = 'block';
        studentForm.style.display = 'none';
    } else {
        tabStudent.classList.add('active');
        tabTeacher.classList.remove('active');
        studentForm.style.display = 'block';
        teacherForm.style.display = 'none';
    }
}

// GİRİŞ FONKSİYONU
function login() {
    const passInput = loginMode === 'teacher' ? 
        document.getElementById('appPassword').value : 
        document.getElementById('studentLoginPass').value;

    if(loginMode === 'teacher') {
        if(String(passInput).trim() === String(teacherPassword).trim()) {
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            document.getElementById('teacherContainer').style.display = 'block';
            document.getElementById('teacherNav').style.display = 'flex';
        } else { alert("Hatalı Öğretmen Şifresi!"); }
    } else {
        const found = Object.keys(studentPassObj).find(s => String(studentPassObj[s]) === String(passInput).trim());
        if(found) {
            alert("Hoş geldin " + found);
            location.reload(); // Şimdilik basit giriş testi
        } else { alert("Öğrenci şifresi hatalı!"); }
    }
}
