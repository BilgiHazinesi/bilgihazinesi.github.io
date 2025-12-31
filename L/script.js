// --- ZEYNAL ÖĞRETMEN: V54 (SORUNSUZ ÇALIŞAN VERSİYON) ---
// BURAYA YENİ ALDIĞIN URL'Yİ YAPIŞTIRMAYI UNUTMA!
const API_URL = "https://script.google.com/macros/s/AKfycbwe6-kRz95KD3W2zAK7WY3J7wILgXCGuzVX9XRz7Gr0bHX5LlChBbNY68fZDw1zmI2L/exec";

let settings = { classTarget: 500, silverLimit: 3, goldLimit: 5 };
let students = []; 
let books = []; // ARTIK BASİT BİR DİZİ OLACAK
let bookPages = {}; 
let records = []; 
let studentPassObj = {};
let teacherPassword = ""; 
let loginMode = 'teacher'; 
let loggedInStudent = "";
let isDataLoaded = false;

const RANKS = [{c:0, t:"🌱 Başlangıç"}, {c:5, t:"🥉 Okuma Çırağı"}, {c:10, t:"📖 Kitap Kurdu"},{c:15, t:"🚀 Bilgi Kaşifi"}, {c:20, t:"🏹 Kelime Avcısı"}, {c:25, t:"👑 Kütüphane Muhafızı"},{c:30, t:"🎩 Edebiyat Ustası"}, {c:35, t:"🌍 Bilge Okur"}, {c:40, t:"💎 EFSANE"}];
const EXIT_CARDS = {"1":{title:"Macera Hatırası",prompt:"En unutulmaz sahne neydi?"},"2":{title:"Öğrenen Profil",prompt:"Karakter hangi özelliği taşıyor?"},"3":{title:"Duygu Kartı",prompt:"Hangi duyguları hissettin?"},"4":{title:"Bağlantı Kartı",prompt:"Nasıl bir bağ kurdun?"},"5":{title:"Eleştiri Kartı",prompt:"Katılmadığın bir olay var mı?"},"6":{title:"Soru Kartı",prompt:"Seni düşündüren soru neydi?"},"7":{title:"Yaratıcı Son",prompt:"Sonunu nasıl değiştirirdin?"},"8":{title:"Gelişim Kartı",prompt:"Hangi becerini geliştirdi?"},"9":{title:"Tavsiye Kartı",prompt:"Tavsiye eder misin?"}};

