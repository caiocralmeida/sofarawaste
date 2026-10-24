// Núcleo: constantes, estado, save, áudio, corrida, helpers de desenho.
// Scripts clássicos compartilham o escopo global; este arquivo vem primeiro.

const W = 640, H = 360;
const GROUND = 292, WORLD = 1400;
const SHIP_X = 150, MOUTH_X = 430, BASE_X = 960;
const DAY_LEN = 60;
// Árvore vertical de 20 upgrades. Começa com 1 disponível; cada nó liga o(s) próximo(s) nível.
// Níveis: 1,2,1,2,... até 20 nós. Cada nó dá +1 de um atributo (ciclo de 8 atributos).
const TREE_LEVELS = [[0], [1, 2], [3], [4, 5], [6], [7, 8], [9], [10, 11], [12], [13, 14], [15], [16, 17], [18], [19]];
const TREE_STATS = ['o2', 'cap', 'mine', 'gate', 'dash', 'tow', 'drone', 'ore'];
const TREE_NAMES = { o2: 'Tanque de O2', cap: 'Mochila', mine: 'Martelo ajustado', gate: 'Portão reforçado', dash: 'Propulsor de dash', tow: 'Torres baratas', drone: 'Drones velozes', ore: 'Triturador' };
const TREE_FX = { o2: '+20 de O2 máximo', cap: '+5 de mochila', mine: 'martelar 6% mais rápido', gate: '+30 de vida do portão', dash: 'dash recarrega 7% mais rápido', tow: 'torres 5% mais baratas', drone: 'drones 8% mais rápidos', ore: 'bruto rende +0,25 de matéria' };
const TREE = (() => {
  const out = []; const seen = {};
  TREE_LEVELS.forEach((lv, li) => lv.forEach(id => {
    const s = TREE_STATS[id % 8];
    seen[s] = (seen[s] || 0) + 1;
    out[id] = { id, s, name: TREE_NAMES[s] + ' ' + seen[s], fx: TREE_FX[s], cost: 1 + Math.floor(id / 4), parents: li ? TREE_LEVELS[li - 1] : [] };
  }));
  return out;
})();
function statCount(k) {
  const tr = save.tree || {};
  return TREE.filter(n => tr[n.id] && n.s === k).length;
}
function capNow() { return 25 + statCount('cap') * 5; }
function o2Max() { return 100 + statCount('o2') * 20; }
function gateMax() { return 100 + statCount('gate') * 30; }
function hitCd() { return Math.max(0.12, 0.3 * (1 - 0.06 * statCount('mine'))); }
function dashCd() { return Math.max(0.4, 1.1 * (1 - 0.07 * statCount('dash'))); }
function droneCd() { return Math.max(0.4, 1.1 * (1 - 0.08 * statCount('drone'))); }
function towerMul() { return 1 - Math.min(0.6, 0.05 * statCount('tow')); }
function oreMul() { return 2 + 0.25 * statCount('ore'); }

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cv = $('c'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Entrada
const keys = {}, vk = {}, prev = {};
const down = c => !!(keys[c] || vk[c]);
// Toques rápidos (keydown+keyup no mesmo quadro) ficam na fila até o fim do quadro
const tap = {};
const pressed = c => !!tap[c] || (down(c) && !prev[c]);
const axis = () => ({
  x: (down('ArrowRight') || down('KeyD') ? 1 : 0) - (down('ArrowLeft') || down('KeyA') ? 1 : 0),
  y: (down('ArrowDown') || down('KeyS') ? 1 : 0) - (down('ArrowUp') || down('KeyW') ? 1 : 0)
});

// Estado global
let scene = 'title', t = 0, nightF = 0, shakeT = 0, camS = 0, escT = 0;
let introI = 0, introC = 0, clickPending = false, sel = 1, mouse = null;
const P = { x: SHIP_X + 60, y: GROUND, vx: 0, vy: 0, dir: 1, walk: 0, grab: null, ox: 0, oy: 0, hitT: 0 };
P.dashV = 0; P.dashT = 0;
let buildMode = false;
let overMsg = '';
let r = null;               // corrida atual
let meteors = [], gas = [], sparks = [];

// Save persistente (progresso entre corridas)
const save = { escapes: 0, diary: [], memo: 0, tree: {}, opts: { sound: true, shake: true, buttons: !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) }, run: null };
try {
  const s = JSON.parse(localStorage.getItem('sofar-v2') || 'null');
  if (s) { Object.assign(save, s); save.opts = Object.assign({ sound: true, shake: true }, s.opts || {}); }
} catch (e) {}
function persist() { try { localStorage.setItem('sofar-v2', JSON.stringify(save)); } catch (e) {} }
function saveRun() {
  if (!r) return;
  save.run = { mat: r.mat, repaired: r.repaired, lix: r.lix, def: r.def, towers: r.towers, cycle: r.cycle, inv: r.inv };
  persist();
}

