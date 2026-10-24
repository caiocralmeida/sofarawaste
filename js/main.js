// Cenas de entrada (título, introdução, cabine), menus, HUD e laço principal.

const INTRO = [
  'Em todo posto de trabalho da Helix-Orbital existe um pôster.',
  '"Quitting now would make everything you\'ve done so far a waste."',
  'Você acorda numa cratera. Sem memória. O oxigênio cai.',
  'Ao lado, uma nave ainda respira. Ela aponta para a caverna.'
];
const CRAFT = [
  { key: 'lix', name: 'Drone Lixeiro', cost: 60, max: 3, desc: 'Voa até a caverna e martela o meteoro mais próximo a cada 1,1 s.' },
  { key: 'def', name: 'Drone Defensor', cost: 120, max: 3, desc: 'Paira sobre a base e atira nos inimigos da noite, 6 de dano por segundo.' },
  { key: 'repair', name: 'Consertar o motor da base', cost: 150, once: true, desc: 'Obrigatório para a fuga. Uma vez por corrida.' }
];

// ---------- Menus e overlays ----------
function showOv(id, on) { $(id).hidden = !on; }
// Tela cheia: pedida no primeiro gesto e ao jogar (o navegador exige gesto do usuário)
function goFull() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
  } catch (e) {}
}
addEventListener('pointerdown', goFull, { once: false });
addEventListener('keydown', goFull);

