/**
 * Admin Dashboard — Fully Fixed
 */

// Auth guard
if (!sessionStorage.getItem('adminAuth')) {
  window.location.href = 'login.html';
}

var db = { tournaments: [], teams: [], matches: [] };
var confirmCb = null;

// ── Init ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function() {
  setupSidebar();
  setupLogout();
  setupModals();
  setupForms();
  loadAll(function() { switchSection('overview'); });
});

function loadAll(cb) {
  Promise.all([
    GHDb.read('tournaments'),
    GHDb.read('teams'),
    GHDb.read('matches')
  ]).then(function(results) {
    db.tournaments = results[0];
    db.teams = results[1];
    db.matches = results[2];
    if (cb) cb();
  }).catch(function(e) {
    showToast('Load error: ' + e.message, 'error');
    if (cb) cb();
  });
}

// ── Sidebar ───────────────────────────────────────────────
function setupSidebar() {
  document.querySelectorAll('.sidebar-link[data-section]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      switchSection(link.getAttribute('data-section'));
    });
  });
  var tog = document.getElementById('sidebarToggle');
  if (tog) tog.addEventListener('click', function() {
    document.getElementById('adminSidebar').classList.toggle('open');
  });
}

function switchSection(name) {
  document.querySelectorAll('.sidebar-link').forEach(function(l) { l.classList.remove('active'); });
  var activeLink = document.querySelector('[data-section="' + name + '"]');
  if (activeLink) activeLink.classList.add('active');
  document.querySelectorAll('.admin-section').forEach(function(s) { s.classList.remove('active'); });
  var sec = document.getElementById('section-' + name);
  if (sec) sec.classList.add('active');
  var title = document.getElementById('topbarTitle');
  if (title) title.textContent = name.charAt(0).toUpperCase() + name.slice(1);
  var fn = { overview: loadOverview, tournaments: loadTournamentsSection, teams: loadTeamsSection, matches: loadMatchesSection, brackets: loadBracketsSection, settings: loadSettingsSection };
  if (fn[name]) fn[name]();
}

function setupLogout() {
  var btn = document.getElementById('logoutBtn');
  if (btn) btn.addEventListener('click', function(e) {
    e.preventDefault();
    sessionStorage.clear();
    window.location.href = 'login.html';
  });
}

// ── Modals ────────────────────────────────────────────────
function setupModals() {
  // Close buttons
  document.querySelectorAll('.modal-close, [data-modal]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = btn.getAttribute('data-modal') || btn.closest('.modal-overlay')?.id;
      if (id) closeModal(id);
    });
  });
  // Overlay click
  document.querySelectorAll('.modal-overlay').forEach(function(ov) {
    ov.addEventListener('click', function(e) {
      if (e.target === ov) closeModal(ov.id);
    });
  });
  // Confirm yes
  var confirmYes = document.getElementById('confirmYesBtn');
  if (confirmYes) confirmYes.addEventListener('click', function() {
    closeModal('confirmModal');
    if (confirmCb) { confirmCb(); confirmCb = null; }
  });
}

function openModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// ── Forms ─────────────────────────────────────────────────
function setupForms() {
  // Tournament form
  var tForm = document.getElementById('tournamentForm');
  if (tForm) tForm.addEventListener('submit', function(e) {
    e.preventDefault();
    saveTournament();
  });

  // Team form
  var teamForm = document.getElementById('teamForm');
  if (teamForm) teamForm.addEventListener('submit', function(e) {
    e.preventDefault();
    saveTeam();
  });

  // Match form
  var matchForm = document.getElementById('matchForm');
  if (matchForm) matchForm.addEventListener('submit', function(e) {
    e.preventDefault();
    saveMatch();
  });

  // Settings form
  var setForm = document.getElementById('settingsForm');
  if (setForm) setForm.addEventListener('submit', function(e) {
    e.preventDefault();
    saveSettings();
  });

  // New tournament button
  var btnNew = document.getElementById('btnNewTournament');
  if (btnNew) btnNew.addEventListener('click', function() { openTournamentModal(); });

  // New team button
  var btnTeam = document.getElementById('btnNewTeam');
  if (btnTeam) btnTeam.addEventListener('click', function() { openTeamModal(); });

  // Generate bracket button
  var btnBracket = document.getElementById('btnGenerateBracket');
  if (btnBracket) btnBracket.addEventListener('click', function() { generateBracket(); });
}

