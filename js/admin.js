/**
 * ═══════════════════════════════════════════════════════
 * Admin Dashboard JavaScript
 * Full CRUD for Tournaments, Teams, Matches, Brackets
 * ═══════════════════════════════════════════════════════
 */

// ── Auth Guard ───────────────────────────────────────────
if (!sessionStorage.getItem('adminAuth')) {
  location.href = 'login.html';
}

let db = { tournaments: [], teams: [], matches: [] };
let currentSection = 'overview';
let confirmCallback = null;

// ── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setupSidebar();
  setupLogout();
  await loadAll();
  switchSection('overview');
});

async function loadAll() {
  [db.tournaments, db.teams, db.matches] = await Promise.all([
    GHDb.read('tournaments'),
    GHDb.read('teams'),
    GHDb.read('matches')
  ]);
}

// ── Sidebar Navigation ────────────────────────────────────
function setupSidebar() {
  document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection(link.dataset.section);
    });
  });

  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('adminSidebar').classList.toggle('open');
  });
}

function switchSection(name) {
  currentSection = name;
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`[data-section="${name}"]`)?.classList.add('active');
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${name}`)?.classList.add('active');
  document.getElementById('topbarTitle').textContent = name.charAt(0).toUpperCase() + name.slice(1);

  const loaders = {
    overview: loadOverview,
    tournaments: loadTournamentsSection,
    teams: loadTeamsSection,
    matches: loadMatchesSection,
    brackets: loadBracketsSection,
    settings: loadSettingsSection
  };
  loaders[name]?.();
}

// ── Logout ────────────────────────────────────────────────
function setupLogout() {
  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.clear();
    location.href = 'login.html';
  });
}

// ══════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════
function loadOverview() {
  document.getElementById('ovTournaments').textContent = db.tournaments.length;
  document.getElementById('ovTeams').textContent = db.teams.length;
  document.getElementById('ovMatches').textContent = db.matches.length;
  document.getElementById('ovCompleted').textContent = db.tournaments.filter(t => t.status === 'completed').length;

  // Recent activity
  const activities = [];
  db.tournaments.slice(-3).reverse().forEach(t => {
    activities.push({ icon: 'fas fa-gamepad', color: '#f7b731', text: `Tournament <strong>${esc(t.name)}</strong> created`, time: t.createdAt });
  });
  db.teams.slice(-3).reverse().forEach(t => {
    activities.push({ icon: 'fas fa-users', color: '#6c5ce7', text: `Team <strong>${esc(t.name)}</strong> registered`, time: t.createdAt });
  });
  db.matches.filter(m => m.status === 'completed').slice(-3).reverse().forEach(m => {
    const t1 = db.teams.find(t => t.id === m.team1Id);
    const t2 = db.teams.find(t => t.id === m.team2Id);
    activities.push({ icon: 'fas fa-crosshairs', color: '#00b894', text: `Match completed: <strong>${t1 ? esc(t1.name) : 'TBD'}</strong> vs <strong>${t2 ? esc(t2.name) : 'TBD'}</strong>`, time: m.updatedAt });
  });

  activities.sort((a,b) => new Date(b.time) - new Date(a.time));

  const el = document.getElementById('recentActivity');
  if (!activities.length) {
    el.innerHTML = '<p class="empty-state" style="padding:20px">No activity yet. Create your first tournament!</p>';
    return;
  }
  el.innerHTML = activities.slice(0,8).map(a => `
    <div class="activity-item">
      <div class="activity-icon" style="background:${a.color}22;color:${a.color}"><i class="${a.icon}"></i></div>
      <div class="activity-text">${a.text}</div>
      <div class="activity-time">${formatDate(a.time)}</div>
    </div>
  `).join('');
}

// ══════════════════════════════════════
// TOURNAMENTS
// ══════════════════════════════════════
function loadTournamentsSection() {
  const container = document.getElementById('adminTournamentsList');

  // Setup new button
  document.getElementById('btnNewTournament').onclick = () => openTournamentModal();

  if (!db.tournaments.length) {
    container.innerHTML = '<p class="empty-state">No tournaments yet. Create one!</p>';
    return;
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Format</th>
          <th>Status</th>
          <th>Teams</th>
          <th>Dates</th>
          <th>Bracket Public</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${db.tournaments.slice().reverse().map(t => {
          const teamCount = db.teams.filter(tm => tm.tournamentId === t.id).length;
          return `
            <tr>
              <td><strong>${esc(t.name)}</strong>${t.prize ? `<br><small style="color:var(--gold)">${esc(t.prize)}</small>` : ''}</td>
              <td>${getFormatLabel(t.format)}</td>
              <td><span class="tc-status-badge ${getTournamentColor(t.status)}" style="font-size:10px">${getStatusLabel(t.status)}</span></td>
              <td>${teamCount} / ${t.maxTeams || '?'}</td>
              <td style="font-size:12px">${formatDate(t.startDate)}</td>
              <td style="text-align:center">${t.bracketPublic ? '✅' : '🔒'}</td>
              <td>
                <div class="table-actions">
                  <button class="btn-icon" title="Edit" onclick="openTournamentModal('${t.id}')"><i class="fas fa-edit"></i></button>
                  <button class="btn-icon" title="View Bracket" onclick="viewBracket('${t.id}')"><i class="fas fa-sitemap"></i></button>
                  <button class="btn-icon danger" title="Delete" onclick="deleteTournament('${t.id}')"><i class="fas fa-trash"></i></button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function openTournamentModal(id) {
  const modal = document.getElementById('tournamentModal');
  const form = document.getElementById('tournamentForm');
  const t = id ? db.tournaments.find(x => x.id === id) : null;

  document.getElementById('tournamentModalTitle').textContent = t ? 'Edit Tournament' : 'New Tournament';
  document.getElementById('tId').value = t?.id || '';
  document.getElementById('tName').value = t?.name || '';
  document.getElementById('tFormat').value = t?.format || 'single_elimination';
  document.getElementById('tStartDate').value = t?.startDate || '';
  document.getElementById('tEndDate').value = t?.endDate || '';
  document.getElementById('tMaxTeams').value = t?.maxTeams || 8;
  document.getElementById('tPrize').value = t?.prize || '';
  document.getElementById('tStatus').value = t?.status || 'upcoming';
  document.getElementById('tDescription').value = t?.description || '';
  document.getElementById('tBracketPublic').checked = t?.bracketPublic || false;

  modal.classList.add('open');
}

