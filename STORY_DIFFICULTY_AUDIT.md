# Audit difficoltà della Storia anime

Data: 2026-10-07. Dati grezzi: `STORY_DECK_SIMULATION_REPORT.json`.

## Obiettivo e metodo

Starter e Structure Deck non sono oggetto del bilanciamento: restano liste
storiche immutabili e servono come 16 campioni di forza diversa. Per ogni
campione sono stati provati tutti i 26 duelli principali della Storia anime,
con un massimo di 50 tentativi fino alla prima vittoria.

L'IA del giocatore è sempre `hard`. Per lo stesso deck, nodo e numero di
tentativo, Facile/Medio/Difficile ricevono lo stesso seme. Cambiano soltanto
l'IA e il deck dell'avversario. La tabella aggrega 15 deck: Pegasus Starter è
presente nei dati grezzi ma escluso da queste medie, perché la debolezza Toon
è nota e verrà studiata separatamente.

Il numero è la media dei tentativi necessari a vincere: più è alto, più
l'incontro è difficile.

## Risultato per incontro

| Incontro | Avversario | Facile | Medio | Difficile | Progressione |
|---|---:|---:|---:|---:|---|
| Prologo — Kaiba | Kaiba | 2,00 | 6,87 | 5,20 | Medio più duro |
| Videocassetta | Pegasus | 1,13 | 1,20 | 1,40 | Coerente, debole |
| Isola — Weevil | Weevil | 1,40 | 2,07 | 1,40 | Difficile troppo facile |
| Isola — Mako | Mako | 1,40 | 6,93 | 6,13 | Medio leggermente più duro |
| Isola — Panik | Panik | 1,93 | 3,33 | 5,40 | Coerente |
| Isola — Bakura | Bakura | 1,07 | 3,67 | 4,73 | Coerente |
| Falso Kaiba | Kaiba | 2,80 | 6,27 | 4,47 | Medio più duro |
| Fratelli Paradox | Paradox Brothers | 1,73 | 4,80 | 3,53 | Medio più duro |
| Isola — Kaiba | Kaiba | 2,07 | 6,53 | 4,47 | Medio più duro |
| Castello — Mai | Mai | 1,40 | 3,27 | 4,07 | Coerente |
| Castello — Joey | Joey | 1,60 | 6,53 | 2,20 | Medio molto più duro |
| Castello — Pegasus | Pegasus | 1,27 | 1,13 | 1,40 | Debole, rinviato |
| Battle City — Seeker | Seeker | 1,40 | 2,00 | 1,93 | Quasi piatto |
| Battle City — Strings | Strings | 1,33 | 1,33 | 1,53 | Quasi piatto |
| Battle City — Arkana | Arkana | 1,53 | 2,67 | 4,33 | Coerente |
| Battle City — Lumis | Lumis | 1,47 | 1,60 | 1,67 | Coerente, quasi piatto |
| Battle City — Umbra | Umbra | 1,73 | 1,53 | 1,40 | Scala inversa |
| Joey controllato | Joey | 1,60 | 5,13 | 4,93 | Medio leggermente più duro |
| Battle City — Bakura | Bakura | 1,27 | 3,73 | 4,47 | Coerente |
| Virtuale — Gansley | Gansley | 1,07 | 3,60 | 3,33 | Medio leggermente più duro |
| Virtuale — Noah | Noah | 1,87 | 6,80 | 3,40 | Medio molto più duro |
| Finali — Kaiba | Kaiba | 3,67 | 6,93 | 4,27 | Medio più duro |
| Finali — Marik | Marik | 2,13 | 10,73 | 10,40 | Medio e Difficile equivalenti |
| Ricordi — Bakura | Bakura | 1,47 | 5,40 | 4,53 | Medio più duro |
| Ricordi — Zorc/Bakura | Bakura | 1,40 | 4,80 | 4,40 | Medio leggermente più duro |
| Cerimoniale — Yami Yugi | Yami Yugi | 1,93 | 4,67 | 5,47 | Coerente |

Tutti i 15 campioni non-Toon hanno superato ogni incontro entro 50 tentativi.
Il problema non è quindi un muro assoluto: è la gerarchia delle difficoltà.

## Diagnosi

1. **Facile è riconoscibile.** Salvo rari matchup, è nettamente sotto Medio
   e non sembra richiedere un indebolimento generale.
2. **Medio è spesso sovradimensionato rispetto a Difficile.** L'anomalia è
   sistematica su Kaiba e compare in modo forte anche su Joey del Castello e
   Noah. Non è spiegabile soltanto con un singolo tiro casuale: sono medie su
   15 deck e semi accoppiati.
3. **Alcuni avversari cambiano troppo poco.** Strings, Lumis e Seeker hanno
   una forbice minima; Umbra addirittura diventa progressivamente più facile.
4. **Gli archi principali meglio scalati** sono Panik, Bakura sull'isola,
   Mai, Arkana, Bakura a Battle City e Yami Yugi. Possono servire come
   riferimento interno prima di cambiare soglie generali dell'IA.
