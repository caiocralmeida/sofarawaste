// Superfície: planeta, nave, base, portão, torres, inimigos da noite.

const TOW = {
  1: { name: 'Prego', cost: 60, range: 110, rate: 1, dmg: 8, c: '#e8b04a' },
  2: { name: 'Choque', cost: 120, range: 90, rate: 0.5, dmg: 3, c: '#6ad8ff', slow: 2 },
  3: { name: 'Sanguessuga', cost: 180, range: 100, rate: 0.5, dmg: 6, c: '#ff4d6d', heal: 1 }
};
const EN = {
  rast: { hp: 30, sp: 22, dmg: 8, c: '#a2472e' },
  carr: { hp: 110, sp: 12, dmg: 35, c: '#5a3570' },
  agul: { hp: 12, sp: 40, dmg: 3, c: '#e8e4ff', air: true }
};

// Terreno e flora determinísticos
const rndPlanet = mulberry(11);
const FLORA = [];
for (let i = 0; i < 70; i++) {
  const x = rndPlanet() * WORLD;
  if (Math.abs(x - MOUTH_X) < 70 || Math.abs(x - BASE_X) < 100 || Math.abs(x - SHIP_X) < 70) continue;
  FLORA.push({ x, k: Math.floor(rndPlanet() * 4), h: 0.7 + rndPlanet() * 0.9, c: rndPlanet() });
}
const STARS = Array.from({ length: 80 }, () => ({ x: Math.random() * W, y: Math.random() * 170, s: Math.random() * 6 }));
const DUST = Array.from({ length: 30 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 6 }));

function gTop(wx) { return GROUND + 3 * Math.sin(wx * 0.021) + 2 * Math.sin(wx * 0.057 + 1); }

function ridge(cam, par, base, amp, freq, ph, col) {
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let sx = -8; sx <= W + 8; sx += 8) {
    const wx = sx + cam * par;
    const y = base - amp * (0.5 + 0.5 * Math.sin(wx * freq + ph)) - amp * 0.35 * (0.5 + 0.5 * Math.sin(wx * freq * 2.7 + ph * 2));
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(W + 8, H); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
}

