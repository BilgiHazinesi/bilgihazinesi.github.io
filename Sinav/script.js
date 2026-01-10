const API_URL = "https://script.google.com/macros/s/AKfycbz02TYzPe1pvoR5t66xtoFsXoflH1uI32mCewsca-p7sewFuRP6t8da_KP2ROPvAImU/exec"; 

let currentUser = {}, teacherData = {}, activeExamData = [], builderData = [], studentAnswers = {}, editMode = null, editingId = null;

function setLoading(s) { document.getElementById("loader").classList.toggle("hidden", !s); }
async function api(data) {
    try {
        setLoading(true);
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
        const json = await res.json();
        setLoading(false);
        if(json.status === "error") { alert(json.msg); return null; }
        return json;
    } catch(e) { setLoading(false); alert("Bağlantı Hatası"); return null; }
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
                         <button class="tab-item" onclick="navTo('page-t-create')"><i class="fas fa-plus-circle"></i>Ekle</button>
                         <button class="tab-item" onclick="navTo('page-t-students')"><i class="fas fa-users"></i>Öğrenci</button>`;
    } else {
        bar.innerHTML = `<button class="tab-item" onclick="navTo('page-s-home')"><i class="fas fa-pen"></i>Sınavlar</button>
                         <button class="tab-item" onclick="navTo('page-s-history')"><i class="fas fa-chart-pie"></i>Karnem</button>`;
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
    }
}

function renderLists() {
    const el = document.getElementById("examList"); el.innerHTML = "";
    teacherData.exams.slice().reverse().forEach(ex => {
        let act = ex.status.toLowerCase() == "aktif";
        let sco = ex.showScore.toLowerCase() == "evet";
        let rnk = (ex.showRank || "Hayir").toLowerCase() == "evet";
        
        el.innerHTML += `
        <div class="list-item">
            <div class="item-info"><div>${ex.name}</div><small>${ex.id}</small></div>
            <div class="item-actions">
                <button onclick="toggleSet('${ex.id}','status')" style="color:${act?'green':'red'}"><i class="fas ${act?'fa-toggle-on':'fa-toggle-off'}"></i></button>
                <button onclick="toggleSet('${ex.id}','score')" style="color:${sco?'blue':'gray'}"><i class="fas ${sco?'fa-eye':'fa-eye-slash'}"></i></button>
                <button onclick="toggleSet('${ex.id}','rank')" style="color:${rnk?'orange':'gray'}"><i class="fas fa-trophy"></i></button>
                <button onclick="openEditor('examKey','${ex.id}')"><i class="fas fa-key"></i></button>
            </div>
        </div>`;
    });

    const sl = document.getElementById("studentList"); sl.innerHTML = "";
    teacherData.students.forEach(st => {
        sl.innerHTML += `<div class="list-item"><div class="item-info"><div>${st.name}</div><small>Şifre: ${st.pass}</small></div></div>`;
    });
}

function filterStudents() {
    let term = document.getElementById("searchStudent").value.toLowerCase();
    let items = document.querySelectorAll("#studentList .list-item");
    items.forEach(i => i.style.display = i.innerText.toLowerCase().includes(term) ? "flex" : "none");
}

async function toggleSet(id, type) { await api({action:"toggleSetting", examId:id, type:type}); loadTeacherData(); }

// --- ÖĞRENCİ ---
async function loadStudentData() {
    const res = await api({ action: "getStudentDashboard", studentName: currentUser.name });
    if(res && res.status === "success") {
        let adiv = document.getElementById("activeExams"); adiv.innerHTML = "";
        res.active.forEach(ex => adiv.innerHTML += `<div class="list-item"><div>${ex.name}</div><button class="btn-icon-bg" style="font-size:14px; width:auto; padding:0 15px;" onclick="startExam('${ex.id}')">BAŞLA</button></div>`);
        
        let hdiv = document.getElementById("historyList"); hdiv.innerHTML = "";
        res.history.forEach(h => {
            let dataStr = encodeURIComponent(JSON.stringify(h));
            hdiv.innerHTML += `<div class="list-item" onclick="showReport('${dataStr}')">
                <div>${h.examId}</div>
                <div style="text-align:right">
                    <b>${h.score==null?'Bekliyor':Math.round(h.score)}</b><br>
                    <small>${h.rank? '🏆 '+h.rank+'. Sıradasın':''}</small>
                </div>
            </div>`;
        });
    }
}

// KARNE GÖSTERİMİ (Doğru/Yanlış Odaklı)
function showReport(dataStr) {
    let data = JSON.parse(decodeURIComponent(dataStr));
    let html = `<div class="card" style="text-align:center">
        <h2>${data.score==null?'Açıklanmadı':Math.round(data.score)}</h2>
        <p>Puan</p>
        ${data.rank ? `<div style="margin-top:10px; padding:5px; background:#fff3cd; border-radius:5px; color:#856404; font-weight:bold;">🏆 Sınıf ${data.rank}.si</div>` : ''}
    </div>`;
    
    if(data.correctKey && data.correctKey.includes(":")) {
        let totalD=0, totalY=0, totalB=0;
        let detailsHtml = "";
        
        data.correctKey.split("|").forEach(part => {
            let p = part.split(":");
            let lesName = p[0], keys = p[1];
            let studAns = (data.userAnswers && data.userAnswers[lesName]) ? data.userAnswers[lesName] : "";
            
            let d=0, y=0, b=0;
            let bubbles = "";
            
            for(let i=0; i<keys.length; i++) {
                let k = keys[i], s = studAns[i] || "";
                let color = "gray"; // Boş
                
                if(s === "") { b++; color="#e0e0e0"; }
                else if(s == k || k == "*") { d++; color="#4CAF50"; } // Doğru
                else { y++; color="#F44336"; } // Yanlış
                
                bubbles += `<div style="width:25px; height:25px; background:${color}; color:white; border-radius:50%; display:grid; place-items:center; font-size:11px; font-weight:bold;">${s||'-'}</div>`;
            }
            totalD+=d; totalY+=y; totalB+=b;
            
            detailsHtml += `<div class="card" style="padding:10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <b>${lesName}</b>
                    <small>${d}D / ${y}Y / ${b}B</small>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:5px;">${bubbles}</div>
            </div>`;
        });
        
        // Üst Özet
        html += `<div style="display:flex; gap:10px; margin-bottom:15px;">
            <div style="flex:1; background:#e8f5e9; padding:10px; border-radius:10px; text-align:center; color:#2e7d32"><b>${totalD}</b><br><small>Doğru</small></div>
            <div style="flex:1; background:#ffebee; padding:10px; border-radius:10px; text-align:center; color:#c62828"><b>${totalY}</b><br><small>Yanlış</small></div>
            <div style="flex:1; background:#f5f5f5; padding:10px; border-radius:10px; text-align:center; color:#616161"><b>${totalB}</b><br><small>Boş</small></div>
        </div>`;
        
        html += detailsHtml;
    } else if(data.score == null) {
        html += `<p style="text-align:center; color:#666;">Sonuçlar henüz açıklanmadı.</p>`;
    } else {
        html += `<p style="text-align:center; color:#666;">Detaylar gizli.</p>`;
    }

    document.getElementById("reportBody").innerHTML = html;
    document.getElementById("reportModal").classList.remove("hidden");
}

// ... (Diğer fonksiyonlar: startExam, submitExam vb. aynı) ...
// (Buraya yer sığmadığı için builder ve exam fonksiyonlarını önceki cevaptaki gibi ekleyin veya kopyalayın. Sadece yukarıdaki showReport önemli değişikliktir.)
function addBuilderLesson() { /* Önceki kod */ let n=document.getElementById("lName").value, c=parseInt(document.getElementById("lCount").value); if(n&&c){builderData.push({name:n,count:c,key:new Array(c).fill(null)}); document.getElementById("lName").value=""; document.getElementById("lCount").value=""; renderBuilder("builderContainer",builderData,false);} }
function renderBuilder(cid,d,e){const a=document.getElementById(cid); a.innerHTML=""; d.forEach((l,i)=>{let r=""; for(let j=0;j<l.count;j++) r+=`<div class="opt-row"><span>${j+1}</span><div class="opt-grid">${['A','B','C','D'].map(o=>`<div class="opt-big ${l.key[j]==o?'selected':''}" onclick="setKey('${cid}',${i},${j},'${o}')">${o}</div>`).join('')}${e?`<div class="opt-big ${l.key[j]=='*'?'selected':''}" style="color:red" onclick="setKey('${cid}',${i},${j},'*')">*</div>`:''}</div></div>`; a.innerHTML+=`<div class="builder-item"><b>${l.name}</b>${r}</div>`;});}
window.setKey=function(c,l,q,o){if(c=="builderContainer")builderData[l].key[q]=o;else editingExamKey[l].key[q]=o;renderBuilder(c,c=="builderContainer"?builderData:editingExamKey,c=="editorBody");}
async function saveNewExam(){if(builderData.length==0)return alert("Ders ekle");let k=builderData.map(l=>`${l.name}:${l.key.join("")}`).join("|");await api({action:"addExam",id:document.getElementById("newId").value,name:document.getElementById("newName").value,keysFormat:k,showScore:document.getElementById("newShowScore").value,showRank:document.getElementById("newShowRank").value});alert("Kaydedildi");builderData=[];loadTeacherData();navTo("page-t-home");}
function startExam(id){let ex=activeExamData.find(e=>String(e.id)===String(id));if(!ex)return alert("Hata");document.getElementById("examOverlay").classList.remove("hidden");document.getElementById("examTitleOverlay").innerText=ex.name;document.getElementById("examOverlay").dataset.id=id;studentAnswers={};document.getElementById("opticalArea").innerHTML="";ex.sections.forEach(sec=>{studentAnswers[sec.name]=new Array(sec.qCount).fill("");let rows="";for(let i=0;i<sec.qCount;i++)rows+=`<div class="opt-row"><span>${i+1}</span><div class="opt-grid">${['A','B','C','D'].map(o=>`<div class="opt-big" onclick="stuSel(this,'${sec.name}',${i},'${o}')">${o}</div>`).join('')}</div></div>`;document.getElementById("opticalArea").innerHTML+=`<div class="card"><b>${sec.name}</b>${rows}</div>`;});}
function stuSel(e,l,i,o){e.parentNode.querySelectorAll('.opt-big').forEach(b=>b.classList.remove('selected'));e.classList.add('selected');studentAnswers[l][i]=o;}
async function submitExamNow(){if(!confirm("Bitir?"))return;let a={};for(let l in studentAnswers)a[l]=studentAnswers[l].join("");await api({action:"submitExam",studentName:currentUser.name,examId:document.getElementById("examOverlay").dataset.id,answers:a});alert("Kaydedildi");document.getElementById("examOverlay").classList.add("hidden");loadStudentData();}
function closeExamOverlay(){document.getElementById("examOverlay").classList.add("hidden");}
function openEditor(m,id){editMode=m;editingId=id;document.getElementById("editorModal").classList.remove("hidden");if(m=='examKey'){let ex=teacherData.exams.find(e=>String(e.id)===String(id));editingExamKey=[];if(ex.key.includes(":"))ex.key.split("|").forEach(p=>{let x=p.split(":");editingExamKey.push({name:x[0],count:x[1].length,key:x[1].split("")});});renderBuilder("editorBody",editingExamKey,true);}}
async function saveEditor(){let k=editingExamKey.map(l=>`${l.name}:${l.key.join("")}`).join("|");await api({action:"updateExamKey",examId:editingId,newKey:k});alert("Güncellendi");document.getElementById("editorModal").classList.add("hidden");loadTeacherData();}
function closeEditor(){document.getElementById("editorModal").classList.add("hidden");}
