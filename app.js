// ============================================================
// LibTech – Logique principale du site (SPA + répertoire CSV)
// ============================================================


(() => {
    'use strict';


    // ------------------------------------------------------------
    // 1. Source des données (Google Sheets publié en CSV)
    // ------------------------------------------------------------
    const CSV_URL =
    'https://docs.google.com/spreadsheets/d/1m8lA4cvpCk2GdFyMoT-9e3wP8kocDtWCg8-ueLZ0Gw8/export?format=csv&gid=190357944';

    // ------------------------------------------------------------
    // 2. Fonctions utilitaires (sélecteurs, échappement, formats)
    // ------------------------------------------------------------
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));


    const esc = (s) =>
        String(s ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');


    const slug = (s) =>
        String(s || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

    const norm = (s) =>
        String(s ?? '')
           .toLowerCase()
           .normalize('NFD')
           .replace(/\p{Diacritic}/gu, '');

    const normalizeSearch = (s) =>
        String(s ?? '')
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .toLowerCase();


    const isImg = (v) => /^https?:\/\//i.test(String(v).trim());


    // ------------------------------------------------------------
    // 3. État global
    // ------------------------------------------------------------
    let rows = [];
    let headers = [];
    let bySlug = new Map();
    let expandedFacets = new Set();
    let openFacets = new Set();
    let searchQuery = '';
    let speechStatusKey = '';


    let currentLang = localStorage.getItem('libtechLang') === 'en' ? 'en' : 'fr';
    document.documentElement.lang = currentLang;


    const UI_STRINGS = {
        fr: {
            nav_home: 'Accueil',
            nav_directory: 'Catalogue',
            nav_submit: 'Soumettre',
            nav_about: 'À propos',
            nav_contact: 'Contact',
            footer_contact: 'Nous contacter',
            footer_resources: 'Ressources',
            footer_mentions: 'Mentions légales',
            footer_privacy: 'Politiques de confidentialité',
            footer_sitemap: 'Plan du site',
            back_to_top: '↑ Retour haut',
            accessibility: 'Accessibilité',
            text_size: 'Taille du texte',
            reset_settings: 'Réinitialiser les réglages',
            theme_color: 'Couleur du thème',
            theme_night: 'Mode nuit',
            theme_day: 'Mode clair',
            theme_enable_dark: 'Activer le mode nuit',
            theme_enable_light: 'Activer le mode clair',
            voice_reading: 'Lecture vocale',
            selection: 'Sélection',
            page: 'Page',
            stop: 'Stop',
            voice: 'Voix',
            default_voice: 'Système par défaut',
            speed: 'Vitesse',
            speech_unsupported: 'La lecture vocale n’est pas disponible sur ce navigateur.',
            selection_empty: 'Sélectionnez un texte à lire.',
            page_empty: 'Aucun contenu à lire sur cette page.',
            speech_finished: 'Lecture terminée.',
            speech_error: 'La lecture vocale a rencontré une erreur.',
            settings_reset: 'Réglages réinitialisés.',
        },
        en: {
            nav_home: 'Home',
            nav_directory: 'Catalog',
            nav_submit: 'Submit',
            nav_about: 'About',
            nav_contact: 'Contact',
            footer_contact: 'Contact us',
            footer_resources: 'Resources',
            footer_mentions: 'Legal notice',
            footer_privacy: 'Privacy policy',
            footer_sitemap: 'Site map',
            back_to_top: '↑ Back to top',
            accessibility: 'Accessibility',
            text_size: 'Text size',
            reset_settings: 'Reset settings',
            theme_color: 'Theme colour',
            theme_night: 'Night mode',
            theme_day: 'Light mode',
            theme_enable_dark: 'Enable night mode',
            theme_enable_light: 'Enable light mode',
            voice_reading: 'Read aloud',
            selection: 'Selection',
            page: 'Page',
            stop: 'Stop',
            voice: 'Voice',
            default_voice: 'System default',
            speed: 'Speed',
            speech_unsupported: 'Text-to-speech is not available in this browser.',
            selection_empty: 'Select some text to read.',
            page_empty: 'There is no content to read on this page.',
            speech_finished: 'Reading finished.',
            speech_error: 'Text-to-speech encountered an error.',
            settings_reset: 'Settings reset.',
        },
    };

    function setSpeechStatus(key) {
        speechStatusKey = key;
        const speechStatus = $('#speechStatus');
        if (speechStatus) {
            const dict = UI_STRINGS[currentLang] || UI_STRINGS.fr;
            speechStatus.textContent = key ? dict[key] || '' : '';
        }
    }


    function applyTranslations() {
        const dict = UI_STRINGS[currentLang] || UI_STRINGS.fr;


        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            const val = dict[key];
            if (val) el.textContent = val;
        });


        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            const val = dict[key];
            if (val) el.placeholder = val;
        });

        document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
            const key = el.getAttribute('data-i18n-aria-label');
            const val = dict[key];
            if (val) el.setAttribute('aria-label', val);
        });

        if (speechStatusKey) setSpeechStatus(speechStatusKey);

        updateThemeToggle();
    }


    // Met à jour l'icône et le libellé accessible du bouton selon le thème et la langue actifs.
    function updateThemeToggle() {
        const themeToggle = $('#themeToggle');
        const isDark = document.documentElement.dataset.theme === 'dark';
        const dict = UI_STRINGS[currentLang] || UI_STRINGS.fr;
        const actionLabel = isDark ? dict.theme_enable_light : dict.theme_enable_dark;

        if (!themeToggle) return;
        const icon = themeToggle.querySelector('[aria-hidden="true"]');
        const modeLabel = $('#themeToggleLabel');
        if (icon) icon.textContent = isDark ? '☀' : '☾';
        if (modeLabel) modeLabel.textContent = isDark ? dict.theme_day : dict.theme_night;
        themeToggle.setAttribute('aria-label', actionLabel);
        themeToggle.title = actionLabel;
    }

    function setTheme(theme) {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('libtechTheme', theme);
        updateThemeToggle();
    }


    const savedTheme = localStorage.getItem('libtechTheme') === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = savedTheme;
    updateThemeToggle();


    $('#themeToggle')?.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
    });

    const accessibilityToggle = $('#accessibilityToggle');
    const accessibilityPanel = $('#accessibilityPanel');
    if (accessibilityToggle && accessibilityPanel) {
        accessibilityToggle.addEventListener('click', () => {
            const isExpanded = accessibilityToggle.getAttribute('aria-expanded') === 'true';
            accessibilityToggle.setAttribute('aria-expanded', String(!isExpanded));
            accessibilityPanel.hidden = isExpanded;
            document.querySelector('header')?.classList.toggle('accessibility-open', !isExpanded);
        });

        document.addEventListener('click', (event) => {
            if (event.target instanceof Node && !accessibilityToggle.parentElement.contains(event.target)) {
                accessibilityToggle.setAttribute('aria-expanded', 'false');
                accessibilityPanel.hidden = true;
                document.querySelector('header')?.classList.remove('accessibility-open');
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape' || accessibilityPanel.hidden) return;
            accessibilityToggle.setAttribute('aria-expanded', 'false');
            accessibilityPanel.hidden = true;
            document.querySelector('header')?.classList.remove('accessibility-open');
            accessibilityToggle.focus();
        });
    }


    function renderTemplate(name) {
        const template = document.getElementById(`view-${name}`);
        if (!(template instanceof HTMLTemplateElement)) {
            throw new Error(`Template not found: view-${name}`);
        }

        document.body.classList.remove('catalog-active');
        $('#page').classList.remove('catalog-page');

        const content = template.content.cloneNode(true);
        content.querySelectorAll('[data-lang]').forEach((el) => {
            el.hidden = el.dataset.lang !== currentLang;
        });
        content.querySelectorAll('[data-placeholder-fr]').forEach((el) => {
            el.placeholder =
                el.getAttribute(`data-placeholder-${currentLang}`) ||
                el.getAttribute('data-placeholder-fr');
        });

        content.querySelectorAll('[data-alt-fr]').forEach((el) => {
            el.alt =
                el.getAttribute(`data-alt-${currentLang}`) ||
                el.getAttribute('data-alt-fr');
        });


        $('#page').replaceChildren(content);
    }


    const FACET_LABELS = [
        'Besoin',
        'Technologie',
        "Tranche d'âge",
        'Handicap',
        'Langue',
        'Prix',
        'Localisation',
    ];
    // Titres des filtres affichés selon la langue (les clés internes restent en français)
    const FACET_TITLES_EN = {
        'Besoin': 'Need',
        'Technologie': 'Technology',
        "Tranche d'âge": 'Age group',
        'Handicap': 'Disability',
        'Langue': 'Language',
        'Prix': 'Price',
        'Localisation': 'Location',
    };
    const facetTitle = (label) => (currentLang === 'en' ? FACET_TITLES_EN[label] || label : label);
    
    // Restaure les choix des facettes après un rechargement, avec une sélection vide si les données enregistrées sont invalides.
    function restoreActiveTokens() {
        // Prépare une sélection vide pour chaque catégorie si aucune préférence n'est disponible.
        const emptyTokens = () => new Map(FACET_LABELS.map((label) => [label, new Set()]));
        const savedTokens = localStorage.getItem('libtechActiveTokens');
        if (!savedTokens) return emptyTokens();


        let parsedTokens;
        try {
            parsedTokens = JSON.parse(savedTokens);
        } catch (error) {
            console.error('Impossible de restaurer les filtres enregistrés.', error);
            return emptyTokens();
        }


        if (!parsedTokens || typeof parsedTokens !== 'object' || Array.isArray(parsedTokens)) {
            console.error('Les filtres enregistrés ont un format invalide.');
            return emptyTokens();
        }


        return new Map(FACET_LABELS.map((label) => [
            label,
            new Set(Array.isArray(parsedTokens[label])
                ? parsedTokens[label].filter((value) => typeof value === 'string')
                : []),
        ]));
    }


    let activeTokens = restoreActiveTokens();


    const BASE_PAGE_SIZE = 12;
    let currentPageSize = BASE_PAGE_SIZE;
    let currentPage = 1;
    const CATALOG_PAGE_STATE = 'libtechCatalogPage';


    function getCatalogPageSize(grid) {
        const columns = Math.max(
            1,
            window.getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length
        );
        return Math.ceil(BASE_PAGE_SIZE / columns) * columns;
    }


    function setCatalogPage(page, pushHistory = false) {
        currentPage = page;
        const state = history.state && typeof history.state === 'object'
            ? { ...history.state }
            : {};
        state[CATALOG_PAGE_STATE] = currentPage;

        if (pushHistory) {
            history.pushState(state, '', location.href);
        } else {
            history.replaceState(state, '', location.href);
        }
    }


    function getCatalogPageFromHistory() {
        const page = history.state?.[CATALOG_PAGE_STATE];
        return Number.isInteger(page) && page > 0 ? page : 1;
    }


    let imageHeader = null;
    let imageDescHeader = null;


    // ------------------------------------------------------------
    // 4. Mapping logique des colonnes du CSV
    // ------------------------------------------------------------
    const COL = {
        name: { base: ['Nom'], suffix: true },
        description: { base: ['Description'], suffix: true },
        needs: { base: ['Besoin', 'Besoins'], suffix: true },
        technology: { base: ['Technologie', 'Type de technologie'], suffix: true },
        age: { base: ["Tranche d'âge", "Tranche d'age"], suffix: true },
        disability: { base: ['Handicap'], suffix: true },
        langs: { base: ['Langue', 'Langues'], suffix: true },
        price: { base: ['Prix', 'Tarif', 'Coût', 'Cout'], suffix: true },
        availability: { base: ['Disponibilité', 'Disponibilite', 'Availability'], suffix: true },
        location: { base: ['Localisation', 'Pays'], suffix: true },
    };


    const headersIndex = () => {
        const map = new Map();
        headers.forEach((h) => map.set(String(h || '').trim().toLowerCase(), h));
        return map;
    };


    const findHeader = (cand) =>
        headers.find((h) => new RegExp(`^${cand}$`, 'i').test(h)) || null;


    function pickHeader(key) {
        const info = COL[key];
        if (!info) return null;


        const H = headersIndex();
        const candidates = [];


        for (const b of info.base) {
            if (info.suffix) {
                if (currentLang) {
                    candidates.push(`${b}_${currentLang}`);
                }
                candidates.push(b);
            } else {
                candidates.push(b);
            }
        }


        for (const c of candidates) {
            const exact = findHeader(c);
            if (exact) return exact;
            const loose = H.get(c.toLowerCase());
            if (loose) return loose;
        }


        for (const b of info.base) {
            for (const h of headers) {
                if (new RegExp(b, 'i').test(h)) return h;
            }
        }
        return null;
    }


    function pickValue(row, key) {
        const h = pickHeader(key);
        const v = h && row[h] != null ? String(row[h]).trim() : '';
        return v || '';
    }
    function pickImageCaption(row) {
        const localizedHeader = headers.find((h) =>
            new RegExp(`^description[_ ]?image_${currentLang}$`, 'i').test(h)
        );
        const frenchHeader = headers.find((h) =>
            /^description[_ ]?image_fr$/i.test(h)
        );
        const baseHeader = headers.find((h) =>
            /^description[_ ]?image$/i.test(h)
        );
        const header = localizedHeader || frenchHeader || baseHeader || imageDescHeader;
        return header && row[header] != null ? String(row[header]).trim() : '';
    }


    const nameKey = () => pickHeader('name') || headers[0] || 'Nom';


    // ------------------------------------------------------------
    // 5. Chargement du CSV
    // ------------------------------------------------------------
    function loadCSV(url) {
        return new Promise((resolve, reject) => {
            const bust = `${url}${url.includes('?') ? '&' : '?'}cache=${Date.now()}`;


            Papa.parse(bust, {
                header: true,
                download: true,
                skipEmptyLines: true,
                complete: (res) => {
                    const data = (res.data || []).filter((row) =>
                        Object.values(row).some((v) => String(v || '').trim() !== '')
                    );


                    headers = (res.meta?.fields || Object.keys(data[0] || {})).map((h) =>
                        String(h || '').trim()
                    );


                    // Normalise row keys (trim) so they match the header names
                    const nkey = nameKey();
                    rows = data.map((r, i) => {
                        const normalized = {};
                        Object.entries(r).forEach(([k, v]) => {
                            const key = String(k || '').trim();
                            normalized[key] = v;
                        });
                        normalized.__slug = slug(normalized[nkey] || `item-${i}`);
                        return normalized;
                    });


                    bySlug = new Map(rows.map((r) => [r.__slug, r]));


                    // Detect image and image-description columns (once)
                    imageHeader = headers.find((h) => /^image(_fr)?$/i.test(h)) || null;
                    imageDescHeader =
                        headers.find((h) => /^description[_ ]?image(?:_fr|_en)?$/i.test(h)) || null;




                    rows.sort((a, b) =>
                        String(a[nkey] || '').localeCompare(String(b[nkey] || ''), 'fr', {
                            sensitivity: 'base',
                        })
                    );


                    route();
                    resolve();
                },
                error: (err) => {
                    console.error(err);
                    alert('Erreur lors du chargement des données (CSV).');
                    reject(err);
                },
            });
        });
    }


    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            loadCSV(CSV_URL);
        }
    });


    // ------------------------------------------------------------
    // 6. Filtres
    // ------------------------------------------------------------
    const facetDefs = () => [
        { key: 'needs', label: 'Besoin' },
        { key: 'technology', label: 'Technologie' },
        { key: 'age', label: "Tranche d'âge" },
        { key: 'disability', label: 'Handicap' },
        { key: 'langs', label: 'Langue' },
        { key: 'price', label: 'Prix' },
        { key: 'location', label: 'Localisation' },
    ];


    function facetValues() {
        const map = new Map();
        facetDefs().forEach((f) => map.set(f.label, new Set()));


        for (const row of rows) {
            for (const f of facetDefs()) {
                const raw = pickValue(row, f.key);
                raw
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .forEach((val) => map.get(f.label).add(val));
            }
        }


        const result = {};
        for (const f of facetDefs()) {
            result[f.label] = Array.from(map.get(f.label)).sort((a, b) =>
                a.localeCompare(b, 'fr', { sensitivity: 'base' })
            );
        }
        return result;
    }


    function toggleToken(label, value) {
        const set = activeTokens.get(label);
        if (!set) return;
        if (set.has(value)) set.delete(value);
        else set.add(value);


        saveActiveTokens();
    }


    // Enregistre les sélections des facettes pour les restaurer au prochain affichage du répertoire.
    function saveActiveTokens() {
        const savedTokens = Object.fromEntries(
            Array.from(activeTokens, ([facet, values]) => [facet, Array.from(values)])
        );
        localStorage.setItem('libtechActiveTokens', JSON.stringify(savedTokens));
    }

    
    // Traduit les filtres cochés d'une langue à l'autre en s'appuyant sur les lignes de la base
    function translateActiveTokens(fromLang, toLang) {
        // Valeurs d'une cellule dans une langue donnée, sous forme de liste
        const readValues = (row, key, lang) => {
            const saved = currentLang;
            currentLang = lang;                 // change la langue le temps de la lecture
            const v = pickValue(row, key);
            currentLang = saved;
            return v.split(',').map((s) => s.trim()).filter(Boolean);
        };

        const newTokens = new Map(FACET_LABELS.map((label) => [label, new Set()]));

        for (const def of facetDefs()) {
            const old = activeTokens.get(def.label);
            if (!old || old.size === 0) continue;       // rien de coché dans ce filtre
            const dest = newTokens.get(def.label);

            for (const row of rows) {
                const a = readValues(row, def.key, fromLang);   // ex. ['Communiquer', 'Autonomie']
                const b = readValues(row, def.key, toLang);     // ex. ['Communicate', 'Autonomy']
                if (a.length !== b.length) continue;            // listes non alignées : on ignore
                a.forEach((val, i) => {
                    if (old.has(val)) dest.add(b[i]);           // « Autonomie » coché => « Autonomy » coché
                });
            }
        }

        activeTokens = newTokens;
        saveActiveTokens();
    }
        // Valeurs d'une cellule (liste) dans une langue donnée, quelle que soit la langue du site
    function valuesInLang(row, key, lang) {
        const saved = currentLang;
        currentLang = lang;
        const v = pickValue(row, key);
        currentLang = saved;
        return v.split(',').map((s) => s.trim()).filter(Boolean);
    }

    // Vrai si la technologie est marquée « Tous publics » dans la colonne française
    const isForAllAges = (row) => valuesInLang(row, 'age', 'fr').includes('Tous publics');

    // Texte de la valeur « Tous publics » dans la langue du site (ex. « Suitable for all audiences » en anglais)
    let allAgesCache = { rows: null, lang: null, value: 'Tous publics' };
    function allAgesLabel() {
        if (allAgesCache.rows === rows && allAgesCache.lang === currentLang) return allAgesCache.value;
        let value = 'Tous publics';
        for (const row of rows) {
            const fr = valuesInLang(row, 'age', 'fr');
            const i = fr.indexOf('Tous publics');
            if (i < 0) continue;
            const cur = valuesInLang(row, 'age', currentLang);
            if (cur.length === fr.length) { value = cur[i]; break; }
        }
        allAgesCache = { rows, lang: currentLang, value };
        return value;
    }

    function matchRow(row) {
        for (const [label, set] of activeTokens.entries()) {
            if (!set || set.size === 0) continue;


            const def = facetDefs().find((f) => f.label === label);
            if (!def) continue;
            if (def.key === 'age') {
                
                if (isForAllAges(row)) continue;         // sinon, les « Tous publics » restent visibles avec les autres âges
            }


            const raw = pickValue(row, def.key);
            const values = raw
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);


            const hasAny = Array.from(set).some((tok) => values.includes(tok));
            if (!hasAny) return false;
        }
        return true;
    }


    // ------------------------------------------------------------
    // 7. Facettes + cartes
    // ------------------------------------------------------------
    function buildFacets() {
        const facetRoot = $('#facetList');
        if (!facetRoot) return;


        const valuesByFacet = facetValues();
        const parts = [];
        const hasActiveFilters = Array.from(activeTokens.values()).some((set) => set.size > 0);
        const toggleAllLabel = hasActiveFilters
            ? (currentLang === 'en' ? 'Uncheck all' : 'Décochez tout')
            : (currentLang === 'en' ? 'Check all' : 'Cochez tout');


        parts.push(`
        <div class="opt facet-select-all facet-reset">
          <input id="resetAllFilters" type="checkbox" data-reset-all-filters
                 ${hasActiveFilters ? 'checked' : ''}>
          <label for="resetAllFilters">${toggleAllLabel}</label>
        </div>`);


        for (const f of facetDefs()) {
            const values = valuesByFacet[f.label] || [];
            const set = activeTokens.get(f.label) || new Set();


            const isExpanded = expandedFacets.has(f.label);
            const isOpen = openFacets.has(f.label);
            const max = isExpanded ? values.length : 6;
            // Cette case est cochée si la catégorie contient des sélections ; la décocher les efface toutes.
            const selectAllLabel = currentLang === 'en' ? 'Uncheck all' : 'Décochez tout';


            parts.push(`
        <div class="facet">
              <button class="facet-heading" type="button" data-toggle-facet-panel="${esc(f.label)}"
                      aria-expanded="${isOpen}" aria-controls="facet-panel-${slug(f.label)}">
                <span>${esc(facetTitle(f.label))}</span>
                <span class="facet-chevron" aria-hidden="true"></span>
              </button>
              <div class="facet-options" id="facet-panel-${slug(f.label)}" ${isOpen ? '' : 'hidden'}>
                <div class="opt facet-select-all">
                  <input id="facet-${slug(f.label)}-all" type="checkbox"
                         data-select-all-label="${esc(f.label)}"
                         ${set.size ? 'checked' : ''}
                         ${set.size ? '' : 'disabled'}>
                  <label for="facet-${slug(f.label)}-all">${selectAllLabel}</label>
                </div>
                ${values
                    .filter((val, i) => i < max || set.has(val))   // les valeurs cochées restent toujours visibles
                    .map((val) => {
                        const id = `facet-${slug(f.label)}-${slug(val)}`;
                        const checked = set.has(val) ? 'checked' : '';
                        return `
              <div class="opt">
                <input id="${id}" type="checkbox" ${checked}
                       data-facet-label="${esc(f.label)}"
                       data-facet-value="${esc(val)}">
                <label for="${id}">${esc(val)}</label>
              </div>`;
                    })
                    .join('')}
          ${values.length > 6
                    ? `<button class="btn btn-sm" data-toggle-facet="${esc(f.label)}">
                ${isExpanded ? (currentLang === 'en' ? 'Show less' : 'Voir moins') : (currentLang === 'en' ? 'Show more' : 'Voir plus')}
               </button>`
                    : ''
                }
          </div>
        </div>`);
        }


        facetRoot.innerHTML = parts.join('');


        facetRoot
            .querySelectorAll('input[type="checkbox"][data-reset-all-filters]')
            .forEach((el) => {
                el.addEventListener('change', () => {
                    if (!el.checked) openFacets.clear();

                    activeTokens.forEach((set, label) => {
                        set.clear();
                        if (el.checked) {
                            const values = valuesByFacet[label] || [];
                            values.forEach((value) => set.add(value));
                            if (values.length > 0) openFacets.add(label);
                        }
                    });
                    saveActiveTokens();
                    setCatalogPage(1);
                    applyFiltersAndRenderCards();
                });
            });


        facetRoot
            .querySelectorAll('input[type="checkbox"][data-select-all-label]')
            .forEach((el) => {
                const facetLabel = el.getAttribute('data-select-all-label');
                const set = activeTokens.get(facetLabel);


                el.addEventListener('change', () => {
                    if (!set) return;
                    set.clear();
                    saveActiveTokens();
                    setCatalogPage(1);
                    applyFiltersAndRenderCards();
                });
            });


        facetRoot
            .querySelectorAll('input[type="checkbox"][data-facet-label]')
            .forEach((el) => {
                el.addEventListener('change', () => {
                    const label = el.getAttribute('data-facet-label');
                    const value = el.getAttribute('data-facet-value');
                    toggleToken(label, value);
                    setCatalogPage(1);
                    applyFiltersAndRenderCards();
                });
            });


        facetRoot
            .querySelectorAll('button[data-toggle-facet]')
            .forEach((btn) => {
                btn.addEventListener('click', () => {
                    const label = btn.getAttribute('data-toggle-facet');
                    if (expandedFacets.has(label)) expandedFacets.delete(label);
                    else expandedFacets.add(label);
                    buildFacets();
                    applyFiltersAndRenderCards();
                });
            });

        facetRoot
            .querySelectorAll('button[data-toggle-facet-panel]')
            .forEach((btn) => {
                btn.addEventListener('click', () => {
                    const label = btn.getAttribute('data-toggle-facet-panel');
                    if (openFacets.has(label)) openFacets.delete(label);
                    else openFacets.add(label);
                    buildFacets();
                });
            });
    }


    function card(row) {
        const nkey = nameKey();
        const name = row[nkey] || '(Sans nom)';
        const description = pickValue(row, 'description');
        const needs = pickValue(row, 'needs');
        const handicap = pickValue(row, 'disability');


        const imageUrl = imageHeader ? row[imageHeader] : '';
        const imageCaption = pickImageCaption(row);


        const fallbackText =
            currentLang === 'en'
                ? 'Assistive solution listed on LibTech.'
                : 'Solution d’assistance référencée sur LibTech.';


        const thumb = imageUrl && isImg(imageUrl)
            ? `<img src="${esc(imageUrl)}" alt="${esc(name)}">`
            : `<div class="card-thumb-fallback">
                 ${currentLang === 'en' ? 'No illustration available' : 'Aucune image d’illustration'}
               </div>`;


        return `
      <article class="card" tabindex="0" data-slug="${esc(row.__slug)}">
        <div class="card-thumb">
          ${thumb}
        </div>
        <div class="title">${esc(name)}</div>
        <div class="desc">
          ${esc(
            description ||
            needs ||
            handicap ||
            fallbackText
        )}
        </div>
        <a class="card-more" href="#/repertoire/${esc(row.__slug)}">
          ${currentLang === 'en' ? 'Read more' : 'Voir plus'}
          <span class="card-more-chevron" aria-hidden="true"></span>
        </a>
      </article>`;
    }


    function applyFiltersAndRenderCards() {
        const grid = $('#gridRoot');
        const count = $('#count');
        if (!grid || !count) return;


        buildFacets();

        const pageSize = getCatalogPageSize(grid);
        if (pageSize !== currentPageSize) {
            const firstItemIndex = (currentPage - 1) * currentPageSize;
            currentPage = Math.floor(firstItemIndex / pageSize) + 1;
            currentPageSize = pageSize;
        }

        const q = norm(searchQuery).trim();
        const nkey = nameKey();
        const descriptionHeaders = new Set(
            headers.filter(header => /^description(?:_[a-z]{2})?$/i.test(header))
        );
        const descriptionHeader = pickHeader('description');
        if (descriptionHeader) descriptionHeaders.add(descriptionHeader);
        // Colonnes ignorées par la recherche
        const SEARCH_EXCLUDED = /^(ID_Tech|Liens_articles|Image|Description_image)$/i;

        let list = rows.filter(matchRow);
        if (q.length >= 2) {
            const words = q.split(/\s+/);   // « enfant dys » devient ['enfant', 'dys']
            list = list.filter((r) => {
                // Texte de toutes les colonnes cherchées, sans accents ni majuscules
                const haystack = norm(
                    Object.entries(r)
                        .filter(([key]) =>
                            headers.includes(key) &&
                            !descriptionHeaders.has(key) &&
                            !SEARCH_EXCLUDED.test(key)
                        )
                        .map(([, value]) => value)
                        .join(' ')
                );
                return words.every((w) => haystack.includes(w));   // chaque mot doit être présent
            });
        }


        list.sort((a, b) =>
            String(a[nkey] || '').localeCompare(String(b[nkey] || ''), 'fr', { sensitivity: 'base' })
        );


        const totalItems = list.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));


        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        if (history.state?.[CATALOG_PAGE_STATE] !== currentPage) {
            setCatalogPage(currentPage);
        }


        const start = (currentPage - 1) * pageSize;
        const pageRows = list.slice(start, start + pageSize);


        const noResultText = currentLang === 'en' ? 'No results.' : 'Aucun résultat.';
        grid.innerHTML = pageRows.length
            ? pageRows.map(card).join('')
            : `<div class="meta">${noResultText}</div>`;

        grid.querySelectorAll('.card-thumb img').forEach((image) => {
            const showFallback = () => {
                if (!image.isConnected) return;
                const fallback = document.createElement('div');
                fallback.className = 'card-thumb-fallback';
                fallback.textContent = currentLang === 'en'
                    ? 'No illustration available'
                    : 'Aucune image d’illustration';
                image.replaceWith(fallback);
            };

            image.addEventListener('error', showFallback, { once: true });
            if (image.complete && image.naturalWidth === 0) showFallback();
        });


        const countOne = currentLang === 'en' ? '1 item' : '1 élément';
        const countMany = (n) => currentLang === 'en' ? `${n} items` : `${n} éléments`;
        count.textContent = totalItems === 1 ? countOne : countMany(totalItems);


        const info = $('#pageInfo');
        const prevBtn = $('#prevPage');
        const nextBtn = $('#nextPage');


        if (info) {
            if (totalItems === 0) {
                info.textContent = currentLang === 'en' ? '0 result' : '0 résultat';
            } else {
                info.textContent = currentLang === 'en'
                    ? `Page ${currentPage} / ${totalPages}`
                    : `Page ${currentPage} / ${totalPages}`;
            }
        }
        if (prevBtn) prevBtn.disabled = currentPage <= 1 || totalItems === 0;
        if (nextBtn) nextBtn.disabled = currentPage >= totalPages || totalItems === 0;


        grid.querySelectorAll('.card').forEach(el => {
            el.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    location.hash = `#/repertoire/${el.dataset.slug}`;
                }
            });
            el.addEventListener('click', () => location.hash = `#/repertoire/${el.dataset.slug}`);
        });
    }


    // ------------------------------------------------------------
    // 8. Vues
    // ------------------------------------------------------------
    function viewHome() {
        renderTemplate('home');


        $('#homeSearchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            searchQuery = $('#homeSearchInput').value || '';
            location.hash = '#/repertoire';
            setTimeout(applyFiltersAndRenderCards, 0);
        });
    }


    function viewContact() {
        renderTemplate('contact');
        const form = $('#contactForm');
        if (!form) return;

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const subject = form.querySelector('select[name="subject"] option:checked')?.textContent.trim() || '';
            const labels = currentLang === 'en'
                ? { name: 'Name / Company', email: 'Email', subject: 'Subject', message: 'Message' }
                : { name: 'Nom / Entreprise', email: 'Email', subject: 'Sujet', message: 'Message' };
            const body = [
                `${labels.name}: ${formData.get('name')}`,
                `${labels.email}: ${formData.get('email')}`,
                `${labels.subject}: ${subject}`,
                '',
                `${labels.message}:`,
                String(formData.get('message') || ''),
            ].join('\n');

            window.location.href = `mailto:promom2sc@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        });
    }


    function viewSoumettre() {
        renderTemplate('submit');


        const form = $('#soumettreForm');
        const modal = $('#soumettreModal');
        const closeModal = $('#closeModal');
        if (!form || !modal || !closeModal) return;


        form.addEventListener('submit', (e) => {
            e.preventDefault();
            modal.classList.remove('hidden');
            form.reset();
        });
        closeModal.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }


    function viewAbout() {
        renderTemplate('about');
    }
    function viewRepertoire() {
        const isEn = currentLang === 'en';
        const savedFiltersVisibility = localStorage.getItem('libtechFiltersVisible');
        const filtersVisible = savedFiltersVisibility === null || savedFiltersVisibility === 'true';
        setCatalogPage(getCatalogPageFromHistory());

        FACET_LABELS.forEach((label) => {
            if (activeTokens.get(label).size > 0) openFacets.add(label);
            else openFacets.delete(label);
        });

        document.body.classList.add('catalog-active');
        $('#page').classList.add('catalog-page');

        const toggleLabelShow = isEn ? 'Show filters' : 'Afficher les filtres';
        const toggleLabelHide = isEn ? 'Hide filters' : 'Masquer les filtres';
        const prevText = isEn ? 'Previous' : 'Précédent';
        const nextText = isEn ? 'Next' : 'Suivant';


        $('#page').innerHTML = `
      <section class="catalog-view">
        <div class="catalog-search">
          <form id="catalogSearchForm" class="search-wrap" role="search">
            <input id="catalogSearchInput" type="search"
                   aria-label="${isEn ? 'Search the catalog' : 'Rechercher dans le catalogue'}"
                   placeholder="${isEn ? 'Search for a technology' : 'Rechercher une technologie'}"
                   value="${esc(searchQuery)}" autocomplete="off">
            <button class="btn" type="submit">${isEn ? 'Search' : 'Rechercher'}</button>
          </form>
        </div>
        <div class="repo-layout with-filters" id="repoLayout">
          <aside class="sidebar" aria-label="${isEn ? 'Filters' : 'Filtres'}">
            <div class="sidebar-heading">
              <h2>${isEn ? 'Filters' : 'Filtres'}</h2>
              <button id="toggleFilters" class="filters-toggle" type="button"
                      aria-label="${esc(filtersVisible ? toggleLabelHide : toggleLabelShow)}"
                      title="${esc(filtersVisible ? toggleLabelHide : toggleLabelShow)}"
                      aria-expanded="${filtersVisible}">
                <span class="filter-toggle-chevron" aria-hidden="true"></span>
              </button>
            </div>
            <div id="facetList" ${filtersVisible ? '' : 'hidden'}></div>
          </aside>
          <div class="results-column">
            <span class="sr-only" id="count" aria-live="polite">0</span>
            <div class="grid" id="gridRoot"></div>
            <div class="pagination" id="pagination">
              <button type="button" id="prevPage" class="btn pagination-btn">${esc(prevText)}</button>
              <span id="pageInfo" class="pagination-info"></span>
              <button type="button" id="nextPage"
                      class="btn pagination-btn">${esc(nextText)}</button>
            </div>
          </div>
        </div>
      </section>`;


        const facetList = $('#facetList');
        const toggleFilters = $('#toggleFilters');
        const catalogSearchForm = $('#catalogSearchForm');
        const catalogSearchInput = $('#catalogSearchInput');

        catalogSearchForm?.addEventListener('submit', (event) => {
            event.preventDefault();
            searchQuery = catalogSearchInput.value;
            setCatalogPage(1);
            applyFiltersAndRenderCards();
        });


        if (toggleFilters && facetList) {
            toggleFilters.addEventListener('click', () => {
                const isVisible = facetList.hidden;
                facetList.hidden = !isVisible;
                toggleFilters.setAttribute('aria-expanded', String(isVisible));
                toggleFilters.setAttribute('aria-label', isVisible ? toggleLabelHide : toggleLabelShow);
                toggleFilters.title = isVisible ? toggleLabelHide : toggleLabelShow;
                localStorage.setItem('libtechFiltersVisible', String(isVisible));
            });
        }


        const prevPage = $('#prevPage');
        const nextPage = $('#nextPage');


        if (prevPage) {
            prevPage.addEventListener('click', () => {
                if (currentPage > 1) {
                    setCatalogPage(currentPage - 1, true);
                    applyFiltersAndRenderCards();
                    scrollToPageTop();
                }
            });
        }
        if (nextPage) {
            nextPage.addEventListener('click', () => {
                setCatalogPage(currentPage + 1, true);
                applyFiltersAndRenderCards();
                scrollToPageTop();
            });
        }


        applyFiltersAndRenderCards();
    }


    let catalogResizeTimer;
    window.addEventListener('resize', () => {
        window.clearTimeout(catalogResizeTimer);
        catalogResizeTimer = window.setTimeout(() => {
            const grid = $('#gridRoot');
            if (grid && getCatalogPageSize(grid) !== currentPageSize) {
                applyFiltersAndRenderCards();
            }
        }, 120);
    });


    function viewDetail(slugVal) {
        document.body.classList.remove('catalog-active');
        $('#page').classList.remove('catalog-page');

        const row = bySlug.get(slugVal);
        const isEn = currentLang === 'en';


        if (!row) {
            $('#page').innerHTML = `
        <section class="page article">
          <div class="hero">
            <h2>${isEn ? 'Item not found' : 'Élément introuvable'}</h2>
          </div>
          <div class="section">
            <p>${isEn
                    ? 'The requested technology could not be found in the catalog.'
                    : 'La technologie demandée n’a pas été trouvée dans le catalogue.'
                }</p>
            <p><a class="btn" href="#/repertoire">← ${isEn ? 'Back to catalog' : 'Retour au catalogue'}</a></p>
          </div>
        </section>`;
            return;
        }


        const nkey = nameKey();
        const name = row[nkey] || '(Sans nom)';
        const description = pickValue(row, 'description');
        const besoin = pickValue(row, 'needs');
        const handicap = pickValue(row, 'disability');
        const langues = pickValue(row, 'langs');
        const localisation = pickValue(row, 'location');
        const prix = pickValue(row, 'price');
        const disponibilite = pickValue(row, 'availability');
        const structure = row['Structure'] || row['structure'] || '';
        const dateVal = row['Date'] || row['date'] || '';


        const site = Object.keys(row).find((k) =>
            /^(site|url|lien|liens_articles)$/i.test(k)
        )
            ? row[Object.keys(row).find((k) => /^(site|url|lien|liens_articles)$/i.test(k))]
            : '';


        const imageUrl = imageHeader ? row[imageHeader] : '';
        const imageCaption = pickImageCaption(row);


        const labelHandicap = isEn ? 'Disability' : 'Handicap';
        const labelBesoin = isEn ? 'Need' : 'Besoin';
        const labelDesc = isEn ? 'Description' : 'Description';
        const noDesc = isEn ? 'No description' : 'Pas de description';
        const labelSite = isEn ? 'Website' : 'Site';
        const labelLoc = isEn ? 'Location' : 'Localisation';
        const labelLang = isEn ? 'Language' : 'Langue';
        const labelPrice = isEn ? 'Price' : 'Prix';
        const labelAvailability = isEn ? 'Availability' : 'Disponibilité';
        const labelProductImage = isEn ? 'Product image' : 'Image du produit';
        const labelDate = isEn ? 'Date' : 'Date';
        const labelStructure = isEn ? 'Organization' : 'Structure';
        const backLabel = isEn ? 'Back to catalog' : 'Retour au catalogue';


        $('#page').innerHTML = `
      <section class="page detail-page">
        <a class="detail-back" href="#/repertoire" aria-label="${esc(backLabel)}" title="${esc(backLabel)}">
          <span aria-hidden="true">←</span>
        </a>
        <article class="article detail-article">
          <h1 class="detail-title">${esc(name)}</h1>
          <div class="detail-facts">
            <div class="detail-fact">
              <span class="detail-label">${esc(labelHandicap)}</span>
              <span>${handicap ? esc(handicap) : ''}</span>
            </div>
            <div class="detail-fact">
              <span class="detail-label">${esc(labelBesoin)}</span>
              <span>${besoin ? esc(besoin) : ''}</span>
            </div>
          </div>

          <div class="detail-body">
            <div class="detail-main">
              <section class="detail-description">
                <h2>${esc(labelDesc)}</h2>
                <div class="detail-descbox">${description ? esc(description) : esc(noDesc)}</div>
              </section>
              <dl class="detail-metadata">
              ${site
                ? `<dt>${esc(labelSite)}</dt><dd><a href="${esc(
                    site
                )}" target="_blank" rel="noopener noreferrer">${esc(
                    site
                )}</a></dd>`
                : ''
            }
              ${localisation
                ? `<dt>${esc(labelLoc)}</dt><dd>${esc(localisation)}</dd>`
                : ''
            }
              ${langues ? `<dt>${esc(labelLang)}</dt><dd>${esc(langues)}</dd>` : ''}
              ${disponibilite ? `<dt>${esc(labelAvailability)}</dt><dd>${esc(disponibilite)}</dd>` : ''}
              ${prix ? `<dt>${esc(labelPrice)}</dt><dd>${esc(prix)}</dd>` : ''}
              ${dateVal ? `<dt>${esc(labelDate)}</dt><dd>${esc(dateVal)}</dd>` : ''}
              ${structure ? `<dt>${esc(labelStructure)}</dt><dd>${esc(structure)}</dd>` : ''}
              </dl>
            </div>

            <aside class="detail-visual">
              <div class="detail-imagebox">
                ${imageUrl && isImg(imageUrl)
                  ? `<img src="${esc(imageUrl)}" alt="${esc(name)}">`
                  : `<span>${esc(labelProductImage)}</span>`
              }
              </div>
              <p class="detail-image-caption">${imageCaption ? esc(imageCaption) : esc(labelProductImage)}</p>
            </aside>
          </div>
        </article>
      </section>`;
    }


    function viewPlanSite() {
        renderTemplate('site-map');
    }


    function viewMentions() {
        renderTemplate('legal');
    }


    function viewConfidentialite() {
        renderTemplate('privacy');
    }
    // ------------------------------------------------------------
    // 9. Router
    // ------------------------------------------------------------
    function setActiveNav() {
        const h = location.hash || '#/';


        $$('a[data-nav]').forEach((a) => {
            const href = a.getAttribute('href');
            const isRepo = href === '#/repertoire' && h.startsWith('#/repertoire');
            const isExact =
                href === h || (href === '#/' && (h === '#/' || h === '#'));
            a.setAttribute('aria-current', isRepo || isExact ? 'page' : 'false');
        });


        if (h === '#/' || h === '#') {
            document.body.classList.add('home');
        } else {
            document.body.classList.remove('home');
        }
    }


    function route() {
        const h = location.hash || '#/';


        setActiveNav();


        const mDetail = h.match(/^#\/repertoire\/([a-z0-9_.-]+)/i);
        if (mDetail) {
            viewDetail(mDetail[1]);
            return;
        }


        if (h.startsWith('#/repertoire')) {
            viewRepertoire();
            return;
        }
        if (h === '#/' || h === '#') {
            viewHome();
            return;
        }
        if (h === '#/contact') {
            viewContact();
            return;
        }
        if (h === '#/soumettre') {
            viewSoumettre();
            return;
        }
        if (h === '#/a-propos') {
            viewAbout();
            return;
        }
        if (h === '#/plan-du-site') {
            viewPlanSite();
            return;
        }
        if (h === '#/mentions-legales') {
            viewMentions();
            return;
        }
        if (h === '#/confidentialite') {
            viewConfidentialite();
            return;
        }


        viewHome();
    }


    function renderCurrentRoute() {
        route();
    }


    // Ramène progressivement la fenêtre en haut lorsqu'une navigation interne change de page.
    function scrollToPageTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }


    document.addEventListener('click', (event) => {
        const link = event.target instanceof Element
            ? event.target.closest('a[href^="#/"]')
            : null;
        if (
            !link ||
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            link.target === '_blank'
        ) {
            return;
        }


        scrollToPageTop();
    });


    window.addEventListener('hashchange', () => {
        scrollToPageTop();
        route();
    });


    window.addEventListener('popstate', (event) => {
        if (
            !location.hash.startsWith('#/repertoire') ||
            /^#\/repertoire\//i.test(location.hash)
        ) {
            return;
        }

        const page = event.state?.[CATALOG_PAGE_STATE];
        setCatalogPage(Number.isInteger(page) && page > 0 ? page : 1);
        if ($('#gridRoot')) {
            applyFiltersAndRenderCards();
            window.setTimeout(scrollToPageTop, 0);
        }
    });


    // ------------------------------------------------------------
    // 10. Comportements globaux
    // ------------------------------------------------------------
    const langSelect = $('#lang');
    if (langSelect) {
        langSelect.value = currentLang;
        applyTranslations();


        langSelect.addEventListener('change', () => {
            const nextLang = langSelect.value || 'fr';
            translateActiveTokens(currentLang, nextLang);   // garde les filtres cochés en les traduisant
            currentLang = nextLang;
            localStorage.setItem('libtechLang', currentLang);
            document.documentElement.lang = currentLang;


            applyTranslations();


            if (typeof renderCurrentRoute === 'function') {
                renderCurrentRoute();
            } else {
                route();
            }
        });
    } else {
        applyTranslations();
    }
    function applyFontChoice(choice) {
        const fontScale = {
            normal: '100%',
            grand: '112.5%',
            'très grand': '125%',
        };
        document.documentElement.style.fontSize = fontScale[choice] || fontScale.normal;
    }


    // Le sélecteur redimensionne la racine pour appliquer l'échelle à toutes les tailles exprimées en rem.
    const fontSelect = $('#font');
    if (fontSelect) {
        const validChoices = ['normal', 'grand', 'très grand'];
        const storedChoice = localStorage.getItem('libtechFontChoice');
        const savedChoice = validChoices.includes(storedChoice) ? storedChoice : 'normal';
        applyFontChoice(savedChoice);
        fontSelect.value = savedChoice;


        fontSelect.addEventListener('change', () => {
            if (!validChoices.includes(fontSelect.value)) return;
            applyFontChoice(fontSelect.value);
            localStorage.setItem('libtechFontChoice', fontSelect.value);
        });
    }

    const speechVoice = $('#speechVoice');
    const rateButtons = $$('.speech-rate');
    let speechRate = Number(localStorage.getItem('libtechSpeechRate'));
    if (![1, 1.5, 2].includes(speechRate)) speechRate = 1;

    function updateSpeechRateButtons() {
        rateButtons.forEach((button) => {
            button.setAttribute('aria-pressed', String(Number(button.dataset.rate) === speechRate));
        });
    }

    function populateSpeechVoices() {
        if (!speechVoice || !('speechSynthesis' in window)) return;
        const selectedVoice = localStorage.getItem('libtechSpeechVoice') || '';
        const defaultVoiceOption = speechVoice.querySelector('option[value=""]');
        const voices = window.speechSynthesis.getVoices();
        speechVoice.replaceChildren(
            defaultVoiceOption,
            ...voices.map((voice) => new Option(voice.name, voice.voiceURI)),
        );
        speechVoice.value = voices.some((voice) => voice.voiceURI === selectedVoice)
            ? selectedVoice
            : '';
    }

    const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    const speechButtons = [$('#speakSelection'), $('#speakPage'), $('#stopSpeech')].filter(Boolean);
    if (!canSpeak) {
        speechButtons.forEach((button) => {
            button.disabled = true;
        });
        if (speechVoice) speechVoice.disabled = true;
        rateButtons.forEach((button) => {
            button.disabled = true;
        });
        setSpeechStatus('speech_unsupported');
    } else {
        populateSpeechVoices();
        window.speechSynthesis.addEventListener('voiceschanged', populateSpeechVoices);

        speechVoice?.addEventListener('change', () => {
            localStorage.setItem('libtechSpeechVoice', speechVoice.value);
        });

        function speakText(text) {
            const content = text.trim();
            if (!content) return false;

            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(content);
            utterance.lang = currentLang;
            utterance.rate = speechRate;
            const voice = window.speechSynthesis.getVoices()
                .find((item) => item.voiceURI === speechVoice?.value);
            if (voice) utterance.voice = voice;
            utterance.onend = () => setSpeechStatus('speech_finished');
            utterance.onerror = (event) => {
                if (event.error !== 'canceled') setSpeechStatus('speech_error');
            };
            window.speechSynthesis.speak(utterance);
            setSpeechStatus('');
            return true;
        }

        $('#speakSelection')?.addEventListener('click', () => {
            const selection = window.getSelection()?.toString() || '';
            if (!speakText(selection)) setSpeechStatus('selection_empty');
        });

        $('#speakPage')?.addEventListener('click', () => {
            const pageText = $('#page')?.innerText || '';
            if (!speakText(pageText)) setSpeechStatus('page_empty');
        });

        $('#stopSpeech')?.addEventListener('click', () => {
            window.speechSynthesis.cancel();
            setSpeechStatus('');
        });
    }

    rateButtons.forEach((button) => {
        button.addEventListener('click', () => {
            speechRate = Number(button.dataset.rate);
            localStorage.setItem('libtechSpeechRate', String(speechRate));
            updateSpeechRateButtons();
        });
    });
    updateSpeechRateButtons();

    $('#resetAccessibility')?.addEventListener('click', () => {
        if (fontSelect) {
            fontSelect.value = 'normal';
            applyFontChoice('normal');
        }
        localStorage.setItem('libtechFontChoice', 'normal');
        setTheme('light');
        speechRate = 1;
        localStorage.setItem('libtechSpeechRate', '1');
        localStorage.removeItem('libtechSpeechVoice');
        if (speechVoice) speechVoice.value = '';
        if (canSpeak) window.speechSynthesis.cancel();
        updateSpeechRateButtons();
        setSpeechStatus('settings_reset');
    });





    const backToTopLink = document.querySelector('.footer-top-link');
    if (backToTopLink) {
        // Affiche le bouton après défilement et le retire aussi de la navigation clavier lorsqu'il est caché.
        const updateBackToTopVisibility = () => {
            const isVisible = window.scrollY > 200;
            backToTopLink.classList.toggle('is-visible', isVisible);
            backToTopLink.setAttribute('aria-hidden', String(!isVisible));
            backToTopLink.tabIndex = isVisible ? 0 : -1;
        };


        backToTopLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });


        window.addEventListener('scroll', updateBackToTopVisibility, { passive: true });
        updateBackToTopVisibility();
    }


    // ------------------------------------------------------------
    // 11. Démarrage
    // ------------------------------------------------------------
    (async function init() {
        await loadCSV(CSV_URL);
    })();
})();
