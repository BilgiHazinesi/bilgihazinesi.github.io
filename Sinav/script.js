const API_URL = "BURAYA_YENI_WEB_APP_URL_YAPISTIRIN"; 

let currentUser = {};
let teacherData = { exams: [], students: [], results: [] };
let activeExamData = [], builderData = [], studentAnswers = {};
let currentChart = null;

// --- API ---
function setLoading(state) {
    const overlay = document.getElementById("loadingOverlay");
    if(state) overlay.classList.remove("hidden");
    else overlay.classList.add("hidden");
}

async function apiRequest(data) {
    try {
        setLoading(true);
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
        const json = await res.json();
        setLoading(false);
        return json;
    } catch (e) { 
        setLoading(false); 
        alert("Bağlantı Hatası! İnternetinizi kontrol edin."); 
        return {status: "error"}; 
    }
}

// --- GİRİŞ ---
async function login() {
    const code = document.getElementById("loginCode").value;
    if(!code) return alert("Kod girin");
    const res = await apiRequest({ action: "login", password: code });
    if(res.status === "success") {
        currentUser = res;
        document.getElementById("loginScreen").classList.remove("active");
        document.getElementById("mainApp").classList.remove("hidden");
        document.getElementById("userNameDisplay").innerText = res.name;
        document.getElementById("userRoleDisplay").innerText = res.role;
        document.getElementById("userAvatar").innerText = res.name.charAt(0);

        if(res.role === "Ogretmen") {
            setupBottomNav("teacher");
            loadTeacherDashboard();
            openTab('t-dashboard');
        } else {
            setupBottomNav("student");
            loadStudentDashboard();
            openTab('s-active');
        }
    } else { alert(res.msg); }
}

function setupBottomNav(role) {
    const nav = document.getElementById("bottomNav");
    if(role === "teacher") {
        nav.innerHTML = `
            <button class="nav-item active" onclick="openTab('t-dashboard')"><i class="fas fa-home"></i>Özet</button>
            <button class="nav-item" onclick="openTab('t-exams')"><i class="fas fa-list"></i>Sınav</button>
            <button class="nav-item" onclick="openTab('t-create')"><i class="fas fa-plus-circle"></i>Ekle</button>
            <button class="nav-item" onclick="openTab('t-students')"><i class="fas fa-users"></i>Öğrenci</button>`;
    } else {
        nav.innerHTML = `
            <button class="nav-item active" onclick="openTab('s-active')"><i class="fas fa-pen"></i>Sınavlar</button>
            <button class="nav-item" onclick="openTab('s-history')"><i class="fas fa-chart-bar"></i>Karnem</button>`;
    }
}

function openTab(id) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
}

function logout() { location.reload(); }

// --- ÖĞRETMEN ---
async function loadTeacherDashboard() {
    const res = await apiRequest({ action: "getTeacherData" });
    if(res.status === "success") {
        teacherData = res;
        document.getElementById("statStu").innerText = teacherData.students.length;
        document.getElementById("statExam").innerText = teacherData.exams.length;
        renderExamList(); renderStudentList();
    }
}

function renderExamList() {
    const div = document.getElementById("examListContainer");
    const filter = document.getElementById("searchExam").value.toLowerCase();
    div.innerHTML = "";
    teacherData.exams.slice().reverse().forEach(ex => {
        if(ex.name.toLowerCase().includes(filter)) {
            let isActive = ex.status.toLowerCase() === "aktif";
            div.innerHTML += `
            <div class="list-item ${isActive?'active':'passive'}">
                <div>
                    <div style="font-weight:600">${ex.name}</div>
                    <small style="color:#666">${ex.id}</small>
                </div>
                <div class="item-actions">
                    <button class="btn-action" onclick="toggleStatus('${ex.id}')">${isActive?'<i class="fas fa-pause"></i>':'<i class="fas fa-play"></i>'}</button>
                    <button class="btn-action" style="color:#8e44ad" onclick="openTelegramModal('${ex.id}')"><i class="fab fa-telegram-plane"></i></button>
                    <button class="btn-action" onclick="analyzeExam('${ex.id}')"><i class="fas fa-chart-pie"></i></button>
                </div>
            </div>`;
        }
    });
}
function filterExams() { renderExamList(); }

