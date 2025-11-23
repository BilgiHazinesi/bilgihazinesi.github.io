document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTLER ---
    const manualNum1 = document.getElementById('manual-num1');
    const manualNum2 = document.getElementById('manual-num2');
    const generateBtn = document.getElementById('generate-btn');
    const gridContainer = document.getElementById('multiplication-grid');
    
    const startBtn = document.getElementById('start-btn');
    const nextStepBtn = document.getElementById('next-step-btn');
    const resetBtn = document.getElementById('reset-btn');
    const checkBtn = document.getElementById('check-btn');

    const missingDigitModeToggle = document.getElementById('missing-digit-mode');
    const missingModeHint = document.getElementById('missing-mode-hint');
    const animationControls = document.querySelector('.animation-controls');
    const checkingControls = document.querySelector('.checking-controls');

    // --- DURUM DEĞİŞKENLERİ ---
    let animationQueue = [];
    let currentStepIndex = 0;
    let animationInterval = null;
    let solutionMap = new Map();
    let num1Str = "125";
    let num2Str = "45";
    let totalCols = 0;

    // --- BAŞLANGIÇ ---
    // İlk açılışta gridi oluştur
    updateGridFromInputs(); 

    // --- EVENT LISTENERS ---

    // 1. Manuel Giriş Yapıldığında Anında Güncelle
    manualNum1.addEventListener('input', () => {
        // En fazla 6 basamak
        if(manualNum1.value.length > 6) manualNum1.value = manualNum1.value.slice(0,6);
        updateGridFromInputs();
    });
    
    manualNum2.addEventListener('input', () => {
        // En fazla 3 basamak
        if(manualNum2.value.length > 3) manualNum2.value = manualNum2.value.slice(0,3);
        updateGridFromInputs();
    });

    // 2. Rastgele Sayı Üret (Sadece Inputları değiştirir, input listener gridi günceller)
    generateBtn.addEventListener('click', () => {
        const r1 = Math.floor(Math.random() * 900) + 100; // 3 basamaklı örnek
        const r2 = Math.floor(Math.random() * 90) + 10;   // 2 basamaklı örnek
        manualNum1.value = r1;
        manualNum2.value = r2;
        updateGridFromInputs();
    });

    // 3. Mod Değişimi
    missingDigitModeToggle.addEventListener('change', () => {
        const isMissingMode = missingDigitModeToggle.checked;
        
        // UI Güncelle
        missingModeHint.style.display = isMissingMode ? 'inline' : 'none';
        animationControls.style.display = isMissingMode ? 'none' : 'flex';
        checkingControls.style.display = isMissingMode ? 'block' : 'none';

        // Grid'i tazele (Eldeleri gizlemek/göstermek için)
        // ÖNEMLİ: Sayıları değiştirmiyoruz!
        setupGrid(isMissingMode);
        
        // Eğer gizli moda geçildiyse sonuçları dolduruyoruz ki öğretmen neyi gizleyeceğini seçsin
        if (isMissingMode) {
            prepareAnimation(); // Çözümü hesapla
            fillGridWithResults(); // Sonuçları yaz
        } else {
            // Animasyon moduna geçildiyse temizle
            clearResults();
        }
    });

    // 4. Kontroller
    startBtn.addEventListener('click', runAnimation);
    nextStepBtn.addEventListener('click', doNextStep);
    
    resetBtn.addEventListener('click', () => {
        // Sadece çözümü sil, sayıları koru
        stopAnimation();
        clearResults();
    });

    checkBtn.addEventListener('click', checkSolution);


    // --- TEMEL FONKSİYONLAR ---

    function updateGridFromInputs() {
        stopAnimation();
        num1Str = manualNum1.value || "0";
        num2Str = manualNum2.value || "0";
        setupGrid(missingDigitModeToggle.checked);
        // Çözümü şimdiden hesapla (hazır olsun)
        prepareAnimation();
    }

    function setupGrid(isMissingMode) {
        gridContainer.innerHTML = '';
        
        const n1 = num1Str;
        const n2 = num2Str;
        const len1 = n1.length;
        const len2 = n2.length;
        const maxResultLen = len1 + len2;

        // Grid genişliği: Sonuç uzunluğu + Solda '+' sembolü için pay + Sağda taşma payı
        totalCols = Math.max(len1, len2 + 1, maxResultLen) + 2;
        
        gridContainer.style.gridTemplateColumns = `repeat(${totalCols}, 45px)`; // Biraz daha geniş hücreler

        // A. ÇARPMA ELDELERİ (Lila - En Üst)
        // Sadece animasyon modunda göster
        if (!isMissingMode) {
            for (let r = 0; r < len2; r++) {
                // Boşluklar
                for(let k=0; k < totalCols - len1; k++) gridContainer.appendChild(createCell(''));
                // Elde hücreleri
                for (let i = 0; i < len1; i++) {
                    const colIndex = len1 - i; // Elde, bir sonraki basamağın (solun) üzerine gelir.
                    // Matematiksel olarak: i. basamağın eldesi i+1 (sola) gider.
                    // Grid görseli sağa dayalı:
                    // Birler basamağı (sağdan 0) hesaplanınca eldesi sağdan 1. sütuna gider.
                    gridContainer.appendChild(createCell('', `carry-${r}`, colIndex, 'cell-carry'));
                }
            }
        }

        // B. 1. ÇARPAN
        for(let k=0; k < totalCols - len1; k++) gridContainer.appendChild(createCell(''));
        for (let i = 0; i < len1; i++) {
            const colIndex = len1 - 1 - i;
            // Tıklanabilir hücre (Sadece Gizli Modda işlevsel olacak)
            const cell = createCell(n1[i], 'num1', colIndex, 'cell-num1');
            addClickToToggle(cell); // Tıklama özelliği ekle
            gridContainer.appendChild(cell);
        }

        // C. 2. ÇARPAN ve 'x'
        for(let k=0; k < totalCols - len2 - 1; k++) gridContainer.appendChild(createCell(''));
        gridContainer.appendChild(createCell('x', null, null, 'cell-sign'));
        for (let i = 0; i < len2; i++) {
            const placeIndex = (len2 - 1) - i;
            const colIndex = len2 - 1 - i;
            const cell = createCell(n2[i], 'num2', colIndex, 'cell-num2', `num2-digit-${placeIndex}`);
            addClickToToggle(cell); // Tıklama özelliği ekle
            gridContainer.appendChild(cell);
        }

        // ÇİZGİ
        for(let k=0; k<totalCols; k++) gridContainer.appendChild(createCell('', null, null, 'cell-line'));

        // D. KISMİ ÇARPIMLAR
        for (let i = 0; i < len2; i++) {
            const rowClass = `partial-row-${i}`;
            for (let j = 0; j < totalCols; j++) {
                const colIndex = totalCols - 1 - j;
                const cell = createCell('', `partial-${i}`, colIndex, 'cell-partial', rowClass);
                
                // '+' Sembolü (En Sola, Son satırsa)
                if (len2 > 1 && i === len2 - 1 && j === 0) {
                    cell.textContent = '+';
                    cell.classList.remove('cell-partial', rowClass);
                    cell.classList.add('cell-sign');
                }
                gridContainer.appendChild(cell);
            }
        }

        // E. TOPLAMA ELDELERİ (Gri - Arada)
        if (len2 > 1 && !isMissingMode) {
            for(let j=0; j<totalCols; j++) {
                const colIndex = totalCols - 1 - j;
                gridContainer.appendChild(createCell('', 'add-carry', colIndex, 'cell-add-carry'));
            }
        }

        // ÇİZGİ 2
        if (len2 > 1) {
            for(let k=0; k<totalCols; k++) gridContainer.appendChild(createCell('', null, null, 'cell-line'));
        }

        // F. SONUÇ
        if (len2 > 1) {
            for(let j=0; j<totalCols; j++) {
                const colIndex = totalCols - 1 - j;
                gridContainer.appendChild(createCell('', 'result', colIndex, 'cell-result'));
            }
        }
    }

    // --- GİZLEME MANTIĞI (ÖĞRETMEN SEÇİMİ) ---
    function addClickToToggle(cell) {
        cell.classList.add('cell-clickable');
        cell.addEventListener('click', () => {
            // Sadece Gizli Modda çalışır
            if (!missingDigitModeToggle.checked) return;

            // Eğer şu an bir input ise -> Sayıya çevir
            if (cell.querySelector('input')) {
                const input = cell.querySelector('input');
                cell.textContent = input.dataset.original; // Orijinal sayıyı geri yaz
            } 
            // Eğer sayı ise -> Inputa çevir
            else {
                const originalVal = cell.textContent;
                if (!originalVal) return; // Boşsa işlem yapma
                
                cell.innerHTML = '';
                const input = document.createElement('input');
                input.type = 'text';
                input.maxLength = 1;
                input.classList.add('missing-digit-input');
                input.dataset.correct = originalVal; // Doğru cevabı sakla
                input.dataset.original = originalVal; // Geri dönüş için sakla
                
                // Tıklayınca inputun içine odaklanmayı engelleme, grid tıklamasını durdur
                input.addEventListener('click', (e) => e.stopPropagation());
                
                cell.appendChild(input);
            }
        });
    }

    // --- ANİMASYON MOTORU ---

    function prepareAnimation() {
        animationQueue = [];
        solutionMap.clear();

        const n1Arr = num1Str.split('').reverse().map(Number);
        const n2Arr = num2Str.split('').reverse().map(Number);
        let partialProducts = [];

        // FAZ 1: ÇARPMA
        for (let i = 0; i < n2Arr.length; i++) {
            const d2 = n2Arr[i];
            let carry = 0;
            let currentPartial = [];
            
            animationQueue.push({ type: 'highlight', selector: `[data-row='num2'][data-col='${i}']` });

            for (let j = 0; j < n1Arr.length; j++) {
                const d1 = n1Arr[j];
                animationQueue.push({ type: 'highlight', selector: `[data-row='num1'][data-col='${j}']` });
                
                const product = (d1 * d2) + carry;
                const writeVal = product % 10;
                carry = Math.floor(product / 10);
                
                // Kısmi çarpım konumu: j (1. çarpan basamağı) + i (2. çarpan kaydırması)
                const pCol = j + i; 

                // Yazma Animasyonu
                animationQueue.push({ type: 'write', selector: `[data-row='partial-${i}'][data-col='${pCol}']`, value: writeVal });
                solutionMap.set(`partial-${i}-${pCol}`, writeVal);
                currentPartial[pCol] = writeVal;

                // Elde Animasyonu (Varsa) - BİR SONRAKİ SÜTUNA (j+1)
                if (carry > 0) {
                    animationQueue.push({ type: 'write', selector: `[data-row='carry-${i}'][data-col='${j+1}']`, value: carry });
                }
                
                animationQueue.push({ type: 'clear' });
                animationQueue.push({ type: 'highlight', selector: `[data-row='num2'][data-col='${i}']` });
            }

            // Son elde (varsa)
            if (carry > 0) {
                const pCol = n1Arr.length + i;
                animationQueue.push({ type: 'write', selector: `[data-row='partial-${i}'][data-col='${pCol}']`, value: carry });
                solutionMap.set(`partial-${i}-${pCol}`, carry);
                currentPartial[pCol] = carry;
            }
            partialProducts.push(currentPartial);
            animationQueue.push({ type: 'clear' });
        }

        // FAZ 2: TOPLAMA
        if (n2Arr.length > 1) {
            let carry = 0;
            const maxCols = totalCols - 1; 

            for (let col = 0; col < maxCols; col++) {
                let sum = carry;
                // Sütunu vurgula
                for(let row=0; row < partialProducts.length; row++) {
                    animationQueue.push({ type: 'highlight', selector: `[data-row='partial-${row}'][data-col='${col}']` });
                    sum += (partialProducts[row][col] || 0);
                }

                const writeVal = sum % 10;
                carry = Math.floor(sum / 10);

                animationQueue.push({ type: 'write', selector: `[data-row='result'][data-col='${col}']`, value: writeVal });
                solutionMap.set(`result-${col}`, writeVal);

                // Toplama Eldesi (Bir sonraki sütuna)
                if (carry > 0) {
                    animationQueue.push({ type: 'write', selector: `[data-row='add-carry'][data-col='${col+1}']`, value: carry });
                }

                animationQueue.push({ type: 'clear' });
            }
        }
    }

    function runAnimation() {
        if (animationInterval) return; // Zaten çalışıyorsa çık
        // Eğer bitmişse veya hiç başlamamışsa
        if (currentStepIndex >= animationQueue.length || currentStepIndex === 0) {
            currentStepIndex = 0;
            clearResults();
        }
        animationInterval = setInterval(doNextStep, 500);
    }

    function doNextStep() {
        if (currentStepIndex >= animationQueue.length) {
            stopAnimation();
            return;
        }
        const step = animationQueue[currentStepIndex];
        
        // Temizleme değilse önceki vurguları kaldır
        if (step.type !== 'clear') clearHighlights();

        if (step.type === 'highlight') {
            const el = document.querySelector(step.selector);
            if (el) el.classList.add('highlight-active');
        } else if (step.type === 'write') {
            const el = document.querySelector(step.selector);
            if (el) el.textContent = step.value;
        } else if (step.type === 'clear') {
            clearHighlights();
        }
        currentStepIndex++;
    }

    function stopAnimation() {
        clearInterval(animationInterval);
        animationInterval = null;
        clearHighlights();
    }

    // --- YARDIMCI İŞLEMLER ---

    function createCell(content, dRow, dCol, ...classes) {
        const div = document.createElement('div');
        div.classList.add('grid-cell');
        if (classes.length) div.classList.add(...classes);
        if (dRow) div.dataset.row = dRow;
        if (dCol !== null && dCol !== undefined) div.dataset.col = dCol;
        div.textContent = content;
        return div;
    }

    function clearResults() {
        // Eldeler, Kısmi Sonuçlar, Final Sonuç, Toplama Eldeleri
        const selectors = ['.cell-carry', '.cell-partial', '.cell-result', '.cell-add-carry'];
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                // '+' işaretini silme
                if (el.textContent !== '+') el.textContent = '';
            });
        });
    }

    function clearHighlights() {
        document.querySelectorAll('.highlight-active').forEach(el => el.classList.remove('highlight-active'));
    }

    // Gizli moda geçince sonuçları otomatik doldurur (ki öğretmen hangisini gizleyeceğini seçebilsin)
    function fillGridWithResults() {
        for (const [key, val] of solutionMap.entries()) {
            const parts = key.split('-');
            let selector = '';
            if (key.startsWith('partial')) selector = `[data-row='${parts[0]}-${parts[1]}'][data-col='${parts[2]}']`;
            else if (key.startsWith('result')) selector = `[data-row='${parts[0]}'][data-col='${parts[1]}']`;
            
            if (selector) {
                const el = document.querySelector(selector);
                if (el) el.textContent = val;
            }
        }
    }

    function checkSolution() {
        const inputs = document.querySelectorAll('.missing-digit-input');
        let allCorrect = true;
        inputs.forEach(inp => {
            inp.classList.remove('correct', 'incorrect');
            if (inp.value === inp.dataset.correct) {
                inp.classList.add('correct');
            } else {
                inp.classList.add('incorrect');
                allCorrect = false;
            }
        });
        if (allCorrect && inputs.length > 0) {
            setTimeout(() => alert("Tebrikler! Hepsi doğru."), 100);
        }
    }
});
