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

    function setupGrid(num1Str, num2Str) {
        // Grid'i temizle
        gridContainer.innerHTML = '';

        // --- Grid Boyutlarını Hesapla ---
        // Toplam sütun sayısı: En uzun sayı (sonuç 12 basamaklı olabilir) + işlem işareti + eldeler
        const len1 = num1Str.length;
        const len2 = num2Str.length;
        const maxResultLen = len1 + len2; // Sonuç max bu kadar basamaklı olabilir
        
        // Ana işlem alanı için sütun sayısı (en uzun basamak + 2 boşluk)
        const mainCols = Math.max(len1, len2 + 1, maxResultLen) + 1; // +1 sağ boşluk
        // Eldeler için sütun sayısı (1. çarpan kadar)
        const carryCols = len1;
        const totalCols = mainCols + carryCols;

        gridContainer.style.gridTemplateColumns = `repeat(${totalCols}, 40px)`;

        // --- Grid Hücrelerini Oluştur ---

        // 1. Satır: 1. Çarpan (num1)
        // Eldeler için boşluk bırak
        for (let i = 0; i < mainCols; i++) gridContainer.appendChild(createCell(''));
        // Elde başlığı (opsiyonel)
        const eldeTitle = createCell('Eldeler', 'cell-title');
        eldeTitle.style.gridColumn = `span ${carryCols}`;
        //gridContainer.appendChild(eldeTitle);

        // 2. Satır: Elde satırları (2. çarpanın basamak sayısı kadar)
        for (let r = 0; r < len2; r++) {
            // Ana işlem alanı boş
            for (let i = 0; i < mainCols; i++) gridContainer.appendChild(createCell(''));
            // Elde kareleri
            for (let i = 0; i < carryCols; i++) gridContainer.appendChild(createCell('', 'cell-carry'));
        }


        // 3. Satır: 1. Çarpan (num1)
        // Boşlukları (sağa yaslamak için) ekle
        for (let i = 0; i < mainCols - len1; i++) gridContainer.appendChild(createCell(''));
        // num1 rakamlarını ekle
        for (const digit of num1Str) {
            gridContainer.appendChild(createCell(digit, 'cell-num1'));
        }
        // Elde alanı boş
        for (let i = 0; i < carryCols; i++) gridContainer.appendChild(createCell(''));


        // 4. Satır: 'x' ve 2. Çarpan (num2)
        // Boşlukları ekle
        for (let i = 0; i < mainCols - len2 - 1; i++) gridContainer.appendChild(createCell(''));
        // 'x' işareti
        gridContainer.appendChild(createCell('x', 'cell-sign'));
        // num2 rakamlarını ekle
        for (const digit of num2Str) {
            gridContainer.appendChild(createCell(digit, 'cell-num2'));
        }
        // Elde alanı boş
        for (let i = 0; i < carryCols; i++) gridContainer.appendChild(createCell(''));


        // 5. Satır: Çizgi
        for (let i = 0; i < mainCols; i++) gridContainer.appendChild(createCell('', 'cell-line'));
        // Elde alanı boş
        for (let i = 0; i < carryCols; i++) gridContainer.appendChild(createCell(''));

        
        // 6. Satırlar: Kısmi Çarpımlar (num2'nin basamak sayısı kadar)
        for (let i = 0; i < len2; i++) {
            // Her kısmi çarpım için (maxResultLen) kadar boş hücre oluştur
            for (let j = 0; j < mainCols; j++) {
                gridContainer.appendChild(createCell('', 'cell-partial'));
            }
            // Elde alanı boş
            for (let k = 0; k < carryCols; k++) gridContainer.appendChild(createCell(''));
        }

        // 7. Satır: Sonuç Çizgisi (eğer 2 veya 3 basamaklıysa)
        if (len2 > 1) {
            for (let i = 0; i < mainCols; i++) gridContainer.appendChild(createCell('', 'cell-line'));
            // Elde alanı boş
            for (let i = 0; i < carryCols; i++) gridContainer.appendChild(createCell(''));
        }

        // 8. Satır: Final Sonuç
        if (len2 > 1) {
            for (let i = 0; i < mainCols; i++) {
                gridContainer.appendChild(createCell('', 'cell-result'));
            }
            // Elde alanı boş
            for (let i = 0; i < carryCols; i++) gridContainer.appendChild(createCell(''));
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
