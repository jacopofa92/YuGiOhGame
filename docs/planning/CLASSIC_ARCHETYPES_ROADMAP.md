# Supporti moderni per gli archetipi classici

Stato: in corso sul branch `feature/supporti-archetipi-classici`.

Baseline ufficiale completata il 2026-10-14: metodo e lettura in
`docs/audits/CLASSIC_ARCHETYPES_BASELINE.md`, dati grezzi in
`reports/archetypes/CLASSIC_ARCHETYPES_BASELINE.json`. Il benchmark `Custom`
e' stato completato il 2026-10-15: analisi in
`docs/audits/CLASSIC_ARCHETYPES_CUSTOM_BENCHMARK.md` e dati grezzi in
`reports/archetypes/CLASSIC_ARCHETYPES_WITH_CUSTOM.json`.

## Vincoli decisi

- Niente Synchro, Xyz, Pendulum o Link.
- Starter e Structure del giocatore restano invariati.
- Le nuove carte devono conservare l'identita' anime del personaggio e non
  trasformare i deck in liste meta moderne.
- Ogni carta attraversa, in quest'ordine: effetto e test isolati, IA, audit
  riproducibile, eventuale inserimento nei deck avversari, ottenibilita'.
- Gli audit usano gli stessi semi e salvano i dati grezzi sotto `reports/`;
  non si modifica insieme IA globale e lista del deck, cosi' la causa di un
  cambiamento resta misurabile.

## Ordine dei pacchetti

1. Primitive comuni: archetipi, nomi assunti, limiti per turno/Duello,
   ricerca e invio dal Deck, effetti dal Cimitero e sostituzione distruzione.
2. Occhi Rossi: Black Stone, Insight, Spirit e Black Metal; solo dopo,
   Red-Eyes Fusion e Meteor Black Comet Dragon.
3. Mago Nero: Rod, Eternal Soul e Circle; poi Salvation, Soul Servant,
   Secrets of Dark Magic e un boss Fusione.
4. Drago Bianco: Melody, Alternative e True Light; poi Ultimate Fusion e un
   solo nuovo boss. Il tema e' gia' forte, quindi si procede con cautela.
5. Toon, in audit separato: Kingdom, Bookmark e Toon Harpie; solo dopo
   Page-Flip e Toon Black Luster Soldier. Va preservata anche la linea
   Abbandonato/Mille Occhi di Pegasus.
6. Divinita': prima le mosse firma e Canto Antico; Soul Crossing e le forme
   aggiuntive di Ra sono feature di motore separate e arrivano per ultime.

La Fase 1 e' completata: inventario e scelte tecniche sono documentati in
`docs/audits/CLASSIC_ARCHETYPES_PRIMITIVES.md`. Il motore possedeva gia' quasi
tutte le primitive; sono stati aggiunti soltanto identita' di archetipo e nomi
assunti, entrambi opzionali e compatibili con carte custom.

La Fase 2a (primo pacchetto Occhi Rossi) ha completato dati, illustrazioni,
effetti e test isolati per gli id 1250-1253. Stato e prossimi confronti sono in
`docs/audits/RED_EYES_SUPPORT_AUDIT.md`; deck ed economia restano invariati
finche' l'audit a 1/2/3 copie non e' concluso.

Audit 1/2/3 concluso (4.000 duelli): il pacchetto non migliora Joey Hard e le
copie multiple lo indeboliscono; nessun deck avversario viene modificato.
Limite giocatore provvisorio: 2 copie ciascuna, da applicare nella fase
economica. La seconda meta' Occhi Rossi resta sospesa fino alla feature sicura
per materiali di Fusione dal Deck; si procede intanto con Mago Nero.

La Fase 3 (Mago Nero) e' completa nei due pacchetti e nell'audit 1/2/3; la
composizione candidata per Yami Yugi Difficile resta sospesa fino al benchmark
informativo `Custom`. Il primo pacchetto della Fase 4 (Drago Bianco) contiene
Melodia, Drago Bianco Alternativo e Luce Autentica: dati, immagini, effetti e
test isolati sono completi. Anche l'audit 1/2/3 (3.500 duelli) e' concluso:
Luce Autentica e' la carta piu' positiva, mentre il pacchetto migliore resta
moderato al 44,4% contro baseline 40,0%. Stato tecnico e dati in
`docs/audits/BLUE_EYES_SUPPORT_AUDIT.md`; deck ed economia restano invariati
in attesa dell'audit conclusivo. Anche il secondo pacchetto, Fusione
Definitiva e Drago Bianco Alternativo Definitivo, ha ora dati, immagini,
effetti e test isolati completi. L'audit conclusivo (5.750 duelli) misura il
pacchetto completo leggero al 39,6%, contro baseline coeva 38,4%; la variante
con 2 Luce Autentica arriva al 48,8%. Nessuna carta e' ancora entrata nei deck
avversari: la sola candidata Kaiba Hard attende il benchmark `Custom`.

