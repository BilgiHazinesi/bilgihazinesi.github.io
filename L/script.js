const API_URL = "https://script.google.com/macros/s/AKfycby64Ilou3jHX4cTMlSkfj6zFb6FyZy6LqSpQTLM9v8JB5iyPpbiBKbfAQZciogVvxo/exec"; 

let currentUser = {};
let teacherData = { exams: [], students: [], results: [] };
let activeExamData = [], tempExamBuilder = [], studentAnswers = {};
let currentChart = null;

async function apiRequest(data) {
    try {
        document.body.style.cursor = "wait";
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
        document.body.style.cursor = "default";
        return await res.json();
    } catch (e) { alert("Bağlantı Hatası: " + e); return {status: "error"}; }
}

function openTab(id) {
    document.querySelectorAll('.tab-content, .tab-link').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    event.currentTarget.classList.add('active');
}

async function login() {
    const code = document.getElementById("loginCode").value;
    if(!code) return alert("Kod girin");
    const res = await apiRequest({ action: "login", password: code });
    if(res.status === "success") {
        currentUser = res;
        document.getElementById("loginScreen").classList.remove("active");
        if(res.role === "Ogretmen") {
            document.getElementById("teacherPanel").classList.add("active");
            loadTeacherDashboard();
        } else {
            document.getElementById("studentPanel").classList.add("active");
            document.getElementById("stuNameDisplay").innerText = res.name;
            loadStudentDashboard();
        }
    } else { alert(res.msg); }
}

// --- ÖĞRETMEN ---
async function loadTeacherDashboard() {
    const res = await apiRequest({ action: "getTeacherData" });
    if(res.status === "success") { teacherData = res; renderExamList(); renderStudentList(); }
}

function renderExamList() {
    const list = document.getElementById("examListContainer");
    const filter = document.getElementById("searchExam").value.toLowerCase();
    list.innerHTML = "";
    teacherData.exams.slice().reverse().forEach(ex => {
        if(ex.name.toLowerCase().includes(filter)) {
            let isActive = ex.status.toLowerCase() === "aktif";
            list.innerHTML += `
                <div class="exam-item ${isActive ? "active" : "passive"}">
                    <div style="flex:1;"><strong>${ex.name}</strong><br><small>${ex.id}</small></div>
                    <div style="display:flex; gap:5px;">
                        <button class="btn-action" style="background:${isActive?"#e74c3c":"#2ecc71"}; color:white;" onclick="toggleStatus('${ex.id}')">${isActive?"Durdur":"Başlat"}</button>
                        <button class="btn-action" onclick="analyzeExam('${ex.id}')"><i class="fas fa-chart-pie"></i></button>
                        <button class="btn-action" style="color:#8e44ad; border-color:#8e44ad;" onclick="openTelegramModal('${ex.id}')"><i class="fab fa-telegram-plane"></i></button>
                    </div>
                </div>`;
        }
    });
}
function filterExams() { renderExamList(); }

async function toggleStatus(id) {
    const res = await apiRequest({ action: "toggleExamStatus", examId: id });
    if(res.status === "success") { 
        teacherData.exams.find(e => e.id == id).status = res.newStatus; renderExamList(); 
    }
}

function renderStudentList() {
    const list = document.getElementById("studentListContainer");
    const filter = document.getElementById("searchStudent").value.toLowerCase();
    list.innerHTML = "";
    teacherData.students.forEach(stu => {
        if(stu.toLowerCase().includes(filter)) {
            list.innerHTML += `<div class="student-item" onclick="analyzeStudent('${stu}')"><span>${stu}</span><i class="fas fa-chevron-right"></i></div>`;
        }
    });
}
function filterStudents() { renderStudentList(); }

// --- ANALİZ ---
function analyzeExam(id) {
    let results = teacherData.results.filter(r => r.examId == id);
    if(results.length === 0) return alert("Veri yok.");
    let labels = [], data = [], lessonStats = {};
    results.forEach(r => {
        try { JSON.parse(r.answers).forEach(d => {
            if(!lessonStats[d.lesson]) lessonStats[d.lesson] = {correct:0, total:0};
            lessonStats[d.lesson].correct += d.correct; lessonStats[d.lesson].total += d.total;
        }); } catch(e){}
    });
    for(let l in lessonStats) { labels.push(l); data.push(Math.round((lessonStats[l].correct/lessonStats[l].total)*100)); }
    
    showModal(`<h3>${id} Analizi</h3>`, `<canvas id="chartArea"></canvas>`);
    drawChart('chartArea', 'bar', labels, data, 'Başarı %');
}

function analyzeStudent(name) {
    let results = teacherData.results.filter(r => r.student == name);
    if(results.length === 0) return alert("Kayıt yok.");
    showModal(`<h3>${name}</h3>`, `<canvas id="chartArea"></canvas>`);
    drawChart('chartArea', 'line', results.map(r=>r.examId), results.map(r=>r.score), 'Puan');
}

