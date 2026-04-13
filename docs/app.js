import { CATEGORIES, CATEGORY_IDS, expandNeeds, normalizeParams } from './data/categories.js';

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  orgs: [],
  neighborhoods: {},
  lang: 'en',
  filters: {
    needs: [],
    services: [],
    locations: [],
    centered: [],
    sort: 'relevance',
    q: ''
  }
};

// ─── Data Loading ─────────────────────────────────────────────────────────────

async function loadData() {
  const [orgsRes, nbRes] = await Promise.all([
    fetch('./data/orgs.json'),
    fetch('./data/neighborhoods.json')
  ]);
  state.orgs = await orgsRes.json();
  const nbData = await nbRes.json();
  state.neighborhoods = nbData.areas;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreOrg(org, resolvedTags, centeredPops, locationSlugs) {
  // Hard filters
  if (org.result === false) return -1;
  if (org.status !== 'active') return -1;

  // not_for filter
  if (org.not_for && org.not_for.some(p => centeredPops.includes(p))) return -1;

  // Location filter
  if (locationSlugs.length > 0) {
    const orgLocs = org.locations || [];
    const isCity = orgLocs.includes('citywide');
    const hasMatch = orgLocs.some(l => locationSlugs.includes(l));
    if (!isCity && !hasMatch) return -1;
  }

  // Base score
  let base = 0;
  for (const tag of resolvedTags) {
    if ((org.services || []).includes(tag)) base += 3;
  }

  // No need match — still show in directory but score 0 if no tags selected
  if (resolvedTags.size === 0) base = 1;
  if (base === 0 && resolvedTags.size > 0) return -1;

  // Multipliers
  let mult = 1.0;
  if ((org.type || []).includes('drop-in')) mult *= 1.5;
  if (org.onramp_seekers) mult *= 1.5;

  // Centered population multiplier
  let centeredMult = 1.0;
  for (const pop of centeredPops) {
    if ((org.centered || []).includes(pop)) centeredMult *= 1.3;
  }

  // Specificity bonus: matched tags as proportion of org's total services
  const orgServiceCount = (org.services || []).length;
  const matchedCount = [...resolvedTags].filter(t => (org.services || []).includes(t)).length;
  const specificity = orgServiceCount > 0 ? matchedCount / orgServiceCount : 0;
  const specificityBonus = 1 + (specificity * 0.5);

  return base * mult * centeredMult * specificityBonus;
}

function getFilteredOrgs(limit = null) {
  const { needs, services, locations, centered, sort, q } = state.filters;

  const resolved = new Set([...expandNeeds(needs), ...services]);

  // Resolve location slugs from selected locations + expand areas to neighborhoods
  const locationSlugs = resolveLocationSlugs(locations);

  const scored = state.orgs
    .map(org => ({ org, score: scoreOrg(org, resolved, centered, locationSlugs) }))
    .filter(({ score }) => score >= 0);

  // Text search
  const filtered = q
    ? scored.filter(({ org }) => {
        const text = [
          org.name,
          (org.short || {})[state.lang] || '',
          (org.notes || {})[state.lang] || ''
        ].join(' ').toLowerCase();
        return text.includes(q.toLowerCase());
      })
    : scored;

  // Sort
  const sorted = filtered.sort((a, b) => {
    if (sort === 'alpha') return a.org.name.localeCompare(b.org.name);
    if (b.score !== a.score) return b.score - a.score;
    return a.org.name.localeCompare(b.org.name);
  });

  const result = sorted.map(({ org }) => org);
  return limit ? result.slice(0, limit) : result;
}

function resolveLocationSlugs(locations) {
  if (!locations || locations.length === 0) return [];
  const slugs = new Set(locations);

  // If an area-level slug (north, northwest, etc.) is selected,
  // expand to all neighborhood slugs in that area
  const areaKeys = Object.keys(state.neighborhoods);
  for (const loc of locations) {
    if (areaKeys.includes(loc)) {
      const area = state.neighborhoods[loc];
      if (area && area.neighborhoods) {
        area.neighborhoods.forEach(n => slugs.add(n.id));
      }
    }
  }
  return [...slugs];
}

// ─── URL Management ───────────────────────────────────────────────────────────

function parseURL() {
  const hash = window.location.hash.slice(1); // remove #
  const [path, queryStr] = hash.split('?');
  const params = new URLSearchParams(queryStr || '');

  return {
    path: path || '/',
    needs: params.get('needs') ? params.get('needs').split(',').filter(Boolean) : [],
    services: params.get('services') ? params.get('services').split(',').filter(Boolean) : [],
    locations: params.get('locations') ? params.get('locations').split(',').filter(Boolean) : [],
    centered: params.get('centered') ? params.get('centered').split(',').filter(Boolean) : [],
    sort: params.get('sort') || 'relevance',
    q: params.get('q') || '',
    lang: params.get('lang') || localStorage.getItem('chihelp-lang') || 'en'
  };
}

function buildURL(path, filters) {
  const { needs, services, locations, centered, sort, q, lang } = filters;
  const params = new URLSearchParams();
  if (needs.length) params.set('needs', needs.join(','));
  if (services.length) params.set('services', services.join(','));
  if (locations.length) params.set('locations', locations.join(','));
  if (centered.length) params.set('centered', centered.join(','));
  if (sort && sort !== 'relevance') params.set('sort', sort);
  if (q) params.set('q', q);
  if (lang && lang !== 'en') params.set('lang', lang);
  const qs = params.toString();
  return `#${path}${qs ? '?' + qs : ''}`;
}

function navigate(path, filters = state.filters) {
  const norm = normalizeParams(filters.needs, filters.services);
  const newFilters = { ...filters, needs: norm.needs, services: norm.services };
  state.filters = newFilters;
  window.location.hash = buildURL(path, newFilters).slice(1);
}

function updateFilter(key, value) {
  state.filters[key] = value;
  const parsed = parseURL();
  navigate(parsed.path, state.filters);
}

// ─── Rendering ────────────────────────────────────────────────────────────────

const t = (obj) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[state.lang] || obj.en || '';
};

