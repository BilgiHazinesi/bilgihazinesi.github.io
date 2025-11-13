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

        // Grid'i (tahtayı) bu sayılara göre oluştur
        setupGrid(num1.toString(), num2.toString());
    }

    function generateRandomNumber(digits) {
        // 0 ile başlayan sayıları engelle (eğer 1 basamaklı değilse)
        const min = (digits === 1) ? 0 : Math.pow(10, digits - 1);
        const max = Math.pow(10, digits) - 1;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // --- YENİDEN DÜZENLENMİŞ SETUPGRID FONKSİYONU ---
    function setupGrid(num1Str, num2Str) {
        // Grid'i temizle
        gridContainer.innerHTML = '';

        const len1 = num1Str.length;
        const len2 = num2Str.length;
        
        // 1. En geniş sütun sayısını hesapla
        //    (1. çarpan, 2. çarpan + 'x', veya sonuçtan en geniş olanı)
        //    +1 solda boşluk (gutter) bırakmak için.
        const maxResultLen = len1 + len2;
        const totalCols = Math.max(len1, len2 + 1, maxResultLen) + 1;

        gridContainer.style.gridTemplateColumns = `repeat(${totalCols}, 40px)`;

        // --- Grid Hücrelerini Oluştur (Tümü totalCols'a göre sağa hizalı) ---

        // 1. Satırlar: Elde Satırları (2. çarpanın basamak sayısı kadar)
        //    Bu satırlar 1. çarpan ile tam olarak hizalı olmalı
        for (let r = 0; r < len2; r++) {
            // Sola boşluk (padding) ekle
            let padding = totalCols - len1;
            for (let i = 0; i < padding; i++) {
                gridContainer.appendChild(createCell(''));
            }
            // Elde hücrelerini ekle (1. çarpanın genişliği kadar)
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

        // 3. Satır: 'x' ve 2. Çarpan (num2)
        let paddingNum2 = totalCols - (len2 + 1); // +1 'x' işareti için
        for (let i = 0; i < paddingNum2; i++) {
            gridContainer.appendChild(createCell(''));
        }
        gridContainer.appendChild(createCell('x', 'cell-sign'));
        for (const digit of num2Str) {
            gridContainer.appendChild(createCell(digit, 'cell-num2'));
        }

        // 4. Satır: Çizgi (Tüm sütunları kapla)
        for (let i = 0; i < totalCols; i++) {
            gridContainer.appendChild(createCell('', 'cell-line'));
        }
        
        // 5. Satırlar: Kısmi Çarpımlar (num2'nin basamak sayısı kadar)
        // (Animasyon aşamasında bu hücreler doğru 'shift' ile doldurulacak)
        for (let i = 0; i < len2; i++) {
            for (let j = 0; j < totalCols; j++) {
                gridContainer.appendChild(createCell('', 'cell-partial'));
            }
        }

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
