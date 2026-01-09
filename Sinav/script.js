// *** BURAYA YENİ LİNKİNİZİ YAPIŞTIRIN ***
const API_URL = "https://script.google.com/macros/s/AKfycbw0eJ0ehQKUEgCA2UJdAVCXZ2iovv-KeB7Kdcju3CPwF2LlVGvqX9pmd3c3qIe2feYv/exec"; 

let currentUser = {}, teacherData = { exams: [], students: [] }, activeExamData = [], builderData = [], studentAnswers = {}, editMode = null, editingId = null;

function setLoading(s) { document.getElementById("loader").classList.toggle("hidden", !s); }

async function api(data) {
    try {
        setLoading(true);
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
        const json = await res.json();
        setLoading(false);
        if(json.status === "error") { alert(json.msg); return null; }
        return json;
    } catch(e) { 
        setLoading(false); 
        alert("Bağlantı Hatası: " + e); 
        return null; 
    }
}

async function login() {
    const code = document.getElementById("loginCode").value.trim();
    if(!code) return alert("Kod girin");
    
    const res = await api({ action: "login", password: code });
    if(res && res.status === "success") {
        currentUser = res;
        document.getElementById("loginScreen").classList.add("hidden");
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
    } else if(res) {
        alert(res.msg || "Giriş başarısız");
    }
}

function navTo(id) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function setupNav(role) {
    const bar = document.getElementById("tabBar");
    if(role === "teacher") {
        bar.innerHTML = `<button class="tab-item" onclick="navTo('page-t-home')"><i class="fas fa-home"></i>Özet</button>
                         <button class="tab-item" onclick="navTo('page-t-exams')"><i class="fas fa-list"></i>Sınav</button>
                         <button class="tab-item" onclick="navTo('page-t-students')"><i class="fas fa-users"></i>Öğrenci</button>`;
    } else {
        bar.innerHTML = `<button class="tab-item" onclick="navTo('page-s-home')"><i class="fas fa-pen"></i>Sınavlar</button>
                         <button class="tab-item" onclick="navTo('page-s-history')"><i class="fas fa-chart-pie"></i>Karnem</button>`;
    }
}

function logout() { location.reload(); }

// ÖĞRETMEN
async function loadTeacherData() {
    const res = await api({ action: "getTeacherData" });
    if(res && res.status === "success") {
        teacherData = res;
        document.getElementById("stCount").innerText = res.students.length;
        document.getElementById("exCount").innerText = res.exams.length;
        renderLists();
    }
}

function renderLists() {
    const el = document.getElementById("examList"); el.innerHTML = "";
    teacherData.exams.slice().reverse().forEach(ex => {
        let active = ex.status.toLowerCase() == "aktif";
        el.innerHTML += `<div class="list-item"><div class="item-info"><div>${ex.name}</div><small style="color:${active?'green':'red'}">${active?'Yayında':'Gizli'}</small></div>
        <div class="item-actions"><button onclick="toggleStatus('${ex.id}')"><i class="fas ${active?'fa-pause':'fa-play'}"></i></button><button onclick="openEditor('examKey','${ex.id}')"><i class="fas fa-key"></i></button></div></div>`;
    });
    const sl = document.getElementById("studentList"); sl.innerHTML = "";
    teacherData.students.forEach(st => sl.innerHTML += `<div class="list-item"><div>${st}</div></div>`);
}

async function toggleStatus(id) { await api({action:"toggleExamStatus", examId:id}); loadTeacherData(); }

