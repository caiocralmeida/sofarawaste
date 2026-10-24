// Caverna: infinita para a direita. Quanto mais fundo, melhores e mais duros os meteoros.

const CAVE = [
  { name: 'Setor Ferro', bgT: '#0b1520', bgB: '#1d2b38', wall: '#2a3642', hi: '#5d7384', far: '#17232e', core: '#ff8a1f', shell: '#5b4d45' },
  { name: 'Setor Gelo', bgT: '#05131e', bgB: '#12374e', wall: '#1f4a62', hi: '#8fe6ff', far: '#0c2a3a', core: '#7fe9ff', shell: '#4d7086' },
  { name: 'Setor Violeta', bgT: '#0b0615', bgB: '#2a1247', wall: '#33195a', hi: '#c59bff', far: '#1d0f3a', core: '#c07bff', shell: '#4a3a5e' },
  { name: 'Setor Lava', bgT: '#140603', bgB: '#4a1a08', wall: '#43200f', hi: '#ff7a2a', far: '#2a1008', core: '#ffc23a', shell: '#3d2a22' },
  { name: 'Setor Negro', bgT: '#040407', bgB: '#16161f', wall: '#1b1b26', hi: '#6e6e88', far: '#0d0d14', core: '#e6dcff', shell: '#262634' }
];
const FAR = Array.from({ length: 26 }, (_, i) => 40 + ((i * 53) % 70));

function tierOf(x) { return Math.min(4, Math.floor(Math.max(0, x) / 650)); }
function wallTop(x) { return 34 + 12 * Math.sin(x * 0.011) + 7 * Math.sin(x * 0.037 + 1.3); }
function wallBot(x) { return H - 34 - 12 * Math.sin(x * 0.009 + 2.1) - 7 * Math.sin(x * 0.029); }
function hashK(k) { const v = Math.sin(k * 127.1) * 43758.5453; return v - Math.floor(v); }
function camCave() { return Math.max(-40, P.x - 180); }

function mkMeteor(x) {
  const tier = tierOf(x);
  const rad = 7 + Math.random() * 6 + tier * 1.2;
  const n = 8 + Math.floor(Math.random() * 4);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = rad * (i % 2 ? 0.62 : 1) * (0.88 + Math.random() * 0.24);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  const top = wallTop(x) + 20, bot = wallBot(x) - 20;
  const sh = 5 + tier * 3, co = 4 + tier * 3;
  return {
    x, y: top + Math.random() * (bot - top), vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
    r: rad, pts, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 1.2,
    tier, shell: sh, core: co, ms: sh, mc: co,
    eco: tier >= 1 && Math.random() < 0.04, ecoDone: false, dead: false
  };
}

function enterCave() {
  scene = 'cave';
  P.x = 24; P.y = H / 2; P.vx = P.vy = 0; P.grab = null;
  meteors = []; gas = [];
  for (let i = 0; i < 12; i++) meteors.push(mkMeteor(40 + Math.random() * W));
  saveRun();
  toast('Dentro da caverna. Quanto mais à direita, mais fundo e mais valioso.');
}

function exitCave() {
  scene = 'surface';
  P.x = MOUTH_X + 60; P.y = GROUND; P.grab = null;
  meteors = []; gas = [];
  saveRun();
}

function hitMeteor(m, byDrone) {
  if (m.eco && !m.ecoDone) {
    m.ecoDone = true; r.freeze = 5; addDiary('eco');
    toast(FRAG.eco);
  }
  const full = r.bag.bruto + r.bag.mat >= capNow();
  if (m.shell > 0) {
    m.shell--;
    if (!full) r.bag.bruto += 1;
    beep(180 + Math.random() * 60, 0.04, 'square', 0.02);
  } else if (m.core > 0) {
    m.core--;
    if (!full) r.bag.mat += 1 + m.tier;
    beep(420 + m.tier * 60, 0.05, 'triangle', 0.03);
  }
  if (full && !byDrone) toast('Mochila cheia. Volte à superfície e deposite na base.');
  burst(m.x, m.y, CAVE[m.tier].core, 4);
  if (m.shell <= 0 && m.core <= 0) {
    m.dead = true;
    if (P.grab === m) P.grab = null;
    burst(m.x, m.y, CAVE[m.tier].core, 14);
    if (Math.random() < 0.15) found();
  }
}

