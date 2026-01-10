// *** SİZİN VERDİĞİNİZ YENİ LİNK ***
const API_URL = "https://script.google.com/macros/s/AKfycbzmwhocZqn8636BVpbmafR29gbup_i3l3avbrkYlUEGXthbCSi-_hCO2IzCZaCIksBH/exec"; 

let currentUser={}, teacherData={}, studentData={}, builderData=[], activeExamData=[], studentAnswers={}, editKeyData=[], editingId=null, editMode=null;

// --- TOAST ---
function showToast(msg, type='info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// --- API ---
function setLoading(s) { document.getElementById("loader").classList.toggle("hidden", !s); }
async function api(act, data={}) {
    data.action = act;
    try {
        setLoading(true);
        let res = await fetch(API_URL, {method:'POST', body:JSON.stringify(data)});
        let json = await res.json();
        setLoading(false);
        if(json.status=="fail" || json.status=="error") { showToast(json.msg, "error"); return null; }
        return json;
    } catch(e) { setLoading(false); showToast("Bağlantı Hatası", "error"); return null; }
}

// --- GİRİŞ & OTURUM ---
window.addEventListener('load', () => {
    const saved = localStorage.getItem('educationUser');
    if(saved) {
        initializeUser(JSON.parse(saved));
    } else {
        document.getElementById("loginScreen").classList.remove("hidden"); // Ensure login screen shows if no session
    }
});

function initializeUser(res) {
    currentUser = res;
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("mainApp").classList.remove("hidden");
    document.getElementById("userName").innerText = res.name;
    document.getElementById("userRole").innerText = res.role;
    
    if(res.role == "Ogretmen") { setupNav("teacher"); loadTeacher(); } 
    else { setupNav("student"); loadStudent(); }
}

async function login() {
    const code = document.getElementById("loginCode").value.trim();
    if(!code) return showToast("Kod girin", "error");
    let res = await api("login", {password:code});
    if(res) {
        localStorage.setItem('educationUser', JSON.stringify(res));
        initializeUser(res);
        showToast("Giriş Başarılı", "success");
    }
}

// --- NAVİGASYON ---
function navTo(id) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}
function setupNav(role) {
    const bar = document.getElementById("tabBar");
    if(role === "teacher") {
        bar.innerHTML = `<button class="tab-item" onclick="navTo('page-t-home')"><i class="fas fa-home"></i>Özet</button>
                         <button class="tab-item" onclick="navTo('page-t-analysis')"><i class="fas fa-chart-pie"></i>Analiz</button>
                         <button class="tab-item" onclick="navTo('page-t-create')"><i class="fas fa-plus-circle"></i>Ekle</button>
                         <button class="tab-item" onclick="navTo('page-t-students')"><i class="fas fa-users"></i>Öğrenci</button>`;
        navTo('page-t-home');
    } else {
        bar.innerHTML = `<button class="tab-item" onclick="navTo('page-s-home')"><i class="fas fa-pen"></i>Sınavlar</button>
                         <button class="tab-item" onclick="navTo('page-s-history')"><i class="fas fa-chart-line"></i>Karnem</button>`;
        navTo('page-s-home');
    }
}
function logout() { 
    localStorage.removeItem('educationUser'); 
    location.reload(); 
}

// --- ÖĞRETMEN ---
async function loadTeacher() {
    let res = await api("getTeacherData");
    if(res) {
        teacherData = res;
        document.getElementById("stCount").innerText = res.students.length;
        document.getElementById("exCount").innerText = res.exams.length;
        renderExamList();
        renderStudentList();
        updateAnalysisSelect();
    }
}

