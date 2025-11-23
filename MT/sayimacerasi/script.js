// --- VERİ VE DURUM ---
let State = {
    number: "",
    mode: null, // null, 'swap', 'digit'
    selection: null,
    tempAnalysis: {}
};

const basamakIsimleri = ["Birler", "Onlar", "Yüzler", "Binler", "On Binler", "Yüz Binler", "Milyonlar", "On Milyonlar", "Yüz Milyonlar", "Milyarlar", "On Milyarlar", "Yüz Milyarlar"];
const bolukIsimleri = ["Birler", "Binler", "Milyonlar", "Milyarlar"];
const birimEkleri = {
    "Birler": "Birlik", "Onlar": "Onluk", "Yüzler": "Yüzlük",
    "Binler": "Binlik", "On Binler": "On Binlik", "Yüz Binler": "Yüz Binlik",
    "Milyonlar": "Milyonluk", "On Milyonlar": "On Milyonluk", "Yüz Milyonlar": "Yüz Milyonluk",
    "Milyarlar": "Milyarlık", "On Milyarlar": "On Milyarlık", "Yüz Milyarlar": "Yüz Milyarlık"
};
const renkler = ["#fab1a0", "#55efc4", "#74b9ff", "#a29bfe", "#ffeaa7", "#ff7675"];
const alfabe = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";

// --- BAŞLANGIÇ ---
document.addEventListener('DOMContentLoaded', () => {
    generateRandomNumber(9); // Varsayılan 9 basamak
    fillAlphabetRef();
    switchTab('test'); // TEST İLE BAŞLA
    
    // Event Listeners
    setupTabs();
    setupSettings();
    setupWrite();
    setupCipher();
});

// --- GÖRÜNTÜLEME MOTORU (SÜNGER ALGORİTMASI) ---
function renderDisplay() {
    const container = document.getElementById('number-display');
    container.innerHTML = "";
    
    let isGrouped = document.getElementById('tg-group').checked;
    if(State.mode === 'swap') isGrouped = true; // Swap modunda zorunlu grupla

    container.className = isGrouped ? "number-flex grouped colored" : "number-flex";

    // Sayıyı Bölüklere Ayır
    let parts = [];
    let tempStr = State.number;
    while(tempStr.length > 0) {
        parts.unshift(tempStr.slice(-3));
        tempStr = tempStr.slice(0, -3);
    }

    // Dinamik Boyut Hesaplama (Ekran Genişliğine Göre)
    // Wrapper genişliği
    const wrapperW = document.querySelector('.number-container-wrapper').offsetWidth;
    const totalDigits = State.number.length;
    // Boşluk payları
    const gaps = isGrouped ? (parts.length * 15) : (totalDigits * 2);
    
    // Bir kutu ne kadar geniş olabilir?
    let boxWidth = (wrapperW - gaps - 40) / totalDigits;
    
    // Sınırlandırma (Çok büyümesin, çok küçülmesin)
    if(boxWidth > 65) boxWidth = 65;
    if(boxWidth < 25) boxWidth = 25;
    
    let boxHeight = boxWidth * 1.4;
    let fontSize = boxWidth * 0.6;

    // DOM Oluşturma
    parts.forEach((part, pIdx) => {
        let revIdx = parts.length - 1 - pIdx; // 0=Birler Bölüğü
        let chars = part.split('');
        
        // Grup Kutusu
        let groupDiv = document.createElement('div');
        groupDiv.className = `digit-group g-${revIdx}`;
        
        if(State.mode === 'swap') {
            groupDiv.onclick = () => handleSwapClick(pIdx);
            if(State.selection === pIdx) groupDiv.classList.add('selected-swap');
        }

        // Rakamlar
        let digitsHtml = `<div class="d-row" style="display:flex; gap:2px">`;
        
        // Sağdan sola index offseti
        let rightOffset = 0;
        for(let k = pIdx + 1; k < parts.length; k++) rightOffset += 3;

        chars.forEach((d, dIdx) => {
            let power = rightOffset + (chars.length - 1 - dIdx); // 10^power
            let realIndex = State.number.length - 1 - power; // String index

            let activeClass = "";
            if(State.mode === 'digit' && State.selection === realIndex) activeClass = "selected-digit";

            // Tıklama Eventi
            let clickAttr = "";
            if(State.mode === 'digit') clickAttr = `onclick="event.stopPropagation(); handleDigitClick(${realIndex})"`;
            else if(!State.mode) clickAttr = `onclick="event.stopPropagation(); analyzeDigit(${power}, '${d}', this)"`;

            // Style String
            let style = `width:${boxWidth}px; height:${boxHeight}px; font-size:${fontSize}px;`;

            digitsHtml += `<div class="d-box ${activeClass}" style="${style}" ${clickAttr}>${d}</div>`;
        });
        digitsHtml += `</div>`;

        // Grup Etiketi
        if(isGrouped) {
            digitsHtml += `<div class="grp-label" style="font-size:${boxWidth*0.25}px">${bolukIsimleri[revIdx]}</div>`;
        }

        groupDiv.innerHTML = digitsHtml;
        container.appendChild(groupDiv);
    });

    updateBadge();
}

