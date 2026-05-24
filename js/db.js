// ============================================
// GitHub Database Layer — Fixed & Bulletproof
// ============================================

var DB = {

  _repo: function() {
    return (sessionStorage.getItem('repo') || (typeof GITHUB_REPO !== 'undefined' ? GITHUB_REPO : '')).trim();
  },
  _token: function() {
    return (sessionStorage.getItem('token') || '').trim();
  },
  _branch: function() {
    return (typeof GITHUB_BRANCH !== 'undefined' ? GITHUB_BRANCH : 'main') || 'main';
  },
  _path: function() {
    return (typeof DATA_PATH !== 'undefined' ? DATA_PATH : 'data') || 'data';
  },

  // ── Validate before any write ──────────────
  _validate: function() {
    var repo  = this._repo();
    var token = this._token();
    if (!repo || repo === 'YOUR_GITHUB_USERNAME/YOUR_REPO_NAME') {
      throw new Error('GitHub repo not set. Go to Admin → Settings and set your repo.');
    }
    if (!repo.includes('/')) {
      throw new Error('Repo format wrong. Should be "username/reponame" e.g. "itsgamer2o24/Mlbb"');
    }
    if (!token) {
      throw new Error('No GitHub token. Please logout and login again with your token.');
    }
    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      throw new Error('Token looks invalid. Should start with ghp_ — please logout and re-enter it.');
    }
    return true;
  },

  // ── READ via raw.githubusercontent.com ─────
  read: function(collection) {
    var repo   = this._repo();
    var branch = this._branch();
    var path   = this._path();
    if (!repo || !repo.includes('/')) return Promise.resolve([]);
    var url = 'https://raw.githubusercontent.com/' + repo + '/' + branch + '/' + path + '/' + collection + '.json?_=' + Date.now();
    return fetch(url)
      .then(function(r) {
        if (r.status === 404) return [];
        if (!r.ok) return [];
        return r.json().catch(function() { return []; });
      })
      .catch(function() { return []; });
  },

  // ── WRITE via GitHub Contents API ──────────
  write: function(collection, data) {
    try { this._validate(); } catch(e) { return Promise.reject(e); }

    var repo   = this._repo();
    var token  = this._token();
    var branch = this._branch();
    var path   = this._path() + '/' + collection + '.json';
    var apiUrl = 'https://api.github.com/repos/' + repo + '/contents/' + path;
    var hdrs   = {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    };

    // Step 1: get current SHA
    return fetch(apiUrl + '?ref=' + branch, { headers: hdrs })
      .then(function(r) {
        if (r.status === 401) throw new Error('Bad credentials — your GitHub token is wrong or expired. Logout and login with a new token from github.com/settings/tokens');
        if (r.status === 403) throw new Error('Token has no write permission. Make sure "repo" scope is checked when creating your token.');
        if (r.status === 404) return { sha: null };
        if (!r.ok) throw new Error('GitHub API error: ' + r.status);
        return r.json();
      })
      .then(function(info) {
        var json    = JSON.stringify(data, null, 2);
        var content = btoa(unescape(encodeURIComponent(json)));
        var body    = { message: 'Update ' + collection, content: content, branch: branch };
        if (info && info.sha) body.sha = info.sha;

        return fetch(apiUrl, { method: 'PUT', headers: hdrs, body: JSON.stringify(body) });
      })
      .then(function(r) {
        if (r.status === 401) throw new Error('Bad credentials — token rejected. Get a new token at github.com/settings/tokens (needs "repo" scope).');
        if (r.status === 403) throw new Error('Permission denied. Your token needs "repo" scope (full control of private repos).');
        if (r.status === 409) throw new Error('Conflict: file was changed by someone else. Please refresh and try again.');
        if (r.status === 422) throw new Error('Validation error from GitHub. Check that your repo name is correct.');
        if (!r.ok) return r.json().then(function(e) { throw new Error(e.message || 'Write failed: ' + r.status); });
        return r.json();
      });
  },

  // ── Settings ────────────────────────────────
  readSettings: function() {
    var repo   = this._repo();
    var branch = this._branch();
    var path   = this._path();
    if (!repo || !repo.includes('/')) return Promise.resolve({});
    var url = 'https://raw.githubusercontent.com/' + repo + '/' + branch + '/' + path + '/settings.json?_=' + Date.now();
    return fetch(url)
      .then(function(r) { return r.ok ? r.json().catch(function(){ return {}; }) : {}; })
      .catch(function() { return {}; });
  },
  writeSettings: function(obj) { return this.write('settings', obj); },

  // ── CRUD ─────────────────────────────────────
  add: function(col, item) {
    var self = this;
    return self.read(col).then(function(arr) {
      item.id        = item.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
      item.createdAt = new Date().toISOString();
      arr.push(item);
      return self.write(col, arr).then(function() { return item; });
    });
  },

  update: function(col, id, changes) {
    var self = this;
    return self.read(col).then(function(arr) {
      var i = arr.findIndex(function(x) { return x.id === id; });
      if (i < 0) throw new Error('Item not found: ' + id);
      arr[i] = Object.assign({}, arr[i], changes, { updatedAt: new Date().toISOString() });
      return self.write(col, arr).then(function() { return arr[i]; });
    });
  },

  remove: function(col, id) {
    var self = this;
    return self.read(col).then(function(arr) {
      return self.write(col, arr.filter(function(x) { return x.id !== id; }));
    });
  },

  get: function(col, id) {
    return this.read(col).then(function(arr) {
      return arr.find(function(x) { return x.id === id; }) || null;
    });
  }
};

// ── Shared Utilities ──────────────────────────

function fmtDate(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' }); }
  catch(e) { return s; }
}
function fmtDateTime(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('en-PH', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }); }
  catch(e) { return s; }
}
function stLbl(s) {
  return { upcoming:'Upcoming', registration:'Registration Open', ongoing:'Ongoing', completed:'Completed' }[s] || s || '?';
}
function stCls(s) {
  return { ongoing:'st-ongoing', registration:'st-registration', upcoming:'st-upcoming', completed:'st-completed' }[s] || 'st-upcoming';
}
function fmtLbl(f) {
  return { single_elimination:'Single Elimination', double_elimination:'Double Elimination', round_robin:'Round Robin' }[f] || f || '?';
}
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function qp(name) {
  return new URLSearchParams(window.location.search).get(name);
}
function toast(msg, type) {
  document.querySelectorAll('.toast').forEach(function(t){ t.remove(); });
  var el = document.createElement('div');
  el.className = 'toast toast-' + (type || 'ok');
  el.innerHTML = '<i class="fas fa-' + (type==='err'?'exclamation-circle':type==='info'?'info-circle':'check-circle') + '"></i> ' + msg;
  el.style.cssText = 'position:fixed;bottom:22px;right:22px;z-index:9999;padding:12px 18px;border-radius:5px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:9px;max-width:380px;line-height:1.4;animation:tIn .25s both;box-shadow:0 6px 24px rgba(0,0,0,.6)';
  if (type === 'err') el.style.cssText += ';background:#2a0a0a;border:1px solid rgba(255,59,48,.4);color:#ff8a80';
  else if (type === 'info') el.style.cssText += ';background:#0a1a2e;border:1px solid rgba(0,212,255,.35);color:#00D4FF';
  else el.style.cssText += ';background:#0a2e14;border:1px solid rgba(0,255,135,.4);color:#00FF87';
  document.body.appendChild(el);
  setTimeout(function() { if(el.parentNode) el.remove(); }, 6000);
}