function updCave(dt) {
  if (updGlobal(dt)) return;
  const p = P, a = axis();
  if (P.dashT > 0) P.dashT -= dt;
  if (pressed('ShiftLeft') || pressed('ShiftRight')) tryDash(a);

  // Movimento: grudado ou flutuando
  if (p.grab) {
    const m = p.grab;
    m.vx += a.x * 40 * dt; m.vy += a.y * 40 * dt;
    p.x = m.x + p.ox; p.y = m.y + p.oy;
  } else {
    p.vx = (p.vx + a.x * 95 * dt) * 0.985;
    p.vy = (p.vy + a.y * 95 * dt) * 0.985;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  const top = wallTop(p.x) + 10, bot = wallBot(p.x) - 10;
  if (p.y < top) { p.y = top; p.vy = Math.abs(p.vy) * 0.3; }
  if (p.y > bot) { p.y = bot; p.vy = -Math.abs(p.vy) * 0.3; }

  // Grudar e martelar
  if (down('Space')) {
    if (!p.grab) {
      let best = null, bd = 1e9;
      for (const m of meteors) {
        const d = Math.hypot(m.x - p.x, m.y - p.y) - m.r;
        if (d < 14 && d < bd) { bd = d; best = m; }
      }
      if (best) { p.grab = best; p.ox = p.x - best.x; p.oy = p.y - best.y; p.hitT = 0; }
    }
    if (p.grab) {
      p.hitT -= dt;
      if (p.hitT <= 0) { p.hitT = hitCd(); hitMeteor(p.grab, false); }
    }
  } else if (p.grab) {
    p.vx = p.grab.vx; p.vy = p.grab.vy; p.grab = null;
  }

  // Drones Lixeiros martelam o meteoro mais próximo
  if (r.lix > 0) {
    r.droneT -= dt;
    if (r.droneT <= 0) {
      r.droneT = droneCd();
      let best = null, bd = 320;
      for (const m of meteors) { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } }
      if (best && r.bag.bruto + r.bag.mat < capNow()) hitMeteor(best, true);
    }
  }

  // Meteoros: deriva, quique nas paredes, remoção atrás da câmera
  const cam = camCave();
  for (const m of meteors) {
    m.x += m.vx * dt; m.y += m.vy * dt; m.rot += m.vr * dt;
    const tp = wallTop(m.x) + m.r, bt = wallBot(m.x) - m.r;
    if (m.y < tp) { m.y = tp; m.vy = Math.abs(m.vy); }
    if (m.y > bt) { m.y = bt; m.vy = -Math.abs(m.vy); }
    if (m.x < cam - 160) m.dead = true;
    if (m.dead && P.grab === m) P.grab = null;
  }
  meteors = meteors.filter(m => !m.dead);

  // Reposição infinita: meteoros nascem à frente, ficando mais duros com a profundidade
  const want = 9 + Math.min(8, Math.floor(p.x / 500));
  if (meteors.length < want && Math.random() < dt * 4) {
    meteors.push(mkMeteor(cam + W + 20 + Math.random() * 140));
  }
  if (meteors.filter(m => m.x > cam && m.x < cam + W).length < 3 && Math.random() < dt * 2) {
    meteors.push(mkMeteor(cam + 40 + Math.random() * (W - 80)));
  }

  // Bolsas de gás: drenam oxigênio mais rápido
  if (p.x > 250 && gas.length < 3 && Math.random() < dt * 0.3) {
    const gx = cam + W + Math.random() * 200;
    gas.push({ x: gx, y: wallTop(gx) + 50 + Math.random() * 120, r: 30 + Math.random() * 12 });
  }
  gas = gas.filter(g => g.x > cam - 140);

  // Oxigênio: cada metro custa mais
  const inGas = gas.some(g => Math.hypot(p.x - g.x, p.y - g.y) < g.r);
  if (r.freeze > 0) r.freeze -= dt;
  else r.o2 -= (1.1 + p.x / 1100 + (inGas ? 2.4 : 0)) * dt;
  if (r.o2 <= 0) { die('O oxigênio acabou na caverna.'); return; }

  updSparks(dt);
  if (pressed('KeyE') && p.x < 40) { /* nada: a saída é andando para a esquerda */ }
  if (p.x < -4) exitCave();
}

