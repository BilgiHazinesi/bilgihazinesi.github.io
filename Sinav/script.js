/* script.js */

// *** BURAYA KENDİ WEB APP URL'NİZİ YAPIŞTIRIN ***
const API_URL = "https://script.google.com/macros/s/AKfycbyl5OYGBfFjH63zdmsJUq_AWX9l25rrH_mOwdD7XW5w-Hzm59-e8jrwr0GN4KlLGTXY/exec"; 

let currentUser = {};
let currentExamData = [];
let teacherExamData = []; 
let studentAnswersData = {};

// Uyarı kutusu
function showAlert(msg, type="success") {
    const box = document.getElementById("alertBox");
    box.innerHTML = msg;
    box.className = ""; // Reset class
    box.style.backgroundColor = type === "error" ? "#e74c3c" : "#2ecc71";
    box.classList.remove("hidden");
    setTimeout(() => box.classList.add("hidden"), 3000);
}

async function sendRequest(data) {
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
        return await res.json();
    } catch (e) { return {status:"error", msg:"Bağlantı Hatası"}; }
}

// --- OPTİK FORM RENDER MOTORU (YENİLENMİŞ CSS İLE) ---
function createOpticalRow(qNum, selectedOption, isClickable, callbackFunc) {
    // Bu fonksiyonu manuel string birleştirme ile yapıyoruz (performans için)
    return ""; 
}

// --- ÖĞRETMEN FORM RENDER ---
function renderTeacherForm() {
    const container = document.getElementById("teacherOpticalFormArea");
    container.innerHTML = "";

    teacherExamData.forEach((section, secIndex) => {
        let html = `<div class="optical-section">
            <div class="section-header">${section.lesson} (${section.count} Soru)</div>`;
        
        for(let i=0; i<section.count; i++) {
            const options = ["A", "B", "C", "D"];
            html += `<div class="question-row"><div class="q-number">${i+1}</div><div class="options-wrapper">`;
            
            options.forEach(opt => {
                let activeClass = (section.answers[i] === opt) ? "selected" : "";
                // Tıklama olayı
                html += `<div class="opt-circle ${activeClass}" onclick="handleTeacherClick(${secIndex}, ${i}, '${opt}')">${opt}</div>`;
            });
            html += `</div></div>`;
        }
        html += `</div>`;
        container.innerHTML += html;
    });
}

function handleTeacherClick(secIndex, qIndex, opt) {
    teacherExamData[secIndex].answers[qIndex] = opt;
    renderTeacherForm(); // Yeniden çiz
}

function addLessonSection() {
    const name = document.getElementById("lessonNameInput").value;
    const count = parseInt(document.getElementById("lessonQCountInput").value);
    if(!name || !count) return showAlert("Bilgileri giriniz.", "error");

    teacherExamData.push({ lesson: name, count: count, answers: new Array(count).fill("") });
    renderTeacherForm();
    
    document.getElementById("lessonNameInput").value = "";
    document.getElementById("lessonQCountInput").value = "";
}

async function saveExamToSystem() {
    if(teacherExamData.length === 0) return showAlert("Ders eklemediniz!", "error");
    
    let keysFormat = teacherExamData.map(sec => {
        const keyString = sec.answers.join("");
        if(keyString.length < sec.count) return null; 
        return `${sec.lesson}:${keyString}`;
    });

    if(keysFormat.includes(null)) return showAlert("Tüm soruların cevabını seçmelisiniz!", "error");

    const res = await sendRequest({ 
        action: "addExam", 
        id: document.getElementById("newExamId").value, 
        name: document.getElementById("newExamName").value, 
        keysFormat: keysFormat.join("|"), 
        showScore: document.getElementById("newShowScore").value 
    });

    if(res.status === "success") {
        showAlert("Sınav Kaydedildi!");
        teacherExamData = []; renderTeacherForm();
        document.getElementById("newExamId").value = "";
    } else { showAlert(res.msg, "error"); }
}