document.getElementById('tournamentForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('tId').value;
  const data = {
    name: document.getElementById('tName').value,
    format: document.getElementById('tFormat').value,
    startDate: document.getElementById('tStartDate').value,
    endDate: document.getElementById('tEndDate').value,
    maxTeams: parseInt(document.getElementById('tMaxTeams').value) || 8,
    prize: document.getElementById('tPrize').value,
    status: document.getElementById('tStatus').value,
    description: document.getElementById('tDescription').value,
    bracketPublic: document.getElementById('tBracketPublic').checked
  };

  try {
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;margin:auto"></div>';

    if (id) {
      await GHDb.update('tournaments', id, data);
      showToast('Tournament updated!');
    } else {
      await GHDb.add('tournaments', data);
      showToast('Tournament created!');
    }

    document.getElementById('tournamentModal').classList.remove('open');
    await loadAll();
    loadTournamentsSection();
    loadOverview();
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    const btn = e.target.querySelector('[type=submit]');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Tournament'; }
  }
});

function deleteTournament(id) {
  const t = db.tournaments.find(x => x.id === id);
  showConfirm(`Delete tournament "${t?.name}"? This will also delete all its teams and matches.`, async () => {
    try {
      await GHDb.remove('tournaments', id);
      // Clean up related data
      const relatedTeams = db.teams.filter(t => t.tournamentId === id);
      const relatedMatches = db.matches.filter(m => m.tournamentId === id);
      for (const team of relatedTeams) await GHDb.remove('teams', team.id);
      for (const match of relatedMatches) await GHDb.remove('matches', match.id);

      await loadAll();
      loadTournamentsSection();
      loadOverview();
      showToast('Tournament deleted.');
    } catch(err) {
      showToast('Error: ' + err.message, 'error');
    }
  });
}

