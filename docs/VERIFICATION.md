# Verifica finale — 11 novembre 2026

Ambiente: Node 22.23.4, Rust 1.99.1, Chromium di Playwright 1.65.0. La verifica è stata eseguita sul codice destinato al primo commit.

| Requisito                                              | Evidenza verificata                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard con dati reali, punti forti/deboli e grafici | `tests/learning.test.mjs` e browser: uno storico isolato di risposte corrette da Rust produce Algebra 25% e Geometria 88%, con campioni di 8 problemi distinti; nessun valore inventato nello stato iniziale.                                                                                                          |
| Sistema di miglioramento                               | Diagnosi bilanciata, priorità basate sulle debolezze, selezione di nuovi problemi, ripasso dopo 1/3/7/14/30 giorni, riflessioni sugli errori e correzione degli argomenti. Unit test e browser verificano i comportamenti.                                                                                             |
| Preservare il focus sui problemi                       | Schermata prova senza dashboard, timer, cinque risposte, navigazione e appunti richiudibili; verifica visuale e controllo dell’overflow a 320, 390, 768 e 1100 px.                                                                                                                                                     |
| Usare il pacchetto di design                           | Font Manrope fornito nel pacchetto, licenza OFL inclusa, palette e superfici tratte dai token e dal documento allegato. Screenshot desktop/mobile verificati. Nessun dato dimostrativo del pacchetto inserito nell’archivio reale.                                                                                     |
| Conservare il corpus                                   | Test controllano 183 prove, 30 anni, 2.632 quesiti, unicità degli ID, chiavi A–E, immagini presenti e PDF sorgente esistenti.                                                                                                                                                                                          |
| Rust e banca dati                                      | SQLite in memoria nel backend serverless, corpus incorporato nel binario, correzione Rust; 5 test Rust passati. Operatori matematici differenti non vengono eliminati nel raggruppamento testuale dei problemi.                                                                                                        |
| Persistenza scelta dall’utente                         | IndexedDB, ripresa dopo reload, timer non azzerato, backup con validazione, unione senza duplicati e importazione dello storico locale precedente; verificato nel browser.                                                                                                                                             |
| Vercel                                                 | `vercel.json`, entrypoint `api/index.rs`, build di produzione con Node 22 e `cargo build --release --locked --bin api` passati. Binario release circa 4,6 MB. L’entrypoint Vercel reale è stato avviato in locale e verificato via HTTP per catalogo, avvio e correzione. Non sono necessarie credenziali di database. |
| Analytics                                              | Build con `VERCEL=1`; test browser dell’iniezione dello script ufficiale, pageview interne anonime e rimozione di query/hash. Lo script di raccolta è sostituito da uno stub **solo nel test**; la ricezione effettiva dei dati richiede Analytics abilitati nel progetto Vercel dell’utente.                          |
| Dati privati esclusi da Git                            | Database personale SQLite, WAL, `node_modules`, build, test screenshot e dati browser esclusi da `.gitignore`. Nessun token o variabile d’ambiente richiesto nel codice.                                                                                                                                               |

Comandi completati:

- `mise exec node@22 -- npm ci`
- `mise exec node@22 -- npm test`: **12 test passati**.
- `cargo test --locked`: **5 test Rust passati**, nessun fallimento.
- `mise exec node@22 -- npm run build`: build di produzione riuscita.
- `mise exec node@22 -- npm run test:e2e`: **12 gruppi di verifiche browser passati**, nessun errore JavaScript.
- `cargo build --release --locked --bin api`: build ottimizzata riuscita.
- `npm run test:runtime`: catalogo di 2.632 quesiti, avvio e correzione verificati sul runtime Rust di Vercel.
- `VERCEL=1 npm run build` e `npm run test:analytics`: verifiche Analytics riuscite.
- `cargo fmt --check` e `git diff --cached --check`: nessun errore.
- `npm audit`: nessuna vulnerabilità segnalata nelle dipendenze installate durante la verifica.

La build locale finale disattiva lo script Analytics; su Vercel viene attivato dalla variabile di sistema `VERCEL`. Il server locale rimane disponibile su `http://127.0.0.1:8787`.

Gli screenshot e i report dettagliati sono in `test-results/`, esclusi da Git. Usano un contesto browser isolato e dati di verifica, non i progressi personali dell’utente. L’app pubblicata parte dal proprio archivio browser, senza dati di esempio.

Non è stato eseguito un deploy sul progetto Vercel dell’utente né un push: l’utente ha richiesto di eseguirli personalmente. La CI è configurata e partirà al primo push; una sua esecuzione remota non viene dichiarata già avvenuta.