// Desenha o planeta inteiro. full=false (título) omite base dinâmica, inimigos e jogador.
function drawSurface(cam, nf, full) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, mixC('#2a1648', '#03040c', nf));
  sky.addColorStop(0.55, mixC('#c4577a', '#14102c', nf));
  sky.addColorStop(1, mixC('#ffb27a', '#2b1d40', nf));
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  if (nf > 0.05) {
    for (const s of STARS) {
      ctx.globalAlpha = nf * (0.35 + 0.65 * Math.abs(Math.sin(t * 0.8 + s.s)));
      ctx.fillStyle = '#dfe9ff'; const k = s.s > 4 ? 2 : 1; ctx.fillRect(s.x, s.y, k, k);
    }
    ctx.globalAlpha = 1;
  }

  // Planeta gigante no céu, com anel
  const px = 430 - cam * 0.04, py = 78;
  glow(px, py, 90, mixC('#ffb36b', '#6f86c0', nf), 0.35);
  ctx.beginPath(); ctx.arc(px, py, 34, 0, Math.PI * 2); ctx.fillStyle = mixC('#ffcf9a', '#7f95c8', nf); ctx.fill();
  ctx.beginPath(); ctx.arc(px + 9, py - 3, 30, 0, Math.PI * 2); ctx.fillStyle = mixC('#e0956a', '#4a5a8a', nf); ctx.globalAlpha = 0.45; ctx.fill(); ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.ellipse(px, py, 58, 11, -0.3, 0, Math.PI * 2);
  ctx.strokeStyle = mixC('#ffe2c0', '#a6b8e0', nf); ctx.lineWidth = 2; ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;

  ridge(cam, 0.15, 230, 70, 0.006, 0, mixC('#7a4a7e', '#2a2440', nf));
  ridge(cam, 0.3, 255, 50, 0.011, 2, mixC('#5a3360', '#1c1830', nf));
  ridge(cam, 0.5, 272, 28, 0.02, 4, mixC('#3e2440', '#120e1e', nf));

  // Raios de luz vindos do planeta gigante (dia) e névoa flutuante
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const rx = 430 - cam * 0.04 + i * 40 - 60;
    const g = ctx.createLinearGradient(rx, 0, rx + 120, GROUND);
    g.addColorStop(0, 'rgba(255,200,150,' + (0.08 * (1 - nf)) + ')');
    g.addColorStop(1, 'rgba(255,200,150,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx + 22, 0); ctx.lineTo(rx + 150, GROUND); ctx.lineTo(rx + 110, GROUND); ctx.fill();
  }
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const cx = ((i * 260 - cam * (0.25 + i * 0.05) + t * (4 + i * 2)) % (W + 240) + W + 240) % (W + 240) - 120;
    ctx.fillStyle = mixC('#c890a8', '#3a2c50', nf); ctx.globalAlpha = 0.22;
    ctx.beginPath(); ctx.ellipse(cx, 150 + i * 22, 70 - i * 8, 10 + i * 2, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 34, 146 + i * 22, 46 - i * 6, 8 + i, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Chão
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let sx = 0; sx <= W + 6; sx += 6) ctx.lineTo(sx, gTop(sx + cam));
  ctx.lineTo(W + 6, H); ctx.closePath();
  const gg = ctx.createLinearGradient(0, GROUND - 10, 0, H);
  gg.addColorStop(0, mixC('#7a4a5c', '#2a2030', nf)); gg.addColorStop(1, mixC('#24141f', '#0a0810', nf));
  ctx.fillStyle = gg; ctx.fill();
  ctx.beginPath();
  for (let sx = 0; sx <= W + 6; sx += 6) { const y = gTop(sx + cam); sx ? ctx.lineTo(sx, y) : ctx.moveTo(sx, y); }
  ctx.strokeStyle = mixC('#9be07a', '#3c6a52', nf); ctx.lineWidth = 2; ctx.stroke();
  // Pedrinhas e textura de solo, com pontilhado em duas cores
  for (let i = 0; i < 90; i++) {
    const wx = (i * 37.7) % WORLD, sx = Math.round(wx - cam);
    if (sx < -4 || sx > W + 4) continue;
    const y = Math.round(gTop(wx)) + 4 + (i % 5) * 7;
    ctx.fillStyle = i % 3 ? mixC('#5a3a4a', '#1a1220', nf) : mixC('#8a6a7a', '#2a2234', nf);
    ctx.fillRect(sx, y, 2 + (i % 3), 1 + (i % 2));
  }

  // Flora e pedras
  for (const f of FLORA) {
    const sx = Math.round(f.x - cam);
    if (sx < -30 || sx > W + 30) continue;
    const y = gTop(f.x);
    if (f.k === 0) {
      ctx.fillStyle = mixC('#3a2a4a', '#1a1430', nf);
      ctx.fillRect(sx - 1, y - 14 * f.h, 3, 14 * f.h);
      glow(sx + 0.5, y - 14 * f.h, 16 * f.h, '#7fe9ff', 0.25 + nf * 0.35);
      ctx.fillStyle = '#7fe9ff';
      ctx.beginPath(); ctx.ellipse(sx + 0.5, y - 14 * f.h, 6 * f.h, 3, 0, 0, Math.PI * 2); ctx.fill();
    } else if (f.k === 1) {
      const c = f.c < 0.5 ? '#b36bff' : '#7fe9ff';
      glow(sx, y - 8, 14 * f.h, c, 0.2 + nf * 0.3);
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(sx - 4, y); ctx.lineTo(sx, y - 16 * f.h); ctx.lineTo(sx + 3, y); ctx.fill();
    } else if (f.k === 2) {
      ctx.strokeStyle = mixC('#6fbf6a', '#2a4a3a', nf); ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(sx + i, y); ctx.lineTo(sx + i + i * 1.5, y - 7 * f.h); ctx.stroke(); }
    } else {
      ctx.fillStyle = mixC('#4a3a48', '#22182a', nf);
      ctx.beginPath(); ctx.ellipse(sx, y - 2, 7 * f.h, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawCaveMouth(cam, nf);
  drawShipSprite(cam, nf);
  drawBase(cam, nf, full);

  if (full && r) {
    for (const tw of r.towers) drawTower(tw, cam);
    for (let i = 0; i < r.def; i++) drawDefensor(i, cam);
    for (const e of r.enemies) drawEnemy(e, cam);
    if (scene === 'surface' || scene === 'craft' || scene === 'escape') {
      drawAstro(P.x - cam, P.y, P.dir, P.walk, false);
    }
    if (buildMode && scene === 'surface') drawBuildOverlay(cam);
    if (buildMode && mouse && scene === 'surface') drawGhost(cam);   // sombra só no modo construção
  }
  drawSparks(cam);

  // Partículas de poeira
  ctx.fillStyle = mixC('#ffd2a6', '#9fb0e0', nf);
  for (const d of DUST) {
    ctx.globalAlpha = 0.3;
    const x = (d.x + t * (6 + d.s)) % W, y = (d.y + Math.sin(t + d.s) * 6 + H) % H;
    ctx.fillRect(Math.round(x), Math.round(y * 0.6), 1, 1);
  }
  ctx.globalAlpha = 1;

  if (nf > 0.05) { ctx.fillStyle = `rgba(4,6,30,${0.22 * nf})`; ctx.fillRect(0, 0, W, H); }
}

function drawCaveMouth(cam, nf) {
  const x = Math.round(MOUTH_X - cam), y = GROUND;
  if (x < -80 || x > W + 80) return;
  ctx.beginPath(); ctx.moveTo(x - 50, y); ctx.lineTo(x - 46, y - 72);
  ctx.quadraticCurveTo(x, y - 128, x + 46, y - 72); ctx.lineTo(x + 50, y); ctx.closePath();
  ctx.fillStyle = mixC('#3a2c3c', '#1c1424', nf); ctx.fill();
  for (let i = 0; i < 14; i++) {
    const a = Math.PI + (i / 13) * Math.PI;
    const sx = x + Math.cos(a) * 52, sy = y - 4 + Math.sin(a) * 84;
    ctx.fillStyle = i % 2 ? '#4d3d50' : '#2a2030';
    ctx.fillRect(Math.round(sx) - 4, Math.round(sy) - 3, 8, 6);
  }
  ctx.beginPath(); ctx.moveTo(x - 28, y); ctx.lineTo(x - 26, y - 58);
  ctx.quadraticCurveTo(x, y - 100, x + 26, y - 58); ctx.lineTo(x + 28, y); ctx.closePath();
  ctx.fillStyle = '#04050a'; ctx.fill();
  glow(x, y - 20, 46, '#7fe9ff', 0.28 + 0.1 * Math.sin(t * 2));
  ctx.fillStyle = '#7fe9ff'; ctx.globalAlpha = 0.5;
  ctx.fillRect(x - 10, y - 4, 20, 2); ctx.globalAlpha = 1;
  ctx.fillStyle = '#d6dde3'; ctx.font = '9px "IBM Plex Mono",monospace'; ctx.textAlign = 'center';
  ctx.fillText('CAVERNA', x, y - 138); ctx.textAlign = 'left';
}

function drawShipSprite(cam, nf) {
  const x = Math.round(SHIP_X - cam), y = GROUND;
  if (x < -80 || x > W + 80) return;
  ctx.strokeStyle = '#4a5566'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 22, y - 6); ctx.lineTo(x - 30, y); ctx.moveTo(x + 22, y - 6); ctx.lineTo(x + 30, y); ctx.stroke();
  ctx.fillStyle = '#2a2f3a'; ctx.fillRect(x - 34, y - 1, 10, 2); ctx.fillRect(x + 24, y - 1, 10, 2);
  const hull = ctx.createLinearGradient(0, y - 46, 0, y - 6);
  hull.addColorStop(0, '#c4ccd8'); hull.addColorStop(1, '#5a6578');
  ctx.beginPath(); ctx.moveTo(x - 34, y - 6); ctx.lineTo(x - 26, y - 44); ctx.lineTo(x + 26, y - 44); ctx.lineTo(x + 34, y - 6); ctx.closePath();
  ctx.fillStyle = hull; ctx.fill();
  ctx.fillStyle = '#ff8a1f'; ctx.fillRect(x - 30, y - 16, 60, 2);
  ctx.fillStyle = '#7fe9ff'; ctx.fillRect(x - 14, y - 38, 28, 9);
  glow(x, y - 34, 26, '#7fe9ff', 0.3);
  const blink = Math.sin(t * 3) > 0;
  ctx.fillStyle = blink ? '#ff4d6d' : '#4a1a24'; ctx.fillRect(x - 1, y - 47, 2, 2);
}