function openTelegramModal(id) {
    let results = teacherData.results.filter(r => r.examId == id);
    if(results.length === 0) return alert("Veri yok.");
    let html = `<div style="text-align:center;"><h4>Telegram Rapor</h4><button class="btn-primary" onclick="sendClassReport('${id}')">Tüm Sınıfı Gönder</button><hr>
    <select id="stuSelect">${results.map(r=>`<option value="${r.student}">${r.student}</option>`).join('')}</select>
    <button class="btn-success" onclick="sendStudentReport('${id}')" style="margin-top:5px;">Öğrenciyi Gönder</button></div>`;
    showModal("", html);
}
async function sendClassReport(id) { await apiRequest({action:"sendClassReport", examId:id}); alert("Yollandı"); closeModal(); }
async function sendStudentReport(id) { await apiRequest({action:"sendStudentReport", examId:id, studentName:document.getElementById("stuSelect").value}); alert("Yollandı"); }

// --- SINAV OLUŞTURUCU ---
function addLesson() {
    let n = document.getElementById("lName").value, c = document.getElementById("lCount").value;
    if(n && c) { tempExamBuilder.push({name:n, count:parseInt(c)}); renderPreview(); }
}
function renderPreview() {
    document.getElementById("previewArea").innerHTML = tempExamBuilder.map((l,i)=>`<div>${l.name} (${l.count}) <span onclick="tempExamBuilder.splice(${i},1);renderPreview()" style="color:red;cursor:pointer;">x</span></div>`).join('');
}
async function saveExam() {
    if(tempExamBuilder.length==0) return alert("Ders ekle");
    let k = tempExamBuilder.map(l=>`${l.name}:${"A".repeat(l.count)}`).join("|");
    await apiRequest({action:"addExam", id:document.getElementById("newExamId").value, name:document.getElementById("newExamName").value, keysFormat:k, showScore:document.getElementById("newShowScore").value});
    alert("Kaydedildi"); loadTeacherDashboard();
}

// --- ÖĞRENCİ ---
async function loadStudentDashboard() {
    const res = await apiRequest({ action: "getStudentDashboard", studentName: currentUser.name });
    if(res.status === "success") {
        activeExamData = res.active;
        let div = document.getElementById("activeExamList"); div.innerHTML = "";
        res.active.forEach(ex => div.innerHTML += `<div class="card"><h4>${ex.name}</h4><button class="btn-success" onclick="startExam('${ex.id}')">Başla</button></div>`);
        drawChart('studentHistoryChart', 'bar', res.history.map(h=>h.examId), res.history.map(h=>h.score), 'Puanım');
    }
}
function startExam(id) {
    let ex = activeExamData.find(e => e.id == id);
    document.getElementById("activeExamList").classList.add("hidden");
    document.getElementById("examSolvingArea").classList.remove("hidden");
    document.getElementById("solvingExamTitle").innerText = ex.name;
    document.getElementById("solvingExamTitle").dataset.id = id;
    let area = document.getElementById("opticalFormArea"); area.innerHTML = ""; studentAnswers = {};
    ex.sections.forEach(sec => {
        studentAnswers[sec.name] = new Array(sec.qCount).fill("");
        let html = `<h5>${sec.name}</h5>`;
        for(let i=0; i<sec.qCount; i++) {
            html += `<div class="opt-row"><span>${i+1}</span><div>${['A','B','C','D'].map(o=>`<div class="opt-circle" onclick="selectOpt(this,'${sec.name}',${i},'${o}')">${o}</div>`).join('')}</div></div>`;
        }
        area.innerHTML += `<div class="card">${html}</div>`;
    });
}
function selectOpt(el, l, i, o) {
    el.parentNode.querySelectorAll('.opt-circle').forEach(e=>e.classList.remove('selected'));
    el.classList.add('selected'); studentAnswers[l][i] = o;
}
async function submitExam() {
    if(!confirm("Bitir?")) return;
    let ans = {}; for(let l in studentAnswers) ans[l] = studentAnswers[l].join("");
    const res = await apiRequest({ action:"submitExam", studentName:currentUser.name, examId:document.getElementById("solvingExamTitle").dataset.id, answers:ans });
    if(res.status == "success") { alert("Bitti!"); location.reload(); }
}

// --- YARDIMCILAR ---
function showModal(h, b) { document.getElementById("modalHeader").innerHTML=h; document.getElementById("modalBody").innerHTML=b; document.getElementById("detailModal").style.display="block"; }
function closeModal() { document.getElementById("detailModal").style.display="none"; }
function logout() { location.reload(); }
function drawChart(id, t, l, d, n) {
    if(currentChart) currentChart.destroy();
    currentChart = new Chart(document.getElementById(id), { type:t, data:{labels:l, datasets:[{label:n, data:d, backgroundColor:'#4a90e2'}]} });
}
