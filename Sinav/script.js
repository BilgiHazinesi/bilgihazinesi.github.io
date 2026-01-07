// *** BURAYA GÜNCEL APP SCRIPT LINKINI YAPIŞTIRIN ***
const API_URL = "https://script.google.com/macros/s/AKfycbw_AIVl4bxqeRfT7LWpkUey-1nTuYJ_UwKMTSu7r2Mhwy8EWfp_WOrDSgHOI4lWdYXG/exec"; 

let currentUser = {};
let teacherData = { exams: [], students: [], results: [] };
let activeExamData = [], tempExamBuilder = [], studentAnswers = {};
let currentChart = null;

// --- API İSTEKÇİSİ ---
async function apiRequest(data) {
    try {
        document.body.style.cursor = "wait";
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
        document.body.style.cursor = "default";
        return await res.json();
    } catch (e) { alert("Bağlantı hatası!"); return {status: "error"}; }
}

// --- GİRİŞ İŞLEMİ ---
async function login() {
    const code = document.getElementById("loginCode").value;
    if(!code) return alert("Lütfen kodunuzu girin.");
    
    const res = await apiRequest({ action: "login", password: code });
    if(res.status === "success") {
        currentUser = res;
        document.getElementById("loginScreen").classList.remove("active");
        document.getElementById("mainApp").classList.remove("hidden");
        
        // Kullanıcı Bilgilerini Yaz
        document.getElementById("userNameDisplay").innerText = res.name;
        document.getElementById("userRoleDisplay").innerText = res.role;

        if(res.role === "Ogretmen") {
            document.getElementById("menuTeacher").classList.remove("hidden");
            openTab('t-dashboard');
            loadTeacherDashboard();
        } else {
            document.getElementById("menuStudent").classList.remove("hidden");
            openTab('s-active');
            loadStudentDashboard();
        }
    } else { alert(res.msg); }
}

