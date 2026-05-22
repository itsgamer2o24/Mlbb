// ─── Tournament Detail Page ───────────────────────────────
let tournament = null;
let tournamentTeams = [];
let tournamentMatches = [];
let settings = {};

document.addEventListener('DOMContentLoaded', async () => {
  const id = getQueryParam('id');
  if (!id) { location.href = 'tournaments.html'; return; }

  [tournament, tournamentTeams, tournamentMatches, settings] = await Promise.all([
    GHDb.get('tournaments', id),
    GHDb.read('teams').then(t => t.filter(team => team.tournamentId === id)),
    GHDb.read('matches').then(m => m.filter(match => match.tournamentId === id)),
    GHDb.readSettings()
  ]);

  if (!tournament) { location.href = 'tournaments.html'; return; }

  renderBanner();
  renderTeams();
  renderSchedule();
  renderResults();
  renderBracket();
  setupTabs();
});

function renderBanner() {
  document.title = `${tournament.name} — MLBB Tournament Hub`;
  const el = id => document.getElementById(id);

  el('bannerTitle').textContent = tournament.name;
  el('bannerStatus').textContent = getStatusLabel(tournament.status);
  el('bannerStatus').className = `banner-badge ${getTournamentColor(tournament.status)}`;
  if (tournament.startDate) el('bannerDate').innerHTML = `<i class="fas fa-calendar"></i> ${formatDate(tournament.startDate)}${tournament.endDate ? ' – ' + formatDate(tournament.endDate) : ''}`;
  el('bannerFormat').innerHTML = `<i class="fas fa-sitemap"></i> ${getFormatLabel(tournament.format)}`;
  el('bannerTeams').innerHTML = `<i class="fas fa-users"></i> ${tournamentTeams.length} / ${tournament.maxTeams || '?'} Teams`;
  if (tournament.prize) el('bannerPrize').textContent = '🏆 ' + tournament.prize;
}

function renderTeams() {
  const container = document.getElementById('teamsList');
  if (!tournamentTeams.length) {
    container.innerHTML = `<p class="empty-state">No teams registered yet.</p>`;
    return;
  }
  container.innerHTML = tournamentTeams
    .sort((a,b) => (a.seed||99) - (b.seed||99))
    .map(team => `
      <div class="team-card">
        <div class="team-avatar">${escapeHtml((team.tag || team.name.substring(0,3)).toUpperCase())}</div>
        <div class="team-info">
          <h4>${escapeHtml(team.name)}</h4>
          <p>${team.players ? escapeHtml(team.players) : 'No roster listed'}</p>
        </div>
        ${team.seed ? `<div class="team-seed">${team.seed}</div>` : ''}
      </div>
    `).join('');
}

function renderSchedule() {
  const container = document.getElementById('scheduleList');
  const scheduled = tournamentMatches.filter(m => m.status !== 'completed');
  if (!scheduled.length) {
    container.innerHTML = `<p class="empty-state">No upcoming matches scheduled.</p>`;
    return;
  }
  container.innerHTML = scheduled.map(m => renderMatchItem(m)).join('');
}

function renderResults() {
  const container = document.getElementById('resultsList');
  const completed = tournamentMatches.filter(m => m.status === 'completed');
  if (!completed.length) {
    container.innerHTML = `<p class="empty-state">No results yet.</p>`;
    return;
  }
  container.innerHTML = completed.map(m => renderMatchItem(m)).join('');
}

function renderMatchItem(m) {
  const t1 = tournamentTeams.find(t => t.id === m.team1Id);
  const t2 = tournamentTeams.find(t => t.id === m.team2Id);
  const w = tournamentTeams.find(t => t.id === m.winnerId);
  const hasScore = m.score1 != null && m.score2 != null;

  return `
    <div class="schedule-item">
      <div class="si-round">Round ${m.round || '?'} • Match ${m.matchNumber || '?'}</div>
      <div class="si-teams">
        <span class="si-team ${m.winnerId === m.team1Id ? 'winner' : ''}">${t1 ? escapeHtml(t1.name) : 'TBD'}</span>
        ${hasScore ? `<span class="si-score">${m.score1} – ${m.score2}</span>` : '<span class="si-vs">vs</span>'}
        <span class="si-team ${m.winnerId === m.team2Id ? 'winner' : ''}">${t2 ? escapeHtml(t2.name) : 'TBD'}</span>
      </div>
      ${m.scheduledAt ? `<div class="si-date"><i class="fas fa-clock"></i> ${formatDateTime(m.scheduledAt)}</div>` : ''}
      <div class="si-status">
        <span class="tc-status-badge ${m.status === 'completed' ? 'status-completed' : m.status === 'live' ? 'status-ongoing' : 'status-upcoming'}">
          ${m.status || 'Scheduled'}
        </span>
      </div>
    </div>
  `;
}

function renderBracket() {
  const lockedEl = document.getElementById('bracketLocked');
  const containerEl = document.getElementById('bracketContainer');

  // Check if bracket should be visible
  const isPublic = tournament.bracketPublic === true ||
    (settings.bracketVisibility === 'visible');

  if (!isPublic) {
    lockedEl.style.display = 'block';
    containerEl.style.display = 'none';
    return;
  }

  if (!tournamentMatches.length) {
    lockedEl.style.display = 'block';
    containerEl.style.display = 'none';
    return;
  }

  lockedEl.style.display = 'none';
  containerEl.style.display = 'block';

  const wrapper = document.getElementById('bracketWrapper');
  wrapper.innerHTML = BracketRenderer.render(tournamentMatches, tournamentTeams);
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab)?.classList.add('active');
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