La Fase 5 Toon e' iniziata mantenendo la deroga anime gia' adottata. Il primo
pacchetto aggiunge Regno Toon, Segnalibro Toon e Signora Arpia Toon; effetti,
immagini, compatibilita' col vecchio Mondo e test isolati sono completi.
L'audit 1/2/3 (3.500 duelli) misura il pacchetto leggero al 50,4% contro una
baseline del 39,6%, conservando e anzi rendendo piu' visibile la linea
Abbandonato/Mille Occhi. Starter e deck Pegasus restano invariati; dettagli
e limiti provvisori in `docs/audits/TOON_SUPPORT_AUDIT.md`.
Il secondo pacchetto aggiunge Gira-Pagina Toon e Glorioso Soldato Nero Toon:
dati, immagini, costo reale con Tributi misti mano/Terreno, scelta casuale
sincronizzata e test isolati sono completi. Deck ed economia restano ancora
invariati. L'audit conclusivo (3.250 duelli) misura Gira-Pagina al 42,8-45,6%
e Soldato al 38,4-29,2% contro baseline 38,4%: limite provvisorio 2 per la
prima e 1 per il boss. Il pacchetto completo leggero arriva al 62,4%, quindi
nessun inserimento nei deck avversari prima del benchmark `Custom`.

La Fase 6 ha ora completato dati, immagini, primitive, effetti e test isolati
di Attacco Forza del Tuono, Pugno del Fato e Canto Antico (id 1271-1273).
Sono coperti effetti non annullabili, limite di un solo mostro attaccante,
negazione temporanea per nome, Evocazione Tributo aggiuntiva e statistiche
originali dei Tributi. Anche verifica Multiplayer e audit 1/2/3 sono
conclusi: 3.000 duelli senza errori o stalli, limite proposto di una copia
per ciascuna carta e nessuna modifica ai deck avversari prima del benchmark
`Custom`. Dettagli in `docs/audits/EGYPTIAN_GODS_SUPPORT_AUDIT.md`.

La fase di motore finale delle Divinità è completata per gli id 1274-1276:
Incrocio di Anime, Drago Alato di Ra - Modalità Sfera e Drago Alato di Ra -
Fenice della Divinità Egizia. Sono state introdotte in forma opt-in la
selezione di Tributi sui due Terreni, l'Evocazione sul lato sacrificato, il
ritorno differito del controllo, il trigger dal Cimitero, l'immunità agli
effetti altrui, il vero invio al Cimitero senza distruzione e la deroga
esplicita alle condizioni di Evocazione. I test mirati coprono l'intero ciclo
Sfera -> Ra e Ra -> Fenice -> Sfera. Nessun deck avversario è stato cambiato.
Il benchmark informativo contro il deck `Custom` e' ora concluso. L'audit
fattoriale Kaiba/Pegasus ha promosso due correzioni conservative dei loro deck
Hard dopo 1.200 duelli, senza ancora inserirvi supporti moderni. Resta l'audit
mirato di Strings prima delle decisioni finali sui deck avversari.

## Deck avversari: politica conservativa

Le nuove carte non entrano automaticamente nei deck avversari. Per ogni
archetipo si conserva prima una baseline dei deck Facile/Medio/Difficile e si
misura l'effetto della sola IA. Poi:

- Facile resta di norma invariato, per conservare il repertorio storico e
  una difficolta' accessibile;
- Medio riceve una nuova carta soltanto se il piano tematico attuale e'
  incoerente o troppo spesso inutilizzabile;
- Difficile e' il candidato naturale per un piccolo pacchetto, normalmente
  2-4 sostituzioni e non semplici aggiunte, solo se l'audit dimostra che
  migliora strategia e distinzione senza creare vittorie automatiche;
- boss e carte firma moderne non devono comparire con la stessa frequenza a
  tutti i livelli;
- nessuna staple estranea alla lore viene usata per alzare artificialmente
  il win rate.