// Textos desenhados dentro do canvas (missão e avisos)
function wrapPlain(s, font, maxW) {
  ctx.font = font;
  const words = s.split(' '), out = []; let cur = '';
  for (const w of words) {
    const tst = cur ? cur + ' ' + w : w;
    if (ctx.measureText(tst).width > maxW && cur) { out.push(cur); cur = w; } else cur = tst;
  }
  if (cur) out.push(cur);
  return out;
}
function drawTextBar() {
  ctx.save(); ctx.textBaseline = 'middle';
  if (scene === 'surface' || scene === 'cave' || scene === 'craft') {
    const lines = wrapPlain(missionText(), '11px "IBM Plex Mono",monospace', 440);
    lines.forEach((ln, i) => {
      const y = 70 + i * 16;
      ctx.font = '11px "IBM Plex Mono",monospace';
      panel(8, y - 8, ctx.measureText(ln).width + 16, 16);
      ctx.fillStyle = '#7fe9ff'; ctx.fillText(ln, 16, y);
    });
  }
  if (toastText && scene !== 'intro' && scene !== 'title') {
    const lines = wrapPlain(toastText, '12px "IBM Plex Mono",monospace', 520);
    const bw = Math.min(W - 24, Math.max(...lines.map(l => ctx.measureText(l).width)) + 24);
    const bh = lines.length * 16 + 10;
    const y0 = H - 46 - bh;
    panel(W / 2 - bw / 2, y0, bw, bh);
    ctx.fillStyle = '#e8e0d0'; ctx.textAlign = 'center';
    ctx.font = '12px "IBM Plex Mono",monospace';
    lines.forEach((ln, i) => ctx.fillText(ln, W / 2, y0 + 12 + i * 16));
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function refreshMenu() {
  $('bCont').disabled = !save.run;
  $('mBtns').checked = !!save.opts.buttons;
  $('oSound').textContent = 'Som: ' + (save.opts.sound ? 'ligado' : 'desligado');
  $('oShake').textContent = 'Tremor de tela: ' + (save.opts.shake ? 'ligado' : 'desligado');
}
function toggleDiary() { showOv('diary', $('diary').hidden); if (!$('diary').hidden) renderDiary(); }
function renderDiary() {
  $('dstats').textContent = 'Pistas: ' + save.diary.length + ' · Memórias disponíveis: ' + save.memo;
  const ul = $('dlist'); ul.innerHTML = '';
  if (!save.diary.length) {
    const li = document.createElement('li'); li.className = 'muted';
    li.textContent = 'Nenhuma pista ainda. Minere fundo e preste atenção nos meteoros.';
    ul.appendChild(li);
  }
  for (const id of save.diary) {
    const li = document.createElement('li');
    const tg = document.createElement('span'); tg.className = 'tag';
    tg.textContent = id === 'eco' ? 'Eco' : 'Pista';
    li.appendChild(tg); li.appendChild(document.createElement('br'));
    li.appendChild(document.createTextNode(FRAG[id]));
    ul.appendChild(li);
  }
}
function openCraft() {
  scene = 'craft';
  showOv('craft', true);
  renderCraft();
}
function closeCraft() {
  showOv('craft', false);
  scene = 'surface';
  saveRun();
}
function renderCraft() {
  const list = $('craftList'); list.innerHTML = '';
  for (const I of CRAFT) {
    const owned = I.key === 'repair' ? r.repaired : r[I.key];
    const capped = I.max && owned >= I.max;
    const done = I.once && r.repaired;
    const row = document.createElement('div'); row.className = 'row';
    const info = document.createElement('div');
    const nm = document.createElement('strong'); nm.textContent = I.name;
    const ds = document.createElement('small'); ds.textContent = I.desc + (I.max ? ' Tem: ' + r[I.key] + '/' + I.max + '.' : '');
    info.appendChild(nm); info.appendChild(ds);
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn'; btn.style.width = 'auto';
    btn.textContent = I.cost + ' Matéria';
    btn.disabled = capped || done;
    btn.addEventListener('click', () => buy(I));
    row.appendChild(info); row.appendChild(btn);
    list.appendChild(row);
  }
  $('craftNote').textContent = 'Você tem ' + r.mat + ' Matéria. Torres: clique na superfície (1 Prego 60, 2 Choque 120, 3 Sanguessuga 180).';
}
function buy(I) {
  if (r.mat < I.cost) { toast('Faltam ' + (I.cost - r.mat) + ' Matéria.'); return; }
  r.mat -= I.cost;
  if (I.key === 'repair') { r.repaired = true; toast('Motor da base reparado. Agora a nave tem caminho.'); }
  else if (I.key === 'lix') { r.lix++; toast('Drone Lixeiro pronto.'); }
  else if (I.key === 'def') { r.def++; toast('Drone Defensor pronto. Ele fica na base.'); }
  beep(660, 0.08, 'triangle');
  saveRun(); renderCraft();
}
function closeOverlays() {
  if (!$('shipUp').hidden) showOv('shipUp', false);
  if (!$('diary').hidden) showOv('diary', false);
  if (!$('opts').hidden) showOv('opts', false);
  if (scene === 'craft') closeCraft();
}

// ---------- Título ----------
function startNew() {
  makeRun(null);
  scene = 'intro'; introI = 0; introC = 0;
  showOv('menu', false);
}
function continueRun() {
  if (!save.run) return;
  makeRun(save.run);
  scene = 'surface'; P.x = BASE_X - 30; P.y = GROUND;
  showOv('menu', false);
  toast('Você volta ao planeta. Nada mudou.');
}
function drawTitle() {
  drawSurface(camS, 0.6, false);
  ctx.fillStyle = 'rgba(3,5,10,0.2)'; ctx.fillRect(0, 0, W, H);
}

// ---------- Introdução (texto digitado) ----------
function updIntro(dt) {
  const line = INTRO[introI] || '';
  if (introC < line.length) introC = Math.min(line.length, introC + dt * 38);
  if (clickPending || pressed('KeyE') || pressed('Space')) {
    if (introC < line.length) introC = line.length;
    else {
      introI++; introC = 0;
      if (introI >= INTRO.length) { scene = 'ship'; P.x = SHIP_X + 60; P.y = GROUND; }
    }
  }
  clickPending = false;
}
function drawIntro() {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,138,31,0.05)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  const line = INTRO[introI] || '';
  ctx.font = '26px "VT323",monospace'; ctx.fillStyle = '#e8e0d0';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const shown = line.slice(0, Math.floor(introC));
  const parts = wrapText(shown, 480);
  parts.forEach((ln, i) => ctx.fillText(ln, W / 2, 130 + i * 30));
  if (introC >= line.length) {
    ctx.fillStyle = Math.sin(t * 5) > 0 ? '#ff8a1f' : '#5a3a20';
    ctx.font = '14px "IBM Plex Mono",monospace';
    ctx.fillText('E / clique para continuar', W / 2, H - 40);
  }
  ctx.font = '12px "IBM Plex Mono",monospace'; ctx.fillStyle = '#5d6b78';
  ctx.fillText((introI + 1) + ' / ' + INTRO.length, W / 2, H - 16);
  ctx.textAlign = 'left';
}
function wrapText(s, maxW) {
  ctx.font = '26px "VT323",monospace';
  const words = s.split(' '), out = []; let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { out.push(cur); cur = w; } else cur = test;
  }
  if (cur) out.push(cur);
  return out;
}

