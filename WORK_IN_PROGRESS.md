# Work in progress — miglioramenti da seguire

Elenco di lavori consigliati, in ordine di valore. Spuntare `[x]` quando fatto.

## Economia e acquisizione carte

- [x] Rarità a sette fasce, rotazioni e buste tematiche.
- [x] Deck non cumulativi, tetto a tre copie e sblocchi tramite Storia.
- [x] Carte firma, Spirit Message, Carte Dio ed Exodia con pity.
- [ ] Simulare il farming necessario e ritoccare i numeri con dati reali.
- [ ] Animazione epica finto 3D per l'ottenimento di una carta speciale.

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
- [x] Chiuse anche le ultime 3 note (192, 235, 622): immunità completa delle
      Spirit Message e checkpoint attendibile per la scelta del bersaglio
      ridiretto. `data/cards.json` non contiene più `missingEffectNote`.

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
- [x] Branch unito in `main` dopo la suite completa (199/199).

**Priorità 3 — lato tavolo e Multiplayer** (branch `refactor/posti-al-tavolo`, unito in `main`)
- [x] Chi controlla un posto è un dato (`js/engine/tavolo.js`: 'persona',
      'ia', 'remoto'), non più dedotto da "player = persona, bot = IA". I
      nomi 'player'/'bot' restano: sono solo i nomi dei due posti.
- [x] L'IA gioca da entrambi i posti (`turnoIA(io)` in bot.js, parametro
      `io` in tutte le funzioni dell'IA, livello per posto in
      `gameState.livelloIA`). Guardrail `guardrail-ia-da-ogni-posto`.
- [x] Duello senza testa = IA contro IA (`--giocatore`, `--livello-giocatore`):
      prima base per il bilanciamento con dati veri (Priorità 4).
- [x] Migrati i ternari di stato `player ? ... : bot ...` sugli accessori di
      `Tavolo` (branch `refactor/accessori-tavolo-completi`). Restano soltanto
      i ternari di testo e UI che descrivono volutamente il punto di vista
      locale. Il guardrail dell'IA impedisce di reintrodurre selezioni di
      stato scritte a mano.
