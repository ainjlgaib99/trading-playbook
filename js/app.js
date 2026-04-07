/* ═══════════════════════════════════════════════
   EDGE Trading Playbook — App Logic
   Navigation · Settings · Search
   ═══════════════════════════════════════════════ */

/* ══ NAVIGATION ══ */

const SECTIONS = [
  'routine','levels','entry','manage',
  'stayout','eval','mistakes','risk',
  'timeline','journal'
];

function showSection(id) {
  // Exit search mode
  if (document.body.classList.contains('search-mode')) {
    clearSearch();
    searchInput.value = '';
  }

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  const section = document.getElementById('s-' + id);
  const navItem = document.querySelector(`[data-section="${id}"]`);

  if (section) section.classList.add('active');
  if (navItem) navItem.classList.add('active');

  // Scroll content to top
  document.querySelector('.content').scrollTo({ top: 0, behavior: 'instant' });

  // Close mobile sidebar
  closeMobileSidebar();
}

/* ══ MOBILE SIDEBAR ══ */

const sidebar  = document.querySelector('.sidebar');
const backdrop = document.querySelector('.sidebar-backdrop');
const hamburger = document.querySelector('.hamburger');

function openMobileSidebar() {
  sidebar.classList.add('open');
  backdrop.classList.add('visible');
  backdrop.style.pointerEvents = 'all';
}

function closeMobileSidebar() {
  sidebar.classList.remove('open');
  backdrop.classList.remove('visible');
  backdrop.style.pointerEvents = 'none';
}

hamburger.addEventListener('click', openMobileSidebar);
backdrop.addEventListener('click', closeMobileSidebar);

/* ══ SETTINGS ══ */

const ACCENT_PRESETS = [
  '#7c5cfc',  // violet (default)
  '#c8ff00',  // lime
  '#14b8a6',  // teal
  '#f43f5e',  // rose
  '#f97316',  // orange
  '#38bdf8',  // sky
];

const SETTINGS_KEY = 'edge-playbook-settings';