// ══════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════
function loadOverview() {
  setText('ovTournaments', db.tournaments.length);
  setText('ovTeams', db.teams.length);
  setText('ovMatches', db.matches.length);
  setText('ovCompleted', db.tournaments.filter(function(t){ return t.status==='completed'; }).length);

  var acts = [];
  db.tournaments.slice(-5).reverse().forEach(function(t) {
    acts.push({ icon:'fas fa-gamepad', color:'#f7b731', text:'Tournament <strong>' + esc(t.name) + '</strong> created', time: t.createdAt });
  });
  db.teams.slice(-5).reverse().forEach(function(t) {
    acts.push({ icon:'fas fa-users', color:'#6c5ce7', text:'Team <strong>' + esc(t.name) + '</strong> added', time: t.createdAt });
  });
  acts.sort(function(a,b){ return new Date(b.time) - new Date(a.time); });

  var el = document.getElementById('recentActivity');
  if (!el) return;
  if (!acts.length) { el.innerHTML = '<p class="empty-state" style="padding:20px">No activity yet. Create a tournament!</p>'; return; }
  el.innerHTML = acts.slice(0,8).map(function(a) {
    return '<div class="activity-item"><div class="activity-icon" style="background:' + a.color + '22;color:' + a.color + '"><i class="' + a.icon + '"></i></div><div class="activity-text">' + a.text + '</div><div class="activity-time">' + formatDate(a.time) + '</div></div>';
  }).join('');
}