function renderExamList() {
    let h = "";
    teacherData.exams.slice().reverse().forEach(ex => {
        let active = ex.status == "Aktif";
        let sco = ex.showScore == "Evet";
        let rnk = ex.showRank == "Evet";
        let ret = ex.allowRetake == "Evet";
        
        h += `<div class="list-item">
            <div class="item-info"><div>${ex.name}</div><small>${ex.id}</small></div>
            <div class="item-actions">
                <button onclick="toggleSet('${ex.id}','status')" style="color:${active?'green':'red'}"><i class="fas ${active?'fa-toggle-on':'fa-toggle-off'}"></i></button>
                <button onclick="toggleSet('${ex.id}','score')" style="color:${sco?'blue':'gray'}"><i class="fas ${sco?'fa-eye':'fa-eye-slash'}"></i></button>
                <button onclick="toggleSet('${ex.id}','rank')" style="color:${rnk?'orange':'gray'}"><i class="fas ${rnk?'fa-list-ol':'fa-ban'}"></i></button>
                <button onclick="toggleSet('${ex.id}','retake')" style="color:${ret?'purple':'gray'}"><i class="fas ${ret?'fa-redo':'fa-times'}"></i></button>
                <button onclick="openEditor('examKey','${ex.id}')"><i class="fas fa-key"></i></button>
            </div>
        </div>`;
    });
    document.getElementById("examList").innerHTML = h;
}

function renderStudentList() {
    let h="";
    teacherData.students.forEach(s => {
        h += `<div class="list-item">
            <div class="item-info"><div>${s.name}</div><small>Şifre: ${s.pass}</small></div>
            <div class="item-actions">
                <button onclick="openPassEdit('${s.name}')"><i class="fas fa-pen"></i></button>
                <button onclick="openStudentHistory('${s.name}')"><i class="fas fa-file-alt"></i></button>
            </div>
        </div>`;
    });
    document.getElementById("studentList").innerHTML = h;
}

async function toggleSet(id, type) { await api("toggleSetting", {examId:id, type:type}); loadTeacher(); }

// ANALİZ & TELEGRAM
function updateAnalysisSelect() {
    const sel = document.getElementById("analysisSelect");
    sel.innerHTML = "<option>Sınav Seçiniz...</option>";
    teacherData.exams.slice().reverse().forEach(ex => sel.innerHTML += `<option value="${ex.id}">${ex.name}</option>`);
}
function loadAnalysis() {
    const id = document.getElementById("analysisSelect").value;
    const resDiv = document.getElementById("analysisResult");
    if(!id || id.length<2) { resDiv.classList.add("hidden"); return; }
    resDiv.classList.remove("hidden");
    
    let results = teacherData.results.filter(r => r.examId === id);
    let nets = results.map(r => r.net);
    
    if(nets.length === 0) {
        document.getElementById("anAvg").innerText = "-";
        document.getElementById("anMax").innerText = "-";
        document.getElementById("participantsList").innerHTML = "<p>Katılım yok.</p>";
        return;
    }

    let avg = (nets.reduce((a,b)=>a+b,0) / nets.length).toFixed(2);
    document.getElementById("anAvg").innerText = avg;
    document.getElementById("anMax").innerText = Math.max(...nets);

    let html = "";
    results.sort((a,b)=>b.net-a.net).forEach((r, i) => {
        html += `<div class="list-item">
            <div style="display:flex; gap:10px; align-items:center;">
                <div class="opt-big" style="width:30px; height:30px; background:#4f46e5; color:white; border:none; font-size:12px;">${i+1}</div>
                <div>${r.student}</div>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
                <b>${r.net} Net</b>
                <button class="btn-telegram" onclick="sendTelegramReport('${r.student}', '${r.examId}')"><i class="fab fa-telegram-plane"></i></button>
            </div>
        </div>`;
    });
    document.getElementById("participantsList").innerHTML = html;

    const ctx = document.getElementById('examChart').getContext('2d');
    if(window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: results.map(r=>r.student.split(' ')[0]), datasets: [{ label: 'Net', data: nets, backgroundColor: '#4f46e5', borderRadius: 5 }] },
        options: { responsive: true }
    });
}

// --- UTILS ---
function showConfirm(msg, cb) {
    document.getElementById("confirmMsg").innerText = msg;
    document.getElementById("confirmModal").classList.remove("hidden");
    document.getElementById("confirmYes").onclick = () => {
        cb();
        closeModal('confirmModal');
    };
}

// TELEGRAM MANUEL
async function sendTelegramReport(name, id) {
    showConfirm(name + " için rapor Telegram'a gönderilsin mi?", async () => {
        await api("sendManualReport", {studentName:name, examId:id});
        showToast("Gönderildi!", "success");
    });
}

