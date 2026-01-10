// *** SİZİN GÖNDERDİĞİNİZ LİNK (Doğrudan Yapıştırdım) ***
const API_URL = "https://script.google.com/macros/s/AKfycbzmwhocZqn8636BVpbmafR29gbup_i3l3avbrkYlUEGXthbCSi-_hCO2IzCZaCIksBH/exec";

// Değişkenler
let currentUser = {}, teacherData = {}, studentData = {}, activeExam = null, builderData = [], editKeyData = [], editingId = null;
let stuAnswers = {}, passTarget = "";

// --- CORE (ÇEKİRDEK) ---
function showLoad(s) { document.getElementById("globalLoader").classList.toggle("hidden", !s); }

async function api(act, data = {}) {
    data.action = act;
    try {
        showLoad(true);
        // POST isteği at
        const req = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const res = await req.json();
        showLoad(false);

        if (res.status === "fail" || res.status === "error") {
            alert(res.msg);
            return null;
        }
        return res;
    } catch (e) {
        showLoad(false);
        console.error(e);
        alert("Bağlantı Hatası! İnternetinizi kontrol edin.");
        return null;
    }
}

// --- GİRİŞ (HATA KORUMALI) ---
async function attemptLogin() {
    try {
        // ID Güvenliği: Eğer element yoksa hata verip durur, loader kapanmazdı. Şimdi kontrol ediyoruz.
        const inputEl = document.getElementById("userPassInput");
        if(!inputEl) { alert("Hata: Giriş kutusu bulunamadı. Sayfayı yenileyin."); return; }
        
        const code = inputEl.value.trim();
        if (!code) return alert("Lütfen giriş kodunu yazın.");

        const res = await api("login", { password: code });

        if (res) {
            currentUser = res;
            document.getElementById("loginScreen").classList.add("hidden");
            document.getElementById("mainApp").classList.remove("hidden");
            document.getElementById("headerName").innerText = res.name;
            document.getElementById("headerRole").innerText = res.role;

            if (res.role === "Ogretmen") {
                setupTabs("teacher");
                loadTeacherDashboard();
            } else {
                setupTabs("student");
                loadStudentDashboard();
            }
        }
    } catch (err) {
        showLoad(false);
        alert("Giriş sırasında bir hata oluştu: " + err.message);
    }
}

function appLogout() { location.reload(); }

// --- NAVİGASYON ---
function navTo(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
}

function setupTabs(role) {
    const bar = document.getElementById("mainTabBar");
    if (role === "teacher") {
        bar.innerHTML = `
            <button class="tab-item active" onclick="navTo('page-t-home')"><i class="fas fa-home"></i><span>Özet</span></button>
            <button class="tab-item" onclick="navTo('page-t-analysis')"><i class="fas fa-chart-pie"></i><span>Analiz</span></button>
            <button class="tab-item" onclick="navTo('page-t-create')"><i class="fas fa-plus-circle"></i><span>Ekle</span></button>
            <button class="tab-item" onclick="navTo('page-t-students')"><i class="fas fa-users"></i><span>Öğrenci</span></button>
        `;
        navTo('page-t-home');
    } else {
        bar.innerHTML = `
            <button class="tab-item active" onclick="navTo('page-s-home')"><i class="fas fa-pen"></i><span>Sınavlar</span></button>
            <button class="tab-item" onclick="navTo('page-s-history')"><i class="fas fa-chart-line"></i><span>Karnem</span></button>
        `;
        navTo('page-s-home');
    }
}

// --- ÖĞRETMEN FONKSİYONLARI ---
async function loadTeacherDashboard() {
    const res = await api("getTeacherData");
    if (res) {
        teacherData = res;
        document.getElementById("countStu").innerText = res.students.length;
        document.getElementById("countExam").innerText = res.exams.length;
        renderManageExamList();
        renderManageStudentList();
        fillAnalysisSelect();
    }
}

