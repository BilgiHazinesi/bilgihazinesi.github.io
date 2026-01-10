const API_URL = "https://script.google.com/macros/s/AKfycbzqz6cCg7FeAzBz1S1yMXhsEjLBxTDQF4EG5gfLkQa9rd-p9HZn2_Vq4a7JfZl_4wSi/exec"; 

let user={}, tData={}, sData={}, build=[], curEx=null, ans={};

function load(s){ document.getElementById("loader").classList.toggle("hidden",!s); }
async function api(a,d={}){
    d.action=a;
    try{ load(1); let r=await fetch(API_URL,{method:'POST',body:JSON.stringify(d)}); let j=await r.json(); load(0);
    if(j.status=="fail"||j.status=="error"){ alert(j.msg); return null; } return j; }catch(e){load(0);alert("Hata");return null;}
}

// --- GIRIS ---
async function login(){
    let p=document.getElementById("passIn").value; if(!p)return alert("Kod girin");
    let r=await api("login",{password:p});
    if(r){
        user=r; document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("appScreen").classList.remove("hidden");
        document.getElementById("uName").innerText=r.name; document.getElementById("uRole").innerText=r.role;
        if(r.role=="Ogretmen"){ document.getElementById("navTeacher").classList.remove("hidden"); initTeacher(); }
        else{ document.getElementById("navStudent").classList.remove("hidden"); initStudent(); }
    }
}

function go(id){ document.querySelectorAll(".tab").forEach(e=>e.classList.add("hidden")); document.getElementById(id).classList.remove("hidden");
document.querySelectorAll("nav button").forEach(b=>b.classList.remove("act")); event.currentTarget.classList.add("act"); }

// --- OGRETMEN ---
async function initTeacher(){
    let r=await api("getAnalysisData");
    if(r){ tData=r; renderDash(); renderStudents(); fillAnSelect(); }
}

function renderDash(){
    document.getElementById("cStu").innerText=tData.studentListFull.length;
    document.getElementById("cExam").innerText=tData.exams.length;
    let h="";
    tData.exams.slice().reverse().forEach(e=>{
        let act=e.status=="Aktif";
        h+=`<div class="item"><div><b>${e.name}</b><small>${e.id}</small></div>
        <div class="actions">
            <button onclick="setEx('${e.id}','status')" style="color:${act?'green':'red'}"><i class="fas fa-power-off"></i></button>
            <button onclick="setEx('${e.id}','score')"><i class="fas ${e.showScore=='Evet'?'fa-eye':'fa-eye-slash'}"></i></button>
        </div></div>`;
    });
    document.getElementById("examList").innerHTML=h;
}

