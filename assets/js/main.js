import { initMatrix } from './matrix.js';

// =========================================================
// CONFIGURAZIONE — da compilare prima della pubblicazione
// =========================================================
const CONFIG = {
  contactEmail: 'info@teamzeroerrori.it',   // TODO: email reale
  whatsapp: '',                             // TODO: es. '393331234567' (solo cifre, con prefisso)
  formEndpoint: '',                         // TODO: endpoint POST JSON (es. backend proprio). Vuoto = invio via email
  tradingViewBacktestUrl: '',               // TODO: link pubblico al backtest su TradingView
  prices: {                                 // TODO: prezzi IVA inclusa, es. '€ 497'. Vuoto = "Prezzo su richiesta"
    recluta: '',
    operatore: '',
  },
};

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
document.documentElement.classList.add('js');

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage non disponibile */ } },
  sget(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  sset(k, v) { try { sessionStorage.setItem(k, v); } catch { /* storage non disponibile */ } },
};

// shared state letto dalla scena 3D
const state = { section: 0, metodo: 0 };

// =========================================================
// AUDIO (disattivato di default, solo su scelta dell'utente)
// =========================================================
const audio = {
  on: store.get('tze-audio') === 'on',
  ctx: null,
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    return this.ctx;
  },
  beep(freq = 880, dur = 0.05, type = 'square', vol = 0.03) {
    if (!this.on || !this.ensure()) return;
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  },
  chord() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.beep(f, 0.18, 'triangle', 0.04), i * 70)); },
};
const audioBtn = $('#audio-toggle');
function renderAudio() {
  audioBtn.setAttribute('aria-pressed', String(audio.on));
  audioBtn.textContent = `[ audio: ${audio.on ? 'on' : 'off'} ]`;
}
audioBtn.addEventListener('click', () => {
  audio.on = !audio.on;
  store.set('tze-audio', audio.on ? 'on' : 'off');
  renderAudio();
  if (audio.on) { audio.ensure()?.resume(); audio.beep(1200, 0.08); }
});
renderAudio();
$$('[data-beep]').forEach((el) => {
  el.addEventListener('pointerenter', () => audio.beep(1800, 0.015, 'square', 0.012));
  el.addEventListener('click', () => audio.beep(660, 0.07, 'square', 0.03));
});

// =========================================================
// LAYER: matrix + scena 3D
// =========================================================
const matrix = initMatrix($('#matrix'), { reduced });
let scene = null;
import('./scene.js')
  .then((m) => { scene = m.initScene($('#scene3d'), state, { reduced }); })
  .catch(() => $('#scene3d')?.remove());

function emitSignal() {
  matrix.burst(1600);
  scene?.signal();
  audio.chord();
}

// =========================================================
// BOOT SEQUENCE
// =========================================================
const BOOT_LINES = [
  ['> TZE-OS v2.6 — sala operativa', ''],
  ['> connessione feed XAU/USD ............. ', 'OK'],
  ['> caricamento indicatore_4c.pine ....... ', 'OK'],
  ['> calibrazione rischio: 1% / operazione  ', 'OK'],
  ['> modalità scalping compulsivo ......... ', 'DISATTIVATA'],
  ['> verifica operatore ................... ', 'IN CORSO'],
  ['> ACCESSO CONSENTITO.', ''],
];

async function boot() {
  const bootEl = $('#boot');
  const finish = () => {
    if (bootEl.classList.contains('done')) return;
    bootEl.classList.add('glitch-out');
    setTimeout(() => { bootEl.classList.add('done'); document.body.classList.remove('is-booting'); }, 380);
    store.sset('tze-booted', '1');
    afterBoot();
  };
  if (reduced || store.sget('tze-booted')) {
    bootEl.classList.add('done');
    document.body.classList.remove('is-booting');
    afterBoot();
    return;
  }
  const skip = () => finish();
  window.addEventListener('keydown', skip, { once: true });
  bootEl.addEventListener('pointerdown', skip, { once: true });

  const log = $('#boot-log');
  const bar = $('#boot-progress');
  for (let i = 0; i < BOOT_LINES.length; i++) {
    if (bootEl.classList.contains('done') || bootEl.classList.contains('glitch-out')) return;
    const [txt, ok] = BOOT_LINES[i];
    for (const ch of txt) {
      log.append(ch);
      if (Math.random() < 0.5) await sleep(4);
    }
    if (ok) {
      await sleep(90);
      const s = document.createElement('span');
      s.className = 'ok';
      s.textContent = ok;
      log.append(s);
    }
    log.append('\n');
    bar.style.width = `${((i + 1) / BOOT_LINES.length) * 100}%`;
    await sleep(110);
  }
  await sleep(350);
  finish();
}

