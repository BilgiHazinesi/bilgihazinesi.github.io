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

    // YENİ: Aşama 5 Elementleri
    const missingOptions = document.getElementById('missing-options');

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
        createProblem(); // Sıfırla = Yeni Problem Yarat
    });

    checkBtn.addEventListener('click', checkSolution);

    // GÜNCELLENDİ: Mod değiştirme artık "createProblem"i tetiklemiyor.
    missingDigitModeToggle.addEventListener('change', toggleMode);
    // Verilmeyen yeri değişirse, mevcut problemi hemen güncelle
    document.querySelectorAll('input[name="missing-placement"]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (missingDigitModeToggle.checked) {
                switchToMissingMode(); // Sadece verilmeyen modunu yeniden uygula
            }
        });
    });

    // --- 4. Ana Fonksiyonlar ---

    /**
     * YENİ: "Rastgele Oluştur" butonu için ana fonksiyon.
     */
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
        
        // 1. Grid'i kur
        setupGrid(num1Str, num2Str, isMissingMode);
        
        // 2. Çözümü hesapla
        prepareAnimation(num1Str, num2Str);

        // 3. Mevcut moda göre grid'i doldur
        if (isMissingMode) {
            populateGridForMissingMode();
        } else {
            writeProblemNumbers();
        }
        
        // 4. UI (Butonları) ayarla
        updateUiForMode(isMissingMode);
    }

    /**
     * YENİ: Mod değiştirme (sadece görünümü değiştirir, yeni problem yaratmaz)
     */
    function toggleMode() {
        const isMissingMode = missingDigitModeToggle.checked;
        updateUiForMode(isMissingMode);

        if (isMissingMode) {
            switchToMissingMode(); // Mevcut problemi verilmeyenli hale getir
        } else {
            switchToAnimationMode(); // Mevcut problemi animasyonlu hale getir
        }
    }

    /**
     * YENİ: Görünümü Animasyon Moduna alır
     */
    function switchToAnimationMode() {
        clearAllInputs(); // Tüm <input> kutularını kaldır
        clearAllResults(); // Kısmi çarpım ve sonuçları sil
        writeProblemNumbers(); // 1. ve 2. çarpanı yaz
    }

    /**
     * YENİ: Görünümü Verilmeyen Moduna alır
     */
    function switchToMissingMode() {
        clearAllInputs(); // Öncekileri temizle
        populateGridForMissingMode(); // Çözümü yaz ve bazılarını gizle
    }


    /**
     * YENİ: Butonları ve seçenekleri moda göre ayarlar
     */
    function updateUiForMode(isMissingMode) {
        if (isMissingMode) {
            animationControls.style.display = 'none';
            checkingControls.style.display = 'block';
            missingOptions.style.display = 'flex'; // Seçenekleri göster
        } else {
            animationControls.style.display = 'flex';
            checkingControls.style.display = 'none';
            missingOptions.style.display = 'none'; // Seçenekleri gizle
        }
    }

    function generateRandomNumber(digits) {
        const min = (digits === 1) ? 0 : Math.pow(10, digits - 1);
        const max = Math.pow(10, digits) - 1;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // GÜNCELLENDİ: Rakamları düzenleyebilme (Aşama 5)
    function setupGrid(num1Str, num2Str, isMissingMode) {
        gridContainer.innerHTML = '';
        const len1 = num1Str.length;
        const len2 = num2Str.length;
        const maxResultLen = len1 + len2;
        totalCols = Math.max(len1, len2 + 1, maxResultLen) + 1; 

        gridContainer.style.gridTemplateColumns = `repeat(${totalCols}, 40px)`;

        // 1. Elde Satırları (Sadece animasyon modunda)
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
            // YENİ: 'cell-editable' sınıfı ve click listener'ı eklendi
            const cell = createCell('', 'num1', colIndex, 'cell-num1', 'cell-editable');
            cell.addEventListener('click', makeCellEditable);
            gridContainer.appendChild(cell);
        }

        // 3. 'x' ve 2. Çarpan (num2)
        let paddingNum2 = totalCols - (len2 + 1);
        for (let i = 0; i < paddingNum2; i++) gridContainer.appendChild(createCell(''));
        gridContainer.appendChild(createCell('x', null, null, 'cell-sign'));
        
        for (let i = 0; i < len2; i++) {
            const placeIndex = (len2 - 1) - i;
            const colIndex = len2 - 1 - i;
            // YENİ: 'cell-editable' sınıfı ve click listener'ı eklendi
            const cell = createCell('', 'num2', colIndex, 'cell-num2', `num2-digit-${placeIndex}`, 'cell-editable');
            cell.addEventListener('click', makeCellEditable);
            gridContainer.appendChild(cell);
        }

        // ... Kalan satırlar (çizgi, kısmi çarpım, sonuç) aynı ...
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
    // (prepareAnimation, doNextStep, runAnimation, executeStep... bu fonksiyonlar aynı kaldı)
    // ... (Bu fonksiyonlar bir önceki kod bloğundan kopyalanabilir, değişmediler) ...

    function prepareAnimation(num1Str, num2Str) {
        // (Hiç değişmedi)
        animationQueue = []; // Her hesaplamada kuyruğu sıfırla
        solutionMap.clear(); // Her hesaplamada haritayı sıfırla

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
                for (let i = 0; i < partialProducts.length; i++) {
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
            clearAllResults(); // Sadece sonuçları temizle
        }
        // Problem sayıları zaten yazılı, tekrar yazmaya gerek yok
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
    
    // --- 6. Aşama 4 ve 5 Fonksiyonları (Verilmeyen Rakam ve Düzenleme) ---

    // GÜNCELLENDİ: "Verilmeyen Yeri" seçeneğini okur
    function populateGridForMissingMode() {
        // 1. Önce tüm <input>ları temizle ve tüm sonuçları yaz
        clearAllInputs();
        writeProblemNumbers(); // Çarpanları yaz

        // Kısmi çarpımları ve sonucu yaz (ipucları)
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
                if (cell) cell.textContent = value;
            }
        }

        // 2. Hangi hücrelerin gizlenebileceğini belirle
        const placement = document.querySelector('input[name="missing-placement"]:checked').value;
        const allMultiplierCells = [];

        if (placement === 'num1' || placement === 'mixed') {
            document.querySelectorAll("[data-row='num1']").forEach(cell => {
                allMultiplierCells.push(cell);
            });
        }
        if (placement === 'num2' || placement === 'mixed') {
            document.querySelectorAll("[data-row='num2']").forEach(cell => {
                allMultiplierCells.push(cell);
            });
        }

        // 3. Bu hücrelerden bazılarını rastgele gizle
        allMultiplierCells.sort(() => 0.5 - Math.random());
        const numToHide = (allMultiplierCells.length > 4) ? 3 : 2; 

        for (let i = 0; i < numToHide && i < allMultiplierCells.length; i++) {
            const cell = allMultiplierCells[i];
            const correctValue = cell.textContent; // Doğru cevabı DOM'dan al
            createMissingDigitInput(cell, correctValue); // ve input'a çevir
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
        // Not: Bu modda hücreye tıklamayı engelle
        cell.removeEventListener('click', makeCellEditable); 
    }

    function checkSolution() {
        // (Bu fonksiyon değişmedi)
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

    // GÜNCELLENDİ: Problemi DOM'a yazar
    function writeProblemNumbers() {
         num1Str.split('').forEach((digit, i) => {
            const colIndex = num1Str.length - 1 - i;
            const cell = document.querySelector(`[data-row='num1'][data-col='${colIndex}']`);
            if (cell) cell.textContent = digit;
            // YENİ: Düzenleme için click listener'ı tekrar ekle (mod değişiminden sonra)
            if (cell) cell.addEventListener('click', makeCellEditable);
        });
        num2Str.split('').forEach((digit, i) => {
            const colIndex = num2Str.length - 1 - i;
            const cell = document.querySelector(`[data-row='num2'][data-col='${colIndex}']`);
            if (cell) cell.textContent = digit;
            // YENİ: Düzenleme için click listener'ı tekrar ekle (mod değişiminden sonra)
            if (cell) cell.addEventListener('click', makeCellEditable);
        });
    }

    // --- 7. YENİ: Rakam Düzenleme Fonksiyonları ---
    
    /**
     * Normal modda bir çarpan hücresine tıklandığında tetiklenir.
     */
    function makeCellEditable(event) {
        // Verilmeyen modundaysa veya animasyon çalışıyorsa düzenleme yapma
        if (missingDigitModeToggle.checked || animationInterval) {
            return;
        }

        const cell = event.currentTarget;
        
        // Zaten input içindeyse tekrar tetikleme
        if (cell.querySelector('input')) return; 

        const currentValue = cell.textContent;
        cell.innerHTML = ''; // Hücreyi boşalt

        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = 'numeric';
        input.pattern = '[0-9]';
        input.maxLength = 1;
        input.classList.add('missing-digit-input'); // Aynı stili kullansın
        input.value = currentValue;

        input.addEventListener('blur', saveCellEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') e.target.blur(); // Enter'a basınca kaydet
        });

        cell.appendChild(input);
        input.focus();
    }

    /**
     * Rakam düzenleme <input>undan çıkıldığında (blur) tetiklenir.
     */
    function saveCellEdit(event) {
        const input = event.target;
        const cell = input.parentElement;
        let newValue = input.value.replace(/[^0-9]/g, ''); // Sadece rakam
        
        if (newValue === '') newValue = '0'; // Boş bırakırsa 0 yap
        
        cell.textContent = newValue; // Hücreye yeni değeri yaz
        
        // Tıklama özelliğini geri ekle
        cell.addEventListener('click', makeCellEditable);
        
        // Problemi yeniden hesapla
        recalculateProblemFromDOM();
    }

    /**
     * YENİ: DOM'daki rakamları okur ve problemi yeniden hesaplar
     */
    function recalculateProblemFromDOM() {
        // 1. DOM'dan yeni num1Str ve num2Str'yi oku
        // (Sıralamayı düzeltmek için sağdan sola okuma)
        const num1Cells = Array.from(document.querySelectorAll("[data-row='num1']")).sort((a, b) => b.dataset.col - a.dataset.col);
        const num2Cells = Array.from(document.querySelectorAll("[data-row='num2']")).sort((a, b) => b.dataset.col - a.dataset.col);
        
        num1Str = num1Cells.map(cell => cell.textContent).join('');
        num2Str = num2Cells.map(cell => cell.textContent).join('');

        // 2. Animasyon ve çözüm verilerini temizle
        clearInterval(animationInterval);
        animationQueue = [];
        currentStepIndex = 0;
        solutionMap.clear();
        clearAllResults();
        
        // 3. Yeni sayılarla çözümü yeniden hesapla
        prepareAnimation(num1Str, num2Str);
    }


    // --- 8. Yardımcı Fonksiyonlar (Helpers) ---
    
    function clearAllHighlights() {
        document.querySelectorAll('.highlight-active').forEach(cell => {
            cell.classList.remove('highlight-active');
        });
    }

    // YENİ: Tüm kısmi çarpım, sonuç ve elde hücrelerini temizler
    function clearAllResults() {
        document.querySelectorAll('.cell-carry, .cell-partial, .cell-result').forEach(cell => {
            cell.textContent = '';
        });
    }

    // YENİ: Tüm <input> kutularını kaldırır, değerini hücreye yazar
    function clearAllInputs() {
        document.querySelectorAll('.missing-digit-input').forEach(input => {
            const cell = input.parentElement;
            if (cell) {
                // Verilmeyen modundan çıkarken, inputun cevabını değil,
                // inputun doğru cevabını (data-correct) hücreye yaz.
                // Eğer animasyon modundaysak, zaten textContent'e yazmıştık.
                if (input.dataset.correct) {
                     cell.textContent = input.dataset.correct;
                }
                // Tıklamayı geri yükle
                cell.addEventListener('click', makeCellEditable);
            }
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
