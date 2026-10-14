# Supporti moderni per gli archetipi classici

Stato: pianificazione, nessuna carta ancora approvata per l'implementazione.

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

