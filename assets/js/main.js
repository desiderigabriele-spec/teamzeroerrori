import { initMatrix } from './matrix.js';
import { initProtection } from './protect.js';

// =========================================================
// CONFIGURAZIONE — da compilare prima della pubblicazione
// =========================================================
const CONFIG = {
  contactEmail: 'info@teamzeroerrori.it',   // TODO: email reale
  whatsapp: '',                             // TODO: es. '393331234567' (solo cifre, con prefisso). Usato dal pulsante "Scrivi a Francesco"
  responseTime: '',                         // TODO: tempo di risposta REALE in chat, es. '2 ore'. Vuoto = "ti risponde una persona"
  formEndpoint: '',                         // TODO: endpoint POST JSON. Vuoto = invio via email
  tradingViewBacktestUrl: '',               // TODO: link pubblico al backtest su TradingView
  tradingViewSymbol: 'OANDA:XAUUSD',        // simbolo per il prezzo live (caricato solo dopo il consenso del visitatore)
  prices: {                                 // TODO: prezzi IVA inclusa, es. '€ 497'. Vuoto = "Prezzo su richiesta"
    recluta: '',
    operatore: '',
  },
  // TODO: registro operazioni REALE e completo (anche le perdite). Finché è vuoto
  // il sito mostra un esempio di formato con l'etichetta "ESEMPIO".
  // Formato: { data: '14/10', direzione: 'Long', conferme: '4/4', r: -1 }
  trades: [],
  // TODO: posti one-to-one REALI del mese, es. { mese: 'novembre', totali: 8, liberi: 3 }.
  // null = sezione nascosta (una scarsità inventata è pubblicità ingannevole).
  slots: null,
  // TODO: foto reali del team, es. { francesco: 'assets/team/francesco.jpg', ... }
  photos: {},
  // blocca copia, salvataggio immagini, stampa e scoraggia gli screenshot
  protectContent: true,
};

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
document.documentElement.classList.add('js');

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
const storage = (area) => ({
  get(k) { try { return window[area].getItem(k); } catch { return null; } },
  set(k, v) { try { window[area].setItem(k, v); } catch { /* storage non disponibile */ } },
});
const local = storage('localStorage');
const session = storage('sessionStorage');

// esegue fn la prima volta che el entra nello schermo
function onceVisible(el, fn, threshold = 0.4) {
  if (!el) return;
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    fn();
  }, { threshold }).observe(el);
}
// restituisce una funzione che dice se el è visibile adesso
function visibility(el) {
  let v = false;
  new IntersectionObserver(([e]) => { v = e.isIntersecting; }).observe(el);
  return () => v;
}
// canvas nitido su schermi ad alta densità
function fitCanvas(cv, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || 300;
  cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

// =========================================================
// SFONDO: pioggia Matrix (reagisce al cursore)
// =========================================================
const matrix = initMatrix($('#matrix'), { reduced });

// =========================================================
// AVVIO (breve, una volta per sessione)
// =========================================================
const BOOT_LINES = [
  ['> connessione XAU/USD ........ ', 'OK'],
  ['> indicatore 4 conferme ...... ', 'OK'],
  ['> rischio 1% per operazione .. ', 'OK'],
  ['> accesso consentito.', ''],
];

async function boot() {
  const el = $('#boot');
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    el.classList.add('done');
    document.body.classList.remove('is-booting');
    session.set('tze-booted', '1');
    typeHeroTitle();
  };
  if (reduced || session.get('tze-booted')) { finish(); return; }
  window.addEventListener('keydown', finish, { once: true });
  el.addEventListener('pointerdown', finish, { once: true });

  const log = $('#boot-log');
  const bar = $('#boot-progress');
  for (let i = 0; i < BOOT_LINES.length && !finished; i++) {
    const [txt, ok] = BOOT_LINES[i];
    log.append(txt);
    await sleep(160);
    if (ok) {
      const s = document.createElement('span');
      s.className = 'ok';
      s.textContent = ok;
      log.append(s);
    }
    log.append('\n');
    bar.style.width = `${((i + 1) / BOOT_LINES.length) * 100}%`;
    await sleep(120);
  }
  await sleep(250);
  finish();
}

