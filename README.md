# Team Zero Errori: sito web

Landing page in stile terminale anni '90 / sala operativa, con elementi 3D, per i percorsi formativi di Team Zero Errori sul trading dell'oro (metodo delle 4 conferme, strategia oro 20/70).

- **Francesco Zammartino**: CEO e assistenza clienti
- **Filippo Danesi**: ideatore del metodo, parte tecnica
- **Andrea**: live su TikTok [@ildiariodiuntrader](https://www.tiktok.com/@ildiariodiuntrader)

## Struttura

```
index.html                  pagina principale (10 sezioni + modale di richiesta)
assets/css/style.css        tutto lo stile (palette, terminali, animazioni, responsive)
assets/js/main.js           interazioni + CONFIG da compilare
assets/js/matrix.js         pioggia di caratteri Matrix
assets/js/scene.js          scena 3D Three.js (lingotto + 4 anelli guidati dallo scroll)
assets/vendor/              three.js r160 ospitato in locale (nessuna richiesta a terzi)
legal/                      avvertenza rischi, termini di vendita, privacy, cookie
docs/LEGALE.md              ricerca legale, checklist e fonti
docs/STRATEGIA-MARKETING.md logica di psicologia, neuromarketing e funnel
```

È un sito statico: nessuna build, nessuna dipendenza da installare.

## Provarlo in locale

```bash
python3 -m http.server 8000
# poi apri http://localhost:8000
```

Serve un server: aprendo `index.html` con doppio clic, i moduli JavaScript non si caricano.

## Prima di pubblicare

1. **`assets/js/main.js` → `CONFIG`**: email, numero WhatsApp, prezzi (IVA inclusa), link pubblico al backtest su TradingView ed eventuale endpoint del form.
2. **Dati legali**: sostituisci tutti i segnaposto `[ ... ]` nel footer di `index.html` e nelle pagine in `legal/`.
3. Leggi **`docs/LEGALE.md`** e completa la checklist. Falla verificare da un avvocato.
4. Pubblica su qualsiasi hosting statico: GitHub Pages, Netlify, Vercel, oppure un hosting tradizionale.

## Accessibilità e prestazioni

- `prefers-reduced-motion` disattiva le animazioni, la scena 3D si muove molto lentamente e la boot sequence viene saltata.
- Se WebGL non è disponibile, la scena 3D viene rimossa e il sito resta completo.
- Le animazioni si mettono in pausa quando la scheda non è visibile.
- I font sono di sistema (monospace): nessun Google Fonts, quindi nessun trasferimento di IP a terzi.