function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ══════════════════════════════════════
// TOURNAMENTS
// ══════════════════════════════════════
function loadTournamentsSection() {
  var c = document.getElementById('adminTournamentsList');
  if (!c) return;

  if (!db.tournaments.length) {
    c.innerHTML = '<p class="empty-state">No tournaments yet. Click "New Tournament" to create one!</p>';
    return;
  }

  var rows = db.tournaments.slice().reverse().map(function(t) {
    var tc = db.teams.filter(function(tm){ return tm.tournamentId === t.id; }).length;
    return '<tr>' +
      '<td><strong>' + esc(t.name) + '</strong>' + (t.prize ? '<br><small style="color:var(--gold)">' + esc(t.prize) + '</small>' : '') + '</td>' +
      '<td>' + getFormatLabel(t.format) + '</td>' +
      '<td><span class="tc-status-badge ' + getTournamentColor(t.status) + '" style="font-size:10px">' + getStatusLabel(t.status) + '</span></td>' +
      '<td>' + tc + ' / ' + (t.maxTeams||'?') + '</td>' +
      '<td style="font-size:12px">' + formatDate(t.startDate) + '</td>' +
      '<td style="text-align:center">' + (t.bracketPublic ? '✅' : '🔒') + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon" title="Edit" onclick="openTournamentModal(\'' + t.id + '\')"><i class="fas fa-edit"></i></button>' +
        '<button class="btn-icon" title="View" onclick="window.open(\'../tournament.html?id=' + t.id + '\',\'_blank\')"><i class="fas fa-eye"></i></button>' +
        '<button class="btn-icon danger" title="Delete" onclick="deleteTournament(\'' + t.id + '\')"><i class="fas fa-trash"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join('');

  c.innerHTML = '<table class="admin-table"><thead><tr><th>Name</th><th>Format</th><th>Status</th><th>Teams</th><th>Date</th><th>Bracket</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function openTournamentModal(id) {
  var t = id ? db.tournaments.find(function(x){ return x.id === id; }) : null;
  setText('tournamentModalTitle', t ? 'Edit Tournament' : 'New Tournament');
  setVal('tId', t ? t.id : '');
  setVal('tName', t ? t.name : '');
  setVal('tFormat', t ? t.format : 'single_elimination');
  setVal('tStartDate', t ? (t.startDate||'') : '');
  setVal('tEndDate', t ? (t.endDate||'') : '');
  setVal('tMaxTeams', t ? (t.maxTeams||8) : 8);
  setVal('tPrize', t ? (t.prize||'') : '');
  setVal('tStatus', t ? t.status : 'upcoming');
  setVal('tDescription', t ? (t.description||'') : '');
  var cb = document.getElementById('tBracketPublic');
  if (cb) cb.checked = t ? (t.bracketPublic||false) : false;
  openModal('tournamentModal');
}

function saveTournament() {
  var id = getVal('tId');
  var data = {
    name: getVal('tName'),
    format: getVal('tFormat'),
    startDate: getVal('tStartDate'),
    endDate: getVal('tEndDate'),
    maxTeams: parseInt(getVal('tMaxTeams')) || 8,
    prize: getVal('tPrize'),
    status: getVal('tStatus'),
    description: getVal('tDescription'),
    bracketPublic: document.getElementById('tBracketPublic') ? document.getElementById('tBracketPublic').checked : false
  };

  if (!data.name) { showToast('Tournament name is required.', 'error'); return; }

  var btn = document.querySelector('#tournamentForm [type=submit]');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  var op = id ? GHDb.update('tournaments', id, data) : GHDb.add('tournaments', data);
  op.then(function() {
    showToast(id ? 'Tournament updated!' : 'Tournament created!');
    closeModal('tournamentModal');
    loadAll(function() { loadTournamentsSection(); loadOverview(); });
  }).catch(function(err) {
    showToast('Error: ' + err.message, 'error');
  }).finally(function() {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Tournament'; }
  });
}

function deleteTournament(id) {
  var t = db.tournaments.find(function(x){ return x.id===id; });
  showConfirm('Delete "' + (t ? t.name : 'this tournament') + '"? All teams and matches will also be deleted.', function() {
    var delOps = [GHDb.remove('tournaments', id)];
    db.teams.filter(function(tm){ return tm.tournamentId===id; }).forEach(function(tm){ delOps.push(GHDb.remove('teams', tm.id)); });
    db.matches.filter(function(m){ return m.tournamentId===id; }).forEach(function(m){ delOps.push(GHDb.remove('matches', m.id)); });
    Promise.all(delOps).then(function() {
      showToast('Tournament deleted.');
      loadAll(function() { loadTournamentsSection(); loadOverview(); });
    }).catch(function(e){ showToast('Error: '+e.message,'error'); });
  });
}

// ══════════════════════════════════════
// TEAMS
// ══════════════════════════════════════
function loadTeamsSection() {
  populateTournamentSelect('teamsFilterTournament', true);
  var sel = document.getElementById('teamsFilterTournament');
  if (sel) sel.onchange = renderTeamsTable;
  renderTeamsTable();
}

function renderTeamsTable() {
  var c = document.getElementById('adminTeamsList');
  if (!c) return;
  var fid = getVal('teamsFilterTournament');
  var teams = fid ? db.teams.filter(function(t){ return t.tournamentId===fid; }) : db.teams;

  if (!teams.length) { c.innerHTML = '<p class="empty-state">No teams found. Add one!</p>'; return; }

  var rows = teams.map(function(t) {
    var tour = db.tournaments.find(function(x){ return x.id===t.tournamentId; });
    return '<tr>' +
      '<td><strong>' + esc(t.name) + '</strong></td>' +
      '<td><span style="font-family:var(--font-deco);font-size:12px;color:var(--gold)">' + esc(t.tag||'—') + '</span></td>' +
      '<td>' + (tour ? esc(tour.name) : '—') + '</td>' +
      '<td style="font-size:12px;color:var(--text-muted)">' + esc(t.players||'—') + '</td>' +
      '<td style="text-align:center">' + (t.seed||'—') + '</td>' +
      '<td><div class="table-actions">' +
        '<button class="btn-icon" onclick="openTeamModal(\'' + t.id + '\')"><i class="fas fa-edit"></i></button>' +
        '<button class="btn-icon danger" onclick="deleteTeam(\'' + t.id + '\')"><i class="fas fa-trash"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join('');

  c.innerHTML = '<table class="admin-table"><thead><tr><th>Team</th><th>Tag</th><th>Tournament</th><th>Players</th><th>Seed</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function openTeamModal(id) {
  var t = id ? db.teams.find(function(x){ return x.id===id; }) : null;
  setText('teamModalTitle', t ? 'Edit Team' : 'Add Team');
  setVal('teamId', t ? t.id : '');
  setVal('teamName', t ? t.name : '');
  setVal('teamTag', t ? (t.tag||'') : '');
  setVal('teamPlayers', t ? (t.players||'') : '');
  setVal('teamContact', t ? (t.contact||'') : '');
  setVal('teamSeed', t ? (t.seed||'') : '');
  populateTournamentSelect('teamTournament', false, t ? t.tournamentId : '');
  openModal('teamModal');
}

function saveTeam() {
  var id = getVal('teamId');
  var data = {
    name: getVal('teamName'),
    tag: getVal('teamTag'),
    tournamentId: getVal('teamTournament'),
    players: getVal('teamPlayers'),
    contact: getVal('teamContact'),
    seed: parseInt(getVal('teamSeed')) || null
  };
  if (!data.name) { showToast('Team name required.', 'error'); return; }
  if (!data.tournamentId) { showToast('Select a tournament.', 'error'); return; }

  var btn = document.querySelector('#teamForm [type=submit]');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  var op = id ? GHDb.update('teams', id, data) : GHDb.add('teams', data);
  op.then(function() {
    showToast(id ? 'Team updated!' : 'Team added!');
    closeModal('teamModal');
    loadAll(function() { renderTeamsTable(); });
  }).catch(function(e){ showToast('Error: '+e.message,'error'); })
  .finally(function() { if (btn) { btn.disabled=false; btn.innerHTML='<i class="fas fa-save"></i> Save Team'; } });
}

function deleteTeam(id) {
  var t = db.teams.find(function(x){ return x.id===id; });
  showConfirm('Delete team "' + (t?t.name:'') + '"?', function() {
    GHDb.remove('teams', id).then(function() {
      showToast('Team deleted.');
      loadAll(function(){ renderTeamsTable(); });
    }).catch(function(e){ showToast('Error: '+e.message,'error'); });
  });
}

// ══════════════════════════════════════
// MATCHES
// ══════════════════════════════════════
function loadMatchesSection() {
  populateTournamentSelect('matchesFilterTournament', true);
  var sel = document.getElementById('matchesFilterTournament');
  if (sel) sel.onchange = renderMatchesTable;
  renderMatchesTable();
}

function renderMatchesTable() {
  var c = document.getElementById('adminMatchesList');
  if (!c) return;
  var fid = getVal('matchesFilterTournament');
  var matches = fid ? db.matches.filter(function(m){ return m.tournamentId===fid; }) : db.matches;
  matches = matches.slice().sort(function(a,b){ return (a.round-b.round)||((a.matchNumber||0)-(b.matchNumber||0)); });

  if (!matches.length) { c.innerHTML = '<p class="empty-state">No matches. Generate a bracket first in the Brackets section.</p>'; return; }

  var rows = matches.map(function(m) {
    var t1 = db.teams.find(function(t){ return t.id===m.team1Id; });
    var t2 = db.teams.find(function(t){ return t.id===m.team2Id; });
    var w  = db.teams.find(function(t){ return t.id===m.winnerId; });
    return '<tr>' +
      '<td><span style="font-family:var(--font-deco);font-size:12px;color:var(--gold)">R' + (m.round||'?') + ' M' + (m.matchNumber||'?') + '</span></td>' +
      '<td' + (m.winnerId===m.team1Id?' style="color:var(--gold);font-weight:700"':'') + '>' + (t1?esc(t1.name):'<em>TBD</em>') + '</td>' +
      '<td style="font-family:var(--font-deco);text-align:center">' + (m.score1!=null&&m.score2!=null ? m.score1+' – '+m.score2 : '—') + '</td>' +
      '<td' + (m.winnerId===m.team2Id?' style="color:var(--gold);font-weight:700"':'') + '>' + (t2?esc(t2.name):'<em>TBD</em>') + '</td>' +
      '<td style="color:var(--gold);font-weight:700">' + (w?esc(w.name):'—') + '</td>' +
      '<td><span class="tc-status-badge ' + (m.status==='completed'?'status-completed':m.status==='live'?'status-ongoing':'status-upcoming') + '" style="font-size:10px">' + (m.status||'scheduled') + '</span></td>' +
      '<td><button class="btn-icon" onclick="openMatchModal(\'' + m.id + '\')"><i class="fas fa-edit"></i></button></td>' +
    '</tr>';
  }).join('');

  c.innerHTML = '<table class="admin-table"><thead><tr><th>Match</th><th>Team 1</th><th>Score</th><th>Team 2</th><th>Winner</th><th>Status</th><th>Edit</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function openMatchModal(id) {
  var m = db.matches.find(function(x){ return x.id===id; });
  if (!m) return;
  var t1 = db.teams.find(function(t){ return t.id===m.team1Id; });
  var t2 = db.teams.find(function(t){ return t.id===m.team2Id; });
  setVal('matchId', m.id);
  setVal('score1', m.score1!=null?m.score1:0);
  setVal('score2', m.score2!=null?m.score2:0);
  setVal('matchStatus', m.status||'scheduled');
  setVal('matchDate', m.scheduledAt ? m.scheduledAt.slice(0,16) : '');
  setText('scoreLabel1', (t1?t1.name:'Team 1')+' Score');
  setText('scoreLabel2', (t2?t2.name:'Team 2')+' Score');
  var prev = document.getElementById('matchPreview');
  if (prev) prev.innerHTML = '<span>' + (t1?esc(t1.name):'TBD') + '</span><span class="mrp-vs">vs</span><span>' + (t2?esc(t2.name):'TBD') + '</span>';
  var ws = document.getElementById('matchWinner');
  if (ws) {
    ws.innerHTML = '<option value="">— Auto from score —</option>';
    if (t1) ws.innerHTML += '<option value="' + t1.id + '"' + (m.winnerId===t1.id?' selected':'') + '>' + esc(t1.name) + '</option>';
    if (t2) ws.innerHTML += '<option value="' + t2.id + '"' + (m.winnerId===t2.id?' selected':'') + '>' + esc(t2.name) + '</option>';
  }
  openModal('matchModal');
}

function saveMatch() {
  var id = getVal('matchId');
  var m  = db.matches.find(function(x){ return x.id===id; });
  var s1 = parseInt(getVal('score1'))||0;
  var s2 = parseInt(getVal('score2'))||0;
  var status = getVal('matchStatus');
  var scheduledAt = getVal('matchDate');
  var winnerId = getVal('matchWinner');
  if (!winnerId && status==='completed' && s1!==s2) {
    winnerId = s1>s2 ? m.team1Id : m.team2Id;
  }
  var btn = document.querySelector('#matchForm [type=submit]');
  if (btn) { btn.disabled=true; btn.textContent='Saving...'; }

  GHDb.update('matches', id, { score1:s1, score2:s2, winnerId:winnerId, status:status, scheduledAt:scheduledAt })
    .then(function(updated) {
      if (status==='completed' && winnerId) propagateWinner(updated);
      showToast('Match saved!');
      closeModal('matchModal');
      loadAll(function(){ renderMatchesTable(); });
    }).catch(function(e){ showToast('Error: '+e.message,'error'); })
    .finally(function(){ if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-save"></i> Save Result';} });
}

function propagateWinner(m) {
  var nextRound = m.round + 1;
  var nextNum = Math.ceil(m.matchNumber / 2);
  var next = db.matches.find(function(x){ return x.tournamentId===m.tournamentId && x.round===nextRound && x.matchNumber===nextNum; });
  if (!next) return;
  var slot = m.matchNumber % 2 === 1 ? 'team1Id' : 'team2Id';
  if (!next[slot]) GHDb.update('matches', next.id, { [slot]: m.winnerId });
}

// ══════════════════════════════════════
// BRACKETS
// ══════════════════════════════════════
function loadBracketsSection() {
  populateTournamentSelect('bracketsFilterTournament', false);
  var sel = document.getElementById('bracketsFilterTournament');
  if (sel) sel.onchange = renderBracketMgmt;
}

function renderBracketMgmt() {
  var tid = getVal('bracketsFilterTournament');
  var c = document.getElementById('bracketMgmtArea');
  if (!c) return;
  if (!tid) { c.innerHTML = '<p class="empty-
