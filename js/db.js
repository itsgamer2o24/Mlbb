// ========================================
// GitHub Database - Read/Write JSON files
// ========================================

var DB = {
  // Read JSON from raw GitHub (public, no auth needed)
  read: function(collection) {
    var repo   = sessionStorage.getItem('repo') || GITHUB_REPO;
    var branch = GITHUB_BRANCH || 'main';
    var url    = 'https://raw.githubusercontent.com/' + repo + '/' + branch + '/' + DATA_PATH + '/' + collection + '.json?_=' + Date.now();
    return fetch(url)
      .then(function(r) {
        if (!r.ok) return [];
        return r.json().catch(function() { return []; });
      })
      .catch(function() { return []; });
  },

  // Write JSON via GitHub API (needs token)
  write: function(collection, data) {
    var repo   = sessionStorage.getItem('repo') || GITHUB_REPO;
    var token  = sessionStorage.getItem('token') || '';
    var branch = GITHUB_BRANCH || 'main';
    var path   = DATA_PATH + '/' + collection + '.json';
    var apiUrl = 'https://api.github.com/repos/' + repo + '/contents/' + path;

    // Get current SHA first
    return fetch(apiUrl + '?ref=' + branch, {
      headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json' }
    })
    .then(function(r) { return r.ok ? r.json() : { sha: null }; })
    .then(function(info) {
      var content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
      var body = { message: 'Update ' + collection, content: content, branch: branch };
      if (info.sha) body.sha = info.sha;
      return fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': 'token ' + token,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    })
    .then(function(r) {
      if (!r.ok) return r.json().then(function(e) { throw new Error(e.message || 'Write failed ' + r.status); });
      return r.json();
    });
  },

  // Read settings object
  readSettings: function() {
    var repo   = sessionStorage.getItem('repo') || GITHUB_REPO;
    var branch = GITHUB_BRANCH || 'main';
    var url    = 'https://raw.githubusercontent.com/' + repo + '/' + branch + '/' + DATA_PATH + '/settings.json?_=' + Date.now();
    return fetch(url).then(function(r) { return r.ok ? r.json() : {}; }).catch(function() { return {}; });
  },

  writeSettings: function(obj) { return this.write('settings', obj); },

  // CRUD helpers
  add: function(col, item) {
    return this.read(col).then(function(arr) {
      item.id = item.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
      item.createdAt = new Date().toISOString();
      arr.push(item);
      return DB.write(col, arr).then(function() { return item; });
    });
  },
  update: function(col, id, changes) {
    return this.read(col).then(function(arr) {
      var i = arr.findIndex(function(x) { return x.id === id; });
      if (i < 0) throw new Error('Not found: ' + id);
      arr[i] = Object.assign({}, arr[i], changes, { updatedAt: new Date().toISOString() });
      return DB.write(col, arr).then(function() { return arr[i]; });
    });
  },
  remove: function(col, id) {
    return this.read(col).then(function(arr) {
      return DB.write(col, arr.filter(function(x) { return x.id !== id; }));
    });
  },
  get: function(col, id) {
    return this.read(col).then(function(arr) {
      return arr.find(function(x) { return x.id === id; }) || null;
    });
  }
};

// ── Shared utilities ──────────────────────────────────────

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
function statusLabel(s) {
  return { upcoming:'Upcoming', registration:'Registration Open', ongoing:'Ongoing', completed:'Completed' }[s] || s || '?';
}
function statusClass(s) {
  return { ongoing:'status-ongoing', registration:'status-registration', upcoming:'status-upcoming', completed:'status-completed' }[s] || 'status-upcoming';
}
function formatLabel(f) {
  return { single_elimination:'Single Elimination', double_elimination:'Double Elimination', round_robin:'Round Robin' }[f] || f || '?';
}
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function qp(name) {
  return new URLSearchParams(window.location.search).get(name);
}
function toast(msg, type) {
  var el = document.createElement('div');
  el.className = 'toast toast-' + (type || 'ok');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function() { el.remove(); }, 4000);
}
function spin(id) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = '<div class="spinner"></div>';
}
function empty(id, msg) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = '<p class="empty">' + (msg || 'Nothing here yet.') + '</p>';
}
