// Protezione dei contenuti: blocca copia, salvataggio immagini, menu del tasto
// destro, stampa e scorciatoie comuni; oscura la pagina quando perde il focus
// (molti strumenti di screenshot su computer lo rubano) e al tasto Stamp.
// Nessun sito può impedire del tutto gli screenshot: questi sono deterrenti.
// I campi dei moduli e i dati di contatto restano selezionabili.

const EDITABLE = 'input, textarea, select, [contenteditable="true"], .allow-copy';
const isEditable = (el) => !!(el && el.closest && el.closest(EDITABLE));

export function initProtection() {
  const root = document.documentElement;
  root.classList.add('protect');

  const shield = document.createElement('div');
  shield.className = 'shield';
  shield.setAttribute('aria-hidden', 'true');
  shield.innerHTML = '<p><b>Contenuto protetto</b><br>Torna sulla pagina per continuare.</p>';
  document.body.append(shield);
  const hide = () => root.classList.add('shielded');
  const show = () => root.classList.remove('shielded');

  // copia, taglia, menu contestuale, trascinamento, selezione
  ['copy', 'cut'].forEach((type) => document.addEventListener(type, (e) => {
    if (!isEditable(e.target)) e.preventDefault();
  }));
  document.addEventListener('contextmenu', (e) => { if (!isEditable(e.target)) e.preventDefault(); });
  document.addEventListener('dragstart', (e) => { if (!isEditable(e.target)) e.preventDefault(); });
  document.addEventListener('selectstart', (e) => { if (!isEditable(e.target)) e.preventDefault(); });

  // scorciatoie: salva, stampa, sorgente, copia, seleziona tutto
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u'].includes(k)) { e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'a'].includes(k) && !isEditable(e.target)) { e.preventDefault(); return; }
    // scorciatoie screenshot di macOS (Cmd+Shift+3/4/5) e Windows (Win+Shift+S): oscura subito
    if ((e.metaKey && e.shiftKey && ['3', '4', '5', 's'].includes(k)) || k === 'printscreen') hide();
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'PrintScreen') {
      hide();
      // prova a svuotare gli appunti dove il browser lo consente
      navigator.clipboard?.writeText('').catch(() => {});
      setTimeout(show, 1500);
    }
  });

  // pagina oscurata quando la finestra perde il focus o la scheda è nascosta,
  // tranne quando il focus passa a un iframe della pagina (es. il prezzo live)
  window.addEventListener('blur', () => {
    setTimeout(() => {
      if (document.activeElement && document.activeElement.tagName === 'IFRAME') return;
      hide();
    }, 0);
  });
  window.addEventListener('focus', show);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); else show(); });
  shield.addEventListener('pointerdown', show);

  // immagini e canvas non trascinabili
  document.querySelectorAll('img, canvas, svg').forEach((el) => el.setAttribute('draggable', 'false'));
}