function renderManageExamList() {
    let h = "";
    teacherData.exams.slice().reverse().forEach(ex => {
        let act = ex.status == "Aktif";
        let sco = ex.showScore == "Evet";
        let rnk = ex.showRank == "Evet";
        let ret = ex.allowRetake == "Evet";
        
        h += `<div class="list-item">
            <div class="item-info"><div>${ex.name}</div><small>${ex.id}</small></div>
            <div class="item-actions">
                <button onclick="changeSet('${ex.id}','status')" style="color:${act?'green':'red'}"><i class="fas ${act?'fa-toggle-on':'fa-toggle-off'}"></i></button>
                <button onclick="changeSet('${ex.id}','score')" style="color:${sco?'blue':'gray'}"><i class="fas ${sco?'fa-eye':'fa-eye-slash'}"></i></button>
                <button onclick="changeSet('${ex.id}','rank')" style="color:${rnk?'orange':'gray'}"><i class="fas ${rnk?'fa-list-ol':'fa-ban'}"></i></button>
                <button onclick="changeSet('${ex.id}','retake')" style="color:${ret?'purple':'gray'}"><i class="fas ${ret?'fa-redo':'fa-times'}"></i></button>
                <button onclick="openEditor('examKey','${ex.id}')"><i class="fas fa-key"></i></button>
            </div>
        </div>`;
    });
    document.getElementById("manageExamList").innerHTML = h;
}

function renderManageStudentList() {
    let h = "";
    teacherData.students.forEach(s => {
        h += `<div class="list-item">
            <div class="item-info"><div>${s.name}</div><small>Şifre: ${s.pass}</small></div>
            <div class="item-actions">
                <button onclick="openPassChange('${s.name}')"><i class="fas fa-pen"></i></button>
                <button onclick="openStuDetail('${s.name}')"><i class="fas fa-file-alt"></i></button>
            </div>
        </div>`;
    });
    document.getElementById("manageStudentList").innerHTML = h;
}

async function changeSet(id, type) { await api("toggleSetting", {examId:id, type:type}); loadTeacherDashboard(); }

// --- ANALİZ & TELEGRAM ---
function fillAnalysisSelect() {
    const s = document.getElementById("analysisSelect");
    s.innerHTML = "<option>Sınav Seçiniz...</option>";
    teacherData.exams.slice().reverse().forEach(e => s.innerHTML += `<option value="${e.id}">${e.name}</option>`);
}