function renderBadges(org) {
  const badges = [];
  if ((org.languages || []).includes('es') && state.lang === 'en') {
    badges.push('<span class="badge badge-lang">Spanish available</span>');
  }
  if ((org.languages || []).includes('en') && state.lang === 'es') {
    badges.push('<span class="badge badge-lang">Inglés disponible</span>');
  }
  if ((org.languages || []).includes('ar')) {
    badges.push('<span class="badge badge-lang">Arabic available</span>');
  }
  if ((org.type || []).includes('drop-in')) {
    badges.push(`<span class="badge badge-dropin">${state.lang === 'es' ? 'Sin cita' : 'Walk-in welcome'}</span>`);
  }
  if (org.documentation === 'none') {
    badges.push(`<span class="badge badge-docs">${state.lang === 'es' ? 'Sin documentos' : 'No docs required'}</span>`);
  }
  return badges.join('');
}

function renderOrgEntry(org, options = {}) {
  const { showRelated = true, compact = false } = options;
  const short = t(org.short);
  const hours = t(org.hours);
  const notes = t(org.notes);
  const badges = renderBadges(org);

  const phoneLink = org.phone
    ? `<a href="tel:${org.phone}" class="org-phone">${org.phone}</a>`
    : '';
  const addressLink = org.address
    ? `<a href="https://maps.google.com/?q=${encodeURIComponent(org.address)}" class="org-address" target="_blank" rel="noopener">${org.address}</a>`
    : '';
  const websiteLink = org.url
    ? `<a href="${org.url}" class="org-link" target="_blank" rel="noopener">${state.lang === 'es' ? 'Sitio web' : 'Website'}</a>`
    : '';
  const donateLink = org.donate_url
    ? `<a href="${org.donate_url}" class="org-donate" target="_blank" rel="noopener">${state.lang === 'es' ? 'Donar' : 'Donate'}</a>`
    : '';

  const related = showRelated && org.related && org.related.length
    ? renderRelatedLinks(org.related)
    : '';

  const notForNote = org.not_for && org.not_for.length
    ? `<p class="org-not-for">${state.lang === 'es' ? 'Nota:' : 'Note:'} ${renderNotFor(org.not_for)}</p>`
    : '';

  const metaParts = [hours, phoneLink, addressLink].filter(Boolean);

  return `
    <article class="org-entry" data-id="${org.id}">
      <h3 class="org-name">
        <a href="${buildURL('/org/' + org.id, state.filters)}">${org.name}</a>
      </h3>
      <p class="org-short">${short}</p>
      ${metaParts.length ? `<p class="org-meta">${metaParts.join(' · ')}</p>` : ''}
      ${badges ? `<p class="org-badges">${badges}</p>` : ''}
      <p class="org-links">${[websiteLink, donateLink].filter(Boolean).join(' ')}</p>
      ${notes && !compact ? `<p class="org-notes">${notes}</p>` : ''}
      ${notForNote}
      ${related}
    </article>
  `;
}

function renderRelatedLinks(ids) {
  const orgsById = Object.fromEntries(state.orgs.map(o => [o.id, o]));
  const links = ids
    .map(id => orgsById[id])
    .filter(Boolean)
    .map(o => `<a href="${buildURL('/org/' + o.id, state.filters)}" class="related-link">${o.name}</a>`);
  if (!links.length) return '';
  const label = state.lang === 'es' ? 'Ver también' : 'Also see';
  return `<p class="org-related"><span class="related-label">${label}:</span> ${links.join(', ')}</p>`;
}

function renderNotFor(notFor) {
  const labels = { men: 'men', women: 'women', lgbtq: 'LGBTQ+ people' };
  const described = notFor.map(p => labels[p] || p).join(', ');
  return state.lang === 'es'
    ? `Este espacio no está destinado para ${described}.`
    : `This space is not intended for ${described}.`;
}

// ─── Views ────────────────────────────────────────────────────────────────────