let afterBootDone = false;
function afterBoot() {
  if (afterBootDone) return;
  afterBootDone = true;
  typePrompt();
  heroConfirmLoop();
}

// =========================================================
// TESTO: digitazione + decodifica
// =========================================================
async function typePrompt() {
  const el = $('.typed[data-type]');
  if (!el) return;
  const txt = el.dataset.type;
  if (reduced) { el.textContent = txt; return; }
  await sleep(300);
  for (const ch of txt) {
    el.textContent += ch;
    await sleep(28 + Math.random() * 40);
  }
}

const SCRAMBLE = '!<>-_\\/[]{}—=+*^?#01アカサタナ';
function scramble(el) {
  if (reduced || el.dataset.scrambled) return;
  el.dataset.scrambled = '1';
  const final = el.textContent;
  const len = final.length;
  const start = performance.now();
  const dur = 650 + len * 12;
  function step(now) {
    const p = clamp01((now - start) / dur);
    const reveal = Math.floor(p * len);
    let out = '';
    for (let i = 0; i < len; i++) {
      if (i < reveal || final[i] === ' ') out += final[i];
      else out += SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = final;
  }
  requestAnimationFrame(step);
}

// =========================================================
// REVEAL ON SCROLL
// =========================================================
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add('in');
    if (el.matches('[data-scramble]')) scramble(el);
    $$('[data-scramble]', el).forEach(scramble);
    io.unobserve(el);
  });
}, { threshold: 0.18, rootMargin: '0px 0px -5% 0px' });
$$('[data-reveal], [data-scramble]').forEach((el) => io.observe(el));

// =========================================================
// HERO: ciclo dimostrativo delle 4 conferme
// =========================================================
async function heroConfirmLoop() {
  const list = $('#hero-confirms');
  const items = $$('li', list);
  const sig = $('#hero-signal');
  const stateEl = $('.signal-state', sig);
  const note = $('.signal-note', sig);
  if (reduced) {
    items.forEach((li) => { li.classList.add('on'); $('b', li).textContent = 'OK'; });
    list.classList.add('all');
    sig.classList.add('go');
    stateEl.textContent = 'SETUP VALIDO';
    note.textContent = '4/4 conferme allineate';
    return;
  }
  for (;;) {
    items.forEach((li) => { li.classList.remove('on'); $('b', li).textContent = 'attesa'; });
    list.classList.remove('all');
    sig.classList.remove('go');
    stateEl.textContent = 'IN ATTESA…';
    note.textContent = 'nessuna operazione finché manca anche una sola conferma';
    await sleep(1400);
    for (let i = 0; i < items.length; i++) {
      await sleep(900 + Math.random() * 900);
      items[i].classList.add('on');
      $('b', items[i]).textContent = 'OK';
      stateEl.textContent = `${i + 1}/4 CONFERME`;
      audio.beep(600 + i * 180, 0.06, 'square', 0.02);
    }
    await sleep(500);
    list.classList.add('all');
    sig.classList.add('go');
    stateEl.textContent = 'SETUP VALIDO ▲';
    note.textContent = '4/4 conferme allineate · rischio 1%';
    if (state.section < 0.6) emitSignal();
    await sleep(3600);
  }
}

