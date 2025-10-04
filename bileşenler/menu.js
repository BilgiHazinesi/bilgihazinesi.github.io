document.addEventListener('DOMContentLoaded', () => {
    loadMenu();
});

async function loadMenu() {
    try {
        // Menünün HTML iskeletinin yolu (GÜNCELLENDİ)
        const response = await fetch('bilesenler/menu.html');
        const menuHTML = await response.text();
        document.getElementById('menu-container').innerHTML = menuHTML;
        
        const dataResponse = await fetch('sayfalar.json');
        const data = await dataResponse.json();
        buildMenuContent(data);

        setupMenuEventListeners();

    } catch (error) {
        console.error('Menü yüklenirken bir hata oluştu:', error);
    }
}

// Geri kalan fonksiyonlarda bir değişiklik yok...

function buildMenuContent(data) {
    const mobileNavUl = document.getElementById('mobile-nav-ul');
    if (!mobileNavUl) return; 

    mobileNavUl.innerHTML = '<li><a href="index.html">Anasayfa</a></li>';

    data.forEach(kategori => {
        let mobileNavHtml = `<li><a href="#">${kategori.isim}</a></li>`;
        kategori.sayfalar.forEach(sayfa => {
            mobileNavHtml += `<li class="mobile-dropdown"><a href="${sayfa.url}">${sayfa.isim}</a></li>`;
        });
        mobileNavUl.innerHTML += mobileNavHtml;
    });
}

function setupMenuEventListeners() {
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const mobileNav = document.getElementById('mobile-nav');

    if (!mobileNavToggle || !mobileNav) return;

    mobileNavToggle.addEventListener('click', () => {
        mobileNav.classList.toggle('active');
    });
    
    document.addEventListener('click', (event) => {
        const isClickInsideNav = mobileNav.contains(event.target);
        const isClickOnToggle = mobileNavToggle.contains(event.target);

        if (!isClickInsideNav && !isClickOnToggle && mobileNav.classList.contains('active')) {
            mobileNav.classList.remove('active');
        }
    });
}