// =========================================================
// HERO: titolo digitato
// =========================================================
async function typeHeroTitle() {
  if (reduced) return;
  const h1 = $('#hero-title');
  const a = "Impara a fare trading sull'oro con un metodo a ";
  const b = 'regole fisse.';
  h1.textContent = '';
  const caret = document.createElement('span');
  caret.className = 'caret';
  caret.setAttribute('aria-hidden', 'true');
  caret.textContent = '█';
  const txt = document.createTextNode('');
  const gold = document.createElement('span');
  gold.className = 'gold';
  h1.append(txt, gold, caret);
  for (const ch of a) { txt.data += ch; await sleep(24); }
  for (const ch of b) { gold.textContent += ch; await sleep(55); }
  await sleep(1800);
  caret.remove();
}

// =========================================================
// HERO: grafico a candele simulato con le 4 conferme
// =========================================================
(() => {
  const cv = $('#chart');
  const hud = $('#chart-hud');
  const leds = $$('.led', hud);
  const state = $('#chart-state');
  const isVisible = visibility(cv);
  const narrator = $('#narrator');
  const steps = $$('#chart-steps li');
  let c = fitCanvas(cv, 240);
  const candles = [];
  let price = 100;
  function add(bias = 0) {
    const o = price;
    const cl = o + (Math.random() - 0.5 + bias) * 2.2;
    const hi = Math.max(o, cl) + Math.random() * 1.1;
    const lo = Math.min(o, cl) - Math.random() * 1.1;
    candles.push({ o, c: cl, hi, lo, mark: false });
    price = cl;
    if (candles.length > 90) candles.shift();
  }
  for (let i = 0; i < 70; i++) add();

  function draw() {
    const { ctx, w, h } = c;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,255,65,.07)';
    ctx.lineWidth = 1;
    for (let y = 30; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const n = Math.min(candles.length, Math.floor(w / 9));
    const vis = candles.slice(-n);
    const max = Math.max(...vis.map((k) => k.hi));
    const min = Math.min(...vis.map((k) => k.lo));
    const Y = (v) => 18 + (1 - (v - min) / (max - min || 1)) * (h - 70);
    const step = w / n;
    vis.forEach((k, i) => {
      const x = i * step + step / 2;
      const up = k.c >= k.o;
      ctx.strokeStyle = ctx.fillStyle = up ? '#00ff41' : '#ff4d4d';
      ctx.beginPath(); ctx.moveTo(x, Y(k.hi)); ctx.lineTo(x, Y(k.lo)); ctx.stroke();
      const top = Y(Math.max(k.o, k.c));
      ctx.fillRect(x - step * 0.32, top, step * 0.64, Math.max(1, Math.abs(Y(k.o) - Y(k.c))));
      if (k.mark) {
        const yy = Y(k.lo) + 14;
        ctx.fillStyle = '#ffc94a';
        ctx.beginPath(); ctx.moveTo(x, yy - 8); ctx.lineTo(x - 7, yy + 4); ctx.lineTo(x + 7, yy + 4); ctx.fill();
        ctx.font = '600 10px ui-monospace, Menlo, monospace';
        ctx.fillText('SETUP', x - 15, yy + 17);
      }
    });
    const ly = Y(price);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,201,74,.6)';
    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(w, ly); ctx.stroke();
    ctx.setLineDash([]);
  }
  function setLeds(n) {
    leds.forEach((l, i) => l.classList.toggle('on', i < n));
    hud.classList.toggle('all', n === 4);
    state.textContent = n === 4 ? '4 su 4 · SETUP' : `${n} su 4 · aspetta`;
    // spiegazione in parole semplici, sincronizzata con le spie
    const step = n === 0 ? 0 : n < 4 ? 1 : 2;
    steps.forEach((li, i) => li.classList.toggle('is-on', i === step));
    if (n === 0) narrator.textContent = "Questo è il grafico dell'oro. L'indicatore lo analizza candela per candela.";
    else if (n < 4) narrator.textContent = `Ogni spia accesa è una delle 4 conferme del metodo. Con ${n} su 4 non si entra: si aspetta.`;
    else narrator.innerHTML = '<b>4 su 4: compare il segnale SETUP.</b> Solo adesso il metodo prevede di valutare l\'operazione.';
    narrator.classList.toggle('go', n === 4);
  }

  draw();
  setLeds(reduced ? 4 : 0);
  window.addEventListener('resize', () => { c = fitCanvas(cv, 240); draw(); });
  if (reduced) return;
  let lit = 0;
  let tick = 0;
  setInterval(() => {
    if (!isVisible() || document.hidden) return;
    tick++;
    if (lit < 4 && tick % 3 === 0) { lit++; setLeds(lit); }
    add(lit >= 4 ? 0.35 : 0);
    if (lit === 4) {
      candles[candles.length - 1].mark = true;
      lit = 5;
      matrix.burst(1200);
    } else if (lit === 5 && tick % 12 === 0) {
      lit = 0;
      setLeds(0);
    }
    draw();
  }, 800);
})();