// =========================================================
// ERRORI: auto-diagnosi interattiva
// =========================================================
(() => {
  const log = $('#errlog');
  const btns = $$('button', log);
  const countEl = $('#err-count');
  const bar = $('#err-bar');
  const msg = $('#err-msg');
  const MSGS = [
    'Seleziona le righe del log.',
    'Uno solo? Bene. Ma basta quello per svuotare un conto.',
    'Due errori ricorrenti. Hanno lo stesso colpevole: nessuna regola scritta.',
    'Tre su sei. Non è sfortuna, è assenza di protocollo.',
    'Quattro. Ti sei riconosciuto bene: è il primo passo per correggerli.',
    'Cinque. Ogni errore di questa lista ha una regola che lo neutralizza.',
    'Sei su sei. Li abbiamo fatti tutti anche noi. Per questo esiste il metodo.',
  ];
  const observer = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      $$('li', log).forEach((li, i) => { li.style.transitionDelay = `${i * 140}ms`; });
      log.classList.add('typed');
      observer.disconnect();
    }
  }, { threshold: 0.3 });
  observer.observe(log);

  btns.forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    audio.beep(on ? 220 : 440, 0.08, 'sawtooth', 0.025);
    const n = btns.filter((x) => x.getAttribute('aria-pressed') === 'true').length;
    countEl.textContent = n;
    bar.style.width = `${(n / 6) * 100}%`;
    msg.textContent = MSGS[n];
  }));
})();

// =========================================================
// METODO: scroll pinnato → conferme che si accendono
// =========================================================
const metodo = $('#metodo');
const confs = $$('#conf-grid .conf');
const paths = $$('.cross .cl');
const crossLabel = $('#cross-label');
let wasAll = false;
let lastLit = 0;
function updateMetodo() {
  const r = metodo.getBoundingClientRect();
  const sticky = $('.metodo-sticky', metodo).offsetHeight;
  const p = clamp01(-r.top / Math.max(1, r.height - sticky));
  state.metodo = p;
  let lit = 0;
  paths.forEach((path, i) => {
    const d = clamp01((p - (0.2 * i - 0.05)) / 0.2);
    path.style.strokeDashoffset = String(900 * (1 - d));
    path.classList.toggle('on', d >= 1);
    if (d >= 1) lit++;
  });
  confs.forEach((c, i) => c.classList.toggle('on', i < lit));
  const all = lit === 4;
  metodo.classList.toggle('all', all);
  crossLabel.textContent = all ? '4/4 · SETUP VALIDO' : `${lit}/4 CONFERME`;
  if (lit > lastLit) audio.beep(500 + lit * 160, 0.07, 'square', 0.025);
  lastLit = lit;
  if (all && !wasAll) emitSignal();
  wasAll = all;
}

