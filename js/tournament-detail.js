// ── Tournament Detail Page ────────────────────────────────
let tournament = null, tournamentTeams = [], tournamentMatches = [], siteSettings = {};

document.addEventListener('DOMContentLoaded', async () => {
  const id = getQueryParam('id');
  if (!id) { location.href = 'tournaments.html'; return; }

  showLoading(true);
  try {
    const [allTeams, allMatches, settings, tour] = await Promise.all([
      GHDb.read('teams'),
      GHDb.read('matches'),
      GHDb.readSettings(),
      GHDb.get('tournaments', id)
    ]);
    tournament = tour;
    siteSettings = settings;
    tournamentTeams = allTeams.filter(t => t.tournamentId === id);
    tournamentMatches = allMatches.filter(m => m.tournamentId === id);
  } catch(e) {
    showError('Failed to load tournament data: ' + e.message);
    return;
  }

  if (!tournament) { location.href = 'tournaments.html'; return; }

  showLoading(false);
  renderBanner();
  renderTeams();
  renderSchedule();
  renderResults();
  renderBracket();
  setupTabs();
});

function showLoading(on) {
  document.getElementById('tournamentBanner').style.opacity = on ? '0.5' : '1';
}

function showError(msg) {
  document.querySelector('.tab-content-wrap .container').innerHTML = `
    <div class="empty-state" style="padding:80px 20px">
      <i class="fas fa-exclamation-triangle" style="font-size:48px;color:var(--red);display:block;margin-bottom:16px"></i>
      <p>${msg}</p>
      <a href="tournaments.html" class="btn-secondary" style="margin-top:16px">Back to Tournaments</a>
    </div>`;
}

function renderBanner() {
  document.title = `${tournament.name} — MLBB Tournament Hub`;
  const g = id => document.getElementById(id);
  if (g('bannerTitle')) g('bannerTitle').textContent = tournament.name;
  if (g('bannerStatus')) {
    g('bannerStatus').textContent = getStatusLabel(tournament.status);
    g('bannerStatus').className = `banner-badge ${getTournamentColor(tournament.status)}`;
  }
  if (g('bannerDate') && tournament.startDate) {
    g('bannerDate').innerHTML = `<i class="fas fa-calendar"></i> ${formatDate(tournament.startDate)}${tournament.endDate ? ' – ' + formatDate(tournament.endDate) : ''}`;
  }
  if (g('bannerFormat')) g('bannerFormat').innerHTML = `<i class="fas fa-sitemap"></i> ${getFormatLabel(tournament.format)}`;
  if (g('bannerTeams')) g('bannerTeams').innerHTML = `<i class="fas fa-users"></i> ${tournamentTeams.length} / ${tournament.maxTeams || '?'} Teams`;
  if (g('bannerPrize') && tournament.prize) g('bannerPrize').textContent = '🏆 ' + tournament.prize;
}

function renderTeams() {
  const c = document.getElementById('teamsList');
  if (!c) return;
  if (!tournamentTeams.length) { c.innerHTML = `<p class="empty-state">No teams registered yet.</p>`; return; }
  c.innerHTML = tournamentTeams
    .slice().sort((a,b) => (a.seed||99)-(b.seed||99))
    .map(t => `
      <div class="team-card">
        <div class="team-avatar">${e((t.tag || t.name.substring(0,3)).toUpperCase())}</div>
        <div class="team-info">
          <h4>${e(t.name)}</h4>
          <p>${t.players ? e(t.players) : 'No roster listed'}</p>
        </div>
        ${t.seed ? `<div class="team-seed">${t.seed}</div>` : ''}
      </div>
    `).join('');
}

function renderSchedule() {
  const c = document.getElementById('scheduleList');
  if (!c) return;
  const list = tournamentMatches.filter(m => m.status !== 'completed');
  if (!list.length) { c.innerHTML = `<p class="empty-state">No upcoming matches scheduled.</p>`; return; }
  c.innerHTML = list.map(renderMatchRow).join('');
}

function renderResults() {
  const c = document.getElementById('resultsList');
  if (!c) return;
  const list = tournamentMatches.filter(m => m.status === 'completed');
  if (!list.length) { c.innerHTML = `<p class="empty-state">No completed matches yet.</p>`; return; }
  c.innerHTML = list.map(renderMatchRow).join('');
}

function renderMatchRow(m) {
  const t1 = tournamentTeams.find(t => t.id === m.team1Id);
  const t2 = tournamentTeams.find(t => t.id === m.team2Id);
  const hasScore = m.score1 != null && m.score2 != null && m.status === 'completed';
  return `
    <div class="schedule-item">
      <div class="si-round">Round ${m.round||'?'} · Match ${m.matchNumber||'?'}</div>
      <div class="si-teams">
        <span class="si-team ${m.winnerId===m.team1Id?'winner':''}">${t1?e(t1.name):'TBD'}</span>
        ${hasScore ? `<span class="si-score">${m.score1} – ${m.score2}</span>` : `<span class="si-vs">vs</span>`}
        <span class="si-team ${m.winnerId===m.team2Id?'winner':''}">${t2?e(t2.name):'TBD'}</span>
      </div>
      ${m.scheduledAt?`<div class="si-date"><i class="fas fa-clock"></i> ${formatDateTime(m.scheduledAt)}</div>`:''}
      <div class="si-status">
        <span class="tc-status-badge ${m.status==='completed'?'status-completed':m.status==='live'?'status-ongoing':'status-upcoming'}">
          ${m.status==='completed'?'Completed':m.status==='live'?'LIVE':'Scheduled'}
        </span>
      </div>
    </div>`;
}

function renderBracket() {
  const locked = document.getElementById('bracketLocked');
  const cont = document.getElementById('bracketContainer');
  const isPublic = tournament.bracketPublic === true || siteSettings.bracketVisibility === 'visible';
  if (!isPublic || !tournamentMatches.length) {
    if (locked) locked.style.display = 'block';
    if (cont) cont.style.display = 'none';
    return;
  }
  if (locked) locked.style.display = 'none';
  if (cont) cont.style.display = 'block';
  const wrapper = document.getElementById('bracketWrapper');
  if (wrapper) wrapper.innerHTML = BracketRenderer.render(tournamentMatches, tournamentTeams);
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-'+btn.dataset.tab)?.classList.add('active');
    });
  });
}

function e(s) { return escHtml ? escHtml(s) : s; }
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