// ---------- Cabine da nave ----------
function updShip(dt) {
  if (pressed('KeyE') || pressed('Space') || clickPending) {
    clickPending = false;
    scene = 'surface';
    toast('Escotilha aberta. A caverna fica à direita, e a base mais além.');
  }
  clickPending = false;
}
function drawShip() {
  ctx.fillStyle = '#0a0f16'; ctx.fillRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 40, 0, 190);
  sky.addColorStop(0, '#2a1648'); sky.addColorStop(0.6, '#c4577a'); sky.addColorStop(1, '#ffb27a');
  ctx.fillStyle = sky; ctx.fillRect(60, 40, 520, 150);
  ctx.fillStyle = '#2a2030';
  ctx.beginPath(); ctx.moveTo(60, 190); ctx.lineTo(120, 150); ctx.lineTo(180, 176); ctx.lineTo(260, 140); ctx.lineTo(340, 180); ctx.lineTo(420, 146); ctx.lineTo(500, 178); ctx.lineTo(580, 150); ctx.lineTo(580, 190); ctx.fill();
  ctx.fillStyle = '#4a5566';
  ctx.fillRect(40, 30, 560, 8); ctx.fillRect(40, 190, 560, 8); ctx.fillRect(40, 30, 8, 168); ctx.fillRect(592, 30, 8, 168);
  ctx.fillStyle = '#ff8a1f'; ctx.fillRect(60, 196, 520, 2);
  ctx.fillStyle = '#0f1822'; ctx.fillRect(120, 220, 400, 120);
  ctx.strokeStyle = '#2a3c4e'; ctx.strokeRect(120.5, 220.5, 399, 119);
  ctx.font = '13px "IBM Plex Mono",monospace'; ctx.textBaseline = 'middle';
  const lines = ['SISTEMAS: STANDBY', 'O2 NA CABINE: 19%', 'ESCOTILHA: TRAVADA', 'DESTINO: CAVERNA (direita)', 'Memória: fragmentada'];
  lines.forEach((ln, i) => { ctx.fillStyle = i === 2 ? '#ff8a1f' : '#7fe9ff'; ctx.fillText(ln, 136, 236 + i * 18); });
  ctx.fillStyle = Math.sin(t * 4) > 0 ? '#ff4d6d' : '#4a1a24';
  ctx.fillRect(500, 232, 6, 6); ctx.fillStyle = '#7fe9ff'; ctx.fillRect(510, 232, 6, 6);
  ctx.fillStyle = Math.sin(t * 5) > 0 ? '#ffd27a' : '#6b5a30';
  ctx.font = '14px "IBM Plex Mono",monospace'; ctx.textAlign = 'center';
  ctx.fillText('[E] Abrir escotilha', W / 2, 352 - 2);
  ctx.textAlign = 'left';
}

// ---------- HUD ----------
function drawHUD() {
  ctx.save(); ctx.textBaseline = 'middle';
  ctx.font = '11px "IBM Plex Mono",monospace';
  panel(8, 8, 300, 70);
  ctx.fillStyle = '#9fb3c4'; ctx.fillText('O2', 16, 18);
  ctx.fillStyle = '#0a1520'; ctx.fillRect(34, 14, 138, 7);
  ctx.fillStyle = '#7fe9ff'; ctx.fillRect(34, 14, 138 * clamp(r.o2 / 100, 0, 1), 7);
  ctx.font = '12px "IBM Plex Mono",monospace';
  ctx.fillStyle = '#ffd27a'; ctx.fillText('Matéria ' + r.mat, 16, 36);
  ctx.fillStyle = '#d6dde3';
  ctx.fillText('Mochila ' + (r.bag.bruto + r.bag.mat) + '/' + capNow() + ' (bruto ' + r.bag.bruto + ' · mat ' + r.bag.mat + ')', 16, 52);
  ctx.fillStyle = '#9fb3c4'; ctx.fillText('Drones L' + r.lix + ' D' + r.def + (P.dashT > 0 ? ' · dash ' + P.dashT.toFixed(1) : ' · dash pronto'), 16, 68);

  panel(W - 238, 8, 230, 46);
  ctx.font = '12px "IBM Plex Mono",monospace';
  if (r.phase === 'day') {
    ctx.fillStyle = '#ffd27a'; ctx.fillText('DIA · ' + Math.ceil(r.dayT) + 's até a noite', W - 228, 22);
    ctx.fillStyle = '#0a1520'; ctx.fillRect(W - 228, 40, 210, 4);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(W - 228, 40, 210 * clamp(r.dayT / DAY_LEN, 0, 1), 4);
  } else {
    const left = r.nightTotal - r.nightSpawned + r.enemies.length;
    ctx.fillStyle = '#ff8a1f'; ctx.fillText('NOITE ' + (r.cycle + 1) + ' · inimigos ' + left, W - 228, 22);
    ctx.fillStyle = '#d6dde3'; ctx.fillText('Portão', W - 228, 40);
    ctx.fillStyle = '#0a1520'; ctx.fillRect(W - 176, 36, 150, 6);
    ctx.fillStyle = '#ff8a1f'; ctx.fillRect(W - 176, 36, 150 * clamp(r.gate / 100, 0, 1), 6);
  }
  ctx.restore();
}