async function toggleStatus(id) {
    const res = await apiRequest({ action: "toggleExamStatus", examId: id });
    if(res.status === "success") { teacherData.exams.find(e=>e.id==id).status = res.newStatus; renderExamList(); }
}

function renderStudentList() {
    const div = document.getElementById("studentListContainer");
    const filter = document.getElementById("searchStudent").value.toLowerCase();
    div.innerHTML = "";
    teacherData.students.forEach(stu => {
        if(stu.toLowerCase().includes(filter)) div.innerHTML += `<div class="list-item" onclick="analyzeStudent('${stu}')"><span>${stu}</span><i class="fas fa-chevron-right"></i></div>`;
    });
}
function filterStudents() { renderStudentList(); }

// --- OLUŞTURUCU ---
function addLessonToBuilder() {
    let name = document.getElementById("lName").value;
    let count = parseInt(document.getElementById("lCount").value);
    if(name && count) {
        builderData.push({name: name, count: count, key: new Array(count).fill(null)});
        document.getElementById("lName").value=""; document.getElementById("lCount").value="";
        renderBuilder();
    }
}
function renderBuilder() {
    const area = document.getElementById("builderArea"); area.innerHTML = "";
    builderData.forEach((l, lIdx) => {
        let rows = "";
        for(let i=0; i<l.count; i++) {
            rows += `<div class="builder-row"><span>${i+1}</span><div class="bubbles">${['A','B','C','D'].map(o => `<div class="bubble ${l.key[i]==o?'selected':''}" onclick="setKey(${lIdx},${i},'${o}')">${o}</div>`).join('')}</div></div>`;
        }
        area.innerHTML += `<div class="builder-item"><div class="builder-header"><span>${l.name}</span><i class="fas fa-trash" onclick="delLesson(${lIdx})"></i></div>${rows}</div>`;
    });
}
function setKey(lIdx, qIdx, opt) { builderData[lIdx].key[qIdx] = opt; renderBuilder(); }
function delLesson(idx) { builderData.splice(idx,1); renderBuilder(); }

async function saveExamToSystem() {
    if(builderData.length == 0) return alert("Ders ekleyin.");
    for(let l of builderData) if(l.key.includes(null)) return alert(l.name + " dersinde eksik cevap var!");
    
    let keys = builderData.map(l => `${l.name}:${l.key.join("")}`).join("|");
    await apiRequest({
        action: "addExam",
        id: document.getElementById("newExamId").value,
        name: document.getElementById("newExamName").value,
        keysFormat: keys,
        showScore: document.getElementById("newShowScore").value
    });
    alert("Sınav Yayınlandı!"); location.reload();
}

// --- ÖĞRENCİ ---
async function loadStudentDashboard() {
    const res = await apiRequest({ action: "getStudentDashboard", studentName: currentUser.name });
    if(res.status === "success") {
        activeExamData = res.active;
        const div = document.getElementById("activeExamList"); div.innerHTML = "";
        if(res.active.length == 0) div.innerHTML = "<p style='text-align:center;color:#999'>Aktif sınav yok.</p>";
        res.active.forEach(ex => {
            div.innerHTML += `<div class="card" style="display:flex; justify-content:space-between; align-items:center;"><b>${ex.name}</b><button class="btn-primary" style="width:auto; padding:8px 15px;" onclick="startExam('${ex.id}')">BAŞLA</button></div>`;
        });
        document.getElementById("historyList").innerHTML = res.history.map(h=>`<div class="list-item"><span>${h.examId}</span><b>${h.score==-1?'?':Math.round(h.score)}</b></div>`).join('');
        if(res.history.length>0) drawChart(res.history.map(h=>h.examId), res.history.map(h=>h.score));
    }
}
function startExam(id) {
    let ex = activeExamData.find(e => e.id == id);
    document.getElementById("examSolvingArea").classList.remove("hidden");
    document.getElementById("solvingExamTitle").innerText = ex.name;
    document.getElementById("solvingExamTitle").dataset.id = id;
    const area = document.getElementById("opticalFormArea"); area.innerHTML = ""; studentAnswers = {};
    ex.sections.forEach(sec => {
        studentAnswers[sec.name] = new Array(sec.qCount).fill("");
        let rows = "";
        for(let i=0; i<sec.qCount; i++) rows += `<div class="opt-row"><span>${i+1}</span><div class="bubbles">${['A','B','C','D'].map(o=>`<div class="opt-circle" onclick="selOpt(this,'${sec.name}',${i},'${o}')">${o}</div>`).join('')}</div></div>`;
        area.innerHTML += `<div class="card"><h4>${sec.name}</h4>${rows}</div>`;
    });
}
function selOpt(el, l, i, o) {
    el.parentNode.querySelectorAll('.opt-circle').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected'); studentAnswers[l][i] = o;
}
async function submitStudentExam() {
    if(!confirm("Bitir?")) return;
    let ans = {}; for(let l in studentAnswers) ans[l] = studentAnswers[l].join("");
    const res = await apiRequest({ action:"submitExam", studentName:currentUser.name, examId:document.getElementById("solvingExamTitle").dataset.id, answers:ans });
    if(res.status == "success") { alert("Kaydedildi!"); location.reload(); }
}