function renderHomepage() {
  const main = document.getElementById('main');
  main.innerHTML = `
    <section class="intro-section">
      <div class="intro-content">
        <h1 class="site-title">${state.lang === 'es' ? 'Guía de recursos de Chicago' : 'Chicago Community Resource Guide'}</h1>
        <p class="intro-text">${state.lang === 'es'
          ? 'Una guía de organizaciones que pueden ayudar con vivienda, alimentos, atención médica, servicios legales y más — incluyendo grupos de ayuda mutua y recursos comunitarios que no siempre aparecen en otros directorios.'
          : 'A guide to organizations that can help with housing, food, healthcare, legal services, and more — including mutual aid groups and community resources that don\'t always appear in other directories.'
        }</p>
        <div class="cta-group">
          <button class="cta-btn cta-primary" id="btn-seeker">
            ${state.lang === 'es' ? 'Estoy buscando ayuda' : 'I\'m looking for help'}
          </button>
          <button class="cta-btn cta-secondary" id="btn-volunteer" disabled>
            ${state.lang === 'es' ? 'Quiero apoyar una organización' : 'I want to support an organization'}
            <span class="coming-soon">${state.lang === 'es' ? 'Próximamente' : 'Coming soon'}</span>
          </button>
        </div>
        <p class="universal-note">
          ${state.lang === 'es'
            ? 'Para ayuda inmediata, llama al <a href="tel:211">2-1-1</a> — disponible 24/7. En crisis, llama o envía un mensaje al <a href="tel:988">9-8-8</a>.'
            : 'For immediate help, call <a href="tel:211">2-1-1</a> — available 24/7. In crisis, call or text <a href="tel:988">9-8-8</a>.'
          }
          <a href="/en/library.html" class="note-link">${state.lang === 'es' ? 'La Biblioteca Pública de Chicago también puede ayudarte a comenzar.' : 'Your Chicago Public Library branch can also help you get started.'}</a>
        </p>
      </div>
    </section>
    <section class="directory-section" id="directory-section">
      ${renderDirectoryInner()}
    </section>
  `;

  document.getElementById('btn-seeker').addEventListener('click', openSeekerWizard);
}

function renderDirectoryInner(isResultsPage = false, limit = null) {
  const orgs = getFilteredOrgs(limit);
  const hasFilters = state.filters.needs.length || state.filters.services.length ||
    state.filters.locations.length || state.filters.centered.length || state.filters.q;

  const resultsHeader = isResultsPage ? renderUniversalResources() : '';

  const entriesHtml = orgs.length
    ? orgs.map((org, i) => `<div class="org-entry-wrap${i % 2 === 1 ? ' alt-row' : ''}">${renderOrgEntry(org, { compact: false })}</div>`).join('')
    : `<p class="no-results">${state.lang === 'es' ? 'No se encontraron resultados. Intenta ampliar tu búsqueda.' : 'No results found. Try broadening your search.'}</p>`;

  const seeAll = isResultsPage && limit
    ? `<p class="see-all"><a href="${buildURL('/directory', state.filters)}">${state.lang === 'es' ? 'Ver todos los resultados' : 'See all results'}</a></p>`
    : '';

  return `
    <div class="directory-layout">
      <aside class="sidebar" id="sidebar" aria-label="${state.lang === 'es' ? 'Filtros' : 'Filters'}">
        ${renderSidebar()}
      </aside>
      <div class="directory-content">
        <div class="directory-toolbar">
          <div class="search-wrap">
            <input type="search"
              id="search-input"
              class="search-input"
              placeholder="${state.lang === 'es' ? 'Buscar organizaciones…' : 'Search organizations…'}"
              value="${state.filters.q}"
              aria-label="${state.lang === 'es' ? 'Buscar organizaciones' : 'Search organizations'}"
            >
          </div>
          <div class="sort-wrap">
            <label for="sort-select" class="sr-only">${state.lang === 'es' ? 'Ordenar por' : 'Sort by'}</label>
            <select id="sort-select" class="sort-select">
              <option value="relevance" ${state.filters.sort === 'relevance' ? 'selected' : ''}>${state.lang === 'es' ? 'Relevancia' : 'Relevance'}</option>
              <option value="alpha" ${state.filters.sort === 'alpha' ? 'selected' : ''}>${state.lang === 'es' ? 'A–Z' : 'A–Z'}</option>
            </select>
          </div>
        </div>
        ${resultsHeader}
        <div class="org-list" id="org-list">
          ${entriesHtml}
        </div>
        ${seeAll}
        <p class="result-count">${orgs.length} ${state.lang === 'es' ? 'organizaciones' : 'organizations'}</p>
      </div>
    </div>
    <button class="mobile-filter-btn" id="mobile-filter-btn" aria-expanded="false" aria-controls="sidebar">
      ${state.lang === 'es' ? 'Filtrar resultados' : 'Filter results'}
    </button>
  `;
}

