/* Love Lock 🔒 — Made by @hack.n.code
   Plain HTML/CSS/JS + canvas. No libraries. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const qs = new URLSearchParams(location.search);
  const DEMO = qs.get('demo') === '1';
  const clean = (s) => (s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  let name = clean(qs.get('name')) || 'my love';
  const PETS = ['my love', 'sweetheart', 'cutiee', 'baby', 'Jaan'];

  /* ---------- canvas setup ---------- */
  const cv = $('#scene'), cx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildScene();
    layoutDirty = true;
  }

  /* seeded random so the bridge looks the same every visit */
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  let stars = [], locks = [], bulbs = [], city = [], posts = [];
  const LOCK_COLORS = ['#f7c948', '#ff4f8b', '#ff8fb1', '#6ee7d8', '#c9ced8', '#b07cff', '#ff6b4a', '#ffd34e', '#7cc4ff', '#e64a6a'];
  let G = {};
  function buildScene() {
    const r = rng(1404);
    G = { horizon: H * 0.47, railTop: H * 0.565, railMid: H * 0.612, railBot: H * 0.655, deck: H * 0.66, deckB: H * 0.695 };
    stars = [];
    const n = Math.round(W * H / 2600);
    for (let i = 0; i < n; i++) stars.push({ x: r() * W, y: r() * G.horizon * 0.95, s: r() * 1.4 + 0.3, p: r() * 6.28, sp: 0.6 + r() * 2 });
    city = [];
    let x = -10;
    while (x < W + 10) {
      const w = 14 + r() * 30, h = 14 + r() * H * 0.075;
      const win = [];
      for (let yy = 4; yy < h - 4; yy += 6) for (let xx = 3; xx < w - 3; xx += 6) if (r() < 0.32) win.push([xx, yy, r()]);
      city.push({ x, w, h, win }); x += w + r() * 4;
    }
    posts = [W * 0.06, W * 0.5, W * 0.94];
    bulbs = [];
    const bc = ['#ffe9a8', '#ffd0e6', '#fff4d6', '#ffc78a', '#ffb3d1'];
    for (let k = 0; k < posts.length - 1; k++) {
      for (let row = 0; row < 2; row++) {
        const x0 = posts[k], x1 = posts[k + 1], y0 = G.railTop - H * (0.10 - row * 0.035), sag = H * (0.045 + row * 0.01);
        const cnt = Math.max(8, Math.round((x1 - x0) / 13));
        for (let i = 1; i < cnt; i++) { const t = i / cnt; bulbs.push({ x: x0 + (x1 - x0) * t, y: y0 + sag * 4 * t * (1 - t), c: bc[(i + row) % bc.length], p: r() * 6.28, row }); }
      }
    }
    locks = [];
    const lc = Math.round(W / 6.5);
    for (let i = 0; i < lc; i++) {
      const onMid = r() < 0.45;
      locks.push({ x: 4 + r() * (W - 8), y: onMid ? G.railMid : G.railTop, s: 6 + r() * 5, c: LOCK_COLORS[Math.floor(r() * LOCK_COLORS.length)], p: r() * 6.28, heart: r() < 0.25 });
    }
    locks.sort((a, b) => a.y - b.y);
  }

  /* ---------- state ---------- */
  let phase = 'intro', phaseT = 0, now = 0, lockedAt = 0;
  const P = [], hearts = [], ripples = [], rockets = [], sparks = [];
  let lockAnim = { show: 0, shackle: 1, engrave: 0, flash: 0, shake: 0, y: 0, size: 0, glow: 0 };
  let keyAnim = { show: 0, x: 0, y: 0, rot: 0, s: 1, thrown: false, t0: 0, from: null, to: null };
  let finalGeom = null, layoutDirty = true, nextFw = 0, nextHeart = 0;
  function setPhase(p) { phase = p; phaseT = now; document.body.dataset.phase = p; }

  /* ---------- audio (WebAudio synth) ---------- */
  let AC = null, master = null, musicOn = false, musicTimer = null, nextNoteT = 0, step = 0, delayNode = null;
  function ensureAudio() {
    if (AC) return AC;
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      AC = new C(); master = AC.createGain(); master.gain.value = 0.7; master.connect(AC.destination);
      delayNode = AC.createDelay(1.0); delayNode.delayTime.value = 0.36;
      const fb = AC.createGain(); fb.gain.value = 0.32; const dl = AC.createGain(); dl.gain.value = 0.35;
      delayNode.connect(fb); fb.connect(delayNode); delayNode.connect(dl); dl.connect(master);
    } catch (e) { AC = null; }
    return AC;
  }
  function tone(f, t, dur, vol, type, toDelay) {
    if (!AC) return;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); if (toDelay && delayNode) g.connect(delayNode);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, vol, f0, f1, type) {
    if (!AC) return;
    const len = Math.max(1, Math.floor(AC.sampleRate * dur)), b = AC.createBuffer(1, len, AC.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = AC.createBufferSource(); s.buffer = b;
    const fl = AC.createBiquadFilter(); fl.type = type || 'lowpass'; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = AC.createGain(); g.gain.value = vol;
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t);
  }
  const SFX = {
    click() { if (!AC) return; const t = AC.currentTime; noise(t, 0.06, 0.9, 6000, 2500, 'highpass'); tone(2093, t + 0.02, 0.5, 0.18, 'sine', true); tone(3136, t + 0.03, 0.4, 0.1, 'sine', true); tone(140, t, 0.12, 0.4, 'triangle'); },
    sparkle() { if (!AC) return; const t = AC.currentTime; [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, t + i * 0.07, 0.6, 0.07, 'sine', true)); },
    whoosh() { if (!AC) return; noise(AC.currentTime, 0.7, 0.35, 600, 3000, 'bandpass'); },
    splash() { if (!AC) return; const t = AC.currentTime; noise(t, 0.9, 0.8, 2500, 300, 'lowpass'); tone(90, t, 0.3, 0.3, 'sine'); },
    pop() { if (!AC) return; const t = AC.currentTime; noise(t, 0.5, 0.35, 1800, 200, 'lowpass'); },
    scratch() { if (!AC) return; noise(AC.currentTime, 0.08, 0.06, 4000, 4000, 'bandpass'); }
  };
  // romantic progression: Fmaj7 - G6 - Em7 - Am7 (soft music-box arpeggios + pad)
  const CH = [[53, 57, 60, 64, 65, 69], [55, 59, 62, 64, 67, 71], [52, 55, 59, 62, 64, 67], [57, 60, 64, 67, 69, 72]];
  const ARP = [0, 2, 3, 4, 5, 4, 3, 2];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function schedMusic() {
    if (!AC || !musicOn) return;
    const spb = 60 / 76 / 2;
    while (nextNoteT < AC.currentTime + 0.25) {
      const bar = Math.floor(step / 8) % 4, i = step % 8, ch = CH[bar];
      tone(mtof(ch[ARP[i]] + 12), nextNoteT, 1.1, 0.07, 'triangle', true);
      if (i === 0) { tone(mtof(ch[0] - 12), nextNoteT, 3.0, 0.11, 'sine'); [1, 2, 3].forEach(k => tone(mtof(ch[k]), nextNoteT, 3.2, 0.025, 'sine')); }
      if (i === 4 && bar % 2 === 1) tone(mtof(ch[5] + 24), nextNoteT, 0.9, 0.025, 'sine', true);
      nextNoteT += spb; step++;
    }
  }
  function setMusic(on) {
    if (on && !ensureAudio()) return;
    musicOn = on;
    const b = $('#music'); b.textContent = on ? '🎵' : '🔇'; b.classList.toggle('on', on);
    if (on) { if (AC.state === 'suspended') AC.resume(); nextNoteT = AC.currentTime + 0.05; clearInterval(musicTimer); musicTimer = setInterval(schedMusic, 60); }
    else clearInterval(musicTimer);
  }
  $('#music').addEventListener('click', (e) => { e.stopPropagation(); setMusic(!musicOn); });
  // first real touch unlocks audio (browsers need a gesture)
  function gesture(e) { if (e.isTrusted && !AC) { ensureAudio(); if (!DEMO) setMusic(true); } }
  window.addEventListener('pointerdown', gesture, { passive: true });
  window.addEventListener('keydown', gesture);

  /* ---------- drawing helpers ---------- */
  function heartPath(c, x, y, s) {
    c.beginPath(); c.moveTo(x, y + s * 0.3);
    c.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
    c.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
    c.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
    c.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3); c.closePath();
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function glow(c, x, y, r, col, a) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalAlpha = 1; }

  /* the hero padlock (also used for the downloadable card) */
  function drawPadlock(c, x, y, S, o) {
    // x,y = body centre
    const bw = S, bh = S * 0.82, top = y - bh / 2, r = S * 0.3, th = S * 0.115;
    const lift = (1 - o.shackle) * S * 0.36;
    // aura
    if (o.glow > 0) glow(c, x, y - S * 0.15, S * 1.25, 'rgba(255,205,90,0.55)', o.glow);
    // shackle
    c.save(); c.lineCap = 'round'; c.lineWidth = th;
    const sg = c.createLinearGradient(x - r, 0, x + r, 0);
    sg.addColorStop(0, '#8d6a1c'); sg.addColorStop(0.3, '#fff1b8'); sg.addColorStop(0.55, '#d8a634'); sg.addColorStop(1, '#7a5512');
    c.strokeStyle = sg;
    const legL = top + S * 0.12 - lift, archY = top - S * 0.26 - lift;
    c.beginPath(); c.moveTo(x - r, legL); c.lineTo(x - r, archY); c.arc(x, archY, r, Math.PI, 0); c.lineTo(x + r, top + S * 0.12); c.stroke();
    c.restore();
    // body
    const g = c.createLinearGradient(x - bw / 2, top, x + bw / 2, top + bh);
    g.addColorStop(0, '#fff6c4'); g.addColorStop(0.25, '#f9d55a'); g.addColorStop(0.6, '#e2a82b'); g.addColorStop(1, '#9b6410');
    c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = S * 0.12; c.shadowOffsetY = S * 0.05;
    rr(c, x - bw / 2, top, bw, bh, S * 0.16); c.fillStyle = g; c.fill(); c.restore();
    // bevel + shine
    c.save(); rr(c, x - bw / 2, top, bw, bh, S * 0.16); c.clip();
    c.lineWidth = S * 0.05; c.strokeStyle = 'rgba(255,250,220,0.55)'; rr(c, x - bw / 2 + S * 0.04, top + S * 0.04, bw - S * 0.08, bh - S * 0.08, S * 0.12); c.stroke();
    const sh = c.createLinearGradient(x - bw / 2, top, x - bw / 2 + bw * 0.6, top + bh);
    sh.addColorStop(0, 'rgba(255,255,255,0.55)'); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); c.fillStyle = sh; c.fillRect(x - bw / 2, top, bw, bh);
    // moving gleam
    const gx = x - bw + ((now * 0.00035) % 1) * bw * 3;
    const gl = c.createLinearGradient(gx - S * 0.2, 0, gx + S * 0.2, 0); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gl; c.fillRect(x - bw / 2, top, bw, bh);
    c.restore();
    // keyhole
    c.fillStyle = 'rgba(70,40,0,0.85)';
    c.beginPath(); c.arc(x, top + bh * 0.8, S * 0.045, 0, 6.29); c.fill();
    c.beginPath(); c.moveTo(x - S * 0.025, top + bh * 0.8); c.lineTo(x + S * 0.025, top + bh * 0.8); c.lineTo(x + S * 0.04, top + bh * 0.93); c.lineTo(x - S * 0.04, top + bh * 0.93); c.fill();
    // engraving
    if (o.engrave > 0) engrave(c, x, top, bw, bh, S, o.engrave, o.name);
    // flash
    if (o.flash > 0) { glow(c, x, top, S * 1.6, 'rgba(255,255,230,0.95)', o.flash); }
  }
  function engraveLines(n) { return ['You +', n]; }
  function engrave(c, x, top, bw, bh, S, k, nm) {
    const lines = engraveLines(nm);
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    let fs1 = S * 0.2, fs2 = S * 0.23;
    c.font = `700 ${fs2}px "Dancing Script", cursive`;
    const nameW = c.measureText(lines[1]).width + fs2 * 0.9;
    if (nameW > bw * 0.84) fs2 *= (bw * 0.84) / nameW;
    const y1 = top + bh * 0.25, y2 = top + bh * 0.53;
    // total "ink" to reveal: line1 then line2 then heart
    const parts = [{ t: lines[0], y: y1, fs: fs1 }, { t: lines[1], y: y2, fs: fs2 }];
    let tip = null;
    const kk = Math.min(1, k) * 2.4; // 0..1 line1, 1..2 line2, 2..2.4 heart
    parts.forEach((p, i) => {
      const pk = Math.max(0, Math.min(1, kk - i)); if (pk <= 0) return;
      c.font = `700 ${p.fs}px "Dancing Script", cursive`;
      const tw = c.measureText(p.t).width, hx = i === 1 ? p.fs * 0.45 : 0;
      const x0 = x - tw / 2 - hx;
      c.save(); c.beginPath(); c.rect(x0 - 4, p.y - p.fs, tw * pk + 4, p.fs * 2); c.clip();
      c.fillStyle = 'rgba(255,248,215,0.75)'; c.fillText(p.t, x - hx + 1, p.y + 1.2);
      c.fillStyle = '#6b4205'; c.fillText(p.t, x - hx, p.y);
      c.restore();
      if (pk < 1) tip = { x: x0 + tw * pk, y: p.y + Math.sin(now * 0.05) * p.fs * 0.25 };
      if (i === 1 && kk > 2) {
        const hk = Math.min(1, (kk - 2) / 0.4), hs = p.fs * 0.75 * (0.4 + 0.6 * hk);
        const hxp = x0 + tw + p.fs * 0.5;
        c.globalAlpha = hk; heartPath(c, hxp, p.y - hs * 0.5, hs); c.fillStyle = '#e8285e'; c.fill();
        c.strokeStyle = 'rgba(107,66,5,0.8)'; c.lineWidth = 1.2; c.stroke(); c.globalAlpha = 1;
        if (hk < 1) tip = { x: hxp, y: p.y };
      }
    });
    c.restore();
    if (tip && k < 1 && c === cx) {
      glow(c, tip.x, tip.y, S * 0.16, 'rgba(255,240,180,0.95)', 0.9);
      if (Math.random() < 0.7) sparks.push({ x: tip.x, y: tip.y, vx: (Math.random() - 0.5) * 2.5, vy: -Math.random() * 2.2, l: 1, c: '#fff3b0', s: 1 + Math.random() * 1.6 });
    }
  }
  function drawKey(c, x, y, s, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    const g = c.createLinearGradient(-s, -s, s, s); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#f2c043'); g.addColorStop(1, '#a8700f');
    c.fillStyle = g; c.strokeStyle = 'rgba(90,55,0,0.7)'; c.lineWidth = Math.max(1, s * 0.04);
    // heart-shaped bow
    heartPath(c, -s * 0.62, -s * 0.36, s * 0.72); c.fill(); c.stroke();
    c.fillStyle = 'rgba(60,30,0,0.6)'; heartPath(c, -s * 0.62, -s * 0.18, s * 0.3); c.fill();
    c.fillStyle = g;
    rr(c, -s * 0.3, -s * 0.07, s * 1.2, s * 0.14, s * 0.06); c.fill(); c.stroke();
    c.fillRect(s * 0.6, s * 0.05, s * 0.1, s * 0.2); c.fillRect(s * 0.78, s * 0.05, s * 0.1, s * 0.28);
    c.restore();
  }

  /* ---------- scene render ---------- */
  function drawScene(t) {
    const c = cx;
    const sky = c.createLinearGradient(0, 0, 0, G.horizon);
    sky.addColorStop(0, '#060322'); sky.addColorStop(0.55, '#170b44'); sky.addColorStop(1, '#43205f');
    c.fillStyle = sky; c.fillRect(0, 0, W, G.horizon + 1);
    // stars
    for (const s of stars) { const a = 0.45 + 0.55 * Math.sin(t * 0.001 * s.sp + s.p); c.globalAlpha = Math.max(0.1, a); c.fillStyle = '#fff'; c.fillRect(s.x, s.y, s.s, s.s); }
    c.globalAlpha = 1;
    // moon
    const mx = W * 0.8, my = H * 0.1, mr = Math.min(W, H) * 0.06;
    glow(c, mx, my, mr * 4, 'rgba(255,236,200,0.35)', 1);
    c.fillStyle = '#fff3d6'; c.beginPath(); c.arc(mx, my, mr, 0, 6.29); c.fill();
    c.fillStyle = 'rgba(220,200,170,0.35)'; c.beginPath(); c.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.18, 0, 6.29); c.arc(mx + mr * 0.25, my + mr * 0.3, mr * 0.12, 0, 6.29); c.fill();
    // city skyline
    const hz = G.horizon;
    c.fillStyle = '#120a2e';
    for (const b of city) {
      c.fillRect(b.x, hz - b.h, b.w, b.h);
      for (const w of b.win) { const on = 0.6 + 0.4 * Math.sin(t * 0.0007 + w[2] * 20); c.fillStyle = `rgba(255,${200 + w[2] * 40 | 0},140,${0.35 + 0.45 * on * w[2]})`; c.fillRect(b.x + w[0], hz - b.h + w[1], 2.2, 2.6); }
      c.fillStyle = '#120a2e';
    }
    // river
    const rv = c.createLinearGradient(0, hz, 0, H);
    rv.addColorStop(0, '#2a1650'); rv.addColorStop(0.35, '#130a35'); rv.addColorStop(1, '#070418');
    c.fillStyle = rv; c.fillRect(0, hz, W, H - hz);
    // reflections: moon + city + lights shimmer
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let yy = hz + 2; yy < H; yy += 4) {
      const k = (yy - hz) / (H - hz), wob = Math.sin(yy * 0.13 + t * 0.003) * (4 + k * 18);
      c.globalAlpha = 0.16 * (1 - k * 0.6); c.fillStyle = '#ffe9b0';
      const w = mr * (1.2 + k * 1.5) * (0.6 + 0.4 * Math.sin(yy * 0.31 + t * 0.004));
      c.fillRect(mx - w / 2 + wob, yy, w, 1.6);
      if (yy > G.deckB) { c.globalAlpha = 0.09 * (1 - k); c.fillStyle = '#ff9ac1'; for (let q = 0; q < 5; q++) { const qx = (q + 0.5) * W / 5 + Math.sin(yy * 0.2 + q + t * 0.002) * 10; c.fillRect(qx - 8, yy, 16 + Math.sin(yy + q) * 6, 1.4); } }
    }
    c.restore(); c.globalAlpha = 1;
    // ripples & splash (in water, behind bridge if above deck)
    drawRipples(c);
    // bridge: piers + arches
    const archTop = G.deckB, pierW = W * 0.07;
    c.fillStyle = '#1d0f3a';
    c.fillRect(0, G.deck, W, G.deckB - G.deck);
    const nA = 3;
    for (let i = 0; i <= nA; i++) {
      const px = i * W / nA;
      c.fillStyle = '#170b31'; c.fillRect(px - pierW / 2, archTop, pierW, H * 0.06);
    }
    c.strokeStyle = '#26144a'; c.lineWidth = 6;
    for (let i = 0; i < nA; i++) { const ax = (i + 0.5) * W / nA, aw = W / nA - pierW; c.beginPath(); c.ellipse(ax, archTop + H * 0.06, aw / 2, H * 0.055, 0, Math.PI, 0); c.stroke(); }
    // deck edge glow
    const de = c.createLinearGradient(0, G.deck, 0, G.deckB); de.addColorStop(0, '#3a2068'); de.addColorStop(1, '#1d0f3a'); c.fillStyle = de; c.fillRect(0, G.deck, W, G.deckB - G.deck);
    c.fillStyle = 'rgba(255,200,120,0.35)'; c.fillRect(0, G.deck, W, 1.5);
    // lamp posts
    for (const px of posts) {
      c.fillStyle = '#2a1850'; c.fillRect(px - 2.5, G.railTop - H * 0.13, 5, H * 0.13 + (G.deck - G.railTop));
      glow(c, px, G.railTop - H * 0.135, 46, 'rgba(255,214,140,0.65)', 0.9);
      c.fillStyle = '#ffe6a8'; c.beginPath(); c.arc(px, G.railTop - H * 0.135, 5, 0, 6.29); c.fill();
    }
    // fairy light wires + bulbs
    c.strokeStyle = 'rgba(40,25,60,0.9)'; c.lineWidth = 1;
    for (let k = 0; k < posts.length - 1; k++) for (let row = 0; row < 2; row++) {
      const x0 = posts[k], x1 = posts[k + 1], y0 = G.railTop - H * (0.10 - row * 0.035), sag = H * (0.045 + row * 0.01);
      c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, y0 + sag * 2, x1, y0); c.stroke();
    }
    for (const b of bulbs) {
      const a = 0.55 + 0.45 * Math.sin(t * 0.0025 + b.p);
      glow(c, b.x, b.y + 2, 9, b.c, 0.5 * a);
      c.globalAlpha = 0.6 + 0.4 * a; c.fillStyle = b.c; c.beginPath(); c.arc(b.x, b.y + 2, 1.9, 0, 6.29); c.fill(); c.globalAlpha = 1;
    }
    // railing
    c.fillStyle = '#2b1752';
    for (let bx = 0; bx < W; bx += 22) c.fillRect(bx, G.railTop, 2.2, G.railBot - G.railTop);
    c.fillStyle = '#4a2c7c'; c.fillRect(0, G.railTop - 2, W, 4); c.fillRect(0, G.railMid - 1, W, 2.5); c.fillRect(0, G.railBot - 1, W, 3);
    c.fillStyle = 'rgba(255,214,140,0.4)'; c.fillRect(0, G.railTop - 2, W, 1);
    // padlocks on the railing
    for (const L of locks) drawMiniLock(c, L, t);
    // your lock, hanging on the rail after the throw
    if (lockAnim.onRail) drawMiniLock(c, lockAnim.onRail, t, true);
  }
  function drawMiniLock(c, L, t, mine) {
    const sw = Math.sin(t * 0.0016 + L.p) * 0.12;
    c.save(); c.translate(L.x, L.y); c.rotate(sw);
    const s = L.s;
    c.strokeStyle = '#cfd3dc'; c.lineWidth = s * 0.22;
    c.beginPath(); c.arc(0, s * 0.35, s * 0.32, Math.PI, 0); c.lineTo(s * 0.32, s * 0.7); c.moveTo(-s * 0.32, s * 0.35); c.lineTo(-s * 0.32, s * 0.7); c.stroke();
    c.fillStyle = L.c;
    if (L.heart) { heartPath(c, 0, s * 0.45, s * 1.15); c.fill(); }
    else { rr(c, -s * 0.5, s * 0.6, s, s * 0.85, s * 0.2); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(-s * 0.35, s * 0.72, s * 0.18, s * 0.45);
    if (mine) glow(c, 0, s, s * 3, 'rgba(255,214,90,0.7)', 0.6 + 0.4 * Math.sin(t * 0.004));
    c.restore();
  }
  function drawRipples(c) {
    for (const r of ripples) {
      const a = Math.max(0, 1 - r.age / r.life);
      c.strokeStyle = `rgba(255,220,240,${a * 0.75})`; c.lineWidth = 2;
      c.beginPath(); c.ellipse(r.x, r.y, r.r, r.r * 0.28, 0, 0, 6.29); c.stroke();
    }
  }

  /* ---------- particles ---------- */
  function burst(x, y, n, cols, spd, heart) {
    for (let i = 0; i < n; i++) {
      let vx, vy;
      if (heart) { const a = (i / n) * Math.PI * 2; vx = 16 * Math.pow(Math.sin(a), 3); vy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); vx *= spd / 16; vy *= spd / 16; }
      else { const a = Math.random() * 6.283, v = spd * (0.35 + Math.random() * 0.65); vx = Math.cos(a) * v; vy = Math.sin(a) * v; }
      P.push({ x, y, vx, vy, l: 1, d: 0.008 + Math.random() * 0.006, c: cols[i % cols.length], s: 1.8 + Math.random() * 2.0 });
    }
  }
  function launchFirework() {
    const cols = [['#ff4f8b', '#ffd34e', '#fff'], ['#ff9ac1', '#ff4f8b'], ['#ffd34e', '#fff3b0'], ['#b07cff', '#ff9ac1', '#fff'], ['#6ee7d8', '#fff']];
    rockets.push({ x: W * (0.12 + Math.random() * 0.76), y: G.horizon, tx: 0, ty: H * (0.06 + Math.random() * 0.22), vy: -(H * 0.012 + Math.random() * H * 0.004), c: cols[Math.floor(Math.random() * cols.length)], heart: Math.random() < 0.4 });
  }
  function spawnHearts(x, y, n, spread) {
    for (let i = 0; i < n; i++) hearts.push({ x: x + (Math.random() - 0.5) * spread, y: y + Math.random() * 8, vy: -(0.6 + Math.random() * 1.1), s: 8 + Math.random() * 16, p: Math.random() * 6.28, l: 1, c: ['#ff4f8b', '#ff8fb1', '#ff2e63', '#ffc2da'][i % 4], d: Math.random() * 25 });
  }
  function stepParticles(dt) {
    const f = dt / 16.67;
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.x += p.vx * f; p.y += p.vy * f; p.vy += 0.045 * f; p.vx *= 0.985; p.vy *= 0.985; p.l -= p.d * f; if (p.l <= 0) P.splice(i, 1); }
    for (let i = sparks.length - 1; i >= 0; i--) { const p = sparks[i]; p.x += p.vx * f; p.y += p.vy * f; p.vy += 0.06 * f; p.l -= 0.03 * f; if (p.l <= 0) sparks.splice(i, 1); }
    for (let i = rockets.length - 1; i >= 0; i--) { const r = rockets[i]; r.y += r.vy * f; r.vy *= 0.985; P.push({ x: r.x, y: r.y, vx: (Math.random() - 0.5) * 0.4, vy: 0.6, l: 0.6, d: 0.04, c: '#ffe6b0', s: 1.3 }); if (r.y <= r.ty || r.vy > -1.5) { burst(r.x, r.y, r.heart ? 84 : 90, r.c, r.heart ? 4.6 : 5.6, r.heart); P.push({ x: r.x, y: r.y, vx: 0, vy: 0, l: 1, d: 0.07, c: '#fff6d0', s: 12 }); SFX.pop(); rockets.splice(i, 1); } }
    for (let i = hearts.length - 1; i >= 0; i--) { const h = hearts[i]; if (h.d > 0) { h.d -= f; continue; } h.y += h.vy * f; h.x += Math.sin(now * 0.003 + h.p) * 0.5 * f; if (h.y < H * 0.35) h.l -= 0.012 * f; if (h.l <= 0 || h.y < -30) hearts.splice(i, 1); }
    for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i]; r.age += dt; r.r += r.v * f; if (r.age > r.life) ripples.splice(i, 1); }
  }
  function drawParticles(c) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const p of P) { c.globalAlpha = Math.max(0, p.l); c.fillStyle = p.c; c.beginPath(); c.arc(p.x, p.y, p.s, 0, 6.29); c.fill(); }
    for (const p of sparks) { c.globalAlpha = Math.max(0, p.l); c.fillStyle = p.c; c.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
    c.restore(); c.globalAlpha = 1;
    for (const h of hearts) { if (h.d > 0) continue; c.globalAlpha = Math.max(0, Math.min(1, h.l)); heartPath(c, h.x, h.y - h.s / 2, h.s); c.fillStyle = h.c; c.shadowColor = h.c; c.shadowBlur = 10; c.fill(); c.shadowBlur = 0; }
    c.globalAlpha = 1;
  }
  function starBurst(x, y, n, R) {
    for (let i = 0; i < n; i++) { const a = (i / n) * 6.283, v = 2.5 + Math.random() * 3.5; sparks.push({ x: x + Math.cos(a) * R * 0.3, y: y + Math.sin(a) * R * 0.3, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, l: 1.3, c: i % 3 ? '#fff3b0' : '#ff9ac1', s: 2 + Math.random() * 3 }); }
  }

  /* ---------- layout of the hero lock per phase ---------- */
  function lockTarget() {
    if (phase === 'final' || phase === 'fireworks') {
      if (layoutDirty || !finalGeom) {
        const t = $('#ftitle').getBoundingClientRect(), p = $('#fpanel').getBoundingClientRect();
        const top = t.bottom + 8, bot = p.top - 6, room = Math.max(60, bot - top);
        const S = Math.max(56, Math.min(W * 0.42, room * 0.66, 190));
        finalGeom = { y: top + 1.06 * S + Math.max(0, room - 1.5 * S) / 2, S }; layoutDirty = false;
      }
      return finalGeom;
    }
    const S = Math.min(W * 0.52, H * 0.27, 240);
    return { y: Math.max(H * 0.38, 62 + 1.4 * S), S };
  }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  /* ---------- main loop ---------- */
  let last = 0;
  function frame(ts) {
    const dt = last ? Math.min(50, ts - last) : 16.67; last = ts; now = ts;
    const t = ts;
    const pt = (t - phaseT) / 1000;
    // phase logic
    if (phase === 'engrave') {
      lockAnim.show = Math.min(1, pt / 0.6); lockAnim.engrave = Math.max(0, Math.min(1, (pt - 0.7) / 2.8)); lockAnim.glow = 0.4 * lockAnim.show;
      if (lockAnim.engrave > 0 && lockAnim.engrave < 1 && Math.floor(t / 90) !== lockAnim._sc) { lockAnim._sc = Math.floor(t / 90); SFX.scratch(); }
      if (pt > 3.8) { setPhase('closing'); }
    } else if (phase === 'closing') {
      const k = Math.min(1, pt / 0.32); lockAnim.shackle = 1 - Math.pow(1 - k, 3) * 0 - (1 - k * k);
      lockAnim.shackle = k * k;
      if (k >= 1 && !lockAnim.clicked) {
        lockAnim.clicked = true; lockAnim.flash = 1; lockAnim.shake = 1; lockedAt = Date.now();
        try { localStorage.setItem('lovelock', JSON.stringify({ name, at: lockedAt })); } catch (e) {}
        SFX.click(); setTimeout(SFX.sparkle, 120);
        const g = lockTarget(); starBurst(W / 2, g.y - g.S * 0.4, 46, g.S); hint('Click! 🔒 Locked.');
      }
      if (pt > 1.6) { setPhase('key'); keyAnim.show = 0; hint('Swipe up ↑ to throw the key in the river 🗝️'); }
    } else if (phase === 'key') {
      keyAnim.show = Math.min(1, pt / 0.5);
    } else if (phase === 'throw') {
      const k = Math.min(1, pt / 1.25), f = keyAnim.from, to = keyAnim.to;
      keyAnim.x = f.x + (to.x - f.x) * k; keyAnim.y = f.y + (to.y - f.y) * k - Math.sin(k * Math.PI) * H * 0.22;
      keyAnim.rot = k * Math.PI * 5; keyAnim.s = 1 - 0.72 * k;
      if (k >= 1) splash();
    } else if (phase === 'splash') {
      if (pt > 1.9) goFinal();
    }
    // lock positioning
    const g = lockTarget();
    lockAnim.y += ((g.y) - lockAnim.y) * (phase === 'final' || phase === 'fireworks' ? 0.08 : 1);
    lockAnim.size += (g.S - lockAnim.size) * (phase === 'final' || phase === 'fireworks' ? 0.08 : 1);
    lockAnim.flash = Math.max(0, lockAnim.flash - dt / 450); lockAnim.shake = Math.max(0, lockAnim.shake - dt / 500);
    // fireworks & hearts in final
    if (phase === 'fireworks' || phase === 'final') {
      if (t > nextFw) { launchFirework(); nextFw = t + (t - phaseT < 3500 ? 380 : 950) + Math.random() * 350; }
      if (t > nextHeart) { spawnHearts(W * (0.2 + Math.random() * 0.6), H * 0.95, 1, 40); nextHeart = t + 520; }
    }
    stepParticles(dt);
    // draw
    drawScene(t);
    if (lockAnim.show > 0) {
      cx.save(); cx.fillStyle = `rgba(6,3,20,${0.35 * lockAnim.show})`; cx.fillRect(0, 0, W, H); cx.restore();
      const sx = lockAnim.shake * Math.sin(t * 0.09) * 6;
      cx.save(); cx.globalAlpha = lockAnim.show;
      const sc = 0.7 + 0.3 * ease(lockAnim.show);
      cx.translate(W / 2 + sx, lockAnim.y); cx.scale(sc, sc);
      drawPadlock(cx, 0, 0, lockAnim.size, { shackle: lockAnim.shackle, engrave: lockAnim.engrave, flash: lockAnim.flash, glow: lockAnim.glow + (lockAnim.clicked ? 0.35 + 0.15 * Math.sin(t * 0.004) : 0), name });
      cx.restore();
    }
    if (keyAnim.show > 0 && (phase === 'key' || phase === 'throw')) {
      let kx = keyAnim.x, ky = keyAnim.y;
      if (phase === 'key') { const g2 = lockTarget(); kx = W / 2; ky = g2.y + g2.S * 0.95 + Math.sin(t * 0.004) * 6; keyAnim.x = kx; keyAnim.y = ky; glow(cx, kx, ky, g2.S * 0.6, 'rgba(255,214,90,0.5)', keyAnim.show); }
      cx.globalAlpha = keyAnim.show; drawKey(cx, kx, ky, lockTarget().S * 0.42 * keyAnim.s, phase === 'key' ? -0.5 + Math.sin(t * 0.003) * 0.12 : keyAnim.rot); cx.globalAlpha = 1;
    }
    drawParticles(cx);
    requestAnimationFrame(frame);
  }

  /* ---------- flow ---------- */
  const hintEl = $('#hint');
  let hintTimer = 0;
  function hint(txt, ms) { hintEl.textContent = txt; hintEl.classList.add('show'); clearTimeout(hintTimer); if (ms) hintTimer = setTimeout(() => hintEl.classList.remove('show'), ms); }
  function hideHint() { hintEl.classList.remove('show'); }
  function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('show', s.id === id)); }

  function begin() { document.body.classList.add('started'); show('namescr'); setPhase('name'); }
  function lockIt() {
    const v = clean($('#nm').value); name = v || name || 'my love';
    $('#nm').blur(); show('none'); hideHint();
    lockAnim = { show: 0, shackle: 0, engrave: 0, flash: 0, shake: 0, y: lockTarget().y, size: lockTarget().S, glow: 0, clicked: false, onRail: null };
    setPhase('engrave'); hint('Engraving your love… ✨');
  }
  function throwKey() {
    if (phase !== 'key') return;
    hideHint(); SFX.whoosh();
    keyAnim.from = { x: keyAnim.x, y: keyAnim.y }; keyAnim.to = { x: W * 0.56, y: H * 0.86 };
    setPhase('throw');
  }
  function splash() {
    setPhase('splash'); keyAnim.show = 0; SFX.splash();
    const x = keyAnim.to.x, y = keyAnim.to.y;
    for (let i = 0; i < 4; i++) ripples.push({ x, y, r: 4 + i * 10, v: 1.6 + i * 0.25, age: -i * 220, life: 2600 });
    for (let i = 0; i < 40; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6, v = 2 + Math.random() * 5; P.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1, d: 0.018, c: i % 2 ? '#bfe6ff' : '#ffffff', s: 1.5 + Math.random() * 2 }); }
    spawnHearts(x, y, 26, 70);
    hint('Splash! The key is gone forever 💦', 1700);
  }
  const PROMISES = [
    'I’ll hold your hand on every bridge 🌉',
    'I’ll choose you, every single day 💕',
    'I’ll be your calm in every storm ☔',
    'I’ll make you laugh till your cheeks hurt 😄',
    'I’ll love you more than yesterday, forever ♾️'
  ];
  let meterRAF = 0, cntTimer = 0, promTimers = [];
  function goFinal() {
    setPhase('fireworks'); layoutDirty = true; nextFw = 0;
    // your lock also hangs on the railing now
    lockAnim.onRail = { x: W * 0.5 + 14, y: G.railTop, s: 9, c: '#ffd34e', p: 1, heart: true };
    for (let i = 0; i < 3; i++) setTimeout(launchFirework, i * 160);
    show('final'); setTimeout(() => { if (phase === 'fireworks') setPhase('final'); }, 600);
    // promises
    const ol = $('#promises'); ol.innerHTML = '';
    PROMISES.forEach((p, i) => { const li = document.createElement('li'); li.textContent = p; ol.appendChild(li); promTimers.push(setTimeout(() => li.classList.add('in'), 1900 + i * 750)); });
    // meter
    const m0 = performance.now() + 900; cancelAnimationFrame(meterRAF);
    const mf = $('#mfill'), mv = $('#mval');
    mf.style.width = '0%'; mv.textContent = '0%';
    (function tick() {
      const k = Math.max(0, Math.min(1, (performance.now() - m0) / 2600)), e = 1 - Math.pow(1 - k, 3);
      mf.style.width = (e * 100).toFixed(1) + '%'; mv.textContent = k < 1 ? Math.round(e * 100) + '%' : '∞';
      if (k < 1) meterRAF = requestAnimationFrame(tick);
    })();
    clearInterval(cntTimer); updCounter(); cntTimer = setInterval(updCounter, 250);
  }
  function updCounter() {
    const s = Math.max(0, Math.floor((Date.now() - lockedAt) / 1000));
    const d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60, ss = s % 60;
    const p2 = (n) => String(n).padStart(2, '0');
    $('#cnt').textContent = `${d}d ${p2(h)}:${p2(m)}:${p2(ss)}`;
  }
  function replay() {
    closeModals(); promTimers.forEach(clearTimeout); promTimers = []; clearInterval(cntTimer);
    P.length = 0; hearts.length = 0; rockets.length = 0; ripples.length = 0; sparks.length = 0;
    lockAnim = { show: 0, shackle: 0, engrave: 0, flash: 0, shake: 0, y: 0, size: 0, glow: 0 }; keyAnim.show = 0;
    $('#nm').value = name === 'my love' && !qs.get('name') ? '' : name;
    show('namescr'); setPhase('name');
  }

  /* lock wall */
  const WALL = [
    ['You + Jaan ❤️ forever', '#f7c948'], ['baby, you’re my home 🏡', '#ff4f8b'], ['sweetheart & me, no exit 🔐', '#b07cff'],
    ['cutiee, 1000 more dates 🍕', '#ff8fb1'], ['my love, till the river dries 🌊', '#7cc4ff'], ['Jaan, my favourite notification 📱', '#6ee7d8'],
    ['console.log("forever") 💻', '#c9ced8'], ['My Player 2 🎮', '#ff6b4a'], ['No key needed 🔑❌', '#ffd34e'],
    ['if (you) return happy; 😊', '#e64a6a'], ['Still choosing you 💍', '#f7c948'], ['Coffee dates forever ☕', '#b07cff'],
    ['The moon said yes 🌙', '#7cc4ff'], ['Locked since day 1 💞', '#ff4f8b'], ['Our song on repeat 🎶', '#6ee7d8'],
    ['100/100 love 💯', '#ff8fb1'], ['Mine. Forever. 🔒', '#ffd34e'], ['you + me = <3', '#c9ced8']
  ];
  function openWall() {
    const g = $('#wgrid'); g.innerHTML = '';
    let mine = null; try { mine = JSON.parse(localStorage.getItem('lovelock') || 'null'); } catch (e) {}
    const items = WALL.slice();
    if (mine && mine.name) items.unshift([`You + ${clean(mine.name)} ❤️ (your lock)`, '#ffd34e', 1]);
    items.forEach((it, i) => {
      const d = document.createElement('div'); d.className = 'ml' + (it[2] ? ' mine' : ''); d.style.animationDelay = (i * 0.05) + 's';
      const sh = document.createElement('div'); sh.className = 'sh';
      const bd = document.createElement('div'); bd.className = 'bd'; bd.style.background = `linear-gradient(160deg,#fff8,${it[1]} 40%,${it[1]})`;
      const p = document.createElement('p'); p.textContent = it[0];
      d.append(sh, bd, p); g.appendChild(d);
    });
    $('#wcount').textContent = (2814 + (mine ? 1 : 0)).toLocaleString('en-IN');
    openModal('wall');
  }
  function openModal(id) { const m = $('#' + id); m.classList.add('show'); m.setAttribute('aria-hidden', 'false'); }
  function closeModals() { document.querySelectorAll('.modal').forEach(m => { m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); }); }

  /* downloadable lock card */
  function makeCard() {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, 1350); bg.addColorStop(0, '#0a0530'); bg.addColorStop(0.6, '#2a1458'); bg.addColorStop(1, '#4a1e5e');
    g.fillStyle = bg; g.fillRect(0, 0, 1080, 1350);
    const r = rng(7); for (let i = 0; i < 260; i++) { g.globalAlpha = 0.3 + r() * 0.7; g.fillStyle = '#fff'; const s = r() * 3 + 1; g.fillRect(r() * 1080, r() * 1350, s, s); } g.globalAlpha = 1;
    glow(g, 540, 640, 520, 'rgba(255,190,80,0.35)', 1);
    for (let i = 0; i < 26; i++) { g.globalAlpha = 0.25 + r() * 0.5; heartPath(g, r() * 1080, 900 + r() * 400, 20 + r() * 40); g.fillStyle = ['#ff4f8b', '#ff8fb1', '#ffc2da'][i % 3]; g.fill(); } g.globalAlpha = 1;
    g.strokeStyle = 'rgba(255,214,120,0.7)'; g.lineWidth = 6; rr(g, 40, 40, 1000, 1270, 46); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffe08a'; g.font = '700 110px "Dancing Script", cursive'; g.shadowColor = 'rgba(255,170,60,0.8)'; g.shadowBlur = 30; g.fillText('Love Lock', 540, 170); g.shadowBlur = 0;
    const saveNow = now; drawPadlock(g, 540, 640, 470, { shackle: 1, engrave: 1, flash: 0, glow: 0.6, name }); now = saveNow;
    g.fillStyle = '#fff'; g.font = '800 64px Poppins, sans-serif'; g.fillText('Locked forever 🔐', 540, 1010);
    g.fillStyle = '#ffd9ea'; g.font = '600 44px Poppins, sans-serif'; g.fillText('No key. No exit. ❤️', 540, 1085);
    const d = new Date(lockedAt || Date.now());
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '500 32px Poppins, sans-serif';
    g.fillText('Locked on ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }), 540, 1165);
    g.fillStyle = '#ffe08a'; g.font = '700 34px Poppins, sans-serif'; g.fillText('Made by @hack.n.code', 540, 1250);
    return c.toDataURL('image/png');
  }
  let cardURL = '';
  function openCard() { cardURL = makeCard(); $('#cardimg').src = cardURL; openModal('cardm'); }
  function download() {
    const a = document.createElement('a'); a.href = cardURL || makeCard(); a.download = 'love-lock-' + name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function share() {
    const url = location.origin + location.pathname + '?name=' + encodeURIComponent(name);
    const txt = `I locked our love on the Love Lock bridge 🔐❤️\nYou + ${name}. No key. No exit.\nLock yours here 👉 ${url}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener');
  }

  /* ---------- input ---------- */
  $('#begin').addEventListener('click', begin);
  $('#lockbtn').addEventListener('click', lockIt);
  $('#nm').addEventListener('keydown', (e) => { if (e.key === 'Enter') lockIt(); });
  const chips = $('#chips');
  PETS.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.textContent = p; b.addEventListener('click', () => { $('#nm').value = p; }); chips.appendChild(b); });
  $('#wall1').addEventListener('click', openWall); $('#wall2').addEventListener('click', openWall);
  $('#wclose').addEventListener('click', closeModals); $('#cclose').addEventListener('click', closeModals);
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', (e) => { if (e.target === m) closeModals(); }));
  $('#cardbtn').addEventListener('click', openCard); $('#dl').addEventListener('click', download);
  $('#share').addEventListener('click', share); $('#replay').addEventListener('click', replay);
  let swipeY = null, swipeX = null;
  cv.addEventListener('pointerdown', (e) => { swipeY = e.clientY; swipeX = e.clientX; });
  window.addEventListener('pointerup', (e) => {
    if (phase !== 'key' || swipeY === null) return;
    const dy = e.clientY - swipeY; swipeY = null;
    const nearKey = Math.hypot(e.clientX - keyAnim.x, e.clientY - keyAnim.y) < 90;
    if (dy < -25 || nearKey || Math.abs(dy) < 8) throwKey();
  });
  window.addEventListener('keydown', (e) => { if (phase === 'key' && (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter')) throwKey(); });
  window.addEventListener('resize', resize);
  if (qs.get('name')) $('#nm').value = name;

  /* ---------- demo / auto-play (?demo=1) ---------- */
  const ghost = $('#ghost');
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  function centerOf(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  async function tapAt(x, y, el) {
    ghost.style.left = x + 'px'; ghost.style.top = y + 'px'; ghost.style.transform = 'scale(1.25)'; ghost.style.opacity = '1';
    await wait(260); ghost.style.transform = 'scale(0.85)'; if (el) el.classList.add('press');
    await wait(160); if (el) el.classList.remove('press'); ghost.style.transform = 'scale(1)';
    await wait(140); ghost.style.opacity = '0';
  }
  async function tapEl(el) { const c = centerOf(el); await tapAt(c.x, c.y, el); el.click(); }
  async function runDemo() {
    window.__demo = 'intro';
    await wait(2200);
    await tapEl($('#begin')); window.__demo = 'name';
    await wait(900);
    const nm = $('#nm'); const target = clean(qs.get('name')) || 'Jaan'; nm.value = '';
    { const c = centerOf(nm); await tapAt(c.x, c.y); }
    for (const ch of target) { nm.value += ch; await wait(260); }
    await wait(500);
    await tapEl($('#lockbtn')); window.__demo = 'lock';
    while (phase !== 'key') await wait(50);
    await wait(1300);
    // swipe the key up
    const sx = keyAnim.x, sy = keyAnim.y;
    ghost.style.left = sx + 'px'; ghost.style.top = sy + 'px'; ghost.style.opacity = '1';
    for (let i = 1; i <= 8; i++) { await wait(30); ghost.style.top = (sy - i * 14) + 'px'; }
    throwKey(); ghost.style.opacity = '0'; window.__demo = 'throw';
    while (phase !== 'final') await wait(50);
    window.__demo = 'final';
    await wait(6400);
    await tapEl($('#cardbtn')); window.__demo = 'card';
    await wait(3000);
    closeModals(); await wait(500);
    await tapEl($('#wall2')); window.__demo = 'wall';
    await wait(3000);
    closeModals(); window.__demo = 'done';
  }

  /* ---------- boot ---------- */
  resize();
  window.__api = { phase: () => phase, demo: () => window.__demo, lockGeom: () => ({ x: W / 2, y: lockAnim.y, S: lockAnim.size }), card: makeCard, goFinal: () => { lockedAt = Date.now() - 7000; goFinal(); } };
  const fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 40px "Dancing Script"'), document.fonts.load('700 20px Poppins')]).catch(() => {}) : Promise.resolve();
  Promise.race([fontsReady, wait(2500)]).then(() => {
    window.__ready = true;
    requestAnimationFrame(frame);
    if (DEMO) runDemo();
  });
})();