// ANALIZ MOTORU & MATRIX TABLO
function fillAnSelect(){
    let s=document.getElementById("anSelect"); s.innerHTML="<option>Sınav Seçiniz...</option>";
    tData.exams.slice().reverse().forEach(e=>s.innerHTML+=`<option value="${e.id}">${e.name}</option>`);
}
function runAnalysis(){
    let id=document.getElementById("anSelect").value;
    if(id.length<2) return document.getElementById("anResult").classList.add("hidden");
    document.getElementById("anResult").classList.remove("hidden");

    let ex=tData.exams.find(e=>e.id==id);
    let res=tData.results.filter(r=>r.examId==id);
    
    // 1. ISTATISTIKLER
    if(res.length==0){ document.getElementById("matrixTable").innerHTML="Katılım yok"; return; }
    let nets=res.map(r=>r.net);
    document.getElementById("sAvg").innerText=(nets.reduce((a,b)=>a+b,0)/nets.length).toFixed(2);
    document.getElementById("sMax").innerText=Math.max(...nets);

    // 2. GIRMEYENLERI BUL
    let enteredNames=res.map(r=>r.student);
    let absents=tData.allStudents.filter(n=>!enteredNames.includes(n));
    document.getElementById("sAbsence").innerText=absents.length;
    if(absents.length>0){
        document.getElementById("absentListContainer").classList.remove("hidden");
        document.getElementById("absentList").innerHTML=absents.map(n=>`<span class="absent-badge">${n}</span>`).join('');
    } else { document.getElementById("absentListContainer").classList.add("hidden"); }

    // 3. ZOR SORULARI BUL
    let qStats={};
    let keyMap={}; // { "Mat": ["A","B"...] }
    let flatKey=[];
    if(ex.key.includes(":")) ex.key.split("|").forEach(x=>{
        let p=x.split(":"); let keys=p[1].split("");
        keyMap[p[0]]=keys;
        keys.forEach((k,i) => flatKey.push({l:p[0], q:i+1, k:k}));
    });
    
    res.forEach(r=>{
        let raw=r.answers.raw||{};
        for(let l in keyMap){
            let k=keyMap[l], a=raw[l]||"";
            for(let i=0; i<k.length; i++){
                let qn=l+" S"+(i+1);
                if(!qStats[qn])qStats[qn]=0;
                if(a[i]!=k[i] && k[i]!="*") qStats[qn]++;
            }
        }
    });
    let hardQ=Object.entries(qStats).sort((a,b)=>b[1]-a[1]).slice(0,3);
    document.getElementById("hardestQuestions").innerHTML=hardQ.map(q=>`<div><b>${q[0]}</b>: %${Math.round((q[1]/res.length)*100)} Yanlış</div>`).join('');

    // 4. MATRIX TABLO OLUŞTURMA + TELEGRAM BUTONU
    let table = document.getElementById("matrixTable");
    let thead = "<thead><tr><th>Öğrenci</th><th>Net</th><th>Tel</th>"; // Telegram başlığı eklendi
    flatKey.forEach(k => thead += `<th>${k.l.substr(0,1)}${k.q}<br><small>${k.k}</small></th>`);
    thead += "</tr></thead>";
    
    let tbody = "<tbody>";
    res.sort((a,b)=>b.net-a.net).forEach(r => {
        tbody += `<tr><td>${r.student}</td><td><b>${r.net}</b></td>
        <td><button onclick="sendTel('${r.student}','${r.examId}')" class="btn-tel"><i class="fab fa-telegram-plane"></i></button></td>`;
        
        let raw = r.answers.raw || {};
        flatKey.forEach(fk => {
            let userL = raw[fk.l] || "";
            let userAns = userL[fk.q-1] || "";
            let cls = "cell-e"; 
            if(userAns !== "") {
                if(userAns == fk.k || fk.k == "*") cls = "cell-c"; 
                else cls = "cell-w";
            }
            tbody += `<td class="${cls}">${userAns || '-'}</td>`;
        });
        tbody += "</tr>";
    });
    tbody += "</tbody>";
    table.innerHTML = thead + tbody;
}

// TELEGRAM GONDER
async function sendTel(name, eid){
    if(!confirm(name+" için rapor gönderilsin mi?")) return;
    await api("sendManualReport",{studentName:name, examId:eid});
    alert("Gonderildi");
}

// --- OGRENCI ---
async function initStudent(){
    let r=await api("getStudentData",{name:user.name});
    if(r){ sData=r; renderSExams(); renderSHist(); }
}
function renderSExams(){
    document.getElementById("sExamList").innerHTML=sData.active.map(e=>`<div class="item"><b>${e.name}</b><button onclick="startEx('${e.id}')" class="btn-main" style="width:auto;padding:5px 15px">GİR</button></div>`).join('');
}
function renderSHist(){
    document.getElementById("sHistList").innerHTML=sData.history.map((h,i)=>`<div class="item" onclick="openSRep(${i})"><div>${h.examName}</div><b>${h.net!=null?h.net+' Net':'...'}</b></div>`).join('');
    let l=sData.history.map(h=>h.date.substr(0,5)), d=sData.history.map(h=>h.net||0);
    new Chart(document.getElementById("sChart"),{type:'line',data:{labels:l,datasets:[{label:'Net',data:d,borderColor:'#3b82f6',fill:true}]}});
}
function openSRep(i){
    let h=sData.history[i];
    if(!h.details) return alert("Detaylar kapalı");
    showReportHTML(h.details, h.net, h.fullKey);
}

// --- ORTAK ---
function showReportHTML(ansData, net, fullKey){
    let h=`<div class="card" style="text-align:center"><h1>${net} NET</h1></div>`;
    let keyMap={}; if(fullKey) fullKey.split("|").forEach(x=>{let p=x.split(":"); keyMap[p[0]]=p[1]});
    if(ansData.stats) ansData.stats.forEach(s=>{
        let balls="", k=keyMap[s.lesson]||"", u=ansData.raw[s.lesson]||"";
        for(let i=0;i<s.total;i++){
            let cl= (u[i]==k[i]||k[i]=="*")?"bg-g":(u[i]==""?"bg-e":"bg-r");
            balls+=`<span class="ans-res ${cl}">${u[i]||'-'}</span>`;
        }
        h+=`<div class="card"><b>${s.lesson}</b><br><small>${s.correct}D ${s.wrong}Y</small><div style="margin-top:5px">${balls}</div></div>`;
    });
    document.getElementById("repBody").innerHTML=h;
    document.getElementById("modalReport").classList.remove("hidden");
}