function renderUniversalResources() {
  return `
    <div class="universal-resources">
      <h2 class="universal-title">${state.lang === 'es' ? 'Empieza aquí' : 'Start here'}</h2>
      <div class="universal-cards">
        <div class="universal-card">
          <span class="universal-number">2-1-1</span>
          <p>${state.lang === 'es'
            ? 'Línea gratuita 24/7. Conecta con navegadores de recursos para casi cualquier necesidad.'
            : 'Free 24/7 line. Connects you to resource navigators for almost any need.'
          }</p>
          <a href="/en/211.html">${state.lang === 'es' ? 'Más información' : 'Learn more'}</a>
        </div>
        <div class="universal-card">
          <span class="universal-number">9-8-8</span>
          <p>${state.lang === 'es'
            ? 'Línea de crisis de salud mental. Llama o envía un mensaje de texto en cualquier momento.'
            : 'Mental health crisis line. Call or text anytime.'
          }</p>
          <a href="/en/988.html">${state.lang === 'es' ? 'Más información' : 'Learn more'}</a>
        </div>
        <div class="universal-card">
          <span class="universal-number">CPL</span>
          <p>${state.lang === 'es'
            ? 'Tu biblioteca pública más cercana. Trabajadores sociales, recursos y un espacio seguro durante el día.'
            : 'Your nearest public library branch. Social workers, resources, and a safe daytime space.'
          }</p>
          <a href="/en/library.html">${state.lang === 'es' ? 'Más información' : 'Learn more'}</a>
        </div>
      </div>
    </div>
  `;
}

function renderSidebar() {
  const activeNeeds = state.filters.needs;

  const categoryButtons = Object.entries(CATEGORIES).map(([id, cat]) => {
    const isActive = activeNeeds.includes(id);
    return `
      <button
        class="cat-btn${isActive ? ' active' : ''}"
        data-cat="${id}"
        title="${t(cat.tooltip)}"
        aria-pressed="${isActive}"
      >${t(cat.label)}</button>
    `;
  }).join('');

  const areas = Object.entries(state.neighborhoods).map(([id, area]) => {
    const isSelected = state.filters.locations.includes(id);
    return `<option value="${id}" ${isSelected ? 'selected' : ''}>${area.label}</option>`;
  }).join('');

  const activeArea = state.filters.locations.find(l => Object.keys(state.neighborhoods).includes(l));
  const neighborhoodOptions = activeArea
    ? renderNeighborhoodCheckboxes(activeArea)
    : '';

  const populations = [
    { id: 'lgbtq', en: 'LGBTQ+', es: 'LGBTQ+' },
    { id: 'trans', en: 'Trans / gender expansive', es: 'Trans / género expansivo' },
    { id: 'hispanic', en: 'Hispanic / Latino', es: 'Hispano / Latino' },
    { id: 'bipoc', en: 'Black / BIPOC', es: 'Negro / BIPOC' },
    { id: 'immigrant', en: 'Immigrant', es: 'Inmigrante' },
    { id: 'undocumented', en: 'Undocumented', es: 'Indocumentado' },
    { id: 'unhoused', en: 'Unhoused', es: 'Sin hogar' },
    { id: 'senior', en: 'Senior (60+)', es: 'Adulto mayor (60+)' },
    { id: 'youth', en: 'Youth (under 25)', es: 'Joven (menor de 25)' },
    { id: 'kids', en: 'For my kids', es: 'Para mis hijos' },
    { id: 'women', en: 'Women', es: 'Mujeres' },
    { id: 'returning-residents', en: 'Returning residents', es: 'Residentes que regresan' },
  ];

  const popCheckboxes = populations.map(p => {
    const isChecked = state.filters.centered.includes(p.id);
    return `
      <label class="checkbox-label">
        <input type="checkbox" class="pop-checkbox" value="${p.id}" ${isChecked ? 'checked' : ''}>
        ${state.lang === 'es' ? p.es : p.en}
      </label>
    `;
  }).join('');

  return `
    <div class="sidebar-inner">
      <div class="sidebar-section">
        <h3 class="sidebar-heading">${state.lang === 'es' ? 'Tipo de ayuda' : 'Type of help'}</h3>
        <div class="cat-grid">
          ${categoryButtons}
        </div>
        ${activeNeeds.length ? `<button class="clear-btn" id="clear-needs">${state.lang === 'es' ? 'Limpiar' : 'Clear'}</button>` : ''}
      </div>

      <div class="sidebar-section">
        <h3 class="sidebar-heading">${state.lang === 'es' ? 'Ubicación' : 'Location'}</h3>
        <select class="area-select" id="area-select" aria-label="${state.lang === 'es' ? 'Área de la ciudad' : 'Area of the city'}">
          <option value="">${state.lang === 'es' ? 'Todo Chicago' : 'All of Chicago'}</option>
          ${areas}
        </select>
        <div class="neighborhood-list" id="neighborhood-list">
          ${neighborhoodOptions}
        </div>
      </div>

      <div class="sidebar-section">
        <h3 class="sidebar-heading">${state.lang === 'es' ? 'Comunidad' : 'Community'}</h3>
        <p class="sidebar-hint">${state.lang === 'es'
          ? 'Priorizar recursos centrados en estas comunidades'
          : 'Prioritize resources centered on serving selected communities'
        }</p>
        <div class="pop-list">
          ${popCheckboxes}
        </div>
      </div>

      ${state.filters.needs.length || state.filters.services.length || state.filters.locations.length || state.filters.centered.length
        ? `<button class="reset-btn" id="reset-all">${state.lang === 'es' ? 'Restablecer todos los filtros' : 'Reset all filters'}</button>`
        : ''
      }
    </div>
  `;
}