// =========================================================
// HERO: countdown reale alla prossima candela da 15 minuti
// =========================================================
(() => {
  const el = $('#clock');
  const ring = $('#clock-ring');
  const C = 213.6;
  const P = 15 * 60 * 1000;
  function tick() {
    const left = P - (Date.now() % P);
    const s = Math.ceil(left / 1000);
    el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    ring.setAttribute('stroke-dashoffset', String(C * (1 - left / P)));
  }
  tick();
  setInterval(tick, 1000);
})();

// =========================================================
// HERO: prezzo live (TradingView, solo dopo consenso)
// =========================================================
(() => {
  const live = $('#tk-live');
  const note = $('#tk-note');
  const KEY = 'tze-tv-consent';
  function load() {
    live.classList.add('loaded');
    live.innerHTML = '<div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div></div>';
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';
    s.async = true;
    s.textContent = JSON.stringify({ symbol: CONFIG.tradingViewSymbol, width: '100%', colorTheme: 'dark', isTransparent: true, locale: 'it' });
    $('.tradingview-widget-container', live).append(s);
  }
  if (local.get(KEY) === 'yes') { load(); return; }
  $('#tk-btn').addEventListener('click', () => { note.hidden = false; });
  $('#tk-no').addEventListener('click', () => { note.hidden = true; });
  $('#tk-ok').addEventListener('click', () => { local.set(KEY, 'yes'); note.hidden = true; load(); });
})();

// =========================================================
// COMPARSA ALLO SCROLL + TITOLI CHE SI DECODIFICANO
// =========================================================
const GLYPHS = '!<>-_\\/[]{}=+*^?#01アカサタナ';
function scramble(el) {
  if (reduced || el.dataset.done) return;
  el.dataset.done = '1';
  const text = el.textContent;
  const start = performance.now();
  const dur = 600 + text.length * 10;
  (function step(now) {
    const p = clamp01((now - start) / dur);
    const rev = Math.floor(p * text.length);
    el.textContent = [...text].map((ch, i) => (i < rev || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = text;
  })(start);
}
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $$('[data-scramble]', e.target).forEach(scramble);
    if (e.target.matches('[data-scramble]')) scramble(e.target);
    io.unobserve(e.target);
  });
}, { threshold: 0.15 });
$$('[data-reveal]').forEach((el) => io.observe(el));

// =========================================================
// PROBLEMA: log degli errori
// =========================================================
(() => {
  const btns = $$('#errlog button');
  const bar = $('#err-bar');
  const msg = $('#err-msg');
  const M = [
    'Clicca gli errori che hai già fatto.',
    'Uno solo, ma basta per svuotare un conto.',
    'Due errori con lo stesso colpevole: nessuna regola scritta.',
    'Tre su cinque: non è sfortuna, manca un protocollo.',
    'Quattro. Ti sei riconosciuto bene: è il primo passo per correggerli.',
    'Tutti e cinque. Li abbiamo fatti anche noi: per questo esiste il metodo.',
  ];
  btns.forEach((b) => b.addEventListener('click', () => {
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    const n = btns.filter((x) => x.getAttribute('aria-pressed') === 'true').length;
    bar.style.width = `${(n / btns.length) * 100}%`;
    msg.textContent = M[n];
  }));
})();