function drawBase(cam, nf, full) {
  const x = Math.round(BASE_X - cam), y = GROUND;
  if (x < -200 || x > W + 60) return;
  // tubos do teto
  for (const dx of [30, 100]) {
    const tg = ctx.createLinearGradient(x + dx, 0, x + dx + 22, 0);
    tg.addColorStop(0, '#3a4452'); tg.addColorStop(0.5, '#8d97a6'); tg.addColorStop(1, '#2a3038');
    ctx.fillStyle = tg; ctx.fillRect(x + dx, y - 132, 22, 40);
    ctx.fillStyle = '#ff8a1f'; ctx.fillRect(x + dx, y - 118, 22, 2); ctx.fillRect(x + dx, y - 104, 22, 2);
  }
  // corpo principal
  const bg = ctx.createLinearGradient(0, y - 96, 0, y);
  bg.addColorStop(0, '#4a5566'); bg.addColorStop(1, '#222a36');
  ctx.fillStyle = bg; ctx.fillRect(x, y - 96, 160, 96);
  ctx.strokeStyle = '#131820'; ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + i * 40, y - 96); ctx.lineTo(x + i * 40, y); ctx.stroke(); }
  ctx.fillStyle = '#6a7686';
  for (const [rx, ry] of [[4, -90], [152, -90], [4, -8], [152, -8]]) ctx.fillRect(x + rx, y + ry, 3, 3);
  // respiros laranjas
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#0b0e14'; ctx.fillRect(x + 36 + i * 22, y - 80, 14, 4);
    ctx.fillStyle = '#ff8a1f'; ctx.globalAlpha = 0.5 + 0.3 * nf; ctx.fillRect(x + 36 + i * 22, y - 80, 14, 1); ctx.globalAlpha = 1;
  }
  // placa HELIX
  ctx.fillStyle = '#ff8a1f'; ctx.fillRect(x + 54, y - 88, 52, 10);
  ctx.fillStyle = '#1b1206'; ctx.font = 'bold 8px "IBM Plex Mono",monospace'; ctx.textAlign = 'center';
  ctx.fillText('HELIX', x + 80, y - 80); ctx.textAlign = 'left';
  // antena
  ctx.strokeStyle = '#8d97a6'; ctx.beginPath(); ctx.moveTo(x + 80, y - 96); ctx.lineTo(x + 80, y - 150); ctx.stroke();
  ctx.fillStyle = Math.sin(t * 4) > 0 ? '#ff4d6d' : '#4a1a24'; ctx.fillRect(x + 79, y - 152, 3, 3);
  // abertura da porta (entrada física da base)
  ctx.fillStyle = '#06080c'; ctx.fillRect(x, y - 56, 26, 56);
  glow(x + 13, y - 20, 22, '#ff8a1f', 0.25 + 0.15 * nf);
  const shutterDown = full && r && r.phase === 'night';
  if (shutterDown) {
    ctx.fillStyle = '#55606e'; ctx.fillRect(x, y - 56, 26, 56);
    ctx.fillStyle = '#ffb000';
    for (let i = -2; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x + i * 8, y - 56); ctx.lineTo(x + i * 8 + 5, y - 56); ctx.lineTo(x + i * 8 + 14, y); ctx.lineTo(x + i * 8 + 9, y); ctx.fill(); }
    if (r.gate < 60) { ctx.strokeStyle = '#06080c'; ctx.beginPath(); ctx.moveTo(x + 6, y - 50); ctx.lineTo(x + 14, y - 30); ctx.lineTo(x + 9, y - 12); ctx.stroke(); }
  }
  // luz de teto
  ctx.fillStyle = '#7fe9ff'; ctx.globalAlpha = 0.6; ctx.fillRect(x + 60, y - 96, 40, 1); ctx.globalAlpha = 1;
  if (full && r) {
    const bw = 40, f = clamp(r.gate / 100, 0, 1);
    ctx.fillStyle = '#0a0f16'; ctx.fillRect(x, y - 160, bw, 4);
    ctx.fillStyle = '#ff8a1f'; ctx.fillRect(x, y - 160, bw * f, 4);
  }
}

