# Work in progress — miglioramenti da seguire

Elenco di lavori consigliati, in ordine di valore. Spuntare `[x]` quando fatto.

## Piano di attacco (deciso il 2026-10-04)

Obiettivi dell'utente: un motore scalabile e "plug in", e in prospettiva
Forbidden Memories come secondo set di regole. Angular e il 2 contro 2
sono rimandati. TypeScript solo come tipi nei commenti (`// @ts-check` +
JSDoc): niente build, `file://` resta (lo rompono solo i moduli nativi
`type="module"`, non TypeScript). Ogni fase lascia il gioco giocabile.

Le misure di partenza (per sapere da dove si parte): duel-engine.js 6.316
righe, actions.js 3.855, game-flow.js 3.797; 205 accessi al DOM e 85
`setTimeout` nei tre file del nucleo; 396 ternari "player ? bot";
366 accessi diretti a `gameState.player*`/`bot*`; 528 `ctx.opponent` e 1.119
`gameState.` nelle carte; 788 carte registrate; 190 spec.

**Priorità 0 — chiudere e mettere in sicurezza**
- [x] Suite completa sulle versioni 1.0.40-1.0.43: 189/190. L'unico
      fallimento (lod-mrd-linked-monster-batch14, Sovrano Oscuro Ha Des) era
      la cascata di fasi d'apertura sotto carico: corretto lo spec.
- [ ] Errore raro "Cannot read properties of null (reading 'card')" in
      realistic-bot-turns: uscito UNA volta (partita casuale), non
      riprodotto in 7 giri. Il runner ora registra le prime righe dello
      stack degli errori di pagina: alla prossima occorrenza si vede da dove.
- [x] Stop alle funzioni nuove sul motore attuale: solo correzioni di bug.
- [x] Le 3 note restanti (192, 235, 622) si lasciano così. CORREZIONE: avevo
      scritto che 235 e 622 si sarebbero chiuse con le "decisioni in
      sospeso"; non è vero. Il loro limite è il checkpoint di targeting
      (`ctx.declareTarget`), che restituisce il bersaglio finale subito a
      circa cento chiamanti: per farlo aspettare una scelta servirebbe che
      tutti lo ricevessero con una richiamata.

**Priorità 1 — preparare il terreno** (branch `refactor/nucleo-senza-testa`)
- [x] Tipi in `types/motore.d.ts` (contratto delle carte `ctx` con le 39
      azioni e i ~60 dati del momento, `CardDefinition`, `gameState`),
      `npm run typecheck` (tsc, solo i file con `// @ts-check`), spec
      `guardrail-tipi`. Accendere `@ts-check` sulle carte esistenti dà ~100
      errori per parte: da fare un file alla volta.
- [x] Lista unica dei gruppi di `<script>` (`scripts/gruppi-script.js`,
      `npm run sync-scripts`, pre-commit + `guardrail-gruppi-script`).

**Priorità 2 — nucleo senza testa** (stesso branch)
- [x] Divisi per competenza, con spostamento parola per parola provato da
      `tools/impronta-funzioni.js`: `stato.js`, `fasi.js` (da game-flow.js),
      `battaglia.js`, `evocazioni.js` (da actions.js).
- [x] Le regole toccano la pagina solo da `js/engine/porta-ui.js`
      (`guardrail-nucleo-senza-dom`, carte comprese).
- [x] Traguardo: duelli interi in Node (`tools/duello-senza-testa.js`,
      orologio virtuale, `--diagnosi`, spec `duello-senza-testa`). Ha
      trovato 5 difetti veri (Spirito, Rituali, Lady Arpia, doppione
      Egoista Elegante, Bozzolo).
- [x] Canale di eventi (`js/engine/eventi-duello.js`): le regole avvisano
      l'interfaccia, non la chiamano per nome. `addToLog`, `updateUI`,
      `clearSelection`, `isBlockingModalOpen`, `endDuel` tengono il nome ma
      stanno in `js/engine/canale-partita.js` con la sola parte di regola.
      Il duello senza testa non ha più nessuna funzione finta. Guardrail
      `guardrail-regole-senza-interfaccia`.
- [x] Decisioni in sospeso (`js/engine/decisioni.js`): ogni scelta (helper
      condivisi, circa 60 carte, la risposta in Catena) è una richiesta a
      `Decisioni.chiedi`, che decide chi risponde (avversario remoto,
      persona, scelta automatica); `Decisioni.inSospeso`/`rispondi` per
      rispondere senza interfaccia. Le regole non nominano più
      `DuelEngineUI`. Spec `decisioni-in-sospeso`.
