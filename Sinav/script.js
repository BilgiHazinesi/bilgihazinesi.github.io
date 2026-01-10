const API_URL = "https://script.google.com/macros/s/AKfycbzq6gpkqQWjMt8TZ-QNJCMXHseZpdjqb4sYlBuoVr028Up6FTM96AV-MdWlY5L5lrVI/exec"; 

let currentUser = {}, teacherData = {exams:[], students:[], results:[]}, activeExamData = [], builderData = [], studentAnswers = {}, passEditName = "";

function setLoading(s) { document.getElementById("loader").classList.toggle("hidden", !s); }
async function api(data) {
    try {
        setLoading(true);
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
        const json = await res.json();
        setLoading(false);
        if(json.status === "error") { alert(json.msg); return null; }
        return json;
    } catch(e) { setLoading(false); alert("Hata"); return null; }
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
            setupNav("teacher"); loadTeacherData(); navTo("page-t-home");
        } else {
            setupNav("student"); loadStudentData(); navTo("page-s-home");
        }
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
                         <button class="tab-item" onclick="navTo('page-t-analysis')"><i class="fas fa-chart-pie"></i>Analiz</button>
                         <button class="tab-item" onclick="navTo('page-t-create')"><i class="fas fa-plus-circle"></i>Ekle</button>
                         <button class="tab-item" onclick="navTo('page-t-students')"><i class="fas fa-users"></i>Öğrenci</button>`;
    } else {
        bar.innerHTML = `<button class="tab-item" onclick="navTo('page-s-home')"><i class="fas fa-pen"></i>Sınavlar</button>
                         <button class="tab-item" onclick="navTo('page-s-history')"><i class="fas fa-chart-bar"></i>Karnem</button>`;
    }
}
function logout() { location.reload(); }

// --- ÖĞRETMEN ---
async function loadTeacherData() {
    const res = await api({ action: "getTeacherData" });
    if(res && res.status === "success") {
        teacherData = res;
        document.getElementById("stCount").innerText = res.students.length;
        document.getElementById("exCount").innerText = res.exams.length;
        renderLists();
        updateAnalysisSelect();
    }
}

function renderLists() {
    const el = document.getElementById("examList"); el.innerHTML = "";
    teacherData.exams.slice().reverse().forEach(ex => {
        let active = ex.status.toLowerCase() == "aktif";
        el.innerHTML += `<div class="list-item"><div class="item-info"><div>${ex.name}</div><small style="color:${active?'green':'red'}">${active?'Yayında':'Gizli'}</small></div>
        <div class="item-actions"><button onclick="toggleStatus('${ex.id}')"><i class="fas ${active?'fa-toggle-on':'fa-toggle-off'}"></i></button></div></div>`;
    });

    const sl = document.getElementById("studentList"); sl.innerHTML = "";
    teacherData.students.forEach(st => {
        sl.innerHTML += `<div class="list-item"><div class="item-info"><div>${st.name}</div><small>****</small></div>
        <div class="item-actions">
            <button onclick="openPassEdit('${st.name}')"><i class="fas fa-pen"></i></button>
            <button onclick="openStudentHistory('${st.name}')"><i class="fas fa-file-alt"></i></button>
        </div></div>`;
    });
}

async function toggleStatus(id) { await api({action:"toggleExamStatus", examId:id}); loadTeacherData(); }

// ANALİZ BÖLÜMÜ
function updateAnalysisSelect() {
    const sel = document.getElementById("analysisSelect");
    sel.innerHTML = "<option>Sınav Seçiniz...</option>";
    teacherData.exams.slice().reverse().forEach(ex => {
        sel.innerHTML += `<option value="${ex.id}">${ex.name}</option>`;
    });
}

function loadAnalysis() {
    const id = document.getElementById("analysisSelect").value;
    const resDiv = document.getElementById("analysisResult");
    if(!id || id === "Sınav Seçiniz...") { resDiv.classList.add("hidden"); return; }
    
    resDiv.classList.remove("hidden");
    const results = teacherData.results.filter(r => r.examId === id);
    const scores = results.map(r => r.score);
    
    if(scores.length === 0) {
        document.getElementById("anAvg").innerText = "-";
        document.getElementById("anMax").innerText = "-";
        document.getElementById("participantsList").innerHTML = "<p>Katılım yok.</p>";
        return;
    }

    const avg = (scores.reduce((a,b)=>a+b,0) / scores.length).toFixed(1);
    const max = Math.max(...scores);
    document.getElementById("anAvg").innerText = avg;
    document.getElementById("anMax").innerText = Math.round(max);

    // Liste
    let html = "";
    results.sort((a,b)=>b.score-a.score).forEach(r => {
        html += `<div class="list-item"><div>${r.student}</div><b>${Math.round(r.score)}</b></div>`;
    });
    document.getElementById("participantsList").innerHTML = html;

    // Grafik
    const ctx = document.getElementById('examChart').getContext('2d');
    if(window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: results.map(r=>r.student.split(' ')[0]), // Sadece ilk isim
            datasets: [{
                label: 'Puan',
                data: scores,
                backgroundColor: '#2563eb',
                borderRadius: 5
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
    });
}

// ŞİFRE DEĞİŞTİRME
function openPassEdit(name) {
    passEditName = name;
    document.getElementById("passStuName").innerText = name;
    document.getElementById("newPassInput").value = "";
    document.getElementById("passModal").classList.remove("hidden");
}
async function saveNewPass() {
    let p = document.getElementById("newPassInput").value;
    if(!p) return alert("Şifre yazın");
    await api({action:"updateStudentPass", studentName:passEditName, newPass:p});
    alert("Şifre güncellendi");
    closeModal('passModal');
    loadTeacherData();
}

// ÖĞRENCİ TARİHÇESİ (Öğretmen Bakışı)
function openStudentHistory(name) {
    let stuResults = teacherData.results.filter(r => r.student === name);
    let html = "";
    stuResults.forEach(r => {
        let exName = teacherData.exams.find(e=>e.id==r.examId)?.name || r.examId;
        html += `<div class="list-item"><div>${exName}</div><b>${Math.round(r.score)}</b></div>`;
    });
    document.getElementById("stuDetailName").innerText = name;
    document.getElementById("stuDetailBody").innerHTML = html || "<p>Sınav kaydı yok.</p>";
    document.getElementById("studentDetailModal").classList.remove("hidden");
}

// OLUŞTURUCU VE DİĞERLERİ...
function addBuilderLesson() { let n=document.getElementById("lName").value, c=parseInt(document.getElementById("lCount").value); if(n&&c){ builderData.push({name:n, count:c, key:new Array(c).fill(null)}); document.getElementById("lName").value=""; document.getElementById("lCount").value=""; renderBuilder(); } }
function renderBuilder() { const a=document.getElementById("builderContainer"); a.innerHTML=""; builderData.forEach((l,i)=>{ let r=""; for(let j=0;j<l.count;j++) r+=`<div class="opt-row"><span>${j+1}</span><div class="opt-grid">${['A','B','C','D'].map(o=>`<div class="opt-big ${l.key[j]==o?'selected':''}" onclick="setKey(${i},${j},'${o}')">${o}</div>`).join('')}</div></div>`; a.innerHTML+=`<div class="card"><b>${l.name}</b>${r}</div>`; }); }
window.setKey=function(l,q,o){ builderData[l].key[q]=o; renderBuilder(); }
async function saveNewExam() { if(builderData.length==0) return alert("Ders ekle"); let k=builderData.map(l=>`${l.name}:${l.key.join("")}`).join("|"); await api({action:"addExam",id:document.getElementById("newId").value,name:document.getElementById("newName").value,keysFormat:k,showScore:document.getElementById("newShowScore").value,showRank:document.getElementById("newShowRank").value}); alert("Kaydedildi"); builderData=[]; loadTeacherData(); navTo("page-t-home"); }

// ÖĞRENCİ TARAF (Aynı Mantık)
async function loadStudentData() { const res=await api({action:"getStudentDashboard",studentName:currentUser.name}); if(res&&res.status=="success"){ activeExamData=res.active; document.getElementById("activeExams").innerHTML=res.active.map(e=>`<div class="list-item"><div>${e.name}</div><button class="btn-icon-bg" style="font-size:14px;width:auto;padding:0 15px;" onclick="startExam('${e.id}')">GİR</button></div>`).join(''); document.getElementById("historyList").innerHTML=res.history.map(h=>`<div class="list-item"><div>${h.examId}</div><b>${h.score==null?'?':Math.round(h.score)}</b></div>`).join(''); } }
function startExam(id) { let ex=activeExamData.find(e=>String(e.id)===String(id)); document.getElementById("examOverlay").classList.remove("hidden"); document.getElementById("examOverlay").dataset.id=id; studentAnswers={}; document.getElementById("opticalArea").innerHTML=""; ex.sections.forEach(s=>{ studentAnswers[s.name]=new Array(s.qCount).fill(""); let r=""; for(let i=0;i<s.qCount;i++) r+=`<div class="opt-row"><span>${i+1}</span><div class="opt-grid">${['A','B','C','D'].map(o=>`<div class="opt-big" onclick="stuSel(this,'${s.name}',${i},'${o}')">${o}</div>`).join('')}</div></div>`; document.getElementById("opticalArea").innerHTML+=`<div class="card"><b>${s.name}</b>${r}</div>`; }); }
function stuSel(e,l,i,o){ e.parentNode.querySelectorAll('.opt-big').forEach(b=>b.classList.remove('selected')); e.classList.add('selected'); studentAnswers[l][i]=o; }
async function submitExamNow(){ let a={}; for(let l in studentAnswers)a[l]=studentAnswers[l].join(""); await api({action:"submitExam",studentName:currentUser.name,examId:document.getElementById("examOverlay").dataset.id,answers:a}); alert("Bitti"); closeModal('examOverlay'); loadStudentData(); }
function closeModal(id){ document.getElementById(id).classList.add("hidden"); }