function openTab(id) {
    // Tüm sekmeleri gizle
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    
    // Menü aktifliğini ayarla
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

function logout() { location.reload(); }

// ==========================================
// 🎓 ÖĞRETMEN FONKSİYONLARI
// ==========================================

async function loadTeacherDashboard() {
    const res = await apiRequest({ action: "getTeacherData" });
    if(res.status === "success") {
        teacherData = res;
        updateDashboardStats();
        renderExamList();
        renderStudentList();
    }
}

function updateDashboardStats() {
    // İstatistik Kartlarını Doldur
    document.getElementById("statStudentCount").innerText = teacherData.students.length;
    document.getElementById("statExamCount").innerText = teacherData.exams.length;
    
    const activeCount = teacherData.exams.filter(e => e.status.toLowerCase() === "aktif").length;
    document.getElementById("statActiveCount").innerText = activeCount;

    // Son Eklenenler Tablosu (İlk 5)
    const tableBody = document.getElementById("dashboardExamTable");
    tableBody.innerHTML = "";
    teacherData.exams.slice().reverse().slice(0, 5).forEach(ex => {
        let statusHtml = ex.status.toLowerCase() === "aktif" 
            ? '<span class="status-badge active">Aktif</span>' 
            : '<span class="status-badge passive">Pasif</span>';
        tableBody.innerHTML += `<tr><td>${ex.name}</td><td>${ex.id}</td><td>${statusHtml}</td></tr>`;
    });
}

// 1. SINAV LİSTESİ (KART GÖRÜNÜMÜ)
function renderExamList() {
    const container = document.getElementById("examListContainer");
    const filter = document.getElementById("searchExam").value.toLowerCase();
    container.innerHTML = "";
    
    teacherData.exams.slice().reverse().forEach(ex => {
        if(ex.name.toLowerCase().includes(filter)) {
            let isActive = ex.status.toLowerCase() === "aktif";
            container.innerHTML += `
            <div class="exam-card">
                <div class="card-header">
                    <div>
                        <div class="card-title">${ex.name}</div>
                        <div class="card-subtitle">Kod: ${ex.id}</div>
                    </div>
                    <span class="status-badge ${isActive ? 'active' : 'passive'}">${isActive ? 'Yayında' : 'Gizli'}</span>
                </div>
                <div class="card-actions">
                    <button class="btn-action" onclick="toggleStatus('${ex.id}')">
                        <i class="fas ${isActive ? 'fa-pause' : 'fa-play'}"></i> ${isActive ? 'Durdur' : 'Başlat'}
                    </button>
                    <button class="btn-action primary" onclick="analyzeExam('${ex.id}')">
                        <i class="fas fa-chart-pie"></i> Analiz
                    </button>
                    <button class="btn-action telegram" onclick="openTelegramModal('${ex.id}')">
                        <i class="fab fa-telegram-plane"></i>
                    </button>
                </div>
            </div>`;
        }
    });
}
function filterExams() { renderExamList(); }

async function toggleStatus(id) {
    const res = await apiRequest({ action: "toggleExamStatus", examId: id });
    if(res.status === "success") { 
        teacherData.exams.find(e => e.id == id).status = res.newStatus;
        updateDashboardStats(); // Dashboard'u da güncelle
        renderExamList(); 
    }
}

// 2. ÖĞRENCİ LİSTESİ
function renderStudentList() {
    const container = document.getElementById("studentListContainer");
    const filter = document.getElementById("searchStudent").value.toLowerCase();
    container.innerHTML = "";
    
    teacherData.students.forEach(stu => {
        if(stu.toLowerCase().includes(filter)) {
            container.innerHTML += `
            <div class="student-item" onclick="analyzeStudent('${stu}')" style="cursor:pointer;">
                <div style="display:flex; align-items:center; gap:15px;">
                    <div style="width:40px; height:40px; background:#e0e7ff; border-radius:50%; display:grid; place-items:center; color:var(--primary); font-weight:bold;">
                        ${stu.charAt(0)}
                    </div>
                    <span style="font-weight:600;">${stu}</span>
                </div>
                <i class="fas fa-chevron-right" style="color:#ccc;"></i>
            </div>`;
        }
    });
}
function filterStudents() { renderStudentList(); }

// --- YENİ SINAV OLUŞTURMA ---
function addLesson() {
    let name = document.getElementById("lName").value;
    let count = document.getElementById("lCount").value;
    if(name && count) { 
        tempExamBuilder.push({name: name, count: parseInt(count)}); 
        renderPreview();
        document.getElementById("lName").value = "";
        document.getElementById("lCount").value = "";
    }
}
function renderPreview() {
    document.getElementById("previewArea").innerHTML = tempExamBuilder.map((l,i) => 
        `<div class="tag">${l.name} (${l.count}) <i class="fas fa-times" onclick="removeLesson(${i})"></i></div>`
    ).join('');
}
function removeLesson(i) { tempExamBuilder.splice(i, 1); renderPreview(); }

async function saveExam() {
    if(tempExamBuilder.length === 0) return alert("En az bir ders ekleyin.");
    let keys = tempExamBuilder.map(l => `${l.name}:${"A".repeat(l.count)}`).join("|");
    await apiRequest({
        action: "addExam",
        id: document.getElementById("newExamId").value,
        name: document.getElementById("newExamName").value,
        keysFormat: keys,
        showScore: document.getElementById("newShowScore").value
    });
    alert("Sınav Başarıyla Oluşturuldu!");
    location.reload();
}

// ==========================================
// 📊 ANALİZ & TELEGRAM
// ==========================================

function analyzeExam(id) {
    let results = teacherData.results.filter(r => r.examId == id);
    if(results.length === 0) return alert("Henüz veri yok.");
    
    let lessonStats = {};
    results.forEach(r => {
        try { JSON.parse(r.answers).forEach(d => {
            if(!lessonStats[d.lesson]) lessonStats[d.lesson] = {correct:0, total:0};
            lessonStats[d.lesson].correct += d.correct; lessonStats[d.lesson].total += d.total;
        }); } catch(e){}
    });
    
    let labels = Object.keys(lessonStats);
    let data = labels.map(l => Math.round((lessonStats[l].correct / lessonStats[l].total) * 100));
    
    showModal(`<h3>${id} Analizi</h3>`, `<div class="chart-container"><canvas id="chartArea"></canvas></div>`);
    drawChart('chartArea', 'bar', labels, data, 'Başarı %');
}

function analyzeStudent(name) {
    let results = teacherData.results.filter(r => r.student == name);
    if(results.length === 0) return alert("Kayıt yok.");
    
    showModal(`<h3>${name} Gelişimi</h3>`, `<div class="chart-container"><canvas id="chartArea"></canvas></div>`);
    drawChart('chartArea', 'line', results.map(r=>r.examId), results.map(r=>r.score), 'Puan');
}

function openTelegramModal(id) {
    let results = teacherData.results.filter(r => r.examId == id);
    if(results.length === 0) return alert("Veri yok.");
    
    let html = `
        <div style="text-align:center;">
            <p><strong>${id}</strong> Raporu Gönder</p>
            <button class="btn-primary" onclick="sendClassReport('${id}')"><i class="fas fa-users"></i> Tüm Sınıf</button>
            <div style="margin: 15px 0; border-top:1px solid #eee;"></div>
            <select id="stuSelect" style="margin-bottom:10px;">${results.map(r=>`<option value="${r.student}">${r.student}</option>`).join('')}</select>
            <button class="btn-success" onclick="sendStudentReport('${id}')"><i class="fas fa-user"></i> Seçili Öğrenci</button>
        </div>`;
    showModal("Telegram Rapor", html);
}
async function sendClassReport(id) { await apiRequest({action:"sendClassReport", examId:id}); alert("Gönderildi!"); closeModal(); }
async function sendStudentReport(id) { await apiRequest({action:"sendStudentReport", examId:id, studentName:document.getElementById("stuSelect").value}); alert("Gönderildi!"); }


// ==========================================
// 🎓 ÖĞRENCİ FONKSİYONLARI
// ==========================================

async function loadStudentDashboard() {
    const res = await apiRequest({ action: "getStudentDashboard", studentName: currentUser.name });
    if(res.status === "success") {
        activeExamData = res.active;
        const container = document.getElementById("activeExamList");
        container.innerHTML = "";
        
        if(res.active.length === 0) container.innerHTML = "<p style='text-align:center; color:#999;'>Şu an aktif sınav yok.</p>";
        
        res.active.forEach(ex => {
            container.innerHTML += `
            <div class="exam-card">
                <div class="card-header">
                    <div class="card-title">${ex.name}</div>
                    <span class="status-badge active">Aktif</span>
                </div>
                <button class="btn-primary" onclick="startExam('${ex.id}')">Sınava Başla</button>
            </div>`;
        });

        if(res.history.length > 0) {
            drawChart('studentHistoryChart', 'bar', res.history.map(h=>h.examId), res.history.map(h=>h.score), 'Puanlarım');
            document.getElementById("historyList").innerHTML = res.history.map(h => 
                `<div class="exam-item"><span>${h.examId}</span><strong>${Math.round(h.score)} Puan</strong></div>`
            ).join('');
        }
    }
}

function startExam(id) {
    let ex = activeExamData.find(e => e.id == id);
    document.getElementById("activeExamList").classList.add("hidden");
    document.getElementById("examSolvingArea").classList.remove("hidden");
    document.getElementById("solvingExamTitle").innerText = ex.name;
    document.getElementById("solvingExamTitle").dataset.id = id;
    
    const area = document.getElementById("opticalFormArea");
    area.innerHTML = "";
    studentAnswers = {};
    
    ex.sections.forEach(sec => {
        studentAnswers[sec.name] = new Array(sec.qCount).fill("");
        let html = `<h4>${sec.name}</h4>`;
        for(let i=0; i<sec.qCount; i++) {
            html += `
            <div class="opt-row">
                <span>${i+1}</span>
                <div class="opt-options">
                    ${['A','B','C','D'].map(o => `<div class="bubble" onclick="selectOpt(this, '${sec.name}', ${i}, '${o}')">${o}</div>`).join('')}
                </div>
            </div>`;
        }
        area.innerHTML += `<div class="opt-section">${html}</div>`;
    });
}

function selectOpt(el, lesson, idx, opt) {
    el.parentNode.querySelectorAll('.bubble').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    studentAnswers[lesson][idx] = opt;
}

async function submitExam() {
    if(!confirm("Sınavı bitirmek istiyor musun?")) return;
    let ans = {}; 
    for(let l in studentAnswers) ans[l] = studentAnswers[l].join("");
    
    const res = await apiRequest({ 
        action: "submitExam", 
        studentName: currentUser.name, 
        examId: document.getElementById("solvingExamTitle").dataset.id, 
        answers: ans 
    });
    
    if(res.status === "success") { alert("Tebrikler! Sınavın kaydedildi."); location.reload(); }
}

// --- YARDIMCILAR ---
function showModal(h, b) { document.getElementById("modalHeader").innerHTML = h; document.getElementById("modalBody").innerHTML = b; document.getElementById("detailModal").style.display = "grid"; }
function closeModal() { document.getElementById("detailModal").style.display = "none"; }
function drawChart(id, type, labels, data, label) {
    if(currentChart) currentChart.destroy();
    const ctx = document.getElementById(id);
    if(ctx) {
        currentChart = new Chart(ctx, {
            type: type,
            data: { labels: labels, datasets: [{ label: label, data: data, backgroundColor: '#4361ee', borderColor: '#4361ee', tension:0.3 }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}