- [ ] Unire il branch in `main` dopo la suite completa (su richiesta).

**Priorità 3 — lato tavolo e Multiplayer** (branch `refactor/posti-al-tavolo`)
- [x] Chi controlla un posto è un dato (`js/engine/tavolo.js`: 'persona',
      'ia', 'remoto'), non più dedotto da "player = persona, bot = IA". I
      nomi 'player'/'bot' restano: sono solo i nomi dei due posti.
- [x] L'IA gioca da entrambi i posti (`turnoIA(io)` in bot.js, parametro
      `io` in tutte le funzioni dell'IA, livello per posto in
      `gameState.livelloIA`). Guardrail `guardrail-ia-da-ogni-posto`.
- [x] Duello senza testa = IA contro IA (`--giocatore`, `--livello-giocatore`):
      prima base per il bilanciamento con dati veri (Priorità 4).
- [ ] Restano nel nucleo i circa 400 ternari "player ? ... : bot ..." scritti
      a mano: si possono portare sugli accessori di Tavolo un file alla
      volta, ma non bloccano nulla (sono corretti per entrambi i posti).
- [ ] Multiplayer "a passo comune": i due client eseguono le stesse azioni
      sullo stesso stato (niente più fotografie di stato da tradurre).

**Priorità 4 — per il giocatore** (in parallelo)
- [ ] Service worker più leggero (vedi «Peso e velocità» qui sotto).
- [ ] Tutorial o partita guidata (meglio dopo la Priorità 2).
- [ ] Bilanciamento delle difficoltà con simulazioni bot contro bot.

**Priorità 5 — espansioni**
- [ ] Forbidden Memories come secondo set di regole sullo stesso nucleo.
- [ ] Più avanti, se si vorrà: file `.ts` veri compilati in uno script
      classico (esbuild, formato IIFE: `file://` resta), un framework per
      l'interfaccia, il 2 contro 2.

Decisioni aperte dell'utente: i 6 PNG di avatar non usati; le regole del
2 contro 2 quando lo si riprende.

## Peso e velocità (più urgente)

- [x] PNG ridimensionati (max 320 px, trasparenza mantenuta): gli originali
      stanno in `images/characters/avatarTrasparenza/`, le copie leggere usate
      dal gioco in `images/characters/pedine/` (da ~100 MB a ~10 MB).
      Un nuovo PNG va messo in `avatarTrasparenza/` e ridimensionato in `pedine/`.
- [ ] Il service worker precarica tutta l'app a ogni installazione: con asset
      grossi l'aggiornamento su telefono diventa lento. Valutare di non
      precaricare le immagini pesanti (cache al primo uso).

## Affidabilità

- [x] `bot-waits-for-summon-cinematic` ora aspetta segnali veri (cinematica
      finita + attacco avvenuto) invece di 11 s fissi. Gli altri spec con
      `waitForTimeout` fissi non sono stati rivisti: farlo se ne fallisce uno.
- [x] Vecchie migrazioni della Storia anime tolte (salvataggi precedenti al
      timbro di base azzerati, 1.0.17-1.0.18).
