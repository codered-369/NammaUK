
// Shared Places Renderer for Taluk Pages

/*
  Expected Global Variables:
  - talukName: string (e.g., 'Ankola')
  - translations: object (from translations.js, for static labels if needed)
*/

document.addEventListener('DOMContentLoaded', () => {
    // Check if talukName is defined
    if (typeof talukName === 'undefined') {
        console.error('talukName is not defined. Cannot render places.');
        return;
    }

    // Initialize AOS
    if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 800, once: true, offset: 100 });
    }

    const grid = document.getElementById('placesGrid');
    if (!grid) return;

    // Helper: Resolve Image URL
    function resolveImage(img, imageMap) {
        if (!img) return 'https://via.placeholder.com/400x240?text=No+Image';
        // Check if logic needs to look in imageMap first (passed as arg)
        if (imageMap && imageMap[img]) return imageMap[img]; // If img is key
        // If img is aleady URL
        if (/^https?:\/\//i.test(img)) return img;
        // If img is filename (from legacy logic)
        return 'assets/images/' + img;
    }

    // Helper: Resolve Map URL
    function resolveMap(p) { return p.maps_url || p.mapLink || p.mapsUrl || p.mapUrl || 'https://maps.google.com' }

    // Helper: Get Translated Text
    function getTranslated(p, field, lang) {
        const key = field + (lang === 'en' ? '' : '_' + lang);
        return p[key] || p[field] || '';
    }

    // Helper: Get Translated Type (if strictly needed, otherwise English)
    // We can add type_kn/type_hi to json later if requested.
    // For now, assume Type is English or needs mapping.
    // We can try to map simple types if we want:
    const typeMap = {
        'kn': { 'Beach': 'ಕಡಲತೀರ', 'Temple': 'ದೇವಾಲಯ', 'Waterfall': 'ಜಲಪಾತ', 'Fort': 'ಕೋಟೆ', 'Island': 'ದ್ವೀಪ' },
        'hi': { 'Beach': 'समुद्र तट', 'Temple': 'मंदिर', 'Waterfall': 'झरना', 'Fort': 'किला', 'Island': 'द्वीप' }
    };
    function getTranslatedType(type, lang) {
        if (!type) return '';
        if (lang === 'en') return type;
        // Simple lookup or return original
        // Split by ' / ' if multiple?
        return typeMap[lang] && typeMap[lang][type] ? typeMap[lang][type] : type;
    }

    let allPlaces = [];
    let placeImages = {};

    function render(places) {
        grid.innerHTML = '';
        const lang = window.currentLanguage || 'en';

        // Update "See more" text if needed (usually handled by translations.js static replace)
        // But the cards are dynamic.

        // Button Text
        let btnText = 'View on Map';
        if (lang === 'kn') btnText = 'ನಕ್ಷೆಯಲ್ಲಿ ವೀಕ್ಷಿಸಿ';
        if (lang === 'hi') btnText = 'मानचित्र पर देखें';

        places.forEach((p, index) => {
            const card = document.createElement('div');
            card.className = 'place-card';
            card.setAttribute('data-aos', 'fade-up');
            // Stagger animation
            card.setAttribute('data-aos-delay', (index % 3) * 100);

            let imgUrl = placeImages[p.name.toLowerCase()];
            if (!imgUrl) imgUrl = resolveImage(p.image, null); // logic variation

            const name = getTranslated(p, 'name', lang);
            const desc = getTranslated(p, 'description', lang);
            const type = getTranslatedType(p.type, lang); // Optional polish

            card.innerHTML = `
                <img src="${imgUrl}" alt="${name}" loading="lazy" />
                <div class="place-meta">
                  <h3>${name}</h3>
                  <div class="meta-line">${type}</div>
                  <p class="card-desc">${desc}</p>
                  <div class="place-actions">
                    <a class="btn" href="${resolveMap(p)}" target="_blank">${btnText}</a>
                  </div>
                </div>
            `;
            grid.appendChild(card);
        });

        // Refresh translations for static elements if any inside (none here)
    }

    // Load Data
    Promise.all([
        fetch('data/places.json?v=' + Date.now()).then(r => r.json()),
        fetch('data/images.json?v=' + Date.now()).then(r => r.json())
    ]).then(([placesData, imagesData]) => {
        const key = Object.keys(placesData).find(k => k.toLowerCase() === talukName.toLowerCase());
        if (!key) {
            console.error('Taluk not found in places.json:', talukName);
            grid.innerHTML = '<p class="text-center text-muted col-span-full">No places found.</p>';
            return;
        }

        allPlaces = placesData[key] || [];

        // Build Image Map
        const lowerTaluk = talukName.toLowerCase();
        if (imagesData[lowerTaluk]) {
            imagesData[lowerTaluk].forEach(p => {
                if (p.name && p.image) placeImages[p.name.toLowerCase()] = p.image;
            });
        }

        // Initial Render
        render(allPlaces);

        // Listen for Language Change
        window.addEventListener('languageChanged', (e) => {
            render(allPlaces);
        });

    }).catch(err => {
        console.error('Error loading places:', err);
        grid.innerHTML = '<p class="text-center text-red-500 col-span-full">Failed to load places.</p>';
    });
});