function renderNeighborhoodCheckboxes(areaId) {
  const area = state.neighborhoods[areaId];
  if (!area) return '';
  return area.neighborhoods.map(n => {
    const isChecked = state.filters.locations.includes(n.id);
    return `
      <label class="checkbox-label">
        <input type="checkbox" class="nb-checkbox" value="${n.id}" ${isChecked ? 'checked' : ''}>
        ${n.label}
      </label>
    `;
  }).join('');
}

function renderOrgPage(id) {
  const org = state.orgs.find(o => o.id === id);
  const main = document.getElementById('main');

  if (!org) {
    main.innerHTML = `<div class="not-found"><p>${state.lang === 'es' ? 'Organización no encontrada.' : 'Organization not found.'}</p><a href="#/">${state.lang === 'es' ? 'Volver al inicio' : 'Back to home'}</a></div>`;
    return;
  }

  const notes = t(org.notes);
  const centeredLabels = (org.centered || []).map(p => POPULATION_LABELS[p] || p).join(', ');
  const servicesByCategory = getServicesByCategory(org.services || []);

  main.innerHTML = `
    <div class="org-page">
      <a href="${buildURL('/directory', state.filters)}" class="back-link">← ${state.lang === 'es' ? 'Volver al directorio' : 'Back to directory'}</a>
      <article class="org-full">
        <h1 class="org-name-full">${org.name}</h1>
        <p class="org-short-full">${t(org.short)}</p>

        <div class="org-detail-grid">
          ${org.hours ? `<div class="detail-item"><span class="detail-label">${state.lang === 'es' ? 'Horario' : 'Hours'}</span><span>${t(org.hours)}</span></div>` : ''}
          ${org.phone ? `<div class="detail-item"><span class="detail-label">${state.lang === 'es' ? 'Teléfono' : 'Phone'}</span><a href="tel:${org.phone}">${org.phone}</a></div>` : ''}
          ${org.address ? `<div class="detail-item"><span class="detail-label">${state.lang === 'es' ? 'Dirección' : 'Address'}</span><a href="https://maps.google.com/?q=${encodeURIComponent(org.address)}" target="_blank" rel="noopener">${org.address}</a></div>` : ''}
          ${org.url ? `<div class="detail-item"><span class="detail-label">${state.lang === 'es' ? 'Sitio web' : 'Website'}</span><a href="${org.url}" target="_blank" rel="noopener">${org.url}</a></div>` : ''}
          ${org.donate_url ? `<div class="detail-item"><span class="detail-label">${state.lang === 'es' ? 'Donar' : 'Donate'}</span><a href="${org.donate_url}" target="_blank" rel="noopener">${state.lang === 'es' ? 'Apoyar esta organización' : 'Support this organization'}</a></div>` : ''}
          <div class="detail-item"><span class="detail-label">${state.lang === 'es' ? 'Idiomas' : 'Languages'}</span><span>${renderLanguages(org.languages || [])}</span></div>
          <div class="detail-item"><span class="detail-label">${state.lang === 'es' ? 'Documentación' : 'Documentation'}</span><span>${renderDocumentation(org.documentation)}</span></div>
        </div>

        ${notes ? `<div class="org-notes-full"><h2>${state.lang === 'es' ? 'Notas' : 'Notes'}</h2><p>${notes}</p></div>` : ''}

        ${centeredLabels ? `<div class="org-centered"><h2>${state.lang === 'es' ? 'Centrado en' : 'Centered on'}</h2><p>${state.lang === 'es' ? 'Esta organización está centrada en servir a:' : 'This organization is centered on serving:'} <strong>${centeredLabels}</strong></p></div>` : ''}

        ${org.not_for && org.not_for.length ? `<div class="org-not-for-full"><p>⚠ ${renderNotFor(org.not_for)}</p></div>` : ''}

        ${servicesByCategory ? `<div class="org-services"><h2>${state.lang === 'es' ? 'Servicios' : 'Services'}</h2>${servicesByCategory}</div>` : ''}

        ${org.related && org.related.length ? `<div class="org-related-full"><h2>${state.lang === 'es' ? 'Ver también' : 'Also see'}</h2>${renderRelatedLinks(org.related)}</div>` : ''}

        <p class="verified-date">${state.lang === 'es' ? 'Última verificación:' : 'Last verified:'} ${org.verified_date}</p>
      </article>
    </div>
  `;
}