// --- ÖĞRENCİ FORM RENDER ---
async function loadStudentOpticalForm() {
    const examId = document.getElementById("examSelector").value;
    const container = document.getElementById("studentOpticalFormArea");
    const btnWrapper = document.getElementById("btnSubmitWrapper");
    
    container.innerHTML = "";
    studentAnswersData = {};

    if(!examId) { btnWrapper.classList.add("hidden"); return; }

    // Sınav verisini bul
    const exam = currentExamData.find(e => e.id == examId);
    
    exam.sections.forEach(section => {
        studentAnswersData[section.name] = new Array(section.qCount).fill("");
        
        let html = `<div class="optical-section">
            <div class="section-header">${section.name}</div>`;
        
        for(let i=0; i<section.qCount; i++) {
            const options = ["A", "B", "C", "D"];
            const safeName = section.name.replace(/\s/g, ''); 
            
            html += `<div class="question-row"><div class="q-number">${i+1}</div><div class="options-wrapper">`;
            options.forEach(opt => {
                const btnId = `btn-${safeName}-${i}-${opt}`;
                html += `<div id="${btnId}" class="opt-circle" onclick="handleStudentClick('${section.name}', ${i}, '${opt}', '${safeName}')">${opt}</div>`;
            });
            html += `</div></div>`;
        }
        html += `</div>`;
        container.innerHTML += html;
    });

    btnWrapper.classList.remove("hidden");
}

function handleStudentClick(lessonName, qIndex, opt, safeName) {
    // Veriyi kaydet
    studentAnswersData[lessonName][qIndex] = opt;

    // Görseli güncelle (DOM manipülasyonu - Hız için tüm formu render etmiyoruz)
    const options = ["A", "B", "C", "D"];
    options.forEach(o => {
        const btn = document.getElementById(`btn-${safeName}-${qIndex}-${o}`);
        if(o === opt) btn.classList.add("selected");
        else btn.classList.remove("selected");
    });
}

async function submitExam() {
    let finalAnswers = {};
    let isMissing = false;

    for (const [lesson, arr] of Object.entries(studentAnswersData)) {
        if(arr.includes("")) isMissing = true;
        finalAnswers[lesson] = arr.join("");
    }

    if(isMissing && !confirm("Bazı sorular boş. Göndermek istiyor musun?")) return;

    showAlert("Cevaplar gönderiliyor...");
    
    const res = await sendRequest({
        action: "submitExam",
        studentName: currentUser.name,
        examId: document.getElementById("examSelector").value,
        answers: finalAnswers
    });

    if(res.status === "success") {
        document.getElementById("studentOpticalFormArea").innerHTML = `<div class="card" style="text-align:center; color:green;"><h2>✅ Tamamlandı!</h2><p>Cevapların başarıyla alındı.</p></div>`;
        document.getElementById("btnSubmitWrapper").classList.add("hidden");
        if(res.score !== null) alert("Puanın: " + res.score.toFixed(2));
    } else {
        showAlert(res.msg, "error");
    }
}

// --- GİRİŞ / ÇIKIŞ ---
async function login() {
    const code = document.getElementById("userCode").value;
    if(!code) return showAlert("Kod girin", "error");
    
    showAlert("Giriş yapılıyor...");
    const res = await sendRequest({ action: "login", password: code });
    
    if(res.status === "success") {
        currentUser = { name: res.name, role: res.role };
        document.getElementById("loginSection").classList.add("hidden");
        document.getElementById("alertBox").classList.add("hidden");

        if(res.role === "Ogretmen") {
            document.getElementById("teacherPanel").classList.remove("hidden");
        } else {
            document.getElementById("studentPanel").classList.remove("hidden");
            document.getElementById("welcomeText").innerText = "Merhaba, " + res.name.split(" ")[0];
            loadExams();
        }
    } else { showAlert(res.msg, "error"); }
}

async function loadExams() {
    const res = await sendRequest({ action: "getExamDetails" });
    if(res.status === "success") {
        currentExamData = res.exams;
        const sel = document.getElementById("examSelector");
        sel.innerHTML = '<option value="">Seçiniz...</option>';
        res.exams.forEach(ex => {
            let opt = document.createElement("option");
            opt.value = ex.id;
            opt.innerText = ex.name;
            sel.appendChild(opt);
        });
    }
}

async function getReport() {
    const id = document.getElementById("reportId").value;
    if(!id) return showAlert("Sınav kodu girin", "error");
    showAlert("Analiz isteniyor...");
    await sendRequest({ action: "sendReport", examId: id });
    showAlert("Rapor Telegram'a gönderildi!");
}

function logout() { location.reload(); }
