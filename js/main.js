// ─── Main Page ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadStats();
  await loadFeaturedTournaments();
});

async function loadStats() {
  const [tournaments, teams, matches] = await Promise.all([
    GHDb.read('tournaments'),
    GHDb.read('teams'),
    GHDb.read('matches')
  ]);

  animateCount('statTournaments', tournaments.length);
  animateCount('statTeams', teams.length);
  animateCount('statMatches', matches.length);
}

async function loadFeaturedTournaments() {
  const container = document.getElementById('featuredTournaments');
  const tournaments = await GHDb.read('tournaments');
  const featured = tournaments
    .filter(t => t.status === 'ongoing' || t.status === 'registration')
    .slice(0, 3);

  if (!featured.length) {
    // Fall back to most recent
    const recent = tournaments.slice(-3).reverse();
    renderTournamentCards(container, recent);
    return;
  }
  renderTournamentCards(container, featured);
}

function renderTournamentCards(container, tournaments) {
  if (!tournaments.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <i class="fas fa-gamepad" style="font-size:48px;color:var(--text-dim);display:block;margin-bottom:16px"></i>
      No tournaments yet. Check back soon!
    </div>`;
    return;
  }

  container.innerHTML = tournaments.map(t => `
    <div class="tournament-card" onclick="location.href='tournament.html?id=${t.id}'">
      <div class="tc-banner">
        <div class="tc-banner-icon">${t.name.substring(0,3).toUpperCase()}</div>
        <div class="tc-status-badge ${getTournamentColor(t.status)}">${getStatusLabel(t.status)}</div>
      </div>
      <div class="tc-body">
        <div class="tc-title">${escapeHtml(t.name)}</div>
        <div class="tc-meta">
          <span><i class="fas fa-sitemap"></i> ${getFormatLabel(t.format)}</span>
          ${t.startDate ? `<span><i class="fas fa-calendar"></i> ${formatDate(t.startDate)}</span>` : ''}
        </div>
        ${t.description ? `<p style="font-size:13px;color:var(--text-muted);line-height:1.5;margin-top:4px">${escapeHtml(t.description).substring(0,100)}${t.description.length > 100 ? '...' : ''}</p>` : ''}
      </div>
      <div class="tc-footer">
        <div class="tc-teams"><i class="fas fa-users"></i> Max ${t.maxTeams || '?'} teams</div>
        ${t.prize ? `<div class="tc-prize"><i class="fas fa-trophy"></i> ${escapeHtml(t.prize)}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 30);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 40);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
