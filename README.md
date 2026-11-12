# Archimede Focus

Un percorso personale per prepararsi ai Giochi di Archimede del triennio: prove ufficiali, una mappa chiara delle abilità e allenamenti che partono dagli errori.

React + Vite, backend Rust/Axum e banca dati SQLite gestita da Rust. Deploy su Vercel con il runtime Rust ufficiale e Web Analytics. **Nessun database cloud, account o segreto da configurare.** Progressi e appunti rimangono in IndexedDB nel browser, con backup JSON esportabile e importabile.

## Partire in locale

Richiede Node.js 22.12+ e Rust stable con un compilatore C per SQLite bundled.

```bash
npm ci
npm run build
cargo run --locked --bin archimede
```

Apri [http://127.0.0.1:8787](http://127.0.0.1:8787).

Per modificare l’interfaccia con aggiornamento automatico, lascia attivo il server Rust e avvia in un secondo terminale:

```bash
npm run dev
```

Il frontend su `http://127.0.0.1:5173` inoltra le API al server Rust. I progressi appartengono all’origine del browser: le porte 8787 e 5173 hanno archivi separati. Usa il backup per trasferirli.

## Pubblicare su Vercel

1. Collega questa cartella al repository GitHub e invia il commit al branch `main`.
2. In Vercel scegli **Add New → Project**, importa il repository e lascia **Root Directory** sulla radice del repository.
3. Il framework è **Vite**. `vercel.json` imposta già il comando `npm run build`, l’output `dist` e la rotta della funzione Rust. Non scegliere `frontend` come root.
4. Nessuna variabile d’ambiente è necessaria. La funzione `api/index.rs` viene compilata con il runtime Rust di Vercel. Il corpus è incorporato nel binario: SQLite viene creato in memoria in lettura per le richieste, senza scritture sul filesystem effimero.
5. Nel progetto Vercel apri **Analytics → Enable**, poi esegui il deploy (o un nuovo deploy se lo hai già fatto). Il componente `@vercel/analytics/react` viene attivato automaticamente nelle build eseguite da Vercel.

I dati di visite si vedono dopo aver visitato il sito pubblicato. La raccolta Analytics reale richiede il tuo progetto Vercel e non viene simulata in locale. Nome, risposte, appunti, backup e statistiche personali non vengono inviati agli Analytics. Non usiamo eventi personalizzati a pagamento.

Il runtime Rust di Vercel è attualmente in beta. Riferimenti ufficiali: [Rust](https://vercel.com/docs/functions/runtimes/rust), [filesystem delle funzioni](https://vercel.com/docs/functions/runtimes#file-system-support), [Analytics](https://vercel.com/docs/analytics/quickstart).

## Come funziona il percorso

- **Diagnosi iniziale**: fino a 12 problemi nuovi, bilanciati sui sei argomenti disponibili. Il numero effettivo è mostrato prima di rispondere se il campione disponibile si riduce.
- **Mappa delle abilità**: correttezza sul primo tentativo di ogni problema distinto; le varianti e i ripassi non gonfiano il campione. La barra mostra la percentuale osservata, con numero di problemi e intervallo indicativo di Wilson al 95% accessibile con hover, tastiera o lettore di schermo.
- **Dati insufficienti**: fino a 4 problemi un argomento rimane da esplorare. Una priorità emerge da 5 problemi e meno del 60% di corrette; un punto forte da 8 problemi e almeno il 75%. Sono regole orientative per scegliere cosa studiare, non previsioni del risultato in gara.
- **Allenamento mirato**: nuovi problemi nella prima area debole, oppure nell’area meno esplorata. Ogni argomento del grafico avvia direttamente un allenamento.
- **Ripasso distanziato**: errori e risposte bianche tornano dopo un giorno; richiami corretti consecutivi portano l’intervallo a 3, 7, 14 e 30 giorni. Un nuovo errore lo riporta a un giorno.
- **Riflessione**: appunti personali, motivo dell’errore, soluzione ufficiale e correzione manuale dell’argomento. Le etichette sono in parte euristiche: la correzione aggiorna mappa e suggerimenti personali.
- **Continuità**: obiettivo giornaliero e giorni consecutivi calcolati nel fuso Europe/Rome. Il tempo di lavoro è una stima del tempo con la prova aperta e visibile; il timer della prova continua anche in background.
- **Storico e backup**: nessun limite di 30 prove nel nuovo storico; esportazione/importazione con validazione e unione senza duplicati. I backup escludono la prova in corso. I dati sono locali al browser e non si sincronizzano automaticamente tra dispositivi.

Il grafico dell’andamento mostra l’accuratezza di ciascuna delle ultime otto prove, inclusi i ripassi; la mappa, invece, usa solo problemi nuovi. Non vengono inseriti risultati dimostrativi nell’archivio dell’utente.

## Prove e fonti

183 prove e varianti, 2.632 quesiti nell’archivio 1996–2025 del [Progetto Olimpiadi della Matematica](https://olimpiadi.dm.unibo.it/le-gare/giochi-di-archimede/). I quesiti sono ritagli ad alta risoluzione dei PDF originali per conservare formule e figure. Un clic li ingrandisce. I promemoria utilizzano MathML.

Raccolta, correzioni delle griglie e supplemento al quesito 13 del 2001 sono documentati in [docs/ARCHIVE.md](docs/ARCHIVE.md), `data/archive.json`, `data/downloads.json`, `data/key-audit-2015.json`, `data/cross-audit.json` e `data/supplement-2001.json`. Le risposte corrette non vengono incluse nelle API di inizio prova o catalogo. Le durate storiche sono ora documentate per tutte le edizioni; vedi [le regole verificate](docs/REGOLE.md). Le prove complete usano tempi fissati all’edizione, mentre Mirato e Diagnosi sono allenamenti personalizzati.

Il design deriva dal pacchetto `Focus_Dashboard_React_UI.zip` fornito dall’utente. Token, documento e componenti di riferimento sono in `design-reference/`. Il font Manrope è incluso con la sua licenza OFL in `frontend/public/brand/LICENSE.txt`. Le immagini decorative e i dati fittizi del pacchetto non vengono usati nell’app.

## Verifiche

```bash
npm ci
npm test
cargo test --locked
npm run build
cargo build --release --locked --bin api
```

Per i test browser, con il server già avviato:

```bash
npx playwright install chromium
npm run test:e2e
npm run test:rules
```

`tests/browser.cjs` usa un contesto browser isolato: non modifica i progressi reali. Verifica diagnosi bilanciata, salvataggio/ripresa, timer, correzione Rust, diario degli errori, backup, classificazioni forti/deboli, allenamento adattivo, ripasso e layout da 320 a 1440 px. Gli screenshot e i report vengono scritti in `test-results/` (esclusa da Git). La CI ripete unit test, build e test browser.

L’entrypoint Vercel è verificabile anche senza pubblicare:

```bash
VERCEL_DEV_PORT=8790 cargo run --locked --bin api
curl 'http://127.0.0.1:8790/api/index?action=catalog'
```

## Versione precedente

Il server locale conserva le vecchie API e il database `data/archimede.sqlite3` per non perdere lo storico esistente. In **Il mio spazio**, in locale, **Importa lo storico locale** trasferisce le prove concluse nel nuovo archivio browser. Non viene pubblicato su Vercel e non è incluso in Git.

Il file `start.sh` avvia la versione attuale; il vecchio frontend statico rimane in `web/` come riferimento e sorgente delle immagini dei problemi. `scripts/build-public.mjs` copia in `dist` le immagini e i soli PDF necessari, escludendo ZIP e dati personali.

Questa è un’applicazione di allenamento personale, indipendente e non affiliata a UMI. I testi originali appartengono ai rispettivi titolari.