// =========================================================
// PROBLEMA: slider prima / dopo
// =========================================================
(() => {
  const a = $('#ba-a');
  const b = $('#ba-b');
  const r = $('#ba-r');
  const line = $('#ba-line');
  const H = () => $('#ba').clientHeight;
  function seeded(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function paint(cv, mode) {
    const { ctx, w, h } = fitCanvas(cv, H());
    ctx.fillStyle = '#020403';
    ctx.fillRect(0, 0, w, h);
    const rnd = seeded(7);
    const n = mode === 'a' ? 70 : 24;
    const step = w / n;
    let p = h / 2;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const o = p;
      const cl = p + (rnd() - 0.5) * (mode === 'a' ? 26 : 30) - (mode === 'b' && i > 12 ? 6 : 0);
      pts.push({ x: i * step + step / 2, o, cl, hi: Math.min(o, cl) - rnd() * 10, lo: Math.max(o, cl) + rnd() * 10 });
      p = Math.min(h - 50, Math.max(50, cl));
    }
    pts.forEach((k) => {
      const up = k.cl < k.o;
      ctx.strokeStyle = ctx.fillStyle = up ? (mode === 'a' ? '#2fb862' : '#00ff41') : (mode === 'a' ? '#c94848' : '#ff4d4d');
      ctx.beginPath(); ctx.moveTo(k.x, k.hi); ctx.lineTo(k.x, k.lo); ctx.stroke();
      ctx.fillRect(k.x - step * 0.3, Math.min(k.o, k.cl), step * 0.6, Math.max(1, Math.abs(k.o - k.cl)));
    });
    ctx.font = '700 11px ui-monospace, Menlo, monospace';
    if (mode === 'a') {
      for (let i = 0; i < 23; i++) {
        const k = pts[(i * 3 + 1) % pts.length];
        ctx.fillStyle = rnd() > 0.5 ? '#00ff41' : '#ff4d4d';
        ctx.fillText(rnd() > 0.5 ? '▲' : '▼', k.x - 4, k.lo + 14);
      }
    } else {
      const k = pts[12];
      ctx.fillStyle = '#ffc94a';
      ctx.beginPath(); ctx.moveTo(k.x, k.lo + 6); ctx.lineTo(k.x - 8, k.lo + 18); ctx.lineTo(k.x + 8, k.lo + 18); ctx.fill();
      ctx.fillText('4/4', k.x - 10, k.lo + 32);
    }
  }
  function set() {
    b.style.clipPath = `inset(0 0 0 ${r.value}%)`;
    line.style.left = `${r.value}%`;
  }
  function all() { paint(a, 'a'); paint(b, 'b'); set(); }
  r.addEventListener('input', set);
  window.addEventListener('resize', all);
  all();
  // piccolo "invito" a trascinare la prima volta che si vede
  onceVisible($('#ba'), async () => {
    if (reduced) return;
    for (const v of [50, 30, 70, 50]) { r.value = v; set(); await sleep(450); }
  }, 0.6);
})();

// =========================================================
// METODO: le 4 linee si incrociano una alla volta
// =========================================================
(() => {
  const box = $('#metodo-visual');
  const paths = $$('.cl', box);
  const confs = $$('.conf', box);
  const label = $('#cross-label');
  const light = (n) => {
    paths.forEach((p, i) => p.classList.toggle('on', i < n));
    confs.forEach((c, i) => c.classList.toggle('on', i < n));
    const all = n === 4;
    box.classList.toggle('all', all);
    label.textContent = all ? '4 su 4 · setup valido' : `${n} su 4 · si aspetta`;
  };
  onceVisible(box, async () => {
    if (reduced) { light(4); return; }
    for (let n = 1; n <= 4; n++) { await sleep(650); light(n); }
    matrix.burst(1400);
  }, 0.5);
})();

// =========================================================
// METODO: mini-gioco "Entreresti?"
// =========================================================
(() => {
  const ledsBox = $('#game-leds');
  const leds = $$('.led', ledsBox);
  const fb = $('#game-fb');
  const label = $('#game-n');
  let rounds;
  let idx;
  let score;
  let locked = false;
  function show() {
    const k = rounds[idx];
    leds.forEach((l, i) => l.classList.toggle('on', i < k));
    ledsBox.classList.toggle('all', k === 4);
    label.textContent = `Situazione ${idx + 1} di 3 · ${k} conferme su 4`;
  }
  function reset() {
    rounds = [2, 4, 3].sort(() => Math.random() - 0.5);
    idx = 0;
    score = 0;
    fb.textContent = '';
    fb.className = 'game-fb';
    show();
  }
  $$('#game [data-a]').forEach((btn) => btn.addEventListener('click', () => {
    if (locked) return;
    if (idx >= 3) { reset(); return; }
    const k = rounds[idx];
    const right = (k === 4) === (btn.dataset.a === 'in');
    if (right) score++;
    fb.className = `game-fb ${right ? 'ok' : 'ko'}`;
    if (right) fb.textContent = k === 4 ? '✓ Giusto: 4 su 4, il setup è valido.' : `✓ Giusto: con ${k} su 4 si aspetta.`;
    else fb.textContent = k === 4 ? '✗ Era il momento giusto: tutte e 4 le conferme erano accese.' : `✗ Con ${k} su 4 non si entra: ne manca ${4 - k === 1 ? 'una' : 'più di una'}.`;
    idx++;
    locked = true;
    setTimeout(() => {
      locked = false;
      if (idx < 3) { show(); return; }
      fb.className = 'game-fb ok';
      fb.textContent = `Punteggio: ${score}/3. Hai capito la regola base; nel corso impari a riconoscere le 4 conferme da solo. Premi un bottone per rigiocare.`;
      if (score === 3) matrix.burst(1400);
    }, 1000);
  }));
  reset();
})();

