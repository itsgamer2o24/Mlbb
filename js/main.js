// ── Home Page ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadStats(), loadFeaturedTournaments()]);
});

async function loadStats() {
  const [tournaments, teams, matches] = await Promise.all([
    GHDb.read('tournaments'), GHDb.read('teams'), GHDb.read('matches')
  ]);
  setCount('statTournaments', tournaments.length);
  setCount('statTeams', teams.length);
  setCount('statMatches', matches.length);
}

function setCount(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  if (val === 0) { el.textContent = '0'; return; }
  let cur = 0;
  const step = Math.max(1, Math.ceil(val / 30));
  const t = setInterval(() => {
    cur = Math.min(cur + step, val);
    el.textContent = cur;
    if (cur >= val) clearInterval(t);
  }, 40);
}

async function loadFeaturedTournaments() {
  const container = document.getElementById('featuredTournaments');
  if (!container) return;
  try {
    const all = await GHDb.read('tournaments');
    const featured = all.filter(t => t.status === 'ongoing' || t.status === 'registration').slice(0, 3);
    renderCards(container, featured.length ? featured : all.slice(-3).reverse());
  } catch(e) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Failed to load tournaments. Check your config.js setup.</div>`;
  }
}

function renderCards(container, list) {
  if (!list.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <i class="fas fa-gamepad" style="font-size:48px;color:var(--text-dim);display:block;margin-bottom:16px"></i>
      No tournaments yet. Admin can create one!
    </div>`;
    return;
  }
  container.innerHTML = list.map(t => `
    <div class="tournament-card" onclick="location.href='tournament.html?id=${t.id}'" style="cursor:pointer">
      <div class="tc-banner">
        <div class="tc-banner-icon">${escHtml(t.name.substring(0,4).toUpperCase())}</div>
        <div class="tc-status-badge ${getTournamentColor(t.status)}">${getStatusLabel(t.status)}</div>
      </div>
      <div class="tc-body">
        <div class="tc-title">${escHtml(t.name)}</div>
        <div class="tc-meta">
          <span><i class="fas fa-sitemap"></i> ${getFormatLabel(t.format)}</span>
          ${t.startDate ? `<span><i class="fas fa-calendar"></i> ${formatDate(t.startDate)}</span>` : ''}
        </div>
        ${t.description ? `<p style="font-size:13px;color:var(--text-muted);margin-top:6px;line-height:1.5">${escHtml(t.description.substring(0,100))}${t.description.length>100?'...':''}</p>` : ''}
      </div>
      <div class="tc-footer">
        <span class="tc-teams"><i class="fas fa-users"></i> Max ${t.maxTeams||'?'} teams</span>
        ${t.prize ? `<span class="tc-prize"><i class="fas fa-trophy"></i> ${escHtml(t.prize)}</span>` : ''}
      </div>
    </div>
  `).join('');
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
