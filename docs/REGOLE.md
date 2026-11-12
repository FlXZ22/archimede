# Regole delle simulazioni Archimede — triennio

Le condizioni sono riferite alla specifica edizione in archivio, non attribuite automaticamente alla futura gara 2026. I testi e i comunicati sono stati verificati tramite Firecrawl e i PDF originali conservati nel progetto.

| Edizioni                                  | Quesiti |     Durata |
| ----------------------------------------- | ------: | ---------: |
| 1996–2008                                 |      25 |  90 minuti |
| 2009–2011                                 |      25 | 120 minuti |
| 2012–2015                                 |      20 | 120 minuti |
| 2016–2019                                 |      20 | 110 minuti |
| 2020 (recupero dell’11 marzo 2021) e 2021 |      12 |  60 minuti |
| 2022–2025, incluso recupero 2024          |      16 | 100 minuti |

Il punteggio è 5 per una risposta corretta, 1 per una risposta in bianco e 0 per una errata. Ogni domanda ha una sola opzione corretta su cinque. Il massimo è quindi 5 × numero di quesiti: 80 punti nel formato 2025.

## Fonti e particolarità

- [Archivio ufficiale UMI](https://olimpiadi.dm.unibo.it/le-gare/giochi-di-archimede/): PDF di ogni edizione. Le istruzioni di ciascuna versione sono individuate nel manifest `data/exam-rules.json`, con PDF, pagina e fonte.
- [Testo e soluzioni ufficiali 2025](https://olimpiadi.dm.unibo.it/wp-content/uploads/2025/12/archimede2025_testi_soluzioni.pdf): 16 problemi, 100 minuti, punteggio 5/0/1; calcolatrici e strumenti di comunicazione vietati. Risposte multiple, illeggibili o invalide sono errate.
- [Comunicato UMI per la modalità online 2021](https://olimpiadi.dm.unibo.it/2021/11/28/orari-giochi-di-archimede-online/): 60 minuti dal download del testo alla consegna. I 40 minuti precedentemente usati nell’app erano un tempo di allenamento, non la durata della gara. Per il punteggio dell’edizione online si usa la stessa scala documentata nel testo cartaceo 2021, collegato come seconda fonte.
- [Circolare istituzionale n. 101 del Liceo Fermi](https://old.liceofermibo.edu.it/circolari-studenti/nuova-data-per-i-giochi-di-archimede-olimpiadi-di-matematica-11-marzo-2021/?download=27377): il recupero dell’11 marzo 2021 prevede 12 problemi e 60 minuti dalla prima domanda. È una fonte scolastica istituzionale, distinta da un comunicato dell’organizzatore. Non va confusa con la gara del 18 febbraio poi annullata, annunciata inizialmente con 90 minuti.
- Per il 2004 la durata di un’ora e mezza è stata controllata visivamente nel PDF ufficiale: la codifica del font non consente di estrarla in modo affidabile.
- Per il 2016–2019 il testo riporta 110 minuti. Il vecchio estrattore considerava erroneamente anche i tempi all’interno dei problemi: nel 2016 aveva scambiato una partita di calcio di 90 minuti per la durata della prova.

## Comportamento dell’app

- Prima di una prova completa viene mostrato un riepilogo delle regole con fonte consultabile. Il timer parte soltanto dopo il pulsante di avvio.
- In simulazione completa il tempo è fissato all’edizione sia nell’interfaccia sia nell’API Rust. Un tempo diverso deve essere richiesto esplicitamente come allenamento, non come simulazione fedele.
- Mirato e Diagnosi mantengono tempi personalizzati ed etichetta di allenamento.
- La scadenza non viene prolungata cambiando scheda o ricaricando la pagina; alla scadenza il frontend invia alla correzione le risposte salvate. Il risultato è calcolato dal backend sulle chiavi e sulla scala documentata.
- La brutta copia digitale è vuota all’inizio. I promemoria generali di metodo e le soluzioni si vedono dopo la consegna.
- Nella gara cartacea non sono ammesse correzioni nella griglia. Nell’app le selezioni provvisorie fungono da brutta copia e la consegna finale fissa la griglia; l’interfaccia impedisce risposte multiple.
- L’app è un adattamento di allenamento: non applica le vecchie fasce orarie di accesso, non raccoglie la griglia cartacea e non sorveglia l’uso di strumenti esterni.

## Verifica tecnica

`scripts/audit_rules.py` legge solo frasi che introducono il tempo a disposizione dello studente e si arresta se manca una durata verificata. I valori dei quesiti non vengono usati come regole. Il controllo è eseguito anche al termine della rigenerazione del corpus.

Test dedicati controllano tutti i 183 abbinamenti, le transizioni storiche, il caso online 2021, la regressione del 2016, il blocco dei tempi nell’API e il riepilogo prima dell’avvio nel browser. Le prove già iniziate e i risultati storici restano conservati senza alterarne retroattivamente il timer.
