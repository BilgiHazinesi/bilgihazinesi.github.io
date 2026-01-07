const API_URL = "BURAYA_LINKI_YAPISTIRIN"; 

let currentUser = {};
let teacherData = { exams: [], students: [], results: [] };
let activeExamData = [], builderData = [], studentAnswers = {};
let editMode = null; // "examKey" veya "studentAns"
let editingId = null;

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

function navTo(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
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
        document.getElementById("userName").innerText = res.name;
        document.getElementById("userRole").innerText = res.role;
        
        if(res.role === "Ogretmen") {
            setupNav("teacher");
            loadTeacherData();
            navTo("page-t-home");
        } else {
            setupNav("student");
            loadStudentData();
            navTo("page-s-home");
        }
    } else { alert(res.msg); }
}

function setupNav(role) {
    const nav = document.getElementById("tabBar");
    if(role === "teacher") {
        nav.innerHTML = `
            <button class="nav-item active" onclick="navTo('page-t-home')"><i class="fas fa-home"></i><span>Özet</span></button>
            <button class="nav-item" onclick="navTo('page-t-exams')"><i class="fas fa-list"></i><span>Sınav</span></button>
            <button class="nav-item" onclick="navTo('page-t-students')"><i class="fas fa-users"></i><span>Öğrenci</span></button>`;
    } else {
        nav.innerHTML = `
            <button class="nav-item active" onclick="navTo('page-s-home')"><i class="fas fa-pen"></i><span>Sınavlar</span></button>
            <button class="nav-item" onclick="navTo('page-s-history')"><i class="fas fa-chart-pie"></i><span>Karnem</span></button>`;
    }
}
function logout() { location.reload(); }

// --- ÖĞRETMEN ---
async function loadTeacherData() {
    const res = await api({ action: "getTeacherData" });
    if(res.status === "success") {
        teacherData = res;
        document.getElementById("stCount").innerText = res.students.length;
        document.getElementById("exCount").innerText = res.exams.length;
        renderLists();
    }
}

function renderLists() {
    // Sınav Listesi
    const el = document.getElementById("examList");
    el.innerHTML = "";
    teacherData.exams.slice().reverse().forEach(ex => {
        let active = ex.status.toLowerCase() == "aktif";
        el.innerHTML += `
        <div class="list-item">
            <div class="item-info"><div>${ex.name}</div><small style="color:${active?'green':'red'}">${active?'Yayında':'Gizli'}</small></div>
            <div class="item-actions">
                <button onclick="toggleStatus('${ex.id}')"><i class="fas ${active?'fa-pause':'fa-play'}"></i></button>
                <button onclick="openEditor('examKey', '${ex.id}')"><i class="fas fa-key"></i></button>
                <button onclick="sendReport('${ex.id}')" style="color:#8e44ad"><i class="fab fa-telegram-plane"></i></button>
            </div>
        </div>`;
    });

    // Öğrenci Listesi
    const sl = document.getElementById("studentList");
    sl.innerHTML = "";
    teacherData.students.forEach(st => {
        sl.innerHTML += `
        <div class="list-item">
            <div class="item-info"><div>${st}</div></div>
            <div class="item-actions">
                <button onclick="alert('Detaylar eklenebilir')"><i class="fas fa-chart-bar"></i></button>
            </div>
        </div>`;
    });
}

async function toggleStatus(id) {
    await api({ action: "toggleExamStatus", examId: id });
    loadTeacherData();
}

async function sendReport(id) {
    if(!confirm("Sınıf raporu Telegram'a gönderilsin mi?")) return;
    await api({ action: "sendClassReport", examId: id });
    alert("Gönderildi!");
}

// --- EDİTÖR (Soru İptali / Cevap Değiştirme) ---
function openEditor(mode, id) {
    editMode = mode;
    editingId = id;
    document.getElementById("editorModal").classList.remove("hidden");
    
    if(mode === 'examKey') {
        let ex = teacherData.exams.find(e => e.id == id);
        document.getElementById("editorTitle").innerText = "Anahtarı Düzenle (* = İptal)";
        // Mevcut anahtarı parse et
        builderData = [];
        if(ex.key.includes(":")) {
            ex.key.split("|").forEach(p => {
                let parts = p.split(":");
                builderData.push({ name: parts[0], count: parts[1].length, key: parts[1].split("") });
            });
        }
        renderBuilder("editorBody", true); // true = edit modunda (İptal butonu göster)
    }
}

function closeEditor() { document.getElementById("editorModal").classList.add("hidden"); }

