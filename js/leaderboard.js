// ─── Leaderboard Page ────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const [tournaments, teams, matches] = await Promise.all([
    GHDb.read('tournaments'),
    GHDb.read('teams'),
    GHDb.read('matches')
  ]);

  const leaderboard = buildLeaderboard(teams, matches, tournaments);
  renderPodium(leaderboard.slice(0, 3));
  renderTable(leaderboard);
});

function buildLeaderboard(teams, matches, tournaments) {
  const stats = {};

  // Init all teams
  teams.forEach(t => {
    stats[t.id] = {
      id: t.id,
      name: t.name,
      tag: t.tag || t.name.substring(0,3).toUpperCase(),
      tournaments: new Set(),
      wins: 0,
      losses: 0,
      championships: 0
    };
  });

  // Tally match results
  matches.filter(m => m.status === 'completed' && m.winnerId).forEach(m => {
    if (stats[m.team1Id]) {
      stats[m.team1Id].tournaments.add(m.tournamentId);
      if (m.winnerId === m.team1Id) stats[m.team1Id].wins++;
      else stats[m.team1Id].losses++;
    }
    if (stats[m.team2Id]) {
      stats[m.team2Id].tournaments.add(m.tournamentId);
      if (m.winnerId === m.team2Id) stats[m.team2Id].wins++;
      else stats[m.team2Id].losses++;
    }
  });

  // Count championships
  tournaments.filter(t => t.status === 'completed' && t.championTeamId).forEach(t => {
    if (stats[t.championTeamId]) stats[t.championTeamId].championships++;
  });

  return Object.values(stats)
    .filter(s => s.wins + s.losses > 0)
    .map(s => ({
      ...s,
      tournaments: s.tournaments.size,
      winRate: s.wins + s.losses > 0
        ? Math.round((s.wins / (s.wins + s.losses)) * 100)
        : 0
    }))
    .sort((a,b) => {
      if (b.championships !== a.championships) return b.championships - a.championships;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.winRate - a.winRate;
    });
}

function renderPodium(top) {
  const wrap = document.getElementById('podiumWrap');
  if (!top.length) { wrap.innerHTML = ''; return; }

  const order = [top[1], top[0], top[2]].filter(Boolean);
  const medals = ['🥈','🥇','🥉'];
  const classes = ['p2','p1','p3'];

  wrap.innerHTML = order.map((team, i) => `
    <div class="podium-item ${classes[i]}">
      <div class="podium-rank">${medals[i]}</div>
      <div class="podium-name">${escapeHtml(team.name)}</div>
      <div class="podium-wins">${team.wins}W – ${team.losses}L</div>
      ${team.championships ? `<div style="font-size:11px;color:var(--gold);margin-top:4px">🏆 ${team.championships} Champ${team.championships > 1 ? 's' : ''}</div>` : ''}
    </div>
  `).join('');
}

function renderTable(leaderboard) {
  const tbody = document.getElementById('leaderboardBody');
  if (!leaderboard.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No data yet. Play some matches!</td></tr>`;
    return;
  }

  tbody.innerHTML = leaderboard.map((team, i) => {
    const rank = i + 1;
    const rankClass = rank === 1 ? 'r1' : rank === 2 ? 'r2' : rank === 3 ? 'r3' : '';
    return `
      <tr>
        <td><span class="lb-rank ${rankClass}">${rank}</span></td>
        <td>
          <div class="lb-team">
            <div class="team-avatar" style="width:32px;height:32px;font-size:10px;min-width:32px">${escapeHtml(team.tag)}</div>
            ${escapeHtml(team.name)}
          </div>
        </td>
        <td>${team.tournaments}</td>
        <td style="color:var(--green);font-weight:700">${team.wins}</td>
        <td style="color:var(--red)">${team.losses}</td>
        <td class="lb-winrate">${team.winRate}%</td>
        <td class="lb-champ">${team.championships || '—'}</td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
