> Documento della versione locale precedente, conservato per provenienza e dettagli della raccolta. Per architettura e comandi aggiornati vedere il [README attuale](../README.md).

# Archimede · Allenamento triennio

Simulatore locale in italiano per la 3ª, 4ª e 5ª superiore. Backend Rust (Axum), database SQLite creato e gestito da Rust con rusqlite, interfaccia HTML/CSS/JavaScript senza servizi esterni necessari durante l’uso.

## Avvio

```bash
cd /home/metis/Projects/codex/archimede
./start.sh
```

Aprire http://127.0.0.1:8787. Il database `data/archimede.sqlite3` viene inizializzato dal corpus all’avvio; risultati e tentativi esistenti restano conservati. Si può usare anche il binario compilato `target/debug/archimede`, avviandolo dalla cartella del progetto.

## Funzioni

- Prove ufficiali per anno e versione; allenamenti misti per argomento e numero di quesiti.
- Timer con scadenza sul server, senza pausa. Aggiornare o chiudere la pagina non lo azzera. Riprendere una prova scaduta ne avvia la correzione.
- Risposte, contrassegni e ragionamenti personali salvati nel database. Il punteggio viene calcolato sul server e le soluzioni sono rivelate dall’API dopo la consegna.
- Punteggio: 5 punti per risposta corretta, 1 per risposta in bianco, 0 per risposta errata. Lo storico conserva le ultime 30 prove nella vista, tutte nel database.
- Formule e disegni nei quesiti conservati come ritagli ad alta risoluzione dei PDF originali, ingrandibili. I promemoria di ripasso usano MathML nativo.
- Riepilogo con correzione, appunti personali, promemoria per argomento, esportazione testo, stampa e collegamenti ai PDF ufficiali degli svolgimenti quando disponibili.

## Provenienza e copertura

Fonte: https://olimpiadi.dm.unibo.it/le-gare/giochi-di-archimede/

La pagina ufficiale è stata cercata e letta con il plugin Firecrawl; la risposta integrale è in `data/archive.json`. Anche il PDF ufficiale 2025 è stato letto con Firecrawl e conservato in `data/firecrawl-2025.json`. Gli ZIP collegati da quella pagina sono scaricati direttamente, preservati insieme ai PDF originali in `data/originals/`. `data/downloads.json` documenta ogni collegamento. La raccolta copre gli anni 1996–2025 pubblicati sulla pagina, compreso il recupero 2024 e le varianti presenti nei pacchetti; non include prove 2026 non ancora pubblicate alla data della raccolta (11 novembre 2026).

`data/corpus.json` conserva provenienza, pagina, testo estratto, immagini e chiave di risposta. Il server Rust rifiuta l’importazione se il manifest segnala quesiti o chiavi mancanti. Alcuni font dei PDF storici non consentono un’estrazione affidabile: le griglie 2000–2004 sono state trascritte e verificate sulle immagini originali; il 2004 usa OCR solo per individuare i confini dei quesiti, che sono mostrati come immagini originali.

Le opzioni del quesito 13 del 2001, assenti nel PDF ufficiale, sono recuperate dalla copia storica conservata da Istituto Bruni (https://www.istitutobruni.com/wp-content/uploads/2012/11/2001-Testo-e-Soluzioni-T.pdf), verificata con Firecrawl. La figura è ricomposta dai segmenti del PDF originale e le opzioni sono rese in MathML. La provenienza è documentata in `data/supplement-2001.json`. Le chiavi delle varianti 2015 sono abbinate allo svolgimento T1 per testo e valore dell’opzione, con verifica visuale della domanda a opzioni grafiche (`data/key-audit-2015.json`). Un controllo incrociato verifica anche 298 risposte delle varianti 2014 e 2016–2019 (`data/cross-audit.json`).

La classificazione degli argomenti è euristica, quindi indicativa. I promemoria sono appunti generali in base agli argomenti e agli errori, non svolgimenti generati per ciascun problema. Per le dimostrazioni consultare le soluzioni ufficiali collegate. Gli svolgimenti commentati possono riferirsi alla versione base: nelle altre versioni bisogna individuare il problema dal testo, anziché dal numero. Negli allenamenti misti si usano le prime versioni di ogni edizione per evitare che le numerose varianti 2021 dominino il campione.

Le durate presenti nei testi vengono riconosciute (90, 100 o 120 minuti, 60 per la gara tradizionale 2021). Nei materiali 2020 e online 2021 che non indicano la durata sono proposti rispettivamente 60 e 40 minuti come tempi di allenamento, non come tempi ufficiali verificati. Dalla schermata iniziale è possibile scegliere la durata.

## Rigenerazione dei dati

Richiede Python, PyMuPDF, NumPy, requests e Tesseract; per aggiornare i collegamenti bisogna prima rileggere la pagina ufficiale con Firecrawl e salvare la risposta strutturata in `data/archive.json`.

```bash
python -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python scripts/download.py
.venv/bin/python scripts/prepare.py
cargo run --locked
```

Il backend ascolta soltanto sull’interfaccia locale. Non è previsto un sistema di account: è uno spazio personale sul computer locale, non un servizio condiviso. Applicazione indipendente, non affiliata a UMI. I testi e i materiali appartengono ai rispettivi titolari.