// ŞİFRE & DETAY
function openPassEdit(name) {
    passEditName = name;
    document.getElementById("passStuName").innerText = name;
    document.getElementById("newPassInput").value = "";
    document.getElementById("passModal").classList.remove("hidden");
}
async function saveNewPass() {
    let p = document.getElementById("newPassInput").value;
    if(!p) return showToast("Şifre yazın", "error");
    await api("updateStudentPass", {studentName:passEditName, newPass:p});
    showToast("Güncellendi", "success"); closeModal('passModal'); loadTeacher();
}
function openStudentHistory(name) {
    let list = teacherData.results.filter(r => r.student === name);
    let html = "";
    list.forEach(r => {
        let exName = teacherData.exams.find(e=>e.id==r.examId)?.name || r.examId;
        html += `<div class="list-item"><div>${exName}</div><b>${r.net} Net</b></div>`;
    });
    document.getElementById("stuDetailName").innerText = name;
    document.getElementById("stuDetailBody").innerHTML = html || "<p>Kayıt yok</p>";
    document.getElementById("studentDetailModal").classList.remove("hidden");
}

// --- STUDENT ---
async function loadStudent() {
    let res = await api("getStudentData", {name:currentUser.name});
    if(res) {
        studentData = res;
        document.getElementById("activeExams").innerHTML = res.active.map(e=>`<div class="list-item"><div>${e.name}</div><button class="btn-icon-bg" style="font-size:14px;width:auto;padding:0 15px;" onclick="startExam('${e.id}')">GİR</button></div>`).join('');
        document.getElementById("historyList").innerHTML = res.history.map((h,i)=>`<div class="list-item" onclick="openReport(${i})">
            <div>${h.examName || h.examId}</div>
            <div style="text-align:right"><b>${h.net==null?'Bekliyor':h.net+' Net'}</b><br><small>${h.rank?'Sıra: '+h.rank:''}</small></div>
        </div>`).join('');
        
        let labels = res.history.map(h => h.date.substr(0,5));
        let data = res.history.map(h => h.net || 0);
        new Chart(document.getElementById("studentTrendChart"), {
            type: 'line',
            data: { labels: labels, datasets: [{ label: 'Net Başarısı', data: data, borderColor: '#10b981', tension: 0.3 }] }
        });
    }
}

function openReport(idx) {
    let h = studentData.history[idx];
    if(!h.details) return showToast("Detaylar kapalı.", "error");
    
    let html = `<div class="card" style="text-align:center">
        <h1 style="color:#4f46e5">${h.net}</h1><p>TOPLAM NET</p>
        ${h.rank ? `<div style="background:#fff3e0; padding:5px; margin-top:5px; border-radius:5px; color:#f57c00;">🏆 Sınıf ${h.rank}.si</div>` : ''}
    </div>`;
    
    if(h.correctKey && h.details.stats) {
        let keyMap = {}; h.correctKey.split("|").forEach(x=>{let p=x.split(":"); keyMap[p[0]]=p[1]});
        
        h.details.stats.forEach(s => {
            let keyStr = keyMap[s.lesson] || "";
            let userStr = (h.details.raw && h.details.raw[s.lesson]) ? h.details.raw[s.lesson] : "";
            
            let bubbles = "";
            for(let i=0; i<s.total; i++) {
                let u = userStr[i] || "";
                let k = keyStr[i];
                let cls = (u==k || k=="*") ? "ans-c" : (u==""?"ans-e":"ans-w");
                bubbles += `<div class="bubble ${cls}">${u||'-'}</div>`;
            }
            html += `<div class="card" style="margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <b>${s.lesson}</b>
                    <small style="color:green">${s.correct}D</small> <small style="color:red">${s.wrong}Y</small> <small style="color:blue">${s.net}N</small>
                </div>
                <div class="ans-box">${bubbles}</div>
            </div>`;
        });
    }
    document.getElementById("reportBody").innerHTML = html;
    document.getElementById("reportModal").classList.remove("hidden");
}