// Fragmentos narrativos (texto curto de cada pista)
const FRAG = {
  eco: 'Risada de criança presa num meteoro. Quando você a ouve, o oxigênio para de cair por 5 segundos. Ninguém explica.',
  log1: 'LOG RECUPERADO · Câmara 7-B. "Protocolo padrão aplicado. Lote etiquetado para descarte no Não-Visível."',
  log2: 'PÔSTER DE RH, meio queimado: "Quitting now would make everything you\'ve done so far a waste."',
  foto: 'FOTO QUEIMADA · Um homem de costas. Uma criança segurando um panfleto com robôs em greve.',
  voz: 'TRANSMISSÃO · "Processamos sua solicitação. Isso está fora do meu escopo."'
};
const LOGS = ['log1', 'log2', 'foto', 'voz'];
function addDiary(id) {
  if (save.diary.includes(id)) return false;
  save.diary.push(id); save.memo++; persist(); return true;
}
function found() {
  const id = LOGS[Math.floor(Math.random() * LOGS.length)];
  if (addDiary(id)) toast('Pista achada no meteoro. Veja o Diário.');
}

// Mensagens
let toastTimer = 0, toastText = '';
function toast(msg) {
  toastText = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastText = ''; }, 7000);
}
function wakeText() {
  return save.escapes === 0
    ? 'Você acorda dentro da nave, num planeta. Sem memória. O oxigênio cai.'
    : 'Você acorda num planeta. Sem memória de nada.';
}

// Áudio simples (só após interação, como o viewer exige)
let AC = null;
function beep(f = 440, d = 0.06, type = 'square', v = 0.025) {
  if (!save.opts.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = v;
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d);
    o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + d);
  } catch (e) {}
}

// Cor: interpolação entre dia e noite
function hex2(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function mixC(a, b, f) {
  const A = hex2(a), B = hex2(b);
  return `rgb(${(A[0] + (B[0] - A[0]) * f) | 0},${(A[1] + (B[1] - A[1]) * f) | 0},${(A[2] + (B[2] - A[2]) * f) | 0})`;
}

// Aleatório determinístico para o planeta ficar igual a cada visita
function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let q = Math.imul(a ^ a >>> 15, 1 | a);
    q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q;
    return ((q ^ q >>> 14) >>> 0) / 4294967296;
  };
}

// Glow radial barato (sem shadowBlur)
function glow(x, y, rad, col, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = a; ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

// Painéis e barras de HUD
function panel(x, y, w, h) {
  ctx.fillStyle = 'rgba(6,10,16,0.72)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(127,233,255,0.12)'; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
}

// Corrida: nasce do save (snapshot) ou do zero
function makeRun(snap) {
  const s = snap || {};
  r = {
    mat: s.mat || 0, repaired: !!s.repaired, lix: s.lix || 0, def: s.def || 0,
    towers: s.towers || [], cycle: s.cycle || 0, inv: Object.assign({ 1: 0, 2: 0, 3: 0 }, s.inv || {}),
    o2: o2Max(), gate: gateMax(), phase: 'day', dayT: DAY_LEN,
    nightTotal: 0, nightSpawned: 0, spawnT: 0,
    enemies: [], bag: { bruto: 0, mat: 0 }, freeze: 0, droneT: 0, defT: 0
  };
  meteors = []; gas = []; sparks = [];
  P.grab = null; P.vx = P.vy = 0;
}

function die(msg) {
  save.run = null; persist();
  overMsg = msg;
  scene = 'over';
  P.grab = null;
  $('overMsg').textContent = msg;
  showOv('over', true);
}
// Dash: impulso curto com recarga de 1,1 s (Shift, ou botão na tela)
function tryDash(a) {
  if (P.dashT > 0) return;
  P.dashT = dashCd();
  const dx = a.x || P.dir;
  P.dir = dx;
  if (scene === 'cave') {
    P.grab = null; P.vx = dx * 340; P.vy = a.y * 200;
  } else {
    P.dashV = dx * 340;
  }
  beep(900, 0.05, 'sine', 0.03);
}

// Partículas de faísca (coordenadas do mundo)
function burst(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    sparks.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.8) * 120, life: 0.5 + Math.random() * 0.4, c: col });
  }
}
function updSparks(dt) {
  for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 200 * dt; s.life -= dt; }
  sparks = sparks.filter(s => s.life > 0);
}
function drawSparks(cam) {
  for (const s of sparks) {
    ctx.globalAlpha = clamp(s.life * 2, 0, 1);
    ctx.fillStyle = s.c; ctx.fillRect(Math.round(s.x - cam), Math.round(s.y), 2, 2);
  }
  ctx.globalAlpha = 1;
}