function loadAnalysisData() {
    const id = document.getElementById("analysisSelect").value;
    const area = document.getElementById("analysisArea");
    if (!id || id.length < 2) { area.classList.add("hidden"); return; }
    area.classList.remove("hidden");

    const results = teacherData.results.filter(r => r.examId === id);
    const nets = results.map(r => r.net);

    if (nets.length === 0) {
        document.getElementById("statAvg").innerText = "-";
        document.getElementById("statMax").innerText = "-";
        document.getElementById("rankList").innerHTML = "<p style='text-align:center;color:#999'>Henüz katılım yok.</p>";
        return;
    }

    const avg = (nets.reduce((a, b) => a + b, 0) / nets.length).toFixed(2);
    document.getElementById("statAvg").innerText = avg;
    document.getElementById("statMax").innerText = Math.max(...nets);

    let h = "";
    results.sort((a, b) => b.net - a.net).forEach((r, i) => {
        h += `<div class="list-item">
            <div style="display:flex;gap:10px;align-items:center">
                <div class="opt-big" style="background:#2563eb;color:white;border:none;font-size:12px;width:30px;height:30px;">${i+1}</div>
                <div>${r.student}</div>
            </div>
            <div style="display:flex;gap:10px;align-items:center">
                <b>${r.net} Net</b>
                <button class="btn-telegram" onclick="sendTelegram('${r.student}','${r.examId}')"><i class="fab fa-telegram-plane"></i></button>
            </div>
        </div>`;
    });
    document.getElementById("rankList").innerHTML = h;

    // Grafik
    const ctx = document.getElementById('examChart').getContext('2d');
    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: results.map(r => r.student.split(' ')[0]),
            datasets: [{ label: 'Net', data: nets, backgroundColor: '#2563eb', borderRadius: 5 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

async function sendTelegram(name, id) {
    if(!confirm(name + " raporu Telegram'a gönderilsin mi?")) return;
    await api("sendManualReport", {studentName:name, examId:id});
    alert("Gönderildi!");
}

// --- ŞİFRE & DETAY ---
function openPassChange(name) {
    passTarget = name;
    document.getElementById("passTargetName").innerText = name;
    document.getElementById("newPassVal").value = "";
    document.getElementById("modalPass").classList.remove("hidden");
}
async function doChangePass() {
    let p = document.getElementById("newPassVal").value;
    if(!p) return alert("Şifre yazın");
    await api("updateStudentPass", {studentName:passTarget, newPass:p});
    alert("Değişti"); closeAllModals(); loadTeacherDashboard();
}
function openStuDetail(name) {
    let list = teacherData.results.filter(r => r.student === name);
    let h = "";
    list.forEach(r => {
        let exName = teacherData.exams.find(e => e.id == r.examId)?.name || r.examId;
        h += `<div class="list-item"><div>${exName}</div><b>${r.net} Net</b></div>`;
    });
    document.getElementById("detailTitle").innerText = name;
    document.getElementById("detailBody").innerHTML = h || "<p>Kayıt yok</p>";
    document.getElementById("modalStuDetail").classList.remove("hidden");
}

// --- ÖĞRENCİ ---
async function loadStudentDashboard() {
    const res = await api("getStudentData", {name:currentUser.name});
    if (res) {
        studentData = res;
        document.getElementById("studentActiveExams").innerHTML = res.active.map(e => 
            `<div class="list-item"><div>${e.name}</div><button class="btn-icon-bg" style="font-size:14px; width:auto; padding:0 15px;" onclick="openExamRun('${e.id}')">GİR</button></div>`
        ).join('');
        
        document.getElementById("studentHistoryList").innerHTML = res.history.map((h, i) => 
            `<div class="list-item" onclick="openStudentReport(${i})">
                <div>${h.examName}</div>
                <div style="text-align:right"><b>${h.net == null ? 'Bekliyor' : h.net + ' Net'}</b><br><small>${h.rank ? 'Sıra: ' + h.rank : ''}</small></div>
            </div>`
        ).join('');

        // Borsa Grafiği
        let labels = res.history.map(h => h.date.substr(0, 5));
        let data = res.history.map(h => h.net || 0);
        new Chart(document.getElementById("studentTrendChart"), {
            type: 'line',
            data: { labels: labels, datasets: [{ label: 'Net Başarısı', data: data, borderColor: '#10b981', tension: 0.3, fill: true, backgroundColor: 'rgba(16,185,129,0.1)' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

function openStudentReport(idx) {
    let h = studentData.history[idx];
    if (!h.details) return alert("Detaylar kapalı.");
    
    let html = `<div class="card" style="text-align:center">
        <h1 style="color:#2563eb">${h.net}</h1><p>NET</p>
        ${h.rank ? `<div style="background:#fff3cd;padding:5px;border-radius:5px;color:#856404;margin-top:5px">🏆 Sınıf ${h.rank}.si</div>` : ''}
    </div>`;

    if (h.correctKey && h.details.stats) {
        let keyMap = {}; 
        h.correctKey.split("|").forEach(x => { let p = x.split(":"); keyMap[p[0]] = p[1]; });

        h.details.stats.forEach(s => {
            let keyStr = keyMap[s.lesson] || "";
            let userStr = (h.details.raw && h.details.raw[s.lesson]) ? h.details.raw[s.lesson] : "";
            let bubbles = "";
            
            for (let i = 0; i < s.total; i++) {
                let u = userStr[i] || "";
                let k = keyStr[i];
                let cls = (u == k || k == "*") ? "ans-c" : (u == "" ? "ans-e" : "ans-w");
                bubbles += `<div class="bubble ${cls}">${u || '-'}</div>`;
            }
            html += `<div class="card" style="margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:5px;"><b>${s.lesson}</b><small>${s.correct}D ${s.wrong}Y ${s.net}N</small></div>
                <div class="ans-box">${bubbles}</div>
            </div>`;
        });
    }
    document.getElementById("reportBody").innerHTML = html;
    document.getElementById("modalReport").classList.remove("hidden");
}

function openExamRun(id) {
    activeExam = studentData.active.find(e => String(e.id) === String(id));
    stuAnswers = {};
    document.getElementById("runTitle").innerText = activeExam.name;
    let h = "";
    
    activeExam.sections.forEach(sec => {
        stuAnswers[sec.name] = new Array(sec.qCount).fill("");
        let rows = "";
        for (let i = 0; i < sec.qCount; i++) {
            rows += `<div class="opt-row"><span>${i + 1}</span><div class="opt-grid">${['A', 'B', 'C', 'D'].map(o => `<div class="opt-big" onclick="selectAnswer(this,'${sec.name}',${i},'${o}')">${o}</div>`).join('')}</div></div>`;
        }
        h += `<div class="card"><b>${sec.name}</b>${rows}</div>`;
    });
    
    document.getElementById("runBody").innerHTML = h;
    document.getElementById("modalExamRun").classList.remove("hidden");
}

function selectAnswer(el, lesson, qIdx, opt) {
    el.parentNode.querySelectorAll('.opt-big').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    stuAnswers[lesson][qIdx] = opt;
}

async function finishExam() {
    if (!confirm("Sınavı bitirmek istiyor musunuz?")) return;
    let ans = {};
    for (let l in stuAnswers) ans[l] = stuAnswers[l].join("");
    
    await api("submitExam", {studentName:currentUser.name, examId:activeExam.id, answers:ans});
    alert("Kaydedildi ve Raporlandı!");
    closeAllModals(); loadStudentDashboard();
}

// --- BUILDER ---
function addLessonToBuilder() {
    let n = document.getElementById("lName").value;
    let c = parseInt(document.getElementById("lCount").value);
    if (n && c) {
        builderData.push({ name: n, count: c, key: new Array(c).fill(null) });
        document.getElementById("lName").value = ""; document.getElementById("lCount").value = "";
        renderBuilder('builderArea', builderData, false);
    }
}
function renderBuilder(contId, data, isEdit) {
    const c = document.getElementById(contId); c.innerHTML = "";
    data.forEach((l, i) => {
        let r = "";
        for (let j = 0; j < l.count; j++) {
            r += `<div class="opt-row"><span>${j + 1}</span><div class="opt-grid">${['A', 'B', 'C', 'D'].map(o => `<div class="bubble ${l.key[j] == o ? 'selected' : ''}" onclick="setKey('${contId}',${i},${j},'${o}')">${o}</div>`).join('')}${isEdit ? `<div class="bubble ${l.key[j] == '*' ? 'selected' : ''}" style="color:red" onclick="setKey('${contId}',${i},${j},'*')">*</div>` : ''}</div></div>`;
        }
        c.innerHTML += `<div class="list-item" style="display:block"><b>${l.name}</b>${r}</div>`;
    });
}
window.setKey = function(contId, lIdx, qIdx, opt) {
    if (contId == "builderArea") builderData[lIdx].key[qIdx] = opt;
    else editKeyData[lIdx].key[qIdx] = opt;
    renderBuilder(contId, contId == "builderArea" ? builderData : editKeyData, contId == "editorBody");
}
async function sendNewExam() {
    if (builderData.length == 0) return alert("Ders ekle");
    // Boş anahtar kontrolü
    for(let l of builderData) if(l.key.includes(null)) return alert(l.name + " dersinde cevap anahtarı eksik!");

    let k = builderData.map(l => `${l.name}:${l.key.join("")}`).join("|");
    await api("addExam", {
        id: document.getElementById("newId").value, name: document.getElementById("newName").value, keysFormat: k,
        showScore: document.getElementById("setScore").checked ? "Evet" : "Hayir",
        showRank: document.getElementById("setRank").checked ? "Evet" : "Hayir",
        allowRetake: document.getElementById("setRetake").checked ? "Evet" : "Hayir"
    });
    alert("Eklendi"); builderData = []; closeAllModals(); loadTeacherDashboard();
}

// --- EDITOR ---
function openEditor(m, id) {
    editingId = id; editMode = m;
    if (m == 'examKey') {
        let ex = teacherData.exams.find(e => String(e.id) === String(id));
        editKeyData = [];
        if (ex.key.includes(":")) ex.key.split("|").forEach(p => { let x = p.split(":"); editKeyData.push({ name: x[0], count: x[1].length, key: x[1].split("") }) });
        renderBuilder("editorBody", editKeyData, true);
        document.getElementById("modalEditor").classList.remove("hidden");
    }
}
async function doSaveKey() {
    let k = editKeyData.map(l => `${l.name}:${l.key.join("")}`).join("|");
    await api("regradeExam", {examId:editingId, newKey:k});
    alert("Güncellendi"); closeAllModals(); loadTeacherDashboard();
}

function filterStudentList() {
    let t = document.getElementById("filterInput").value.toLowerCase();
    Array.from(document.getElementById("manageStudentList").children).forEach(c => c.style.display = c.innerText.toLowerCase().includes(t) ? 'flex' : 'none');
}
function closeAllModals() { document.querySelectorAll('.modal, .fullscreen-modal').forEach(e => e.classList.add('hidden')); }