- [x] CI di GitHub verde (dal commit 275f0df, 1.0.33). Lo stato delle run si
      legge senza login: `https://api.github.com/repos/jacopofa92/YuGiOhGame/actions/runs`
      (i log dei singoli test invece richiedono l'accesso). Azioni portate a
      v5 e Node 24, come in locale.
- [x] Controllo automatico pre-commit (`.githooks/pre-commit` →
      `scripts/pre-commit.js`): sintassi dei .js in stage, accenti corrotti
      nelle righe aggiunte, BOM, `cards.json` senza file generato. Su un
      clone nuovo va attivato con `npm run hooks`.
- [x] Multiplayer: il relay ora rifiuta azioni sconosciute, indici assurdi e
      mosse da turno (Evocare, attaccare, calare carte, avanzare di fase)
      fuori dal proprio turno (`validateGameAction` in `server/server.js`).
      RESTA APERTO: il server non conosce il campo, quindi un client
      modificato può ancora mentire su ciò che fa nel proprio turno (carte
      che non ha, danni, pescate). Servirebbe far girare il motore anche lato
      server: da fare solo se si apre a sconosciuti. Il server va ridistribuito
      dove gira per avere i nuovi controlli.

## Esperienza di gioco

- [x] Schema unico (banda + velo + elementi sopra il velo + Annulla dove ha
      senso) per Tributo, scarto a fine turno e casella dopo un Sacrificio.
      I picker a modale (lista carte, Attacco/Difesa) erano già modali con
      chiusura. Verificato a occhio con screenshot (desktop e telefono in
      orizzontale): banda, velo e carte sopra il velo funzionano. Difetto
      minore: su telefono la banda copre in parte il nome dell'avversario.
- [ ] Tutorial o partita guidata per chi non conosce Yu-Gi-Oh.
- [x] Velocità del bot regolabile (Normale/Veloce) in Impostazioni → Dispositivo.
      Accorcia solo le pause di ritmo in `js/ai/bot.js` (`botMs`).

## Contenuti

- [x] Gruppo "blocca ogni Evocazione" chiuso (282, 434, 1045): 282 era già a
      posto (nota falsa), 1045 ora blocca solo le Special Summon come da testo
      (`specialSummonBlockedFor`), 434 vieta Evocazioni scoperte e Special
      Summon nel turno (`noSummonTurn`, `DuelEngine.isSummonBannedThisTurn`).
- [x] Tutti gli scostamenti reali dal testo chiusi (1.0.31-1.0.33). Le
      `missingEffectNote` rimaste sono tutte promemoria su limiti del motore
      (vedi CLAUDE.md, "Carte con limiti noti").
- [x] Scelta di chi SUBISCE lo scarto (`victimChoosesDiscard`): Criosfinge
      (761) e Duo Delinquente (873), anche in Multiplayer.
- [x] La battaglia e la Chain aspettano le scelte del giocatore
      (`callCardHandlerWaiting`/`attendiScelta`, 1.0.35): chiuse le 6 carte
      in cui sceglieva il motore. Restano 19 note, tutte promemoria su
      limiti del motore.
- [x] Ritorni in mano e spostamenti dal Cimitero (761, 890, 1.0.36):
      Necrovalley ora vede ogni spostamento scritto a mano
      (`graveyardMoveNegated`, sorvegliato da `guardrail-necrovalley`).
- [x] Checkpoint di targeting coperto ovunque (1.0.37): una trentina di
      carte, tutte le Magie Equipaggiamento e i Union ora dichiarano il
      bersaglio (`dichiara: true`); sorvegliato da
      `guardrail-bersagli-dichiarati`. Chiuse anche le protezioni di
      Great Dezard e Fushioh Richie.
- [x] "Uno dei due giocatori può pagare" (882, 1.0.38):
      `usableByEitherPlayer`.
- [x] Finestra di priorità per gli Effetti Veloci (396, 459, 1059, 1.0.39):
      `DuelEngine.openPriorityWindow` in Standby, inizio Battle Phase e fine
      turno dell'avversario; in Multiplayer dal 1.0.41.
- [x] Carte che promettono una scelta e scelgono da sole (1.0.40): audit
      testo↔codice, 7 carte chiuse (548, 289, 220, 881, 742, 792, 363),
      helper `chooseFieldTargetsInSequence`.
- [ ] Note restanti (3): 192 (immunità ai soli effetti mirati); 235 e la
      metà Magia/Trappola di 622 (checkpoint sincrono, scelgono da sole).
- [ ] 6 PNG in `images/characters/avatarTrasparenza/` (e copie in `pedine/`) senza avatar corrispondente
      (Kaiba in Mantello Viola, soldato Grande Guerra, kaibaV2,
      setoKaiba_duelist Kingdom, setoKaiba_forbiddenMemories, yamiYugiV2):
      decidere se rimuoverli o dar loro un uso.
- [ ] Bilanciamento dei livelli di difficoltà con dati veri. Provato un giro
      (77 partite: giocatore scriptato semplice contro il bot): 0 vittorie
      ovunque, quindi inutile. Servirebbe un giocatore di riferimento più
      forte, che usi anche Magie e Trappole. Il motore non ha un vero duello
      bot contro bot: si pilota la pagina con Playwright (~70-150 s a partita).

## Manutenzione

- [ ] Nuove funzioni in file piccoli e separati: `duelMonstersCore.html`,
      `game-flow.js` e `actions.js` sono molto grandi e con funzioni globali.
- [ ] La lista di `<script>` è duplicata a mano in molte pagine HTML: spostarla
      in un unico file condiviso caricato da tutte.

## Battle City

- [x] Pedine verificate: i 20 personaggi che possono comparire hanno il loro
      PNG col nome dell'avatar, nessun ripiego sulla pedina generica.
