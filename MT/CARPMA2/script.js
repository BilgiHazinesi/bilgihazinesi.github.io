document.addEventListener('DOMContentLoaded', () => {
    // 3 İşlem kutusunu başlat
    new MultiplicationProblem('problem-1');
    new MultiplicationProblem('problem-2');
    new MultiplicationProblem('problem-3');
});

class MultiplicationProblem {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        
        // Elementler
        this.inputNum1 = this.container.querySelector('.manual-num1');
        this.inputNum2 = this.container.querySelector('.manual-num2');
        this.gridContainer = this.container.querySelector('.grid-container');
        
        // Üst Butonlar
        this.btnGenerate = this.container.querySelector('.generate-btn');
        this.btnMissingMode = this.container.querySelector('.missing-mode-btn');
        
        // Alt Butonlar
        this.btnStart = this.container.querySelector('.start-btn');
        this.btnNext = this.container.querySelector('.next-btn');
        this.btnShow = this.container.querySelector('.show-btn');
        this.btnCheck = this.container.querySelector('.check-btn');
        this.btnReset = this.container.querySelector('.reset-btn');

        // Durum
        this.isMissingMode = false;
        this.animationQueue = [];
        this.currentStepIndex = 0;
        this.animationInterval = null;
        this.solutionMap = new Map();
        this.totalCols = 0;

