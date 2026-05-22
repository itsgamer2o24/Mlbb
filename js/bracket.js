/**
 * Bracket Renderer
 * Renders single-elimination and round-robin brackets
 */
const BracketRenderer = (() => {

  function render(matches, teams) {
    if (!matches.length) return `<p class="empty-state">No matches generated.</p>`;

    // Group by round
    const rounds = {};
    let maxRound = 0;
    matches.forEach(m => {
      const r = m.round || 1;
      if (!rounds[r]) rounds[r] = [];
      rounds[r].push(m);
      if (r > maxRound) maxRound = r;
    });

    let html = '';
    for (let r = 1; r <= maxRound; r++) {
      const roundMatches = (rounds[r] || []).sort((a,b) => (a.matchNumber||0) - (b.matchNumber||0));
      html += renderRound(r, roundMatches, teams, maxRound);
    }

    // Champion
    const lastRoundMatches = rounds[maxRound] || [];
    const final = lastRoundMatches[0];
    if (final && final.winnerId) {
      const champ = teams.find(t => t.id === final.winnerId);
      html += `
        <div class="champion-display">
          <div class="champion-trophy">🏆</div>
          <div class="champion-label">Champion</div>
          <div class="champion-name">${champ ? escHtml(champ.name) : 'TBD'}</div>
        </div>
      `;
    }

    return html;
  }

  function getRoundLabel(round, maxRound) {
    const diff = maxRound - round;
    if (diff === 0) return 'Final';
    if (diff === 1) return 'Semi Finals';
    if (diff === 2) return 'Quarter Finals';
    return `Round ${round}`;
  }

  function renderRound(round, matches, teams, maxRound) {
    const matchesHtml = matches.map(m => renderMatch(m, teams)).join('');
    return `
      <div class="bracket-round">
        <div class="round-label">${getRoundLabel(round, maxRound)}</div>
        <div class="bracket-round-matches" style="gap:${getMatchGap(round)}px">
          ${matchesHtml}
        </div>
      </div>
      ${round < maxRound ? `<div style="width:30px;display:flex;align-items:center;justify-content:center;padding-top:48px">
        <svg width="30" height="100%" style="overflow:visible"><line x1="0" y1="50%" x2="30" y2="50%" stroke="var(--blue-border)" stroke-width="1.5"/></svg>
      </div>` : ''}
    `;
  }

  function getMatchGap(round) {
    // Each subsequent round has larger gaps between matches
    const bases = [8, 92, 188, 380, 764];
    return bases[round - 1] || (bases[bases.length-1] * (round - bases.length + 1));
  }

  function renderMatch(m, teams) {
    const t1 = teams.find(t => t.id === m.team1Id);
    const t2 = teams.find(t => t.id === m.team2Id);

    const t1Class = m.winnerId ? (m.winnerId === m.team1Id ? 'winner' : 'loser') : '';
    const t2Class = m.winnerId ? (m.winnerId === m.team2Id ? 'winner' : 'loser') : '';

    const score1 = m.score1 != null ? m.score1 : '';
    const score2 = m.score2 != null ? m.score2 : '';

    return `
      <div class="bracket-match" style="position:relative">
        <div class="bm-number">M${m.matchNumber || '?'}</div>
        <div class="bm-team ${t1Class || (!t1 ? 'tbd' : '')}">
          ${t1 ? `<div class="bm-seed">${t1.seed||'-'}</div>` : ''}
          <span class="bm-name">${t1 ? escHtml(t1.name) : 'TBD'}</span>
          <span class="bm-score">${score1}</span>
        </div>
        <div class="bm-team ${t2Class || (!t2 ? 'tbd' : '')}">
          ${t2 ? `<div class="bm-seed">${t2.seed||'-'}</div>` : ''}
          <span class="bm-name">${t2 ? escHtml(t2.name) : 'TBD'}</span>
          <span class="bm-score">${score2}</span>
        </div>
      </div>
    `;
  }

  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { render };
})();
