// --- ZEYNAL ÖĞRETMEN V76 (GİRİŞ HATASI ÇÖZÜLDÜ) ---

const firebaseConfig = {
  apiKey: "AIzaSyAP9qwq7rGzgruRI0tDv9s9bUKl5GWOXqo",
  authDomain: "veri-8e938.firebaseapp.com",
  projectId: "veri-8e938",
  storageBucket: "veri-8e938.firebasestorage.app",
  messagingSenderId: "155483919432",
  appId: "1:155483919432:web:3fa53293603368c037347d"
};

// Firebase'i güvenli şekilde başlat
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();
}

let settings = { classTarget: 830 };
let students = [];
let studentPassObj = {};
let teacherPassword = "14531453"; // Sabit öğretmen şifresi
let records = [];
let loginMode = 'teacher';
let isDataLoaded = false;

window.onload = function() {
    startRealTimeSync();
};

function startRealTimeSync() {
    // Ayarları Çek
    db.collection("settings").doc("general").onSnapshot(doc => {
        if(doc.exists) { 
            settings = doc.data(); 
            teacherPassword = String(settings.password || "14531453"); 
        }
    });

    // Öğrencileri Çek
    db.collection("students").onSnapshot(snap => {
        studentPassObj = {};
        snap.forEach(doc => { studentPassObj[doc.id] = String(doc.data().password); });
        isDataLoaded = true;
        document.getElementById('loader').innerText = "Sistem Hazır ✅";
    });

    // Kayıtları Çek
    db.collection("records").orderBy("timestamp", "desc").onSnapshot(snap => {
        records = [];
        snap.forEach(doc => { let d = doc.data(); d.id = doc.id; records.push(d); });
        updateUI();
    });
}

function setLoginMode(mode) {
    loginMode = mode;
    document.getElementById('tabTeacher').classList.toggle('active', mode === 'teacher');
    document.getElementById('tabStudent').classList.toggle('active', mode === 'student');
    document.getElementById('teacherLoginForm').style.display = (mode === 'teacher' ? 'block' : 'none');
    document.getElementById('studentLoginForm').style.display = (mode === 'student' ? 'block' : 'none');
}

function login() {
    if(!isDataLoaded) { alert("Lütfen verilerin yüklenmesini bekleyin..."); return; }
    
    const inputVal = loginMode === 'teacher' ? 
        document.getElementById('appPassword').value.trim() : 
        document.getElementById('studentLoginPass').value.trim();

    if(loginMode === 'teacher') {
        if(String(inputVal) === String(teacherPassword)) {
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            document.getElementById('teacherContainer').style.display = 'block';
            updateUI();
        } else { alert("Öğretmen şifresi hatalı!"); }
    } else {
        const student = Object.keys(studentPassObj).find(s => String(studentPassObj[s]) === String(inputVal));
        if(student) {
            alert("Hoş geldin " + student);
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
        } else { alert("Öğrenci şifresi hatalı!"); }
    }
}

function updateUI() {
    let completed = records.filter(r => r.status === "İade Etti").length;
    let percent = Math.floor((completed / settings.classTarget) * 100);
    document.getElementById('progressBar').style.width = percent + "%";
    document.getElementById('targetText').innerText = `${completed} / ${settings.classTarget} Kitap`;
    
    // Son hareketler listesini render et
    const div = document.getElementById('historyList');
    div.innerHTML = "";
    records.filter(r => r.status === "Okuyor").forEach(r => {
        div.innerHTML += `<div class="list-item" style="padding:10px; border-bottom:1px solid #eee;">
            <strong>${r.book}</strong><br><small>${r.student}</small>
        </div>`;
    });
}