        this.initEvents();
        this.updateGrid(); // İlk çizim
    }

    initEvents() {
        // 1. Manuel Giriş (Input değişince gridi güncelle)
        [this.inputNum1, this.inputNum2].forEach(inp => {
            inp.addEventListener('input', () => this.updateGrid());
        });

        // 2. Rastgele Sayı Butonu
        this.btnGenerate.addEventListener('click', () => {
            this.inputNum1.value = Math.floor(Math.random() * 900) + 100;
            this.inputNum2.value = Math.floor(Math.random() * 90) + 10;
            this.updateGrid();
        });

        // 3. Gizli Mod Aç/Kapa Butonu
        this.btnMissingMode.addEventListener('click', () => {
            this.isMissingMode = !this.isMissingMode; // Durumu tersine çevir
            
            // Buton stilini güncelle
            if (this.isMissingMode) {
                this.btnMissingMode.classList.add('active');
            } else {
                this.btnMissingMode.classList.remove('active');
            }

            // Alt butonları ayarla
            this.btnStart.style.display = this.isMissingMode ? 'none' : 'flex';
            this.btnNext.style.display = this.isMissingMode ? 'none' : 'flex';
            this.btnShow.style.display = this.isMissingMode ? 'none' : 'flex';
            this.btnCheck.style.display = this.isMissingMode ? 'flex' : 'none';

            // Gridi yenile
            this.setupGrid(this.isMissingMode);
            
            if (this.isMissingMode) {
                this.prepareAnimation();
                this.fillResults(); // Gizli modda cevapları doldur (gizlemek için tıklanabilsin)
            } else {
                this.clearResults();
            }
        });

        // 4. Alt Kontroller
        this.btnStart.addEventListener('click', () => this.runAnimation());
        this.btnNext.addEventListener('click', () => this.doNextStep());
        this.btnShow.addEventListener('click', () => this.showFullAnswer());
        this.btnCheck.addEventListener('click', () => this.checkSolution());
        this.btnReset.addEventListener('click', () => {
            this.stopAnimation();
            this.clearResults();
        });
    }

    // --- TEMEL MANTIK ---

    updateGrid() {
        this.stopAnimation();
        this.setupGrid(this.isMissingMode);
        this.prepareAnimation();
    }

    setupGrid(isMissingMode) {
        this.gridContainer.innerHTML = '';
        const n1 = this.inputNum1.value || "0";
        const n2 = this.inputNum2.value || "0";
        const len1 = n1.length;
        const len2 = n2.length;
        const maxResultLen = len1 + len2;

        this.totalCols = Math.max(len1, len2 + 1, maxResultLen) + 2;
        this.gridContainer.style.gridTemplateColumns = `repeat(${this.totalCols}, 42px)`;

        // A. ELDELER (Lila)
        if (!isMissingMode) {
            for (let r = 0; r < len2; r++) {
                this.fillEmpty(this.totalCols - len1);
                for (let i = 0; i < len1; i++) {
                    const colIdx = len1 - i; 
                    this.gridContainer.appendChild(this.createCell('', `carry-${r}`, colIdx, 'cell-carry'));
                }
            }
        }

        // B. 1. ÇARPAN
        this.fillEmpty(this.totalCols - len1);
        for (let i = 0; i < len1; i++) {
            const colIdx = len1 - 1 - i;
            const cell = this.createCell(n1[i], 'num1', colIdx, 'cell-num1');
            this.addToggleFeature(cell);
            this.gridContainer.appendChild(cell);
        }

        // C. 2. ÇARPAN
        this.fillEmpty(this.totalCols - len2 - 1);
        this.gridContainer.appendChild(this.createCell('x', null, null, 'cell-sign'));
        for (let i = 0; i < len2; i++) {
            const pIdx = (len2 - 1) - i;
            const colIdx = len2 - 1 - i;
            const cell = this.createCell(n2[i], 'num2', colIdx, 'cell-num2', `num2-digit-${pIdx}`);
            this.addToggleFeature(cell);
            this.gridContainer.appendChild(cell);
        }

        // ÇİZGİ
        this.fillLine();

        // D. KISMİ ÇARPIMLAR
        for (let i = 0; i < len2; i++) {
            const rowClass = `partial-row-${i}`;
            for (let j = 0; j < this.totalCols; j++) {
                const colIdx = this.totalCols - 1 - j;
                const cell = this.createCell('', `partial-${i}`, colIdx, 'cell-partial', rowClass);
                if (len2 > 1 && i === len2 - 1 && j === 0) {
                    cell.textContent = '+';
                    cell.classList.remove('cell-partial', rowClass);
                    cell.classList.add('cell-sign');
                }
                this.gridContainer.appendChild(cell);
            }
        }

        // E. TOPLAMA ELDELERİ
        if (len2 > 1 && !isMissingMode) {
            for(let j=0; j < this.totalCols; j++) {
                const colIdx = this.totalCols - 1 - j;
                this.gridContainer.appendChild(this.createCell('', 'add-carry', colIdx, 'cell-add-carry'));
            }
        }

        // ÇİZGİ
        if (len2 > 1) this.fillLine();

        // F. SONUÇ
        if (len2 > 1) {
            for(let j=0; j < this.totalCols; j++) {
                const colIdx = this.totalCols - 1 - j;
                this.gridContainer.appendChild(this.createCell('', 'result', colIdx, 'cell-result'));
            }
        }
    }

    // Hücreye tıklayınca Input/Sayı değişimi yap
    addToggleFeature(cell) {
        cell.classList.add('cell-clickable');
        cell.addEventListener('click', () => {
            if (!this.isMissingMode) return;
            
            if (cell.querySelector('input')) {
                cell.textContent = cell.querySelector('input').dataset.original;
            } else {
                const val = cell.textContent;
                if (!val) return;
                cell.innerHTML = '';
                const inp = document.createElement('input');
                inp.type = 'text'; inp.maxLength = 1;
                inp.classList.add('missing-digit-input');
                inp.dataset.original = val;
                inp.dataset.correct = val;
                inp.addEventListener('click', e => e.stopPropagation());
                cell.appendChild(inp);
            }
        });
    }

    // --- ANİMASYON & HESAPLAMA (Önceki mantıkla aynı) ---
    prepareAnimation() {
        this.animationQueue = [];
        this.solutionMap.clear();

        const n1Arr = (this.inputNum1.value || "0").split('').reverse().map(Number);
        const n2Arr = (this.inputNum2.value || "0").split('').reverse().map(Number);
        let partialProducts = [];

        // Çarpma
        for (let i = 0; i < n2Arr.length; i++) {
            const d2 = n2Arr[i];
            let carry = 0;
            let currentPartial = [];
            this.animationQueue.push({ type: 'highlight', selector: `[data-row='num2'][data-col='${i}']` });

            for (let j = 0; j < n1Arr.length; j++) {
                const d1 = n1Arr[j];
                this.animationQueue.push({ type: 'highlight', selector: `[data-row='num1'][data-col='${j}']` });
                
                const product = (d1 * d2) + carry;
                const writeVal = product % 10;
                carry = Math.floor(product / 10);
                const pCol = j + i;

                this.addToMapAndQueue(`partial-${i}`, pCol, writeVal, 'write');
                if (carry > 0) this.addToMapAndQueue(`carry-${i}`, j+1, carry, 'write');
                
                this.animationQueue.push({ type: 'clear' });
                this.animationQueue.push({ type: 'highlight', selector: `[data-row='num2'][data-col='${i}']` });
                currentPartial[pCol] = writeVal;
            }
            if (carry > 0) {
                const pCol = n1Arr.length + i;
                this.addToMapAndQueue(`partial-${i}`, pCol, carry, 'write');
                currentPartial[pCol] = carry;
            }
            partialProducts.push(currentPartial);
            this.animationQueue.push({ type: 'clear' });
        }

        // Toplama
        if (n2Arr.length > 1) {
            let carry = 0;
            const maxCols = this.totalCols - 1;
            for (let col = 0; col < maxCols; col++) {
                let sum = carry;
                for(let row=0; row < partialProducts.length; row++) {
                    this.animationQueue.push({ type: 'highlight', selector: `[data-row='partial-${row}'][data-col='${col}']` });
                    sum += (partialProducts[row][col] || 0);
                }
                const writeVal = sum % 10;
                carry = Math.floor(sum / 10);
                
                this.addToMapAndQueue('result', col, writeVal, 'write');
                if (carry > 0) this.addToMapAndQueue('add-carry', col+1, carry, 'write');
                
                this.animationQueue.push({ type: 'clear' });
            }
        }
    }

    addToMapAndQueue(rowType, col, val, type) {
        this.animationQueue.push({ 
            type: type, 
            selector: `[data-row='${rowType}'][data-col='${col}']`, 
            value: val 
        });
        let key = rowType.includes('partial') || rowType.includes('carry') ? `${rowType}-${col}` : `${rowType}-${col}`;
        this.solutionMap.set(key, val);
    }

    runAnimation() {
        if (this.animationInterval) return;
        if (this.currentStepIndex >= this.animationQueue.length || this.currentStepIndex === 0) {
            this.currentStepIndex = 0;
            this.clearResults();
        }
        this.animationInterval = setInterval(() => this.doNextStep(), 500);
    }

    doNextStep() {
        if (this.currentStepIndex >= this.animationQueue.length) {
            this.stopAnimation();
            return;
        }
        const step = this.animationQueue[this.currentStepIndex];
        if (step.type !== 'clear') this.clearHighlights();

        const el = this.gridContainer.querySelector(step.selector);
        if (el) {
            if (step.type === 'highlight') el.classList.add('highlight-active');
            else if (step.type === 'write') el.textContent = step.value;
        }
        if (step.type === 'clear') this.clearHighlights();
        this.currentStepIndex++;
    }

    showFullAnswer() {
        this.stopAnimation();
        this.fillResults();
        this.currentStepIndex = this.animationQueue.length;
    }

    stopAnimation() {
        clearInterval(this.animationInterval);
        this.animationInterval = null;
        this.clearHighlights();
    }

    // --- YARDIMCI ---

    fillResults() {
        for (const [key, val] of this.solutionMap.entries()) {
            let selector = '';
            if(key.startsWith('result') || key.startsWith('add-carry')) {
                const parts = key.split('-');
                selector = `[data-row='${parts[0].replace(/-\d+$/, '')}${key.includes('add') ? '-carry' : ''}'][data-col='${parts[parts.length-1]}']`;
                // Basitçe:
                if (key.includes('add-carry')) selector = `[data-row='add-carry'][data-col='${key.split('-').pop()}']`;
                else if (key.includes('result')) selector = `[data-row='result'][data-col='${key.split('-').pop()}']`;
            } else {
                const parts = key.split('-');
                selector = `[data-row='${parts[0]}-${parts[1]}'][data-col='${parts[2]}']`;
            }
            const el = this.gridContainer.querySelector(selector);
            if (el) el.textContent = val;
        }
    }

    clearResults() {
        const selectors = ['.cell-carry', '.cell-partial', '.cell-result', '.cell-add-carry'];
        selectors.forEach(sel => {
            this.gridContainer.querySelectorAll(sel).forEach(el => {
                if (el.textContent !== '+') el.textContent = '';
            });
        });
    }

    clearHighlights() {
        this.gridContainer.querySelectorAll('.highlight-active').forEach(el => el.classList.remove('highlight-active'));
    }

    createCell(content, dRow, dCol, ...classes) {
        const div = document.createElement('div');
        div.classList.add('grid-cell');
        if (classes.length) div.classList.add(...classes);
        if (dRow) div.dataset.row = dRow;
        if (dCol !== null && dCol !== undefined) div.dataset.col = dCol;
        div.textContent = content;
        return div;
    }

    fillEmpty(count) {
        for(let k=0; k<count; k++) this.gridContainer.appendChild(this.createCell(''));
    }

    fillLine() {
        for(let k=0; k<this.totalCols; k++) this.gridContainer.appendChild(this.createCell('', null, null, 'cell-line'));
    }
    
    checkSolution() {
        const inputs = this.gridContainer.querySelectorAll('.missing-digit-input');
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
        if (allCorrect && inputs.length > 0) alert("Tebrikler! Doğru.");
    }
}
