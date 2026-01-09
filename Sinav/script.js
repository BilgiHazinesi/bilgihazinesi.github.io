// *** BURAYA YENİ APPS SCRIPT LİNKİNİZİ YAPIŞTIRIN ***
const API_URL = "https://script.google.com/macros/s/AKfycbzo1aq13o3ebRYJrWidh0sPAH0jMliWbuwZRr8-I3ckHohgmktVJcatB5xAq1THT8qu/exec"; 

let currentUser = {};
let teacherData = { exams: [], students: [], results: [] };
let activeExamData = [], builderData = [], studentAnswers = {};
let editingExamKey = [], editingId = null, editMode = null;

// --- API ---
function setLoading(s) { document.getElementById("loader").classList.toggle("hidden", !s); }
async function api(data) {
    try {
        setLoading(true);
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
        const json = await res.json();
        setLoading(false);
        // Hata kontrolü
        if(json.status === "error") {
            alert("Sunucu Hatası: " + json.msg);
            return {status: "error"};
        }
        return json;
    } catch(e) { 
        setLoading(false); 
        alert("Bağlantı Kurulamadı! İnternetinizi kontrol edin."); 
        return {status: "error", msg: "Connection Error"}; 
    }
}

// --- NAVİGASYON ---
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
        document.getElementById("headerName").innerText = res.name;
        document.getElementById("headerRole").innerText = res.role;
        
        if(res.role === "Ogretmen") {
            setupNav("teacher");
            loadTeacherData();
            navTo("page-t-home");
        } else {
            setupNav("student");
            loadStudentData();
            navTo("page-s-home");
        }
    } else { alert(res.msg || "Giriş başarısız"); }
}

