document.addEventListener('DOMContentLoaded', () => {
    // DOM Elementleri
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
    const missingOptions = document.getElementById('missing-options');

    // Durum Değişkenleri
    let totalCols = 0;
    let num1Str = '';
    let num2Str = '';
    let animationQueue = [];
    let currentStepIndex = 0;
    let animationInterval = null;
    let solutionMap = new Map();

    // Event Listeners
    generateBtn.addEventListener('click', createProblem);
    startBtn.addEventListener('click', runAnimation);
    nextStepBtn.addEventListener('click', doNextStep);
    resetBtn.addEventListener('click', () => {
        clearInterval(animationInterval);
        createProblem();
    });
    checkBtn.addEventListener('click', checkSolution);
    missingDigitModeToggle.addEventListener('change', toggleMode);
    
    // Verilmeyen yeri seçenekleri artık önemsiz çünkü kural sabitlendi (Her birinden 1 tane)
    // Ancak kodun kırılmaması için event listener'ı tutuyoruz ama işlevini populateGridForMissingMode içinde değiştirdik.
    document.querySelectorAll('input[name="missing-placement"]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (missingDigitModeToggle.checked) switchToMissingMode();
        });
    });

    // --- 1. PROBLEM OLUŞTURMA VE GRID KURULUMU ---

    function createProblem() {
        clearInterval(animationInterval);
        animationQueue = [];
        currentStepIndex = 0;
        solutionMap.clear();

        const d1 = parseInt(digits1Select.value);
        const d2 = parseInt(digits2Select.value);
        num1Str = generateRandomNumber(d1).toString();
        num2Str = generateRandomNumber(d2).toString();

        const isMissingMode = missingDigitModeToggle.checked;
        
        setupGrid(num1Str, num2Str, isMissingMode);
        prepareAnimation(num1Str, num2Str);

        if (isMissingMode) {
            populateGridForMissingMode();
        } else {
            writeProblemNumbers();
        }
        
        updateUiForMode(isMissingMode);
    }

    function setupGrid(num1Str, num2Str, isMissingMode) {
        gridContainer.innerHTML = '';
        const len1 = num1Str.length;
        const len2 = num2Str.length;
        const maxResultLen = len1 + len2;
        
        // 5. Husus: '+' sembolü için solda ekstra 2 sütun boşluk bırakıyoruz
        totalCols = Math.max(len1, len2 + 1, maxResultLen) + 2; 

        gridContainer.style.gridTemplateColumns = `repeat(${totalCols}, 40px)`;

        // --- A. Çarpma Eldeleri (En üst) ---
        if (!isMissingMode) {
            for (let r = 0; r < len2; r++) {
                fillRowWithEmpty(totalCols - len1); // Sol boşluk
                for (let i = 0; i < len1; i++) {
                    const colIndex = len1 - 1 - i;
                    gridContainer.appendChild(createCell('', `carry-${r}`, colIndex, 'cell-carry'));
                }
            }
        }

        // --- B. 1. Çarpan ---
        fillRowWithEmpty(totalCols - len1);
        for (let i = 0; i < len1; i++) {
            const colIndex = len1 - 1 - i;
            const cell = createCell('', 'num1', colIndex, 'cell-num1', 'cell-editable');
            cell.addEventListener('click', makeCellEditable);
            gridContainer.appendChild(cell);
        }

        // --- C. 2. Çarpan ve 'x' ---
        fillRowWithEmpty(totalCols - len2 - 1);
        gridContainer.appendChild(createCell('x', null, null, 'cell-sign'));
        for (let i = 0; i < len2; i++) {
            const placeIndex = (len2 - 1) - i;
            const colIndex = len2 - 1 - i;
            const cell = createCell('', 'num2', colIndex, 'cell-num2', `num2-digit-${placeIndex}`, 'cell-editable');
            cell.addEventListener('click', makeCellEditable);
            gridContainer.appendChild(cell);
        }

        // --- Çizgi ---
        fillRowWithLine(totalCols);

        // --- D. Kısmi Çarpımlar ve '+' Sembolü ---
        for (let i = 0; i < len2; i++) {
            const rowClass = `partial-row-${i}`;
            for (let j = 0; j < totalCols; j++) {
                const colIndex = totalCols - 1 - j;
                const cell = createCell('', `partial-${i}`, colIndex, 'cell-partial', rowClass);
                
                // 5. Husus: '+' işaretini en sola (Grid'in 0. sütununa) koyuyoruz
                // Sadece son satırda ve 2+ basamaklı çarpımlarda
                if (len2 > 1 && i === len2 - 1 && j === 0) {
                    cell.textContent = '+';
                    cell.classList.add('cell-sign');
                    cell.classList.remove('cell-partial', rowClass); // Arka plan rengini kaldır
                }
                gridContainer.appendChild(cell);
            }
        }

        // --- E. YENİ: Toplama Eldeleri Satırı (Sonuçtan hemen önce) ---
        if (len2 > 1 && !isMissingMode) { // Sadece birden fazla satır varsa ve animasyon modundaysa
             for (let j = 0; j < totalCols; j++) {
                const colIndex = totalCols - 1 - j;
                // 'add-carry' satırı. data-row'u 'add-carry' olarak işaretliyoruz
                gridContainer.appendChild(createCell('', 'add-carry', colIndex, 'cell-add-carry'));
            }
        }

        // --- Çizgi ---
        if (len2 > 1) fillRowWithLine(totalCols);

        // --- F. Sonuç ---
        if (len2 > 1) {
            for (let i = 0; i < totalCols; i++) {
                const colIndex = totalCols - 1 - i;
                gridContainer.appendChild(createCell('', 'result', colIndex, 'cell-result'));
            }
        }
    }

    // --- 2. ANİMASYON VE HESAPLAMA ---

    function prepareAnimation(num1Str, num2Str) {
        animationQueue = [];
        solutionMap.clear();

        const n1 = (num1Str.match(/^[0-9]+$/) ? num1Str : '0').split('').reverse().map(Number);
        const n2 = (num2Str.match(/^[0-9]+$/) ? num2Str : '0').split('').reverse().map(Number);
        const partialProducts = []; 

        // Faz 1: Çarpma
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
        
        // Faz 2: Toplama
        if (n2.length > 1) {
            let carry = 0;
            const maxCols = totalCols - 1;
            for (let j = 0; j < maxCols; j++) {
                let columnSum = carry;
                // Sütundaki sayıları topla
                for (let i = 0; i < partialProducts.length; i++) {
                    animationQueue.push({ type: 'highlight', selector: `[data-row='partial-${i}'][data-col='${j}']` });
                    columnSum += partialProducts[i][j] || 0;
                }
                
                const resultDigit = columnSum % 10;
                carry = Math.floor(columnSum / 10); // Yeni elde

                // Sonucu yaz
                animationQueue.push({ type: 'write', selector: `[data-row='result'][data-col='${j}']`, value: resultDigit });
                solutionMap.set(`result-${j}`, resultDigit);

                // YENİ: Toplama Eldesini Yaz (Eğer varsa ve son basamak değilse)
                if (carry > 0) {
                    // Eldeyi bir sonraki sütuna (j+1) yaz
                    animationQueue.push({ type: 'write', selector: `[data-row='add-carry'][data-col='${j+1}']`, value: carry });
                }

                animationQueue.push({ type: 'clear' });
            }
        }
    }

    // --- 3. VERİLMEYEN RAKAM MODU (GÜNCELLENDİ) ---

    function populateGridForMissingMode() {
        clearAllInputs();
        writeProblemNumbers();

        // Sonuçları yaz
        for (const [key, value] of solutionMap.entries()) {
            const parts = key.split('-');
            let selector = '';
            if (key.startsWith('partial-')) selector = `[data-row='${parts[0]}-${parts[1]}'][data-col='${parts[2]}']`;
            else if (key.startsWith('result-')) selector = `[data-row='${parts[0]}'][data-col='${parts[1]}']`;
            
            if (selector) {
                const cell = document.querySelector(selector);
                if (cell) cell.textContent = value;
            }
        }

        // KURAL: 1. Çarpan'dan kesinlikle 1 tane, 2. Çarpan'dan kesinlikle 1 tane gizle.
        const num1Cells = Array.from(document.querySelectorAll("[data-row='num1']"));
        const num2Cells = Array.from(document.querySelectorAll("[data-row='num2']"));

        // Rastgele birer tane seç
        if (num1Cells.length > 0) {
            const randomIdx1 = Math.floor(Math.random() * num1Cells.length);
            createMissingDigitInput(num1Cells[randomIdx1], num1Cells[randomIdx1].textContent);
        }

        if (num2Cells.length > 0) {
            const randomIdx2 = Math.floor(Math.random() * num2Cells.length);
            createMissingDigitInput(num2Cells[randomIdx2], num2Cells[randomIdx2].textContent);
        }
    }

    // --- YARDIMCI VE UI FONKSİYONLARI ---

    function fillRowWithEmpty(count) {
        for (let i = 0; i < count; i++) gridContainer.appendChild(createCell(''));
    }

    function fillRowWithLine(count) {
        for (let i = 0; i < count; i++) gridContainer.appendChild(createCell('', null, null, 'cell-line'));
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

    function writeProblemNumbers() {
        num1Str.split('').forEach((digit, i) => {
            const colIndex = num1Str.length - 1 - i;
            const cell = document.querySelector(`[data-row='num1'][data-col='${colIndex}']`);
            if (cell) { cell.textContent = digit; cell.addEventListener('click', makeCellEditable); }
        });
        num2Str.split('').forEach((digit, i) => {
            const colIndex = num2Str.length - 1 - i;
            const cell = document.querySelector(`[data-row='num2'][data-col='${colIndex}']`);
            if (cell) { cell.textContent = digit; cell.addEventListener('click', makeCellEditable); }
        });
    }

    function makeCellEditable(event) {
        if (missingDigitModeToggle.checked || animationInterval) return;
        const cell = event.currentTarget;
        if (cell.querySelector('input')) return; 
        const val = cell.textContent;
        cell.innerHTML = '';
        const input = document.createElement('input');
        input.type = 'text'; input.inputMode = 'numeric'; input.pattern = '[0-9]'; input.maxLength = 1;
        input.classList.add('missing-digit-input'); input.value = val;
        input.addEventListener('blur', saveCellEdit);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
        cell.appendChild(input); input.focus();
    }

    function saveCellEdit(event) {
        const input = event.target;
        const cell = input.parentElement;
        let val = input.value.replace(/[^0-9]/g, '');
        if (val === '') val = '0';
        cell.textContent = val;
        cell.addEventListener('click', makeCellEditable);
        recalculateProblemFromDOM();
    }

    function recalculateProblemFromDOM() {
        const n1 = Array.from(document.querySelectorAll("[data-row='num1']")).sort((a,b)=>b.dataset.col-a.dataset.col).map(c=>c.textContent).join('');
        const n2 = Array.from(document.querySelectorAll("[data-row='num2']")).sort((a,b)=>b.dataset.col-a.dataset.col).map(c=>c.textContent).join('');
        num1Str = n1; num2Str = n2;
        clearInterval(animationInterval); animationQueue = []; currentStepIndex = 0; solutionMap.clear();
        clearAllResults();
        prepareAnimation(num1Str, num2Str);
    }

    function toggleMode() {
        const isMissing = missingDigitModeToggle.checked;
        setupGrid(num1Str, num2Str, isMissing); // Grid'i yeniden kur (elde satırlarını göster/gizle)
        prepareAnimation(num1Str, num2Str);
        if (isMissing) populateGridForMissingMode();
        else writeProblemNumbers();
        updateUiForMode(isMissing);
    }

    function updateUiForMode(isMissing) {
        animationControls.style.display = isMissing ? 'none' : 'flex';
        checkingControls.style.display = isMissing ? 'block' : 'none';
        missingOptions.style.display = isMissing ? 'flex' : 'none';
    }

    function createMissingDigitInput(cell, correctVal) {
        cell.innerHTML = '';
        const input = document.createElement('input');
        input.type = 'text'; input.inputMode = 'numeric'; input.pattern = '[0-9]'; input.maxLength = 1;
        input.classList.add('missing-digit-input'); input.dataset.correct = correctVal;
        input.addEventListener('input', (e) => e.target.value = e.target.value.replace(/[^0-9]/g, ''));
        cell.appendChild(input); cell.removeEventListener('click', makeCellEditable);
    }

    function checkSolution() {
        const inputs = document.querySelectorAll('.missing-digit-input');
        let allCorrect = true;
        inputs.forEach(inp => {
            inp.classList.remove('correct', 'incorrect');
            if (inp.value === inp.dataset.correct) inp.classList.add('correct');
            else { inp.classList.add('incorrect'); allCorrect = false; }
        });
        if (allCorrect && inputs.length > 0) setTimeout(() => alert('Tebrikler!'), 100);
    }

    function clearAllInputs() {
        document.querySelectorAll('.missing-digit-input').forEach(inp => {
            const cell = inp.parentElement;
            if (cell && inp.dataset.correct) cell.textContent = inp.dataset.correct;
            cell.addEventListener('click', makeCellEditable);
        });
    }

    function clearAllResults() {
        document.querySelectorAll('.cell-carry, .cell-partial, .cell-result, .cell-add-carry').forEach(c => c.textContent = '');
    }

    function clearAllHighlights() {
        document.querySelectorAll('.highlight-active').forEach(c => c.classList.remove('highlight-active'));
    }

    function doNextStep() {
        if (currentStepIndex >= animationQueue.length) { clearInterval(animationInterval); clearAllHighlights(); return; }
        const step = animationQueue[currentStepIndex];
        if (step.type !== 'clear') clearAllHighlights();
        if (step.type === 'highlight') document.querySelector(step.selector)?.classList.add('highlight-active');
        else if (step.type === 'write') { const el = document.querySelector(step.selector); if(el) el.textContent = step.value; }
        else if (step.type === 'clear') clearAllHighlights();
        currentStepIndex++;
    }

    function runAnimation() {
        if (animationInterval) return;
        if (currentStepIndex >= animationQueue.length) { currentStepIndex = 0; clearAllResults(); }
        animationInterval = setInterval(doNextStep, 500);
    }

    function generateRandomNumber(d) {
        const min = d===1?0:Math.pow(10,d-1); const max = Math.pow(10,d)-1;
        return Math.floor(Math.random()*(max-min+1))+min;
    }

    // Başlangıç
    createProblem();
});