- [x] Multiplayer "a passo comune": i due client eseguono l'intera partita e
      si scambiano solo comandi e decisioni (niente più mosse raccontate né
      fotografie di stato). Ogni client chiama ancora "player" sé stesso: lo
      stato è SPECCHIATO. Passi, ciascuno verificabile da solo:
      - [x] A. Determinismo, senza cambiare nulla offline (impronta di 60
            partite IA contro IA uguale prima e dopo):
            `Casuale` (casualità di gioco con seme condiviso in Multiplayer,
            Math.random offline), `Tavolo.ordine()` al posto dei circa 170
            cicli "prima player, poi bot" (in Multiplayer: prima l'host),
            uid delle carte deterministici in Multiplayer.
      - [x] B. Azioni con il posto: evocare, settare, Magia Terreno, cambio
            Posizione, attaccare, fasi — una funzione sola per persona, IA e
            avversario remoto (`js/engine/comandi.js`; l'IA usa gli stessi
            comandi della persona, anche per lo scarto di fine turno).
      - [x] C. Duello gemello in Node (`tools/duello-gemello.js`, spec
            `duello-gemello`): due copie del motore sullo stesso orologio
            virtuale, latenza variabile, impronta intera confrontata prima di
            ogni comando. 240 partite su 8 coppie e 3 livelli allineate.
      - [x] D. Il protocollo (`js/engine/passo-comune.js`): comandi e
            decisioni (posizione nell'elenco dei candidati) in un'unica coda
            ordinata; un comando, mio o suo, solo a duello fermo; una scelta
            presa all'istante si applica a codice in corso finito e i timer
            delle regole aspettano le scelte aperte (`PassoComune.dopo`,
            `isBlockingModalOpen`), così cade nello stesso punto sui due
            client. `Decisioni.rispondeUnaPersona` dipende solo da chi
            controlla il posto (`Tavolo.giocaUnaPersona`), e le 63 scelte
            scritte `chi: 'player'` ora dicono il posto vero.
            Spento finché nessuno chiama `PassoComune.avvia`: offline
            l'impronta delle 60 partite è identica.
      - [x] E. Pagina (`js/multiplayer/mp-passo-comune.js`): scambio dei
            mazzi e del seme all'avvio (initGame aspetta il mazzo dell'altro,
            poi PassoComune.preparaDuello), invio a lotti (il relay scarta
            oltre 20 messaggi al secondo), numerazione e ripresa dopo una
            caduta di linea ('passo-riprendi'). Il server accetta 'mazzo',
            'passo', 'passo-riprendi'. A passo comune i messaggi vecchi
            tacciono (resta 'game-over' come rete di sicurezza sull'esito).
            Spec `multiplayer-passo-comune` (due pagine, relay vero, 6 turni,
            caduta di linea a metà), verificato al contrario.
      - [x] Server: Render lo ridistribuisce da solo col push su `main`
            (render.yaml non fissa un branch). Il client nuovo richiede che
            anche l'altro client e il relay parlino la versione 2 del passo
            comune; un abbinamento incompatibile si ferma con un errore
            esplicito invece di avviare due protocolli diversi.
      - [x] Suite completa 204/204, branch unito in `main` (0a21581).
      - [x] Rimozione del protocollo vecchio, branch
            `refactor/rimuovi-protocollo-multiplayer-vecchio` (2026-10-06):
            - [x] passo comune obbligatorio, handshake versione 2 ed errore
                  esplicito per client o relay incompatibili;
            - [x] `multiplayer.js` ridotto a connessione, abbandono,
                  riconnessione e rete di sicurezza `game-over`;
            - [x] rimossi dispatcher `applyRemote*`, 23 invii per singola
                  mossa, segnaposto, checksum/resync, fotografie di stato,
                  code `awaitRemote*` e API legacy del motore;
            - [x] migrati i test di connessione/abbandono e il test
                  end-to-end; gli scenari delle carte restano coperti dagli
                  spec di regola e dal duello gemello. Un nuovo guardrail
                  impedisce di reintrodurre il vecchio client;
            - [x] compilata l'APK di produzione beta.22 (`versionCode 22`);
                  `GAME_ACTION_KINDS` del relay ristretto a controllo lobby +
                  `mazzo`, `passo`, `passo-riprendi` e `game-over`, con
                  `server-anti-imbroglio` riallineato;
            - [x] suite completa 202/202 e merge in `main`, autorizzati
                  dall'utente e completati il 2026-10-06.
      Costo dichiarato: ogni client conosce mazzo e mano dell'avversario
      (non mostrati, ma in memoria).

**Priorità 4 — per il giocatore** (in parallelo)
- [x] Multiplayer a passo comune: `PassoComune.attendiDecisione` emette
      `attesa-decisione-remota` quando accoda una scelta dell'altro client e
      lo spegne appena la risposta viene consumata. `game-flow.js` riflette
      l'evento nell'indicatore vicino all'avatar avversario, senza polling;
      lo spec `multiplayer-attesa-remota` verifica coda, callback, pulizia e
      posizione desktop/mobile.
- [x] Service worker più leggero e verificato (vedi «Peso e velocità»).
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
- [x] Audit service worker (2026-10-06): `APP_SHELL` contiene 156 file
      unici, tutti esistenti, per 8.246.245 byte non compressi; nessuna
      immagine/audio/video pesante, soltanto le quattro icone dell'app.
      Campi, carte, ritratti, audio e video restano cache-on-demand. Il
      guardrail impedisce file mancanti, duplicati, media pesanti e una
      crescita oltre 12 MiB. Corretto anche il rischio di cache errata:
      risposte HTTP non valide non sostituiscono più copie buone e
      `cache.put` viene atteso sia per l'app shell sia per i media.

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
- [x] Multiplayer: `validateGameAction` accetta soltanto i sette tipi del
      protocollo corrente (lobby, mazzo, passo comune, ripresa, esito) e
      rifiuta tutte le mosse raccontate del client vecchio. Il server non
      conosce comunque il campo: per un arbitraggio competitivo servirebbe
      far girare il motore anche lato server, da valutare solo se si apre a
      sconosciuti. Render ridistribuisce il relay col push su `main`.

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
- [x] Note restanti: zero. Chiuse 192, 235 e 622 sul branch
      `refactor/chiudi-ultime-carte`, con guardrail dedicati.
- [ ] 6 PNG in `images/characters/avatarTrasparenza/` (e copie in `pedine/`) senza avatar corrispondente
      (Kaiba in Mantello Viola, soldato Grande Guerra, kaibaV2,
      setoKaiba_duelist Kingdom, setoKaiba_forbiddenMemories, yamiYugiV2):
      decidere se rimuoverli o dar loro un uso.
- [ ] Bilanciamento dei livelli di difficoltà con dati veri. Provato un giro
      (77 partite: giocatore scriptato semplice contro il bot): 0 vittorie
      ovunque, quindi inutile. Servirebbe un giocatore di riferimento più
      forte, che usi anche Magie e Trappole. AGGIORNAMENTO (Priorità 3): ora
      il duello senza testa è IA contro IA vera, in Node, circa 0,1 s a
      partita (`tools/duello-senza-testa.js --giocatore ... --livello-giocatore ...`):
      il giocatore di riferimento c'è, ed è l'IA stessa.

## Manutenzione

- [ ] Nuove funzioni in file piccoli e separati: `duelMonstersCore.html`,
      `game-flow.js` e `actions.js` sono molto grandi e con funzioni globali.
- [x] La lista di `<script>` non viene più mantenuta a mano nelle singole
      pagine: la fonte unica è `scripts/gruppi-script.js` e
      `scripts/sync-script-groups.js` riallinea gli HTML (controllo incluso
      nel pre-commit).

## Battle City

- [x] Pedine verificate: i 20 personaggi che possono comparire hanno il loro
      PNG col nome dell'avatar, nessun ripiego sulla pedina generica.
