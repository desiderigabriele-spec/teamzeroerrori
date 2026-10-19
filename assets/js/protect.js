// Protezione dei contenuti: blocca copia, salvataggio immagini, menu del tasto
// destro, stampa e scorciatoie comuni. Quando qualcuno prova a fare uno
// screenshot, una registrazione dello schermo o a copiare, invece di un muro
// mostra un pannello che invita a condividere il link del sito (copia,
// WhatsApp, Telegram, condivisione nativa) o a chiedere info al team.
// Nessun sito può impedire del tutto gli screenshot: questi sono deterrenti.
// Su iPhone (Safari e Chrome usano lo stesso motore) il browser non segnala né
// screenshot né registrazioni né la pressione lunga: la pressione lunga viene
// rilevata a mano e sui dispositivi touch una filigrana con il nome e l'indirizzo
// del sito trasforma ogni screenshot in pubblicità.
// I campi dei moduli e i dati di contatto restano selezionabili.

const EDITABLE = 'input, textarea, select, [contenteditable="true"], .allow-copy';
const isEditable = (el) => !!(el && el.closest && el.closest(EDITABLE));

export const DEFAULT_MESSAGES = {
  screenshot: {
    eyebrow: '> screenshot rilevato',
    title: "Bella mossa. Ma c'è di meglio.",
    text: 'Il link arriva intero, animazioni comprese. Mandalo a chi fa trading.',
  },
  recording: {
    eyebrow: '> registrazione schermo rilevata',
    title: "Bella mossa. Ma c'è di meglio.",
    text: 'Il link arriva intero, animazioni comprese. Mandalo a chi fa trading.',
  },
  copy: {
    eyebrow: '> copia bloccata',
    title: 'Ti serve questo testo?',
    text: 'Il testo è protetto, il link no. Condividilo e lo vedranno per intero.',
  },
  away: {
    eyebrow: '> sessione in pausa',
    title: 'Contenuto protetto.',
    text: 'Torna sulla pagina per continuare. Se vuoi farla vedere a qualcuno, mandagli il link.',
  },
};