function drawPrompt(text) {
  if (!text) return;
  ctx.save(); ctx.font = '12px "IBM Plex Mono",monospace';
  const w = Math.min(W - 24, ctx.measureText(text).width + 24);
  panel(W / 2 - w / 2, H - 34, w, 24);
  ctx.fillStyle = '#ffd27a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, H - 22);
  ctx.restore();
}

function missionText() {
  if (scene === 'cave') return 'Minere. Quanto mais à direita, mais valioso e mais perigoso. Volte pela esquerda.';
  if (save.escapes > 0) return r.repaired ? 'Sem novas missões. O loop continua.' : 'Consertar o motor, de novo: 150 Matéria, na mesa de drones.';
  if (!r.repaired) return 'Consertar o motor da base: 150 Matéria, na mesa de drones.';
  return 'Fugir: 300 Matéria, e E na nave.';
}

// ---------- Escape ----------
const ESC_LINES = [[0.5, 'O chão some sob a nave.'], [3, 'Por um instante quase vê o centro do Visível.'], [6, 'Tudo pega fogo.']];
function drawEscapeOverlay() {
  const a = clamp((escT - 4) / 3, 0, 1);
  ctx.fillStyle = 'rgba(240,236,228,' + a + ')'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '28px "VT323",monospace';
  let line = '';
  for (const [tm, s] of ESC_LINES) if (escT >= tm) line = s;
  ctx.fillStyle = escT > 4 ? '#222' : '#ffd9a0';
  ctx.fillText(line, W / 2, H / 2);
  ctx.textAlign = 'left';
}

// ---------- Entrada ----------
addEventListener('keydown', e => {
  keys[e.code] = true; tap[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyL' && (scene === 'surface' || scene === 'cave')) toggleDiary();
  if (e.code === 'Tab') { e.preventDefault(); if (!e.repeat) toggleBuild(); }
  if (e.code === 'Escape') closeOverlays();
  if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') sel = +e.code.slice(5);
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; for (const k in vk) vk[k] = false; });
addEventListener('pointerup', () => { for (const k in vk) vk[k] = false; });
addEventListener('pointercancel', () => { for (const k in vk) vk[k] = false; });
document.querySelectorAll('[data-k]').forEach(b => {
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (b.dataset.k === 'Tab') { toggleBuild(); return; }   // alterna uma vez por toque
    vk[b.dataset.k] = true; tap[b.dataset.k] = true;
  });
});
function toCanvas(e) {
  const b = cv.getBoundingClientRect();
  return { x: (e.clientX - b.left) * W / b.width, y: (e.clientY - b.top) * H / b.height };
}
cv.addEventListener('pointermove', e => { mouse = toCanvas(e); });
cv.addEventListener('pointerleave', () => { mouse = null; });
cv.addEventListener('click', e => {
  clickPending = true;
  if (scene === 'surface' && buildMode) {
    const m = toCanvas(e);
    placeTower(m.x + camSurf());
  }
});

