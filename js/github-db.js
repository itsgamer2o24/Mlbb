/**
 * GitHub Database Layer — Fixed Version
 * Reads JSON from GitHub raw URL (public, no auth needed)
 * Writes via GitHub Contents API (needs token, admin only)
 */

const GHDb = (() => {
  const API = 'https://api.github.com';

  function getRepo() {
    const r = sessionStorage.getItem('ghRepo') || GITHUB_REPO;
    return r.trim();
  }

  function getBranch() {
    return GITHUB_BRANCH || 'main';
  }

  function getToken() {
    return sessionStorage.getItem('ghToken') || '';
  }

  function isConfigured() {
    const r = getRepo();
    return r && r !== 'YOUR_GITHUB_USERNAME/YOUR_REPO_NAME' && r.includes('/');
  }

  // ── READ: use raw.githubusercontent.com (no auth, no CORS issues) ──
  async function readRaw(collection) {
    if (!isConfigured()) return [];
    const [owner, repo] = getRepo().split('/');
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${getBranch()}/data/${collection}.json?t=${Date.now()}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn(`GHDb.read(${collection}):`, e.message);
      return [];
    }
  }

  // ── GET FILE SHA for writes ──
  async function getFileSha(path) {
    const tok = getToken();
    if (!tok) throw new Error('No GitHub token. Please login as admin.');
    const url = `${API}/repos/${getRepo()}/contents/${path}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${tok}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json();
    return data.sha || null;
  }

  // ── WRITE via Contents API ──
  async function putFile(path, content) {
    const tok = getToken();
    if (!tok) throw new Error('No GitHub token. Please login as admin.');
    const sha = await getFileSha(path);
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));
    const body = { message: `Update ${path}`, content: encoded, branch: getBranch() };
    if (sha) body.sha = sha;
    const res = await fetch(`${API}/repos/${getRepo()}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${tok}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub write error ${res.status}`);
    }
    return res.json();
  }

  // ── PUBLIC API ──

  async function read(collection) {
    return readRaw(collection);
  }

  async function write(collection, data) {
    await putFile(`data/${collection}.json`, data);
  }

  async function add(collection, item) {
    const items = await read(collection);
    item.id = item.id || generateId();
    item.createdAt = item.createdAt || new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    items.push(item);
    await write(collection, items);
    return item;
  }

  async function update(collection, id, changes) {
    const items = await read(collection);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error(`Item ${id} not found in ${collection}`);
    items[idx] = { ...items[idx], ...changes, updatedAt: new Date().toISOString() };
    await write(collection, items);
    return items[idx];
  }

  async function remove(collection, id) {
    const items = await read(collection);
    await write(collection, items.filter(i => i.id !== id));
  }

  async function get(collection, id) {
    const items = await read(collection);
    return items.find(i => i.id === id) || null;
  }

  async function readSettings() {
    if (!isConfigured()) return { siteTitle: 'MLBB Tournament Hub', season: 'Season 2025', bracketVisibility: 'hidden' };
    const [owner, repo] = getRepo().split('/');
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${getBranch()}/data/settings.json?t=${Date.now()}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return {};
      return res.json();
    } catch { return {}; }
  }

  async function writeSettings(settings) {
    await putFile('data/settings.json', settings);
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }

  return { read, write, add, update, remove, get, readSettings, writeSettings, generateId, isConfigured };
})();

// ── Helpers ──────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
  } catch { return dateStr; }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-PH', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch { return dateStr; }
}

function getStatusLabel(status) {
  return { upcoming:'Upcoming', registration:'Registration Open', ongoing:'Ongoing', completed:'Completed' }[status] || (status || 'Unknown');
}

function getTournamentColor(status) {
  return { ongoing:'status-ongoing', registration:'status-registration', upcoming:'status-upcoming', completed:'status-completed' }[status] || 'status-upcoming';
}

function getFormatLabel(format) {
  return { single_elimination:'Single Elimination', double_elimination:'Double Elimination', round_robin:'Round Robin' }[format] || (format || '—');
}

function showToast(message, type = 'success') {
  // Remove old toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success:'check-circle', error:'exclamation-circle', info:'info-circle' };
  t.innerHTML = `<i class="fas fa-${icons[type]||'info-circle'}"></i> ${message}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Particles ─────────────────────────────────────────────
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const bg = document.getElementById('particles-bg');
    if (!bg) return;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes floatUp { 0%{transform:translateY(0) scale(1);opacity:0.4} 100%{transform:translateY(-60px) scale(1.2);opacity:0} }
      .particle { position:absolute; border-radius:50%; animation:floatUp linear infinite; pointer-events:none; }
    `;
    document.head.appendChild(style);
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div');
      const size = Math.random() * 3 + 1;
      p.className = 'particle';
      p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;top:${Math.random()*100}%;background:rgba(255,215,0,${Math.random()*0.2+0.05});animation-duration:${Math.random()*10+8}s;animation-delay:${Math.random()*8}s;`;
      bg.appendChild(p);
    }
  });
})();

// ── Nav mobile toggle ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('navToggle');
  const mobileNav = document.getElementById('mobileNav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => mobileNav.classList.toggle('open'));
  }
  // Modal close
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.modal)?.classList.remove('open');
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
});

// ── Not-configured warning (public pages only) ────────────
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('/admin/')) return;
  if (!GHDb.isConfigured()) {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#b71c1c;color:#fff;text-align:center;padding:12px;font-size:14px;font-weight:600';
    banner.innerHTML = '⚠️ Site not configured yet. Open <code>js/config.js</code> and set your GitHub repo name.';
    document.body.appendChild(banner);
  }
});