async function saveEditor() {
    if(editMode === 'examKey') {
        let newKey = builderData.map(l => `${l.name}:${l.key.join("")}`).join("|");
        await api({ action: "updateExamKey", examId: editingId, newKey: newKey });
        alert("Anahtar Güncellendi!");
        closeEditor();
        loadTeacherData();
    }
}

// Ortak Builder (Oluşturma ve Düzenleme İçin)
function renderBuilder(containerId, isEdit) {
    const area = document.getElementById(containerId);
    area.innerHTML = "";
    builderData.forEach((l, lIdx) => {
        let rows = "";
        for(let i=0; i<l.count; i++) {
            rows += `
            <div class="b-row">
                <span>${i+1}</span>
                <div class="b-opts">
                    ${['A','B','C','D'].map(o => `<div class="bubble ${l.key[i]==o?'selected':''}" onclick="setKey('${containerId}',${lIdx},${i},'${o}')">${o}</div>`).join('')}
                    ${isEdit ? `<div class="bubble ${l.key[i]=='*'?'selected':''}" style="color:red" onclick="setKey('${containerId}',${lIdx},${i},'*')">*</div>` : ''}
                </div>
            </div>`;
        }
        area.innerHTML += `<div class="builder-item"><div class="b-header"><span>${l.name}</span></div>${rows}</div>`;
    });
}

// Global Erişim İçin
window.setKey = function(containerId, lIdx, qIdx, opt) {
    builderData[lIdx].key[qIdx] = opt;
    renderBuilder(containerId, containerId === "editorBody");
}

// --- SINAV OLUŞTURMA ---
function addBuilderLesson() {
    let name = document.getElementById("lName").value;
    let count = parseInt(document.getElementById("lCount").value);
    if(name && count) {
        builderData.push({name: name, count: count, key: new Array(count).fill(null)});
        document.getElementById("lName").value=""; 
        document.getElementById("lCount").value="";
        renderBuilder("builderContainer", false);
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
    alert("Kaydedildi!"); builderData=[]; loadTeacherData(); navTo("page-t-home");
}

// --- ÖĞRENCİ ---
async function loadStudentData() {
    const res = await api({ action: "getStudentDashboard", studentName: currentUser.name });
    if(res.status === "success") {
        activeExamData = res.active;
        const div = document.getElementById("activeExams"); div.innerHTML = "";
        if(res.active.length == 0) div.innerHTML = "<p style='text-align:center;color:#999'>Aktif sınav yok.</p>";
        res.active.forEach(ex => {
            div.innerHTML += `
            <div class="list-item">
                <div class="item-info"><div>${ex.name}</div></div>
                <button class="btn-sm" onclick="openStudentExam('${ex.id}')">BAŞLA</button>
            </div>`;
        });
        // Geçmiş listesi burada render edilebilir...
    }
}

function openStudentExam(id) {
    // ID karşılaştırması için stringe çevir (HATA ÇÖZÜMÜ BURADA)
    let ex = activeExamData.find(e => String(e.id) === String(id));
    if(!ex) return alert("Sınav verisi yüklenemedi. Sayfayı yenileyin.");
    
    document.getElementById("examOverlay").classList.remove("hidden");
    document.getElementById("examTitleOverlay").innerText = ex.name;
    document.getElementById("examOverlay").dataset.id = id;
    
    studentAnswers = {}; 
    const area = document.getElementById("opticalArea"); area.innerHTML = "";
    
    ex.sections.forEach(sec => {
        studentAnswers[sec.name] = new Array(sec.qCount).fill("");
        let rows = "";
        for(let i=0; i<sec.qCount; i++) {
            rows += `
            <div class="opt-row">
                <span style="width:20px; font-weight:bold">${i+1}</span>
                <div style="display:flex; gap:10px;">
                    ${['A','B','C','D'].map(o => `<div class="opt-big" onclick="stuSel(this, '${sec.name}', ${i}, '${o}')">${o}</div>`).join('')}
                </div>
            </div>`;
        }
        area.innerHTML += `<div class="card" style="margin-bottom:10px;"><h4>${sec.name}</h4>${rows}</div>`;
    });
}

function stuSel(el, lesson, idx, opt) {
    el.parentNode.querySelectorAll('.opt-big').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    studentAnswers[lesson][idx] = opt;
}

async function submitExamNow() {
    if(!confirm("Bitiriyor musun?")) return;
    let ans = {};
    for(let l in studentAnswers) ans[l] = studentAnswers[l].join("");
    
    let id = document.getElementById("examOverlay").dataset.id;
    await api({ action: "submitExam", studentName: currentUser.name, examId: id, answers: ans });
    alert("Kaydedildi!");
    document.getElementById("examOverlay").classList.add("hidden");
    loadStudentData();
}

function closeExamOverlay() { document.getElementById("examOverlay").classList.add("hidden"); }
