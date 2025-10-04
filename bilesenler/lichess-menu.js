document.addEventListener('DOMContentLoaded', () => {
    loadLichessMenu();
});

async function loadLichessMenu() {
    try {
        const response = await fetch('bilesenler/lichess-menu.html');
        if (!response.ok) throw new Error('lichess-menu.html yüklenemedi');
        const menuHTML = await response.text();
        
        const placeholder = document.getElementById('lichess-menu-placeholder');
        if (placeholder) {
            placeholder.innerHTML = menuHTML;
        } else { return; }
        
        const dataResponse = await fetch('sayfalar.json');
        if (!dataResponse.ok) throw new Error('sayfalar.json yüklenemedi');
        const data = await dataResponse.json();
        
        buildLichessMenuContent(data);
        setupLichessMenuEventListeners();

    } catch (error) {
        console.error('Lichess menü yüklenirken hata:', error);
    }
}

function buildLichessMenuContent(data) {
    const gridContainer = document.getElementById('lichess-menu-grid');
    if (!gridContainer) return;

    let contentHTML = '';
    data.forEach(kategori => {
        contentHTML += `
            <div class="lichess-menu-category">
                <h3><i class="bi ${kategori.ikon}"></i> ${kategori.isim}</h3>
        `;
        kategori.sayfalar.forEach(sayfa => {
            contentHTML += `<a href="${sayfa.url}">${sayfa.isim}</a>`;
        });
        contentHTML += `</div>`;
    });
    gridContainer.innerHTML = contentHTML;
}

function setupLichessMenuEventListeners() {
    const openBtn = document.getElementById('lichess-menu-toggle');
    const closeBtn = document.getElementById('lichess-menu-close');
    const overlay = document.getElementById('lichess-menu-overlay');

    if (!openBtn || !closeBtn || !overlay) return;

    const openMenu = () => overlay.classList.add('open');
    const closeMenu = () => overlay.classList.remove('open');

    openBtn.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && overlay.classList.contains('open')) {
            closeMenu();
        }
    });
}
