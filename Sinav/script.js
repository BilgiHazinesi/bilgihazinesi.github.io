const API_URL = "https://script.google.com/macros/s/AKfycby1f_Gn79ocp1L7SgcgTiAYubM8DtQtGly_dPA1uQKK_yEebM43F8zwaXsvHGhnR3xV/exec"; 

let currentUser = {};
let teacherData = { exams: [], students: [], results: [] };
let activeExamData = [], builderData = [], studentAnswers = {};
let editingExamKey = []; // Sınav anahtarını düzenlerken kullanılır

// --- API ---
function setLoading(s) { document.getElementById("loader").classList.toggle("hidden", !s); }
async function api(data) {
    try {
        setLoading(true);
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
        const json = await res.json();
        setLoading(false);
        return json;
    } catch(e) { setLoading(false); alert("Bağlantı Hatası"); return {status:"error"}; }
}

// --- NAVİGASYON ---
function navTo(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    // Scrollu sıfırla
    document.querySelector('.app-content').scrollTop = 0;
}

function updateTab(role, activeTabId) {
    const bar = document.getElementById("tabBar");
    if(role === "teacher") {
        bar.innerHTML = `
            <button class="tab-item ${activeTabId=='page-t-home'?'active':''}" onclick="navTo('page-t-home');updateTab('teacher','page-t-home')"><i class="fas fa-home"></i><span>Özet</span></button>
            <button class="tab-item ${activeTabId=='page-t-exams'?'active':''}" onclick="navTo('page-t-exams');updateTab('teacher','page-t-exams')"><i class="fas fa-list"></i><span>Sınavlar</span></button>
            <button class="tab-item ${activeTabId=='page-t-students'?'active':''}" onclick="navTo('page-t-students');updateTab('teacher','page-t-students')"><i class="fas fa-users"></i><span>Öğrenci</span></button>
        `;
    } else {
        bar.innerHTML = `
            <button class="tab-item ${activeTabId=='page-s-home'?'active':''}" onclick="navTo('page-s-home');updateTab('student','page-s-home')"><i class="fas fa-pen"></i><span>Sınavlar</span></button>
            <button class="tab-item ${activeTabId=='page-s-history'?'active':''}" onclick="navTo('page-s-history');updateTab('student','page-s-history')"><i class="fas fa-chart-pie"></i><span>Karnem</span></button>
        `;
    }
}

// --- GİRİŞ ---
async function login() {
    const code = document.getElementById("loginCode").value;
    if(!code) return alert("Kod girin");
    const res = await api({ action: "login", password: code });
    if(res.status === "success") {
        currentUser = res;
        document.getElementById("loginScreen").classList.remove("active");
        document.getElementById("mainApp").classList.remove("hidden");
        document.getElementById("headerName").innerText = res.name;
        document.getElementById("headerRole").innerText = res.role;
        
        if(res.role === "Ogretmen") {
            loadTeacherData();
            updateTab("teacher", "page-t-home");
            navTo("page-t-home");
        } else {
            loadStudentData();
            updateTab("student", "page-s-home");
            navTo("page-s-home");
        }
    } else { alert(res.msg); }
}
function logout() { location.reload(); }

// --- ÖĞRETMEN ---
async function loadTeacherData() {
    const res = await api({ action: "getTeacherData" });
    if(res.status === "success") {
        teacherData = res;
        document.getElementById("stCount").innerText = res.students.length;
        document.getElementById("exCount").innerText = res.exams.length;
        renderTeacherLists();
    }
}

function renderTeacherLists() {
    // Sınav Listesi
    const exList = document.getElementById("examList");
    exList.innerHTML = "";
    teacherData.exams.slice().reverse().forEach(ex => {
        let isActive = ex.status.toLowerCase() === "aktif";
        exList.innerHTML += `
        <div class="list-row">
            <div class="row-info">
                <div>${ex.name}</div>
                <small style="color:${isActive?'#34C759':'#FF3B30'}">${isActive?'Yayında':'Gizli'}</small>
            </div>
            <div class="row-actions">
                <button class="icon-btn" onclick="toggleStatus('${ex.id}')"><i class="fas ${isActive?'fa-pause':'fa-play'}"></i></button>
                <button class="icon-btn" onclick="openKeyEditor('${ex.id}')"><i class="fas fa-key"></i></button>
                <button class="icon-btn" onclick="openAnalysis('${ex.id}')"><i class="fas fa-chart-bar"></i></button>
            </div>
        </div>`;
    });

    // Öğrenci Listesi
    const stList = document.getElementById("studentList");
    stList.innerHTML = "";
    teacherData.students.forEach(st => {
        stList.innerHTML += `
        <div class="list-row">
            <div class="row-info"><div>${st}</div></div>
            <button class="icon-btn" onclick="alert('Detaylar eklenebilir')"><i class="fas fa-chevron-right"></i></button>
        </div>`;
    });
}

async function toggleStatus(id) {
    await api({ action: "toggleExamStatus", examId: id });
    loadTeacherData();
}

// --- SINAV OLUŞTURUCU ---
function addBuilderLesson() {
    let name = document.getElementById("lName").value;
    let count = parseInt(document.getElementById("lCount").value);
    if(name && count) {
        builderData.push({name: name, count: count, key: new Array(count).fill(null)});
        document.getElementById("lName").value=""; document.getElementById("lCount").value="";
        renderBuilder("builderContainer", builderData, true);
    }
}