// =========================================================
// RISCHIO: calcolatore + simulatore 5 stop
// =========================================================
(() => {
  const inp = $('#cap-input');
  const rng = $('#cap-range');
  const out = { risk: $('#o-risk'), loss: $('#o-loss'), t3: $('#o-t3'), t5: $('#o-t5') };
  const capital = () => Math.max(0, Number(inp.value) || 0);
  function calc() {
    const r = capital() * 0.01;
    out.risk.textContent = eur.format(r);
    out.loss.textContent = `−${eur.format(r)}`;
    out.t3.textContent = `+${eur.format(r * 3)}`;
    out.t5.textContent = `+${eur.format(r * 5)}`;
    $('#d-cap').textContent = eur.format(capital());
    $('#d-n').textContent = '0';
    $('#d-bar').style.width = '100%';
  }
  inp.addEventListener('input', () => { rng.value = inp.value; calc(); });
  rng.addEventListener('input', () => { inp.value = rng.value; calc(); });
  calc();

  let busy = false;
  $('#d-btn').addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    const start = capital();
    let cap = start;
    $('#d-bar').style.width = '100%';
    for (let i = 1; i <= 5; i++) {
      await sleep(reduced ? 0 : 500);
      cap *= 0.99;
      $('#d-cap').textContent = eur.format(cap);
      $('#d-n').textContent = String(i);
      $('#d-bar').style.width = `${(cap / (start || 1)) * 100}%`;
    }
    $('#d-msg').textContent = `Dopo 5 stop all'1% ti resta il ${((cap / (start || 1)) * 100).toFixed(1).replace('.', ',')}% del conto. Con il 10% a operazione ti resterebbe il 59%.`;
    busy = false;
  });
})();

// =========================================================
// TRASPARENZA: numeri, backtest, registro, garanzie
// =========================================================
function countUp(el, to, dec = 0, dur = 1500) {
  if (reduced) { el.textContent = to.toFixed(dec); return; }
  const start = performance.now();
  (function step(now) {
    const p = clamp01((now - start) / dur);
    el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(dec);
    if (p < 1) requestAnimationFrame(step);
  })(start);
}
onceVisible($('#stats'), () => $$('#stats [data-to]').forEach((el) => countUp(el, Number(el.dataset.to))));
onceVisible($('#gauge-fg'), () => {
  $('#gauge-fg').style.strokeDashoffset = String(252 * (1 - 3.5 / 5));
  $$('[data-count]').forEach((el) => countUp(el, parseFloat(el.dataset.count), Number(el.dataset.decimals || 0), 1800));
});
(() => {
  const tv = $('#tv-link');
  if (CONFIG.tradingViewBacktestUrl) tv.href = CONFIG.tradingViewBacktestUrl;
  else { tv.removeAttribute('target'); tv.href = '#accesso'; tv.textContent = 'Richiedi il link al backtest'; }
})();