// =========================================================
// SCROLL LOOP: HUD, nav attiva, stato della scena
// =========================================================
const sections = $$('main > section');
const navLinks = $$('.nav-links a');
const hudPct = $('#hud-pct');
const hudFill = $('#hud-fill');
const hudSection = $('#hud-section');
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    const pct = clamp01(window.scrollY / Math.max(1, max));
    hudPct.textContent = String(Math.round(pct * 100)).padStart(3, '0');
    hudFill.style.width = `${pct * 100}%`;

    let idx = 0;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= vh * 0.5) idx = i; });
    const rect = sections[idx].getBoundingClientRect();
    const frac = clamp01((vh * 0.5 - rect.top) / rect.height);
    state.section = Math.max(0, idx + frac - 0.5);

    const cur = sections[idx];
    hudSection.textContent = `[${String(idx + 1).padStart(2, '0')}/${String(sections.length).padStart(2, '0')}] ${cur.dataset.hud || ''}`;
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${cur.id}`));
    updateMetodo();
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

// =========================================================
// ECG: scalper vs operatore
// =========================================================
$$('.ecg-canvas').forEach((cv) => {
  const bad = cv.dataset.ecg === 'bad';
  const ctx = cv.getContext('2d');
  let visible = false;
  let x = 0;
  let prevY = null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  function size() {
    cv.width = cv.clientWidth * dpr;
    cv.height = 120 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    x = 0; prevY = null;
  }
  size();
  window.addEventListener('resize', size);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(cv);

  const color = bad ? '#ff3b3b' : '#00ff41';
  let t = 0;
  function sample() {
    const mid = 60;
    if (bad) {
      // battito irregolare e rumoroso
      const beat = (t % 26) < 3 ? -40 + Math.random() * 25 : 0;
      return mid + beat + (Math.random() - 0.5) * 22 + Math.sin(t * 0.9) * 8;
    }
    // PQRST regolare
    const ph = t % 70;
    if (ph < 6) return mid - Math.sin((ph / 6) * Math.PI) * 6;
    if (ph > 12 && ph < 15) return mid + 8;
    if (ph >= 15 && ph < 18) return mid - 44;
    if (ph >= 18 && ph < 21) return mid + 14;
    if (ph > 34 && ph < 46) return mid - Math.sin(((ph - 34) / 12) * Math.PI) * 9;
    return mid;
  }
  function draw() {
    requestAnimationFrame(draw);
    if (!visible) return;
    const w = cv.clientWidth;
    const steps = reduced ? 0 : 2;
    for (let s = 0; s < steps; s++) {
      t += 1;
      const y = sample();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(3,12,6,1)';
      ctx.fillRect(x + 1, 0, 14, 120);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(x, prevY ?? y);
      ctx.lineTo(x + 1, y);
      ctx.stroke();
      prevY = y;
      x += 1;
      if (x > w) { x = 0; prevY = null; }
    }
  }
  if (reduced) {
    for (let i = 0; i < cv.clientWidth; i++) { t++; const y = sample(); ctx.fillStyle = color; ctx.fillRect(i, y, 1.5, 1.5); }
  } else {
    draw();
  }
});

// =========================================================
// CALCOLATORE DEL RISCHIO
// =========================================================
(() => {
  const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
  const inp = $('#cap-input');
  const rng = $('#cap-range');
  const out = { risk: $('#o-risk'), loss: $('#o-loss'), t3: $('#o-t3'), t5: $('#o-t5'), stress: $('#o-stress'), bar: $('#o-stress-bar') };
  function calc(v) {
    const cap = Math.max(0, Number(v) || 0);
    const r = cap * 0.01;
    out.risk.textContent = fmt.format(r);
    out.loss.textContent = `−${fmt.format(r)}`;
    out.t3.textContent = `+${fmt.format(r * 3)}`;
    out.t5.textContent = `+${fmt.format(r * 5)}`;
    const left = cap * Math.pow(0.99, 5);
    out.stress.textContent = fmt.format(left);
    out.bar.style.width = `${Math.pow(0.99, 5) * 100}%`;
  }
  inp.addEventListener('input', () => { rng.value = inp.value; calc(inp.value); });
  rng.addEventListener('input', () => { inp.value = rng.value; calc(rng.value); audio.beep(1400, 0.01, 'square', 0.008); });
  calc(inp.value);
})();

// =========================================================
// BACKTEST: gauge + contatori
// =========================================================
(() => {
  const gauge = $('#gauge-fg');
  const PF = 3.5, SCALE_MAX = 5;
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    gauge.style.strokeDashoffset = String(252 * (1 - PF / SCALE_MAX));
    obs.disconnect();
  }, { threshold: 0.4 }).observe(gauge);

  $$('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    new IntersectionObserver(([e], obs) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      if (reduced) { el.textContent = target.toFixed(dec); return; }
      const start = performance.now();
      const step = (now) => {
        const p = clamp01((now - start) / 2000);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(dec);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.5 }).observe(el);
  });

  const tv = $('#tv-link');
  if (CONFIG.tradingViewBacktestUrl) tv.href = CONFIG.tradingViewBacktestUrl;
  else { tv.removeAttribute('target'); tv.href = '#accesso'; tv.textContent = 'Richiedi il link al backtest'; }
})();

// =========================================================
// TILT 3D + BOTTONI MAGNETICI + CURSORE
// =========================================================
if (finePointer && !reduced) {
  $$('[data-tilt]').forEach((el) => {
    const glare = document.createElement('span');
    glare.className = 'tilt-glare';
    el.appendChild(glare);
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * 8}deg) rotateY(${(px - 0.5) * 10}deg) translateZ(0)`;
      el.style.setProperty('--gx', `${px * 100}%`);
      el.style.setProperty('--gy', `${py * 100}%`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .5s cubic-bezier(.2,.8,.2,1)';
      el.style.transform = '';
      setTimeout(() => { el.style.transition = ''; }, 500);
    });
  });

  $$('[data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${(e.clientX - r.left - r.width / 2) * 0.25}px`);
      el.style.setProperty('--my', `${(e.clientY - r.top - r.height / 2) * 0.35}px`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); });
  });

  const cursor = $('#cursor');
  const coords = $('.cursor-coords', cursor);
  document.body.classList.add('has-cursor');
  let cx = -100, cy = -100, tx = -100, ty = -100;
  window.addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    coords.textContent = `x:${String(Math.round(tx)).padStart(4, '0')} y:${String(Math.round(ty)).padStart(4, '0')}`;
  }, { passive: true });
  document.addEventListener('pointerover', (e) => {
    cursor.classList.toggle('is-hover', !!e.target.closest('a, button, summary, [data-tilt] .btn, input[type="range"], label.check'));
  });
  (function loop() {
    cx += (tx - cx) * 0.25; cy += (ty - cy) * 0.25;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(loop);
  })();
}