// Ortak Builder Render Fonksiyonu (Hem yeni sınav hem düzenleme için)
function renderBuilder(containerId, dataArray, isEditable) {
    const area = document.getElementById(containerId);
    area.innerHTML = "";
    dataArray.forEach((l, lIdx) => {
        let rows = "";
        for(let i=0; i<l.count; i++) {
            rows += `<div class="b-row"><span>${i+1}</span><div class="b-opts">${['A','B','C','D'].map(o=>`<div class="bubble ${l.key[i]==o?'selected':''}" onclick="setKey('${containerId}', ${lIdx},${i},'${o}')">${o}</div>`).join('')} 
            ${isEditable ? `<div class="bubble ${l.key[i]=='*'?'selected':''}" style="color:red" onclick="setKey('${containerId}', ${lIdx},${i},'*')">*</div>` : ''}
            </div></div>`;
        }
        area.innerHTML += `<div class="builder-item"><div class="b-header"><span>${l.name}</span></div>${rows}</div>`;
    });
}

// Cevap Seçimi
window.setKey = function(containerId, lIdx, qIdx, opt) {
    if(containerId === "builderContainer") {
        builderData[lIdx].key[qIdx] = opt;
        renderBuilder(containerId, builderData, true);
    } else if(containerId === "editorBody") {
        editingExamKey[lIdx].key[qIdx] = opt;
        renderBuilder(containerId, editingExamKey, true);
    }
}

async function saveNewExam() {
    if(builderData.length == 0) return alert("Ders ekle!");
    let keys = builderData.map(l => `${l.name}:${l.key.join("")}`).join("|");
    await api({
        action: "addExam",
        id: document.getElementById("newId").value,
        name: document.getElementById("newName").value,
        keysFormat: keys,
        showScore: document.getElementById("newShow").value
    });
    alert("Kaydedildi"); builderData=[]; loadTeacherData(); navTo("page-t-home");
}

// --- DÜZENLEYİCİ (SORU İPTALİ / CEVAP ANAHTARI) ---
function openKeyEditor(id) {
    let ex = teacherData.exams.find(e => e.id == id);
    // Anahtarı parse et
    editingExamKey = [];
    if(ex.key.includes(":")) {
        ex.key.split("|").forEach(part => {
            let p = part.split(":");
            editingExamKey.push({ name: p[0], count: p[1].length, key: p[1].split("") });
        });
    }
    
    document.getElementById("editorTitle").innerText = ex.name + " Anahtarı";
    document.getElementById("editorModal").classList.remove("hidden");
    // Kaydet butonu için ID'yi sakla
    document.getElementById("editorModal").dataset.examId = id;
    renderBuilder("editorBody", editingExamKey, true);
}

function closeEditor() { document.getElementById("editorModal").classList.add("hidden"); }

async function saveEditor() {
    let id = document.getElementById("editorModal").dataset.examId;
    let newKeyStr = editingExamKey.map(l => `${l.name}:${l.key.join("")}`).join("|");
    
    await api({ action: "updateExamKey", examId: id, newKey: newKeyStr });
    alert("Güncellendi!"); closeEditor(); loadTeacherData();
}

// --- ÖĞRENCİ ---
async function loadStudentData() {
    const res = await api({ action: "getStudentDashboard", studentName: currentUser.name });
    if(res.status === "success") {
        activeExamData = res.active;
        const div = document.getElementById("activeExams");
        div.innerHTML = "";
        if(res.active.length == 0) div.innerHTML = "<p style='text-align:center; color:#999'>Aktif sınav yok.</p>";
        
        res.active.forEach(ex => {
            div.innerHTML += `
            <div class="list-row">
                <div class="row-info"><div>${ex.name}</div></div>
                <button class="btn-main" style="width:auto; padding:8px 20px;" onclick="openStudentExam('${ex.id}')">BAŞLA</button>
            </div>`;
        });
        
        // Geçmiş
        document.getElementById("historyList").innerHTML = res.history.map(h => 
            `<div class="list-row"><div class="row-info"><div>${h.examId}</div></div><div style="font-weight:bold">${h.score==-1?'?':Math.round(h.score)}</div></div>`
        ).join('');
    }
}

function openStudentExam(id) {
    let ex = activeExamData.find(e => e.id == id);
    document.getElementById("examOverlay").classList.remove("hidden");
    document.getElementById("examTitleOverlay").innerText = ex.name;
    document.getElementById("examOverlay").dataset.id = id;
    
    studentAnswers = {}; // Sıfırla
    const area = document.getElementById("opticalArea"); area.innerHTML = "";
    
    ex.sections.forEach(sec => {
        studentAnswers[sec.name] = new Array(sec.qCount).fill("");
        let rows = "";
        for(let i=0; i<sec.qCount; i++) {
            rows += `
            <div class="opt-row">
                <span style="width:20px; font-weight:bold; color:#888">${i+1}</span>
                <div class="opt-grid">
                    ${['A','B','C','D'].map(o => `<div class="opt-big" onclick="stuSel(this, '${sec.name}', ${i}, '${o}')">${o}</div>`).join('')}
                </div>
            </div>`;
        }
        area.innerHTML += `<div class="q-card"><div class="q-title">${sec.name}</div>${rows}</div>`;
    });
}

function stuSel(el, lesson, idx, opt) {
    el.parentNode.querySelectorAll('.opt-big').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    studentAnswers[lesson][idx] = opt;
}

async function submitExamNow() {
    if(!confirm("Bitirmek istiyor musun?")) return;
    let ans = {}; 
    for(let l in studentAnswers) ans[l] = studentAnswers[l].join("");
    
    let id = document.getElementById("examOverlay").dataset.id;
    await api({ action: "submitExam", studentName: currentUser.name, examId: id, answers: ans });
    alert("Sınav Gönderildi!");
    closeExamOverlay();
    loadStudentData();
}

function closeExamOverlay() { document.getElementById("examOverlay").classList.add("hidden"); }
function openAnalysis(id) { alert("Telegram'a rapor göndermek için backend'deki sendClassReport fonksiyonu kullanılabilir."); }
