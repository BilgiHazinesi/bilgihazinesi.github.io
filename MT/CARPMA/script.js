document.addEventListener('DOMContentLoaded', () => {
    // DOM elementlerini seç
    const digits1Select = document.getElementById('digits1');
    const digits2Select = document.getElementById('digits2');
    const generateBtn = document.getElementById('generate-btn');
    const gridContainer = document.getElementById('multiplication-grid');

    // Butona tıklama olayı
    generateBtn.addEventListener('click', createProblem);

    // Başlangıçta bir problem oluştur
    createProblem();

    function createProblem() {
        // Seçilen basamak sayılarını al
        const d1 = parseInt(digits1Select.value);
        const d2 = parseInt(digits2Select.value);

        // Rastgele sayılar üret
        const num1 = generateRandomNumber(d1);
        const num2 = generateRandomNumber(d2);

      // --- GÜNCELLENMİŞ SETUPGRID FONKSİYONU ---
    function setupGrid(num1Str, num2Str) {
        // Grid'i temizle
        gridContainer.innerHTML = '';

        const len1 = num1Str.length;
        const len2 = num2Str.length;
        
        // 1. En geniş sütun sayısını hesapla
        const maxResultLen = len1 + len2;
        const totalCols = Math.max(len1, len2 + 1, maxResultLen) + 1;

        gridContainer.style.gridTemplateColumns = `repeat(${totalCols}, 40px)`;

        // --- Grid Hücrelerini Oluştur ---

        // 1. Satırlar: Elde Satırları (2. çarpanın basamak sayısı kadar)
        for (let r = 0; r < len2; r++) {
            let padding = totalCols - len1;
            for (let i = 0; i < padding; i++) {
                gridContainer.appendChild(createCell(''));
            }
            for (let i = 0; i < len1; i++) {
                gridContainer.appendChild(createCell('', 'cell-carry'));
            }
        }

        // 2. Satır: 1. Çarpan (num1)
        let paddingNum1 = totalCols - len1;
        for (let i = 0; i < paddingNum1; i++) {
            gridContainer.appendChild(createCell(''));
        }
        for (const digit of num1Str) {
            gridContainer.appendChild(createCell(digit, 'cell-num1'));
        }

        // 3. Satır: 'x' ve 2. Çarpan (num2) --- [BURASI GÜNCELLENDİ] ---
        let paddingNum2 = totalCols - (len2 + 1); // +1 'x' işareti için
        for (let i = 0; i < paddingNum2; i++) {
            gridContainer.appendChild(createCell(''));
        }
        gridContainer.appendChild(createCell('x', 'cell-sign'));
        
        // Rakamları eklerken indekse göre renklendir
        for (let i = 0; i < len2; i++) {
            const digit = num2Str[i];
            // Sağdan sola basamak indeksi (0=birler, 1=onlar, 2=yüzler)
            const placeIndex = (len2 - 1) - i;
            // Hücreyi 'cell-num2' ve dinamik 'num2-digit-X' sınıfıyla oluştur
            gridContainer.appendChild(createCell(digit, 'cell-num2', `num2-digit-${placeIndex}`));
        }
        // --- [GÜNCELLEME SONU] ---

        // 4. Satır: Çizgi
        for (let i = 0; i < totalCols; i++) {
            gridContainer.appendChild(createCell('', 'cell-line'));
        }
        
        // 5. Satırlar: Kısmi Çarpımlar --- [BURASI GÜNCELLENDİ] ---
        for (let i = 0; i < len2; i++) {
            // i = 0 (ilk satır) -> 'partial-row-0' (birler basamağı sonucu)
            // i = 1 (ikinci satır) -> 'partial-row-1' (onlar basamağı sonucu)
            
            // Hangi satırda olduğumuzu belirleyen sınıf
            const rowClass = `partial-row-${i}`;
            
            for (let j = 0; j < totalCols; j++) {
                // Hücreyi 'cell-partial' ve dinamik 'partial-row-X' sınıfıyla oluştur
                gridContainer.appendChild(createCell('', 'cell-partial', rowClass));
            }
        }
        // --- [GÜNCELLEME SONU] ---


        // 6. Satır: Sonuç Çizgisi (eğer 2 veya 3 basamaklıysa)
        if (len2 > 1) {
            for (let i = 0; i < totalCols; i++) {
                gridContainer.appendChild(createCell('', 'cell-line'));
            }
        }

        // 7. Satır: Final Sonuç
        if (len2 > 1) {
            for (let i = 0; i < totalCols; i++) {
                gridContainer.appendChild(createCell('', 'cell-result'));
            }
        }
    }

    // Helper: Yeni bir grid hücresi (kare) oluşturan fonksiyon
    function createCell(content = '', ...classes) {
        const cell = document.createElement('div');
        cell.classList.add('grid-cell');
        if (classes.length > 0) {
            cell.classList.add(...classes);
        }
        cell.textContent = content;
        return cell;
    }
});
