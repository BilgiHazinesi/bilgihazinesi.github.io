// BÖLÜM 1: EŞLEŞTİRME MANTIĞI

let currentDraggedId = null;

// Sürükleme başladığında, sürüklenen elemanın ID'sini saklar
function drag(ev) {
    currentDraggedId = ev.target.id;
}

// Bırakma işlemine izin verir
function allowDrop(ev) {
    ev.preventDefault();
}

// Bırakma işlemi gerçekleştiğinde
function drop(ev, targetElement) {
    ev.preventDefault();

    // Sürüklenen eleman
    const draggedElement = document.getElementById(currentDraggedId);

    if (draggedElement && targetElement.classList.contains('senaryo')) {
        const dogruEylemId = targetElement.getAttribute('data-dogru-eylem');
        
        // Önceki uyarı mesajını temizle
        const previousMessage = targetElement.querySelector('.mesaj');
        if (previousMessage) previousMessage.remove();

        if (currentDraggedId === dogruEylemId) {
            // Doğru Eşleştirme
            targetElement.classList.remove('yanlis');
            targetElement.classList.add('dogru');
            
            // Senaryo kutusuna taşı
            targetElement.appendChild(draggedElement);
            draggedElement.style.cursor = 'default';
            draggedElement.draggable = false;

            // Başarı mesajı ekle
            const successMessage = document.createElement('p');
            successMessage.classList.add('mesaj');
            successMessage.style.color = '#155724';
            successMessage.style.fontSize = '0.9em';
            successMessage.innerHTML = '✅ **Doğru!** Bu, sorumlu bir davranıştır.';
            targetElement.appendChild(successMessage);

            // Eğer tüm senaryolar doğru eşleştirildiyse, mini sınava geçiş mesajı verilebilir.
        } else {
            // Yanlış Eşleştirme
            targetElement.classList.add('yanlis');
            targetElement.classList.remove('dogru');

            // Hata mesajı ekle
            const errorMessage = document.createElement('p');
            errorMessage.classList.add('mesaj');
            errorMessage.style.color = '#721c24';
            errorMessage.style.fontSize = '0.9em';
            errorMessage.innerHTML = '❌ **Yanlış Eylem!** Daha güvenli bir karar vermelisin.';
            targetElement.appendChild(errorMessage);

            // Kartı başlangıç yerine geri götür (Opsiyonel: Daha basit bir yaklaşım için kartı hiç bırakmama da tercih edilebilir.)
            document.getElementById('eylem-kutusu').appendChild(draggedElement);
            // Kartı tekrar görünür hale getir (tarayıcılar bazen bırakmada sorun çıkarabilir)
            draggedElement.style.opacity = '1';

            // Kırmızı rengi kısa bir süre sonra kaldır
            setTimeout(() => {
                targetElement.classList.remove('yanlis');
                if (errorMessage) errorMessage.remove();
            }, 1500);
        }
    }
}

// Tüm kartları sürükleme olayına hazırla
document.querySelectorAll('.eylem-karti').
