# Team Zero Errori: sito web

Landing page in stile terminale anni '90 / sala operativa, con animazioni e moduli interattivi, per i percorsi formativi di Team Zero Errori sul trading dell'oro (metodo delle 4 conferme, strategia oro 20/70).

- **Francesco Zammartino**: CEO e assistenza clienti
- **Filippo Danesi**: ideatore del metodo, parte tecnica
- **Andrea**: live su TikTok [@ildiariodiuntrader](https://www.tiktok.com/@ildiariodiuntrader)

## Struttura

```
index.html                  pagina principale (10 sezioni + modale di richiesta)
assets/css/style.css        tutto lo stile (palette, terminali, animazioni, responsive)
assets/js/main.js           tutte le interazioni + CONFIG da compilare
assets/js/matrix.js         pioggia di caratteri Matrix (reagisce al cursore)
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

1. **`assets/js/main.js` → `CONFIG`**: email, numero WhatsApp, tempo di risposta reale, prezzi (IVA inclusa), link al backtest su TradingView, endpoint del form, e poi:
   - `trades`: il registro **reale e completo** delle operazioni (finché è vuoto il sito mostra un esempio con l'etichetta "ESEMPIO");
   - `slots`: i posti one-to-one **reali** del mese (finché è `null` la sezione resta nascosta);
   - `photos`: i percorsi delle foto del team (es. `assets/team/francesco.jpg`).
   Inoltre in `index.html` vanno approvati da Filippo il testo del manifesto e sostituita la firma di esempio con quella reale.
2. **Dati legali**: sostituisci tutti i segnaposto `[ ... ]` nel footer di `index.html` e nelle pagine in `legal/`.
3. Leggi **`docs/LEGALE.md`** e completa la checklist. Falla verificare da un avvocato.
4. Pubblica su qualsiasi hosting statico: GitHub Pages, Netlify, Vercel, oppure un hosting tradizionale.

## Accessibilità e prestazioni

- `prefers-reduced-motion` disattiva le animazioni e salta la sequenza di avvio.
- Le animazioni si mettono in pausa quando la scheda non è visibile.
- I font sono di sistema: nessun Google Fonts. L'unico servizio esterno è il prezzo live di TradingView, caricato solo dopo il clic del visitatore.