function startEx(id){
    curEx=sData.active.find(e=>e.id==id); ans={};
    let h=""; curEx.sections.forEach(s=>{
        ans[s.name]=new Array(s.qCount).fill("");
        let r=""; for(let i=0;i<s.qCount;i++) r+=`<div class="opt-row"><span>${i+1}</span><div style="display:flex;gap:5px">${['A','B','C','D'].map(o=>`<div class="bubble" onclick="sel(this,'${s.name}',${i},'${o}')">${o}</div>`).join('')}</div></div>`;
        h+=`<div class="card"><b>${s.name}</b>${r}</div>`;
    });
    document.getElementById("runBody").innerHTML=h;
    document.getElementById("modalExam").classList.remove("hidden");
}
function sel(e,l,i,o){ e.parentNode.querySelectorAll(".bubble").forEach(b=>b.classList.remove("selected")); e.classList.add("selected"); ans[l][i]=o; }
async function finishExam(){
    if(!confirm("Bitir?"))return; let a={}; for(let k in ans)a[k]=ans[k].join("");
    await api("submitExam",{studentName:user.name,examId:curEx.id,answers:a});
    alert("Bitti"); closeModal('modalExam'); initStudent();
}

function addPart(){ let n=document.getElementById("bName").value, c=document.getElementById("bCount").value; if(n&&c){build.push({name:n,count:parseInt(c),key:new Array(parseInt(c)).fill(null)}); renderBuild();} }
function renderBuild(){ 
    let h=""; build.forEach((l,i)=>{ 
        let r=""; for(let j=0;j<l.count;j++) r+=`<div class="opt-row"><span>${j+1}</span><div style="display:flex;gap:5px">${['A','B','C','D'].map(o=>`<div class="bubble ${l.key[j]==o?'selected':''}" onclick="bk(${i},${j},'${o}')">${o}</div>`).join('')}</div></div>`; 
        h+=`<div class="card"><b>${l.name}</b>${r}</div>`; 
    }); document.getElementById("bCont").innerHTML=h; 
}
window.bk=function(i,j,o){ build[i].key[j]=o; renderBuild(); }
async function saveExam(){
    if(build.length==0)return alert("Ders ekle");
    let k=build.map(l=>`${l.name}:${l.key.join("")}`).join("|");
    await api("manageExam",{subAction:"add",id:document.getElementById("nId").value,name:document.getElementById("nName").value,key:k,showScore:document.getElementById("chkScore").checked?"Evet":"Hayir",showRank:document.getElementById("chkRank").checked?"Evet":"Hayir",allowRetake:document.getElementById("chkRetake").checked?"Evet":"Hayir"});
    alert("Eklendi"); closeModal('modalCreate'); initTeacher();
}

function renderStudents(){ document.getElementById("studentList").innerHTML=tData.studentListFull.map(s=>`<div class="item"><div><b>${s.name}</b><small>${s.pass}</small></div><button class="btn-icon-bg" onclick="passOpen('${s.name}')"><i class="fas fa-key"></i></button></div>`).join(''); }
async function setEx(id,t){ await api("toggleSetting",{examId:id,type:t}); initTeacher(); }
function passOpen(n){ passTarget=n; document.getElementById("passName").innerText=n; document.getElementById("modalPass").classList.remove("hidden"); }
async function doPass(){ await api("updateStudentPass",{studentName:passTarget,newPass:document.getElementById("newPass").value}); alert("Tamam"); closeModal('modalPass'); initTeacher(); }
function filterStu(){ let t=document.getElementById("stuSearch").value.toLowerCase(); Array.from(document.getElementById("studentList").children).forEach(e=>e.style.display=e.innerText.toLowerCase().includes(t)?'flex':'none'); }
function showModal(id){ document.getElementById(id).classList.remove("hidden"); }
function closeModal(id){ document.getElementById(id).classList.add("hidden"); }