(() => {
  const EXAMPLE = [
    { data: '14/10', direzione: 'Long', conferme: '4/4', r: -1 },
    { data: '15/10', direzione: 'Short', conferme: '4/4', r: 3 },
    { data: '15/10', direzione: 'Long', conferme: '4/4', r: 0 },
    { data: '16/10', direzione: 'Long', conferme: '4/4', r: -1 },
    { data: '17/10', direzione: 'Short', conferme: '4/4', r: 4.2 },
  ];
  const real = CONFIG.trades.length > 0;
  const rows = real ? CONFIG.trades : EXAMPLE;
  const fmtR = (r) => `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r).toFixed(1).replace('.', ',')} R`;
  const cls = (r) => (r > 0 ? 'pos' : r < 0 ? 'neg' : 'be');
  $('#tlog-example').hidden = real;
  $('#tlog').innerHTML = rows.map((t) => `<tr><td>${t.data}</td><td>${t.direzione}</td><td>${t.conferme}</td><td class="${cls(t.r)}">${fmtR(t.r)}${t.r === 0 ? ' (pareggio)' : ''}</td></tr>`).join('');
  const tot = rows.reduce((s, t) => s + t.r, 0);
  $('#tlog-tot-l').textContent = real ? `Totale (${rows.length} operazioni)` : 'Totale (esempio)';
  const totEl = $('#tlog-tot');
  totEl.textContent = fmtR(tot);
  totEl.className = cls(tot);
  onceVisible($('#tlog'), () => $$('#tlog tr').forEach((tr, i) => setTimeout(() => tr.classList.add('in'), reduced ? 0 : i * 200)), 0.3);
})();

onceVisible($('#nots'), () => setTimeout(() => $('#nots').classList.add('go'), 250), 0.6);
onceVisible($('#manifesto'), () => $('#manifesto').classList.add('go'), 0.5);
// su touch il badge si gira al tocco
$$('.badge').forEach((b) => b.addEventListener('click', (e) => { if (!e.target.closest('a')) b.classList.toggle('flip'); }));

// =========================================================
// PERCORSI: quiz, interruttore, posti
// =========================================================
const plansBox = $('#plans');
function setPlan(plan, { match = false } = {}) {
  $$('.plan', plansBox).forEach((p) => {
    const on = p.id === `plan-${plan}`;
    p.classList.toggle('is-on', on);
    p.classList.toggle('is-match', on && match);
  });
  $$('.toggle button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.plan === plan)));
  plansBox.classList.remove('swap');
  void plansBox.offsetWidth;
  plansBox.classList.add('swap');
}
$$('.toggle button').forEach((b) => b.addEventListener('click', () => setPlan(b.dataset.plan)));
let chosenPlan = '';

(() => {
  const Q = [
    ['Da quanto fai trading?', [['Mai o quasi', 0], ['Meno di un anno', 1], ['Da 1–2 anni o più', 2]]],
    ['Sai impostare da solo stop loss e size?', [['No', 0], ['Più o meno', 1], ['Sì', 2]]],
    ['Cosa ti serve di più?', [['Basi solide, con qualcuno che mi segue', 0], ['Un metodo preciso da applicare', 2]]],
  ];
  const q = $('#quiz-q');
  const opts = $('#quiz-opts');
  const res = $('#quiz-res');
  let i = 0;
  let tot = 0;
  let first = 0;
  function show() {
    opts.innerHTML = '';
    if (i >= Q.length) {
      const plan = first > 0 && tot >= 4 ? 'operatore' : 'recluta';
      chosenPlan = plan;
      q.textContent = 'Analisi completata.';
      res.innerHTML = plan === 'operatore'
        ? 'Ti consigliamo il <b class="gold">Protocollo Operatore</b>: vai dritto al metodo.'
        : 'Ti consigliamo il <b class="g">Protocollo Recluta</b>: 12 lezioni e 5 sessioni one-to-one per partire bene.';
      setPlan(plan, { match: true });
      const again = document.createElement('button');
      again.type = 'button';
      again.textContent = '↺ Rifai il test';
      again.addEventListener('click', () => { i = 0; tot = 0; res.textContent = ''; show(); });
      opts.append(again);
      return;
    }
    q.textContent = `[${i + 1}/3] ${Q[i][0]}`;
    Q[i][1].forEach(([t, v]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t;
      b.addEventListener('click', () => { if (i === 0) first = v; tot += v; i++; show(); });
      opts.append(b);
    });
  }
  show();
})();

(() => {
  const s = CONFIG.slots;
  if (!s || !s.totali) return;
  $('#slot-row').innerHTML = Array.from({ length: s.totali }, (_, i) => `<span class="slot ${i < s.totali - s.liberi ? 'taken' : 'free'}"></span>`).join('');
  $('#slot-text').innerHTML = `Nuovi studenti che Francesco può ancora seguire a ${s.mese}: <b class="gold">${s.liberi} su ${s.totali}</b>`;
  $('#slots').hidden = false;
})();

$$('[data-price]').forEach((el) => {
  const v = CONFIG.prices[el.dataset.price];
  if (v) el.textContent = v;
});

// =========================================================
// TEAM: foto e dossier che si scrivono da soli
// =========================================================
$$('[data-photo]').forEach((el) => {
  const src = CONFIG.photos[el.dataset.photo];
  if (!src) return;
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.loading = 'lazy';
  el.append(img);
});
$$('[data-dossier]').forEach((card) => {
  const pre = $('.dossier-out', card);
  const lines = card.dataset.dossier.split('|');
  onceVisible(card, async () => {
    if (reduced) return;
    pre.textContent = '';
    for (const line of lines) {
      for (const ch of line) { pre.textContent += ch; await sleep(14); }
      pre.textContent += '\n';
    }
  }, 0.5);
});

// =========================================================
// FAQ in forma di chat
// =========================================================
(() => {
  const log = $('#chat-log');
  const qs = $('#chat-qs');
  const FAQ = [
    ['Mi garantite che guadagnerò?', 'No, e diffida di chi te lo garantisce. Il trading comporta un rischio reale di perdere denaro. Ti diamo regole chiare, uno strumento per rispettarle e ti seguiamo mentre impari.'],
    ['È consulenza finanziaria?', 'No, facciamo formazione. Non siamo consulenti finanziari autorizzati, non gestiamo il tuo denaro e non ti diciamo cosa fare sul tuo conto: le decisioni restano tue.'],
    ["Cos'è l'indicatore?", "È uno script per TradingView che evidenzia quando le 4 condizioni del metodo si verificano insieme. Non opera al posto tuo. Ti serve un account TradingView: ti aiuto io ad attivarlo."],
    ['Quanto capitale serve?', 'Il metodo ragiona in percentuale, 1% per operazione, quindi si adatta a conti diversi. Ti consiglio di fare pratica prima su un conto demo e di usare solo denaro che puoi permetterti di perdere.'],
    ['Quanto tempo richiede?', 'Lavoriamo sul grafico a 15 minuti: non serve stare tutto il giorno davanti allo schermo.'],
    ['Posso recedere?', 'Hai 14 giorni, salvo che tu chieda di accedere subito ai contenuti digitali accettando di perdere il recesso. Trovi tutto nei Termini di vendita.'],
  ];
  const add = (cls, html) => {
    const d = document.createElement('div');
    d.className = `msg ${cls}`;
    d.innerHTML = html;
    log.append(d);
    while (log.children.length > 6) log.firstChild.remove();
    return d;
  };
  add('him', '<small>Francesco</small>Ciao! Sono Francesco. Tocca una domanda qui sotto e ti rispondo.');
  let busy = false;
  FAQ.forEach(([q, a]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = q;
    b.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      b.classList.add('asked');
      add('me', q);
      const t = add('him', '<span class="typing" aria-label="Francesco sta scrivendo"><i></i><i></i><i></i></span>');
      await sleep(reduced ? 0 : 900 + a.length * 6);
      t.innerHTML = `<small>Francesco</small>${a}`;
      busy = false;
    });
    qs.append(b);
  });
})();

