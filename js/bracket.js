/**
 * Premium Bracket Renderer — MPL Style
 * Handles any number of teams, draws SVG connectors
 */
var BracketRenderer = (function() {

  function getTeam(teams, id) {
    return id ? teams.find(function(t){ return t.id === id; }) : null;
  }

  function cardClass(m) {
    if (m.winnerId) return 'has-winner';
    if (m.status === 'live') return 'live';
    return 'pending';
  }

  function teamRow(m, slot, teams) {
    var tid   = slot === 1 ? m.team1Id : m.team2Id;
    var score = slot === 1 ? m.score1  : m.score2;
    var t     = getTeam(teams, tid);
    var isWin  = m.winnerId && m.winnerId === tid;
    var isLose = m.winnerId && m.winnerId !== tid && tid;
    var cls    = isWin ? 'win' : isLose ? 'lose' : !tid ? 'tbd' : '';
    var sClass = isWin ? 's-gold' : (isLose || !tid) ? 's-dim' : 's-gold';

    var h = '<div class="b2-team ' + cls + '">';
    if (t) {
      h += '<div class="b2-seed ' + sClass + '">' + t.seed + '</div>';
      h += '<span class="b2-name">' + esc(t.name) + '</span>';
      if (m.status === 'completed' && score != null)
        h += '<span class="b2-score" style="color:' + (isWin ? '#FFD700' : '#2a4060') + '">' + score + '</span>';
      if (isWin) h += '<span class="b2-crown">★</span>';
      if (m.status === 'live' && !m.winnerId)
        h += '<span class="b2-live"><span class="b2-live-dot"></span>LIVE</span>';
    } else {
      h += '<span class="b2-name" style="color:#1e3050;font-style:italic;font-size:10px">TBD</span>';
    }
    h += '</div>';
    return h;
  }

  function svgConnector(fromCount) {
    var h = fromCount === 4 ? 174 : fromCount === 2 ? 90 : 46;
    var s = '';
    if (fromCount === 4) {
      var t1 = Math.round(h * 0.125), t2 = Math.round(h * 0.375);
      var b1 = Math.round(h * 0.625), b2 = Math.round(h * 0.875);
      var mid1 = Math.round(h * 0.25), mid2 = Math.round(h * 0.75);
      s  = '<line x1="0" y1="'+t1+'" x2="10" y2="'+t1+'" stroke="#1a3050" stroke-width="1"/>';
      s += '<line x1="10" y1="'+t1+'" x2="10" y2="'+t2+'" stroke="#1a3050" stroke-width="1"/>';
      s += '<line x1="0" y1="'+t2+'" x2="10" y2="'+t2+'" stroke="#1a3050" stroke-width="1"/>';
      s += '<line x1="10" y1="'+mid1+'" x2="20" y2="'+mid1+'" stroke="rgba(255,215,0,.4)" stroke-width="1"/>';
      s += '<line x1="0" y1="'+b1+'" x2="10" y2="'+b1+'" stroke="#1a3050" stroke-width="1"/>';
      s += '<line x1="10" y1="'+b1+'" x2="10" y2="'+b2+'" stroke="#1a3050" stroke-width="1"/>';
      s += '<line x1="0" y1="'+b2+'" x2="10" y2="'+b2+'" stroke="#1a3050" stroke-width="1"/>';
      s += '<line x1="10" y1="'+mid2+'" x2="20" y2="'+mid2+'" stroke="rgba(255,215,0,.4)" stroke-width="1"/>';
    } else {
      var q1 = Math.round(h * 0.25), q3 = Math.round(h * 0.75), mid = Math.round(h * 0.5);
      s  = '<line x1="0" y1="'+q1+'" x2="10" y2="'+q1+'" stroke="#1a3050" stroke-width="1"/>';
      s += '<line x1="10" y1="'+q1+'" x2="10" y2="'+q3+'" stroke="#1a3050" stroke-width="1"/>';
      s += '<line x1="0" y1="'+q3+'" x2="10" y2="'+q3+'" stroke="#1a3050" stroke-width="1"/>';
      s += '<line x1="10" y1="'+mid+'" x2="20" y2="'+mid+'" stroke="rgba(255,215,0,.4)" stroke-width="1"/>';
    }
    return '<div class="b2-conn" style="height:'+h+'px"><svg width="20" height="'+h+'" viewBox="0 0 20 '+h+'" fill="none">'+s+'</svg></div>';
  }

  function render(matches, teams) {
    if (!matches || !matches.length) return '<p class="empty">No bracket yet.</p>';

    var css = '<style>' +
      '.b2-wrap{overflow-x:auto;padding-bottom:10px}' +
      '.b2-inner{display:inline-flex;gap:0;align-items:flex-start;padding:6px 0;min-width:max-content}' +
      '.b2-col{display:flex;flex-direction:column;min-width:152px}' +
      '.b2-hd{font-size:9px;font-weight:900;letter-spacing:2.5px;color:#FFD700;text-transform:uppercase;text-align:center;padding:5px 0 9px;border-bottom:1px solid rgba(255,215,0,.12);margin-bottom:6px;font-family:"Orbitron",monospace}' +
      '.b2-matches{display:flex;flex-direction:column}' +
      '.b2-conn{width:20px;flex-shrink:0}' +
      '.b2-conn svg{overflow:visible;display:block}' +
      '.b2-card{background:#0b1520;border:1px solid #19304a;border-radius:5px;width:144px;overflow:hidden;position:relative;flex-shrink:0;transition:border-color .2s;margin:5px 0}' +
      '.b2-card:hover{border-color:rgba(255,215,0,.35)}' +
      '.b2-card::after{content:"";position:absolute;top:0;left:0;bottom:0;width:3px;border-radius:5px 0 0 5px}' +
      '.b2-card.has-winner::after{background:linear-gradient(180deg,#FFD700,#FF8C00)}' +
      '.b2-card.live::after{background:linear-gradient(180deg,#00FF87,#00b894)}' +
      '.b2-card.pending::after{background:#19304a}' +
      '.b2-mn{position:absolute;top:-6px;left:7px;font-size:8px;font-weight:800;color:#2a4a6a;background:#06090f;padding:0 4px;border-radius:2px;letter-spacing:.8px}' +
      '.b2-team{display:flex;align-items:center;gap:5px;padding:7px 8px 7px 10px;min-height:33px;font-size:11px;font-weight:700;color:#7a95b0;font-family:"Exo 2",sans-serif}' +
      '.b2-team+.b2-team{border-top:1px solid rgba(255,255,255,.05)}' +
      '.b2-team.win{background:rgba(255,215,0,.07);color:#FFD700}' +
      '.b2-team.lose{color:#2a4060}' +
      '.b2-seed{width:15px;height:15px;border-radius:3px;font-size:9px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:"Orbitron",monospace}' +
      '.b2-seed.s-gold{background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.2);color:#FFD700}' +
      '.b2-seed.s-dim{background:rgba(20,36,58,.6);border:1px solid #19304a;color:#2a4a6a}' +
      '.b2-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.b2-score{font-family:"Orbitron",monospace;font-size:12px;font-weight:900;flex-shrink:0}' +
      '.b2-crown{font-size:9px;flex-shrink:0;color:#FFD700}' +
      '.b2-live{font-size:8px;font-weight:900;color:#00FF87;background:rgba(0,255,135,.08);border:1px solid rgba(0,255,135,.2);padding:1px 5px;border-radius:2px;letter-spacing:.5px;display:flex;align-items:center;gap:3px;flex-shrink:0}' +
      '.b2-live-dot{width:5px;height:5px;border-radius:50%;background:#00FF87;animation:b2blink 1s step-end infinite}' +
      '@keyframes b2blink{0%,100%{opacity:1}50%{opacity:0}}' +
      '.b2-champ{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px 12px;min-width:110px;text-align:center}' +
      '.b2-champ-ico{font-size:32px;margin-bottom:8px}' +
      '.b2-champ-lbl{font-family:"Orbitron",monospace;font-size:8px;letter-spacing:3px;color:#FFD700;font-weight:900;margin-bottom:8px;text-transform:uppercase}' +
      '.b2-champ-box{background:#0b1520;border:1px solid rgba(255,215,0,.45);border-radius:5px;padding:9px 13px;font-family:"Exo 2",sans-serif;font-size:12px;font-weight:800;color:#FFD700;white-space:nowrap}' +
      '</style>';

    var rounds = {}, maxR = 0;
    matches.forEach(function(m) {
      var r = m.round || 1;
      if (!rounds[r]) rounds[r] = [];
      rounds[r].push(m);
      if (r > maxR) maxR = r;
    });

    var labels = {};
    labels[maxR]     = 'Grand Final';
    labels[maxR - 1] = 'Semi Finals';
    labels[maxR - 2] = 'Quarter Finals';

    var html = css + '<div class="b2-wrap"><div class="b2-inner">';

    for (var r = 1; r <= maxR; r++) {
      var rMs = (rounds[r] || []).slice().sort(function(a,b){ return (a.matchNumber||0)-(b.matchNumber||0); });
      var lbl = labels[r] || ('Round ' + r);
      var gap    = r === 1 ? 10 : 8 + (r - 1) * 80;
      var padTop = r === 1 ? 0  : Math.round(gap / 2);

      html += '<div class="b2-col">';
      html += '<div class="b2-hd">' + lbl + '</div>';
      html += '<div class="b2-matches" style="gap:' + gap + 'px;padding-top:' + padTop + 'px">';
      rMs.forEach(function(m) {
        html += '<div style="position:relative"><div class="b2-mn">M' + (m.matchNumber||'?') + '</div>';
        html += '<div class="b2-card ' + cardClass(m) + '">';
        html += teamRow(m, 1, teams);
        html += teamRow(m, 2, teams);
        html += '</div></div>';
      });
      html += '</div></div>';

      if (r < maxR) html += svgConnector(rMs.length);
    }

    var fin = (rounds[maxR] || [])[0];
    var champ = fin && fin.winnerId ? getTeam(teams, fin.winnerId) : null;
    html += '<div class="b2-champ"><div class="b2-champ-ico">🏆</div>';
    html += '<div class="b2-champ-lbl">Champion</div>';
    html += '<div class="b2-champ-box">' + (champ ? esc(champ.name) : 'TBD') + '</div></div>';
    html += '</div></div>';
    return html;
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { render: render };
})();
