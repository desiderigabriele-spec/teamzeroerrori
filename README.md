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
assets/js/protect.js        protezione dei contenuti (copia, immagini, stampa, screenshot)
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

## Protezione dei contenuti

Con `CONFIG.protectContent: true` la pagina principale blocca selezione e copia del testo, tasto destro, trascinamento e salvataggio delle immagini (anche con pressione lunga su iPhone), stampa e le scorciatoie Ctrl/Cmd+S, P, U, C, A. Quando qualcuno preme Stamp, usa le scorciatoie di screenshot o di registrazione dello schermo (Cmd+Shift+5 su Mac; Win+Alt+R, Win+G, Win+Shift+R su Windows) o prova a copiare, appare un pannello che invita a condividere il link (copia, WhatsApp, Telegram, Facebook, X, condivisione del telefono) e a chiedere info a Francesco su WhatsApp (`CONFIG.whatsapp`; senza numero il bottone apre il modulo di richiesta). I testi del pannello si cambiano in `CONFIG.shareMessages` e `CONFIG.shareText`. Quando la finestra perde il focus o la scheda viene nascosta, la pagina viene oscurata.

Nessun sito può impedire del tutto gli screenshot (tasti del telefono, strumenti del sistema, foto con un altro dispositivo) né l'accesso al codice sorgente: sono deterrenti. I campi dei moduli e i dati legali nel footer restano copiabili; le pagine in `legal/` restano copiabili e stampabili di proposito, perché il consumatore deve poter conservare le condizioni di vendita.

## Accessibilità e prestazioni

- `prefers-reduced-motion` disattiva le animazioni e salta la sequenza di avvio.
- Le animazioni si mettono in pausa quando la scheda non è visibile.
- I font sono di sistema: nessun Google Fonts. L'unico servizio esterno è il prezzo live di TradingView, caricato solo dopo il clic del visitatore.