// Ekran dönünce yeniden hesapla
window.onresize = renderDisplay;

// --- MANTIK VE STATE GÜNCELLEME ---
function updateState(newNum) {
    State.number = newNum;
    // Modları sıfırla
    resetModes();
    // Tüm görünümleri yenile
    renderDisplay();
    renderLadder();
    generateQuiz();
    generateWriteQuestion();
    
    // Analizi sıfırla
    document.getElementById('analiz-intro').style.display = 'block';
    document.getElementById('analiz-reveal').style.display = 'none';
    document.getElementById('analiz-data').style.display = 'none';
}

function generateRandomNumber(digits) {
    let n = Math.floor(Math.random() * 9 + 1).toString();
    for(let i=1; i<digits; i++) n += Math.floor(Math.random() * 10).toString();
    updateState(n);
}

// --- MOD YÖNETİMİ ---
function resetModes() {
    State.mode = null;
    State.selection = null;
    document.getElementById('tg-swap').checked = false;
    document.getElementById('tg-digit').checked = false;
    // Gruplama ayarı kullanıcıda kalsın, ellemiyoruz (Swap hariç)
    document.getElementById('analiz-intro').innerHTML = '<i class="fas fa-hand-pointer"></i> Analiz etmek için yukarıdaki bir rakama dokunun!';
}

function toggleSwapMode(isChecked) {
    if(isChecked) {
        State.mode = 'swap';
        State.selection = null;
        document.getElementById('tg-digit').checked = false; // Diğerini kapat
        document.getElementById('tg-group').checked = true; // Gruplama aç
        switchTab('analiz');
        document.getElementById('analiz-intro').innerHTML = "Yer değiştirmek için <b>iki bölüğe</b> sırayla dokunun.";
    } else {
        State.mode = null;
        State.selection = null;
    }
    renderDisplay();
}

function toggleDigitMode(isChecked) {
    if(isChecked) {
        State.mode = 'digit';
        State.selection = null;
        document.getElementById('tg-swap').checked = false; // Diğerini kapat
        switchTab('analiz');
        document.getElementById('analiz-intro').innerHTML = "Yer değiştirmek için <b>iki rakama</b> sırayla dokunun.";
    } else {
        State.mode = null;
        State.selection = null;
    }
    renderDisplay();
}

function updateBadge() {
    const badge = document.getElementById('mode-badge');
    if(State.mode === 'swap') { badge.style.display = 'block'; badge.innerText = "BÖLÜK TAŞIMA MODU"; }
    else if(State.mode === 'digit') { badge.style.display = 'block'; badge.innerText = "RAKAM TAŞIMA MODU"; }
    else badge.style.display = 'none';
}

// --- İŞLEMLER (TAŞIMA) ---
function handleSwapClick(idx) {
    if(State.selection === null) {
        State.selection = idx;
        renderDisplay();
    } else if (State.selection === idx) {
        State.selection = null; // İptal
        renderDisplay();
    } else {
        // Değiştir
        let parts = []; let t = State.number;
        while(t.length > 0) { parts.unshift(t.slice(-3)); t=t.slice(0,-3); }
        
        let temp = parts[State.selection];
        parts[State.selection] = parts[idx];
        parts[idx] = temp;
        
        // String birleştir (Dikkat: Ortada kalanlar 0 ile dolmalı)
        let newStr = "";
        parts.forEach((p, i) => {
            if(i === 0) newStr += parseInt(p).toString(); 
            else newStr += p.toString().padStart(3, '0');
        });
        
        // State güncelle ama modu koru
        State.number = parseInt(newStr).toString();
        State.selection = null;
        renderDisplay();
        renderLadder();
        generateQuiz();
        // Mod açık kalsın
    }
}