5. **Pegasus non viene giudicato qui.** I due incontri Toon sono deboli, come
   previsto, ma saranno oggetto di un lavoro separato senza contaminare la
   diagnosi generale.

## Prossimo controllo prima di bilanciare

Questa matrice varia insieme IA e lista del deck avversario. Per attribuire
la causa senza ipotesi servono due prove fattoriali sugli incontri anomali:

- stesso deck avversario, pilotato da IA easy/medium/hard: misura l'IA;
- stessa IA hard, con deck avversario Facile/Medio/Difficile: misura le liste.

Solo dopo questa separazione ha senso decidere se correggere una scelta
dell'IA o la consistenza di uno specifico deck, preservandone sempre il tema.

## Audit fattoriale: risultato

Il controllo è stato eseguito e i dati grezzi sono in
`STORY_DIFFICULTY_FACTORIAL_REPORT.json`. Ha isolato i 16 incontri anomali
non-Toon lungo due assi, sempre sugli stessi 15 deck campione e con gli stessi
semi.

### Asse IA — deck avversario Hard fisso

Solo **2 incontri su 16** diventano più difficili passando dall'IA Media
all'IA Hard: Seeker e Joey controllato. Negli altri 14 l'IA Hard rende lo
stesso deck meno efficace. Mediamente servono **2,06 tentativi in meno** per
battere l'IA Hard rispetto all'IA Easy/Media.

Easy e Medium coincidono spesso esattamente perché è una scelta esplicita del
codice: entrambi usano `AI_MEDIUM`; Facile si differenzia attraverso il deck.
Il problema misurato non è quindi quella uguaglianza, ma il fatto che
`AI_HARD`, pur valutando più opzioni, produce risultati peggiori quasi ovunque.

Esempi più netti, sempre con lo stesso deck Hard:

| Incontro | IA Easy/Media | IA Hard |
|---|---:|---:|
| Gansley | 10,00 | 4,27 |
| Mako | 10,87 | 5,67 |
| Zorc/Bakura | 8,60 | 4,60 |
| Fratelli Paradox | 9,33 | 5,73 |
| Joey al Castello | 5,47 / 7,47 | 1,93 |
| Kaiba nel prologo | 7,07 / 6,13 | 4,27 |

Conclusione: la causa dominante della scala incoerente è **l'IA Hard**, non un
indebolimento generale dei deck Hard.

### Asse deck — IA Hard fissa

Le liste fanno complessivamente il loro lavoro: il deck Hard richiede in media
**2,27 tentativi in più** del deck Easy. Otto incontri su sedici sono
perfettamente monotoni e in undici il deck Hard è almeno più forte del Medio.

Le progressioni migliori delle liste sono Marik, Bakura finale, Mako, Joey
controllato, Paradox, Zorc/Bakura e Gansley. Restano però alcune liste Medie
più efficaci delle Hard: soprattutto Kaiba (più versioni), Joey al Castello e
Noah. Weevil, Seeker e Umbra hanno invece una separazione troppo piccola per
essere percepibile.

### Ordine di intervento suggerito

1. Correggere `AI_HARD` e ripetere l'audit con le liste immutate.
2. Solo sul nuovo riferimento, riesaminare Kaiba, Joey al Castello e Noah.
3. Rafforzare la separazione delle liste di Weevil/Seeker/Umbra solo se resta
   piatta dopo la correzione dell'IA.
4. Affrontare Pegasus/Toon per ultimo, separatamente come concordato.

Nessun deck e nessuna euristica sono stati modificati durante questi audit.

## Verifica dopo la correzione di IA Hard

Il secondo report completo è
`STORY_DIFFICULTY_FACTORIAL_REPORT_AFTER_AI_FIX_V2.json` (stessi semi, 15
deck campione, massimo 50 tentativi). Nessuno Starter, Structure o deck
avversario è stato modificato.

La vecchia IA Hard tentava di sostituire quasi ogni scelta della Media con
uno scoring indipendente. Le simulazioni hanno mostrato che questo rompeva
sequenze e sinergie specifiche dei personaggi. La nuova gerarchia conserva
la linea affidabile della Media e aggiunge un vantaggio circoscritto: legge
la statistica effettiva di un mostro coperto e non dichiara uno scontro che
perderebbe certamente.

Il miglioramento è netto ma non viene presentato come perfetto:

- gli incontri in cui Hard è pari o più difficile della Media passano da
  **2/16 a 10/16**;
- lo scarto medio Hard − Media passa da **−2,48 a −0,25 tentativi**;
- Paradox, Joey del Castello e Umbra sono ora identici tra Media e Hard;
- Hard supera Media su Kaiba dell'isola, Seeker, Gansley, Marik e Bakura;
- Mako e Noah restano gli scostamenti negativi più evidenti da esaminare
  quando si passerà alle singole liste, senza alterare i deck del giocatore;
- Pegasus/Toon resta escluso e verrà affrontato per ultimo come concordato.
