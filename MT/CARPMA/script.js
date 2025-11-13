document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Elementleri ---
    const digits1Select = document.getElementById('digits1');
    const digits2Select = document.getElementById('digits2');
    const generateBtn = document.getElementById('generate-btn');
    const gridContainer = document.getElementById('multiplication-grid');
    
    const startBtn = document.getElementById('start-btn');
    const nextStepBtn = document.getElementById('next-step-btn');
    const resetBtn = document.getElementById('reset-btn');

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
    let solutionMap = new Map();

    // --- 3. Olay Dinleyicileri ---
    generateBtn.addEventListener('click', createProblem);
    startBtn.addEventListener('click', runAnimation);
    nextStepBtn.addEventListener('click', doNextStep);
    resetBtn.addEventListener('click', () => {
        clearInterval(animationInterval);
        createProblem();
    });

    missingDigitModeToggle.addEventListener('change', createProblem);
    checkBtn.addEventListener('click', checkSolution);

    // --- 4. Ana Fonksiyonlar ---

    function createProblem() {
        clearInterval(animationInterval);
        animationQueue = [];
        currentStepIndex = 0;
        solutionMap.clear();
        clearAllHighlights();

        const d1 = parseInt(digits1Select.value);
        const d2 = parseInt(digits2Select.value);
        num1Str = generateRandomNumber(d1).toString();
        num2Str = generateRandomNumber(d2).toString();

        const isMissingMode = missingDigitModeToggle.checked;

        if (isMissingMode) {
            animationControls.style.display = 'none';
            checkingControls.style.display = 'block';
        } else {
            animationControls.style.display = 'flex';
            checkingControls.style.display = 'none';
        }

        // 1. Grid'i kur (Moda göre eldeleri gizle)
        // --- GÜNCELLENDİ: isMissingMode parametresi eklendi ---
        setupGrid(num1Str, num2Str, isMissingMode);
        
        // 2. Çözümü (arka planda) hesapla ve solutionMap'i doldur
        prepareAnimation(num1Str, num2Str);

        // 3. Mod'a göre grid'i doldur
        if (isMissingMode) {
            populateGridForMissingMode();
        } else {
            // Animasyon modu için problem sayılarını yaz
            writeProblemNumbers();
        }
    }

    function generateRandomNumber(digits) {
        const min = (digits === 1) ? 0 : Math.pow(10, digits - 1);
        const max = Math.pow(10, digits) - 1;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // --- GÜNCELLENDİ: Eldeleri gizleme mantığı eklendi ---
    function setupGrid(num1Str, num2Str, isMissingMode) {
        gridContainer.innerHTML = '';
        const len1 = num1Str.length;
        const len2 = num2Str.length;
        const maxResultLen = len1 + len2;
        totalCols = Math.max(len1, len2 + 1, maxResultLen) + 1; 

        gridContainer.style.gridTemplateColumns = `repeat(${totalCols}, 40px)`;

        // 1. Elde Satırları
        // --- YENİ KONTROL: Sadece animasyon modunda eldeleri göster ---
        if (!isMissingMode) {
            for (let r = 0; r < len2; r++) {
                let padding = totalCols - len1;
                for (let i = 0; i < padding; i++) gridContainer.appendChild(createCell(''));
                for (let i = 0; i < len1; i++) {
                    const colIndex = len1 - 1 - i;
                    gridContainer.appendChild(createCell('', `carry-${r}`, colIndex, 'cell-carry'));
                }
            }
        }

        // 2. 1. Çarpan (num1)
        let paddingNum1 = totalCols - len1;
        for (let i = 0; i < paddingNum1; i++) gridContainer.appendChild(createCell(''));
        for (let i = 0; i < len1; i++) {
            const colIndex = len1 - 1 - i;
            gridContainer.appendChild(createCell('', 'num1', colIndex, 'cell-num1'));
        }

        // 3. 'x' ve 2. Çarpan (num2)
        let paddingNum2 = totalCols - (len2 + 1);
        for (let i = 0; i < paddingNum2; i++) gridContainer.appendChild(createCell(''));
        gridContainer.appendChild(createCell('x', null, null, 'cell-sign'));
        
        for (let i = 0; i < len2; i++) {
            const placeIndex = (len2 - 1) - i;
            const colIndex = len2 - 1 - i;
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

    function prepareAnimation(num1Str, num2Str) {
        // (Bu fonksiyonun içi değişmedi, sadece solutionMap'i dolduruyor)
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

                animationQueue.push({ type: 'write', selector: `[data-row='partial-${i}'][data-col='${partialColIndex}']`, value: resultDigit });
                solutionMap.set(`partial-${i}-${partialColIndex}`, resultDigit);
                currentPartialProduct[partialColIndex] = resultDigit; 

                if (carry > 0) {
                    animationQueue.push({ type: 'write', selector: `[data-row='carry-${i}'][data-col='${j + 1}']`, value: carry });
                    solutionMap.set(`carry-${i}-${j + 1}`, carry);
                }
                animationQueue.push({ type: 'clear' });
                animationQueue.push({ type: 'highlight', selector: `[data-row='num2'][data-col='${i}']` });
            }

            if (carry > 0) {
                const partialColIndex = n1.length + i;
                animationQueue.push({ type: 'write', selector: `[data-row='partial-${i}'][data-col='${partialColIndex}']`, value: carry });
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
                animationQueue.push({ type: 'write', selector: `[data-row='result'][data-col='${j}']`, value: resultDigit });
                solutionMap.set(`result-${j}`, resultDigit);
                animationQueue.push({ type: 'clear' });
            }
        }
    }

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

    function runAnimation() {
        if (animationInterval) return;
        if (currentStepIndex >= animationQueue.length) {
            currentStepIndex = 0;
            document.querySelectorAll('.cell-carry, .cell-partial, .cell-result').forEach(cell => {
                if (!cell.querySelector('input')) cell.textContent = '';
            });
        }
        // Animasyon için sayıları tekrar yaz
        writeProblemNumbers();
        animationInterval = setInterval(doNextStep, 500);
    }

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
    
    // --- 6. YENİ: Aşama 4 Fonksiyonları (Mantık Değişti) ---

    // --- GÜNCELLENDİ: Bu fonksiyonun tüm mantığı değişti ---
    function populateGridForMissingMode() {
        // 1. KISMİ ÇARPIMLARI VE SONUCU GÖSTER (İPUÇLARI)
        //    (Eldeler hariç)
        for (const [key, value] of solutionMap.entries()) {
            const parts = key.split('-');
            let selector = '';
            if (key.startsWith('partial-')) {
                selector = `[data-row='${parts[0]}-${parts[1]}'][data-col='${parts[2]}']`;
            } else if (key.startsWith('result-')) {
                selector = `[data-row='${parts[0]}'][data-col='${parts[1]}']`;
            }

            if (selector) {
                const cell = document.querySelector(selector);
                if (cell) {
                    cell.textContent = value; // GÖSTER
                }
            }
        }

        // 2. ÇARPANLARI (num1, num2) TOPLA, BAZILARINI GİZLE
        const allMultiplierCells = [];
        
        // num1'in hücrelerini ve doğru cevaplarını topla
        num1Str.split('').forEach((digit, i) => {
            const colIndex = num1Str.length - 1 - i;
            const cell = document.querySelector(`[data-row='num1'][data-col='${colIndex}']`);
            allMultiplierCells.push({ cell: cell, value: digit });
        });
        
        // num2'nin hücrelerini ve doğru cevaplarını topla
        num2Str.split('').forEach((digit, i) => {
            const colIndex = num2Str.length - 1 - i;
            const cell = document.querySelector(`[data-row='num2'][data-col='${colIndex}']`);
            allMultiplierCells.push({ cell: cell, value: digit });
        });

        // Bu hücre listesini karıştır (rastgele gizlemek için)
        allMultiplierCells.sort(() => 0.5 - Math.random());

        // 4. sınıf seviyesi için 2 veya 3 tane gizle
        // (Toplam basamak > 4 ise 3 tane, değilse 2 tane gizle)
        const numToHide = (num1Str.length + num2Str.length > 4) ? 3 : 2; 

        // Hücrelerin 'numToHide' tanesini input'a çevir
        for (let i = 0; i < allMultiplierCells.length; i++) {
            const item = allMultiplierCells[i];
            if (i < numToHide) {
                createMissingDigitInput(item.cell, item.value); // GİZLE (Input yap)
            } else {
                item.cell.textContent = item.value; // GÖSTER
            }
        }
    }

    function createMissingDigitInput(cell, correctValue) {
        cell.innerHTML = '';
        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = 'numeric';
        input.pattern = '[0-9]';
        input.maxLength = 1;
        input.classList.add('missing-digit-input');
        input.dataset.correct = correctValue.toString();
        
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
        
        cell.appendChild(input);
    }

    function checkSolution() {
        const inputs = document.querySelectorAll('.missing-digit-input');
        let allCorrect = true;
        
        inputs.forEach(input => {
            const userValue = input.value;
            const correctValue = input.dataset.correct;
            
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

    // GÜNCELLENDİ: Bu fonksiyonun adı "writeProblemNumbers" olarak değiştirildi
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
    createProblem();
});