function viewBracket(tournamentId) {
  window.open(`../tournament.html?id=${tournamentId}`, '_blank');
}

// ══════════════════════════════════════
// TEAMS
// ══════════════════════════════════════
function loadTeamsSection() {
  populateTournamentSelect('teamsFilterTournament', true);
  document.getElementById('teamsFilterTournament').onchange = renderTeamsTable;
  document.getElementById('btnNewTeam').onclick = () => openTeamModal();
  renderTeamsTable();
}

function renderTeamsTable() {
  const container = document.getElementById('adminTeamsList');
  const filterTournamentId = document.getElementById('teamsFilterTournament')?.value || '';

  let teams = db.teams;
  if (filterTournamentId) teams = teams.filter(t => t.tournamentId === filterTournamentId);

  if (!teams.length) {
    container.innerHTML = '<p class="empty-state">No teams found.</p>';
    return;
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr><th>Team</th><th>Tag</th><th>Tournament</th><th>Players</th><th>Seed</th><th>Contact</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${teams.map(t => {
          const tour = db.tournaments.find(x => x.id === t.tournamentId);
          return `
            <tr>
              <td><strong>${esc(t.name)}</strong></td>
              <td><span style="font-family:var(--font-deco);font-size:12px;color:var(--gold)">${esc(t.tag || '—')}</span></td>
              <td>${tour ? esc(tour.name) : '<span style="color:var(--text-dim)">—</span>'}</td>
              <td style="font-size:12px;color:var(--text-muted)">${esc(t.players || '—')}</td>
              <td style="text-align:center">${t.seed || '—'}</td>
              <td style="font-size:12px;color:var(--text-muted)">${esc(t.contact || '—')}</td>
              <td>
                <div class="table-actions">
                  <button class="btn-icon" title="Edit" onclick="openTeamModal('${t.id}')"><i class="fas fa-edit"></i></button>
                  <button class="btn-icon danger" title="Delete" onclick="deleteTeam('${t.id}')"><i class="fas fa-trash"></i></button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function openTeamModal(id) {
  const modal = document.getElementById('teamModal');
  const t = id ? db.teams.find(x => x.id === id) : null;

  document.getElementById('teamModalTitle').textContent = t ? 'Edit Team' : 'Add Team';
  document.getElementById('teamId').value = t?.id || '';
  document.getElementById('teamName').value = t?.name || '';
  document.getElementById('teamTag').value = t?.tag || '';
  document.getElementById('teamPlayers').value = t?.players || '';
  document.getElementById('teamContact').value = t?.contact || '';
  document.getElementById('teamSeed').value = t?.seed || '';
  populateTournamentSelect('teamTournament', false, t?.tournamentId);

  modal.classList.add('open');
}

document.getElementById('teamForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('teamId').value;
  const data = {
    name: document.getElementById('teamName').value,
    tag: document.getElementById('teamTag').value,
    tournamentId: document.getElementById('teamTournament').value,
    players: document.getElementById('teamPlayers').value,
    contact: document.getElementById('teamContact').value,
    seed: parseInt(document.getElementById('teamSeed').value) || null
  };

  try {
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    if (id) {
      await GHDb.update('teams', id, data);
      showToast('Team updated!');
    } else {
      await GHDb.add('teams', data);
      showToast('Team added!');
    }
    document.getElementById('teamModal').classList.remove('open');
    await loadAll();
    renderTeamsTable();
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    const btn = e.target.querySelector('[type=submit]');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Team'; }
  }
});

function deleteTeam(id) {
  const t = db.teams.find(x => x.id === id);
  showConfirm(`Delete team "${t?.name}"?`, async () => {
    await GHDb.remove('teams', id);
    await loadAll();
    renderTeamsTable();
    showToast('Team deleted.');
  });
}

// ══════════════════════════════════════
// MATCHES
// ══════════════════════════════════════
function loadMatchesSection() {
  populateTournamentSelect('matchesFilterTournament', true);
  document.getElementById('matchesFilterTournament').onchange = renderMatchesTable;
  renderMatchesTable();
}

function renderMatchesTable() {
  const container = document.getElementById('adminMatchesList');
  const filterTournamentId = document.getElementById('matchesFilterTournament')?.value || '';
  let matches = db.matches;
  if (filterTournamentId) matches = matches.filter(m => m.tournamentId === filterTournamentId);

  if (!matches.length) {
    container.innerHTML = `<p class="empty-state">No matches found. Generate a bracket first in the Brackets section.</p>`;
    return;
  }

  matches = matches.sort((a,b) => {
    if (a.round !== b.round) return a.round - b.round;
    return (a.matchNumber||0) - (b.matchNumber||0);
  });

  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr><th>Match</th><th>Team 1</th><th>Score</th><th>Team 2</th><th>Winner</th><th>Status</th><th>Scheduled</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${matches.map(m => {
          const t1 = db.teams.find(t => t.id === m.team1Id);
          const t2 = db.teams.find(t => t.id === m.team2Id);
          const w = db.teams.find(t => t.id === m.winnerId);
          return `
            <tr>
              <td><span style="font-family:var(--font-deco);font-size:12px;color:var(--gold)">R${m.round} M${m.matchNumber}</span></td>
              <td class="${m.winnerId === m.team1Id ? 'text-gold' : ''}">${t1 ? esc(t1.name) : '<em style="color:var(--text-dim)">TBD</em>'}</td>
              <td style="font-family:var(--font-deco);text-align:center">${m.score1 != null ? m.score1 + ' – ' + m.score2 : '—'}</td>
              <td class="${m.winnerId === m.team2Id ? 'text-gold' : ''}">${t2 ? esc(t2.name) : '<em style="color:var(--text-dim)">TBD</em>'}</td>
              <td style="color:var(--gold);font-weight:700">${w ? esc(w.name) : '—'}</td>
              <td><span class="tc-status-badge ${m.status === 'completed' ? 'status-completed' : m.status === 'live' ? 'status-ongoing' : 'status-upcoming'}" style="font-size:10px">${m.status || 'scheduled'}</span></td>
              <td style="font-size:12px">${m.scheduledAt ? formatDateTime(m.scheduledAt) : '—'}</td>
              <td>
                <button class="btn-icon" title="Update Result" onclick="openMatchModal('${m.id}')"><i class="fas fa-edit"></i></button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function openMatchModal(id) {
  const modal = document.getElementById('matchModal');
  const m = db.matches.find(x => x.id === id);
  if (!m) return;

  const t1 = db.teams.find(t => t.id === m.team1Id);
  const t2 = db.teams.find(t => t.id === m.team2Id);

  document.getElementById('matchId').value = m.id;
  document.getElementById('score1').value = m.score1 ?? 0;
  document.getElementById('score2').value = m.score2 ?? 0;
  document.getElementById('matchStatus').value = m.status || 'scheduled';
  document.getElementById('matchDate').value = m.scheduledAt ? m.scheduledAt.slice(0,16) : '';
  document.getElementById('scoreLabel1').textContent = (t1?.name || 'Team 1') + ' Score';
  document.getElementById('scoreLabel2').textContent = (t2?.name || 'Team 2') + ' Score';

  document.getElementById('matchPreview').innerHTML = `
    <span>${t1 ? esc(t1.name) : 'TBD'}</span>
    <span class="mrp-vs">vs</span>
    <span>${t2 ? esc(t2.name) : 'TBD'}</span>
  `;

  // Winner select
  const winnerSel = document.getElementById('matchWinner');
  winnerSel.innerHTML = `<option value="">— Auto from score —</option>`;
  if (t1) winnerSel.innerHTML += `<option value="${t1.id}" ${m.winnerId === t1.id ? 'selected' : ''}>${esc(t1.name)}</option>`;
  if (t2) winnerSel.innerHTML += `<option value="${t2.id}" ${m.winnerId === t2.id ? 'selected' : ''}>${esc(t2.name)}</option>`;

  modal.classList.add('open');
}

document.getElementById('matchForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('matchId').value;
  const m = db.matches.find(x => x.id === id);
  const score1 = parseInt(document.getElementById('score1').value);
  const score2 = parseInt(document.getElementById('score2').value);
  const status = document.getElementById('matchStatus').value;
  const scheduledAt = document.getElementById('matchDate').value;
  let winnerId = document.getElementById('matchWinner').value;

  // Auto winner from score
  if (!winnerId && score1 !== score2 && status === 'completed') {
    winnerId = score1 > score2 ? m.team1Id : m.team2Id;
  }

  try {
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    const updated = await GHDb.update('matches', id, { score1, score2, winnerId, status, scheduledAt });

    // If completed & we have a winner, propagate to next match
    if (status === 'completed' && winnerId) {
      await propagateWinner(updated);
    }

    document.getElementById('matchModal').classList.remove('open');
    await loadAll();
    renderMatchesTable();
    showToast('Match result saved!');
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    const btn = e.target.querySelector('[type=submit]');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Result'; }
  }
});

/**
 * Propagate winner to next round match (single elimination)
 */
async function propagateWinner(match) {
  const tournamentMatches = db.matches.filter(m => m.tournamentId === match.tournamentId);
  const nextRound = match.round + 1;
  const nextMatchNum = Math.ceil(match.matchNumber / 2);

  const nextMatch = tournamentMatches.find(m =>
    m.round === nextRound && m.matchNumber === nextMatchNum
  );

  if (!nextMatch) return; // Final match or not found

  const slot = match.matchNumber % 2 eamsTable;
  document.getElementById('btnNewTeam').onclick = () => openTeamModal();
  renderTeamsTable();
}

function renderTeamsTable() {
  const container = document.getElementById('adminTeamsList');
  const filterTournamentId = document.getElementById('teamsFilterTournament')?.value || '';

  let teams = db.teams;
  if (filterTournamentId) teams = teams.filter(t => t.tournamentId === filterTournamentId);

  if (!teams.length) {
    container.innerHTML = '<p class="empty-state">No teams found.</p>';
    return;
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr><th>Team</th><th>Tag</th><th>Tournament</th><th>Players</th><th>Seed</th><th>Contact</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${teams.map(t => {
          const tour = db.tournaments.find(x => x.id === t.tournamentId);
          return `
            <tr>
              <td><strong>${esc(t.name)}</strong></td>
              <td><span style="font-family:var(--font-deco);font-size:12px;color:var(--gold)">${esc(t.tag || '—')}</span></td>
              <td>${tour ? esc(tour.name) : '<span style="color:var(--text-dim)">—</span>'}</td>
              <td style="font-size:12px;color:var(--text-muted)">${esc(t.players || '—')}</td>
              <td style="text-align:center">${t.seed || '—'}</td>
              <td style="font-size:12px;color:var(--text-muted)">${esc(t.contact || '—')}</td>
              <td>
                <div class="table-actions">
                  <button class="btn-icon" title="Edit" onclick="openTeamModal('${t.id}')"><i class="fas fa-edit"></i></button>
                  <button class="btn-icon danger" title="Delete" onclick="deleteTeam('${t.id}')"><i class="fas fa-trash"></i></button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function openTeamModal(id) {
  const modal = document.getElementById('teamModal');
  const t = id ? db.teams.find(x => x.id === id) : null;

  document.getElementById('teamModalTitle').textContent = t ? 'Edit Team' : 'Add Team';
  document.getElementById('teamId').value = t?.id || '';
  document.getElementById('teamName').value = t?.name || '';
  document.getElementById('teamTag').value = t?.tag || '';
  document.getElementById('teamPlayers').value = t?.players || '';
  document.getElementById('teamContact').value = t?.contact || '';
  document.getElementById('teamSeed').value = t?.seed || '';
  populateTournamentSelect('teamTournament', false, t?.tournamentId);

  modal.classList.add('open');
}

document.getElementById('teamForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('teamId').value;
  const data = {
    name: document.getElementById('teamName').value,
    tag: document.getElementById('teamTag').value,
    tournamentId: document.getElementById('teamTournament').value,
    players: document.getElementById('teamPlayers').value,
    contact: document.getElementById('teamContact').value,
    seed: parseInt(document.getElementById('teamSeed').value) || null
  };

  try {
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    if (id) {
      await GHDb.update('teams', id, data);
      showToast('Team updated!');
    } else {
      await GHDb.add('teams', data);
      showToast('Team added!');
    }
    document.getElementById('teamModal').classList.remove('open');
    await loadAll();
    renderTeamsTable();
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    const btn = e.target.querySelector('[type=submit]');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Team'; }
  }
});

function deleteTeam(id) {
  const t = db.teams.find(x => x.id === id);
  showConfirm(`Delete team "${t?.name}"?`, async () => {
    await GHDb.remove('teams', id);
    await loadAll();
    renderTeamsTable();
    showToast('Team deleted.');
  });
}

// ══════════════════════════════════════
// MATCHES
// ══════════════════════════════════════
function loadMatchesSection() {
  populateTournamentSelect('matchesFilterTournament', true);
  document.getElementById('matchesFilterTournament').onchange = renderMatchesTable;
  renderMatchesTable();
}

function renderMatchesTable() {
  const container = document.getElementById('adminMatchesList');
  const filterTournamentId = document.getElementById('matchesFilterTournament')?.value || '';
  let matches = db.matches;
  if (filterTournamentId) matches = matches.filter(m => m.tournamentId === filterTournamentId);

  if (!matches.length) {
    container.innerHTML = `<p class="empty-state">No matches found. Generate a bracket first in the Brackets section.</p>`;
    return;
  }

  matches = matches.sort((a,b) => {
    if (a.round !== b.round) return a.round - b.round;
    return (a.matchNumber||0) - (b.matchNumber||0);
  });

  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr><th>Match</th><th>Team 1</th><th>Score</th><th>Team 2</th><th>Winner</th><th>Status</th><th>Scheduled</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${matches.map(m => {
          const t1 = db.teams.find(t => t.id === m.team1Id);
          const t2 = db.teams.find(t => t.id === m.team2Id);
          const w = db.teams.find(t => t.id === m.winnerId);
          return `
            <tr>
              <td><span style="font-family:var(--font-deco);font-size:12px;color:var(--gold)">R${m.round} M${m.matchNumber}</span></td>
              <td class="${m.winnerId === m.team1Id ? 'text-gold' : ''}">${t1 ? esc(t1.name) : '<em style="color:var(--text-dim)">TBD</em>'}</td>
              <td style="font-family:var(--font-deco);text-align:center">${m.score1 != null ? m.score1 + ' – ' + m.score2 : '—'}</td>
              <td class="${m.winnerId === m.team2Id ? 'text-gold' : ''}">${t2 ? esc(t2.name) : '<em style="color:var(--text-dim)">TBD</em>'}</td>
              <td style="color:var(--gold);font-weight:700">${w ? esc(w.name) : '—'}</td>
              <td><span class="tc-status-badge ${m.status === 'completed' ? 'status-completed' : m.status === 'live' ? 'status-ongoing' : 'status-upcoming'}" style="font-size:10px">${m.status || 'scheduled'}</span></td>
              <td style="font-size:12px">${m.scheduledAt ? formatDateTime(m.scheduledAt) : '—'}</td>
              <td>
                <button class="btn-icon" title="Update Result" onclick="openMatchModal('${m.id}')"><i class="fas fa-edit"></i></button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function openMatchModal(id) {
  const modal = document.getElementById('matchModal');
  const m = db.matches.find(x => x.id === id);
  if (!m) return;

  const t1 = db.teams.find(t => t.id === m.team1Id);
  const t2 = db.teams.find(t => t.id === m.team2Id);

  document.getElementById('matchId').value = m.id;
  document.getElementById('score1').value = m.score1 ?? 0;
  document.getElementById('score2').value = m.score2 ?? 0;
  document.getElementById('matchStatus').value = m.status || 'scheduled';
  document.getElementById('matchDate').value = m.scheduledAt ? m.scheduledAt.slice(0,16) : '';
  document.getElementById('scoreLabel1').textContent = (t1?.name || 'Team 1') + ' Score';
  document.getElementById('scoreLabel2').textContent = (t2?.name || 'Team 2') + ' Score';

  document.getElementById('matchPreview').innerHTML = `
    <span>${t1 ? esc(t1.name) : 'TBD'}</span>
    <span class="mrp-vs">vs</span>
    <span>${t2 ? esc(t2.name) : 'TBD'}</span>
  `;

  // Winner select
  const winnerSel = document.getElementById('matchWinner');
  winnerSel.innerHTML = `<option value="">— Auto from score —</option>`;
  if (t1) winnerSel.innerHTML += `<option value="${t1.id}" ${m.winnerId === t1.id ? 'selected' : ''}>${esc(t1.name)}</option>`;
  if (t2) winnerSel.innerHTML += `<option value="${t2.id}" ${m.winnerId === t2.id ? 'selected' : ''}>${esc(t2.name)}</option>`;

  modal.classList.add('open');
}

document.getElementById('matchForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('matchId').value;
  const m = db.matches.find(x => x.id === id);
  const score1 = parseInt(document.getElementById('score1').value);
  const score2 = parseInt(document.getElementById('score2').value);
  const status = document.getElementById('matchStatus').value;
  const scheduledAt = document.getElementById('matchDate').value;
  let winnerId = document.getElementById('matchWinner').value;

  // Auto winner from score
  if (!winnerId && score1 !== score2 && status === 'completed') {
    winnerId = score1 > score2 ? m.team1Id : m.team2Id;
  }

  try {
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    const updated = await GHDb.update('matches', id, { score1, score2, winnerId, status, scheduledAt });

    // If completed & we have a winner, propagate to next match
    if (status === 'completed' && winnerId) {
      await propagateWinner(updated);
    }

    document.getElementById('matchModal').classList.remove('open');
    await loadAll();
    renderMatchesTable();
    showToast('Match result saved!');
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    const btn = e.target.querySelector('[type=submit]');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Result'; }
  }
});

/**
 * Propagate winner to next round match (single elimination)
 */
async function propagateWinner(match) {
  const tournamentMatches = db.matches.filter(m => m.tournamentId === match.tournamentId);
  const nextRound = match.round + 1;
  const nextMatchNum = Math.ceil(match.matchNumber / 2);

  const nextMatch = tournamentMatches.find(m =>
    m.round === nextRound && m.matchNumber === nextMatchNum
  );

  if (!nextMatch) return; // Final match or not found

  const slot = match.matchNumber % 2 === 