function startExam(id) {
    currentExamId = id;
    let ex = studentData.active.find(e => String(e.id) === String(id));
    document.getElementById("examOverlay").classList.remove("hidden");
    document.getElementById("opticalArea").innerHTML = "";
    studentAnswers = {};
    ex.sections.forEach(s => {
        studentAnswers[s.name] = new Array(s.qCount).fill("");
        let r = "";
        for(let i=0; i<s.qCount; i++) r += `<div class="opt-row"><span>${i+1}</span><div class="opt-grid">${['A','B','C','D'].map(o=>`<div class="opt-big" onclick="stuSel(this,'${s.name}',${i},'${o}')">${o}</div>`).join('')}</div></div>`;
        document.getElementById("opticalArea").innerHTML += `<div class="card"><b>${s.name}</b>${r}</div>`;
    });
}
function stuSel(e,l,i,o) {
    e.parentNode.querySelectorAll('.opt-big').forEach(b=>b.classList.remove('selected'));
    e.classList.add('selected'); studentAnswers[l][i]=o;
}
async function submitExamNow() {
    showConfirm("Bitirmek istiyor musunuz?", async () => {
        let a={}; for(let l in studentAnswers) a[l]=studentAnswers[l].join("");
        await api("submitExam", {studentName:currentUser.name, examId:currentExamId, answers:a});
        showToast("Kaydedildi ve Telegram'a gönderildi!", "success"); 
        closeModal('examOverlay'); loadStudent();
    });
}

// --- BUILDER & EDITOR ---
function addBuilderLesson() { let n=document.getElementById("lName").value, c=parseInt(document.getElementById("lCount").value); if(n&&c){builderData.push({name:n,count:c,key:new Array(c).fill(null)}); document.getElementById("lName").value=""; document.getElementById("lCount").value=""; renderBuilder('builderContainer', builderData, false); } }
function renderBuilder(cid, d, isEdit) {
    const a = document.getElementById(cid); a.innerHTML="";
    d.forEach((l,i)=>{
        let r=""; for(let j=0;j<l.count;j++) r+=`<div class="opt-row"><span>${j+1}</span><div class="opt-grid">${['A','B','C','D'].map(o=>`<div class="bubble ${l.key[j]==o?'selected':''}" onclick="keySel('${cid}',${i},${j},'${o}')">${o}</div>`).join('')}${isEdit?`<div class="bubble ${l.key[j]=='*'?'selected':''}" style="color:red" onclick="keySel('${cid}',${i},${j},'*')">*</div>`:''}</div></div>`;
        a.innerHTML+=`<div class="builder-item"><b>${l.name}</b>${r}</div>`;
    });
}
window.keySel=function(cid,i,j,o) {
    if(cid=="builderContainer") builderData[i].key[j]=o; else editKeyData[i].key[j]=o;
    renderBuilder(cid, cid=="builderContainer"?builderData:editKeyData, cid=="editorBody");
}
async function saveNewExam() {
    if(builderData.length==0) return showToast("Ders ekle", "error");
    let k=builderData.map(l=>`${l.name}:${l.key.join("")}`).join("|");
    await api("addExam", {
        id:document.getElementById("newId").value, name:document.getElementById("newName").value, keysFormat:k,
        showScore:document.getElementById("chkScore").checked?"Evet":"Hayir",
        showRank:document.getElementById("chkRank").checked?"Evet":"Hayir",
        allowRetake:document.getElementById("chkRetake").checked?"Evet":"Hayir"
    });
    showToast("Eklendi", "success"); builderData=[]; closeModal('examCreateModal'); loadTeacher();
}
function openEditor(m, id) {
    editMode=m; editingId=id; document.getElementById("editorModal").classList.remove("hidden");
    if(m=='examKey') {
        let ex = teacherData.exams.find(e=>String(e.id)===String(id));
        editKeyData=[];
        if(ex.key.includes(":")) ex.key.split("|").forEach(p=>{let x=p.split(":"); editKeyData.push({name:x[0], count:x[1].length, key:x[1].split("")})});
        renderBuilder("editorBody", editKeyData, true);
    }
}
async function saveEditor() {
    if(editMode=='examKey') {
        let k = editKeyData.map(l=>`${l.name}:${l.key.join("")}`).join("|");
        await api("updateExamKey", {examId:editingId, newKey:k});
        showToast("Güncellendi", "success"); closeModal('editorModal'); loadTeacher();
    }
}
function filterStudents() {
    let t = document.getElementById("searchStudent").value.toLowerCase();
    Array.from(document.getElementById("studentList").children).forEach(c=>c.style.display=c.innerText.toLowerCase().includes(t)?'flex':'none');
}
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