// =========================================================
// MODALE DI RICHIESTA
// =========================================================
const modal = (() => {
  const box = $('#modal');
  const form = $('#access-form');
  const err = $('#form-err');
  const ok = $('#form-ok');
  const okMsg = $('#form-ok-msg');
  let lastFocus = null;

  function open(plan = '', name = '') {
    lastFocus = document.activeElement;
    box.hidden = false;
    form.hidden = false;
    ok.hidden = true;
    err.textContent = '';
    form.percorso.value = plan || chosenPlan || '';
    if (name) form.nome.value = name;
    document.body.style.overflow = 'hidden';
    setTimeout(() => (name ? form.email : form.nome).focus(), 50);
  }
  function close() {
    box.hidden = true;
    document.body.style.overflow = '';
    lastFocus?.focus();
  }
  $$('[data-open-form]').forEach((b) => b.addEventListener('click', () => open(b.dataset.openForm)));
  $$('[data-close]', box).forEach((el) => el.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = $$('input, select, button, a[href]', box).filter((x) => !x.closest('[hidden]'));
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const data = Object.fromEntries(new FormData(form));
    if (!data.nome?.trim()) { err.textContent = 'Inserisci il tuo nome.'; form.nome.focus(); return; }
    if (!data.email || !form.email.checkValidity()) { err.textContent = 'Inserisci un indirizzo email valido.'; form.email.focus(); return; }
    if (!form.privacy.checked) { err.textContent = "Conferma di aver letto l'informativa privacy."; return; }

    const payload = {
      nome: data.nome.trim(),
      email: data.email.trim(),
      telefono: (data.telefono || '').trim(),
      percorso: data.percorso || 'da consigliare',
      marketing: form.marketing.checked,
      inviato: new Date().toISOString(),
    };

    if (CONFIG.formEndpoint) {
      try {
        const res = await fetch(CONFIG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(String(res.status));
        okMsg.textContent = 'Richiesta ricevuta. Francesco ti ricontatterà al più presto.';
      } catch {
        err.textContent = `Errore di invio. Riprova o scrivici a ${CONFIG.contactEmail}.`;
        return;
      }
    } else {
      const body = [
        `Nome: ${payload.nome}`,
        `Email: ${payload.email}`,
        `Telefono: ${payload.telefono || '-'}`,
        `Percorso: ${payload.percorso}`,
        `Consenso marketing: ${payload.marketing ? 'sì' : 'no'}`,
      ].join('\n');
      window.location.href = `mailto:${CONFIG.contactEmail}?subject=${encodeURIComponent(`Richiesta informazioni — ${payload.percorso}`)}&body=${encodeURIComponent(body)}`;
      okMsg.innerHTML = `Si sta aprendo il tuo programma di posta: invia l'email per completare la richiesta. Oppure scrivi a <a href="mailto:${CONFIG.contactEmail}">${CONFIG.contactEmail}</a>.`;
    }
    if (CONFIG.whatsapp) {
      const wa = document.createElement('p');
      wa.innerHTML = `Preferisci WhatsApp? <a href="https://wa.me/${CONFIG.whatsapp}" target="_blank" rel="noopener">Scrivici qui ↗</a>`;
      okMsg.after(wa);
    }
    form.hidden = true;
    ok.hidden = false;
    matrix.burst(1600);
  });

  $$('.js-email').forEach((a) => { a.href = `mailto:${CONFIG.contactEmail}`; a.textContent = CONFIG.contactEmail; });
  return { open };
})();

