document.addEventListener('DOMContentLoaded', () => {
    // Sadece mobil menüyü oluşturacak ve yönetecek olan ana fonksiyon
    loadMobileMenu();
});

async function loadMobileMenu() {
    try {
        // 1. Menünün HTML iskeletini 'bilesenler/menu.html'den yükle
        const response = await fetch('bilesenler/menu.html');
        if (!response.ok) throw new Error('menu.html yüklenemedi');
        const menuHTML = await response.text();
        
        // Menü HTML'ini sayfadaki #menu-container içine yerleştir
        const menuContainer = document.getElementById('menu-container');
        if(menuContainer) {
            menuContainer.innerHTML = menuHTML;
        } else {
            console.error('#menu-container elementi sayfada bulunamadı.');
            return;
        }
        
        // 2. Menü içeriğini sayfalar.json'dan yükle
        const dataResponse = await fetch('sayfalar.json');
        if (!dataResponse.ok) throw new Error('sayfalar.json yüklenemedi');
        const data = await dataResponse.json();
        
        // 3. JSON verisiyle mobil menüyü doldur
        buildMobileMenuContent(data);

        // 4. Menüyü çalıştıracak event listener'ları kur
        setupMobileMenuEventListeners();

    } catch (error) {
        console.error('Menü yüklenirken bir hata oluştu:', error);
    }
}

function buildMobileMenuContent(data) {
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

function setupMobileMenuEventListeners() {
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
