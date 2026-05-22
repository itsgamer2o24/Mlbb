/**
 * ═══════════════════════════════════════════════════════
 * GitHub Database Layer
 * Stores/retrieves JSON data using GitHub Contents API
 * ═══════════════════════════════════════════════════════
 */

const GHDb = (() => {
  const API = 'https://api.github.com';

  function getRepo() {
    return sessionStorage.getItem('ghRepo') || GITHUB_REPO;
  }

  function getToken() {
    return sessionStorage.getItem('ghToken') || '';
  }

  function headers(write = false) {
    const h = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
    const tok = getToken();
    if (tok) h['Authorization'] = `token ${tok}`;
    return h;
  }

  // ── Internal: get file with SHA ──────────────────────
  async function getFile(path) {
    const url = `${API}/repos/${getRepo()}/contents/${path}?ref=${GITHUB_BRANCH}&t=${Date.now()}`;
    const res = await fetch(url, { headers: headers() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data = await res.json();
    const content = JSON.parse(atob(data.content.replace(/\n/g, '')));
    return { sha: data.sha, content };
  }

  // ── Internal: put file ───────────────────────────────
  async function putFile(path, content, sha) {
    const body = {
      message: `Update ${path}`,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
      branch: GITHUB_BRANCH
    };
    if (sha) body.sha = sha;

    const url = `${API}/repos/${getRepo()}/contents/${path}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: headers(true),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub write error: ${res.status}`);
    }
    return res.json();
  }

  // ── Public API ────────────────────────────────────────

  /**
   * Read a collection (array stored as JSON file)
   * @param {string} collection - e.g. 'tournaments', 'teams'
   */
  async function read(collection) {
    try {
      const file = await getFile(`${DATA_PATH}/${collection}.json`);
      if (!file) return [];
      return Array.isArray(file.content) ? file.content : (file.content.items || []);
    } catch (e) {
      console.warn(`GHDb.read(${collection}):`, e.message);
      return [];
    }
  }

  /**
   * Write entire collection back
   */
  async function write(collection, data) {
    const path = `${DATA_PATH}/${collection}.json`;
    const existing = await getFile(path);
    await putFile(path, data, existing ? existing.sha : undefined);
  }

  /**
   * Initialize the database with empty files if they don't exist
   */
  async function init() {
    const collections = ['tournaments', 'teams', 'matches', 'settings'];
    const defaults = {
      tournaments: [],
      teams: [],
      matches: [],
      settings: {
        siteTitle: 'MLBB Tournament Hub',
        season: 'Season 2025',
        bracketVisibility: 'hidden'
      }
    };

    for (const col of collections) {
      const path = `${DATA_PATH}/${col}.json`;
      const existing = await getFile(path);
      if (!existing) {
        await putFile(path, defaults[col], undefined);
        console.log(`GHDb: initialized ${col}.json`);
      }
    }
  }

  /**
   * Add item to collection
   */
  async function add(collection, item) {
    const items = await read(collection);
    item.id = item.id || generateId();
    item.createdAt = item.createdAt || new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    items.push(item);
    await write(collection, items);
    return item;
  }

  /**
   * Update item in collection by id
   */
  async function update(collection, id, changes) {
    const items = await read(collection);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error(`Item ${id} not found in ${collection}`);
    items[idx] = { ...items[idx], ...changes, updatedAt: new Date().toISOString() };
    await write(collection, items);
    return items[idx];
  }

  /**
   * Remove item from collection by id
   */
  async function remove(collection, id) {
    const items = await read(collection);
    const filtered = items.filter(i => i.id !== id);
    await write(collection, filtered);
  }

  /**
   * Get single item by id
   */
  async function get(collection, id) {
    const items = await read(collection);
    return items.find(i => i.id === id) || null;
  }

  /**
   * Read settings object
   */
  async function readSettings() {
    try {
      const file = await getFile(`${DATA_PATH}/settings.json`);
      return file ? file.content : {};
    } catch { return {}; }
  }

  /**
   * Write settings object
   */
  async function writeSettings(settings) {
    const path = `${DATA_PATH}/settings.json`;
    const existing = await getFile(path);
    await putFile(path, settings, existing ? existing.sha : undefined);
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  return { read, write, add, update, remove, get, init, readSettings, writeSettings, generateId };
})();

// ── Utility functions ────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getStatusLabel(status) {
  const labels = {
    upcoming: 'Upcoming',
    registration: 'Registration Open',
    ongoing: 'Ongoing',
    completed: 'Completed'
  };
  return labels[status] || status;
}

function getTournamentColor(status) {
  const colors = {
    ongoing: 'status-ongoing',
    registration: 'status-registration',
    upcoming: 'status-upcoming',
    completed: 'status-completed'
  };
  return colors[status] || 'status-upcoming';
}

function getFormatLabel(format) {
  const labels = {
    single_elimination: 'Single Elimination',
    double_elimination: 'Double Elimination',
    round_robin: 'Round Robin'
  };
  return labels[format] || format;
}

function showToast(message, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle' };
  t.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i> ${message}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ── Particle background ───────────────────────────────────
(function initParticles() {
  const bg = document.getElementById('particles-bg');
  if (!bg) return;
  // Simple CSS animation particles
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.style.cssText = `
      position:absolute;
      width:${Math.random() * 3 + 1}px;
      height:${Math.random() * 3 + 1}px;
      background:rgba(255,215,0,${Math.random() * 0.15 + 0.03});
      border-radius:50%;
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      animation: float ${Math.random() * 8 + 6}s ease-in-out ${Math.random() * 4}s infinite alternate;
    `;
    bg.appendChild(p);
  }
  const style = document.createElement('style');
  style.textContent = `@keyframes float {
    0% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
    100% { transform: translateY(-${20 + Math.random()*30}px) translateX(${(Math.random()-0.5)*20}px); opacity: 0.8; }
  }`;
  document.head.appendChild(style);
})();

// ── Nav toggle ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('navToggle');
  const mobileNav = document.getElementById('mobileNav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => mobileNav.classList.toggle('open'));
  }

  // Modal close buttons
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.modal;
      document.getElementById(id)?.classList.remove('open');
    });
  });

  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
});
