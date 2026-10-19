import { initMatrix } from './matrix.js';

// =========================================================
// CONFIGURAZIONE — da compilare prima della pubblicazione
// =========================================================
const CONFIG = {
  contactEmail: 'info@teamzeroerrori.it',   // TODO: email reale
  whatsapp: '',                             // TODO: es. '393331234567' (solo cifre, con prefisso)
  formEndpoint: '',                         // TODO: endpoint POST JSON. Vuoto = invio via email
  tradingViewBacktestUrl: '',               // TODO: link pubblico al backtest su TradingView
  prices: {                                 // TODO: prezzi IVA inclusa, es. '€ 497'. Vuoto = "Prezzo su richiesta"
    recluta: '',
    operatore: '',
  },
};

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* storage non disponibile */ } },
};

// stato condiviso letto dalla scena 3D
const state = { section: 0, metodo: 0 };

// =========================================================
// SFONDO: pioggia Matrix + scena 3D
// =========================================================
const matrix = initMatrix($('#matrix'), { reduced });
let scene = null;
import('./scene.js')
  .then((m) => { scene = m.initScene($('#scene3d'), state, { reduced }); })
  .catch(() => $('#scene3d')?.remove());

function emitSignal() {
  matrix.burst(1400);
  scene?.signal();
}

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
    heroConfirmLoop();
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
// HERO: esempio animato delle 4 conferme
// =========================================================
async function heroConfirmLoop() {
  const list = $('#hero-confirms');
  const items = $$('li', list);
  const sig = $('#hero-signal');
  const label = $('.signal-state', sig);
  const set = (n) => {
    items.forEach((li, i) => {
      li.classList.toggle('on', i < n);
      $('b', li).textContent = i < n ? 'OK' : 'attesa';
    });
    const all = n === 4;
    list.classList.toggle('all', all);
    sig.classList.toggle('go', all);
    label.textContent = all ? 'SETUP VALIDO ✓' : n ? `${n} SU 4 · SI ASPETTA` : 'IN ATTESA';
  };
  if (reduced) { set(4); return; }
  for (;;) {
    set(0);
    await sleep(1200);
    for (let n = 1; n <= 4; n++) {
      await sleep(900 + Math.random() * 700);
      set(n);
    }
    if (state.section < 0.6) emitSignal();
    await sleep(3200);
  }
}

// =========================================================
// COMPARSA DEGLI ELEMENTI ALLO SCROLL
// =========================================================
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  });
}, { threshold: 0.15 });
$$('[data-reveal]').forEach((el) => io.observe(el));

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
    state.metodo = n / 4;
  };
  let played = false;
  new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting || played) return;
    played = true;
    if (reduced) { light(4); return; }
    for (let n = 1; n <= 4; n++) { await sleep(650); light(n); }
    emitSignal();
  }, { threshold: 0.5 }).observe(box);
})();

// =========================================================
// CALCOLATORE DEL RISCHIO
// =========================================================
(() => {
  const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
  const inp = $('#cap-input');
  const rng = $('#cap-range');
  const out = { risk: $('#o-risk'), loss: $('#o-loss'), t3: $('#o-t3'), t5: $('#o-t5'), stress: $('#o-stress') };
  function calc(v) {
    const cap = Math.max(0, Number(v) || 0);
    const r = cap * 0.01;
    out.risk.textContent = fmt.format(r);
    out.loss.textContent = `−${fmt.format(r)}`;
    out.t3.textContent = `+${fmt.format(r * 3)}`;
    out.t5.textContent = `+${fmt.format(r * 5)}`;
    out.stress.textContent = fmt.format(cap * Math.pow(0.99, 5));
  }
  inp.addEventListener('input', () => { rng.value = inp.value; calc(inp.value); });
  rng.addEventListener('input', () => { inp.value = rng.value; calc(rng.value); });
  calc(inp.value);
})();

// =========================================================
// BACKTEST: indicatore circolare + contatore
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
        const p = clamp01((now - start) / 1800);
        el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(dec);
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
// SCROLL: sezione corrente (per la scena 3D e il menu)
// =========================================================
const sections = $$('main > section');
const navLinks = $$('.nav-links a');
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const vh = window.innerHeight;
    let idx = 0;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= vh * 0.5) idx = i; });
    const rect = sections[idx].getBoundingClientRect();
    state.section = Math.max(0, idx + clamp01((vh * 0.5 - rect.top) / rect.height) - 0.5);
    const id = sections[idx].id;
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

// =========================================================
// PREZZI
// =========================================================
$$('[data-price]').forEach((el) => {
  const v = CONFIG.prices[el.dataset.price];
  if (v) el.textContent = v;
});

// =========================================================
// MODALE DI RICHIESTA
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
    form.percorso.value = plan || '';
    document.body.style.overflow = 'hidden';
    setTimeout(() => form.nome.focus(), 50);
  }
  function close() {
    modal.hidden = true;
    document.body.style.overflow = '';
    lastFocus?.focus();
  }
  $$('[data-open-form]').forEach((b) => b.addEventListener('click', () => open(b.dataset.openForm)));
  $$('[data-close]', modal).forEach((el) => el.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = $$('input, select, button, a[href]', modal).filter((x) => !x.closest('[hidden]'));
      const first = f[0], last = f[f.length - 1];
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
    emitSignal();
  });

  $$('.js-email').forEach((a) => { a.href = `mailto:${CONFIG.contactEmail}`; a.textContent = CONFIG.contactEmail; });
})();

$('#year').textContent = String(new Date().getFullYear());
boot();