// =========================================================
// QUIZ DI DIAGNOSTICA → percorso consigliato
// =========================================================
let chosenPlan = '';
(() => {
  const quiz = $('#quiz');
  const steps = $$('.quiz-step', quiz);
  const answers = [];
  const show = (i) => steps.forEach((s, j) => s.classList.toggle('is-active', i === j));
  steps.forEach((step, i) => {
    $$('.q-opts button', step).forEach((b) => b.addEventListener('click', () => {
      answers[i] = Number(b.dataset.v);
      audio.beep(700 + i * 150, 0.05);
      if (i < 2) { show(i + 1); return; }
      const total = answers.reduce((a, v) => a + v, 0);
      const plan = answers[0] === 0 || total < 4 ? 'recluta' : 'operatore';
      chosenPlan = plan;
      $('#quiz-result').innerHTML = plan === 'recluta'
        ? 'Profilo rilevato: <span class="gold">RECLUTA</span>. Il percorso giusto per te è il <b>Protocollo Recluta</b>: 12 video lezioni e 5 sessioni one-to-one per costruire basi solide senza saltare passaggi.'
        : 'Profilo rilevato: <span class="gold">OPERATORE</span>. Il percorso giusto per te è il <b>Protocollo Operatore</b>: vai dritto al metodo, con videocorso, manuale PDF e una sessione one-to-one.';
      show(3);
      $$('.plan').forEach((p) => {
        const match = p.id === `plan-${plan}`;
        p.classList.toggle('is-match', match);
        p.classList.toggle('is-dimmed', !match);
      });
      audio.chord();
      setTimeout(() => $(`#plan-${plan}`).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }), 900);
    }));
  });
  $('#quiz-reset').addEventListener('click', () => {
    answers.length = 0;
    chosenPlan = '';
    $$('.plan').forEach((p) => p.classList.remove('is-match', 'is-dimmed'));
    show(0);
  });

  $$('[data-price]').forEach((el) => {
    const v = CONFIG.prices[el.dataset.price];
    if (v) el.textContent = v;
  });
})();

