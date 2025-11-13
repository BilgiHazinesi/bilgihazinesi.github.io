document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Elementleri ---
    const digits1Select = document.getElementById('digits1');
    const digits2Select = document.getElementById('digits2');
    const generateBtn = document.getElementById('generate-btn');
    const gridContainer = document.getElementById('multiplication-grid');

    const startBtn = document.getElementById('start-btn');
    const nextStepBtn = document.getElementById('next-step-btn');
    const resetBtn = document.getElementById('reset-btn');

    // --- 2. Animasyon Durum (State) Değişkenleri ---
    let totalCols = 0;
    let num1Str = '';
    let num2Str = '';
    let animationQueue = []; // Tüm animasyon adımlarını tutan kuyruk
    let currentStepIndex = 0;
    let animationInterval = null;

    // --- 3. Olay Dinleyicileri (Event Listeners) ---
    generateBtn.addEventListener('click', createProblem);
    
    startBtn.addEventListener('click', runAnimation);
    nextStepBtn.addEventListener('click', doNextStep);
    resetBtn.addEventListener('click', () => {
        clearInterval(animationInterval); // Animasyonu durdur
        createProblem(); // Yeni problem yarat
    });

    // --- 4. Ana Fonksiyonlar ---

    // Problem oluştur ve animasyonu hazırla
    function createProblem() {
        clearInterval(animationInterval);
        animationQueue = [];
        currentStepIndex = 0;
        clearAllHighlights();

        const d1 = parseInt(digits1Select.value);
        const d2 = parseInt(digits2Select.value);

        num1Str = generateRandomNumber(d1).toString();
        num2Str = generateRandomNumber(d2).toString();

        setupGrid(num1Str, num2Str);
        
        prepareAnimation(num1Str, num2Str);
    }

    // Rastgele sayı üreteci
    function generateRandomNumber(digits) {
        const min = (digits === 1) ? 0 : Math.pow(10, digits - 1);
        const max = Math.pow(10, digits) - 1;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Grid'i (tahtayı) oluşturan fonksiyon
    // --- DÜZELTİLMİŞ setupGrid çağrıları ---
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
                // ÇAĞRI DÜZELTİLDİ: 'cell-carry' sınıfı sona eklendi
                gridContainer.appendChild(createCell('', `carry-${r}`, colIndex, 'cell-carry'));
            }
        }

        // 2. 1. Çarpan (num1)
        let paddingNum1 = totalCols - len1;
        for (let i = 0; i < paddingNum1; i++) gridContainer.appendChild(createCell(''));
        for (let i = 0; i < len1; i++) {
            const colIndex = len1 - 1 - i;
             // ÇAĞRI DÜZELTİLDİ: 'cell-num1' sınıfı sona eklendi
            gridContainer.appendChild(createCell(num1Str[i], 'num1', colIndex, 'cell-num1'));
        }

        // 3. 'x' ve 2. Çarpan (num2)
        let paddingNum2 = totalCols - (len2 + 1);
        for (let i = 0; i < paddingNum2; i++) gridContainer.appendChild(createCell(''));
        gridContainer.appendChild(createCell('x', null, null, 'cell-sign'));
        
        for (let i = 0; i < len2; i++) {
            const placeIndex = (len2 - 1) - i;
            const colIndex = len2 - 1 - i;
             // ÇAĞRI DÜZELTİLDİ: Sınıflar sona eklendi
            gridContainer.appendChild(createCell(num2Str[i], 'num2', colIndex, 'cell-num2', `num2-digit-${placeIndex}`));
        }

        // 4. Çizgi
        for (let i = 0; i < totalCols; i++) gridContainer.appendChild(createCell('', null, null, 'cell-line'));
        
        // 5. Kısmi Çarpımlar
        for (let i = 0; i < len2; i++) {
            const rowClass = `partial-row-${i}`;
            for (let j = 0; j < totalCols; j++) {
                const colIndex = totalCols - 1 - j;
                // ÇAĞRI DÜZELTİLDİ: Sınıflar sona eklendi
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
                // ÇAĞRI DÜZELTİLDİ: 'cell-result' sınıfı sona eklendi
                gridContainer.appendChild(createCell('', 'result', colIndex, 'cell-result'));
            }
        }
    }

    // --- 5. YENİ: Animasyon Motoru Fonksiyonları ---

    /**
     * Çarpma işlemini adım adım hesaplar ve 'animationQueue' dizisini doldurur.
     */
    function prepareAnimation(num1Str, num2Str) {
        const n1 = num1Str.split('').reverse().map(Number);
        const n2 = num2Str.split('').reverse().map(Number);
        const partialProducts = []; 

        // Adım A: Kısmi Çarpımları Hesapla
        for (let i = 0; i < n2.length; i++) {
            const digit2 = n2[i];
            const carryRowIndex = i; 
            const partialRowIndex = i; 
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
                animationQueue.push({ 
                    type: 'write', 
                    selector: `[data-row='partial-${partialRowIndex}'][data-col='${partialColIndex}']`, 
                    value: resultDigit 
                });
                currentPartialProduct[partialColIndex] = resultDigit; 

                if (carry > 0) {
                    animationQueue.push({ 
                        type: 'write', 
                        selector: `[data-row='carry-${carryRowIndex}'][data-col='${j + 1}']`,
                        value: carry 
                    });
                }
                
                animationQueue.push({ type: 'clear' });
                animationQueue.push({ type: 'highlight', selector: `[data-row='num2'][data-col='${i}']` });
            }

            if (carry > 0) {
                const partialColIndex = n1.length + i;
                animationQueue.push({ 
                    type: 'write', 
                    selector: `[data-row='partial-${partialRowIndex}'][data-col='${partialColIndex}']`, 
                    value: carry 
                });
                currentPartialProduct[partialColIndex] = carry;
            }
            
            partialProducts.push(currentPartialProduct); 
            animationQueue.push({ type: 'clear' });
        }
        
        // Adım B: Final Toplamayı Hesapla (Eğer 2+ basamaklıysa)
        if (n2.length > 1) {
            let carry = 0;
            const maxCols = totalCols - 1;

            for (let j = 0; j < maxCols; j++) {
                let columnSum = carry;
                
                for (let i = 0; i < n2.length; i++) {
                    animationQueue.push({ type: 'highlight', selector: `[data-row='partial-${i}'][data-col='${j}']` });
                }

                for (let i = 0; i < partialProducts.length; i++) {
                    columnSum += partialProducts[i][j] || 0;
                }

                const resultDigit = columnSum % 10;
                carry = Math.floor(columnSum / 10);

                animationQueue.push({ 
                    type: 'write', 
                    selector: `[data-row='result'][data-col='${j}']`, 
                    value: resultDigit 
                });

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
        
        if (step.type !== 'clear') {
            clearAllHighlights();
        }

        executeStep(step);
        
        currentStepIndex++;
    }

    /**
     * 'Başlat' butonuna basıldığında animasyonu otomatik oynatır.
     */
    function runAnimation() {
        if (animationInterval) return;
        
        if (currentStepIndex >= animationQueue.length) {
            currentStepIndex = 0;
            document.querySelectorAll('.cell-carry, .cell-partial, .cell-result').forEach(cell => {
                cell.textContent = '';
            });
        }
        
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
    
    // --- 6. Yardımcı Fonksiyonlar (Helpers) ---

    // Tüm '.highlight-active' sınıflarını temizler
    function clearAllHighlights() {
        document.querySelectorAll('.highlight-active').forEach(cell => {
            cell.classList.remove('highlight-active');
        });
    }

    // Hücre oluşturan ana fonksiyon
    // --- DÜZELTİLMİŞ createCell FONKSİYONU ---
    function createCell(content = '', dataRow = null, dataCol = null, ...classes) {
        const cell = document.createElement('div');
        cell.classList.add('grid-cell');
        
        // Düzeltme: Tüm 'classes' argümanlarını CSS sınıfı olarak ekle
        if (classes.length > 0) {
            cell.classList.add(...classes);
        }

        // Veri etiketlerini ata
        if (dataRow !== null) cell.dataset.row = dataRow;
        if (dataCol !== null) cell.dataset.col = dataCol;

        cell.textContent = content;
        return cell;
    }

    // --- Başlangıç ---
    createProblem(); // Sayfa yüklendiğinde ilk problemi oluştur
});
