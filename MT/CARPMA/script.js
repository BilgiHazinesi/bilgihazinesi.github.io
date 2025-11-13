document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Elementleri ---
    const digits1Select = document.getElementById('digits1');
    const digits2Select = document.getElementById('digits2');
    const generateBtn = document.getElementById('generate-btn');
    const gridContainer = document.getElementById('multiplication-grid');

    // --- YENİ: Animasyon Butonları ---
    const startBtn = document.getElementById('start-btn');
    const nextStepBtn = document.getElementById('next-step-btn');
    const resetBtn = document.getElementById('reset-btn');

    // --- YENİ: Animasyon Durum (State) Değişkenleri ---
    let totalCols = 0;
    let num1Str = '';
    let num2Str = '';
    let animationQueue = []; // Tüm animasyon adımlarını tutan kuyruk
    let currentStepIndex = 0;
    let animationInterval = null;

    // --- 2. Olay Dinleyicileri (Event Listeners) ---
    generateBtn.addEventListener('click', createProblem);
    
    // --- YENİ: Animasyon Buton Olayları ---
    startBtn.addEventListener('click', runAnimation);
    nextStepBtn.addEventListener('click', doNextStep);
    resetBtn.addEventListener('click', () => {
        clearInterval(animationInterval); // Animasyonu durdur
        createProblem(); // Yeni problem yarat
    });

    // --- 3. Ana Fonksiyonlar ---

    // Problem oluştur ve animasyonu hazırla
    function createProblem() {
        // --- YENİ: Animasyonu temizle ---
        clearInterval(animationInterval);
        animationQueue = [];
        currentStepIndex = 0;
        clearAllHighlights();

        // Basamak sayılarını al
        const d1 = parseInt(digits1Select.value);
        const d2 = parseInt(digits2Select.value);

        // Rastgele sayılar üret ve global değişkenlere kaydet
        num1Str = generateRandomNumber(d1).toString();
        num2Str = generateRandomNumber(d2).toString();

        // Grid'i bu sayılara göre oluştur
        setupGrid(num1Str, num2Str);
        
        // --- YENİ: Çözümü hesapla ve animasyon kuyruğunu doldur ---
        prepareAnimation(num1Str, num2Str);
    }

    // Rastgele sayı üreteci
    function generateRandomNumber(digits) {
        const min = (digits === 1) ? 0 : Math.pow(10, digits - 1);
        const max = Math.pow(10, digits) - 1;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Grid'i (tahtayı) oluşturan fonksiyon
    // --- GÜNCELLENDİ: Hücrelere data-attributes eklendi ---
    function setupGrid(num1Str, num2Str) {
        gridContainer.innerHTML = '';

        const len1 = num1Str.length;
        const len2 = num2Str.length;
        
        const maxResultLen = len1 + len2;
        // Global totalCols'u ayarla
        totalCols = Math.max(len1, len2 + 1, maxResultLen) + 1; 

        gridContainer.style.gridTemplateColumns = `repeat(${totalCols}, 40px)`;

        // 1. Elde Satırları
        for (let r = 0; r < len2; r++) {
            let padding = totalCols - len1;
            for (let i = 0; i < padding; i++) gridContainer.appendChild(createCell(''));
            // Elde hücrelerine data-row ve data-col ekle
            for (let i = 0; i < len1; i++) {
                const colIndex = len1 - 1 - i; // Sağdan sola sütun indeksi
                gridContainer.appendChild(createCell('', 'cell-carry', `carry-${r}`, colIndex));
            }
        }

        // 2. 1. Çarpan (num1)
        let paddingNum1 = totalCols - len1;
        for (let i = 0; i < paddingNum1; i++) gridContainer.appendChild(createCell(''));
        for (let i = 0; i < len1; i++) {
            const colIndex = len1 - 1 - i;
            gridContainer.appendChild(createCell(num1Str[i], 'cell-num1', 'num1', colIndex));
        }

        // 3. 'x' ve 2. Çarpan (num2)
        let paddingNum2 = totalCols - (len2 + 1);
        for (let i = 0; i < paddingNum2; i++) gridContainer.appendChild(createCell(''));
        gridContainer.appendChild(createCell('x', 'cell-sign'));
        
        for (let i = 0; i < len2; i++) {
            const placeIndex = (len2 - 1) - i; // 0=birler, 1=onlar...
            const colIndex = len2 - 1 - i;
            gridContainer.appendChild(createCell(num2Str[i], 'cell-num2', `num2-digit-${placeIndex}`, 'num2', colIndex));
        }

        // 4. Çizgi
        for (let i = 0; i < totalCols; i++) gridContainer.appendChild(createCell('', 'cell-line'));
        
        // 5. Kısmi Çarpımlar
        for (let i = 0; i < len2; i++) {
            const rowClass = `partial-row-${i}`;
            for (let j = 0; j < totalCols; j++) {
                const colIndex = totalCols - 1 - j;
                gridContainer.appendChild(createCell('', 'cell-partial', rowClass, `partial-${i}`, colIndex));
            }
        }

        // 6. Sonuç Çizgisi
        if (len2 > 1) {
            for (let i = 0; i < totalCols; i++) gridContainer.appendChild(createCell('', 'cell-line'));
        }

        // 7. Final Sonuç
        if (len2 > 1) {
            for (let i = 0; i < totalCols; i++) {
                const colIndex = totalCols - 1 - i;
                gridContainer.appendChild(createCell('', 'cell-result', 'result', colIndex));
            }
        }
    }

    // --- 4. YENİ: Animasyon Motoru Fonksiyonları ---

    /**
     * Çarpma işlemini adım adım hesaplar ve 'animationQueue' dizisini doldurur.
     */
    function prepareAnimation(num1Str, num2Str) {
        const n1 = num1Str.split('').reverse().map(Number); // [6, 6, 4, 2]
        const n2 = num2Str.split('').reverse().map(Number); // [2, 7, 6]
        const partialProducts = []; // Kısmi çarpımların sonuçlarını tutacak

        // --- Adım A: Kısmi Çarpımları Hesapla ---
        for (let i = 0; i < n2.length; i++) { // n2'nin her basamağı için (2, 7, 6)
            const digit2 = n2[i];
            const carryRowIndex = i; // Hangi elde satırını kullanacağız (0, 1, 2)
            const partialRowIndex = i; // Hangi kısmi çarpım satırını kullanacağız
            let carry = 0;
            const currentPartialProduct = [];

            // Adım: 2. çarpanın aktif basamağını vurgula
            animationQueue.push({ type: 'highlight', selector: `[data-row='num2'][data-col='${i}']` });

            for (let j = 0; j < n1.length; j++) { // n1'in her basamağı için (6, 6, 4, 2)
                const digit1 = n1[j];

                // Adım: 1. çarpanın aktif basamağını vurgula
                animationQueue.push({ type: 'highlight', selector: `[data-row='num1'][data-col='${j}']` });

                const product = (digit1 * digit2) + carry;
                const resultDigit = product % 10;
                carry = Math.floor(product / 10);

                // Adım: Kısmi çarpım sonucunu ilgili kareye yaz
                const partialColIndex = j + i; // Basamak kaydırma (shift)
                animationQueue.push({ 
                    type: 'write', 
                    selector: `[data-row='partial-${partialRowIndex}'][data-col='${partialColIndex}']`, 
                    value: resultDigit 
                });
                currentPartialProduct[partialColIndex] = resultDigit; // Sonuçları toplama için sakla

                // Adım: Eldeyi ilgili kareye yaz (eğer 0'dan büyükse)
                if (carry > 0) {
                    animationQueue.push({ 
                        type: 'write', 
                        selector: `[data-row='carry-${carryRowIndex}'][data-col='${j + 1}']`, // Elde bir sonraki basamağa yazılır
                        value: carry 
                    });
                }
                
                // Adım: Vurguları temizle (bir sonraki adıma hazırlan)
                animationQueue.push({ type: 'clear' });
                // Adım: 2. çarpanı tekrar vurgula (sabit kalsın)
                animationQueue.push({ type: 'highlight', selector: `[data-row='num2'][data-col='${i}']` });
            }

            // İç döngü bittiğinde hala elde varsa, onu da yaz
            if (carry > 0) {
                const partialColIndex = n1.length + i;
                animationQueue.push({ 
                    type: 'write', 
                    selector: `[data-row='partial-${partialRowIndex}'][data-col='${partialColIndex}']`, 
                    value: carry 
                });
                currentPartialProduct[partialColIndex] = carry;
            }
            
            partialProducts.push(currentPartialProduct); // Toplama için bu satırı kaydet
            animationQueue.push({ type: 'clear' }); // 2. çarpan vurgusunu temizle
        }
        
        // --- Adım B: Final Toplamayı Hesapla (Eğer 2+ basamaklıysa) ---
        if (n2.length > 1) {
            let carry = 0;
            const maxCols = totalCols - 1;

            for (let j = 0; j < maxCols; j++) {
                let columnSum = carry;
                
                // Adım: Toplanacak sütunu vurgula
                for (let i = 0; i < n2.length; i++) {
                    animationQueue.push({ type: 'highlight', selector: `[data-row='partial-${i}'][data-col='${j}']` });
                }

                // Sütundaki rakamları topla
                for (let i = 0; i < partialProducts.length; i++) {
                    columnSum += partialProducts[i][j] || 0;
                }

                const resultDigit = columnSum % 10;
                carry = Math.floor(columnSum / 10);

                // Adım: Sonucu ilgili kareye yaz
                animationQueue.push({ 
                    type: 'write', 
                    selector: `[data-row='result'][data-col='${j}']`, 
                    value: resultDigit 
                });

                // (İsteğe bağlı: Toplama eldelerini göstermek için buraya kod eklenebilir)

                // Adım: Sütun vurgularını temizle
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
            return; // Animasyon bitti
        }

        const step = animationQueue[currentStepIndex];
        
        // Önceki adımların vurgularını temizle (eğer 'clear' değilse)
        if (step.type !== 'clear') {
            clearAllHighlights();
        }

        // Adımı uygula
        executeStep(step);
        
        currentStepIndex++;
    }

    /**
     * 'Başlat' butonuna basıldığında animasyonu otomatik oynatır.
     */
    function runAnimation() {
        if (animationInterval) return; // Zaten çalışıyor
        
        // Animasyonu baştan başlatmak için sıfırla
        if (currentStepIndex >= animationQueue.length) {
            currentStepIndex = 0;
            // Grid'i temizle (sadece sayıları bırak)
            document.querySelectorAll('.cell-carry, .cell-partial, .cell-result').forEach(cell => {
                cell.textContent = '';
            });
        }
        
        // 'doNextStep' fonksiyonunu her 500ms'de bir çalıştır
        animationInterval = setInterval(doNextStep, 500); // Hızı buradan ayarlayabilirsiniz
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
    
    // --- 5. Yardımcı Fonksiyonlar (Helpers) ---

    // Tüm '.highlight-active' sınıflarını temizler
    function clearAllHighlights() {
        document.querySelectorAll('.highlight-active').forEach(cell => {
            cell.classList.remove('highlight-active');
        });
    }

    // Hücre oluşturan ana fonksiyon
    // --- GÜNCELLENDİ: data-row ve data-col ekledi ---
    function createCell(content = '', ...classes) {
        const cell = document.createElement('div');
        cell.classList.add('grid-cell');
        
        let dataRow = null;
        let dataCol = null;

        classes.forEach(cls => {
            if (cls.startsWith('carry-') || cls.startsWith('partial-') || cls.startsWith('num') || cls.startsWith('result')) {
                dataRow = cls; // Örn: 'partial-0'
            } else if (!isNaN(cls)) { // Eğer sınıf bir sayıysa
                dataCol = cls;
            } else {
                cell.classList.add(cls);
            }
        });

        // Veri etiketlerini ata
        if (dataRow) cell.dataset.row = dataRow;
        if (dataCol !== null) cell.dataset.col = dataCol;

        cell.textContent = content;
        return cell;
    }

    // --- Başlangıç ---
    createProblem(); // Sayfa yüklendiğinde ilk problemi oluştur
});