function handleDigitClick(idx) {
    if(State.selection === null) {
        State.selection = idx;
        renderDisplay();
    } else {
        let arr = State.number.split('');
        let temp = arr[State.selection];
        arr[State.selection] = arr[idx];
        arr[idx] = temp;
        
        State.number = arr.join('');
        State.selection = null;
        renderDisplay();
        renderLadder();
        generateQuiz();
    }
}

// --- ANALİZ ---
function analyzeDigit(power, val, element) {
    // Görsel seçim
    document.querySelectorAll('.d-box').forEach(b => b.classList.remove('active'));
    element.classList.add('active');

    let name = basamakIsimleri[power];
    let placeVal = parseInt(val) * Math.pow(10, power);
    
    // Verileri Hazırla
    document.getElementById('val-name').innerText = name + " Basamağı";
    document.getElementById('val-face').innerText = val;
    document.getElementById('val-place').innerText = placeVal.toLocaleString('tr-TR');
    document.getElementById('val-exp').innerHTML = `${val} x 10<sup>${power}</sup>`;
    document.getElementById('val-unit').innerText = `${val} tane ${birimEkleri[name] || name}`;
    document.getElementById('val-read').innerText = numberToText(parseInt(State.number));

    // UI Göster
    document.getElementById('analiz-intro').style.display = 'none';
    document.getElementById('analiz-data').style.display = 'none';
    document.getElementById('analiz-reveal').style.display = 'block';
    switchTab('analiz');
}

// --- MERDİVEN ---
function renderLadder() {
    const container = document.getElementById('ladder-stage');
    container.innerHTML = "";
    let len = State.number.length;
    let parts = [];

    for(let i=0; i<len; i++) {
        let d = parseInt(State.number[i]);
        let p = len - 1 - i;
        let v = d * Math.pow(10, p);
        
        // Sütun Wrapper
        let col = document.createElement('div');
        col.className = 'ladder-col';
        
        // Boyut
        let h = 5 + (p * 8.5); if(h>98) h=98;
        
        col.innerHTML = `
            <div class="ladder-bar" style="height:${h}%; background:${renkler[p%6]}; animation-delay:${i*0.05}s">
                <span class="bar-txt">${d} x 10<sup>${p}</sup> = ${v.toLocaleString()}</span>
            </div>
            <div class="bar-lbl"><span>${basamakIsimleri[p]}</span></div>
        `;
        container.appendChild(col);
        if(d>0) parts.push(`(${d} x ${Math.pow(10, p).toLocaleString()})`);
    }
    document.getElementById('ladder-text').innerText = parts.join(' + ');
}

// --- TEST ---
function generateQuiz() {
    const container = document.getElementById('quiz-list');
    container.innerHTML = "";
    const len = State.number.length;
    
    // Eşitlik Sayısı
    let eqCount = 0;
    for(let i=0; i<len; i++) {
        let d = parseInt(State.number[i]);
        let p = len - 1 - i;
        if(d === d * Math.pow(10, p)) eqCount++; // 0 veya birler basamağı
    }

    for(let k=0; k<10; k++) {
        let type = Math.floor(Math.random() * 5);
        let q = "", a = "";
        
        if(type === 0) {
            let i = Math.floor(Math.random() * len);
            let p = len - 1 - i;
            q = `<strong>${basamakIsimleri[p]}</strong> basamağındaki rakam kaçtır?`;
            a = State.number[i];
        } else if (type === 1) {
            let i = Math.floor(Math.random() * len);
            let p = len - 1 - i;
            q = `<strong>${basamakIsimleri[p]}</strong> basamağının basamak değeri kaçtır?`;
            a = (parseInt(State.number[i]) * Math.pow(10, p)).toLocaleString();
        } else if (type === 2) {
            q = "Sayı değerleri toplamı kaçtır?";
            a = State.number.split('').reduce((acc, val) => acc + parseInt(val), 0);
        } else if (type === 3) {
            q = "Basamak değeri sayı değerine eşit olan kaç rakam vardır?";
            a = eqCount;
        } else {
            q = "Bu sayı kaç basamaklıdır?";
            a = len;
        }

        let item = document.createElement('div');
        item.className = "quiz-item";
        item.innerHTML = `
            <div class="q-text">Soru ${k+1}: ${q}</div>
            <button class="btn-ans">CEVAP</button>
            <div class="ans-reveal">${a}</div>
        `;
        // Event Listener for Answer Button
        item.querySelector('button').onclick = function() {
            this.nextElementSibling.style.display = 'block';
            this.style.display = 'none';
        };
        container.appendChild(item);
    }
}