Se il deck Difficile e' gia' forte e distinto, puo' restare invariato: una
nuova carta puo' esistere soltanto per il giocatore. Al contrario, se una
carta e' necessaria affinche' il personaggio realizzi la propria strategia,
si prova prima sul Difficile e soltanto dopo, eventualmente, sul Medio.

## Economia, prima copia e limiti

Questi supporti sono carte veramente rare. La prima copia non arriva dalle
buste o dalla rotazione ordinaria: viene sbloccata tramite una missione,
Sfida, impresa del personaggio, completamento di un arco o altro traguardo
tematico. Soltanto dopo lo sblocco della prima copia la carta entra nel pool
delle buste/rotazioni appropriate, sempre con probabilita' molto bassa.

Ogni carta riceve un limite di possesso/Deck deciso per potenza reale:

- limite 3: supporti onesti che fanno funzionare il tema e non generano da
  soli vantaggio eccessivo;
- limite 2: ricerche molto efficienti, resurrezioni ricorrenti o carte che
  aumentano troppo la consistenza;
- limite 1: boss, negazioni, rimozioni ripetibili, carte che usano materiali
  dal Deck/Cimitero o che possono dominare il duello da sole.

Il limite deve essere applicato sia alla costruzione del deck sia alle fonti
di acquisizione: missioni, buste e Negozio non distribuiscono copie oltre il
tetto. Prima di fissarlo definitivamente si eseguono audit a 1/2/3 copie con
gli stessi semi. La Cartoteca mostra requisito della prima copia, fonti delle
successive, probabilita' e limite massimo.

Questa fase e' ora implementata per tutti gli id 1250-1276. Le prime copie
richiedono capitolo narrativo e vittorie a Difficile contro il personaggio
coerente; le mosse delle Divinita' richiedono anche il relativo Dio. Dopo lo
sblocco, le copie residue entrano con peso ridotto nelle buste tematiche e
nelle rotazioni alte. Limiti, soglie e rarita' sono raccolti in
`docs/economy/MODERN_SUPPORTS_ACQUISITION.md`.

## Verifiche per ogni archetipo

- test mirati di costo, bersaglio, risoluzione, limiti e zone;
- comportamento Facile/Medio/Difficile e compatibilita' Multiplayer;
- 50 semi per iterazione, poi almeno 250 duelli per livello prima del merge;
- frequenza della carta firma, carte morte, turni, stalli e vittorie precoci;
- confronto deck invariato contro deck con supporti, partendo dal Difficile;
- benchmark aggiuntivo contro il deck personale chiamato `Custom`, considerato
  uno dei deck giocatore piu' forti disponibili: serve a mostrare se
  l'avversario Difficile diventa troppo facile contro una lista ottimizzata,
  ma per ora non determina promozione, bocciatura o bilanciamento del pacchetto;
- simulazione di farming e controllo delle carte senza fonte;
- suite completa soltanto alla chiusura del pacchetto e prima del merge.

### Benchmark informativo `Custom`

Il risultato contro `Custom` viene esposto in una sezione separata del report
e non mescolato alle medie dei deck Starter/Structure. Per ogni esecuzione si
salvano anche nome, Main Deck, Extra Deck e impronta della lista: il deck e'
modificabile dal giocatore e due report con liste diverse non sono direttamente
confrontabili.

La prima metrica richiesta e' la resistenza dell'avversario Difficile contro
`Custom`; come contesto si riportano comunque Facile e Medio con gli stessi
semi. Il report comprende almeno win rate di `Custom`, tentativi/turni medi,
vittorie precoci, stalli e frequenza con cui l'avversario realizza la propria
strategia. Un risultato molto favorevole a `Custom` e' un segnale diagnostico,
non una ragione sufficiente per potenziare il deck avversario: prima si deve
distinguere tra matchup sfavorevole, carta dominante di `Custom`, limite
dell'IA e lista avversaria realmente debole.

Strumento: `tools/audit-archetipi-classici.js`. Accetta il file prodotto da
Profilo -> Esporta salvataggio (`--salvataggio`) oppure una singola specifica
deck JSON (`--deck-custom`). Senza uno di questi file genera la baseline
ufficiale e lascia correttamente assente la metrica `Custom`.

Prima esecuzione completata con 50 semi e lista reale di impronta
`e1909a556263c979`: `Custom` vince in media il 95,7% contro Facile, il 79,3%
contro Medio e l'81,0% contro Difficile. Il mancato vantaggio globale di Hard
deriva soprattutto da Kaiba e Pegasus; non viene tradotto automaticamente in
modifiche ai deck.