function setupNav(role) {
    const nav = document.getElementById("tabBar");
    if(role === "teacher") {
        nav.innerHTML = `
            <button class="tab-item active" onclick="navTo('page-t-home')"><i class="fas fa-home"></i><span>Özet</span></button>
            <button class="tab-item" onclick="navTo('page-t-exams')"><i class="fas fa-list"></i><span>Sınav</span></button>
            <button class="tab-item" onclick="navTo('page-t-students')"><i class="fas fa-users"></i><span>Öğrenci</span></button>`;
    } else {
        nav.innerHTML = `
            <button class="tab-item active" onclick="navTo('page-s-home')"><i class="fas fa-pen"></i><span>Sınavlar</span></button>
            <button class="tab-item" onclick="navTo('page-s-history')"><i class="fas fa-chart-pie"></i><span>Karnem</span></button>`;
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
    // Sınavlar
    const el = document.getElementById("examList"); el.innerHTML = "";
    teacherData.exams.slice().reverse().forEach(ex => {
        let active = ex.status.toLowerCase() == "aktif";
        el.innerHTML += `
        <div class="list-row">
            <div class="row-info"><div>${ex.name}</div><small style="color:${active?'green':'red'}">${active?'Yayında':'Gizli'}</small></div>
            <div class="row-actions">
                <button class="icon-btn" onclick="toggleStatus('${ex.id}')"><i class="fas ${active?'fa-pause':'fa-play'}"></i></button>
                <button class="icon-btn" onclick="openEditor('examKey', '${ex.id}')"><i class="fas fa-key"></i></button>
            </div>
        </div>`;
    });
    // Öğrenciler
    const sl = document.getElementById("studentList"); sl.innerHTML = "";
    teacherData.students.forEach(st => {
        sl.innerHTML += `<div class="list-row"><div class="row-info"><div>${st}</div></div></div>`;
    });
}

async function toggleStatus(id) { await api({ action: "toggleExamStatus", examId: id }); loadTeacherData(); }

// --- SINAV OLUŞTURMA ---
function addBuilderLesson() {
    let n = document.getElementById("lName").value, c = parseInt(document.getElementById("lCount").value);
    if(n && c) {
        builderData.push({name:n, count:c, key:new Array(c).fill(null)});
        document.getElementById("lName").value=""; document.getElementById("lCount").value="";
        renderBuilder("builderContainer", builderData, false);
    }
}
function renderBuilder(contId, data, isEdit) {
    const area = document.getElementById(contId); area.innerHTML = "";
    data.forEach((l, lIdx) => {
        let rows = "";
        for(let i=0; i<l.count; i++) {
            rows += `<div class="b-row"><span>${i+1}</span><div class="b-opts">${['A','B','C','D'].map(o=>`<div class="bubble ${l.key[i]==o?'selected':''}" onclick="setKey('${contId}',${lIdx},${i},'${o}')">${o}</div>`).join('')}${isEdit?`<div class="bubble ${l.key[i]=='*'?'selected':''}" style="color:red" onclick="setKey('${contId}',${lIdx},${i},'*')">*</div>`:''}</div></div>`;
        }
        area.innerHTML += `<div class="builder-item"><div class="b-header"><span>${l.name}</span></div>${rows}</div>`;
    });
}
window.setKey = function(cid, l, q, o) {
    if(cid=="builderContainer") builderData[l].key[q]=o;
    else editingExamKey[l].key[q]=o;
    renderBuilder(cid, cid=="builderContainer"?builderData:editingExamKey, cid=="editorBody");
}
async function saveNewExam() {
    if(builderData.length==0) return alert("Ders ekle!");
    let keys = builderData.map(l => `${l.name}:${l.key.join("")}`).join("|");
    await api({ action:"addExam", id:document.getElementById("newId").value, name:document.getElementById("newName").value, keysFormat:keys, showScore:document.getElementById("newShow").value });
    alert("Kaydedildi"); builderData=[]; loadTeacherData(); navTo("page-t-home");
}

// --- EDİTÖR ---
function openEditor(mode, id) {
    editMode=mode; editingId=id;
    document.getElementById("editorModal").classList.remove("hidden");
    if(mode=='examKey') {
        let ex = teacherData.exams.find(e=>e.id==id);
        editingExamKey=[];
        if(ex.key.includes(":")) ex.key.split("|").forEach(p=>{ let x=p.split(":"); editingExamKey.push({name:x[0], count:x[1].length, key:x[1].split("")}); });
        renderBuilder("editorBody", editingExamKey, true);
    }
}
async function saveEditor() {
    if(editMode=='examKey') {
        let k = editingExamKey.map(l=>`${l.name}:${l.key.join("")}`).join("|");
        await api({action:"updateExamKey", examId:editingId, newKey:k});
        alert("Güncellendi"); document.getElementById("editorModal").classList.add("hidden"); loadTeacherData();
    }
}
function closeEditor() { document.getElementById("editorModal").classList.add("hidden"); }

// --- ÖĞRENCİ ---
async function loadStudentData() {
    const res = await api({ action: "getStudentDashboard", studentName: currentUser.name });
    if(res.status === "success") {
        activeExamData = res.active;
        const div = document.getElementById("activeExams"); div.innerHTML = "";
        if(res.active.length == 0) div.innerHTML = "<p style='text-align:center;color:#999'>Aktif sınav yok.</p>";
        res.active.forEach(ex => {
            div.innerHTML += `<div class="list-row"><div class="row-info"><div>${ex.name}</div></div><button class="btn-sm" onclick="openStudentExam('${ex.id}')">BAŞLA</button></div>`;
        });
        document.getElementById("historyList").innerHTML = res.history.map(h=>`<div class="list-row"><div class="row-info"><div>${h.examId}</div></div><div style="font-weight:bold">${h.score==-1?'?':Math.round(h.score)}</div></div>`).join('');
    }
}

function openStudentExam(id) {
    // ID Karşılaştırma Düzeltmesi (String'e çevir)
    let ex = activeExamData.find(e => String(e.id) === String(id));
    if(!ex) return alert("Sınav verisi alınamadı. Sayfayı yenileyin.");
    
    document.getElementById("examOverlay").classList.remove("hidden");
    document.getElementById("examTitleOverlay").innerText = ex.name;
    document.getElementById("examOverlay").dataset.id = id;
    
    studentAnswers = {}; const area = document.getElementById("opticalArea"); area.innerHTML = "";
    ex.sections.forEach(sec => {
        studentAnswers[sec.name] = new Array(sec.qCount).fill("");
        let rows = "";
        for(let i=0; i<sec.qCount; i++) {
            rows += `<div class="opt-row"><span style="width:20px;font-weight:bold">${i+1}</span><div class="opt-grid">${['A','B','C','D'].map(o=>`<div class="opt-big" onclick="stuSel(this,'${sec.name}',${i},'${o}')">${o}</div>`).join('')}</div></div>`;
        }
        area.innerHTML += `<div class="card"><h4>${sec.name}</h4>${rows}</div>`;
    });
}
function stuSel(el, l, i, o) {
    el.parentNode.querySelectorAll('.opt-big').forEach(b=>b.classList.remove('selected'));
    el.classList.add('selected'); studentAnswers[l][i]=o;
}
async function submitExamNow() {
    if(!confirm("Bitirmek istiyor musun?")) return;
    let ans = {}; for(let l in studentAnswers) ans[l] = studentAnswers[l].join("");
    let id = document.getElementById("examOverlay").dataset.id;
    await api({ action:"submitExam", studentName:currentUser.name, examId:id, answers:ans });
    alert("Kaydedildi!"); document.getElementById("examOverlay").classList.add("hidden"); loadStudentData();
}
function closeExamOverlay() { document.getElementById("examOverlay").classList.add("hidden"); }