// Desenho da caverna
function drawCave() {
  const cam = camCave();
  const pal = CAVE[tierOf(P.x)];
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, pal.bgT); bg.addColorStop(1, pal.bgB);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Pilares distantes com paralaxe
  ctx.fillStyle = pal.far; ctx.globalAlpha = 0.6;
  const span = W + 140;
  FAR.forEach((hh, i) => {
    const sx = ((i * 70 - cam * 0.35) % span + span) % span - 70;
    ctx.beginPath(); ctx.moveTo(sx - 26, H); ctx.lineTo(sx, H - hh * 2.4); ctx.lineTo(sx + 26, H); ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Paredes com borda iluminada
  ctx.beginPath(); ctx.moveTo(-6, 0);
  for (let sx = -6; sx <= W + 6; sx += 6) ctx.lineTo(sx, wallTop(sx + cam));
  ctx.lineTo(W + 6, 0); ctx.closePath(); ctx.fillStyle = pal.wall; ctx.fill();
  ctx.beginPath(); ctx.moveTo(W + 6, H);
  for (let sx = W + 6; sx >= -6; sx -= 6) ctx.lineTo(sx, wallBot(sx + cam));
  ctx.lineTo(-6, H); ctx.closePath(); ctx.fillStyle = pal.wall; ctx.fill();
  ctx.beginPath();
  for (let sx = -6; sx <= W + 6; sx += 6) { const y = wallTop(sx + cam); sx > -6 ? ctx.lineTo(sx, y) : ctx.moveTo(sx, y); }
  ctx.strokeStyle = pal.hi; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7; ctx.stroke();
  ctx.beginPath();
  for (let sx = -6; sx <= W + 6; sx += 6) { const y = wallBot(sx + cam); sx > -6 ? ctx.lineTo(sx, y) : ctx.moveTo(sx, y); }
  ctx.stroke(); ctx.globalAlpha = 1;

  // Textura de rocha: rachaduras e blocos claros/escuros nas paredes
  for (let i = 0; i < 70; i++) {
    const wx = Math.floor(cam / 22) * 22 + i * 22;
    const sx = Math.round(wx - cam);
    if (sx < -8 || sx > W + 8) continue;
    const hs = hashK(Math.floor(wx / 22) + 7);
    const yt = wallTop(wx), yb = wallBot(wx);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(sx, Math.round(yt + 6 + hs * 16), 7 + hs * 6, 3);
    ctx.fillRect(sx + 6, Math.round(yb - 8 - hs * 14), 9, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(sx + 2, Math.round(yt + 4 + hs * 16), 4, 1);
    ctx.fillRect(sx + 10, Math.round(yb - 10 - hs * 14), 4, 1);
  }
  // Luz de tocha do jogador iluminando a parede
  glow(P.x - cam, P.y, 90, pal.core, 0.10);

  // Cristais nas paredes (a partir do setor Gelo)
  const k0 = Math.floor(cam / 60) - 1, k1 = Math.floor((cam + W) / 60) + 1;
  for (let k = k0; k <= k1; k++) {
    const hsh = hashK(k);
    if (hsh < 0.45) continue;
    const wx = k * 60, sx = Math.round(wx - cam);
    if (tierOf(wx) === 0) continue;
    const up = hsh > 0.7;
    const by = up ? wallTop(wx) : wallBot(wx);
    const tipY = up ? by + 14 + hsh * 10 : by - 14 - hsh * 10;
    ctx.fillStyle = CAVE[tierOf(wx)].core; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.moveTo(sx - 5, by); ctx.lineTo(sx, tipY); ctx.lineTo(sx + 5, by); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Lava no chão do setor Lava
  if (tierOf(P.x) === 3) {
    ctx.fillStyle = '#ff7a2a'; ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 3);
    ctx.beginPath(); ctx.moveTo(-6, H);
    for (let sx = -6; sx <= W + 6; sx += 6) ctx.lineTo(sx, wallBot(sx + cam) + 6);
    ctx.lineTo(W + 6, H); ctx.fill(); ctx.globalAlpha = 1;
  }

  for (const g of gas) {
    const sx = g.x - cam;
    if (sx < -80 || sx > W + 80) continue;
    glow(sx, g.y, g.r * (1 + 0.08 * Math.sin(t * 3)), '#b5ff7a', 0.35);
  }

  for (const m of meteors) drawMeteor(m, cam);

  // Drones lixeiros voando perto do jogador
  for (let i = 0; i < r.lix; i++) {
    const dx = P.x - cam + Math.cos(t * 2 + i * 2.1) * 22, dy = P.y - 14 + Math.sin(t * 2.6 + i) * 6;
    ctx.fillStyle = '#c4ccd8'; ctx.fillRect(Math.round(dx) - 4, Math.round(dy) - 2, 8, 4);
    ctx.fillStyle = '#ff8a1f'; ctx.fillRect(Math.round(dx) - 1, Math.round(dy) - 1, 2, 2);
  }

  glow(P.x - cam, P.y - 6, 26, pal.core, 0.14);
  drawAstro(P.x - cam, P.y, P.dir, P.walk, !!P.grab);
  if (P.grab) {
    ctx.strokeStyle = '#ffd27a'; ctx.beginPath();
    ctx.moveTo(P.x - cam, P.y - 6); ctx.lineTo(P.grab.x - cam, P.grab.y); ctx.stroke();
  }
  drawSparks(cam);
}

function drawMeteor(m, cam) {
  const x = m.x - cam, y = m.y;
  if (x < -50 || x > W + 50) return;
  const pal = CAVE[m.tier];
  if (m.core > 0) glow(x, y, m.r * 2.1, pal.core, 0.35);
  if (m.eco) {
    ctx.strokeStyle = 'rgba(159,231,255,0.6)';
    ctx.beginPath(); ctx.arc(x, y, m.r + 4 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.save(); ctx.translate(x, y); ctx.rotate(m.rot);
  ctx.beginPath();
  m.pts.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]));
  ctx.closePath();
  ctx.fillStyle = m.shell > 0 ? pal.shell : '#2e2a28';
  ctx.fill();
  ctx.strokeStyle = '#06080c'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.09)';
  ctx.fillRect(-m.r * 0.5, -m.r * 0.6, m.r * 0.4, m.r * 0.3);
  if (m.core > 0) {
    const k = m.core / m.mc;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, rr = (i % 2 ? 0.3 : 0.6) * m.r * Math.max(0.35, k);
      i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fillStyle = pal.core; ctx.fill();
  }
  ctx.restore();
  if (m.shell < m.ms || m.core < m.mc) {
    const ratio = (m.shell + m.core) / (m.ms + m.mc);
    ctx.fillStyle = '#000'; ctx.fillRect(x - 8, y - m.r - 6, 16, 2);
    ctx.fillStyle = pal.core; ctx.fillRect(x - 8, y - m.r - 6, 16 * ratio, 2);
  }
}

// HUD da caverna: profundidade e setor
function drawCaveHUD() {
  const tier = tierOf(P.x);
  panel(8, H - 60, 280, 22);
  ctx.font = '11px "IBM Plex Mono",monospace'; ctx.fillStyle = '#d6dde3';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('Profundidade ' + Math.max(0, Math.floor(P.x / 8)) + ' m · ' + CAVE[tier].name, 16, H - 49);
  // Cronômetro da noite: aparece nos últimos 10 s, se o jogador estiver na caverna
  if (r.phase === 'day' && r.dayT <= 10) {
    const pulse = 0.75 + 0.25 * Math.sin(t * 8);
    ctx.globalAlpha = pulse;
    panel(W / 2 - 110, 40, 220, 44);
    ctx.font = '26px "VT323",monospace'; ctx.fillStyle = '#ff8a1f';
    ctx.fillText('NOITE EM ' + Math.ceil(r.dayT) + 's', W / 2, 62);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
}