// Botões do menu e das janelas
$('bPlay').addEventListener('click', startNew);
$('bCont').addEventListener('click', continueRun);
$('bOpt').addEventListener('click', () => { refreshMenu(); showOv('opts', true); });
$('oBack').addEventListener('click', () => showOv('opts', false));
function applyRot() { document.body.classList.toggle('force-land', !!save.opts.landscape); $('oRot').checked = !!save.opts.landscape; }
$('oRot').addEventListener('change', e => { save.opts.landscape = e.target.checked; persist(); applyRot(); });
applyRot();
$('oSound').addEventListener('click', () => { save.opts.sound = !save.opts.sound; persist(); refreshMenu(); });
$('oShake').addEventListener('click', () => { save.opts.shake = !save.opts.shake; persist(); refreshMenu(); });
let resetArmed = false;
$('oReset').addEventListener('click', () => {
  if (!resetArmed) { resetArmed = true; $('oReset').textContent = 'Clique de novo para apagar tudo'; return; }
  save.escapes = 0; save.diary = []; save.run = null; persist();
  resetArmed = false; $('oReset').textContent = 'Apagar progresso';
  refreshMenu(); toast('Progresso apagado.');
});
$('cClose').addEventListener('click', closeCraft);
$('dClose').addEventListener('click', () => showOv('diary', false));
$('mDiary').addEventListener('click', toggleDiary);
$('mBtns').addEventListener('change', e => { save.opts.buttons = e.target.checked; persist(); });
document.querySelectorAll('.ov').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el && el.id === 'opts') showOv('opts', false); });
});

// Tela cheia sempre: o palco ocupa a janela e o canvas escala sem moldura.
document.addEventListener('fullscreenchange', () => {
  document.body.classList.toggle('fs', !!document.fullscreenElement);
});

// Câmera da superfície
function camSurf() { return clamp((P.x || 0) - W * 0.45, 0, WORLD - W); }

// ---------- Laço ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; t += dt;
  const paused = !$('diary').hidden || !$('opts').hidden || !$('craft').hidden || !$('shipUp').hidden;

  if (!paused) {
    if (scene === 'title') camS = (camS + dt * 10) % (WORLD - W);
    else if (scene === 'intro') updIntro(dt);
    else if (scene === 'ship') updShip(dt);
    else if (scene === 'surface') updSurface(dt);
    else if (scene === 'cave') updCave(dt);
    else if (scene === 'escape') { escT += dt; if (escT > 8) finishEscape(); }
    const target = (scene !== 'title' && r && r.phase === 'night') ? 1 : 0.6 * (scene === 'title' ? 1 : 0);
    nightF += (target - nightF) * Math.min(1, dt * 0.8);
  }
  if (scene === 'craft' && r) renderCraftLive();

  ctx.save();
  if (shakeT > 0) { shakeT -= dt; if (save.opts.shake) ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4); }

  if (scene === 'title') drawTitle();
  else if (scene === 'intro') drawIntro();
  else if (scene === 'ship') drawShip();
  else if (scene === 'cave') { drawCave(); drawHUD(); drawCaveHUD(); }
  else if (scene === 'over') drawSurface(camSurf(), nightF, true);
  else { drawSurface(camSurf(), nightF, true); drawHUD(); }
  if (scene === 'escape') drawEscapeOverlay();
  if (scene !== 'title') drawTextBar();
  if (scene === 'surface') drawPrompt(surfacePrompt());
  if (scene === 'cave') drawPrompt('Espaço: grudar e martelar · ande para a esquerda para sair');

  // vinheta e linhas de varredura sutis
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  ctx.restore();

  $('menu').hidden = scene !== 'title';
  if (scene === 'title') refreshMenu();
  const showPad = !!save.opts.buttons && scene !== 'title' && scene !== 'over' && $('diary').hidden && $('craft').hidden && $('opts').hidden && $('shipUp').hidden;
  $('padL').hidden = !showPad; $('padR').hidden = !showPad;

  for (const k in prev) prev[k] = down(k);
  for (const k in tap) delete tap[k];
  requestAnimationFrame(frame);
}

// ---------- Modo construção (TAB) ----------
function toggleBuild() {
  if (scene !== 'surface') { toast('Modo construção só na superfície.'); return; }
  buildMode = !buildMode;
  toast(buildMode ? 'Modo construção ligado. Clique para erguer torres. TAB sai.' : 'Modo construção desligado.');
}