// OLUŞTURUCU
function addBuilderLesson() {
    let n = document.getElementById("lName").value, c = parseInt(document.getElementById("lCount").value);
    if(n && c) {
        builderData.push({name:n, count:c, key:new Array(c).fill(null)});
        document.getElementById("lName").value=""; document.getElementById("lCount").value="";
        renderBuilder("builderContainer", builderData, false);
    }
}
function renderBuilder(cid, data, isEdit) {
    const area = document.getElementById(cid); area.innerHTML = "";
    data.forEach((l, lIdx) => {
        let rows = "";
        for(let i=0; i<l.count; i++) rows += `<div class="opt-row"><span>${i+1}</span><div class="opt-grid">${['A','B','C','D'].map(o=>`<div class="opt-big ${l.key[i]==o?'selected':''}" onclick="setKey('${cid}',${lIdx},${i},'${o}')">${o}</div>`).join('')}${isEdit?`<div class="opt-big ${l.key[i]=='*'?'selected':''}" style="color:red" onclick="setKey('${cid}',${lIdx},${i},'*')">*</div>`:''}</div></div>`;
        area.innerHTML += `<div class="builder-item"><b>${l.name}</b>${rows}</div>`;
    });
}
window.setKey = function(cid, l, q, o) {
    if(cid=="builderContainer") builderData[l].key[q]=o;
    else editingExamKey[l].key[q]=o;
    renderBuilder(cid, cid=="builderContainer"?builderData:editingExamKey, cid=="editorBody");
}
async function saveNewExam() {
    if(builderData.length==0) return alert("Ders ekle");
    let k = builderData.map(l=>`${l.name}:${l.key.join("")}`).join("|");
    await api({action:"addExam", id:document.getElementById("newId").value, name:document.getElementById("newName").value, keysFormat:k, showScore:document.getElementById("newShow").value});
    alert("Kaydedildi"); builderData=[]; loadTeacherData(); navTo("page-t-home");
}

// EDİTÖR
function openEditor(mode, id) {
    editMode=mode; editingId=id; document.getElementById("editorModal").classList.remove("hidden");
    if(mode=='examKey') {
        let ex = teacherData.exams.find(e=>String(e.id)===String(id));
        editingExamKey=[];
        if(ex.key.includes(":")) ex.key.split("|").forEach(p=>{let x=p.split(":"); editingExamKey.push({name:x[0], count:x[1].length, key:x[1].split("")});});
        renderBuilder("editorBody", editingExamKey, true);
    }
}
async function saveEditor() {
    let k = editingExamKey.map(l=>`${l.name}:${l.key.join("")}`).join("|");
    await api({action:"updateExamKey", examId:editingId, newKey:k});
    alert("Güncellendi"); document.getElementById("editorModal").classList.add("hidden"); loadTeacherData();
}
function closeEditor() { document.getElementById("editorModal").classList.add("hidden"); }

// ÖĞRENCİ
async function loadStudentData() {
    const res = await api({ action: "getStudentDashboard", studentName: currentUser.name });
    if(res && res.status === "success") {
        activeExamData = res.active;
        const div = document.getElementById("activeExams"); div.innerHTML = "";
        res.active.forEach(ex => div.innerHTML += `<div class="list-item"><div>${ex.name}</div><button class="btn-icon-bg" style="font-size:14px; width:auto; padding:0 15px;" onclick="openStudentExam('${ex.id}')">BAŞLA</button></div>`);
        document.getElementById("historyList").innerHTML = res.history.map(h=>`<div class="list-item"><div>${h.examId}</div><b>${h.score==-1?'?':Math.round(h.score)}</b></div>`).join('');
    }
}
function openStudentExam(id) {
    let ex = activeExamData.find(e=>String(e.id)===String(id));
    if(!ex) return alert("Hata");
    document.getElementById("examOverlay").classList.remove("hidden");
    document.getElementById("examTitleOverlay").innerText = ex.name;
    document.getElementById("examOverlay").dataset.id = id;
    studentAnswers={}; document.getElementById("opticalArea").innerHTML="";
    ex.sections.forEach(sec => {
        studentAnswers[sec.name]=new Array(sec.qCount).fill("");
        let rows=""; for(let i=0; i<sec.qCount; i++) rows+=`<div class="opt-row"><span>${i+1}</span><div class="opt-grid">${['A','B','C','D'].map(o=>`<div class="opt-big" onclick="stuSel(this,'${sec.name}',${i},'${o}')">${o}</div>`).join('')}</div></div>`;
        document.getElementById("opticalArea").innerHTML+=`<div class="card"><b>${sec.name}</b>${rows}</div>`;
    });
}
function stuSel(el, l, i, o) {
    el.parentNode.querySelectorAll('.opt-big').forEach(b=>b.classList.remove('selected'));
    el.classList.add('selected'); studentAnswers[l][i]=o;
}
async function submitExamNow() {
    if(!confirm("Bitir?")) return;
    let ans={}; for(let l in studentAnswers) ans[l]=studentAnswers[l].join("");
    let id=document.getElementById("examOverlay").dataset.id;
    await api({action:"submitExam", studentName:currentUser.name, examId:id, answers:ans});
    alert("Kaydedildi"); document.getElementById("examOverlay").classList.add("hidden"); loadStudentData();
}
function closeExamOverlay() { document.getElementById("examOverlay").classList.add("hidden"); }
