/**
 * Bracket Renderer — Fixed version
 */
const BracketRenderer = (() => {
  function render(matches, teams) {
    if (!matches || !matches.length) return `<p class="empty-state">No matches yet.</p>`;

    const rounds = {};
    let maxRound = 0;
    matches.forEach(m => {
      const r = m.round || 1;
      if (!rounds[r]) rounds[r] = [];
      rounds[r].push(m);
      if (r > maxRound) maxRound = r;
    });

    let html = `<div style="display:inline-flex;align-items:flex-start;gap:0;padding:20px 0">`;
    for (let r = 1; r <= maxRound; r++) {
      const rMatches = (rounds[r]||[]).sort((a,b)=>(a.matchNumber||0)-(b.matchNumber||0));
      html += renderRound(r, rMatches, teams, maxRound, r < maxRound);
    }

    // Champion box
    const lastMatches = rounds[maxRound] || [];
    const final = lastMatches[0];
    if (final && final.winnerId) {
      const champ = teams.find(t => t.id === final.winnerId);
      html += `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 20px;min-width:140px;text-align:center">
          <div style="font-size:40px;margin-bottom:8px">🏆</div>
          <div style="font-family:var(--font-deco);font-size:10px;letter-spacing:3px;color:var(--gold);margin-bottom:8px">CHAMPION</div>
          <div style="background:var(--blue-card);border:1px solid rgba(255,215,0,0.5);border-radius:8px;padding:10px 16px;font-family:var(--font-title);font-size:15px;font-weight:700;color:var(--gold);box-shadow:0 0 20px rgba(255,215,0,0.15)">
            ${e(champ ? champ.name : 'TBD')}
          </div>
        </div>`;
    }
    html += `</div>`;
    return html;
  }

  function getRoundLabel(r, max) {
    const d = max - r;
    if (d === 0) return 'Grand Final';
    if (d === 1) return 'Semi Finals';
    if (d === 2) return 'Quarter Finals';
    return `Round ${r}`;
  }

  function renderRound(round, matches, teams, maxRound, hasNext) {
    const count = matches.length;
    // Vertical space per match grows each round
    const matchSpacing = 16 + (round - 1) * 84;

    let html = `<div style="display:flex;flex-direction:column;min-width:220px">`;
    html += `<div style="font-family:var(--font-deco);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold);text-align:center;padding:8px 0 12px;border-bottom:1px solid rgba(255,215,0,0.15);margin-bottom:8px">${getRoundLabel(round, maxRound)}</div>`;
    html += `<div style="display:flex;flex-direction:column;gap:${matchSpacing}px;flex:1;justify-content:space-evenly;padding:${matchSpacing/2}px 0">`;

    matches.forEach(m => {
      html += renderMatch(m, teams);
    });

    html += `</div></div>`;

    if (hasNext) {
      html += `<div style="display:flex;align-items:center;padding-top:60px">
        <div style="width:24px;height:2px;background:var(--blue-border)"></div>
      </div>`;
    }
    return html;
  }

  function renderMatch(m, teams) {
    const t1 = teams.find(t => t.id === m.team1Id);
    const t2 = teams.find(t => t.id === m.team2Id);
    const w1 = m.winnerId && m.winnerId === m.team1Id;
    const w2 = m.winnerId && m.winnerId === m.team2Id;

    return `
      <div style="position:relative;width:200px">
        <div style="position:absolute;top:-8px;left:8px;font-size:9px;font-weight:700;color:var(--text-dim);background:var(--blue-deep);padding:1px 5px;border-radius:3px;letter-spacing:1px">M${m.matchNumber||'?'}</div>
        <div style="background:var(--blue-card);border:1px solid ${m.winnerId?'rgba(255,215,0,0.25)':'var(--blue-border)'};border-radius:8px;overflow:hidden">
          <div style="display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid rgba(255,255,255,0.04);min-height:38px;background:${w1?'rgba(255,215,0,0.07)':'transparent'}">
            ${t1 ? `<div style="width:18px;height:18px;border-radius:3px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.2);font-size:10px;font-weight:700;color:var(--gold);display:flex;align-items:center;justify-content:center;flex-shrink:0">${t1.seed||'-'}</div>` : ''}
            <span style="flex:1;font-size:13px;font-weight:600;color:${w1?'var(--gold)':w2?'var(--text-dim)':'var(--text)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t1?e(t1.name):'<em style="color:var(--text-dim);font-style:italic;font-size:12px">TBD</em>'}</span>
            <span style="font-family:var(--font-deco);font-size:15px;font-weight:900;color:${w1?'var(--gold)':'var(--text-muted)'}">${m.score1!=null&&m.status==='completed'?m.score1:''}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;padding:9px 12px;min-height:38px;background:${w2?'rgba(255,215,0,0.07)':'transparent'}">
            ${t2 ? `<div style="width:18px;height:18px;border-radius:3px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.2);font-size:10px;font-weight:700;color:var(--gold);display:flex;align-items:center;justify-content:center;flex-shrink:0">${t2.seed||'-'}</div>` : ''}
            <span style="flex:1;font-size:13px;font-weight:600;color:${w2?'var(--gold)':w1?'var(--text-dim)':'var(--text)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t2?e(t2.name):'<em style="color:var(--text-dim);font-style:italic;font-size:12px">TBD</em>'}</span>
            <span style="font-family:var(--font-deco);font-size:15px;font-weight:900;color:${w2?'var(--gold)':'var(--text-muted)'}">${m.score2!=null&&m.status==='completed'?m.score2:''}</span>
          </div>
        </div>
      </div>`;
  }

  function e(s) { if(!s)return''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  return { render };
})();