// ---------- Nave: terminal da Helix (árvore, craft de torres, sair do planeta) ----------
function openShipUp() { showOv('shipUp', true); showShipView('menu'); }
function showShipView(v) {
  $('shipMenu').hidden = v !== 'menu';
  $('treeView').hidden = v !== 'tree';
  $('towerView').hidden = v !== 'towers';
  if (v === 'menu') $('shipMemo').textContent = 'Memórias: ' + save.memo + ' · Motor: ' + (r && r.repaired ? 'consertado' : 'pendente') + ' · Matéria: ' + (r ? r.mat : 0);
  if (v === 'tree') renderTree();
  if (v === 'towers') renderTowers();
}
function nodeAvailable(id) {
  const N = TREE[id];
  return !save.tree[id] && (N.parents.length === 0 || N.parents.some(p => save.tree[p]));
}
function renderTree() {
  const box = $('treeList'); box.innerHTML = '';
  $('treeMemo').textContent = 'Memórias: ' + save.memo + '. Cada nó desbloqueia o(s) próximo(s). Vale na próxima corrida.';
  TREE_LEVELS.forEach((lv, li) => {
    const row = document.createElement('div'); row.className = 'tree-row';
    lv.forEach(id => {
      const N = TREE[id];
      const bought = !!save.tree[id], avail = nodeAvailable(id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'node' + (bought ? ' on' : avail ? ' avail' : ' lock');
      b.disabled = !avail || save.memo < N.cost;
      const t1 = document.createElement('strong'); t1.textContent = N.name;
      const t2 = document.createElement('small');
      t2.textContent = bought ? 'Comprado · ' + N.fx : avail ? N.fx + ' · ' + N.cost + ' Memórias' : 'Bloqueado';
      b.appendChild(t1); b.appendChild(t2);
      b.addEventListener('click', () => buyNode(id));
      row.appendChild(b);
    });
    box.appendChild(row);
    if (li < TREE_LEVELS.length - 1) {
      const ar = document.createElement('div'); ar.className = 'tree-arrow'; ar.textContent = '↓';
      box.appendChild(ar);
    }
  });
}
function buyNode(id) {
  const N = TREE[id];
  if (!nodeAvailable(id)) return;
  if (save.memo < N.cost) { toast('Faltam ' + (N.cost - save.memo) + ' Memórias.'); return; }
  save.memo -= N.cost; save.tree[id] = true; persist(); beep(660, 0.08, 'triangle');
  toast(N.name + ' desbloqueado: ' + N.fx + '.');
  renderTree();
}
function craftCost(k) { return Math.round(TOW[k].cost * towerMul()); }
function renderTowers() {
  const box = $('towerList'); box.innerHTML = '';
  $('towerMat').textContent = 'Matéria: ' + r.mat + ' · Inventário: Prego ' + r.inv[1] + ' · Choque ' + r.inv[2] + ' · Sanguessuga ' + r.inv[3];
  for (const k of [1, 2, 3]) {
    const T = TOW[k], c = craftCost(k);
    const row = document.createElement('div'); row.className = 'row';
    const info = document.createElement('div');
    const nm = document.createElement('strong'); nm.textContent = T.name + ' · no inventário: ' + r.inv[k];
    const ds = document.createElement('small'); ds.textContent = 'Alcance ' + T.range + ' · ' + T.dmg + ' de dano. Depois, construa no modo TAB.';
    info.appendChild(nm); info.appendChild(ds);
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn'; btn.style.width = 'auto';
    btn.textContent = 'Criar · ' + c + ' Mat.';
    btn.disabled = r.mat < c;
    btn.addEventListener('click', () => {
      if (r.mat < c) return;
      r.mat -= c; r.inv[k]++; saveRun(); beep(560, 0.06, 'triangle');
      renderTowers();
    });
    row.appendChild(info); row.appendChild(btn); box.appendChild(row);
  }
}
function leavePlanet() { showOv('shipUp', false); tryEscape(); }
$('sTree').addEventListener('click', () => showShipView('tree'));
$('sTowers').addEventListener('click', () => showShipView('towers'));
$('sLeave').addEventListener('click', leavePlanet);
$('sClose').addEventListener('click', () => showOv('shipUp', false));
$('treeBack').addEventListener('click', () => showShipView('menu'));
$('towerBack').addEventListener('click', () => showShipView('menu'));

// ---------- Fim de jogo ----------
$('oNew').addEventListener('click', () => { showOv('over', false); startNew(); });
$('oTitle').addEventListener('click', () => { showOv('over', false); scene = 'title'; r = null; makeRun(null); showOv('menu', true); });

// Atualiza os números da mesa enquanto o jogo roda por trás
let craftTick = 0;
function renderCraftLive() {
  craftTick -= 1;
  if (craftTick <= 0) { craftTick = 15; renderCraft(); }
}

// Estado inicial: sem save em andamento, o título espera
scene = 'title';
makeRun(null);
camS = 300;
refreshMenu();
showOv('menu', true);
requestAnimationFrame(frame);