// --- YARDIMCI FONKSİYONLAR ---
function handleInput(input) { let btn = input.nextElementSibling; if(btn && btn.classList.contains('clear-btn')) { btn.style.display = input.value.length > 0 ? 'block' : 'none'; } }
function clearField(id, callback) { let input = document.getElementById(id); input.value = ""; handleInput(input); if (callback) callback(); }
function toggleTheme() { document.body.classList.toggle('dark-mode'); let isDark = document.body.classList.contains('dark-mode'); document.getElementById('themeIcon').innerText = isDark ? '☀️' : '🌙'; localStorage.setItem('theme', isDark ? 'dark' : 'light'); }
function getLocalTime() { let now = new Date(); return now.toLocaleDateString('tr-TR') + " " + now.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'}); }
function normalizeStr(str) { return str ? str.toString().trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR') : ""; }

window.onload = function() {
    if(localStorage.getItem('theme') === 'dark') { document.body.classList.add('dark-mode'); document.getElementById('themeIcon').innerText = '☀️'; } else { document.getElementById('themeIcon').innerText = '🌙'; }
    let select = document.getElementById('exitCardSelect'); 
    for (const [key, value] of Object.entries(EXIT_CARDS)) { let opt = document.createElement('option'); opt.value = key; opt.innerText = value.title; select.appendChild(opt); }
    fetchData(true);
};

function fetchData(isFirstLoad) {
     fetch(API_URL).then(res => res.json()).then(data => {
        processData(data);
        if(isFirstLoad) {
            document.getElementById('loader').style.display = 'none';
            isDataLoaded = true; 
            populateDatalists();
        }
    }).catch(err => {
        document.getElementById('loader').innerText = "Bağlantı Hatası!";
        console.error(err);
    });
}

function processData(data) {
    if(data.students) students = data.students;
    if(data.studentPass) studentPassObj = data.studentPass;
    if(data.books) books = data.books; // Backend'den gelen DİZİ'yi al
    if(data.bookPages) bookPages = { ...data.bookPages, ...bookPages };
    if(data.settings) settings = { ...settings, ...data.settings };
    if(data.teacherPass) teacherPassword = data.teacherPass.toString();
    records = (data.records || []).sort((a,b) => Number(b.id) - Number(a.id));
    
    // UI Ayarları
    if(document.getElementById('set-target')) {
        document.getElementById('set-target').value = settings.classTarget;
        document.getElementById('set-silver').value = settings.silverLimit;
        document.getElementById('set-gold').value = settings.goldLimit;
    }
}

function syncData() {
    document.getElementById('syncStatus').innerText = "Kaydediliyor...";
    const payload = JSON.stringify({ 
        students, studentPass: studentPassObj, 
        books, bookPages, 
        records, settings, auth_password: teacherPassword 
    });
    fetch(API_URL, { method: 'POST', body: payload }).then(res => {
        document.getElementById('syncStatus').innerText = "Senkronize";
    });
}

function setLoginMode(mode) {
    loginMode = mode;
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    if(mode === 'teacher') {
        document.getElementById('tabTeacher').classList.add('active');
        document.getElementById('teacherLoginForm').style.display = 'block';
        document.getElementById('studentLoginForm').style.display = 'none';
    } else {
        document.getElementById('tabStudent').classList.add('active');
        document.getElementById('teacherLoginForm').style.display = 'none';
        document.getElementById('studentLoginForm').style.display = 'block';
    }
}

function login() {
    if(!isDataLoaded) return alert("Veriler yükleniyor...");
    if(loginMode === 'teacher') {
        let pass = document.getElementById('appPassword').value;
        if(String(pass).trim() === String(teacherPassword).trim()) {
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            document.getElementById('teacherContainer').style.display = 'block';
            document.getElementById('teacherNav').style.display = 'flex';
            updateUI();
        } else { alert("Hatalı Şifre!"); }
    } else {
        let sPass = document.getElementById('studentLoginPass').value.trim();
        let foundStudent = Object.keys(studentPassObj).find(key => String(studentPassObj[key]).trim() === String(sPass));
        if(foundStudent) {
            loggedInStudent = foundStudent;
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            document.getElementById('studentContainer').style.display = 'block';
            document.getElementById('studentNav').style.display = 'flex';
            document.getElementById('mainTitle').innerText = "Öğrenci Paneli";
            renderStudentPanel();
        } else { alert("Şifre bulunamadı!"); }
    }
}

function lendBook() { 
    const s = document.getElementById('studentInput').value.trim().toUpperCase(); 
    const b = document.getElementById('bookInput').value.trim(); 
    if(!s || !b) { alert("Eksik bilgi!"); return; } 
    if(!students.includes(s)) { students.push(s); students.sort(); } 
    if(!books.includes(b)) books.push(b); 
    
    records.unshift({ id: Date.now(), date: getLocalTime(), student: s, book: b, status: "Okuyor", returnDate: "-" }); 
    document.getElementById('bookInput').value = ""; 
    handleInput(document.getElementById('bookInput')); 
    updateUI(); 
    syncData(); 
}

function renderHistory() { 
    const sVal = document.getElementById('studentInput').value.trim().toUpperCase(); 
    const div = document.getElementById('historyList'); 
    div.innerHTML = ""; 
    let list; 
    if(sVal) list = records.filter(r => r.student === sVal); 
    else list = records.filter(r => r.status === "Okuyor"); 
    
    if(list.length === 0) div.innerHTML = "<p style='text-align:center; opacity:0.7;'>Kayıt yok.</p>"; 
    
    list.forEach(r => { 
        let actionBtn = ""; 
        if (r.status === "Okuyor") { 
            actionBtn = `<button class="btn-return" onclick="returnBook(${r.id})">İade Al</button>`; 
        } else { 
            if(sVal) actionBtn = `<button class="btn-comment" onclick="returnBook(${r.id})"><i class="fas fa-edit"></i> Yorumla</button>`; 
            else actionBtn = `<span style="font-size:0.8rem;">${r.returnDate}</span>`; 
        } 
        div.innerHTML += `<div class="list-item"><div class="item-content"><h4>${r.book}</h4><p>${r.student} • ${r.date}</p></div>${actionBtn}</div>`; 
    }); 
}

function updateUI() { analyzeData(); populateDatalists(); renderHistory(); renderBookManager(); renderRanking(); updateProgressBar(); renderPassManager(); }
function analyzeData() { activeBooksMap = {}; lastHistoryMap = {}; records.forEach(r => { let key = normalizeStr(r.book); if(r.status === "Okuyor") { if(!activeBooksMap[key]) activeBooksMap[key] = []; activeBooksMap[key].push(r); } else if (r.status === "İade Etti") { if(!lastHistoryMap[key]) lastHistoryMap[key] = { student: r.student, date: r.returnDate }; } }); let totalPagesRead = 0; records.forEach(r => { if(r.status === "İade Etti") totalPagesRead += (parseInt(bookPages[r.book]) || 0); }); document.getElementById('statTotalPages').innerText = totalPagesRead.toLocaleString(); }
function updateProgressBar() { let completed = records.filter(r => r.status === "İade Etti").length; let percent = Math.min(100, Math.floor((completed / settings.classTarget) * 100)); document.getElementById('progressBar').style.width = percent + "%"; document.getElementById('progressPercent').innerText = percent + "%"; document.getElementById('targetText').innerText = `${completed} / ${settings.classTarget} Kitap`; }
function switchTab(id, btn) { document.querySelectorAll('.section').forEach(el => el.classList.remove('active')); document.getElementById('tab-' + id).classList.add('active'); document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); btn.classList.add('active'); }

function returnBook(id) { tempReturnId = id; let rec = records.find(r => r.id === id); if(rec) { currentRating = rec.rating || 0; document.getElementById('exitCardSelect').value = rec.cardId || ""; document.getElementById('returnComment').value = rec.comment || ""; } else { currentRating = 0; document.getElementById('exitCardSelect').value = ""; document.getElementById('returnComment').value = ""; } updateStars(); updateCardPrompt(); document.getElementById('ratingOverlay').style.display = 'flex'; }
function selectStar(n) { currentRating = n; updateStars(); }
function updateStars() { let btns = document.getElementById('starGroup').children; for(let i=0; i<btns.length; i++) { if(i < currentRating) btns[i].classList.add('selected'); else btns[i].classList.remove('selected'); } }
function updateCardPrompt() { let val = document.getElementById('exitCardSelect').value; let box = document.getElementById('cardPromptBox'); let wrap = document.getElementById('commentWrapper'); if(val && EXIT_CARDS[val]) { box.innerHTML = `<i class="fas fa-question-circle"></i> ${EXIT_CARDS[val].prompt}`; box.style.display = 'flex'; wrap.style.display = 'block'; } else { box.style.display = 'none'; wrap.style.display = 'none'; } }
function startDictation() { if (window.hasOwnProperty('webkitSpeechRecognition')) { let recognition = new webkitSpeechRecognition(); let btn = document.querySelector('.mic-btn'); recognition.continuous = false; recognition.interimResults = false; recognition.lang = "tr-TR"; recognition.start(); btn.classList.add('listening'); recognition.onresult = function(e) { document.getElementById('returnComment').value = e.results[0][0].transcript; recognition.stop(); btn.classList.remove('listening'); }; recognition.onerror = function(e) { recognition.stop(); btn.classList.remove('listening'); }; recognition.onend = function() { btn.classList.remove('listening'); }; } else { alert("Tarayıcınız sesli komutu desteklemiyor (Chrome önerilir)."); } }
function closeRatingModal() { document.getElementById('ratingOverlay').style.display = 'none'; tempReturnId = null; }

function submitReturn() {
    if (!tempReturnId) return;
    let rec = records.find(r => r.id === tempReturnId);
    let cardId = document.getElementById('exitCardSelect').value;
    let comment = document.getElementById('returnComment').value;
    if(rec) {
        rec.status = "İade Etti";
        if(!rec.returnDate || rec.returnDate === "-") rec.returnDate = getLocalTime();
        if(currentRating > 0) rec.rating = currentRating;
        if(cardId) { rec.cardId = cardId; rec.cardTitle = EXIT_CARDS[cardId].title; rec.comment = comment; }
        if(loginMode === 'student') renderStudentPanel(); else updateUI();
        syncData();
    }
    closeRatingModal();
}

function toggleEditMode() { isEditMode = !isEditMode; document.getElementById('editToggleBtn').classList.toggle('active'); document.getElementById('editToggleBtn').innerText = isEditMode ? '✅ Bitir' : '✏️ Düzenle'; renderBookManager(); }
function saveBookEdits(index) { let oldName = books[index]; let nameInput = document.getElementById(`edit-name-${index}`); let pageInput = document.getElementById(`edit-page-${index}`); if (!nameInput || !pageInput) return; let newName = nameInput.value.trim(); let newPage = parseInt(pageInput.value) || 0; if(!newName) return alert("Kitap adı boş olamaz."); if(newName !== oldName) { books[index] = newName; if(bookPages[oldName]) delete bookPages[oldName]; records.forEach(r => { if(r.book === oldName) r.book = newName; }); } bookPages[newName] = newPage; alert("Kaydedildi!"); books.sort(); renderBookManager(); updateUI(); syncData(); }
function filterBooks(type, el) { currentFilter = type; document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active')); el.classList.add('active'); renderBookManager(); }
function getRawRating(bookName) { let bookRecs = records.filter(r => normalizeStr(r.book) === normalizeStr(bookName) && r.rating); if(bookRecs.length === 0) return 0; return bookRecs.reduce((a, b) => a + parseInt(b.rating), 0) / bookRecs.length; }

function renderBookManager() {
    const search = document.getElementById('bookSearch').value.toLowerCase();
    const div = document.getElementById('bookManagerList');
    div.innerHTML = "";
    let displayList = books.map((b, idx) => {
        let key = normalizeStr(b);
        let activeList = activeBooksMap[key] || [];
        let lastReader = lastHistoryMap[key];
        let status = activeList.length > 0 ? 'out' : 'in';
        let avgScore = getRawRating(b);
        let pageCount = bookPages[b] || 0;
        return { name: b, status: status, activeList: activeList, lastReader: lastReader, avgScore: avgScore, pageCount: pageCount, originalIndex: idx };
    });
    displayList = displayList.filter(item => { if(!item.name.toLowerCase().includes(search)) return false; if(currentFilter === 'out' && item.status !== 'out') return false; if(currentFilter === 'in' && item.status !== 'in') return false; return true; });
    if(currentFilter === 'rating') displayList.sort((a,b) => b.avgScore - a.avgScore); else displayList.sort((a,b) => a.status === 'out' ? -1 : 1);
    displayList.forEach((item) => {
        let contentHtml = ""; let badge = "";
        if(isEditMode) { contentHtml = `<div style="display:flex; flex-direction:column; gap:5px; width:100%;"><label style="font-size:0.75rem; color:var(--text-sub);">Kitap Adı:</label><input type="text" class="edit-input" id="edit-name-${item.originalIndex}" value="${item.name}"><div style="display:flex; gap:10px;"><div style="flex:1;"><label style="font-size:0.75rem; color:var(--text-sub);">Sayfa Sayısı:</label><input type="number" class="edit-input" id="edit-page-${item.originalIndex}" value="${item.pageCount}"></div><button class="btn-save-small" style="align-self:end; height:36px; margin-bottom:5px;" onclick="saveBookEdits(${item.originalIndex})">Kaydet</button></div></div>`; } 
        else {
            let ratingHtml = item.avgScore > 0 ? ` <span style="color:#f59e0b; font-size:0.85rem;">⭐${item.avgScore.toFixed(1)}</span>` : "";
            let pageHtml = item.pageCount > 0 ? `<span style="font-size:0.75rem; color:var(--text-sub); border:1px solid #ccc; padding:2px 6px; border-radius:8px; margin-left:5px;">${item.pageCount} Syf.</span>` : "";
            let details = "";
            if(item.status === 'out') { badge = `<span class="status-badge bg-red" style="color:#ef4444; font-weight:bold; font-size:0.8rem;">Dışarıda</span>`; item.activeList.forEach(r => { let dateColor = "#ef4444"; details += `<div style="font-size:0.85rem; margin-top:5px; display:flex; justify-content:space-between; align-items:center;"><span style="color:${dateColor}">🔴 <b>${r.student}</b> (${r.date})</span><button class="btn-delete" onclick="deleteRecord(${r.id})">Sil</button></div>`; }); } 
            else { badge = `<span class="status-badge bg-green" style="color:#10b981; font-weight:bold; font-size:0.8rem;">Rafta</span>`; if(item.lastReader) details = `<span style="font-size:0.8rem; color:var(--text-sub);">Son: ${item.lastReader.student} (${item.lastReader.date})</span>`; else details = `<span style="font-size:0.8rem; color:var(--text-sub); opacity:0.7;">Hiç okunmadı</span>`; }
            contentHtml = `<div style="display:flex; justify-content:space-between; align-items:center;"><h4 style="margin:0; font-size:1rem; color:var(--text-main);">${item.name} ${ratingHtml} ${pageHtml}</h4>${badge}</div><div style="margin-top:5px;">${details}</div>`;
        }
        div.innerHTML += `<div class="glass-panel" style="padding:15px; margin-bottom:10px; cursor:pointer;" onclick="openBookDetail('${item.name}')">${contentHtml}<div style="font-size:0.75rem; opacity:0.7; margin-top:5px;">Bilgi Ağacı İçin Tıkla 🌳</div></div>`;
    });
}

function openBookDetail(bookName) {
    document.getElementById('bdTitle').innerText = bookName;
    let bookRecs = records.filter(r => normalizeStr(r.book) === normalizeStr(bookName) && r.status === "İade Etti");
    document.getElementById('bdStats').innerText = `${bookRecs.length} Meyve Toplandı`;
    let fruitsContainer = document.getElementById('treeFruitsContainer');
    fruitsContainer.innerHTML = "";
    bookRecs.forEach((r, i) => {
        let icon = r.comment ? "🍎" : "🍏";
        let fruit = document.createElement('div');
        fruit.className = 'tree-fruit';
        fruit.innerText = icon;
        fruit.style.left = (40 + Math.random() * 320) + "px";
        fruit.style.top = (30 + Math.random() * 250) + "px";
        fruit.onclick = () => showFruitDetail(r);
        fruitsContainer.appendChild(fruit);
    });
    let listContainer = document.getElementById('bdReviews');
    listContainer.innerHTML = "";
    if(bookRecs.length === 0) listContainer.innerHTML = "<div style='text-align:center; padding:10px; color:#ccc;'>Henüz yorum yok.</div>";
    bookRecs.sort((a,b) => b.id - a.id).forEach(r => {
        let starStr = r.rating ? "⭐".repeat(r.rating) : "";
        let cardHtml = r.cardTitle ? `<span class="rc-badge">${r.cardTitle}</span>` : "";
        let commentHtml = r.comment ? `<div class="rc-text">"${r.comment}"</div>` : "<div class='rc-text' style='opacity:0.5'>(Yorumsuz)</div>";
        listContainer.innerHTML += `<div class="review-card"><div class="rc-header"><span>${r.student}</span><span>${starStr}</span></div>${cardHtml}${commentHtml}<div style="font-size:0.7rem; color:var(--text-sub); text-align:right;">${r.returnDate}</div></div>`;
    });
    document.getElementById('fruitDetailBox').style.display = 'none';
    document.getElementById('bookDetailOverlay').style.display = 'flex';
}

function showFruitDetail(rec) {
    let box = document.getElementById('fruitDetailBox');
    let starStr = rec.rating ? "⭐".repeat(rec.rating) : "";
    document.getElementById('fdStudent').innerText = `${rec.student} ${starStr}`;
    document.getElementById('fdCard').innerText = rec.cardTitle || "Standart Okuma";
    document.getElementById('fdComment').innerText = rec.comment ? `"${rec.comment}"` : "(Yorum yok)";
    box.style.display = 'block';
}
function closeBookDetail() { document.getElementById('bookDetailOverlay').style.display = 'none'; }

function genReport() { 
    const s = document.getElementById('reportStudentInput').value.trim().toUpperCase(); 
    if(!s) return; 
    let myRecs = records.filter(r => r.student === s).sort((a,b) => a.id - b.id); 
    let currentlyReading = myRecs.filter(r => r.status === "Okuyor"); 
    let history = myRecs.filter(r => r.status === "İade Etti"); 
    let totalP = 0; 
    history.forEach(r => totalP += (parseInt(bookPages[r.book])||0)); 
    let txt = `Sayın Velimiz,\n\n✨ "Her kitap keşfedilmeyi bekleyen ayrı bir dünyadır."\n\nÖğrencimiz *${s}*, bu dönem kütüphanemizden toplam *${myRecs.length}* kitap okuyarak okuma yolculuğunu zenginleştirmiştir.\nToplam Okunan Sayfa: *${totalP}*\n\n`; 
    if (currentlyReading.length > 0) { txt += `🔴 *Şu An Okuduğu:* \n`; currentlyReading.forEach(r => { txt += `- ${r.book} (Alış: ${r.date})\n`; }); txt += `\n`; } 
    if (history.length > 0) { txt += `📚 *Keşfettiği Dünyalar:* \n`; history.forEach((r, i) => { txt += `${i+1}. ${r.book} (✅ Okudu)\n`; }); } 
    txt += `\nİlginiz ve desteğiniz için teşekkür ederiz.\nZeynal Öğretmen`; 
    document.getElementById('reportOutput').innerText = txt; 
    renderSpaceJourney(myRecs.length, 'spaceJourney', 'journeySvg'); 
}

function renderSpaceJourney(count, containerId, svgId) { 
    if(!containerId) containerId = 'spaceJourney';
    if(!svgId) svgId = 'journeySvg';
    const cont = document.getElementById(containerId); 
    const svg = document.getElementById(svgId); 
    if(!cont || !svg) return; 
    cont.querySelectorAll('.station-node, .astronaut').forEach(e => e.remove()); 
    svg.innerHTML = ""; 
    const points = [ {x: 15, y: 90}, {x: 85, y: 80}, {x: 15, y: 65}, {x: 85, y: 55}, {x: 15, y: 40}, {x: 85, y: 30}, {x: 15, y: 20}, {x: 85, y: 10}, {x: 50, y: 5} ]; 
    const w = cont.offsetWidth; 
    const h = cont.offsetHeight; 
    let d = `M ${w*points[0].x/100} ${h*points[0].y/100}`; 
    for(let i=1; i<points.length; i++) { d += ` L ${w*points[i].x/100} ${h*points[i].y/100}`; } 
    let path = document.createElementNS("http://www.w3.org/2000/svg", "path"); 
    path.setAttribute("d", d); path.setAttribute("fill", "none"); path.setAttribute("stroke", "rgba(255, 255, 255, 0.2)"); path.setAttribute("stroke-width", "4"); path.setAttribute("stroke-dasharray", "8,8"); svg.appendChild(path); 
    points.forEach((p, i) => { 
        let rank = RANKS[i]; 
        let isReached = count >= rank.c; 
        let node = document.createElement('div'); 
        node.className = `station-node ${isReached ? 'active' : ''}`; 
        node.style.left = p.x + "%"; 
        node.style.top = p.y + "%"; 
        node.innerHTML = `<div>${rank.t.split(' ')[0]}</div><div class="station-label">${rank.t}<br>${rank.c}</div>`; 
        if(count >= rank.c && (i === RANKS.length-1 || count < RANKS[i+1].c)) { 
            let astro = document.createElement('div'); astro.className = "astronaut"; astro.innerText = "👨‍🚀"; astro.style.left = p.x + "%"; astro.style.top = (p.y - 6) + "%"; cont.appendChild(astro); 
        } 
        cont.appendChild(node); 
    }); 
}

function saveSettings() { let t = parseInt(document.getElementById('set-target').value); let s = parseInt(document.getElementById('set-silver').value); let g = parseInt(document.getElementById('set-gold').value); if(!t || !s || !g) { alert("Lütfen geçerli sayılar girin."); return; } settings.classTarget = t; settings.silverLimit = s; settings.goldLimit = g; updateUI(); syncData(); alert("Ayarlar kaydedildi!"); }
function addSingleStudent() { let name = document.getElementById('single-student-add').value.trim().toUpperCase(); let pass = document.getElementById('single-student-pass').value.trim(); if(name && !students.includes(name)) { students.push(name); students.sort(); studentPassObj[name] = pass; updateUI(); syncData(); document.getElementById('single-student-add').value=""; document.getElementById('single-student-pass').value=""; alert("Öğrenci ve şifresi eklendi."); } else { alert("İsim boş veya zaten var."); } }
function delSingleStudent() { let name = document.getElementById('single-student-del').value.trim().toUpperCase(); if(name && students.includes(name)) { if(confirm("DİKKAT: " + name + " silinsin mi?")) { students = students.filter(s => s !== name); delete studentPassObj[name]; records = records.filter(r => r.student !== name); updateUI(); syncData(); document.getElementById('single-student-del').value=""; alert("Silindi."); } } else { alert("Öğrenci bulunamadı."); } }
function renderPassManager() { let div = document.getElementById('studentPassList'); div.innerHTML = ""; students.sort().forEach(s => { let pass = studentPassObj[s] || ""; div.innerHTML += `<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:5px; border-bottom:1px solid rgba(0,0,0,0.1); padding:5px;"><span style="font-size:0.9rem; font-weight:600;">${s}</span><input type="text" value="${pass}" placeholder="Şifre Yok" style="width:80px; padding:4px; font-size:0.8rem; text-align:center; border:1px solid #ccc; border-radius:4px;" onchange="updateStudentPass('${s}', this.value)"></div>`; }); }
function updateStudentPass(name, newPass) { studentPassObj[name] = newPass; syncData(); }
function addNewBook() { let name = document.getElementById('newBookInput').value.trim(); if(!name) return alert("Kitap adı girin."); let page = prompt("Sayfa sayısı:", "100"); if(!books.includes(name)) { books.push(name); books.sort(); } bookPages[name] = parseInt(page) || 0; document.getElementById('newBookInput').value = ""; updateUI(); syncData(); }
function delSingleBook(name) { if(confirm(name + " kitabı silinsin mi?")) { books = books.filter(b => b !== name); delete bookPages[name]; updateUI(); syncData(); } }
function copyReport() { navigator.clipboard.writeText(document.getElementById('reportOutput').innerText); alert("Kopyalandı!"); }
function populateDatalists() { let sl = document.getElementById('studentList'); sl.innerHTML = ''; students.sort().forEach(s => { sl.innerHTML += `<option value="${s}">`; }); let bl = document.getElementById('bookList'); bl.innerHTML = ''; books.sort().forEach(b => { bl.innerHTML += `<option value="${b}">`; }); }
function resetAllData() { let p = prompt("TÜM VERİLERİ SİLMEK İÇİN ŞİFREYİ GİRİN:"); if(p === teacherPassword) { if(confirm("Emin misiniz? Tüm öğrenciler, kitaplar ve kayıtlar silinecek!")) { students = []; books = []; records = []; bookPages = {}; studentPassObj={}; settings = { classTarget: 500, silverLimit: 3, goldLimit: 5 }; updateUI(); syncData(); alert("Sıfırlandı."); } } else { alert("Hatalı şifre!"); } }
function getMedals(count) { let goldCount = Math.floor(count / settings.goldLimit); let silverCount = Math.floor(count / settings.silverLimit); let medals = ""; for(let i=0; i<goldCount; i++) medals += "🥇"; for(let i=0; i<silverCount; i++) medals += "🥈"; return medals; }
function getRank(count) { if(count >= 40) return "💎 EFSANE"; if(count >= 35) return "🌍 Bilge Okur"; if(count >= 30) return "🎩 Edebiyat Ustası"; if(count >= 25) return "👑 Kütüphane Muhafızı"; if(count >= 20) return "🏹 Kelime Avcısı"; if(count >= 15) return "🚀 Bilgi Kaşifi"; if(count >= 10) return "📖 Kitap Kurdu"; if(count >= 5)  return "🥉 Okuma Çırağı"; return "🌱 Başlangıç"; }
function toggleStatsSort() { if(statsSortMode === 'book_desc') { statsSortMode = 'book_asc'; document.getElementById('sortBtnIcon').innerText = "Sırala: Kitap ⬆"; } else if (statsSortMode === 'book_asc') { statsSortMode = 'page_desc'; document.getElementById('sortBtnIcon').innerText = "Sırala: Sayfa ⬇"; } else { statsSortMode = 'book_desc'; document.getElementById('sortBtnIcon').innerText = "Sırala: Kitap ⬇"; } renderRanking(); }
function renderRanking() { let counts = {}; let pageCounts = {}; records.forEach(r => { if(r.status === "İade Etti") { counts[r.student] = (counts[r.student]||0)+1; let p = parseInt(bookPages[r.book]) || 0; pageCounts[r.student] = (pageCounts[r.student]||0) + p; } }); let sorted = Object.keys(counts).map(k => ({n:k, c:counts[k], p:pageCounts[k]})); if(sorted.length > 0) { let topReader = sorted.reduce((prev, current) => (prev.c > current.c) ? prev : current); document.getElementById('statTopReader').innerText = topReader.n; } else { document.getElementById('statTopReader').innerText = "-"; } if(statsSortMode === 'book_desc') sorted.sort((a,b) => b.c - a.c); else if(statsSortMode === 'book_asc') sorted.sort((a,b) => a.c - b.c); else if(statsSortMode === 'page_desc') sorted.sort((a,b) => b.p - a.p); let html = ""; sorted.forEach((s,i) => { let rank = getRank(s.c); let medals = getMedals(s.c); let highlight = (i === 0 && statsSortMode !== 'book_asc') ? "color:#f59e0b;" : "color:var(--text-sub);"; let rankNum = (i === sorted.length - 1 && sorted.length > 1) ? `<span style="color:#ef4444; font-size:0.7rem;">(Son)</span>` : `${i+1}.`; if (i === 0) rankNum = "👑"; html += `<div class="list-item"><div class="item-content"><span style="font-weight:bold; ${highlight} margin-right:10px; min-width:20px; display:inline-block;">${rankNum}</span><span style="font-weight:600;">${s.n}</span><div class="rank-info">${rank}</div><div class="medal-container">${medals}</div></div><div style="text-align:right;"><div style="font-weight:800; color:var(--primary); font-size:1.1rem;">${s.c} Kitap</div><div style="font-size:0.75rem; color:var(--text-sub); margin-top:2px;">${s.p.toLocaleString()} Sayfa</div></div></div>`; }); document.getElementById('rankingList').innerHTML = html; }
function deleteRecord(id) { if(confirm("Silmek istiyor musunuz?")) { records = records.filter(r => r.id !== id); updateUI(); syncData(); } }

function renderStudentPanel() {
    let myRecs = records.filter(r => r.student === loggedInStudent);
    let completedRecs = myRecs.filter(r => r.status === "İade Etti");
    let totalBooks = completedRecs.length;
    let totalPages = 0;
    completedRecs.forEach(r => totalPages += (parseInt(bookPages[r.book]) || 0));

    document.getElementById('stName').innerText = loggedInStudent;
    document.getElementById('stRank').innerText = getRank(totalBooks); 
    document.getElementById('stMedals').innerText = getMedals(totalBooks); 
    document.getElementById('stBookCount').innerText = totalBooks;
    document.getElementById('stPageCount').innerText = totalPages;

    renderSpaceJourney(totalBooks, 'studentSpaceJourney', 'studentJourneySvg');

    const listDiv = document.getElementById('studentMyBooksList');
    listDiv.innerHTML = "";
    if(myRecs.length === 0) listDiv.innerHTML = "<p style='text-align:center; opacity:0.6;'>Henüz bir macera başlamadı.</p>";
    
    myRecs.forEach(r => {
        let statusHtml = r.status === "Okuyor" ? `<span style="color:#2563eb; font-weight:bold;">Okuyorsun</span>` : `<span style="color:#10b981; font-weight:bold;">Teslim Ettin</span>`;
        let actionBtn = "";
        if(r.status === "İade Etti") {
            actionBtn = !r.rating ? `<button class="btn-comment" onclick="studentRateBook(${r.id})">Değerlendir</button>` : `<span style="font-size:0.8rem; color:#f59e0b;">⭐ ${r.rating}</span>`;
        }
        listDiv.innerHTML += `<div class="list-item"><div class="item-content"><h4>${r.book}</h4><p>${r.date} • ${statusHtml}</p></div>${actionBtn}</div>`;
    });
}