// =========================================================
// CHIUSURA: nome nel terminale → modulo precompilato
// =========================================================
(() => {
  const inp = $('#tin-name');
  const out = $('#tin-out');
  let busy = false;
  async function send() {
    if (busy) return;
    const name = inp.value.trim();
    if (!name) { out.textContent = '> scrivi il tuo nome per continuare.'; inp.focus(); return; }
    busy = true;
    out.textContent = '';
    const txt = `> ciao ${name}. preparo la tua richiesta…`;
    for (const ch of txt) { out.textContent += ch; if (!reduced) await sleep(16); }
    await sleep(reduced ? 0 : 400);
    modal.open('', name);
    busy = false;
  }
  $('#tin-btn').addEventListener('click', send);
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
})();

// =========================================================
// PULSANTE CHAT FISSO
// =========================================================
(() => {
  const fab = $('#fab');
  if (CONFIG.responseTime) $('#fab-sub').textContent = `di solito risponde entro ${CONFIG.responseTime}`;
  fab.addEventListener('click', () => {
    if (CONFIG.whatsapp) window.open(`https://wa.me/${CONFIG.whatsapp}`, '_blank', 'noopener');
    else modal.open();
  });
})();

// =========================================================
// SCROLL: barra SYNC e menu attivo
// =========================================================
(() => {
  const sections = $$('main > section');
  const navLinks = $$('.nav-links a');
  const bar = $('#sync');
  const num = $('#sync-n');
  let ticking = false;
  function update() {
    ticking = false;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    const p = clamp01(window.scrollY / Math.max(1, max));
    bar.style.width = `${p * 100}%`;
    num.textContent = String(Math.round(p * 100)).padStart(3, '0');
    let id = sections[0].id;
    sections.forEach((s) => { if (s.getBoundingClientRect().top <= vh * 0.5) id = s.id; });
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

// =========================================================
// BOTTONI MAGNETICI
// =========================================================
if (finePointer && !reduced) {
  $$('[data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${(e.clientX - r.left - r.width / 2) * 0.25}px`);
      el.style.setProperty('--my', `${(e.clientY - r.top - r.height / 2) * 0.35}px`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); });
  });
}

if (CONFIG.protectContent) initProtection();
$('#year').textContent = String(new Date().getFullYear());
boot();
