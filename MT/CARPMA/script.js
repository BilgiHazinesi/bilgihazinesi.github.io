document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Elementleri ---
    const digits1Select = document.getElementById('digits1');
    const digits2Select = document.getElementById('digits2');
    const generateBtn = document.getElementById('generate-btn');
    const gridContainer = document.getElementById('multiplication-grid');
    
    // Animasyon Butonları
    const startBtn = document.getElementById('start-btn');
    const nextStepBtn = document.getElementById('next-step-btn');
    const resetBtn = document.getElementById('reset-btn');

    // --- YENİ: Aşama 4 Elementleri ---
    const missingDigitModeToggle = document.getElementById('missing-digit-mode');
    const animationControls = document.querySelector('.animation-controls');
    const checkingControls = document.querySelector('.checking-controls');
    const checkBtn = document.getElementById('check-btn');

    // --- 2. State (Durum) Değişkenleri ---
    let totalCols = 0;
    let num1Str = '';
    let num2Str = '';
    let animationQueue = [];
    let currentStepIndex = 0;
    let animationInterval = null;
    let solutionMap = new Map(); // YENİ: Çözümdeki her rakamı saklar

    // --- 3. Olay Dinleyicileri ---
    generateBtn.addEventListener('click', createProblem);
    startBtn.addEventListener('click', runAnimation);
    nextStepBtn.addEventListener('click', doNextStep);
    resetBtn.addEventListener('click', () => {
        clearInterval(animationInterval);
        createProblem();
    });

    // --- YENİ: Aşama 4 Olay Dinleyicileri ---
    missingDigitModeToggle.addEventListener('change', createProblem); // Mod değişince problemi yeniden kur
    checkBtn.addEventListener('click', checkSolution);

    // --- 4. Ana Fonksiyonlar ---

    /**
     * Ana "Router" Fonksiyonu. Problemi kurar ve modu ayarlar.
     */
    function createProblem() {
        // Tüm animasyonları ve verileri sıfırla
        clearInterval(animationInterval);
        animationQueue = [];
        currentStepIndex = 0;
        solutionMap.clear();
        clearAllHighlights();

        // Sayıları al ve global değişkenlere ata
        const d1 = parseInt(digits1Select.value);
        const d2 = parseInt(digits2Select.value);
        num1Str = generateRandomNumber(d1).toString();
        num2Str = generateRandomNumber(d2).toString();

        // Modu kontrol et
        const isMissingMode = missingDigitModeToggle.checked;

        // Mod'a göre butonları göster/gizle
        if (isMissingMode) {
            animationControls.style.display = 'none';
            checkingControls.style.display = 'block';
        } else {
            animationControls.style.display = 'flex';
            checkingControls.style.display = 'none';
        }

        // 1. Grid'i (boş) kur
        setupGrid(num1Str, num2Str);
        
        // 2. Çözümü (arka planda) hesapla ve solutionMap'i doldur
        prepareAnimation(num1Str, num2Str);

        // 3. Eğer "Verilmeyen Rakam Modu" aktifse, grid'i doldur ve bazılarını gizle
        if (isMissingMode) {
            populateGridForMissingMode();
        }
    }

    // Rastgele sayı üreteci
    function generateRandomNumber(digits) {
        const min = (digits === 1) ? 0 : Math.pow(10, digits - 1);
        const max = Math.pow(10, digits) - 1;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Grid'i (tahtayı) oluşturan fonksiyon
    function setupGrid(num1Str, num2Str) {
        gridContainer.innerHTML = '';
        const len1 = num1Str.length;
        const len2 = num2Str.length;
        const maxResultLen = len1 + len2;
        totalCols = Math.max(len1, len2 + 1, maxResultLen) + 1; 

        gridContainer.style.gridTemplateColumns = `repeat(${totalCols}, 40px)`;

        // 1. Elde Satırları
        for (let r = 0; r < len2; r++) {
            let padding = totalCols - len1;
            for (let i = 0; i < padding; i++) gridContainer.appendChild(createCell(''));
            for (let i = 0; i < len1; i++) {
                const colIndex = len1 - 1 - i;
                gridContainer.appendChild(createCell('', `carry-${r}`, colIndex, 'cell-carry'));
            }
        }

        // 2. 1. Çarpan (num1)
        let paddingNum1 = totalCols - len1;
        for (let i = 0; i < paddingNum1; i++) gridContainer.appendChild(createCell(''));
        for (let i = 0; i < len1; i++) {
            const colIndex = len1 - 1 - i;
            // GÜNCELLENDİ: Rakamı henüz yazma (Moda göre doldurulacak)
            gridContainer.appendChild(createCell('', 'num1', colIndex, 'cell-num1'));
        }

        // 3. 'x' ve 2. Çarpan (num2)
        let paddingNum2 = totalCols - (len2 + 1);
        for (let i = 0; i < paddingNum2; i++) gridContainer.appendChild(createCell(''));
        gridContainer.appendChild(createCell('x', null, null, 'cell-sign'));
        
        for (let i = 0; i < len2; i++) {
            const placeIndex = (len2 - 1) - i;
            const colIndex = len2 - 1 - i;
             // GÜNCELLENDİ: Rakamı henüz yazma (Moda göre doldurulacak)
            gridContainer.appendChild(createCell('', 'num2', colIndex, 'cell-num2', `num2-digit-${placeIndex}`));
        }

        // 4. Çizgi
        for (let i = 0; i < totalCols; i++) gridContainer.appendChild(createCell('', null, null, 'cell-line'));
        
        // 5. Kısmi Çarpımlar
        for (let i = 0; i < len2; i++) {
            const rowClass = `partial-row-${i}`;
            for (let j = 0; j < totalCols; j++) {
                const colIndex = totalCols - 1 - j;
                gridContainer.appendChild(createCell('', `partial-${i}`, colIndex, 'cell-partial', rowClass));
            }
        }

        // 6. Sonuç Çizgisi
        if (len2 > 1) {
            for (let i = 0; i < totalCols; i++) gridContainer.appendChild(createCell('', null, null, 'cell-line'));
        }

        // 7. Final Sonuç
        if (len2 > 1) {
            for (let i = 0; i < totalCols; i++) {
                const colIndex = totalCols - 1 - i;
                gridContainer.appendChild(createCell('', 'result', colIndex, 'cell-result'));
            }
        }
    }

    // --- 5. Animasyon ve Çözüm Fonksiyonları ---

    /**
     * Çözümü hesaplar, animationQueue ve solutionMap'i doldurur.
     */
    function prepareAnimation(num1Str, num2Str) {
        const n1 = num1Str.split('').reverse().map(Number);
        const n2 = num2Str.split('').reverse().map(Number);
        const partialProducts = []; 

        // Adım A: Kısmi Çarpımlar
        for (let i = 0; i < n2.length; i++) {
            const digit2 = n2[i];
            let carry = 0;
            const currentPartialProduct = [];

            animationQueue.push({ type: 'highlight', selector: `[data-row='num2'][data-col='${i}']` });

            for (let j = 0; j < n1.length; j++) {
                const digit1 = n1[j];
                animationQueue.push({ type: 'highlight', selector: `[data-row='num1'][data-col='${j}']` });

                const product = (digit1 * digit2) + carry;
                const resultDigit = product % 10;
                carry = Math.floor(product / 10);
                const partialColIndex = j + i;

                // Animasyon kuyruğuna ekle
                animationQueue.push({ 
                    type: 'write', 
                    selector: `[data-row='partial-${i}'][data-col='${partialColIndex}']`, 
                    value: resultDigit 
                });
                // YENİ: Çözüm haritasına ekle
                solutionMap.set(`partial-${i}-${partialColIndex}`, resultDigit);

                currentPartialProduct[partialColIndex] = resultDigit; 

                if (carry > 0) {
                    animationQueue.push({ 
                        type: 'write', 
                        selector: `[data-row='carry-${i}'][data-col='${j + 1}']`,
                        value: carry 
                    });
                     // YENİ: Çözüm haritasına ekle
                    solutionMap.set(`carry-${i}-${j + 1}`, carry);
                }
                
                animationQueue.push({ type: 'clear' });
                animationQueue.push({ type: 'highlight', selector: `[data-row='num2'][data-col='${i}']` });
            }

            if (carry > 0) {
                const partialColIndex = n1.length + i;
                animationQueue.push({ 
                    type: 'write', 
                    selector: `[data-row='partial-${i}'][data-col='${partialColIndex}']`, 
                    value: carry 
                });
                // YENİ: Çözüm haritasına ekle
                solutionMap.set(`partial-${i}-${partialColIndex}`, carry);
                currentPartialProduct[partialColIndex] = carry;
            }
            partialProducts.push(currentPartialProduct); 
            animationQueue.push({ type: 'clear' });
        }
        
        // Adım B: Final Toplama
        if (n2.length > 1) {
            let carry = 0;
            const maxCols = totalCols - 1;

            for (let j = 0; j < maxCols; j++) {
                let columnSum = carry;
                for (let i = 0; i < n2.length; i++) {
                    animationQueue.push({ type: 'highlight', selector: `[data-row='partial-${i}'][data-col='${j}']` });
                    columnSum += partialProducts[i][j] || 0;
                }

                const resultDigit = columnSum % 10;
                carry = Math.floor(columnSum / 10);

                animationQueue.push({ 
                    type: 'write', 
                    selector: `[data-row='result'][data-col='${j}']`, 
                    value: resultDigit 
                });
                // YENİ: Çözüm haritasına ekle
                solutionMap.set(`result-${j}`, resultDigit); // Toplam sonucunu kaydet
                animationQueue.push({ type: 'clear' });
            }
        }
    }

    /**
     * Animasyon kuyruğundaki bir sonraki adımı çalıştırır.
     */
    function doNextStep() {
        if (currentStepIndex >= animationQueue.length) {
            clearInterval(animationInterval);
            animationInterval = null;
            clearAllHighlights();
            return; 
        }
        const step = animationQueue[currentStepIndex];
        if (step.type !== 'clear') clearAllHighlights();
        executeStep(step);
        currentStepIndex++;
    }

    /**
     * Animasyonu otomatik oynatır.
     */
    function runAnimation() {
        if (animationInterval) return;
        if (currentStepIndex >= animationQueue.length) {
            currentStepIndex = 0;
            document.querySelectorAll('.cell-carry, .cell-partial, .cell-result').forEach(cell => {
                if (!cell.querySelector('input')) cell.textContent = '';
            });
        }
        // GÜNCELLENDİ: setupGrid'in yazdığı problem sayılarını animasyon için yaz
        writeProblemNumbers();
        animationInterval = setInterval(doNextStep, 500);
    }

    /**
     * Verilen adımı (highlight, write, clear) uygular.
     */
    function executeStep(step) {
        if (step.type === 'highlight') {
            const cell = document.querySelector(step.selector);
            if (cell) cell.classList.add('highlight-active');
        } 
        else if (step.type === 'write') {
            const cell = document.querySelector(step.selector);
            if (cell) cell.textContent = step.value;
        } 
        else if (step.type === 'clear') {
            clearAllHighlights();
        }
    }
    
    // --- 6. YENİ: Aşama 4 Fonksiyonları ---

    /**
     * "Verilmeyen Rakam Modu" için grid'i doldurur, bazılarını gizler.
     */
    function populateGridForMissingMode() {
        const HIDE_PROB_PROBLEM = 0.3; // Problem rakamlarını gizleme olasılığı (%30)
        const HIDE_PROB_SOLUTION = 0.6; // Çözüm rakamlarını gizleme olasılığı (%60)

        // 1. Problem sayılarını (num1, num2) doldur
        num1Str.split('').forEach((digit, i) => {
            const colIndex = num1Str.length - 1 - i;
            const cell = document.querySelector(`[data-row='num1'][data-col='${colIndex}']`);
            if (Math.random() < HIDE_PROB_PROBLEM) {
                createMissingDigitInput(cell, digit);
            } else {
                cell.textContent = digit;
            }
        });

        num2Str.split('').forEach((digit, i) => {
            const colIndex = num2Str.length - 1 - i;
            const cell = document.querySelector(`[data-row='num2'][data-col='${colIndex}']`);
            if (Math.random() < HIDE_PROB_PROBLEM) {
                createMissingDigitInput(cell, digit);
            } else {
                cell.textContent = digit;
            }
        });

        // 2. Çözüm haritasındaki (solutionMap) verileri doldur
        for (const [key, value] of solutionMap.entries()) {
            const parts = key.split('-'); // Örn: ['partial', '0', '1'] veya ['result', '2']
            let selector = '';
            if (parts.length === 3) { // carry-R-C or partial-R-C
                selector = `[data-row='${parts[0]}-${parts[1]}'][data-col='${parts[2]}']`;
            } else { // result-C
                selector = `[data-row='${parts[0]}'][data-col='${parts[1]}']`;
            }
            
            const cell = document.querySelector(selector);
            if (cell) {
                if (Math.random() < HIDE_PROB_SOLUTION) {
                    createMissingDigitInput(cell, value);
                } else {
                    cell.textContent = value;
                }
            }
        }
    }

    /**
     * Verilen hücreye bir 'missing-digit-input' kutucuğu oluşturur.
     */
    function createMissingDigitInput(cell, correctValue) {
        cell.innerHTML = ''; // İçeriği temizle
        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = 'numeric'; // Mobil için sayısal klavye
        input.pattern = '[0-9]'; // Sadece rakam
        input.maxLength = 1;
        input.classList.add('missing-digit-input');
        input.dataset.correct = correctValue.toString(); // Doğru cevabı 'data' özelliğinde sakla
        
        // Sadece tek rakam girilmesini sağla
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
        
        cell.appendChild(input);
    }

    /**
     * "Kontrol Et" butonuna basıldığında tüm kutucukları kontrol eder.
     */
    function checkSolution() {
        const inputs = document.querySelectorAll('.missing-digit-input');
        let allCorrect = true;
        
        inputs.forEach(input => {
            const userValue = input.value;
            const correctValue = input.dataset.correct;
            
            // Sınıfları sıfırla
            input.classList.remove('correct', 'incorrect');
            
            if (userValue === correctValue) {
                input.classList.add('correct');
            } else {
                input.classList.add('incorrect');
                allCorrect = false;
            }
        });
        
        if (allCorrect && inputs.length > 0) {
            setTimeout(() => alert('Tebrikler! Hepsi doğru!'), 200);
        }
    }

    /**
     * Animasyon modunda, setupGrid'de boş bırakılan problem sayılarını yazar.
     */
    function writeProblemNumbers() {
         num1Str.split('').forEach((digit, i) => {
            const colIndex = num1Str.length - 1 - i;
            const cell = document.querySelector(`[data-row='num1'][data-col='${colIndex}']`);
            if (!cell.querySelector('input')) cell.textContent = digit;
        });
        num2Str.split('').forEach((digit, i) => {
            const colIndex = num2Str.length - 1 - i;
            const cell = document.querySelector(`[data-row='num2'][data-col='${colIndex}']`);
             if (!cell.querySelector('input')) cell.textContent = digit;
        });
    }

    // --- 7. Yardımcı Fonksiyonlar ---
    
    function clearAllHighlights() {
        document.querySelectorAll('.highlight-active').forEach(cell => {
            cell.classList.remove('highlight-active');
        });
    }

    function createCell(content = '', dataRow = null, dataCol = null, ...classes) {
        const cell = document.createElement('div');
        cell.classList.add('grid-cell');
        if (classes.length > 0) cell.classList.add(...classes);
        if (dataRow !== null) cell.dataset.row = dataRow;
        if (dataCol !== null) cell.dataset.col = dataCol;
        cell.textContent = content;
        return cell;
    }

    // --- Başlangıç ---
    createProblem(); // Sayfa yüklendiğinde ilk problemi oluştur
});