// --- TELEGRAM & ANALİZ ---
function openTelegramModal(id) {
    let results = teacherData.results.filter(r => r.examId == id);
    if(results.length == 0) return alert("Veri yok.");
    let html = `<div style="text-align:center;">
    <button class="btn-primary" onclick="sendClassReport('${id}')">Tüm Sınıfı Raporla</button>
    <hr>
    <select id="tStuSelect" style="width:100%; padding:10px; margin-bottom:10px;">${results.map(r=>`<option value="${r.student}">${r.student}</option>`).join('')}</select>
    <button class="btn-success" onclick="sendStudentReport('${id}')">Öğrenciyi Raporla</button></div>`;
    showModal("Telegram Rapor", html);
}
async function sendClassReport(id) { await apiRequest({action:"sendClassReport", examId:id}); alert("Yollandı"); closeModal(); }
async function sendStudentReport(id) { await apiRequest({action:"sendStudentReport", examId:id, studentName:document.getElementById("tStuSelect").value}); alert("Yollandı"); closeModal(); }

function analyzeExam(id) {
    let results = teacherData.results.filter(r => r.examId == id);
    if(results.length == 0) return alert("Veri yok.");
    let lessonStats = {};
    results.forEach(r => { try { JSON.parse(r.answers).forEach(d => { if(!lessonStats[d.lesson]) lessonStats[d.lesson]={c:0,t:0}; lessonStats[d.lesson].c+=d.correct; lessonStats[d.lesson].t+=d.total; }); } catch(e){} });
    let l=Object.keys(lessonStats), d=l.map(k=>Math.round((lessonStats[k].c/lessonStats[k].t)*100));
    showModal(id, '<div style="height:250px"><canvas id="chart"></canvas></div>');
    new Chart(document.getElementById("chart"), {type:'bar', data:{labels:l, datasets:[{label:'Başarı %', data:d, backgroundColor:'#3b82f6'}]}, options:{responsive:true, maintainAspectRatio:false}});
}
function analyzeStudent(name) {
    let r = teacherData.results.filter(x => x.student == name);
    if(r.length == 0) return alert("Veri yok");
    showModal(name, '<div style="height:250px"><canvas id="chart"></canvas></div>');
    new Chart(document.getElementById("chart"), {type:'line', data:{labels:r.map(x=>x.examId), datasets:[{label:'Puan', data:r.map(x=>x.score), borderColor:'#3b82f6'}]}, options:{responsive:true, maintainAspectRatio:false}});
}
function drawChart(l, d) { new Chart(document.getElementById("studentHistoryChart"), {type:'line', data:{labels:l, datasets:[{label:'Puan', data:d, borderColor:'#3b82f6'}]}}); }

function showModal(h, b) { document.getElementById("modalHeader").innerHTML=h; document.getElementById("modalBody").innerHTML=b; document.getElementById("detailModal").style.display="grid"; }
function closeModal() { document.getElementById("detailModal").style.display="none"; }
function closeExam() { document.getElementById("examSolvingArea").classList.add("hidden"); document.getElementById("activeExamList").classList.remove("hidden"); }
