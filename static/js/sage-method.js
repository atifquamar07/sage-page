/* SAGE method animation: steps through the four stages on the illustrative four-agent
   example from the paper's overview figure. Plays once on first scroll into view; the stage
   buttons jump to a stage and Replay restarts. Scores, parents and votes below follow the
   rules in the paper (rho = q + 0.5 z, K = 2 strictly higher-scoring parents, leader weight 1.5). */
(function () {
  'use strict';

  var root = document.getElementById('sage-anim');
  if (!root) return;

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var IDS = ['A', 'B', 'C', 'D'];
  var COLOR = { A: '#347bc3', B: '#d18c32', C: '#8c63bc', D: '#228c7a' };
  var LAMBDA = 0.5;
  var BETA = 0.5;
  var MOVE_MS = 700;

  // ---------- Illustrative run (N = 4, K = 2) ----------
  var INIT = { A: '42', B: '36', C: '42', D: '24' };
  var REV = { A: '42', B: '42', C: '42', D: '24' };
  var R1 = { A: '42', B: '42', C: '42', D: '24' };
  var R2 = { A: '42', B: '42', C: '42', D: '42' };
  // [answer agreement q, prefix consistency z]
  var SC_INIT = { A: [2 / 4, 1], B: [1 / 4, 0], C: [2 / 4, 0], D: [1 / 4, 0] };
  var SC_REV = { A: [3 / 4, 1], B: [3 / 4, 0], C: [3 / 4, 0], D: [1 / 4, 0] };
  var SC_R1 = { A: [3 / 4, 0], B: [3 / 4, 0], C: [3 / 4, 1], D: [1 / 4, 0] };
  var SC_R2 = { A: [1, 0], B: [1, 0], C: [1, 1], D: [1, 0] };
  var DAG1 = [['A', 'C'], ['A', 'B'], ['C', 'B'], ['A', 'D'], ['C', 'D']];
  var DAG2 = [['C', 'A'], ['C', 'B'], ['C', 'D'], ['A', 'D']];
  var REVIEW_PAIRS = [['A', 'B'], ['A', 'D'], ['C', 'B'], ['C', 'D']];
  var POOL = [
    { label: 'initial', ans: INIT, leader: 'A' },
    { label: 'reviews', ans: REV, leader: 'A' },
    { label: 'round 1', ans: R1, leader: 'C' },
    { label: 'round 2', ans: R2, leader: 'C' }
  ];
  var VOTES = (function () {
    var w = {};
    POOL.forEach(function (row) {
      IDS.forEach(function (id) {
        var a = row.ans[id];
        w[a] = (w[a] || 0) + 1 + BETA * (id === row.leader ? 1 : 0);
      });
    });
    return Object.keys(w).map(function (a) { return [a, w[a]]; })
      .sort(function (x, y) { return y[1] - x[1]; });
  })();

  // ---------- Steps ----------
  var BASE = {
    layout: 'row', query: 'hide', qlinks: false, ans: null, ansDim: false, tags: null,
    score: null, legend: false, crown: null, prompts: false, adapted: false, lock: false,
    bands: false, review: false, edges: null, axis: false, pool: 0, bars: false, final: false
  };
  function S(o) { var s = {}; for (var k in BASE) s[k] = BASE[k]; for (var j in o) s[j] = o[j]; return s; }
  function merge(a, b) { var s = {}; for (var k in a) s[k] = a[k]; for (var j in b) s[j] = b[j]; return s; }

  var STEPS = [
    { stage: 0, hold: 2200,
      caption: 'A query arrives. Four agents with different role prompts each answer it on their own.',
      state: S({ query: 'show', qlinks: true, ans: INIT }) },
    { stage: 0, hold: 3800,
      caption: 'Each answer gets a score ρ: its agreement with the others plus 0.5 if the agent reproduces it when completing the first 60% of its own response.',
      state: S({ query: 'show', qlinks: true, ans: INIT, score: SC_INIT, legend: true }) },
    { stage: 0, hold: 2600,
      caption: 'Higher-scoring agents (A, C) and lower-scoring agents (B, D) review each other and decide to keep or edit their answers.',
      state: S({ layout: 'review', ans: INIT, bands: true, review: true }) },
    { stage: 0, hold: 2200,
      caption: 'B edits its answer to 42. The others keep theirs.',
      state: S({ layout: 'review', ans: REV, bands: true, review: true,
                 tags: { A: 'keep', B: 'edit', C: 'keep', D: 'keep' } }) },
    { stage: 0, hold: 3000,
      caption: 'The kept reviews are rescored. A scores highest and becomes the strategy donor.',
      state: S({ query: 'show', ans: REV, score: SC_REV, legend: true, crown: 'A' }) },
    { stage: 1, hold: 3000,
      caption: 'Strategy transfer uses only the system prompts. The query and every answer stay hidden from the rewriter.',
      state: S({ query: 'dim', ans: REV, ansDim: true, crown: 'A', prompts: true, lock: true }) },
    { stage: 1, hold: 2600,
      caption: 'B, C and D each rewrite their own prompt, adding the donor’s reasoning habits while keeping their role. A keeps its prompt.',
      state: S({ query: 'dim', ans: REV, ansDim: true, crown: 'A', prompts: true, adapted: true, lock: true }),
      pre: { adapted: false }, enter: flyStrategy },
    { stage: 2, hold: 3200,
      caption: 'Round 1 starts from the initial answers. Each agent reads up to K = 2 agents that scored strictly higher, so messages only flow downhill.',
      state: S({ layout: 'dag1', ans: INIT, score: SC_INIT, edges: DAG1, axis: true }) },
    { stage: 2, hold: 2000,
      caption: 'Agents revise in score order: A revises alone, C reads A, then B and D read A and C. B switches to 42.',
      state: S({ layout: 'dag1', ans: R1, score: SC_INIT, edges: DAG1, axis: true }),
      pre: { ans: INIT }, enter: round1 },
    { stage: 2, hold: 3000,
      caption: 'Scores are recomputed and the graph is rebuilt for the next round. C now leads.',
      state: S({ layout: 'dag2', ans: R1, score: SC_R1, edges: DAG2, axis: true }) },
    { stage: 2, hold: 2800,
      caption: 'In round 2, D reads C and A and switches to 42. All answers agree, so collaboration stops early.',
      state: S({ layout: 'dag2', ans: R2, score: SC_R2, edges: DAG2, axis: true }),
      pre: { ans: R1, score: SC_R1 }, enter: round2 },
    { stage: 3, hold: 2000,
      caption: 'The initial answers, the kept reviews and every round go into one pool. Each stage’s leader (gold ring) counts 1.5×.',
      state: S({ layout: 'pool', pool: 4 }),
      pre: { pool: 0 }, enter: fillPool },
    { stage: 3, hold: 4000,
      caption: 'The answer with the largest weighted vote wins: â = 42.',
      state: S({ layout: 'pool', pool: 4, bars: true, final: true }),
      pre: { bars: false, final: false }, enter: growBars }
  ];

  // ---------- DOM ----------
  var canvas = root.querySelector('.sa-canvas');
  var captionEl = root.querySelector('.sa-caption');
  var stageBtns = Array.prototype.slice.call(root.querySelectorAll('.sa-stage'));
  var replayBtn = root.querySelector('.sa-replay');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function div(cls, parent, text) {
    var e = document.createElement('div');
    e.className = cls;
    if (text != null) e.textContent = text;
    (parent || canvas).appendChild(e);
    return e;
  }
  function svgEl(name, attrs, parent) {
    var e = document.createElementNS(SVG_NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  var svg = svgEl('svg', { class: 'sa-svg', 'aria-hidden': 'true' }, canvas);
  var defs = svgEl('defs', {}, svg);
  var marker = svgEl('marker', { id: 'sa-arrow', viewBox: '0 0 10 10', refX: '8', refY: '5',
    markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, defs);
  svgEl('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#94a3b8' }, marker);
  var gAxis = svgEl('g', { class: 'sa-g' }, svg);
  var gQ = svgEl('g', { class: 'sa-g' }, svg);
  var gRev = svgEl('g', { class: 'sa-g' }, svg);
  var gEdges = svgEl('g', { class: 'sa-g' }, svg);
  var gDots = svgEl('g', {}, svg);

  var bands = [div('sa-band', null), div('sa-band', null)];
  bands.forEach(function (b) { canvas.insertBefore(b, svg); });
  bands[0].textContent = 'higher';
  bands[1].textContent = 'lower';

  var query = div('sa-query');
  query.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.5h5l3 3v10H4z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6 7h4M6 9.5h4M6 12h2.5" stroke="currentColor" stroke-width="1.2"/></svg><span>query <i>x</i></span>';
  var lock = div('sa-lock');
  lock.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><span>hidden from the rewriter</span>';
  var legend = div('sa-legend');
  legend.innerHTML = '<span><i class="k-q"></i>agreement</span><span><i class="k-z"></i>prefix consistency</span>';

  var CROWN = '<svg viewBox="0 0 24 16" aria-hidden="true"><path d="M2 14 L3.5 4 L8.5 9 L12 2 L15.5 9 L20.5 4 L22 14 Z" fill="#ebb532" stroke="#b7860f" stroke-width="1"/></svg>';
  var agents = {};
  IDS.forEach(function (id) {
    var el = div('sa-agent');
    el.style.setProperty('--ac', COLOR[id]);
    var a = { el: el };
    a.crown = div('sa-crown', el); a.crown.innerHTML = CROWN;
    a.node = div('sa-node', el, id);
    a.ans = div('sa-ans', el);
    a.tag = div('sa-tag', el);
    a.score = div('sa-score', el);
    var bar = div('sa-bar', a.score);
    a.q = div('sa-q', bar);
    a.z = div('sa-z', bar);
    a.rho = div('sa-rho', a.score);
    a.prompt = div('sa-prompt', el);
    div('sa-pl', a.prompt); div('sa-pl', a.prompt); div('sa-pl sa-pl-short', a.prompt);
    div('sa-pl sa-strat', a.prompt);
    agents[id] = a;
  });

  var poolRows = POOL.map(function (row) {
    var r = { label: div('sa-pool-label', null, row.label), chips: {} };
    IDS.forEach(function (id) {
      var c = div('sa-chip', null, row.ans[id]);
      c.style.setProperty('--ac', COLOR[id]);
      if (id === row.leader) c.classList.add('is-leader');
      r.chips[id] = c;
    });
    return r;
  });
  var maxVote = VOTES[0][1];
  var voteRows = VOTES.map(function (v, i) {
    var el = div('sa-vote' + (i === 0 ? ' is-top' : ''));
    div('sa-vote-k', el, v[0]);
    var track = div('sa-vote-track', el);
    var fill = div('sa-vote-fill', track);
    div('sa-vote-v', el, v[1].toFixed(1));
    return { el: el, fill: fill, value: v[1] };
  });
  var finalEl = div('sa-final');
  finalEl.innerHTML = '<i>â</i> = ' + VOTES[0][0];

  // ---------- Geometry ----------
  function dims() {
    var W = canvas.clientWidth || 800;
    return { W: W, H: W >= 600 ? 350 : 400, wide: W >= 600 };
  }

  function poolGeometry(W, wide) {
    var cx = W / 2, labelW = 76, colW = 52, tableW = labelW + colW * 4;
    var barsW = wide ? 230 : Math.min(W - 40, 300);
    var x0 = wide ? cx - (tableW + 44 + barsW) / 2 : cx - tableW / 2;
    return {
      x0: x0,
      col: IDS.map(function (_, i) { return x0 + labelW + colW * (i + 0.5); }),
      rows: [86, 126, 166, 206],
      bx: wide ? x0 + tableW + 44 : cx - barsW / 2,
      bw: barsW,
      by: wide ? [100, 140, 180] : [256, 290, 324],
      fy: wide ? 236 : 366
    };
  }

  function layoutFor(name, d) {
    var W = d.W, cx = W / 2, span = Math.min(W - 40, 640), p = {};
    if (name === 'row') {
      IDS.forEach(function (id, i) { p[id] = { x: cx + (i - 1.5) * span / 4, y: 156, s: 1 }; });
    } else if (name === 'review') {
      var dx = Math.min(span * 0.22, 120);
      p.A = { x: cx - dx, y: 122, s: 1 }; p.C = { x: cx + dx, y: 122, s: 1 };
      p.B = { x: cx - dx, y: 262, s: 1 }; p.D = { x: cx + dx, y: 262, s: 1 };
    } else if (name === 'dag1' || name === 'dag2') {
      var dd = Math.min(span * 0.25, 150), lv = [72, 172, 272];
      if (name === 'dag1') {
        p.A = { x: cx, y: lv[0] }; p.C = { x: cx, y: lv[1] };
        p.B = { x: cx - dd, y: lv[2] }; p.D = { x: cx + dd, y: lv[2] };
      } else {
        p.C = { x: cx, y: lv[0] }; p.A = { x: cx - dd, y: lv[1] };
        p.B = { x: cx + dd, y: lv[1] }; p.D = { x: cx, y: lv[2] };
      }
      IDS.forEach(function (id) { p[id].s = 1; });
    } else {
      var g = poolGeometry(W, d.wide);
      IDS.forEach(function (id, i) { p[id] = { x: g.col[i], y: 36, s: 0.72 }; });
    }
    return p;
  }

  function place(el, x, y, s, anchorLeft) {
    el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) ' +
      (anchorLeft ? 'translate(0,-50%)' : 'translate(-50%,-50%)') + ' scale(' + (s == null ? 1 : s) + ')';
  }
  function show(el, on) { el.classList.toggle('is-off', !on); }

  // Line between two node centres, trimmed to the node circles (r = 22).
  function edgeD(a, b, trimEnd) {
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len, r = 24;
    return 'M' + (a.x + ux * r).toFixed(1) + ',' + (a.y + uy * r).toFixed(1) +
      'L' + (b.x - ux * (r + trimEnd)).toFixed(1) + ',' + (b.y - uy * (r + trimEnd)).toFixed(1);
  }

  // Rebuilds a group of lines when its key changes (drawing them in), else just moves them.
  function drawLines(group, key, specs, animate) {
    if (group.getAttribute('data-key') !== key) {
      while (group.firstChild) group.removeChild(group.firstChild);
      group.setAttribute('data-key', key);
      specs.forEach(function (sp, i) {
        var path = svgEl('path', { d: sp.d, class: 'sa-line' + (sp.cls ? ' ' + sp.cls : ''), 'data-id': sp.id || '' }, group);
        if (sp.end) path.setAttribute('marker-end', 'url(#sa-arrow)');
        if (sp.start) path.setAttribute('marker-start', 'url(#sa-arrow)');
        if (animate) {
          var L = path.getTotalLength();
          path.style.strokeDasharray = L;
          path.style.strokeDashoffset = L;
          path.style.transition = 'none';
          path.getBoundingClientRect();
          path.style.transition = 'stroke-dashoffset 0.6s ease ' + (0.25 + i * 0.12) + 's';
          path.style.strokeDashoffset = '0';
          setTimeout(function () { path.style.strokeDasharray = ''; path.style.strokeDashoffset = ''; }, 1100 + i * 120);
        }
      });
    } else {
      var paths = group.querySelectorAll('path');
      specs.forEach(function (sp, i) { if (paths[i]) paths[i].setAttribute('d', sp.d); });
    }
  }

  // ---------- Apply a state ----------
  var shownState = null;
  function setAnswer(a, value, animate) {
    if (value == null) return;
    if (a.ans.textContent !== value) {
      a.ans.textContent = value;
      if (animate) { a.ans.classList.remove('pop'); void a.ans.offsetWidth; a.ans.classList.add('pop'); }
    }
  }
  function setScore(a, sc) {
    if (!sc) return;
    var q = sc[0], z = sc[1], total = q + LAMBDA * z;
    a.q.style.width = (q / 1.5 * 100) + '%';
    a.z.style.width = (LAMBDA * z / 1.5 * 100) + '%';
    a.rho.textContent = 'ρ ' + total.toFixed(2);
  }

  function apply(st, animate) {
    var d = dims();
    canvas.style.height = d.H + 'px';
    canvas.setAttribute('data-layout', st.layout);
    canvas.classList.toggle('is-anim', !!animate && !reduced);
    svg.setAttribute('viewBox', '0 0 ' + d.W + ' ' + d.H);
    var pos = layoutFor(st.layout, d);
    var inPool = st.layout === 'pool';

    IDS.forEach(function (id) {
      var a = agents[id], p = pos[id];
      place(a.el, p.x, p.y, p.s);
      setAnswer(a, st.ans && st.ans[id], animate);
      show(a.ans, !!st.ans && !inPool);
      a.ans.classList.toggle('is-dim', !!st.ansDim);
      var tag = st.tags && st.tags[id];
      show(a.tag, !!tag);
      if (tag) { a.tag.textContent = tag; a.tag.classList.toggle('is-edit', tag === 'edit'); }
      show(a.score, !!st.score && !inPool);
      setScore(a, st.score && st.score[id]);
      show(a.crown, st.crown === id);
      show(a.prompt, st.prompts);
      a.prompt.classList.toggle('is-donor', st.prompts && id === 'A');
      if (!st.adapted || id === 'A') a.prompt.classList.remove('is-adapted');
      else a.prompt.classList.add('is-adapted');
    });

    place(query, d.W / 2, 34);
    show(query, st.query !== 'hide');
    query.classList.toggle('is-dim', st.query === 'dim');
    place(lock, d.W / 2, 72);
    show(lock, st.lock);
    place(legend, 14, d.H - 16, 1, true);
    show(legend, st.legend);

    var span = Math.min(d.W - 40, 640), dx = Math.min(span * 0.22, 120);
    var bw = Math.min(d.W - 24, 2 * dx + 170);
    [122, 262].forEach(function (y, i) {
      bands[i].style.width = bw + 'px';
      bands[i].style.height = '112px';
      place(bands[i], d.W / 2, y - 12);
      show(bands[i], st.bands);
    });

    // Query fan-out
    drawLines(gQ, st.qlinks ? 'q' : '', st.qlinks ? IDS.map(function (id) {
      var p = pos[id];
      return { d: 'M' + (d.W / 2) + ',50 V88 H' + p.x.toFixed(1) + ' V' + (p.y - 27), end: true };
    }) : [], animate);
    // Reciprocal review links
    drawLines(gRev, st.review ? 'r' : '', st.review ? REVIEW_PAIRS.map(function (e) {
      return { d: edgeD(pos[e[0]], pos[e[1]], 4), start: true, end: true, cls: 'sa-review' };
    }) : [], animate);
    // Collaboration DAG
    drawLines(gEdges, st.edges ? st.layout : '', st.edges ? st.edges.map(function (e) {
      return { d: edgeD(pos[e[0]], pos[e[1]], 6), end: true, id: e[0] + e[1] };
    }) : [], animate);
    // "higher score" axis
    var dd = Math.min(span * 0.25, 150), ax = Math.max(18, d.W / 2 - dd - 84);
    drawLines(gAxis, st.axis ? 'axis' : '', st.axis ? [{ d: 'M' + ax + ',292 V58', end: true, cls: 'sa-axis' }] : [], false);
    var axisLabel = gAxis.querySelector('text');
    if (st.axis) {
      if (!axisLabel) { axisLabel = svgEl('text', { class: 'sa-axis-label' }, gAxis); axisLabel.textContent = 'higher score'; }
      axisLabel.setAttribute('transform', 'translate(' + (ax - 8) + ',175) rotate(-90)');
    }

    // Pool and vote
    var g = poolGeometry(d.W, d.wide);
    poolRows.forEach(function (r, i) {
      var on = inPool && i < st.pool;
      place(r.label, g.x0, g.rows[i], 1, true);
      show(r.label, on);
      IDS.forEach(function (id, j) { place(r.chips[id], g.col[j], g.rows[i]); show(r.chips[id], on); });
    });
    voteRows.forEach(function (v, i) {
      v.el.style.width = g.bw + 'px';
      place(v.el, g.bx, g.by[i], 1, true);
      show(v.el, inPool && st.bars);
      v.fill.style.transform = 'scaleX(' + (inPool && st.bars ? v.value / maxVote : 0) + ')';
    });
    place(finalEl, g.bx + g.bw / 2, g.fy);
    show(finalEl, inPool && st.final);
    shownState = st;
  }

  // ---------- Sub-animations ----------
  var runId = 0;
  var CANCEL = { cancelled: true };
  function wait(ms, id) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () { if (id === runId) resolve(); else reject(CANCEL); }, ms);
    });
  }

  function pulse(id) {
    var n = agents[id].node;
    n.classList.remove('pulse'); void n.offsetWidth; n.classList.add('pulse');
  }

  function sendAlong(from, to, runToken) {
    var path = gEdges.querySelector('path[data-id="' + from + to + '"]');
    if (!path) return Promise.resolve();
    var L = path.getTotalLength();
    var dot = svgEl('circle', { r: 5, fill: COLOR[from], class: 'sa-dot' }, gDots);
    var t0 = null, dur = 850;
    return new Promise(function (resolve, reject) {
      function frame(t) {
        if (runToken !== runId) { dot.remove(); reject(CANCEL); return; }
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var pt = path.getPointAtLength(e * L);
        dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
        if (k < 1) requestAnimationFrame(frame); else { dot.remove(); resolve(); }
      }
      requestAnimationFrame(frame);
    });
  }
  function send(pairs, id) {
    return Promise.all(pairs.map(function (p) { return sendAlong(p[0], p[1], id); }));
  }

  function round1(id) {
    return wait(MOVE_MS, id)
      .then(function () { pulse('A'); return wait(700, id); })
      .then(function () { return send([['A', 'C']], id); })
      .then(function () { setAnswer(agents.C, '42', true); pulse('C'); return wait(350, id); })
      .then(function () { return send([['A', 'B'], ['C', 'B']], id); })
      .then(function () { setAnswer(agents.B, '42', true); return wait(350, id); })
      .then(function () { return send([['A', 'D'], ['C', 'D']], id); })
      .then(function () { pulse('D'); return wait(300, id); });
  }

  function round2(id) {
    return wait(300, id)
      .then(function () { pulse('C'); return wait(700, id); })
      .then(function () { return send([['C', 'A'], ['C', 'B']], id); })
      .then(function () { pulse('A'); pulse('B'); return wait(300, id); })
      .then(function () { return send([['C', 'D'], ['A', 'D']], id); })
      .then(function () { setAnswer(agents.D, '42', true); return wait(500, id); });
  }

  function flyStrategy(id) {
    var d = dims(), pos = layoutFor('row', d), from = pos.A, tokens = [];
    return wait(500, id).then(function () {
      ['B', 'C', 'D'].forEach(function (t, i) {
        var tok = div('sa-token');
        place(tok, from.x, from.y + 77, 1);
        tokens.push({ el: tok, to: t, i: i });
      });
      void canvas.offsetWidth;
      tokens.forEach(function (tk) {
        tk.el.style.transitionDelay = (tk.i * 0.18) + 's';
        place(tk.el, pos[tk.to].x, pos[tk.to].y + 77, 1);
      });
      return wait(900 + 2 * 180, id);
    }).then(function () {
      tokens.forEach(function (tk) { tk.el.remove(); agents[tk.to].prompt.classList.add('is-adapted'); });
      return wait(300, id);
    }, function (err) {
      tokens.forEach(function (tk) { tk.el.remove(); });
      throw err;
    });
  }

  function fillPool(id) {
    var p = wait(MOVE_MS, id);
    [1, 2, 3, 4].forEach(function (n) {
      p = p.then(function () { apply(merge(shownState, { pool: n }), true); return wait(520, id); });
    });
    return p;
  }

  function growBars(id) {
    return wait(200, id)
      .then(function () { apply(merge(shownState, { bars: true }), true); return wait(1100, id); });
  }

  // ---------- Runner ----------
  var current = 0;
  function setStep(i) {
    current = i;
    var st = STEPS[i].stage;
    captionEl.textContent = STEPS[i].caption;
    stageBtns.forEach(function (b, k) {
      b.classList.toggle('is-active', k === st);
      b.classList.toggle('is-done', k < st);
      b.setAttribute('aria-current', k === st ? 'step' : 'false');
    });
  }

  function jumpTo(i) {
    runId++;
    gDots.replaceChildren();
    root.classList.remove('is-playing');
    setStep(i);
    apply(STEPS[i].state, false);
  }

  function play(from) {
    var id = ++runId;
    gDots.replaceChildren();
    root.classList.add('is-playing');
    var chain = Promise.resolve();
    STEPS.slice(from).forEach(function (step, k) {
      var i = from + k;
      chain = chain.then(function () {
        setStep(i);
        if (step.pre && step.enter && !reduced) {
          apply(merge(step.state, step.pre), true);
          return step.enter(id).then(function () { apply(step.state, true); return wait(step.hold, id); });
        }
        apply(step.state, true);
        return wait(step.hold, id);
      });
    });
    chain.then(function () {
      if (id === runId) root.classList.remove('is-playing');
    }, function (err) { if (err !== CANCEL) throw err; });
  }

  function firstStepOf(stage) {
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].stage === stage) return i;
    return 0;
  }
  function lastStepOf(stage) {
    var last = 0;
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].stage === stage) last = i;
    return last;
  }

  stageBtns.forEach(function (b, k) {
    b.addEventListener('click', function () {
      if (reduced) jumpTo(lastStepOf(k));
      else play(firstStepOf(k));
    });
  });
  if (replayBtn) replayBtn.addEventListener('click', function () { play(0); });

  // Initial frame, then play once the animation scrolls into view.
  root.classList.add('is-ready');
  jumpTo(0);
  if ('ResizeObserver' in window) {
    var lastW = canvas.clientWidth;
    new ResizeObserver(function () {
      var w = canvas.clientWidth;
      if (w && w !== lastW && shownState) {
        lastW = w;
        gQ.removeAttribute('data-key'); gRev.removeAttribute('data-key');
        gEdges.removeAttribute('data-key'); gAxis.removeAttribute('data-key');
        apply(shownState, false);
      }
    }).observe(canvas);
  }
  if (!reduced && 'IntersectionObserver' in window) {
    var started = false;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !started) { started = true; obs.disconnect(); play(0); }
      });
    }, { threshold: 0.35 });
    obs.observe(canvas);
  }
})();