const DEFAULTS = {
  accent:   '#7c5cfc',
  fontSize: 'medium',
  spacing:  'comfortable',
};

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function applySettings(s) {
  const root = document.documentElement;
  const { r, g, b } = hexToRgb(s.accent);

  root.style.setProperty('--accent',      s.accent);
  root.style.setProperty('--accent-dim',  `rgba(${r},${g},${b},0.12)`);
  root.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.28)`);

  root.dataset.fontSize = s.fontSize;
  root.dataset.spacing  = s.spacing;

  // Sync swatch UI
  document.querySelectorAll('.swatch[data-color]').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.color === s.accent);
  });

  // Sync toggle UIs
  document.querySelectorAll('[data-font-opt]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.fontOpt === s.fontSize);
  });
  document.querySelectorAll('[data-spacing-opt]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.spacingOpt === s.spacing);
  });
}

let settings = loadSettings();

// Open / close settings panel
const settingsPanel   = document.querySelector('.settings-panel');
const settingsOverlay = document.querySelector('.settings-overlay');
const settingsClose   = document.querySelector('.settings-close');
const settingsBtn     = document.querySelector('.settings-btn');

function openSettings() {
  settingsPanel.classList.add('open');
  settingsOverlay.classList.add('open');
}

function closeSettings() {
  settingsPanel.classList.remove('open');
  settingsOverlay.classList.remove('open');
}

settingsBtn.addEventListener('click', openSettings);
settingsClose.addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', closeSettings);

// Color swatches
document.querySelectorAll('.swatch[data-color]').forEach(sw => {
  sw.addEventListener('click', () => {
    settings.accent = sw.dataset.color;
    saveSettings(settings);
    applySettings(settings);
  });
});

// Custom color picker
const customColorInput = document.querySelector('.custom-color-input');
if (customColorInput) {
  customColorInput.addEventListener('input', e => {
    settings.accent = e.target.value;
    saveSettings(settings);
    applySettings(settings);
  });
}

// Font size toggles
document.querySelectorAll('[data-font-opt]').forEach(btn => {
  btn.addEventListener('click', () => {
    settings.fontSize = btn.dataset.fontOpt;
    saveSettings(settings);
    applySettings(settings);
  });
});

// Spacing toggles
document.querySelectorAll('[data-spacing-opt]').forEach(btn => {
  btn.addEventListener('click', () => {
    settings.spacing = btn.dataset.spacingOpt;
    saveSettings(settings);
    applySettings(settings);
  });
});

/* ══ SEARCH ══ */

const searchInput = document.querySelector('.search-input');
const searchClear = document.querySelector('.search-clear');
const searchMeta  = document.querySelector('.search-meta');
const contentEl   = document.querySelector('.content');

// Cache original HTML before any mutations
const originalHTML = {};
document.querySelectorAll('.section').forEach(s => {
  originalHTML[s.id] = s.innerHTML;
});

function escapeRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightTextNodes(node, re) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (!re.test(node.textContent)) return;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m;
    re.lastIndex = 0;
    const txt = node.textContent;
    while ((m = re.exec(txt)) !== null) {
      if (m.index > last) {
        frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
      }
      const mark = document.createElement('mark');
      mark.textContent = m[0];
      frag.appendChild(mark);
      last = re.lastIndex;
    }
    if (last < txt.length) {
      frag.appendChild(document.createTextNode(txt.slice(last)));
    }
    node.parentNode.replaceChild(frag, node);
  } else if (
    node.nodeType === Node.ELEMENT_NODE &&
    node.tagName !== 'SCRIPT' &&
    node.tagName !== 'STYLE' &&
    node.tagName !== 'MARK'
  ) {
    Array.from(node.childNodes).forEach(child => highlightTextNodes(child, re));
  }
}

function restoreOriginals() {
  document.querySelectorAll('.section').forEach(s => {
    s.innerHTML = originalHTML[s.id];
    s.classList.remove('no-match');
  });
}

function clearSearch() {
  restoreOriginals();
  document.body.classList.remove('search-mode');
  searchMeta.textContent = '';
  searchClear.classList.remove('visible');

  // Restore original nav state
  const activeSection = document.querySelector('.nav-item.active')?.dataset.section || 'routine';
  showSection(activeSection);
}

function doSearch(query) {
  const q = query.trim();
  if (!q) {
    clearSearch();
    return;
  }

  restoreOriginals();

  const re = new RegExp(escapeRe(q), 'gi');
  let totalMatches = 0;
  let matchingSections = 0;

  document.querySelectorAll('.section').forEach(s => {
    const count = (s.textContent.match(re) || []).length;
    if (count > 0) {
      s.classList.remove('no-match');
      s.classList.add('active');
      matchingSections++;
      totalMatches += count;
      re.lastIndex = 0;
      highlightTextNodes(s, re);
    } else {
      s.classList.remove('active');
      s.classList.add('no-match');
    }
    re.lastIndex = 0;
  });

  document.body.classList.add('search-mode');
  searchClear.classList.add('visible');
  searchMeta.textContent = totalMatches > 0
    ? `${totalMatches} match${totalMatches !== 1 ? 'es' : ''}`
    : 'no matches';

  contentEl.scrollTo({ top: 0, behavior: 'instant' });
}

let searchTimer;
searchInput.addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => doSearch(e.target.value), 120);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  const activeSection = document.querySelector('.nav-item.active')?.dataset.section || 'routine';
  clearSearch();
  showSection(activeSection);
});

// Keyboard shortcut: / to focus search
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
  if (e.key === 'Escape') {
    if (settingsPanel.classList.contains('open')) closeSettings();
    else if (document.body.classList.contains('search-mode')) {
      searchInput.value = '';
      const active = document.querySelector('.nav-item.active')?.dataset.section || 'routine';
      clearSearch();
      showSection(active);
    }
  }
});

/* ══ INIT ══ */
applySettings(settings);
showSection('routine');
