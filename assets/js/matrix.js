// Pioggia di caratteri stile Matrix, con colonne "oro" occasionali,
// un burst dorato quando il sistema emette un segnale (4/4 conferme)
// e caratteri che si accendono d'oro vicino al cursore (o al dito).

const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789XAUSD$€▲▼<>/{}[]=+*';

export function initMatrix(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, cols = 0, drops = [], gold = [], size = 16;
  let burstUntil = 0;
  let last = 0;
  let running = true;
  let px = -999, py = -999;
  const setPointer = (e) => { px = e.clientX; py = e.clientY; };
  window.addEventListener('pointermove', setPointer, { passive: true });
  window.addEventListener('pointerdown', setPointer, { passive: true });
  document.addEventListener('pointerleave', () => { px = py = -999; });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth; h = window.innerHeight;
    size = w < 600 ? 13 : 16;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / size);
    drops = Array.from({ length: cols }, () => Math.random() * -h / size);
    gold = Array.from({ length: cols }, () => Math.random() < 0.05);
    ctx.fillStyle = '#020403';
    ctx.fillRect(0, 0, w, h);
  }

  function frame(t) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (t - last < 45) return; // ~22fps: look retrò e meno CPU
    last = t;
    const bursting = t < burstUntil;
    ctx.fillStyle = 'rgba(2,4,3,0.09)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = `${size}px ui-monospace, Menlo, Consolas, monospace`;
    for (let i = 0; i < cols; i++) {
      const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      const x = i * size;
      const y = drops[i] * size;
      const near = Math.hypot(x - px, y - py) < 90;
      const isGold = near || gold[i] || (bursting && Math.random() < 0.6);
      // testa della colonna più luminosa
      ctx.fillStyle = isGold ? '#fff3c4' : '#d6ffe0';
      ctx.fillText(ch, x, y);
      ctx.fillStyle = isGold ? 'rgba(255,201,74,0.9)' : 'rgba(0,255,65,0.85)';
      ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], x, y - size);
      if (y > h && Math.random() > 0.975) {
        drops[i] = 0;
        gold[i] = Math.random() < 0.05;
      }
      drops[i] += bursting || near ? 1.8 : 1;
    }
  }

  function staticFrame() {
    ctx.font = `${size}px ui-monospace, Menlo, Consolas, monospace`;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < h / size; j++) {
        if (Math.random() < 0.08) {
          ctx.fillStyle = `rgba(0,255,65,${Math.random() * 0.5})`;
          ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * size, j * size);
        }
      }
    }
  }

  resize();
  window.addEventListener('resize', () => { resize(); if (reduced) staticFrame(); });
  document.addEventListener('visibilitychange', () => {
    if (reduced) return;
    running = !document.hidden;
    if (running) requestAnimationFrame(frame);
  });

  if (reduced) staticFrame(); else requestAnimationFrame(frame);

  return {
    burst(ms = 1400) { burstUntil = performance.now() + ms; },
  };
}