export function initProtection({ messages = DEFAULT_MESSAGES, shareText = '', whatsapp = '', contactName = 'Francesco', contactText = '', onContact = null } = {}) {
  const root = document.documentElement;
  root.classList.add('protect');
  const url = `${location.origin}${location.pathname.replace(/index\.html$/, "")}`;
  const text = shareText || document.title;
  const enc = encodeURIComponent;
  const isWindows = /Win/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent);
  const waText = contactText || `Ciao ${contactName}! Ho visto il sito di Team Zero Errori e vorrei informazioni sui percorsi.`;
  const contactHtml = whatsapp
    ? `<a class="shield-wa" target="_blank" rel="noopener" href="https://wa.me/${whatsapp}?text=${enc(waText)}">Chiedi info a ${contactName} su WhatsApp</a>`
    : `<button type="button" class="shield-wa" id="shield-contact">Chiedi info a ${contactName}</button>`;

  const shield = document.createElement('div');
  shield.className = 'shield';
  shield.setAttribute('role', 'dialog');
  shield.setAttribute('aria-modal', 'true');
  shield.setAttribute('aria-labelledby', 'shield-title');
  shield.innerHTML = `
    <div class="shield-box">
      <div class="shield-bar"><i></i><i></i><i></i><span>condividi.sh</span></div>
      <div class="shield-body">
        <p class="shield-eye" id="shield-eye"></p>
        <h2 class="shield-title" id="shield-title"></h2>
        <p class="shield-text" id="shield-text"></p>
        <div class="shield-url">
          <input class="allow-copy" id="shield-url" readonly aria-label="Link del sito">
          <button type="button" class="btn btn-gold btn-sm" id="shield-copy">Copia link</button>
        </div>
        <div class="shield-share">
          <a class="share-btn share-wa" target="_blank" rel="noopener" href="https://wa.me/?text=${enc(`${text} ${url}`)}">WhatsApp</a>
          <a class="share-btn share-tg" target="_blank" rel="noopener" href="https://t.me/share/url?url=${enc(url)}&text=${enc(text)}">Telegram</a>
          <a class="share-btn share-fb" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${enc(url)}">Facebook</a>
          <a class="share-btn share-x" target="_blank" rel="noopener" href="https://x.com/intent/post?url=${enc(url)}&text=${enc(text)}">X</a>
          <button type="button" class="share-btn share-native" id="shield-native" hidden>Altre app…</button>
        </div>
        <div class="shield-contact">
          <p>Hai domande sul corso? Ti risponde una persona del team.</p>
          ${contactHtml}
        </div>
        <button type="button" class="shield-close" id="shield-close">← Torna al sito</button>
      </div>
    </div>`;
  document.body.append(shield);

  const $ = (id) => shield.querySelector(`#${id}`);
  const urlInput = $('shield-url');
  urlInput.value = url;
  let mode = '';
  let lastFocus = null;

  function open(kind) {
    const m = messages[kind] || DEFAULT_MESSAGES[kind];
    // un pannello aperto da screenshot o copia non viene sostituito da "away"
    if (mode && mode !== 'away' && kind === 'away') return;
    if (mode === kind && root.classList.contains('shielded')) return;
    mode = kind;
    $('shield-eye').textContent = m.eyebrow;
    $('shield-title').textContent = m.title;
    $('shield-text').textContent = m.text;
    $('shield-copy').textContent = 'Copia link';
    if (!root.classList.contains('shielded')) lastFocus = document.activeElement;
    root.classList.add('shielded');
    shield.classList.remove('pop');
    void shield.offsetWidth;
    shield.classList.add('pop');
    if (kind !== 'away') setTimeout(() => $('shield-copy').focus(), 50);
  }
  function close() {
    mode = '';
    root.classList.remove('shielded');
    lastFocus?.focus?.();
  }

  $('shield-close').addEventListener('click', close);
  $('shield-contact')?.addEventListener('click', () => { close(); onContact?.(); });
  $('shield-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url); }
    catch {
      urlInput.focus();
      urlInput.select();
      try { document.execCommand('copy'); } catch { /* resta selezionato */ }
    }
    $('shield-copy').textContent = 'Copiato ✓';
  });
  if (navigator.share) {
    const nat = $('shield-native');
    nat.hidden = false;
    nat.addEventListener('click', () => navigator.share({ title: document.title, text, url }).catch(() => {}));
  }
  shield.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = [...shield.querySelectorAll('input, button:not([hidden]), a[href]')];
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // copia, taglia, menu contestuale, trascinamento, selezione
  ['copy', 'cut'].forEach((type) => document.addEventListener(type, (e) => {
    if (isEditable(e.target)) return;
    e.preventDefault();
    open('copy');
  }));
  document.addEventListener('contextmenu', (e) => {
    if (isEditable(e.target)) return;
    e.preventDefault();
    open('copy');
  });
  document.addEventListener('dragstart', (e) => { if (!isEditable(e.target)) e.preventDefault(); });

  // pressione lunga su touch (iPhone non genera "contextmenu")
  const INTERACTIVE = 'a, button, label, summary, [role="button"], .shield, .modal, .ba, .fab';
  let pressTimer = 0;
  let pressStart = 0;
  let startX = 0;
  let startY = 0;
  const cancelPress = () => { clearTimeout(pressTimer); pressTimer = 0; };
  document.addEventListener('touchstart', (e) => {
    const t = e.target;
    if (e.touches.length !== 1 || isEditable(t) || (t.closest && t.closest(INTERACTIVE))) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    pressStart = Date.now();
    cancelPress();
    pressTimer = setTimeout(() => { pressTimer = 0; open('copy'); }, 450);
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!pressTimer) return;
    const t = e.touches[0];
    if (Math.hypot(t.clientX - startX, t.clientY - startY) > 10) cancelPress();
  }, { passive: true });
  // iOS annulla il tocco quando parte il suo gesto di pressione lunga:
  // se il dito era fermo da abbastanza tempo, conta come pressione lunga
  document.addEventListener('touchcancel', () => {
    const wasPress = pressTimer && Date.now() - pressStart > 300;
    cancelPress();
    if (wasPress) open('copy');
  }, { passive: true });
  ['touchend', 'scroll'].forEach((type) => window.addEventListener(type, cancelPress, { passive: true }));

  // filigrana sui dispositivi touch: ogni screenshot porta con sé nome e indirizzo
  if (window.matchMedia('(pointer: coarse)').matches) {
    const label = `TEAM ZERO ERRORI · ${location.host || 'teamzeroerrori'}`;
    const cv = document.createElement('canvas');
    cv.width = 460;
    cv.height = 260;
    const g = cv.getContext('2d');
    g.translate(230, 130);
    g.rotate(-Math.PI / 9);
    g.font = '700 15px ui-monospace, Menlo, monospace';
    g.textAlign = 'center';
    g.fillStyle = 'rgba(255, 201, 74, 1)';
    g.fillText(label, 0, 0);
    const wm = document.createElement('div');
    wm.className = 'watermark';
    wm.setAttribute('aria-hidden', 'true');
    wm.style.backgroundImage = `url(${cv.toDataURL()})`;
    document.body.append(wm);
  }
  document.addEventListener('selectstart', (e) => { if (!isEditable(e.target)) e.preventDefault(); });

  // scorciatoie: salva, stampa, sorgente, copia, seleziona tutto, screenshot
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    // registrazione: macOS Cmd+Shift+5, Windows Win+Alt+R (Xbox Game Bar), Win+G, Win+Shift+R (Strumento di cattura)
    if (mod && e.shiftKey && k === '5') { open('recording'); return; }
    if (isWindows && e.metaKey && ((e.altKey && k === 'r') || k === 'g' || (e.shiftKey && k === 'r'))) { open('recording'); return; }
    if (mod && e.shiftKey && ['3', '4', 's'].includes(k)) { open('screenshot'); return; }
    if (k === 'printscreen') { open('screenshot'); return; }
    if (mod && ['s', 'p', 'u'].includes(k)) { e.preventDefault(); return; }
    if (mod && ['c', 'x', 'a'].includes(k) && !isEditable(e.target)) { e.preventDefault(); open('copy'); }
  });
  document.addEventListener('keyup', (e) => {
    if (e.key !== 'PrintScreen') return;
    open('screenshot');
    navigator.clipboard?.writeText(url).catch(() => {});
  });

  // finestra senza focus o scheda nascosta: pagina oscurata, tranne quando il
  // focus passa a un iframe della pagina (es. il prezzo live)
  window.addEventListener('blur', () => {
    setTimeout(() => {
      if (document.activeElement && document.activeElement.tagName === 'IFRAME') return;
      open('away');
    }, 0);
  });
  window.addEventListener('focus', () => { if (mode === 'away') close(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) open('away');
    else if (mode === 'away') close();
  });

  document.querySelectorAll('img, canvas, svg').forEach((el) => el.setAttribute('draggable', 'false'));
}