function drawTower(tw, cam) {
  const x = Math.round(tw.x - cam), y = GROUND, T = TOW[tw.t];
  if (x < -30 || x > W + 30) return;
  ctx.fillStyle = '#2a2f3a'; ctx.fillRect(x - 9, y - 4, 18, 4);
  ctx.fillStyle = T.c; ctx.fillRect(x - 6, y - 22, 12, 18);
  ctx.fillStyle = '#0b0e14'; ctx.fillRect(x - 3, y - 18, 6, 6);
  if (tw.t === 1) { ctx.fillStyle = '#e8b04a'; ctx.fillRect(x - 1, y - 32, 2, 10); }
  if (tw.t === 2) { ctx.strokeStyle = '#6ad8ff'; ctx.beginPath(); ctx.ellipse(x, y - 14, 10, 4, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (tw.t === 3) glow(x, y - 24, 8 + Math.sin(t * 4) * 2, '#ff4d6d', 0.6);
}

function drawDefensor(i, cam) {
  const x = Math.round(BASE_X - 40 - i * 26 - cam), y = GROUND - 44 + Math.sin(t * 3 + i) * 2;
  if (x < -20 || x > W + 20) return;
  ctx.fillStyle = '#c4ccd8'; ctx.fillRect(x - 5, y - 2, 10, 4);
  ctx.fillStyle = '#ff8a1f'; ctx.fillRect(x - 1, y - 1, 2, 2);
  ctx.fillStyle = '#4a5566'; ctx.fillRect(x - 8, y - 1, 3, 2); ctx.fillRect(x + 5, y - 1, 3, 2);
}

function drawEnemy(e, cam) {
  const d = EN[e.t];
  const x = Math.round(e.x - cam);
  if (x < -30 || x > W + 30) return;
  let y;
  if (d.air) {
    y = e.y + Math.sin(t * 6 + e.walk) * 3;
    glow(x - 6, y, 10, '#c8c0ff', 0.4);
    ctx.fillStyle = d.c; ctx.beginPath(); ctx.ellipse(x, y, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = d.c; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x - 8 - Math.sin(t * 20) * 2, y - 3); ctx.stroke();
  } else if (e.t === 'rast') {
    y = GROUND - 6;
    const leg = Math.sin(t * 14 + e.walk) * 2;
    ctx.strokeStyle = '#2a1410'; ctx.beginPath();
    ctx.moveTo(x - 3, y + 2); ctx.lineTo(x - 6, y + 4 + leg);
    ctx.moveTo(x + 3, y + 2); ctx.lineTo(x + 6, y + 4 - leg); ctx.stroke();
    ctx.fillStyle = d.c; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(x + 1, y - 2, 2, 2);
  } else {
    y = GROUND - 10;
    ctx.fillStyle = '#2a1a36';
    ctx.beginPath(); ctx.moveTo(x - 10, y + 8); ctx.lineTo(x - 13, y - 6); ctx.lineTo(x - 6, y - 12); ctx.lineTo(x + 6, y - 12); ctx.lineTo(x + 13, y - 6); ctx.lineTo(x + 10, y + 8); ctx.fill();
    ctx.fillStyle = d.c; ctx.fillRect(x - 8, y - 10, 16, 16);
    ctx.fillStyle = '#ff8a1f'; ctx.fillRect(x - 4, y - 4, 2, 2); ctx.fillRect(x + 2, y - 4, 2, 2);
  }
  const ratio = clamp(e.hp / e.mhp, 0, 1);
  ctx.fillStyle = '#000'; ctx.fillRect(x - 8, y - 16, 16, 2);
  ctx.fillStyle = '#ff8a1f'; ctx.fillRect(x - 8, y - 16, 16 * ratio, 2);
}

function drawGhost(cam) {
  const wx = Math.round((mouse.x + cam) / 12) * 12;
  const x = Math.round(wx - cam), T = TOW[sel];
  const ok = wx >= MOUTH_X + 90 && wx <= BASE_X - 40 && r.inv[sel] > 0 && !r.towers.some(tw => Math.abs(tw.x - wx) < 20);
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = ok ? '#7fe9ff' : '#ff4d6d';
  ctx.strokeRect(x - 8.5, GROUND - 24.5, 17, 25);
  ctx.beginPath(); ctx.ellipse(x, GROUND, T.range, 4, 0, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(127,233,255,0.3)'; ctx.stroke();
  ctx.globalAlpha = 1;
}

// Astronauta (x, y = linha dos pés). Pixel-art com fillRect.
function drawAstro(x, y, dir, walk, grabbed) {
  x = Math.round(x); y = Math.round(y);
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
  const leg = Math.sin(walk) * 2;
  ctx.fillStyle = '#6e675c'; ctx.fillRect(-3, -3, 2, 3 + leg); ctx.fillRect(1, -3, 2, 3 - leg);
  ctx.fillStyle = '#4a5566'; ctx.fillRect(-6, -9, 2, 6);
  ctx.fillStyle = '#d9d2bf'; ctx.fillRect(-4, -10, 8, 8);
  ctx.fillStyle = '#ff8a1f'; ctx.fillRect(-4, -7, 8, 1);
  ctx.fillStyle = '#eee8d8'; ctx.fillRect(-4, -16, 8, 6);
  ctx.fillStyle = '#1b2a38'; ctx.fillRect(-1, -14, 5, 3);
  ctx.fillStyle = '#7fe9ff'; ctx.fillRect(1, -13, 2, 1);
  ctx.restore();
}

// Interação e movimento na superfície
function nearMouth() { return Math.abs(P.x - MOUTH_X) < 46; }
function nearBase() { return Math.abs(P.x - (BASE_X + 13)) < 46; }
function nearShip() { return Math.abs(P.x - SHIP_X) < 60; }

function surfacePrompt() {
  if (nearMouth()) return '[E] Entrar na caverna';
  if (nearBase()) return '[E] Entrar na base · mesa de drones';
  if (nearShip()) {
    if (save.escapes > 0) return 'A nave está morta. Nada mais a fazer aqui.';
    if (!r.repaired) return 'Nave · o motor da base precisa estar consertado';
    return '[E] Nave · upgrades gerais e fuga';
  }
  return '';
}

function interactSurface() {
  if (nearMouth()) { enterCave(); return; }
  if (nearBase()) { openCraft(); return; }
  if (nearShip()) { openShipUp(); return; }
}

function tryEscape() {
  if (save.escapes > 0) { toast('Não há mais nada a fazer aqui.'); return; }
  if (!r.repaired) { toast('O motor da base precisa estar consertado antes.'); return; }
  if (r.mat < 300) { toast('A fuga pede 300 Matéria. Você tem ' + r.mat + '.'); return; }
  scene = 'escape'; escT = 0;
}

function finishEscape() {
  save.escapes++; save.run = null; persist();
  makeRun(null);
  scene = 'surface'; P.x = SHIP_X + 60; P.y = GROUND;
  toast(wakeText());
}

function placeTower(wx) {
  if (wx < MOUTH_X + 90 || wx > BASE_X - 40) { toast('Torres ficam entre a entrada da caverna e a base.'); return; }
  const x = Math.round(wx / 12) * 12;
  if (r.towers.some(tw => Math.abs(tw.x - x) < 20)) return;
  const T = TOW[sel];
  if (!r.inv[sel]) { toast('Sem ' + T.name + ' no inventário. Crafte na nave (E).'); return; }
  r.inv[sel]--;
  r.towers.push({ t: sel, x, cd: 0 });
  beep(520, 0.06, 'triangle'); saveRun();
}

function updSurface(dt) {
  const a = axis();
  if (P.dashT > 0) P.dashT -= dt;
  if (pressed('ShiftLeft') || pressed('ShiftRight')) tryDash(a);
  P.dashV *= Math.pow(0.02, dt);
  P.x = clamp(P.x + a.x * 72 * dt + P.dashV * dt, 6, WORLD - 6);
  if (a.x) { P.dir = a.x > 0 ? 1 : -1; P.walk += dt * 9; }
  if (updGlobal(dt)) return;
  if (nearBase() || nearShip()) r.o2 = Math.min(o2Max(), r.o2 + 20 * dt);
  else r.o2 -= 0.4 * dt;
  if (r.o2 <= 0) { die('O oxigênio da superfície acabou.'); return; }
  if (nearBase() && r.bag.mat + r.bag.bruto > 0) {
    r.mat += r.bag.mat + Math.round(r.bag.bruto * oreMul()); r.bag = { bruto: 0, mat: 0 };   // bruto vale 2 de matéria
    toast('Depositado na base. O Triturador converteu o bruto.'); saveRun();
  }
  if (pressed('KeyE')) interactSurface();
}

// Noite e defesa: roda na superfície e também quando o jogador está na caverna.
function startNight() {
  r.phase = 'night'; r.nightTotal = 6 + r.cycle * 4; r.nightSpawned = 0; r.spawnT = 1.5;
  toast('A noite começou. Eles vêm pela esquerda. Continuar minerando ou voltar à Base?');
  beep(120, 0.4, 'sawtooth', 0.03);
}
function dawn() {
  r.phase = 'day'; r.dayT = DAY_LEN; r.cycle++; r.enemies = [];
  saveRun();
  toast('Amanhecer. Noite ' + r.cycle + ' ainda por vir. O portão aguentou.');
}
function spawnEnemy() {
  const k = Math.random();
  let t = k < 0.6 ? 'rast' : k < 0.85 ? 'agul' : (r.cycle >= 1 ? 'carr' : 'rast');
  const hp = EN[t].hp * (1 + r.cycle * 0.2);
  r.enemies.push({ t, x: -24, y: EN[t].air ? 190 + Math.random() * 40 : GROUND - 2, hp, mhp: hp, walk: Math.random() * 5 });
  r.nightSpawned++;
}

// Retorna true se a corrida morreu neste quadro.
function updGlobal(dt) {
  if (r.phase === 'day') {
    r.dayT -= dt;
    if (r.dayT <= 0) startNight();
  } else {
    if (r.nightSpawned < r.nightTotal) {
      r.spawnT -= dt;
      if (r.spawnT <= 0) { spawnEnemy(); r.spawnT = Math.max(0.55, 2.0 - r.cycle * 0.2) * (0.7 + Math.random() * 0.6); }
    } else if (r.enemies.length === 0) dawn();
  }

  const target = BASE_X - 12;
  for (const e of r.enemies) {
    const d = EN[e.t];
    if (e.x < target) { e.x += d.sp * dt; e.walk += dt * 10; }
    else { e.x = target; r.gate -= d.dmg * 0.3 * dt; shakeT = Math.max(shakeT, 0.08); }
  }

  for (const tw of r.towers) {
    tw.cd -= dt;
    if (tw.cd > 0) continue;
    const T = TOW[tw.t];
    let best = null;
    for (const e of r.enemies) if (Math.abs(e.x - tw.x) <= T.range && (!best || e.x > best.x)) best = e;
    if (!best) continue;
    tw.cd = 1 / T.rate;
    best.hp -= T.dmg;
    if (T.slow) best.slow = T.slow;
    if (T.heal) r.gate = Math.min(100, r.gate + T.heal);
    burst(best.x, GROUND - 8, T.c, 3);
  }

  if (r.def > 0) {
    r.defT -= dt;
    if (r.defT <= 0) {
      r.defT = 1;
      for (let i = 0; i < r.def; i++) {
        const dx = BASE_X - 40 - i * 26;
        let best = null;
        for (const e of r.enemies) if (Math.abs(e.x - dx) <= 130 && (!best || e.x > best.x)) best = e;
        if (best) { best.hp -= 6; burst(best.x, GROUND - 8, '#ff8a1f', 2); }
      }
    }
  }

  const dead = r.enemies.filter(e => e.hp <= 0);
  for (const e of dead) { r.mat += 1; burst(e.x, GROUND - 6, '#ffd27a', 6); }
  r.enemies = r.enemies.filter(e => e.hp > 0);
  if (r.gate <= 0) { die('O portão caiu. A base foi perdida.'); return true; }
  return false;
}

// Modo construção (TAB): mostra as torres que o jogador já construiu
function drawBuildOverlay(cam) {
  for (const tw of r.towers) {
    const x = Math.round(tw.x - cam), T = TOW[tw.t];
    ctx.save();
    ctx.setLineDash([3, 3]); ctx.strokeStyle = T.c; ctx.lineWidth = 1;
    ctx.strokeRect(x - 12.5, GROUND - 36.5, 25, 38);
    ctx.setLineDash([]);
    ctx.font = '10px "IBM Plex Mono",monospace'; ctx.fillStyle = T.c; ctx.textAlign = 'center';
    ctx.fillText(T.name, x, GROUND - 42);
    ctx.restore();
  }
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const tw of r.towers) counts[tw.t]++;
  panel(W / 2 - 150, 40, 300, 46);
  ctx.font = '11px "IBM Plex Mono",monospace'; ctx.fillStyle = '#d6dde3'; ctx.textAlign = 'center';
  ctx.fillText('MODO CONSTRUÇÃO · TAB para sair · clique para construir', W / 2, 54);
  ctx.fillStyle = '#ffd27a';
  ctx.fillText('Inventário: Prego ' + r.inv[1] + ' · Choque ' + r.inv[2] + ' · Sanguessuga ' + r.inv[3], W / 2, 74);
  ctx.textAlign = 'left';
}