// --- YAZMA & ŞİFRE ---
let writeTarget = "";
function generateWriteQuestion() {
    let d = parseInt(document.getElementById('write-digit-select').value);
    let n = Math.floor(Math.random() * 9 + 1).toString();
    for(let i=1; i<d; i++) n += Math.floor(Math.random() * 10).toString();
    writeTarget = n;
    document.getElementById('write-question').innerText = numberToText(parseInt(n));
    document.getElementById('write-input').value = "";
    document.getElementById('write-feedback').innerHTML = "";
}

function checkWrite() {
    let val = document.getElementById('write-input').value.replace(/\D/g, '');
    let fb = document.getElementById('write-feedback');
    if(val === writeTarget) fb.innerHTML = "<span style='color:#00b894'>HARİKA! DOĞRU.</span>";
    else fb.innerHTML = "<span style='color:#d63031'>YANLIŞ. CEVAP: " + writeTarget + "</span>";
}

function fillAlphabetRef() {
    let html = "";
    alfabe.split('').forEach((char, i) => {
        html += `<div class="alpha-card"><div>${char}</div><div style="color:#d63031">${i+1}</div></div>`;
    });
    document.getElementById('alphabet-ref').innerHTML = html;
}

function doCipher() {
    let val = document.getElementById('cipher-input').value.toLocaleUpperCase('tr-TR');
    let res = document.getElementById('cipher-output');
    res.innerHTML = "";
    let total = 0;
    
    for(let char of val) {
        let idx = alfabe.indexOf(char) + 1;
        if(idx > 0) {
            total += idx;
            res.innerHTML += `<div class="c-box"><div style="font-size:1.2rem">${char}</div><div style="color:#d63031">${idx}</div></div>`;
        }
    }
    document.getElementById('cipher-total').innerText = "TOPLAM: " + total;
}

// --- YARDIMCILAR ---
function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if(btn.dataset.target === id) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => switchTab(btn.dataset.target);
    });
}

function setupSettings() {
    document.getElementById('btn-gen-num').onclick = () => {
        generateRandomNumber(parseInt(document.getElementById('gen-digit-select').value));
    };
    document.getElementById('btn-manual-set').onclick = () => {
        let v = document.getElementById('manual-input').value.slice(0,12);
        if(v) { updateState(v); switchTab('analiz'); }
    };
    document.getElementById('tg-group').onchange = renderDisplay;
    document.getElementById('tg-swap').onchange = (e) => toggleSwapMode(e.target.checked);
    document.getElementById('tg-digit').onchange = (e) => toggleDigitMode(e.target.checked);
}

function setupWrite() {
    document.getElementById('btn-new-write').onclick = generateWriteQuestion;
    document.getElementById('btn-check-write').onclick = checkWrite;
}

function setupCipher() {
    document.getElementById('btn-cipher').onclick = doCipher;
}

document.getElementById('btn-renew-quiz').onclick = generateQuiz;
document.getElementById('btn-show-analysis').onclick = () => {
    document.getElementById('analiz-reveal').style.display='none';
    document.getElementById('analiz-data').style.display='block';
};

// TÜRKÇE SAYI OKUNUŞU
function numberToText(n){if(n==0)return"Sıfır";const o=["","Bir","İki","Üç","Dört","Beş","Altı","Yedi","Sekiz","Dokuz"];const t=["","On","Yirmi","Otuz","Kırk","Elli","Altmış","Yetmiş","Seksen","Doksan"];const p=["","Bin","Milyon","Milyar"];let s=n.toString(),out="",parts=[];while(s.length>0){parts.push(s.slice(-3));s=s.slice(0,-3)}for(let i=parts.length-1;i>=0;i--){let x=parseInt(parts[i]);if(x>0){let y=Math.floor(x/100),te=Math.floor((x%100)/10),un=x%10;if(y==1)out+="Yüz ";else if(y>1)out+=o[y]+" Yüz ";out+=t[te]+" "+o[un]+" ";if(i==1&&x==1)out="";out+=p[i]+" "}}return out.trim()}

</script>
</body>
</html>