// =========================================================
// MODALE RICHIESTA DI ACCESSO
// =========================================================
(() => {
  const modal = $('#modal');
  const form = $('#access-form');
  const err = $('#form-err');
  const ok = $('#form-ok');
  const okMsg = $('#form-ok-msg');
  let lastFocus = null;

  function open(plan) {
    lastFocus = document.activeElement;
    modal.hidden = false;
    form.hidden = false;
    ok.hidden = true;
    err.textContent = '';
    form.percorso.value = plan || chosenPlan || '';
    document.body.style.overflow = 'hidden';
    setTimeout(() => form.nome.focus(), 50);
  }
  function close() {
    modal.hidden = true;
    document.body.style.overflow = '';
    lastFocus?.focus();
  }
  $$('[data-open-form]').forEach((b) => b.addEventListener('click', () => open(b.dataset.openForm)));
  $$('[data-close]', modal).forEach((el) => {
    el.addEventListener('click', close);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') close(); });
  });
  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = $$('input, select, textarea, button, a[href], [tabindex="0"]', modal).filter((x) => !x.closest('[hidden]'));
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const data = Object.fromEntries(new FormData(form));
    if (!data.nome?.trim()) { err.textContent = '> errore: inserisci il tuo nome.'; form.nome.focus(); return; }
    if (!form.email.checkValidity() || !data.email) { err.textContent = '> errore: email non valida.'; form.email.focus(); return; }
    if (!form.privacy.checked) { err.textContent = "> errore: conferma di aver letto l'informativa privacy."; return; }

    const payload = {
      nome: data.nome.trim(),
      email: data.email.trim(),
      telefono: (data.telefono || '').trim(),
      percorso: data.percorso || 'da consigliare',
      messaggio: (data.messaggio || '').trim(),
      marketing: form.marketing.checked,
      inviato: new Date().toISOString(),
    };

    if (CONFIG.formEndpoint) {
      try {
        const res = await fetch(CONFIG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(String(res.status));
        okMsg.textContent = 'Richiesta ricevuta. Francesco ti ricontatterà al più presto.';
      } catch {
        err.textContent = `> errore di invio. Riprova o scrivici a ${CONFIG.contactEmail}.`;
        return;
      }
    } else {
      const body = [
        `Nome: ${payload.nome}`,
        `Email: ${payload.email}`,
        `Telefono: ${payload.telefono || '-'}`,
        `Percorso: ${payload.percorso}`,
        `Consenso marketing: ${payload.marketing ? 'sì' : 'no'}`,
        '',
        payload.messaggio,
      ].join('\n');
      window.location.href = `mailto:${CONFIG.contactEmail}?subject=${encodeURIComponent(`Richiesta accesso — ${payload.percorso}`)}&body=${encodeURIComponent(body)}`;
      okMsg.innerHTML = `Si sta aprendo il tuo programma di posta: invia l'email per completare la richiesta. In alternativa scrivi a <a href="mailto:${CONFIG.contactEmail}">${CONFIG.contactEmail}</a>.`;
    }
    if (CONFIG.whatsapp) {
      const wa = document.createElement('p');
      wa.innerHTML = `Preferisci WhatsApp? <a href="https://wa.me/${CONFIG.whatsapp}" target="_blank" rel="noopener">Scrivici qui ↗</a>`;
      okMsg.after(wa);
    }
    form.hidden = true;
    ok.hidden = false;
    emitSignal();
  });

  $$('.js-email').forEach((a) => { a.href = `mailto:${CONFIG.contactEmail}`; a.textContent = CONFIG.contactEmail; });
})();

// =========================================================
// TELEFONO "LIVE": feed illustrativo
// =========================================================
(() => {
  const feed = $('#phone-feed');
  const LINES = [
    '// anteprima illustrativa',
    '[09:15] XAU/USD 15m · scansione',
    '[09:15] conferme: 1/4 → si aspetta',
    '[09:30] conferme: 2/4 → si aspetta',
    '💬 "perché non entri?"',
    '[09:30] manca la conferma 3. regola.',
    '[09:45] conferme: 3/4 → ancora no',
    '[10:00] conferme: 4/4 ✔ setup valido',
    '[10:00] rischio: 1% · R:R 1:3',
    '💬 "quindi oggi solo 1 operazione?"',
    '[10:00] meglio 1 buona che 30 a caso.',
    '[10:15] stop o target: si accetta',
    '        il risultato, si va avanti.',
    '💬 "che calma 😅"',
  ];
  let i = 0;
  if (reduced) { feed.textContent = LINES.join('\n'); return; }
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(feed);
  setInterval(() => {
    if (!visible) return;
    feed.textContent += (feed.textContent ? '\n' : '') + LINES[i % LINES.length];
    const rows = feed.textContent.split('\n');
    if (rows.length > 22) feed.textContent = rows.slice(-22).join('\n');
    i++;
  }, 900);
})();

$('#year').textContent = String(new Date().getFullYear());
boot();
