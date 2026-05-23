// ── Tournaments List Page ─────────────────────────────────
let allTournaments = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    allTournaments = await GHDb.read('tournaments');
  } catch(e) { allTournaments = []; }
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
  const q = document.getElementById('searchInput')?.value.toLowerCase() || '';
  let list = allTournaments;
  if (filter !== 'all') list = list.filter(t => t.status === filter);
  if (q) list = list.filter(t => (t.name||'').toLowerCase().includes(q) || (t.description||'').toLowerCase().includes(q));
  renderList(list);
}

function renderList(list) {
  const container = document.getElementById('tournamentsList');
  if (!container) return;
  if (!list.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <i class="fas fa-search" style="font-size:48px;color:var(--text-dim);display:block;margin-bottom:16px"></i>
      No tournaments found.
    </div>`;
    return;
  }
  container.innerHTML = list.slice().reverse().map(t => `
    <div class="tournament-card" onclick="location.href='tournament.html?id=${t.id}'" style="cursor:pointer">
      <div class="tc-banner">
        <div class="tc-banner-icon">${e(t.name.substring(0,4).toUpperCase())}</div>
        <div class="tc-status-badge ${getTournamentColor(t.status)}">${getStatusLabel(t.status)}</div>
      </div>
      <div class="tc-body">
        <div class="tc-title">${e(t.name)}</div>
        <div class="tc-meta">
          <span><i class="fas fa-sitemap"></i> ${getFormatLabel(t.format)}</span>
          ${t.startDate?`<span><i class="fas fa-calendar"></i> ${formatDate(t.startDate)}</span>`:''}
          ${t.endDate?`<span><i class="fas fa-flag-checkered"></i> ${formatDate(t.endDate)}</span>`:''}
        </div>
        ${t.description?`<p style="font-size:13px;color:var(--text-muted);margin-top:6px;line-height:1.5">${e(t.description.substring(0,120))}${t.description.length>120?'...':''}</p>`:''}
      </div>
      <div class="tc-footer">
        <span class="tc-teams"><i class="fas fa-users"></i> Max ${t.maxTeams||'?'} teams</span>
        ${t.prize?`<span class="tc-prize"><i class="fas fa-trophy"></i> ${e(t.prize)}</span>`:''}
      </div>
    </div>
  `).join('');
}

function e(s) { return escHtml(s); }
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
