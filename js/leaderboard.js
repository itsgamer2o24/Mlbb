// ── Leaderboard Page ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const [tournaments, teams, matches] = await Promise.all([
    GHDb.read('tournaments'), GHDb.read('teams'), GHDb.read('matches')
  ]);
  const board = buildLeaderboard(teams, matches, tournaments);
  renderPodium(board.slice(0,3));
  renderTable(board);
});

function buildLeaderboard(teams, matches, tournaments) {
  const s = {};
  teams.forEach(t => { s[t.id] = { id:t.id, name:t.name, tag:(t.tag||t.name.substring(0,3)).toUpperCase(), tourns:new Set(), wins:0, losses:0, champs:0 }; });
  matches.filter(m => m.status==='completed' && m.winnerId).forEach(m => {
    [m.team1Id, m.team2Id].forEach(tid => {
      if (!s[tid]) return;
      s[tid].tourns.add(m.tournamentId);
      if (m.winnerId===tid) s[tid].wins++; else s[tid].losses++;
    });
  });
  tournaments.filter(t => t.status==='completed' && t.championTeamId).forEach(t => {
    if (s[t.championTeamId]) s[t.championTeamId].champs++;
  });
  return Object.values(s)
    .filter(x => x.wins+x.losses > 0)
    .map(x => ({ ...x, tournaments:x.tourns.size, winRate: Math.round(x.wins/(x.wins+x.losses)*100) }))
    .sort((a,b) => b.champs-a.champs || b.wins-a.wins || b.winRate-a.winRate);
}

function renderPodium(top) {
  const w = document.getElementById('podiumWrap');
  if (!w || !top.length) return;
  const order = [top[1],top[0],top[2]].filter(Boolean);
  const medals = ['🥈','🥇','🥉'], cls = ['p2','p1','p3'];
  w.innerHTML = order.map((t,i) => `
    <div class="podium-item ${cls[i]}">
      <div class="podium-rank">${medals[i]}</div>
      <div class="podium-name">${e(t.name)}</div>
      <div class="podium-wins">${t.wins}W · ${t.losses}L · ${t.winRate}%</div>
      ${t.champs?`<div style="font-size:11px;color:var(--gold);margin-top:4px">🏆 ${t.champs} Champ${t.champs>1?'s':''}</div>`:''}
    </div>`).join('');
}

function renderTable(board) {
  const tbody = document.getElementById('leaderboardBody');
  if (!tbody) return;
  if (!board.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No match results yet!</td></tr>`;
    return;
  }
  tbody.innerHTML = board.map((t,i) => {
    const rank = i+1;
    const rc = rank===1?'r1':rank===2?'r2':rank===3?'r3':'';
    return `<tr>
      <td><span class="lb-rank ${rc}">${rank}</span></td>
      <td><div class="lb-team">
        <div class="team-avatar" style="width:32px;height:32px;font-size:10px;min-width:32px">${e(t.tag)}</div>
        ${e(t.name)}
      </div></td>
      <td>${t.tournaments}</td>
      <td style="color:var(--green);font-weight:700">${t.wins}</td>
      <td style="color:var(--red)">${t.losses}</td>
      <td class="lb-winrate">${t.winRate}%</td>
      <td class="lb-champ">${t.champs||'—'}</td>
    </tr>`;
  }).join('');
}

function e(s) { if(!s)return''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
