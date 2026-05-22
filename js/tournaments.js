// ─── Tournaments Page ────────────────────────────────────
let allTournaments = [];

document.addEventListener('DOMContentLoaded', async () => {
  allTournaments = await GHDb.read('tournaments');
  renderList(allTournaments);
  setupFilters();
});

function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });

  document.getElementById('searchInput')?.addEventListener('input', applyFilters);
}

function applyFilters() {
  const filter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
  const query = document.getElementById('searchInput')?.value.toLowerCase() || '';

  let filtered = allTournaments;
  if (filter !== 'all') filtered = filtered.filter(t => t.status === filter);
  if (query) filtered = filtered.filter(t =>
    t.name.toLowerCase().includes(query) ||
    (t.description || '').toLowerCase().includes(query)
  );

  renderList(filtered);
}

function renderList(tournaments) {
  const container = document.getElementById('tournamentsList');
  if (!tournaments.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <i class="fas fa-search" style="font-size:48px;color:var(--text-dim);display:block;margin-bottom:16px"></i>
      No tournaments found.
    </div>`;
    return;
  }

  container.innerHTML = tournaments.slice().reverse().map(t => `
    <div class="tournament-card" onclick="location.href='tournament.html?id=${t.id}'">
      <div class="tc-banner">
        <div class="tc-banner-icon">${escapeHtml(t.name.substring(0,4).toUpperCase())}</div>
        <div class="tc-status-badge ${getTournamentColor(t.status)}">${getStatusLabel(t.status)}</div>
      </div>
      <div class="tc-body">
        <div class="tc-title">${escapeHtml(t.name)}</div>
        <div class="tc-meta">
          <span><i class="fas fa-sitemap"></i> ${getFormatLabel(t.format)}</span>
          ${t.startDate ? `<span><i class="fas fa-calendar"></i> ${formatDate(t.startDate)}</span>` : ''}
          ${t.endDate ? `<span><i class="fas fa-flag-checkered"></i> ${formatDate(t.endDate)}</span>` : ''}
        </div>
        ${t.description ? `<p style="font-size:13px;color:var(--text-muted);line-height:1.5;margin-top:6px">${escapeHtml(t.description).substring(0,120)}${t.description.length > 120 ? '...' : ''}</p>` : ''}
      </div>
      <div class="tc-footer">
        <div class="tc-teams"><i class="fas fa-users"></i> Max ${t.maxTeams || '?'} teams</div>
        ${t.prize ? `<div class="tc-prize"><i class="fas fa-trophy"></i> ${escapeHtml(t.prize)}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