const POPULATION_LABELS = {
  lgbtq: 'LGBTQ+ people',
  trans: 'trans and gender expansive people',
  hispanic: 'Hispanic and Latino communities',
  bipoc: 'Black and BIPOC communities',
  immigrant: 'immigrants',
  undocumented: 'undocumented people',
  unhoused: 'people experiencing homelessness',
  senior: 'older adults',
  youth: 'young people',
  kids: 'children and families',
  women: 'women',
  'returning-residents': 'returning residents',
  'asylum-seeker': 'asylum seekers'
};

function renderLanguages(langs) {
  const map = { en: 'English', es: 'Spanish', ar: 'Arabic' };
  return langs.map(l => map[l] || l).join(', ');
}

function renderDocumentation(doc) {
  const labels = {
    none: state.lang === 'es' ? 'No se requiere documentación' : 'No documentation required',
    partial: state.lang === 'es' ? 'Se puede requerir alguna documentación — llama antes' : 'Some documentation may be required — call ahead',
    unknown: state.lang === 'es' ? 'Desconocido — llama para confirmar' : 'Unknown — call to confirm',
    required: state.lang === 'es' ? 'Se requiere documentación' : 'Documentation required'
  };
  return labels[doc] || labels.unknown;
}

function getServicesByCategory(serviceTags) {
  const result = [];
  for (const [catId, cat] of Object.entries(CATEGORIES)) {
    const matching = cat.services.filter(s => serviceTags.includes(s));
    if (matching.length) {
      result.push(`<div class="service-cat"><strong>${t(cat.label)}</strong></div>`);
    }
  }
  return result.join('');
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

let wizardState = { area: '', locations: [], needs: [], centered: [] };

function openSeekerWizard() {
  wizardState = { area: '', locations: [], needs: [], centered: [] };
  renderWizardStep(1);
}

function renderWizardStep(step) {
  const existing = document.getElementById('wizard-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'wizard-overlay';
  overlay.className = 'wizard-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', state.lang === 'es' ? 'Buscador de recursos' : 'Resource finder');

  overlay.innerHTML = `
    <div class="wizard-modal">
      <button class="wizard-close" id="wizard-close" aria-label="${state.lang === 'es' ? 'Cerrar' : 'Close'}">✕</button>
      <div class="wizard-steps">
        <div class="wizard-step-indicator">
          <span class="${step >= 1 ? 'step active' : 'step'}">1</span>
          <span class="${step >= 2 ? 'step active' : 'step'}">2</span>
          <span class="${step >= 3 ? 'step active' : 'step'}">3</span>
        </div>
        ${renderWizardStepContent(step)}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#wizard-close').addEventListener('click', closeWizard);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeWizard(); });

  // Trap focus
  const focusable = overlay.querySelectorAll('button, input, select, a, [tabindex="0"]');
  if (focusable.length) focusable[0].focus();

  bindWizardEvents(step);
}

function renderWizardStepContent(step) {
  if (step === 1) {
    const areas = Object.entries(state.neighborhoods).map(([id, area]) => `
      <button class="wizard-area-btn${wizardState.area === id ? ' selected' : ''}" data-area="${id}">${area.label}</button>
    `).join('');

    const nbList = wizardState.area
      ? state.neighborhoods[wizardState.area].neighborhoods.map(n => `
          <label class="wizard-checkbox">
            <input type="checkbox" value="${n.id}" ${wizardState.locations.includes(n.id) ? 'checked' : ''}>
            ${n.label}
          </label>
        `).join('')
      : '';

    return `
      <div class="wizard-content">
        <h2>${state.lang === 'es' ? '¿Dónde estás?' : 'Where are you?'}</h2>
        <p class="wizard-hint">${state.lang === 'es' ? 'Selecciona el área de la ciudad más cercana a ti.' : 'Select the area of the city closest to you.'}</p>
        <div class="wizard-area-grid">${areas}
          <button class="wizard-area-btn${wizardState.area === 'all' ? ' selected' : ''}" data-area="all">
            ${state.lang === 'es' ? 'Todo Chicago / No estoy seguro' : 'All of Chicago / Not sure'}
          </button>
        </div>
        ${wizardState.area && wizardState.area !== 'all' ? `
          <div class="wizard-nb-list">
            <p class="wizard-hint">${state.lang === 'es' ? 'Opcional: elige vecindarios específicos.' : 'Optional: choose specific neighborhoods.'}</p>
            ${nbList}
          </div>
        ` : ''}
        <div class="wizard-nav">
          <button class="wizard-next btn-primary" id="wizard-next-1" ${!wizardState.area ? 'disabled' : ''}>${state.lang === 'es' ? 'Siguiente' : 'Next'}</button>
        </div>
      </div>
    `;
  }

  if (step === 2) {
    const catButtons = Object.entries(CATEGORIES).map(([id, cat]) => `
      <button class="wizard-cat-btn${wizardState.needs.includes(id) ? ' selected' : ''}" data-cat="${id}">
        ${t(cat.label)}
      </button>
    `).join('');

    return `
      <div class="wizard-content">
        <h2>${state.lang === 'es' ? '¿Qué necesitas?' : 'What do you need?'}</h2>
        <p class="wizard-hint">${state.lang === 'es' ? 'Selecciona todo lo que aplique. Puedes ajustar después.' : 'Select anything that applies. You can always adjust later.'}</p>
        <div class="wizard-cat-grid">${catButtons}</div>
        <div class="wizard-nav">
          <button class="wizard-back btn-secondary" id="wizard-back-2">${state.lang === 'es' ? 'Atrás' : 'Back'}</button>
          <button class="wizard-skip btn-link" id="wizard-skip-2">${state.lang === 'es' ? 'Saltar' : 'Skip'}</button>
          <button class="wizard-next btn-primary" id="wizard-next-2">${state.lang === 'es' ? 'Siguiente' : 'Next'}</button>
        </div>
      </div>
    `;
  }

  if (step === 3) {
    const populations = [
      { id: 'lgbtq', en: 'LGBTQ+', es: 'LGBTQ+' },
      { id: 'trans', en: 'Trans / gender expansive', es: 'Trans / género expansivo' },
      { id: 'hispanic', en: 'Hispanic / Latino', es: 'Hispano / Latino' },
      { id: 'bipoc', en: 'Black / BIPOC', es: 'Negro / BIPOC' },
      { id: 'immigrant', en: 'Immigrant', es: 'Inmigrante' },
      { id: 'undocumented', en: 'Undocumented', es: 'Indocumentado' },
      { id: 'unhoused', en: 'Unhoused', es: 'Sin hogar' },
      { id: 'senior', en: 'Senior (60+)', es: 'Adulto mayor (60+)' },
      { id: 'youth', en: 'Youth (under 25)', es: 'Joven (menor de 25)' },
      { id: 'kids', en: 'For my kids', es: 'Para mis hijos' },
      { id: 'women', en: 'Women', es: 'Mujeres' },
      { id: 'returning-residents', en: 'Returning residents', es: 'Residentes que regresan' },
    ];

    const popButtons = populations.map(p => `
      <button class="wizard-pop-btn${wizardState.centered.includes(p.id) ? ' selected' : ''}" data-pop="${p.id}">
        ${state.lang === 'es' ? p.es : p.en}
      </button>
    `).join('');

    return `
      <div class="wizard-content">
        <h2>${state.lang === 'es' ? 'Acerca de ti' : 'About you'}</h2>
        <p class="wizard-hint">${state.lang === 'es'
          ? 'Opcional. Seleccionar estas opciones priorizará recursos centrados en estas comunidades.'
          : 'Optional. Selecting these will prioritize resources centered on serving these communities.'
        }</p>
        <div class="wizard-pop-grid">${popButtons}</div>
        <div class="wizard-nav">
          <button class="wizard-back btn-secondary" id="wizard-back-3">${state.lang === 'es' ? 'Atrás' : 'Back'}</button>
          <button class="wizard-skip btn-link" id="wizard-skip-3">${state.lang === 'es' ? 'Saltar' : 'Skip'}</button>
          <button class="wizard-next btn-primary" id="wizard-submit">${state.lang === 'es' ? 'Ver resultados' : 'See results'}</button>
        </div>
      </div>
    `;
  }
}

function bindWizardEvents(step) {
  if (step === 1) {
    document.querySelectorAll('.wizard-area-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        wizardState.area = btn.dataset.area;
        wizardState.locations = [];
        renderWizardStep(1);
      });
    });
    document.querySelectorAll('.wizard-nb-list input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) wizardState.locations.push(cb.value);
        else wizardState.locations = wizardState.locations.filter(l => l !== cb.value);
      });
    });
    document.getElementById('wizard-next-1')?.addEventListener('click', () => renderWizardStep(2));
  }

  if (step === 2) {
    document.querySelectorAll('.wizard-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.cat;
        if (wizardState.needs.includes(id)) {
          wizardState.needs = wizardState.needs.filter(n => n !== id);
          btn.classList.remove('selected');
        } else {
          wizardState.needs.push(id);
          btn.classList.add('selected');
        }
      });
    });
    document.getElementById('wizard-back-2').addEventListener('click', () => renderWizardStep(1));
    document.getElementById('wizard-skip-2').addEventListener('click', () => renderWizardStep(3));
    document.getElementById('wizard-next-2').addEventListener('click', () => renderWizardStep(3));
  }

  if (step === 3) {
    document.querySelectorAll('.wizard-pop-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.pop;
        if (wizardState.centered.includes(id)) {
          wizardState.centered = wizardState.centered.filter(p => p !== id);
          btn.classList.remove('selected');
        } else {
          wizardState.centered.push(id);
          btn.classList.add('selected');
        }
      });
    });
    document.getElementById('wizard-back-3').addEventListener('click', () => renderWizardStep(2));
    document.getElementById('wizard-skip-3').addEventListener('click', () => submitWizard());
    document.getElementById('wizard-submit').addEventListener('click', () => submitWizard());
  }
}

function submitWizard() {
  closeWizard();
  const locations = wizardState.area === 'all' ? [] : [
    ...(wizardState.area ? [wizardState.area] : []),
    ...wizardState.locations
  ];
  const newFilters = {
    ...state.filters,
    needs: wizardState.needs,
    services: [],
    locations,
    centered: wizardState.centered
  };
  state.filters = newFilters;
  window.location.hash = buildURL('/results', newFilters).slice(1);
}

function closeWizard() {
  const overlay = document.getElementById('wizard-overlay');
  if (overlay) overlay.remove();
}

// ─── Event Binding ────────────────────────────────────────────────────────────

function bindDirectoryEvents() {
  // Search
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', e => {
      clearTimeout(debounce);
      debounce = setTimeout(() => updateFilter('q', e.target.value), 300);
    });
  }

  // Sort
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', e => updateFilter('sort', e.target.value));
  }

  // Category buttons
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      const current = [...state.filters.needs];
      if (current.includes(cat)) {
        updateFilter('needs', current.filter(n => n !== cat));
      } else {
        updateFilter('needs', [...current, cat]);
      }
    });
  });

  // Clear needs
  document.getElementById('clear-needs')?.addEventListener('click', () => {
    updateFilter('needs', []);
  });

  // Area select
  const areaSelect = document.getElementById('area-select');
  if (areaSelect) {
    areaSelect.addEventListener('change', e => {
      const val = e.target.value;
      const current = state.filters.locations.filter(l => !Object.keys(state.neighborhoods).includes(l));
      updateFilter('locations', val ? [val, ...current] : current);
    });
  }

  // Neighborhood checkboxes
  document.querySelectorAll('.nb-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const current = [...state.filters.locations];
      if (cb.checked) {
        if (!current.includes(cb.value)) current.push(cb.value);
      } else {
        const idx = current.indexOf(cb.value);
        if (idx > -1) current.splice(idx, 1);
      }
      updateFilter('locations', current);
    });
  });

  // Population checkboxes
  document.querySelectorAll('.pop-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const current = [...state.filters.centered];
      if (cb.checked) {
        if (!current.includes(cb.value)) current.push(cb.value);
      } else {
        const idx = current.indexOf(cb.value);
        if (idx > -1) current.splice(idx, 1);
      }
      updateFilter('centered', current);
    });
  });

  // Reset all
  document.getElementById('reset-all')?.addEventListener('click', () => {
    state.filters = { needs: [], services: [], locations: [], centered: [], sort: 'relevance', q: '' };
    const parsed = parseURL();
    navigate(parsed.path, state.filters);
  });

  // Mobile filter button
  const mobileBtn = document.getElementById('mobile-filter-btn');
  const sidebar = document.getElementById('sidebar');
  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener('click', () => {
      const isOpen = sidebar.classList.toggle('open');
      mobileBtn.setAttribute('aria-expanded', isOpen);
      document.body.classList.toggle('sidebar-open', isOpen);
    });
  }
}

// ─── Language ─────────────────────────────────────────────────────────────────

function setLang(lang) {
  state.lang = lang;
  localStorage.setItem('chihelp-lang', lang);
  document.documentElement.lang = lang;
  const parsed = parseURL();
  navigate(parsed.path, { ...state.filters, lang });
}

function renderLangSwitcher() {
  const switcher = document.getElementById('lang-switcher');
  if (!switcher) return;
  switcher.innerHTML = `
    <button class="lang-btn${state.lang === 'en' ? ' active' : ''}" data-lang="en">EN</button>
    <button class="lang-btn${state.lang === 'es' ? ' active' : ''}" data-lang="es">ES</button>
  `;
  switcher.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
}

// ─── Router ───────────────────────────────────────────────────────────────────

function route() {
  const parsed = parseURL();
  state.lang = parsed.lang;
  state.filters = {
    needs: parsed.needs,
    services: parsed.services,
    locations: parsed.locations,
    centered: parsed.centered,
    sort: parsed.sort,
    q: parsed.q
  };

  const main = document.getElementById('main');
  const path = parsed.path;

  renderLangSwitcher();

  if (path === '/' || path === '') {
    renderHomepage();
    setTimeout(bindDirectoryEvents, 0);
  } else if (path === '/directory') {
    main.innerHTML = `<div class="directory-page">${renderDirectoryInner(false, null)}</div>`;
    setTimeout(bindDirectoryEvents, 0);
  } else if (path === '/results') {
    main.innerHTML = `<div class="results-page">${renderDirectoryInner(true, 5)}</div>`;
    setTimeout(bindDirectoryEvents, 0);
  } else if (path.startsWith('/org/')) {
    const id = path.slice(5);
    renderOrgPage(id);
  } else {
    main.innerHTML = `<div class="not-found"><p>Page not found.</p><a href="#/">Home</a></div>`;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  await loadData();
  route();
  window.addEventListener('hashchange', route);
}

init();
