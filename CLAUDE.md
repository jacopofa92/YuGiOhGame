# YuGiOhGame — contesto per Claude

Duello Yu-Gi-Oh completo in HTML/JS puro, **nessun build, nessun bundler,
nessun framework**: ogni pagina è un file `.html` apribile anche solo con
doppio click (`file://`), con `<script src="...">` in sequenza fissa.
Autore unico (Jacopo/jacopofa92), repo Git a un solo branch attivo (`main`).

**Rispondi sempre in italiano in chat** in questo progetto (preferenza
esplicita dell'utente, vale per ogni sessione).

## Avvio e test rapidi

- Il gioco stesso non ha comandi di build: si apre direttamente
  `duelMonstersCore.html` (o le altre pagine) nel browser.
- **"Duello Demo" (`duelMonstersCore.html`) è il banco di prova standard** per
  ogni modifica alla logica di duello — è dove va verificata a mano
  qualunque modifica prima di considerarla finita. Nota: il suo stato
  iniziale non rispecchia perfettamente un duello vero (vedi
  `js/engine/duel-sandbox.js`) — se un test lì fallisce in un modo strano,
  verifica prima che non sia un limite della sandbox stessa.
- `npm test` esegue la suite di regressione Playwright in `tests/`
  (36 spec ad oggi) — vedi `tests/README.md` per la struttura e come
  scriverne di nuove. Gira anche in CI (`.github/workflows/test.yml`) ad
  ogni push/PR su `main`.
- Multiplayer richiede `server/server.js` (Node nativo, nessuna
  dipendenza) — vedi `README.md` per come avviarlo.

## Struttura del codice

Mappa completa e ragionata in **`GUIDA_RIUTILIZZO.md`** (leggerla prima di
un refactor ampio) — riassunto:

```
js/engine/   motore: duel-engine.js, actions.js, game-flow.js,
             card-effects.js (registro per-carta), effect-templates.js
js/ai/       ai-controller.js (facciata) + ai-medium.js/ai-hard.js/ai-shared.js/bot.js
js/ui/       card-renderer.js, effects.js, duel-cinematics.js, icon-library.js...
js/data/     cards-data.generated.js (NON editare a mano, vedi sotto), cards-db.js, deck/personaggi,
             challenges-db.js (catalogo Sfide, vedi sfide.html)
js/challenges/  challenge-tracker.js — motore di tracking delle Sfide (recordProgress generico
                 type+match), aggancio da js/duel-session.js e js/engine/duel-engine.js
js/multiplayer/  network.js, mp-lobby.js, multiplayer.js (client WebSocket)
js/cloud/    cloud-sync.js + supabase-config.js (sync opzionale, disattivo se vuoto)
server/      server.js — relay WebSocket puro, nessuna logica di gioco lato server
tests/       suite di regressione versionata (Playwright) — vedi tests/README.md
```

**Dati carte**: `data/cards.json` è la fonte; `scripts/build-cards-data.js`
lo compila in `js/data/cards-data.generated.js`, che il gioco carica
davvero. Dopo ogni modifica a `cards.json` rilanciare
`node scripts/build-cards-data.js` — editare il file generato a mano si
perde al prossimo build.

## Convenzioni consolidate (dalle sessioni precedenti)

- **Copertura effetti**: l'obiettivo è ogni carta con l'effetto reale
  pienamente implementato, non solo il sottoinsieme facile/sicuro.
- **Lavoro sul backlog carte**: procedere senza fermarsi ripetutamente a
  chiedere "continuo?" tra una carta e l'altra — andare avanti finché non
  si è genuinamente bloccati.
- **Fonte di verità per un effetto carta**: [YGOPRODeck](https://ygoprodeck.com)
  come riferimento primario per testo/regole reali.
- **Trappole**: vanno sempre Set coperte prima di poter essere attivate —
  mai attivabili direttamente dalla mano.
- **Carte duplicate/imprecise** in `cards-db.js`/`cards.json`: si
  cancellano, non si segnalano soltanto.
- **Immagini carta**: sempre un ritaglio della sola illustrazione dentro
  la cornice CSS della carta — mai uno scan intero pre-renderizzato,
  anche quando disponibile.
- **Commenti nel codice**: generosi e orientati al PERCHÉ (vincoli
  nascosti, invarianti, bug specifici aggirati) — il codice deve restare
  editabile a mano, senza assistenza AI, da chi lo legge dopo. Non
  spiegare il COSA quando i nomi già lo dicono.
- **Bordo carta mobile "troppo spesso"**: quasi sempre un problema di
  rapporto arte/cornice, non della proprietà CSS `border` in sé.

## Stato dell'infrastruttura (audit di sessione, verificato con evidenze)

Fatto finora:
- ✅ Suite di test versionata (`tests/`, 15 spec, ora anche in CI).
- ✅ `try/catch` ai punti d'ingresso chiave (`handleCardClick`,
  `safeCallCardHandler`, listener globali `error`/`unhandledrejection`) —
  un bug in una singola carta non blocca più l'intero motore.
  `safeCallCardHandler` copre ormai OGNI chiamata a un handler per-carta
  in `duel-engine.js` (~30 punti: `activate`/`static` più tutti i trigger
  reattivi `onXXX` in `fireTrigger`/`firePhaseTrigger` e affini) — prima
  copriva solo `activate`/`static` (`resolveChain`/`recomputeStaticEffects`),
  lasciando `onFlip`/`onDestroy`/`onSummon`/ecc. capaci di risalire la
  pila e bloccare una Chain o una `resolveAttack` a metà.
- ✅ Escaping HTML (`escapeHtml()` in `game-flow.js`) per nome/effetto
  carta ovunque finiscano in `innerHTML` — le carte personalizzate
  (`crea-carta.html`) sono testo libero dell'utente, quindi un vettore
  XSS reale (rilevante anche in multiplayer).

Rischi noti, ancora aperti (deliberatamente non affrontati finora — bassa
priorità o richiedono un refactor ampio):
- `card-effects.js` è ~19.000 righe in un solo file (di gran lunga il più
  grande del progetto).
- Nessun modulo ES/bundler: `<script>` globali con ordine di carico
  fisso, la stessa lista di ~20-30 script è duplicata a mano in almeno
  4-8 pagine HTML (rischio di drift se una pagina viene aggiornata e le
  altre no). Il MARKUP della topbar (non la lista script in sé) è stato
  affrontato con lo stesso spirito — vedi `js/ui/topbar.js` più sotto.
- `gameState` è un "God Object" (100+ proprietà top-level, letto/scritto
  da oltre 1000 punti) — nessuna incapsulazione/validazione.
- `actions.js` e `game-flow.js` non usano il pattern IIFE (a differenza
  di `duel-engine.js`/`card-effects.js`): ogni funzione top-level lì è un
  vero global su `window`.
- Nessun linting/formatting configurato, nessun cache-busting sui tag
  `<script>`.
- 13 carte hanno ancora un `missingEffectNote` in `data/cards.json` — vedi
  la sezione dedicata subito sotto: 12 sono Categoria B, già implementate
  per intero (la nota è solo un promemoria di un limite strutturale già
  accettato altrove nel motore); resta 1 sola carta (id 630, Spirit Ryu)
  con un vero scostamento non corretto, deliberatamente e onestamente
  documentato.
- ✅ `declaredTargeting` (card-effects.js, vedi il commento sul campo in
  cima al file): nuovo campo dichiarativo generico che permette a una
  carta reattiva sulla Chain (es. Campo di Riryoku id 636) di sapere COSA
  sta per bersagliare l'attivazione in cima, PRIMA che si risolva
  davvero — il motore normalmente sceglie i bersagli dentro `activate()`,
  che gira DOPO che la finestra di risposta si è già aperta (ordine
  opposto al gioco reale). Oggi lo dichiarano solo le 14 carte
  effettivamente necessarie a Campo di Riryoku (636)/La Perla del Drago
  (652)/Scudo Magico Tipo-8 (689), non un audit dell'intero dataset —
  vedi il commento sul campo per la lista.
- ✅ `batchToken` opzionale su `ACTIONS.destroySpellTrap` (duel-engine.js,
  vedi il commento sulla funzione): collega tra loro più chiamate a
  `destroySpellTrap` che fanno parte della STESSA attivazione (es.
  Piumino delle Arpie id 291: un `destroySpellTrap` per carta in un
  `forEach`), così Trappola Fasulla (id 600, `redirectsTrapDestroyToSelf`)
  protegge OGNI Trappola del lotto, non solo la prima. Additivo/opzionale:
  ogni chiamante che non lo passa (la stragrande maggioranza) si comporta
  esattamente come prima.
- **`repeatableWhileContinuous: true`** (card-effects.js, già esistente
  prima di questa sessione — usato da Offerta Suprema id 559/Pietra del
  Potere Nero Pece id 751, ora anche da Drago Nero Pece id 404/Spada
  Sigillante di Orichalcos id 396): permette di ricliccare una carta
  Continua GIÀ scoperta in campo (zona 'st') per rilanciarne `activate()`
  da capo — la carta stessa distingue gli stati leggendo il proprio
  `ctx.card` (es. `equippedToOwner` impostato o no). **Prima di
  dichiarare "serve nuova infrastruttura" per una carta con un'abilità
  Ignition riattivabile mentre è già in campo (es. lo stacco volontario
  di un Mostro Union, o l'estensione di un Equip già agganciato),
  controllare se questo meccanismo già esistente basta** — copre più
  casi di quanto sembri a prima vista dal solo missingEffectNote. Per una
  durata "fino a fine turno avversario" abbinata (es. id 396), riusa lo
  stesso schema store-separato + scadenza in `changeTurn()` già rodato da
  Orgoth l'Implacabile (`orgothActiveUidsFor`/`orgothAtkDefBonus`, id
  395) — copiare quel pattern, non reinventarlo.
- ✅ **`redirectToBanishIfFlagged(owner, card)` (duel-engine.js, vedi il
  commento sulla funzione)**: nuovo flag PER-ISTANZA (`card.mustBanishOnLeavingField`,
  non per-definizione — il caso d'uso è "SOLO questa copia, perché
  Special Summonata da una carta specifica, deve finire bandita invece
  che nella sua destinazione normale", non "questo id ha sempre questo
  comportamento") consultato da un helper condiviso, chiamato da
  `destroyMonster`/`notifySacrificedForTribute` (duel-engine.js) e da
  ciascuno dei ~6 punti "a mano" di `resolveBattleDamage`
  (js/engine/actions.js, mai centralizzata per la distruzione in
  battaglia) — `returnMonsterToHand` ha invece un controllo dedicato
  (non passa mai dal Cimitero). Usato per la prima volta da Cerchio
  degli Inferi (id 498). **Chiariva l'analisi precedente su id 498/808**
  (che sembravano entrambi bloccati dalla stessa "rimozione
  decentralizzata"): id 498 chiedeva di REINDIRIZZARE una rimozione già
  in corso verso il Cimitero — soluzione "correggi SUBITO DOPO" (il
  chiamante ha già spostato la carta, il redirect la sposta di nuovo,
  nessuna intercettazione PRIMA della rimozione necessaria), quindi
  trattabile toccando solo i pochi punti che mandano un MOSTRO al
  Cimitero. id 808 sembrava strutturalmente diverso (deve IMPEDIRE un
  bando PRIMA che avvenga, non correggerlo dopo) — ma vedi il bullet su
  `blockBanishFromField` qui sotto: chiuso comunque nella stessa
  sessione, il vincolo reale ("finché scoperta sul Terreno") si è
  rivelato riguardare un numero di punti molto più piccolo del temuto.
- ✅ **`blockBanishFromField(ctx, card)` (card-effects.js, in cima al
  file): id 808 (Uovo Giurassico Miracoloso) chiuso**. La stima
  originale di "~28 chiamanti di ACTIONS.banish da controllare" contava
  OGNI bando del motore, ma il testo reale protegge SOLO "finché
  scoperta sul Terreno" — un bando dal Cimitero/mano/Deck resta sempre
  permesso. Filtrando per QUESTO, i punti da toccare erano solo 11 (10
  in card-effects.js + 1 in `getBanishFusableExtraDeckMonsters`,
  duel-engine.js) — un ordine di grandezza in meno. A differenza di
  `redirectToBanishIfFlagged` (che corregge DOPO), qui serve davvero
  intercettare PRIMA della rimozione dal Terreno: `def.cannotBeBanishedWhileOnField`
  (flag per-definizione, non per-istanza — a differenza di id 498 qui
  sopra, questa protezione è sempre vera per OGNI copia della carta, non
  solo per una Special Summonata in un modo specifico), controllato
  PRIMA di ogni `field[i] = null` che precede un `ctx.banish`/
  `ctx.banishTemporarily`. **Lezione per un futuro caso simile**: quando
  un conteggio "N chiamanti da toccare" sembra scoraggiante, verificare
  SEMPRE se il vincolo reale della carta è più stretto del generico "in
  ogni caso" (qui: solo dal Terreno) — il conteggio vero può essere
  molto più piccolo.
- ✅ **Destiny Board implementato (id 192 Santuario Oscuro, quasi
  chiusa — resta solo una SEMPLIFICAZIONE di nicchia documentata, vedi
  la tabella sotto)** — prima vera "nuova meccanica di vittoria
  alternativa" di questo motore, utile come riferimento se ne servisse
  un'altra in futuro. 5 carte nuove aggiunte al dataset (id 866 Destiny Board, id
  867-870 Spirit Message "I"/"N"/"A"/"L" — le ultime 3 clonano la
  registrazione di 867 tramite `cloneEffectOf`, meccanismo già esistente
  in card-effects.js, mai usato prima di questa sessione). Pattern
  usati, tutti già esistenti nel motore, nessuno inventato da zero:
  nuovo hook `onOpponentEndPhase` in `firePhaseTrigger` (duel-engine.js,
  gemello di `onOpponentStandbyPhase` già esistente, solo per la End
  Phase); vittoria automatica controllata in `checkGameOver()`
  (game-flow.js, `hasDestinyBoardComplete`), stesso schema di
  `hasExodiaAssembled`/`EXODIA_PIECE_IDS` per Exodia il Proibito — un
  controllo "clean" fuori dalla risoluzione di un singolo effetto, MAI
  dentro `endDuel()` direttamente da una carta. La Spirit Message
  Special Summonata da Santuario Oscuro non è un token separato: la
  STESSA carta viene mutata da Magia a Mostro (`card.type` riassegnato
  a runtime, con level/race/attribute/attack/defense aggiunti) — stesso
  stile di mutazione diretta già usato altrove nel motore per casi
  simili (es. `card.attack -= 500` permanente di Drago Berserk id 110).
  SEMPLIFICAZIONE dichiarata e documentata nella carta: quel Mostro non
  è "immune agli effetti Carta eccetto Destiny Board" (solo "non può
  essere bersaglio d'attacco") — quell'immunità sarebbe condizionata
  alla forma Mostro della carta, mentre i floodgate di immunità
  esistenti (`cannotBeTargetedByCardEffects` ecc.) sono flag fissi per
  definizione: estenderli avrebbe richiesto toccare il checkpoint di
  targeting condiviso usato da altre 3 carte, per un'interazione di
  nicchia (serve avere sia Destiny Board sia Santuario Oscuro scoperti
  insieme).
- ✅ **id 781 (Roc dalla Valle della Foschia) chiuso — generalizzato
  `ctx.discardChosenFromHand`**: l'hook `onSentToGraveyardFromHand` di
  781 esisteva già, ma scattava solo per gli scarti passati dai due
  helper condivisi (`discardRandomFromHand`/`discardChosenFromHand`), non
  per lo scarto-come-COSTO di un'ALTRA carta — 22 siti in
  `card-effects.js` facevano ancora `hand.splice(...)` +
  `graveyard.push(...)` a mano, bypassando l'hook. Migrati tutti e 22 a
  `ctx.discardChosenFromHand(owner, index)` (18 sostituzioni dirette + 1
  riscritto a loop, id 111 Anima del Berserker, che scarta l'intera mano
  in un colpo solo — non una singola sostituzione). In 2 di quei 22 siti
  (Genesi del Vampiro id 656, Scavo Fossile id 823) l'indice della carta
  da rianimare dal Cimitero era calcolato PRIMA dello scarto: ora il
  CANDIDATO si sceglie prima (per valore/Livello, come da testo) ma
  l'INDICE si ricalcola per `uid` DOPO lo scarto, così un'eventuale
  reazione che altera il Cimitero durante `discardChosenFromHand` (es.
  proprio 781 che si rimescola nel Deck) non lascia un indice invalido o
  spostato. **Lezione per un futuro caso simile**: quando una carta
  reagisce a "scartata dalla mano" ma sembra coprire solo un
  sottoinsieme dei casi reali, verificare SEMPRE se gli scarti-come-costo
  di ALTRE carte passano dallo stesso helper condiviso o da uno
  splice/push scritto a mano — è un pattern che si ripete ogni volta che
  si introduce un nuovo choke point generico dopo che il codice
  preesistente aveva già molte implementazioni dirette.
- ✅ **id 192 (Santuario Oscuro) chiuso per intero — nuovo
  `gameState.immuneToCardEffectsExceptDestinyBoardUids`**: mancava solo
  che il Mostro generato da Santuario Oscuro fosse "immune agli effetti
  Carta eccetto Destiny Board". Stesso schema PER-UID ricalcolato ad
  ogni render di `cannotBeAttackTargetUids` (già esistente per "non può
  essere bersaglio d'attacco" sulla stessa carta), ma consultato dal
  checkpoint di targeting condiviso (`declareCardEffectTarget`,
  duel-engine.js) invece che da `resolveAttack` — a differenza di
  `def.cannotBeTargetedByCardEffects` (fisso per DEFINIZIONE, es. i 3
  Dei Egizi), questo è per-ISTANZA: la stessa carta id 867-870 nella sua
  forma Magia normale (piazzata da Destiny Board senza Santuario Oscuro)
  resta bersagliabile come sempre. Chiude id 192 allo stesso identico
  standard già accettato per le altre 9 carte con una nota simile (vedi
  Categoria B qui sotto): copre il targeting via quel checkpoint
  condiviso, non ogni possibile effetto di massa non mirato (nessun
  checkpoint del genere esiste in questo motore).
- ✅ **id 396 (Spada Sigillante di Orichalcos) chiuso per intero — nuovo
  `findSpellTrapQuickEffectCandidates` + coppia di hook
  `canActivateAsQuickEffect`/`activateAsQuickEffect`**: mancava solo la
  terza clausola, un vero Effetto Veloce ("scarta 1 carta per
  distruggere 1 carta scoperta sul Terreno, una volta per turno")
  utilizzabile anche durante il turno avversario — prima genuinamente
  impossibile, perché questo motore apre una finestra di priorità SOLO
  in risposta a un'attivazione altrui già in corso (`openActivationWindow`)
  o a un trigger nominato (`onAttackDeclare`/`onOpponentSummon`/ecc.),
  MAI spontaneamente ad ogni cambio fase con "nessuno ha fatto nulla".
  Soluzione: `findSpellTrapQuickEffectCandidates` (duel-engine.js) è la
  gemella-per-zona-'st' di `findMonsterQuickEffectCandidates` già
  esistente per i mostri (stesso opt-in `def.canRespondAsQuickEffect`),
  aggiunta alla stessa lista di candidati di risposta dentro
  `openActivationWindow` — così id 396 (già scoperta in campo) può
  rispondere quando SI APRE una Chain per qualunque motivo, proprio
  o dell'avversario, coprendo il caso reale più comune di un Effetto
  Veloce. Poiché la carta ha GIÀ due abilità diverse dietro
  `canActivate`/`activate` (aggancio ed estensione), la terza usa una
  coppia di hook SEPARATA (`canActivateAsQuickEffect`/
  `activateAsQuickEffect`) invece di sovraccaricare la stessa coppia con
  un terzo comportamento nascosto dietro un flag di contesto — il
  dispatch in `resolveChain`/`openActivationWindow` è già generico per
  nome (`def[link.handlerName](link.ctx)`), quindi aggiungere un nuovo
  nome di hook è stato sufficiente, nessuna modifica al dispatcher
  stesso. **Riusabile per qualunque futura carta con lo stesso bisogno**
  (un Effetto Veloce distinto dalle altre abilità della stessa carta,
  attivabile in risposta a una Chain già aperta). SEMPLIFICAZIONE
  residua onesta, stesso standard delle altre chiusure di questa
  sessione: risponde solo quando la finestra è già aperta da
  un'attivazione altrui, non in ogni momento teorico del turno
  avversario in cui non succede nulla — quella richiederebbe una vera
  finestra di priorità ad OGNI cambio fase, toccando ogni singolo punto
  di transizione fase del motore, sproporzionato per questa carta.
  Verificato con un test di integrazione REALE attraverso
  `DuelEngine.activateCard` + `openActivationWindow` (non solo gli hook
  isolati), stesso pattern di `chain-resolution.spec.js`.
- ✅ **Audit di consistenza codice↔tracking (richiesto esplicitamente
  dall'utente dopo aver notato contraddizioni)**: `grep missingEffectNote
  data/cards.json` non è l'unica fonte di verità sulle carte con un
  comportamento diverso dal testo reale — un commento "SEMPLIFICAZIONE"
  in `card-effects.js` può descrivere un vero scostamento SENZA che la
  carta abbia mai avuto un `missingEffectNote` corrispondente in
  `cards.json` (es. id 459/128/267 sotto: il codice lo ammetteva
  onestamente da tempo, ma `cards.json` non lo tracciava — non erano
  contraddizioni introdotte in questa sessione, solo mai state
  sincronizzate). Un audit mirato (grep di frasi-segnale come "il testo
  reale è/richiede", "invece di", "non implementata", distinte dalle
  banali "sceglie da sola il bersaglio invece di un'interfaccia dedicata"
  già accettate ovunque) ha trovato 4 casi reali, di cui 3 chiusi e 1
  documentato onestamente come ancora aperto — vedi la tabella
  aggiornata subito sotto. **Lezione per una futura sessione**: quando i
  due si disallineano, il commento nel codice va sempre preso come
  fonte di verità più aggiornata (è lì che si scrive mentre si
  implementa/scopre il limite) — `cards.json` va allineato AD esso, non
  il contrario.
  - ✅ **id 459 (Ninja d'Assalto) chiuso**: era un effetto Ignition
    normale (solo propria Main Phase) invece del vero Effetto Veloce del
    testo. Bastava `canRespondAsQuickEffect: true` sulla registrazione
    già esistente — infrastruttura già pronta da PRIMA di questa
    sessione (`findMonsterQuickEffectCandidates`, la stessa già usata da
    Spadaccino Mistico LV6 id 865), zero lavoro nuovo su
    `duel-engine.js`. A differenza di id 396, questa carta ha UNA sola
    abilità: nessuna coppia di hook dedicata necessaria, stesso
    `canActivate`/`activate` per click manuale e risposta.
  - ✅ **id 128 (Buco Trappola senza Fondo) chiuso**: "distruggilo e
    bandiscilo" finiva solo nel Cimitero (mai bandito). Bastava
    impostare `card.mustBanishOnLeavingField = true` sul bersaglio
    PRIMA di `ctx.destroyMonster` — flag PER-ISTANZA già esistente
    (nato per Cerchio degli Inferi id 498 in questa stessa sessione,
    vedi sopra), che ridirige da sola la destinazione dopo la
    distruzione senza bypassare gli hook "quando questa carta viene
    distrutta". Il commento originale sosteneva "nessuna zona di bando
    separata per i mostri in questo motore" — falso: il motore bandisce
    mostri regolarmente (Buco Dimensionale id 201, Guerriero D.D. id
    179, ecc.), il commento era semplicemente obsoleto.
  - ✅ **id 267 (Gilford il Fulmine) chiuso**: Evocava con i 2 Tributi
    standard di un Livello 8 invece dei 3 richiesti dal testo reale
    della carta (non un floodgate di potenza come i 3 Dei Egizi, è
    testo letterale). Aggiunto `card.id === 267` alla stessa eccezione
    già esistente in `getTributesRequired` (cards-db.js) per gli Dei
    Egizi — una riga, stesso pattern.
  - ⏳ **id 630 (Spirit Ryu) — genuinamente ancora aperta, ORA
    documentata con un `missingEffectNote` (prima non lo era)**: è un
    effetto Ignition attivabile una volta in qualunque momento della
    propria Battle Phase invece che nel preciso istante in cui la carta
    dichiara un attacco, e il bonus dura fino a fine TURNO
    (`ctx.grantTemporaryAtkDefBonus`, l'unico store con quella scadenza
    in questo motore) invece che fino a fine Battle Phase. Correggerlo
    per intero servirebbe due pezzi di infrastruttura nuovi per una
    carta sola (un trigger "questa carta ha appena dichiarato un
    attacco" — oggi esiste solo la risposta del DIFENSORE,
    `onAttackDeclare`; e uno store di durata scaduto a fine Battle
    Phase, non fine turno) — stesso principio di sproporzione già
    accettato per id 396/id 192, lasciato volutamente così ma ORA
    tracciato in modo onesto invece che silenzioso.
- ✅ **`ctx.destroyTargetedMonster(targetOwner, targetIndex, options)`
  (duel-engine.js, ACTIONS, subito dopo `declareTarget`)**: risposta
  diretta alla domanda "devo aggiornare il checkpoint di targeting a
  mano per ogni carta nuova?" — combina `declareTarget(...)` +
  `destroyMonster(...)` in una sola chiamata per il caso più comune
  ("un effetto sceglie 1 mostro e lo distrugge"), tornando
  `{ allowed, targetOwner, targetIndex, card }` (`card` è il mostro
  EFFETTIVAMENTE distrutto, letto prima della rimozione — utile per il
  log anche dopo un redirect di Specchietto della Fata). Non rende il
  checkpoint automatico al 100% (capire se un effetto è "mirato" o "di
  massa" resta una scelta di chi scrive la carta, non deducibile dal
  solo `destroyMonster`), ma rende il percorso corretto quello più
  comodo da scrivere invece di uno a due passaggi facile da dimenticare
  o sbagliare nell'ordine — usarlo SEMPRE per una nuova carta con
  quell'esatto schema. Accompagnato da un test guardrail
  (`targeting-checkpoint-guardrail.spec.js`, analisi statica del
  sorgente, nessun duello coinvolto): non impedisce di dimenticarsi il
  checkpoint su una carta nuova (nessuna euristica testuale è
  abbastanza affidabile da distinguere "mirato" da "di massa" senza
  falsi positivi), ma impedisce una REGRESSIONE silenziosa — il numero
  di chiamate reali al checkpoint non deve mai scendere sotto una soglia
  nota, altrimenti vuol dire che una chiamata esistente è stata rimossa
  senza essere sostituita.
- ✅ **Cinematica di vittoria condivisa da OGNI condizione di vittoria
  istantanea/alternativa (`FX.playInstantWinCinematic`,
  `js/ui/effects.js` + `triggerInstantWin`, `game-flow.js`)**: stessa
  identica priorità già usata da `FX.playMonsterSummonEffect` per
  un'Evocazione di alto Livello — 1) filmato dedicato se esiste
  (`video/vittorie/<kind>.mp4`, via `VisualEffects.getVideoFor`, oggi la
  cartella `video/` non esiste ancora nel repository, quindi ricade
  sempre sul fallback), altrimenti 2) una sequenza CSS (bagliore dorato
  in successione sulle carte coinvolte, poi un flash + banner col testo
  della condizione a schermo intero). `endDuel()` scatta solo DOPO che
  la cinematica finisce, non prima — `gameState.instantWinCinematicPlaying`
  blocca chiamate rientranti a `checkGameOver()` (che `updateUI()`
  richiama molto spesso) mentre la cinematica gira, altrimenti
  ripartirebbe da capo ad ogni render. Nata per Exodia (5 pezzi in
  mano, `triggerExodiaWin`), generalizzata SUBITO dopo (nella stessa
  sessione, su richiesta esplicita dell'utente: "stessa cosa per altre
  eventuali vittorie istantanee") a Destiny Board (5 carte in zona
  Magia/Trappola, mostrata a schermo per ENTRAMBI i lati a differenza
  della mano — `triggerDestinyBoardWin`) ed Elefante Volante (nessun
  "insieme di pezzi", una singola carta — `triggerFlyingElephantWin`,
  `pieceElements` sempre vuoto). `findCardElementsByUid(containerId,
  uids)` è l'helper condiviso da tutti e 3 per trovare i DOM element
  delle carte coinvolte (per il giocatore umano: mano = `playerHand`,
  Terreno/Magia-Trappola = `playerFieldBoard`/`botFieldBoard` — la mano
  del bot non è mai mostrata a schermo, quindi resta sempre vuota per
  lui). **Una FUTURA vittoria istantanea deve solo chiamare
  `triggerInstantWin(kind, bannerText, logMessage, playerWon,
  pieceElements)` da `checkGameOver()`** — non reinventare guardrail/
  cinematica/log/endDuel da capo, né copiare una funzione trigger*Win
  intera: sono già tutte una chiamata sola a `triggerInstantWin`.
- ✅ **Topbar condivisa (`js/ui/topbar.js` + `js/ui/topbar.css`)**:
  mitiga (SOLO per la topbar, non per l'intera lista `<script>` — quel
  rischio più ampio resta aperto, vedi sotto) il rischio di drift tra
  pagine duplicate a mano documentato più sotto in questo file. Un
  audit ha trovato lo stesso blocco `.topbar`/`.back-btn`/`.topbar-title`
  (pulsante Indietro + titolo) copiato quasi identico in 11 pagine, con
  derive già in corso (z-index diverso tra cartoteca.html/
  creazione-deck.html, `letter-spacing`/`font-size` leggermente diversi
  qua e là, breakpoint mobile ASSENTI DEL TUTTO in duello-sandbox.html —
  bug reale, corretto passando al componente condiviso). Migrate tutte
  e 11: `PageTopbar.render('#topbarMount', { icon, title, subtitle?,
  backHref?, onBack? })` sostituisce il markup scritto a mano, torna
  l'elemento `.topbar` creato per chi ha bisogno di aggiungerci
  qualcosa in più (`.appendChild(...)` — usato da creazione-deck.html
  per il badge "N/30 Deck" e cartoteca.html per "N carte"). Due pagine
  avevano un vincolo REALE non rimovibile, preservato con un override
  minimo mirato invece di forzare il valore canonico: creazione-deck.html
  (`z-index: 40`, perché `.editor-header` è una seconda barra sticky
  appena sotto che deve restarci sotto) e multiplayer.html
  (`position: relative` invece di `sticky`, perché sotto viene iniettata
  l'intera arena di duello con una propria gestione dello scroll). La
  Cartoteca aveva anche una legenda orfana ("⛔ effetto non
  implementato · 🟡 effetto implementato parzialmente") dimenticata
  dalla rimozione dei badge di sviluppo in una sessione precedente —
  ripulita qui.
- ✅ **Continuità musicale tra pagine, bug reale trovato e chiuso
  (`js/audio/audio-manager.js`)**: la musica sembrava "fermarsi e
  riprendere in ritardo" ad ogni cambio pagina, a volte "ripartire da
  capo" anche con la stessa traccia — non un problema di logica (il
  meccanismo di continuità, posizione+traccia salvate in
  `sessionStorage` e ripristinate al `canplay`, era già corretto), ma
  l'**autoplay bloccato dal browser su `file://`** ad ogni nuovo
  caricamento di pagina: `tryPlay()` andava già in `catch` e provava a
  mostrare un hint (`showHint()`), ma **`#musicHint` non esisteva in
  NESSUNA pagina del progetto** — l'elemento non è mai stato costruito
  nel markup, quindi l'utente non vedeva alcun segnale, e la musica
  ripartiva solo al PROSSIMO click a caso su un elemento qualsiasi
  (spesso il click che porta via dalla pagina, in un ciclo che sembra
  "non riprendere mai"). Corretto creando `#musicHint` dinamicamente da
  `initAudioManager()` (stesso schema già usato per `<audio
  id="bgMusicAudio">`: nessuna pagina deve costruirselo da sé) — resta
  visibile finché l'utente non interagisce davvero (non un timeout
  fisso che sparirebbe comunque), poi si nasconde subito quando
  `audio.play()` va a buon fine. Verificato empiricamente con
  Playwright: dopo un click su una pagina precedente e la navigazione a
  `duelMonstersCore.html` con la stessa traccia forzata via
  `?music=...`, `currentTime` riprende correttamente dal punto lasciato
  (non da 0) non appena l'utente clicca di nuovo. Aggiunta anche, nella
  stessa funzione, la regola CSS nativa `@view-transition { navigation:
  auto; }` (Chrome/Edge 126+, "Cross-Document View Transitions") per
  ammorbidire il passaggio "brusco" tra una pagina e l'altra — puro CSS
  ignorato senza rischi sui browser che non la conoscono, **niente
  intercettazione di click**: funziona automaticamente sia per un click
  su un `<a href>` sia per un `location.href = ...` impostato da JS
  (usato ovunque nel progetto), senza toccare nessuno degli
  onclick/handler di navigazione già esistenti (`topbar.js`,
  `handleBackClick` di duello-libero.html, ecc.) — un'alternativa
  deliberatamente più sicura a un'intercettazione manuale dei click,
  che avrebbe richiesto toccare ogni punto di navigazione del progetto
  con un rischio di regressione reale.
  **Vicolo cieco verificato e scartato, per non riprovarci in una
  sessione futura**: un trucco "avvia l'audio muto (sempre permesso dal
  browser), poi togli il muto via script senza alcun gesto dell'utente"
  sembrava funzionare nei test — ma solo perché `page.evaluate()` di
  Playwright concede LUI STESSO un gesto implicito a qualunque `play()`
  invocata al suo interno (confermato: perfino un `play()` NON muto,
  senza alcun trucco, riusciva se chiamato da dentro `page.evaluate()`
  — un artefatto del test, non il comportamento reale). Con l'audio
  creato ed eseguito dal normale script della pagina (nessun
  `evaluate()` di mezzo, lo stesso percorso di un utente vero), perfino
  l'autoplay MUTO viene rifiutato su `file://` senza un gesto reale.
  **Non esiste un modo lato client per aggirare l'autoplay bloccato dal
  browser quando manca un vero gesto dell'utente su quella pagina — è
  una policy di sicurezza deliberata, non un bug risolvibile in JS.**
  L'unica cosa realistica resta reagire il più presto possibile al
  PRIMO gesto vero (click, tocco, tasto, persino uno scroll — tutti e 4
  ascoltati in `tryPlay()`), così nella normale navigazione la musica
  riprende nello stesso istante in cui l'utente clicca quello che è
  venuto a fare, senza una vera "azione di sblocco" percepita a parte.
  **Lezione di metodo per testare `audio.play()`/autoplay con
  Playwright in futuro**: mai fidarsi di un test che chiama `play()`
  direttamente dentro `page.evaluate()` — verificare SEMPRE lasciando
  che sia lo script della PAGINA STESSA (quello che gira naturalmente
  al caricamento, non un comando iniettato da Playwright) a chiamarlo.
- ✅ **Profilo e Duello Libero fusi dentro `index.html` come viste SPA**
  (richiesta esplicita dell'utente, con scope ridotto in corsa da "tutte
  le pagine menu" a solo queste 2 — le altre 8 pagine menu, Negozio/
  Impostazioni/Regole/Tornei/Crea Carta/Multiplayer/Creazione Deck/
  Cartoteca, restano pagine `.html` separate come prima, INVARIATE):
  stesso identico problema di fondo dei fix audio/transizione qui sopra
  (musica che si interrompe, transizione brusca) ma risolto alla radice
  per queste 2 sole pagine invece che mitigato — restando DENTRO lo
  stesso documento non c'è alcuna vera navigazione, quindi nessuna
  musica da far ripartire. Router SPA generico e riusabile (non
  hardcoded per queste 2 viste): `registerView(name, initFn)` +
  `showView(name)` + `hideAllShells()` + `showMenuFromView()`, in un
  proprio `<script>` posizionato SUBITO dopo `#menuToast`, PRIMA del
  markup di ogni vista fusa — **deliberatamente PRIMA e non insieme al
  resto della logica menu/gate (che sta molto più in basso nel file):
  lo `<script>` di ogni vista chiama `registerView(...)` al proprio
  caricamento (l'ordine dei tag `<script>` in una pagina HTML è
  sequenziale), quindi la funzione `registerView` deve già esistere
  quando l'HTML della vista viene parsato — bug reale trovato e corretto
  in questa stessa sessione, prima che il router finisse in fondo al
  file insieme al resto: `registerView is not defined`.** Ogni vista
  fusa è un `<div class="app-view" id="view-<nome>">` nascosto di
  default (`display:none`), con CSS isolata via `@scope (#view-<nome>)
  { :scope { ... } ... }` (il selettore `:scope` dentro il blocco
  sostituisce sia il vecchio `body`/`body::before` della pagina
  originale sia `:root` per le variabili CSS SOLO di quella vista — es.
  `--cube-w` ha un valore diverso in Profilo, 150px, e in Duello Libero,
  190px: se fosse rimasta su `:root` globale le due viste si
  sovrascriverebbero a vicenda; `--gold`/`--gold-strong`, uguali
  ovunque, sono invece SOLO globali in `:root`, non ripetute in ogni
  vista) — supportato nella versione Chromium/Edge imbarcata da
  Playwright in questa sessione (151.0.7922.34), quindi le regole CSS
  originali di ogni pagina sono state incollate quasi pari pari, senza
  riscrivere ogni selettore a mano. Ogni id della pagina originale è
  stato prefissato (`profilo-`/`libero-`) per non collidere con gli
  stessi id di un'altra vista fusa o del menu — fatto con uno script
  PowerShell usa-e-getta (sostituzioni mirate su una lista nota di id,
  non un regex globale alla cieca) invece che a mano: **quello script
  però NON copre ogni forma in cui un id può comparire in JS** — ha
  mancato 3 casi reali in questa sessione, tutti corretti a mano dopo un
  controllo mirato: un confronto diretto di stringa
  (`event.target.id === 'diffModal'`, non un `getElementById`), un id
  passato come primo argomento posizionale a una funzione invece che
  scritto come stringa letterale al punto d'uso (`PageTopbar.render('#topbarMount', ...)`),
  e un id passato per NOME a una funzione wrapper che lo passa a sua
  volta a `getElementById` (`getRandomOption('fieldSelect')` dentro
  Duello Libero) — **per una futura vista fusa, dopo lo script di
  prefissazione automatica, cercare ESPLICITAMENTE anche questi 3
  pattern a mano, il regex meccanico non li vede.** Inizializzazione
  LAZY per ogni vista (`VIEW_INITIALIZERS`/`viewsAlreadyInitialized`):
  lo script di una vista non gira al caricamento di `index.html`, solo
  alla PRIMA volta che viene mostrata, e lo stato resta intatto (filtri,
  nome inserito, ecc.) tornando al menu e rientrando. **Bug reale
  trovato e corretto**: `showMenuFromView()` inizialmente chiamava solo
  `showMenu()` (che mostra `#menuShell` ma non nasconde le `.app-view`
  già visibili) invece di `hideAllShells()` + `showMenu()` — il sintomo
  sarebbe stato la vista appena lasciata ancora visibile SOTTO il menu
  al ritorno. Il pulsante "Sfida un Duellante" nella vista Profilo (che
  nella pagina originale navigava a `duello-libero.html`) ora chiama
  `showView('duello-libero')` invece di navigare — stesso principio,
  applicare la stessa conversione ad ogni link che colleghi due viste
  ORA entrambe fuse, non solo agli `href` verso pagine ancora esterne.
  **La pagina standalone `duello-libero.html` (a differenza di
  `profilo.html`, ormai raggiungibile solo aprendola a mano) NON è
  stata rimossa e NON va rimossa**: resta il bersaglio hardcoded reale
  di `DuelSession.RETURN_URLS.free`/`.story` in `js/duel-session.js` —
  dove porta il pulsante "Continua" a fine Duello Libero — quindi la
  vista fusa è un SECONDO modo di raggiungere la stessa schermata (dal
  menu), non un sostituto. Verificato con Playwright (non solo lettura
  del codice): caricamento pulito di `index.html` senza errori,
  Profilo (dati/deck/record renderizzati, salvataggio nome, back button,
  stato preservato tra visite), Duello Libero (35 personaggi
  renderizzati, apertura modale difficoltà, costruzione URL verso
  `duelMonstersCore.html` con campo/musica/personaggio/difficoltà
  corretti, confronto diretto delle richieste di rete fallite contro la
  pagina standalone per escludere regressioni — risultato identico, 1
  sola immagine personaggio mancante in entrambe, preesistente). Suite
  Playwright del motore 35/35 verde (invariata, incluso
  `duello-libero-smoke.spec.js`, che testa `duelMonstersCore.html`
  direttamente via query string e non è quindi toccato da questa fusione).
- ✅ **Sistema "Sfide" (`sfide.html`) — nuova pagina, richiesta esplicita
  dell'utente, con un primo catalogo di 14 sfide già pronte** (id/testo in
  `js/data/challenges-db.js`): sconfiggi un personaggio N volte (Yugi,
  Kaiba, Pegasus, Marik), evoca una carta specifica N volte (Drago Bianco
  Occhi Blu, Mago Nero, Drago Nero Occhi Rossi, Testa Proibita, Jinzo,
  Kuriboh, Slifer), 3 traguardi di vittorie totali (1/10/50). Ogni sfida
  ha già un campo `reward` (sempre `null` per ora) — segnaposto per un
  sistema di ricompense futuro esplicitamente richiesto ma non ancora
  implementato, così una sfida futura non richiederà una migrazione dati.
  Architettura a 3 pezzi generici (nessuna funzione dedicata per singola
  sfida):
  - `js/challenges/challenge-tracker.js`: `ChallengeTracker.recordProgress(type, params)`
    fa il matching contro `challenges-db.js` (campo `match`) e incrementa
    `SaveManager.getChallengeProgress/setChallengeProgress` (nuovo campo
    `save.challenges`, stesso schema backfill retrocompatibile già usato
    per `currency`/`ownedPacks` — vedi `load()`/`createNew()`/
    `applyExternalSave()` in `js/save-manager.js`). Una FUTURA sfida con
    un `type` già esistente non richiede alcuna modifica al tracker, solo
    una nuova voce nel catalogo.
  - `js/ui/challenge-banner.js` + `.css`: banner "🏆 Sfida completata!" in
    alto a destra (verificato con screenshot Playwright: nessuna
    sovrapposizione con LP/topbar), in coda se più sfide si completano di
    seguito. Mostrato SUBITO se la pagina corrente lo ha caricato,
    altrimenti accodato in `sessionStorage`
    (`ChallengeTracker.drainPendingBanners()`) perché la PROSSIMA pagina
    con il banner caricato lo mostri al proprio avvio — generico apposta,
    per un futuro hook su una pagina diversa da `duelMonstersCore.html`.
  - Due punti di aggancio nel motore, individuati passando dal punto
    centralizzato ESISTENTE invece di duplicare la logica: `DuelSession.finish()`
    in `js/duel-session.js` (dopo `recordCharacterResult`, solo se
    `playerWon === true` e `session.opponent.id` esiste — mai per il Bot
    generico del Duello Demo, mai per un Pareggio) per
    `defeatCharacter`/`winDuels`; il dispatcher condiviso
    `ON_NORMAL_SUMMON`/`ON_SPECIAL_SUMMON` dentro `fireTrigger()` in
    `js/engine/duel-engine.js` (stesso punto già usato da
    `reactToAnyNormalOrFlipSummon`/`reactToAnySpecialSummon`) per
    `summonMonster`, filtrato a `ctx.owner === 'player'` (mai il bot) e
    con `ctx.summonedCard.id !== -1` (mai un Token). Verificato con un
    vero test di regressione
    (`tests/specs/challenge-tracker-hooks.spec.js`, tramite
    `ctx.specialSummon(...)`, non un `fireTrigger` sintetico — quello
    romperebbe `reactToAnyNormalOrFlipSummon`, che si aspetta la carta
    già davvero piazzata sul Terreno) che un'Evocazione del giocatore fa
    avanzare la sfida, quella del bot no, un Token non lancia eccezioni.
  `duelMonstersCore.html` è l'unica pagina che carica tutti e 3 i pezzi
  oggi (dove succedono gli eventi reali); `sfide.html` carica
  catalogo+tracker (per leggere il progresso) e banner (per coerenza
  futura, anche se oggi nessun evento può scattare mentre ci si è sopra).
  `sw.js` aggiornato (bump a v4) con tutti i file nuovi.
- ✅ **Due bug reali segnalati dall'utente subito dopo il giro precedente,
  entrambi corretti**:
  - **"Non c'è più la musica" — regressione reale della sessione
    precedente**: rimuovere il prompt "tocca per riprendere" assumeva che
    l'utente arrivasse SEMPRE a `duelMonstersCore.html` dopo aver già
    cliccato qualcosa altrove (es. il gate di `index.html`) nella stessa
    sessione di navigazione — ma "Duello Demo" (`duelMonstersCore.html`)
    è il **banco di prova standard di questo stesso progetto** (vedi in
    cima a questo file) e si apre spesso DIRETTAMENTE, come primissima
    pagina della sessione, SENZA alcun click pregresso — e il ciclo
    naturale della demo gioca da solo (bot/pescate automatiche) senza
    richiedere click per un bel po'. In quel caso l'autoplay resta
    bloccato dal browser e, avendo tolto ogni segnale visibile, l'utente
    restava con silenzio totale senza sapere perché. **Riprodotto e
    verificato con Playwright** (apertura diretta, nessun click, 2s di
    attesa: `audio.paused === true`). Corretto con un pulsantino "🔈"
    minimo (`ensureFallbackButton()` in `js/audio/audio-manager.js`) che
    appare SOLO quando l'autoplay è davvero bloccato (mai altrimenti) e
    sparisce non appena la musica riparte — piccolo, in un angolo, senza
    testo: non è una regressione della richiesta precedente
    dell'utente (quella contestava un BANNER A PIENA LARGHEZZA con
    scritto "tocca per riprendere" sempre visibile, non l'idea di un
    recupero visibile in sé). **Lezione per una futura sessione**: quando
    si assume che "l'utente ha sempre già interagito prima" per
    giustificare la rimozione di un fallback visibile, verificare quella
    assunzione contro il FLUSSO DI TEST/USO REALE del progetto (qui
    documentato esplicitamente in cima a questo file), non solo contro il
    flusso "ideale" attraverso il menu — i due possono divergere, e la
    sessione precedente aveva verificato solo il secondo.
  - **Testo "Carta coperta" (e nomi carta) visibile per una frazione di
    secondo sulle carte, specialmente ai cambi fase — bug preesistente,
    non introdotto in questa sessione, ma segnalato ora**: `renderFields()`
    (`js/engine/game-flow.js`) ricostruisce l'INTERO Terreno da zero ad
    ogni `updateUI()` (quindi anche solo a un cambio fase), quindi ogni
    `<img>` di ogni carta viene ricreata e forza il browser a
    ridecodificarla — nella breve finestra prima che l'immagine sia
    pronta, un `alt` non vuoto può essere dipinto sopra la cornice CSS già
    visibile sotto. Corretto impostando `alt=""` (immagine dichiaratamente
    decorativa: il nome/stato è già leggibile nella cornice CSS stessa)
    su tutte e 4 le `<img>` di `js/ui/card-renderer.js`
    (`applyCardBackVisual`/l'illustrazione `artOnly`/lo scan intero/la
    pila del Deck) — i browser non dipingono mai testo per un'immagine con
    `alt=""`, né in caricamento né in errore. **Non risolve la causa di
    fondo (il re-render completo del Terreno ad ogni `updateUI()`, invece
    di un aggiornamento incrementale/diffing) — quella resta un limite
    architetturale più ampio, sproporzionato da affrontare per questo
    sintomo specifico**, ma elimina il sintomo visibile segnalato.
- ✅ **"Ancora non va" — il fix precedente sulla musica non bastava,
  chiuso per davvero**: il pulsantino di recupero da solo non bastava
  perché il SIPARIO dell'intro (`js/ui/duel-cinematics.js`) continuava ad
  aprirsi a un tempo fisso indipendentemente da se la musica stesse
  DAVVERO suonando — `audioIsReady()` controllava solo
  `audio.readyState >= 3` (abbastanza bufferizzata per un play()
  affidabile SE permesso), non `!audio.paused` (sta REALMENTE suonando):
  se l'autoplay restava bloccato (nessun gesto pregresso — il caso comune
  aprendo "Duello Demo" direttamente), readyState arrivava comunque a 4 e
  il sipario si apriva su un campo già muto, esattamente la richiesta
  esplicita dell'utente violata ("non voglio che l'audio non si sia
  ancora caricato quando ho iniziato a giocare"). Corretto in due parti:
  1) `audioIsReady()` ora controlla `!audio.paused` (riproduzione vera),
     non solo il buffer — il sipario aspetta la musica REALE, col tetto
     di sicurezza (`AUDIO_READY_SAFETY_MS`, 6s) invariato a garantire che
     non resti bloccato per sempre se l'utente non interagisce affatto.
  2) Nuovo `DuelMusic.ensurePlaying()` (`js/audio/audio-manager.js`,
     idempotente — chiamarla a riproduzione già in corso non fa nulla) e
     `attemptPlay()`/`onPlayBlocked()` estratti da `tryPlay()` per essere
     riusabili da un chiamante ESPLICITO, non solo dai listener generici
     `pointerdown`/`keydown`/... su `document` (più fragili: un gestore
     di un'altra carta/elemento potrebbe fermare la propagazione
     dell'evento prima che arrivi lì — pattern comune in questo motore).
     Il click sull'overlay dell'intro (skip, "Clicca per saltare" —
     SEMPRE visibile) ora chiama `DuelMusic.ensurePlaying()` PRIMA di
     alzare il sipario: un gesto reale di cui la cinematica ha già
     certezza diretta, non un'inferenza indiretta. **Verificato con
     Playwright su 3 scenari distinti** (mai assunti, sempre misurati):
     nessun click → sipario aperto dopo ~7.1s (teatrale 2.9s + tetto di
     sicurezza), musica ancora bloccata (limite di policy del browser
     genuinamente invalicabile, non un bug); click sull'overlay durante
     l'intro → sipario aperto quasi subito E musica confermata in
     riproduzione (`paused:false`); click sul pulsantino "🔈" durante
     l'intro → musica parte, il poll di `attemptRaiseCurtain` lo rileva
     al giro successivo e il sipario si apre. Suite motore 36/36 verde
     (invariata — `tests/helpers/harness.js#openDuel` clicca già
     `.di-skip` appena disponibile, stesso percorso "immediato" dello
     scenario 2, quindi nessun test ora aspetta i 6s del tetto di
     sicurezza). **Lezione per una futura sessione**: quando un
     `readyState`/segnale di "pronto" non implica anche "sta davvero
     succedendo" (qui: bufferizzato ≠ in riproduzione, per via
     dell'autoplay bloccato), un gating basato solo sul primo porta
     esattamente allo stesso sintomo che doveva prevenire — verificare
     sempre lo stato REALE (`!audio.paused`), non un proxy indiretto.
- ✅ **"Non va ancora l'audio" — causa REALE trovata e chiusa (non solo
  un altro sintomo mascherato)**: i due fix precedenti (pulsantino di
  recupero, sipario che aspetta la riproduzione vera) erano corretti ma
  insufficienti, perché il listener di fallback che dovevano attivare
  non scattava MAI per le due interazioni più comuni di un vero duello.
  `startHandCardDrag` (`js/engine/actions.js:161-168`, trascinare una
  carta dalla mano) e `startAttackDrag` (`js/engine/game-flow.js:1500-1502`,
  trascinare un mostro per attaccare) chiamano ENTRAMBE
  `event.stopPropagation()` proprio sull'evento `pointerdown` (per
  impedire che un secondo evento `click` sintetico duplichi l'azione su
  mobile — motivo legittimo, codice preesistente non toccato). Il
  fallback di `js/audio/audio-manager.js` ascoltava `pointerdown` su
  `document` in fase di BUBBLE (il default): quello `stopPropagation()`
  lo fermava PRIMA che risalisse fin lì, quindi le due azioni più
  naturali con cui un giocatore comincia a interagire con un duello
  reale non sbloccavano mai l'audio — anche dopo diversi click veri
  sulle carte, la musica restava muta. **Perché non emerso nei test
  precedenti**: ogni test Playwright di questa sessione cliccava sempre
  altrove (il pulsante skip dell'intro, il pulsantino di recupero), mai
  su una VERA carta — il percorso rotto non è mai stato esercitato fino
  a un test mirato scritto apposta dopo il terzo "non va ancora"
  dell'utente. Corretto passando i 4 listener di fallback
  (`pointerdown`/`keydown`/`wheel`/`touchstart`) alla fase di CAPTURE
  (`{ once: true, passive: true, capture: true }`) invece che bubble: la
  fase di capture scorre da `document` VERSO il bersaglio, PRIMA che
  l'evento arrivi lì — nessuno `stopPropagation()` a valle (chiamato
  durante bubble, dopo) può più fermarla in anticipo. **Verificato con
  Playwright usando `page.mouse.down()`/`move()`/`up()` (input reali,
  trusted — non un `dispatchEvent()` sintetico, che l'autoplay policy
  del browser ignorerebbe comunque)** su ENTRAMBE le interazioni prima
  rotte: trascinare una carta dalla mano e trascinare un mostro per
  attaccare, in entrambi i casi partendo da un duello aperto
  direttamente senza alcun click pregresso (`audio.paused` passa da
  `true` a `false` dopo il trascinamento). Suite motore 36/36 verde
  (invariata). **Lezione di metodo per una futura sessione**: quando un
  fallback "al primo gesto dell'utente" continua a non scattare
  nonostante la logica sembri corretta, sospettare SEMPRE
  `event.stopPropagation()` da qualche parte nella catena DOM tra il
  bersaglio reale del click e `document` — specialmente in un motore con
  drag-and-drop (frequente qui: card-effects/game-flow usano
  `stopPropagation()` di proposito in più punti) — e verificare con un
  gesto VERO sul bersaglio REALE che l'utente userebbe per primo (qui:
  una carta, non un bottone di comodo), non solo su un elemento
  qualunque che capita a portata di mano nel test.
- ✅ **"Ancora niente" (4° giro) — RIPULITO, tornato semplice su
  richiesta esplicita e diretta dell'utente**: dopo tre correzioni
  successive (pulsantino di recupero, sipario che aspetta la
  riproduzione vera con tetto di sicurezza, fix capture-phase) l'utente
  ha segnalato che la musica era di nuovo del tutto assente (incluso
  `mainTheme.mp3` sulle pagine menu) e ha rifiutato ESPLICITAMENTE
  qualunque forma di attesa legata all'audio prima di entrare nel
  duello ("non bloccare il loading... neanche mettere attesa musica...
  è orrendo... risolvi le schifezze"). Non è stato possibile riprodurre
  "mainTheme assente" con Playwright (un click vero sul gate lo fa
  partire correttamente anche dopo ogni fix precedente) — resta
  un'incognita se fosse uno stato/cache del browser reale dell'utente o
  un effetto collaterale non riprodotto della complessità accumulata.
  Data l'impossibilità di isolare la causa e la richiesta esplicita di
  smettere di aggiungere logica, la risposta corretta non era un quinto
  fix ma una **rimozione netta di tutto ciò che non era strettamente
  necessario**: tolti integralmente da `js/ui/duel-cinematics.js` il
  gating `audioIsReady`/`attemptRaiseCurtain`/`AUDIO_READY_SAFETY_MS`
  (il sipario torna a un `setTimeout(raiseCurtain, INTRO_SHOW_MS)`
  fisso, IDENTICO all'originale, mai più legato allo stato dell'audio)
  e la relativa classe CSS `.di-loading-pending` in
  `js/ui/duel-cinematics.css`; tolti da `js/audio/audio-manager.js` la
  dissolvenza di volume (`fadeInToTargetVolume`/`targetVolume`, tornato
  un `audio.volume = volume` diretto come in origine), il pulsantino
  "🔈" (`ensureFallbackButton`/`hideFallbackButton`), e lo strato
  `attemptPlay`/`onPlayBlocked`/`playAttemptInFlight`/
  `DuelMusic.ensurePlaying` (tornato un semplice `tryPlay()` con un solo
  `.catch()`). **L'UNICA parte mantenuta dei giri precedenti**: i
  listener di fallback dentro `tryPlay()` restano in fase CAPTURE
  (`{ once: true, passive: true, capture: true }`) — quello era un bug
  REALE e verificato (vedi il bullet sopra), non un ornamento, e
  toglierlo avrebbe reintrodotto il problema originale di
  `stopPropagation()` sulle carte. Nessuna UI visibile, nessuna attesa,
  nessuna dissolvenza: la pagina si comporta di nuovo esattamente come
  "all'inizio" (parole dell'utente) più quel singolo fix silenzioso.
  Verificato di nuovo con Playwright: `mainTheme.mp3` parte con un click
  vero sul gate (volume pieno immediato, nessun ritardo), il sipario del
  duello si apre sempre a tempo fisso (~2.9s, mai oltre, testato fino a
  ~3.9s totali dal `goto()` includendo il boot del motore), il
  trascinamento di una carta dalla mano sblocca ancora l'audio se
  bloccato. Suite motore 36/36 verde. **Lezione per una futura
  sessione, la più importante di questo intero filone**: di fronte a
  correzioni ripetute che il committente continua a respingere, la
  mossa giusta NON è un ennesimo livello di logica difensiva aggiunta
  sopra al precedente (rischia di introdurre esattamente i bug
  imprevedibili che l'utente ha poi segnalato) — è FERMARSI, chiedersi
  onestamente se la complessità accumulata sia essa stessa il problema,
  e se il committente lo chiede esplicitamente, RIMUOVERE fino al punto
  più semplice che soddisfa ancora il requisito verificato più solido
  (qui: il fix capture-phase, l'unico con una riproduzione concreta e
  ripetibile di un bug reale), scartando ogni raffinamento speculativo
  costruito sopra ipotesi mai confermate (il gating sul readyState, la
  dissolvenza, il tetto di sicurezza).
- ✅ **Torneo "Regno dei Duellanti" (`torneo-regno-duellanti.html`),
  ora completo fino al Campione: mappa a bivi + Castello di Pegasus
  (semifinale/finale/Pegasus).** Il seguito DENTRO il castello (chiuso
  in una seconda sessione, dopo la prima che si era fermata
  deliberatamente a "sei entrato nel Castello") è un vero tabellone a
  eliminazione diretta: 3 Duellanti del roster (mai Kaiba, già
  affrontato a parte al Cancello) sorteggiati come altri finalisti;
  semifinale contro uno di loro (+10-15 Stelle a caso se vinta), finale
  contro un altro dei due rimanenti (stesso premio), poi Pegasus in
  persona (+15 Stelle fisse, stato "campione" — una schermata di
  vittoria stub, il premio finale vero resta da decidere). A
  differenza della mappa aperta (puntata di Stelle, si può perdere solo
  quello che si è puntato), il Castello è vittoria-o-fuori: una
  sconfitta in QUALUNQUE tappa elimina dal torneo senza bisogno di
  contare le Stelle residue. Zero infrastruttura nuova di base
  necessaria: solo nuovi campi nello stato del torneo (`castleStage`/
  `castleFinalists`/`castleSemifinalOpponent`/`castleFinalOpponent`) e
  tre nuove schermate — la stessa base (`SaveManager.getTournamentState`/
  `mode=tournament` in `duel-session.js`/la breadcrolla
  `ygoLastDuelOutcome`) regge entrambe le metà senza modifiche. Mappa a
  bivi generata "man mano" (stile Crash
  Bandicoot 1 — 2/3 percorsi ad ogni passo, MAI un grafo intero
  precalcolato: molto più semplice da costruire/renderizzare di una
  vera mappa 2D con percorsi disegnati, e indistinguibile per il
  giocatore visto che ogni percorso è comunque "a sorpresa" finché non
  lo si sceglie). Pool di Duellanti incontrabili SOLO il cast reale del
  Regno dei Duellanti (Rex Raptor/Weevil Underwood/Mako Tsunami/Panik/
  Bonz/Fratelli Paradosso/Mai Valentine/Bandit Keith) — Kaiba e Pegasus
  non possono mai comparire come incontro casuale per costruzione
  (compaiono solo nel percorso speciale "Verso il Castello", sbloccato
  a 10 Stelle). Infrastruttura nuova pensata riusabile per un FUTURO
  secondo torneo (Battle City, già presente come "Prossimamente" in
  `tornei.html`), non specifica di questo: `SaveManager.getTournamentState(id)`/
  `setTournamentState(id, state)` (contenitore generico sotto
  `save.tournaments[id]`, forma libera decisa da ogni torneo);
  `save.currency.starChips` (esisteva già da tempo, mai usato da
  nessuna feature) diventa il vero portafoglio Stelle; nuova modalità
  `duelMonstersCore.html?mode=tournament&tournament=<id>` in
  `js/duel-session.js`, con `TOURNAMENT_RETURN_URLS` a mappare
  torneo→pagina di ritorno (un futuro torneo aggiunge una riga sola);
  nuova breadcrolla generica `sessionStorage['ygoLastDuelOutcome']`
  (mode/tournamentId/playerWon/opponentId/timestamp), scritta da
  `DuelSession.finish()` per OGNI duello — le modalità che non ne hanno
  bisogno la ignorano, non è un hack solo per questo torneo. Verificato
  con Playwright forzando deterministicamente ogni ramo (premio/insidia/
  vittoria/sconfitta/eliminazione a 0 Stelle/entrambi gli esiti del
  Cancello di Kaiba), non solo affidandosi al caso — vedi i test
  scratch di sessione per il pattern (manipolare `SaveManager`/
  `Math.random` via `page.evaluate` invece di sperare in un lancio
  fortunato). Suite motore 36/36 verde.
- ✅ **Schermata di caricamento condivisa ad ogni cambio pagina
  (`js/ui/page-loader.js`/`.css`)**, richiesta esplicita dell'utente,
  distinta dallo splash d'apertura di `index.html` (quello resta
  un'esperienza a parte, mostrata una sola volta a sessione — questa
  compare invece ad OGNI navigazione tra le pagine del gioco, ALMENO 2
  secondi, stesso principio "camuffa il caricamento reale" ma un disco
  ciano/blu al posto dell'anello dorato dello splash, per restare
  visivamente distinguibili). Componente condiviso (come `js/ui/topbar.js`)
  incluso in tutte le pagine: `<link>` nell'head + `<script>` come
  PRIMISSIMO elemento di `<body>` (garantisce la copertura dal primo
  frame dipinto, stesso principio già usato per lo splash/per il vecchio
  `#preIntroCover`). Nasconde da sola dopo il `window.load` + il minimo
  di 2s, a meno che la pagina non imposti `window.PAGE_LOADER_MANUAL_HIDE = true`
  per controllare da sola il momento esatto in cui sparire.
  `duelMonstersCore.html` **sostituisce interamente il vecchio
  `#preIntroCover` statico** con questo stesso componente (manual-hide,
  nessun minimo di 2s: `PageLoader.hide()` chiamata da
  `duel-session.js#start()` nello STESSO punto in cui prima veniva
  rimosso `#preIntroCover` — la regola "il caricamento del duello non
  deve mai aspettare nulla" resta intatta, la cinematica VS parte
  esattamente come prima). `index.html` ha un caso speciale (nuovo flag
  generico `window.PAGE_LOADER_SKIP`, per qualunque pagina volesse
  disattivarlo del tutto): alla PRIMISSIMA apertura dell'app in questa
  sessione compare SOLO lo splash dedicato (niente loader, altrimenti lo
  coprirebbe per l'intera durata avendo uno z-index più alto); ad ogni
  RITORNO al menu da un'altra pagina (splash già visto in questa sessione)
  compare invece questo loader al posto del vecchio "salta dritto al
  menu" istantaneo. Verificato con Playwright su 4 scenari (comparsa
  immediata + minimo 2s rispettato su una pagina normale; nessun ritardo
  artificiale prima della cinematica VS su `duelMonstersCore.html`; solo
  splash e zero loader creato alla prima apertura di `index.html`; loader
  con minimo 2s e splash rimasto nascosto al ritorno). Suite motore
  56/56 verde (invariata).
- ⚠️ **Modifica audio revertata su richiesta esplicita dell'utente**: in
  questa stessa sessione era stato aggiunto `mousemove` ai listener di
  fallback che sbloccano l'autoplay musicale (`js/audio/audio-manager.js`,
  `tryPlay()`) — l'utente ha segnalato subito dopo che questo aveva
  "rotto il gioco" (musica non più avviabile). Rimosso integralmente
  senza indagare oltre se fosse davvero la causa (vedi la memoria
  salvata `simplify-dont-stack-fixes.md`: di fronte a una rottura
  segnalata, il primo passo è sempre tornare allo stato precedente noto-
  funzionante, non aggiungere un'altra ipotesi sopra). Restano SOLO i 4
  listener originali (`pointerdown`/`keydown`/`wheel`/`touchstart`, fase
  capture). Aggiunta per prudenza una rete di sicurezza a tempo (10s) in
  `js/ui/page-loader.js` per la modalità `PAGE_LOADER_MANUAL_HIDE` (es.
  `duelMonstersCore.html`), nel dubbio che fosse invece quest'altra
  novità della stessa sessione a poter restare bloccata per sempre in
  qualche percorso d'errore non ancora osservato.
- ✅ **14 carte "banisci/tributa N carte dal Cimitero/Terreno" per la
  Special Summon dalla mano corrette — stessa famiglia di bug di
  "ricerca dal Deck senza vera scelta" qui sotto, ma pattern diverso**:
  Inferno (677), Fenrir (698), Stregone del Caos (740, 1 LUCE + 1
  OSCURITÀ), Gigantes (757), Silpheed (779), Necropaura Oscura (891, 3x
  Demone), Anima di Purezza e Luce (1093, 2x LUCE), Spirito delle
  Fiamme/Roccia/Acqua/Vento (1094/1101/1103/1104), Drago Toon Occhi Blu
  (123) e Manga Ryu-Ran (606, tributo di 2 mostri qualsiasi) sceglievano
  sempre i primi N candidati trovati. **Perché non si può riusare
  `searchGraveyardWithChoice`/`searchDeckWithChoice` qui**: quei due
  aprono il picker in modo ASINCRONO e vanno bene per un effetto
  REATTIVO (onDestroy/onFlip/activate() dopo che l'azione principale è
  già avvenuta) — ma il valore di ritorno di `paySpecialSummonCost` GATE
  SINCRONAMENTE se `DuelEngine.trySpecialSummonFromHand`
  (duel-engine.js) procede con la vera Special Summon: un picker
  asincrono lì dentro tornerebbe vero PRIMA che la scelta sia fatta,
  sommonando subito e pagando il costo dopo (o mai) — bug quasi
  introdotto in questa stessa sessione con un primo tentativo su Inferno
  poi corretto prima del commit. Soluzione: generalizza il meccanismo
  GIÀ ESISTENTE per Teschio Evocato Toon (id 486,
  `getSpecialSummonSacrificeCandidates`/`pendingSpecialSummonSacrificeUid`,
  lasciato invariato) spostando la scelta PRIMA, nel click handler
  (`offerSpecialSummonBanishChoice`/`offerSpecialSummonTributeChoice`,
  nuove funzioni globali in `actions.js`) — la scelta finisce in
  `gameState.pendingSpecialSummonBanishUids`/`TributeUids`, letta e
  consumata da `resolveSpecialSummonBanishCost`/`resolveSpecialSummonTributeCost`
  (nuovi helper condivisi in `card-effects.js`), che restano quindi
  sincroni come ogni altro `paySpecialSummonCost`. Entrambe le funzioni
  di offerta accettano un array di predicati, uno per carta richiesta
  (ripetuto per un conteggio omogeneo, diverso per un costo eterogeneo
  come id 740) e aprono un picker SOLO se esistono davvero più
  candidati del minimo richiesto. **Riusabile per qualunque futura carta
  con lo stesso identico bisogno** ("scegli N carte per un costo che
  deve gate sincronamente la prosecuzione", non solo Special Summon).
  Exxod (753, tributo singolo con nome specifico) riusa invece il
  meccanismo preesistente di id 486, pensato apposta per una scelta
  singola. Scrivendo il test per questa carta è emerso un bug reale
  PREESISTENTE e scorrelato: `.name.includes('Sfinge')` era
  case-sensitive e non riconosceva mai "Hieracosfinge"/"Criosfinge" (la
  "s" minuscola nel nome composto) — corretto con `isSphinxNamed(card)`,
  confronto case-insensitive. **Lezione per una futura sessione**:
  quando un costo di Special Summon dalla mano ha bisogno di una scelta
  VERA tra più candidati, non aprire mai un picker dentro
  `paySpecialSummonCost` stessa — la scelta va sempre fatta PRIMA, nel
  click handler, con lo schema `offerSpecialSummon*Choice` +
  `pendingSpecialSummon*Uids` + `resolveSpecialSummon*Cost` qui sopra.
  Suite motore 58/58 verde.
- ✅ **19 carte "cerca/banisce dal Cimitero senza vera scelta" corrette
  (continuazione dell'audit su richiesta esplicita dell'utente)**:
  Maschera dell'Oscurità (602), Sepoltura Prematura (633), Il Guerriero
  Ritorna in Vita (725), Fata della Primavera (728), Onda Sismica (818),
  Officina dell'Ingranaggio Antico (837), Richiamo degli Infestati
  (136), Capo dei Guardiani della Tomba (899), La Fanciulla Indulgente
  (901), Lanciere Sciocco (1036), Fushioh Richie (1130), Genesi del
  Vampiro (656, doppia scelta scarto+rianimazione), Gilford la Leggenda
  (709, equip in sequenza finché restano caselle libere), Spada Divina
  - Lama della Fenice (722, 2 scelte in sequenza), Libro della Vita
  (669, 2 Cimiteri diversi), Cerchio degli Inferi (498, 2 siti),
  Fabbrica dell'Ingranaggio Antico (841, rivelazione + bando a soglia
  di Livello) e Metamorfosi (886, doppia scelta tributo+Extra Deck) —
  stessa famiglia di "primo candidato trovato invece di vera scelta"
  della batch precedente (17 carte lato Deck), qui lato Cimitero.
  Generalizzato anche `searchDeckWithChoice` con una nuova opzione
  `options.deckOwner` (default `ctx.owner`) per le carte che cercano
  nel Deck dell'AVVERSARIO (Signore/Dama dei Vampiri, Ninna Nanna
  dell'Obbedienza, Scassinatori Scorpioni Oscuri) mentre resta il
  proprietario dell'effetto a scegliere.
  **Due bug reali scorrelati trovati scrivendo i test di questa
  correzione**:
  - **Lanciere Sciocco (1036)**: `destroyMonster` (duel-engine.js) manda
    GIÀ la carta stessa al proprio Cimitero PRIMA di sparare `onDestroy`
    — un filtro `type === 'monster'` senza escludere `ctx.card.uid`
    trovava quindi SE STESSA come falso candidato aggiuntivo (2
    "candidati" invece di 1), aprendo un picker con una scelta fasulla
    invece di auto-selezionare l'unico vero mostro da rianimare.
    Corretto aggiungendo `c.uid !== ctx.card.uid` al filtro. **Lezione
    per un futuro caso simile**: quando un `onDestroy` cerca nel PROPRIO
    Cimitero con un filtro ampio (es. "qualsiasi mostro"), verificare
    sempre se quel filtro potrebbe includere la carta STESSA appena
    distrutta (già presente lì al momento del trigger).
  - **`searchZoneWithChoice`/`takeCard` (card-effects.js) rimuove GIÀ la
    carta dalla zona PRIMA di chiamare `onChosen`** — corretto per un
    effetto REATTIVO che sposta la carta altrove (mano/Terreno, dove
    la rimozione generica basta), ma `ctx.banishFromGraveyard` richiede
    che la carta sia ANCORA nel Cimitero per funzionare (fa il suo
    proprio `grave.indexOf` + controllo Necrovalley id 890) — chiamarlo
    su una carta già rimossa da `takeCard` falliva SEMPRE in silenzio
    (tornava `false` senza mai bandire). Bug introdotto e poi corretto
    nella stessa sessione per Spada Divina (722)/Fabbrica
    dell'Ingranaggio Antico (841)/Libro della Vita (669, lato Cimitero
    avversario) — tutti e 3 chiamavano `banishFromGraveyard` DOPO
    `searchGraveyardWithChoice`. Nuovo helper condiviso
    `banishFromGraveyardWithChoice(ctx, graveyardOwner, filterFn,
    options, onBanished)`: non rimuove nulla da solo, lascia scegliere
    tra i candidati (senza toccarli) e delega rimozione+Necrovalley a
    `banishFromGraveyard` stesso. **Riusabile per qualunque futura carta
    con lo stesso bisogno** ("scegli 1 carta dal Cimitero da BANDIRE",
    non solo da spostare) — usare SEMPRE questo, mai
    `searchGraveyardWithChoice` seguito da un `banishFromGraveyard`
    separato sulla carta scelta.
  Rimosso il `missingEffectNote` ormai risolto di Metamorfosi (886);
  aggiunto quello mancante (mai tracciato prima) per La Fanciulla
  Indulgente (901, condizione "distrutto in battaglia in questo turno"
  non filtrata); ristretto quello di Lanciere Sciocco (1036, resta solo
  "sempre scoperto in Attacco, mai Difesa coperta"). **Bug di TEST
  trovato e corretto a parte (non del motore)**: scrivendo
  `tests/specs/graveyard-search-real-choice.spec.js` un test falliva in
  modo diverso ad ogni esecuzione (a volte un conteggio di candidati
  sbagliato, a volte un timeout) SOLO quando lanciato dentro la suite
  completa (`npm test`), mai isolato — `freezeNaturalGameLoop()`
  (harness.js) congela SOLO le decisioni autonome del bot, MAI la
  cascata di transizione fase già in volo dal caricamento della pagina
  (Draw→Standby→Main Phase 1, vedi "Un'insidia reale già presa in
  questa suite" in `tests/README.md`) — quella cascata può completarsi
  DOPO il freeze e interferire con le manipolazioni dirette di
  `gameState` di un test che inizia subito a lavorare. Risolto
  aggiungendo un breve `page.waitForTimeout` all'inizio del test per
  lasciarla assestare PRIMA di iniziare. **Lezione per un futuro test
  con lo stesso sintomo** ("fallisce in modo diverso ogni volta, solo
  nella suite completa, mai isolato"): sospettare questa esatta cascata
  prima di continuare ad allungare i timeout dei passi successivi, che
  non risolve la causa reale.
- ✅ **3 bug segnalati dall'utente, tutti chiusi nella stessa sessione**:
  1) **Raggi ruotanti che a volte non toccavano i bordi schermo** (menu
     principale, intro/vittoria/sconfitta del duello): usavano un
     `inset` in percentuale (`-30%`/`-35%`), che scala con lo STESSO
     rapporto d'aspetto del contenitore — su uno schermo molto
     stretto/alto (mobile in verticale) il riquadro ruotato non copre
     più gli angoli reali a certi angoli di rotazione (verificato con
     la trigonometria: un rapporto H/W di ~2.2 richiede un fattore di
     crescita di ~2.24× a 45°, oltre il ~1.6-1.7× usato). Corretto in
     `.menu-bg-rays` (index.html)/`.di-rays`/`.do-rays`
     (duel-cinematics.css): `250vmax` fisso invece di una percentuale
     del contenitore, centrato via margini negativi — sempre più grande
     della diagonale reale dello schermo, qualunque rapporto d'aspetto.
  2) **"Il video di Exodia parte e si blocca"**: non era bloccato, veniva
     TAGLIATO A METÀ da un tetto di sicurezza fisso a 12s in
     `playVideoOverlay` (`js/ui/effects.js`) — `video/vittorie/exodiawin.mp4`
     (aggiunto al repository in questa sessione, prima non tracciato)
     dura 18.27s, quindi veniva sempre interrotto prima della fine
     (confermato tracciando `currentTime`/`readyState`/`paused` nel
     tempo: il video giocava perfettamente fino al taglio). Corretto
     ricalibrando il tetto sulla vera durata (`video.duration`, letta
     da `'loadedmetadata'`) + 5s di margine — la rete di sicurezza resta
     SOLO per un video che non arriva mai a `'ended'`/`'error'`
     (bloccato, mal codificato), non per uno che gioca semplicemente più
     a lungo del tetto indovinato. Il commento di
     `visual-effects-library.js` che diceva "la cartella video/ non
     esiste ancora" era obsoleto (contiene già `video/evocazioni/*.mp4`
     da una sessione precedente) — aggiornato.
  3) **Colore del page-loader stonato**: era ciano/blu (scelta
     deliberata di una sessione precedente per distinguerlo dallo
     splash d'apertura), tolto su richiesta dell'utente e sostituito
     con lo stesso oro/ambra del resto del menu
     (`--gold`/`--gold-strong`, `#f7d774`/`#f39c12`) — resta
     distinguibile dallo splash per FORMA (disco vs anello) e
     frequenza (ad ogni cambio pagina, non solo all'apertura), non più
     per colore.
  Suite motore 59/59 verde (rilanciata più volte per escludere flakiness).
- ✅ **Accesso con approvazione admin OBBLIGATORIO per giocare — replica
  esplicitamente richiesta dall'utente del meccanismo del progetto
  "Fioxify" (stesso autore, `Sviluppo/Fioxify` accanto a questo repo).
  Sviluppato su branch `feature/auth-approval-fioxify`, poi MERGIATO in
  `main` su richiesta esplicita dell'utente ("mergia in main") e il
  branch è stato eliminato (locale + remoto) — il progetto torna così
  alla convenzione consueta di un solo branch attivo.** Prima di questa
  sessione l'accesso cloud
  (`js/cloud/cloud-sync.js`) era puramente OPZIONALE (il gate di
  `index.html` offriva anche "Continua in locale") — decisione esplicita
  dell'utente, tra 3 opzioni proposte via AskUserQuestion, di renderlo
  OBBLIGATORIO ovunque (web + APK), rimuovendo quell'opzione.
  - **`supabase/schema.sql`**: nuova tabella `public.profiles` (id,
    email, `status` pending/approved/rejected, `is_admin`) + trigger
    `handle_new_user` (crea il profilo alla registrazione) + funzioni
    `is_admin_user`/`is_approved`/`check_registration_email` (RPC letta
    anche da anon, per un messaggio preciso in fase di registrazione se
    l'email esiste già) + trigger anti-auto-approvazione + policy RLS
    per `profiles` e per gating le insert/update su `saves`/`custom_cards`
    dietro `is_approved()` (difesa in profondità, oltre al blocco lato
    client). **L'utente deve eseguire questo script nell'SQL Editor
    Supabase di persona** (non posso farlo io: la sola chiave che ho,
    `anon`, non ha i permessi DDL) — vedi `supabase/README.md`, aggiornato
    con la procedura completa incluso "come creare il primo admin".
  - **`js/cloud/cloud-sync.js`**: `signIn` ora verifica lo status del
    profilo e nega l'accesso (con signOut immediato) se non
    'approved'/admin; `signUp` controlla PRIMA l'email via RPC (messaggio
    preciso: già in attesa/già approvata/rifiutata) poi fa sempre
    signOut dopo la registrazione (nessuna sessione finché non approvato).
    Nuovo `waitForUser()` (Promise risolta SOLO dopo che la sessione
    persistita è stata davvero controllata — a differenza di
    `onAuthChange`, che chiama subito il suo ascoltatore con
    `cachedUser` ancora `null` perché `getSession()` è asincrona: usarlo
    SEMPRE per decidere se reindirizzare al login, mai il primo giro di
    `onAuthChange`). Nuovo **`ensureApprovedSession()`** — il pezzo
    chiave per la domanda esplicita dell'utente su APK/offline: prova
    SEMPRE una riconferma online fresca (con un tetto di 6s), ma se la
    rete non risponde ricade su un marcatore locale
    (`ygoApprovedUserId` in localStorage) scritto SOLO da un'ultima
    verifica online RIUSCITA per quello specifico uid — non è una cache
    HTTP/Service-Worker che scade da sola, è un marcatore esplicito
    per-utente: un account approvato una volta resta utilizzabile
    offline sullo stesso dispositivo, ma un account rifiutato/revocato
    DOPO viene comunque bloccato al prossimo controllo online, mai per
    sempre offline. Nuove funzioni admin (`adminListProfiles`/
    `adminSetProfileStatus`/`adminPendingCount`), tutte pass-through a
    query dirette (le policy RLS in schema.sql sono la vera barriera).
  - **`js/cloud/auth-gate.js` (NUOVO)**: incluso come PRIMO script di
    OGNI pagina di gioco (stesso pattern di inclusione di
    `js/ui/page-loader.js`/`js/ui/topbar.js`, 13 pagine toccate) —
    aspetta `waitForUser()`, poi `ensureApprovedSession()`, e rimanda a
    `index.html?blocked=pending|rejected` se non approvato. `index.html`
    stesso imposta `window.AUTH_GATE_SKIP` implicitamente non caricando
    questo script (mostra lui stesso il login). `profilo.html`
    (standalone, raggiungibile solo a mano) aveva GIÀ i 3 script
    Supabase ma caricati troppo tardi (a metà pagina) — consolidati in
    un unico punto, in cima, altrimenti sarebbero stati caricati DUE
    volte nella stessa pagina (client Supabase duplicato).
  - **`admin.html` (NUOVA pagina)**: pannello Admin (lista "in attesa"
    con Approva/Rifiuta + lista completa sola-lettura) — carica
    `auth-gate.js` per la baseline "approvato", PIÙ un controllo
    aggiuntivo inline `CloudSync.isAdmin()` (auth-gate.js da solo si
    ferma ad "approvato", non basta per questa pagina). Voce "Admin" nel
    menu principale (`index.html`) aggiunta dinamicamente in
    `renderMenu()` SOLO se `CloudSync.isAdmin()`.
  - **`index.html`**: gate riscritto — rimosso "Continua in locale"/
    "Nuova Partita (locale)" (`showGate`/`openNewGameModal` semplificati
    di conseguenza, ramo `fromGate` morto rimosso), validazione client
    (campi vuoti/lunghezza/mismatch) prima di chiamare `CloudSync.signUp`.
    `initGate()` ora aspetta `waitForUser()` + `ensureApprovedSession()`
    prima di decidere Gate vs Menu invece di un bypass sincrono su
    `!cloudUsable` (che ora mostra `showGateUnavailable()`, un vero
    errore bloccante — un account è OBBLIGATORIO, non c'è più nulla verso
    cui ripiegare). **Bug reale trovato e corretto nello stesso giro**:
    "Cambia account" (Profilo) puliva solo `sessionStorage` senza un vero
    `signOut()` — con la sessione Supabase ancora valida, il gate al
    ricaricamento l'avrebbe ritrovata e sarebbe tornato dritto al menu,
    senza mai dare la possibilità di accedere con un account diverso.
    **Redesign successivo del form, su segnalazione esplicita
    dell'utente** ("accedi/registrati fanno un giochetto strano... se
    clicco accedi rimane il conferma password"): il primo tentativo
    (un unico form condiviso con un campo "Conferma password" a comparsa
    progressiva, mostrato al primo click su "Registrati") aveva
    un'architettura sbagliata — cambiando idea da Registrati ad Accedi il
    campo extra restava visibile. Sostituito con due tab indipendenti
    (`#gateTabLogin`/`#gateTabRegister`) su due pannelli separati
    (`#gateLoginPanel`/`#gateRegisterPanel`), ciascuno coi propri
    input/stato (`setGateStatus('login'|'register', ...)`) — stessa
    struttura a tab del progetto Fioxify. **Bug reale trovato durante
    questo refactor**: `resolveCloudConflict()` faceva ancora riferimento
    alla variabile locale `gateStatus` del vecchio form condiviso,
    rimossa nel redesign — avrebbe lanciato `ReferenceError` al primo
    fallimento di un fetch del salvataggio cloud. Ulteriore fix su
    segnalazione dell'utente ("il box della login... non deve
    autosistemarsi per restare centrale... deve espandersi verso il
    basso"): `.gate-shell` passata da `justify-content:center` (faceva
    saltare l'intera card quando si passava al pannello Registrati, più
    alto) a `justify-content:flex-start` con un padding-top che
    approssima la posizione precedente — la card ora si ancora in alto e
    cresce verso il basso, verificato via Playwright (0px di
    spostamento del logo tra i due tab). Il pulsante Esci è stato
    restilizzato da link testuale spento a pillola con bordo, sempre su
    richiesta esplicita. `js/ui/page-loader.js`: `MIN_MS` ridotto da
    2000 a 1000 (richiesta esplicita "portalo a un minimo di 1 secondo").
  - **Bug di TEST (non del motore) trovato e corretto**: l'intera suite
    Playwright (`tests/`) apre `duelMonstersCore.html` direttamente —
    con l'accesso ora obbligatorio, `auth-gate.js` l'avrebbe rimandata a
    `index.html` PRIMA che `gameState`/`DuelEngine` finissero di
    caricare, rompendo tutti i 58 test esistenti. Corretto in
    `tests/helpers/harness.js#openDuel` con
    `page.addInitScript(() => { window.AUTH_GATE_SKIP = true; })` PRIMA
    della navigazione — imposta il flag di opt-out già esistente
    (pensato per `index.html`) allo stesso modo in cui lo farebbe uno
    sviluppatore reale, senza toccare in alcun modo il comportamento del
    gate per un utente vero (che quel flag non lo imposta mai). Suite
    59/59 verde, rilanciata più volte.
  - ✅ **Blocco email/account admin, risolto (con una via diversa da
    quella prevista)**: la registrazione via `CloudSync.signUp` per
    `jacopo@duelarena.it` falliva con
    `{"code":400,"error_code":"email_address_invalid",...}` — verificato
    via chiamata REST diretta a `/auth/v1/signup`, e via
    `Resolve-DnsName -Type MX/A` che il dominio `duelarena.it` non aveva
    (a quel tempo) alcun record DNS: Supabase Auth verifica la
    deliverability dell'email, non solo il formato, quindi la rifiutava
    a monte. L'utente ha risolto creando l'account DIRETTAMENTE dalla
    dashboard Supabase (Authentication → Users → Add user), un percorso
    che bypassa questa validazione lato client/signup — poi promosso ad
    admin con la query SQL in fondo a `supabase/schema.sql`, dopo il fix
    del trigger `protect_profile_privileged_columns` (vedi sopra, bug
    reale trovato eseguendo proprio questa query: `auth.uid()` è sempre
    NULL in una query lanciata a mano nell'SQL Editor). **Lezione per un
    futuro account amministratore bloccato dalla stessa validazione**:
    creare l'utente dalla dashboard Supabase invece di insistere con
    `signUp`, se il dominio dell'email non ha ancora DNS/MX validi.
  - **Ancora non fatto, noto e accettato dopo il merge in `main`**:
    `GUIDA_RIUTILIZZO.md` non aggiornata con `js/cloud/auth-gate.js`/
    `admin.html`; nessun test Playwright dedicato per il flusso di
    approvazione (impossibile scriverne uno vero senza un progetto
    Supabase di test separato — la suite esistente bypassa il gate
    apposta, vedi sopra); comportamento NON verificato end-to-end contro
    un vero duello giocato con un account realmente approvato online (solo
    la creazione/promozione dell'account admin è stata confermata
    dall'utente). Se un futuro accesso reale si comporta in modo
    inatteso, ripartire da qui prima di aggiungere nuova logica.
- ✅ **3 bug reali + un riequilibrio IA/mazzi, tutti dalla stessa
  sessione**: il badge ATK/DEF sotto una carta in campo era già corretto
  (usa già `DuelEngine.getEffectiveAtk/getEffectiveDef`); il vero bug era
  nella riga "ATK X • DEF Y" del pannello informazioni carta
  (`updateCardInfoPanel`, `js/engine/game-flow.js`), che leggeva ancora
  `card.attack`/`card.defense` grezzi mentre l'anteprima subito sopra,
  nello stesso pannello, mostrava già il valore effettivo — corretto
  usando la stessa funzione. L'Evocazione Normale del bot
  (`botSummonMonster`, `js/ai/bot.js`) e quella dell'avversario reale in
  Multiplayer (`applyRemoteSummon`, `js/multiplayer/multiplayer.js`)
  chiamavano `FX.playSummonCircle` direttamente invece di
  `FX.playMonsterSummonEffect` (che controlla PRIMA un filmato dedicato/
  la convergenza elementale di Livello 7+): il bot/avversario otteneva
  quindi SEMPRE il cerchio generico anche per una carta con effetto
  speciale che il giocatore vede regolarmente — corretti entrambi.
  `ACTIONS.takeControl` (`js/engine/duel-engine.js`, il choke point unico
  per Cambio di Cuore/Furto Improvviso/Scambio di Creature/ecc.) non
  azzerava `hasAttacked`/`canChangePosition` sul mostro rubato: quei due
  flag si azzerano SOLO per il campo del giocatore di turno all'inizio
  del proprio turno, mai per quello dell'avversario, quindi un mostro
  rubato a metà turno ereditava lo stato RESIDUO dell'ultimo turno di chi
  lo possedeva prima — spesso restando bloccato in Difesa senza modo di
  girarlo in Attacco. Corretto azzerando entrambi i flag dentro
  `takeControl` stesso.
- ✅ **Riequilibrio mazzi Duellanti + moderazione IA Difficile +
  rinomina "Medio"→"Normale"**, su segnalazione esplicita dell'utente
  ("tutti i bot vanno contro ogni probabilità... sempre buco nero,
  cilindro magico, riflesso"). Causa reale trovata analizzando TUTTI i 34
  mazzi in `js/data/character-decks.js`: non un bug di mescolamento
  (Fisher-Yates in `buildDeckFromSpec`, `js/data/cards-db.js`, già
  corretto) ma la composizione stessa — OGNI mazzo, senza eccezioni,
  includeva IDENTICO lo stesso pacchetto Cilindro Magico (id 10) x2-3 +
  Buco Trappola (id 40) x2 + Forza dello Specchio (id 382) x2 + Buco
  Nero (id 7) x1-2 in 32/34 mazzi — 7-8 carte su 40 (fino al 20%) sempre
  le stesse 4 rimozioni generiche fortissime a prescindere dal
  personaggio. **Lezione per una futura sessione**: quando "sembra che
  il caso vada sempre contro l'utente", verificare PRIMA la
  composizione/densità dei dati (qui: quante copie di cosa in ogni mazzo)
  prima di sospettare il generatore casuale — qui il generatore era già
  corretto, il problema era a monte. Ridotte a 1 copia le 4 carte in
  tutti i 34 mazzi, slot liberati redistribuiti su un pool di 6 Magie/
  Trappole difensive generiche (Waboku 503, Mura del Castello 143,
  Armatura Sakuretsu 793, Incantesimo Ombra 439, Capro Espiatorio 434,
  Sette Attrezzi del Bandito 599) — richiesta esplicita "magari mette
  qualche magia o trappola difensiva" — con uno script usa-e-getta che
  ruota il pool per mazzo e verifica che ogni mazzo resti a 40 carte
  prima di scrivere il file, preservando tutti i commenti di
  ambientazione esistenti (mai toccati, solo l'array `main`). IA
  Difficile (`js/ai/ai-hard.js`) usava OGNI Magia/Trappola disponibile
  ogni turno senza limite — ora max 2 Magie attivate + 2 Trappole Settate
  per turno dalla mano (`MAX_ACTIVATE_PER_TURN`/`MAX_SET_PER_TURN`,
  stesso oggetto `usedThisTurn` già condiviso con IA_MEDIA) + max 2
  attivazioni proattive di carte già Set (`js/ai/bot.js`, ridotto da 5) —
  resta più aggressiva di IA_MEDIA (1+1) ma non più illimitata. Etichetta
  "Medio" rinominata in "Normale" OVUNQUE visibile al giocatore (pulsanti
  difficoltà, badge in duello, sottotitolo cinematica VS, toast di sfida)
  tramite un nuovo `session.difficultyLabel` (`js/duel-session.js`) che
  traduce SOLO la visualizzazione — il valore interno resta "Medio" in
  `data-difficulty`/`?difficulty=`/`DIFFICULTY_LABEL_TO_KEY`/stato
  salvato del Torneo, per non dover toccare URL o salvataggi persistiti
  per un semplice cambio di nome (stesso principio già in uso: la classe
  CSS del badge resta derivata dal valore interno `diff--medio`, così lo
  stile arancione non si rompe). **Trovato ma NON toccato in questa
  sessione (fuori scope, segnalato per una sessione futura)**: id 392
  "Nega l'Attacco" e id 820 "Nega Attacco" in `data/cards.json` sembrano
  una vera carta duplicata (stesso effetto letterale, entrambe già
  registrate in `card-effects.js`) — da investigare e risolvere seguendo
  la convenzione "si cancellano, non si segnalano soltanto", verificando
  prima se uno dei due id è già usato in un mazzo/nel pool carte casuali
  prima di rimuoverlo.
- ✅ **Freccia d'attacco più elaborata + 3 bug reali**, tutti dalla stessa
  sessione. La freccia (duelMonstersCore.html) è passata da una linea
  rossa piatta a un tratto sfumato con doppio bagliore, flusso animato
  di trattini verso il bersaglio, anello pulsante nel punto di origine,
  punta più grande — più un'evidenziazione del bersaglio agganciato
  durante il trascinamento, calcolata con la STESSA euristica di
  `endAttackDrag`/`findNearestBotMonsterSlot` (mai un'anteprima
  indipendente che potrebbe mentire su cosa scatterebbe al rilascio).
  `executeAttack` (actions.js) ora chiude sempre il pannello info carta
  all'inizio, se lasciato aperto da un hover precedente. **Bug reale
  trovato investigando "l'avatar dell'avversario si sposta per una
  frazione di secondo ad ogni cambio turno"**: `#botInfo` era rimasto
  DENTRO `.game-container`, mentre `#playerInfo` ne era già stato
  estratto in una sessione precedente per lo stesso identico motivo
  (un commento lì lo spiegava già) — un ancestor con un `transform` CSS
  diventa il containing block per i propri discendenti
  `position:fixed`, quindi `.fx-shake` (un `translate3d(...)` applicato
  a `.game-container` ad OGNI cambio turno per l'annuncio "TURNO")
  faceva scattare `#botInfo` insieme allo scuotimento invece di restare
  fermo al vero angolo del viewport. Spostato fuori esattamente come
  `#playerInfo`. **Lezione per una futura sessione**: se un elemento
  `position:fixed` "salta" o si comporta stranamente solo in certe
  animazioni, sospettare SEMPRE un `transform`/`filter`/`perspective`
  su un antenato — e controllare se un elemento fratello con lo stesso
  identico problema strutturale è già stato spostato fuori in passato
  per un trigger diverso (qui: l'intro camera-3D), lasciando l'altro
  ancora vulnerabile. Aggiunto anche un nuovo blocco
  `@media (orientation: portrait)`: su verticale la mano (nostra in
  basso, del bot in alto) è centrata su TUTTA la larghezza di
  `.game-container`, che in verticale coincide quasi con l'intero
  schermo — le carte più esterne finivano sotto/sopra il box fisso
  nome+LP+avatar, sovrapponendosi. **Primo tentativo (poi corretto,
  vedi sotto)**: un padding laterale asimmetrico per restringere l'area
  di centraggio, ma le carte restavano comunque nella STESSA riga
  orizzontale dell'avatar.
- ✅ **Correzione della sessione successiva, dopo aver visto lo schermo
  reale del telefono collegato**: il padding laterale qui sopra non
  bastava — l'utente ha chiesto una riga TUTTA SUA per la mano, separata
  in verticale dall'avatar, non condivisa lateralmente con esso.
  Sostituito con un margine VERTICALE (margin-top per `.hand--bot`,
  margin-bottom per `.hand`) pari all'altezza del box avatar (48px fisso
  su mobile) più il suo offset dal bordo schermo — nuova variabile
  `--duelist-box-offset` condivisa con `#botInfo`/`#playerInfo`, così i
  due valori non si disallineano mai. **Lezione per una futura
  sessione**: quando un fix di layout "sembra corretto" da un test
  automatizzato ma l'utente lo respinge dopo aver visto il dispositivo
  reale, il modo più veloce per capire la richiesta VERA è chiedere
  (o farsi mandare) uno screenshot del device reale invece di continuare
  a indovinare varianti dello stesso approccio sbagliato — qui bastava
  guardarlo per capire che serviva una riga separata, non un
  aggiustamento di padding.
- ✅ **Verifica end-to-end su dispositivo Android reale collegato via
  adb** (richiesta esplicita dell'utente, "ho il telefono collegato"):
  scoperti DUE APK distinti (non solo il dev-shell già noto in
  `C:\AndroidDev\YuGiOhGameAndroid`) — un secondo progetto
  `C:\AndroidDev\YuGiOhGameAndroidProd` (`capacitor.config.json` punta a
  `https://jacopofa92.github.io/YuGiOhGame/`, non alla LAN) genera
  l'APK `com.jacopofa92.yugiohduelarena.prod`, già installata sul
  telefono dell'utente. GitHub Pages serve `main` direttamente (nessun
  workflow di deploy nel repo, confermato verificando `manifest.json` in
  produzione dopo un push) — stesso identico principio "installa una
  volta, mai più ricompilare" del dev-shell locale, solo via URL
  pubblico invece di LAN: **anche l'APK di produzione non richiede MAI
  una vera ricompilazione Gradle per un cambio HTML/JS/CSS**. Verificato
  con screenshot reali via `adb exec-out screencap`/`adb shell
  screencap` + `adb pull` (la redirezione PowerShell `>` corrompe
  l'output binario di `exec-out`: usare sempre `screencap -p
  /sdcard/x.png` poi `adb pull`, mai la pipe diretta). Il dev-shell
  locale, invece, richiede che il telefono sia sulla STESSA rete WiFi
  del PC (non basta il cavo USB/adb) — trovato un caso reale in cui il
  telefono era su dati cellulari (5G) senza alcun WiFi attivo
  (`adb shell ip -4 addr` non mostrava alcuna interfaccia wlan0 con IP),
  quindi l'app dev-shell mostrava schermo nero: non un bug, un problema
  di rete lato dispositivo, verificabile così in una sessione futura
  prima di sospettare il codice.
- ✅ **IA: mai Evocare i pezzi di Exodia** (`AI_SHARED.shouldHoldForExodia`,
  `js/ai/ai-shared.js`, usata da `chooseSummon` in ai-medium.js/ai-hard.js),
  richiesta esplicita dell'utente ("se Yugi Muto (e/o il nonno) ha le
  carte di Exodia, deve tenerle in mano e non giocarle... deve puntare
  ad avere i 5 pezzi"). Il bot poteva Evocare Normalmente un pezzo di
  Exodia il Proibito (`EXODIA_PIECE_IDS`, game-flow.js) come un mostro
  qualunque, vanificando l'obiettivo di assemblarli tutti e 5 in mano
  per la vittoria istantanea (`hasExodiaAssembled`) — i pezzi hanno
  comunque statistiche di battaglia trascurabili (200-300 ATK/DEF).
  Generico per id carta, non per personaggio: si applica da sola a
  QUALUNQUE mazzo del bot li contenga (verificato: solo Yugi Muto ed
  Espa Roba nel dataset attuale, mai Solomon Muto nonostante il dubbio
  dell'utente).
- ✅ **id 671 (Dispositivo di Evacuazione Forzata) chiuso — nuovo
  `chooseFieldMonsterTarget` (card-effects.js)**: bug reale segnalato
  dall'utente ("deve far scegliere 1 mostro sul terreno... ma non lo
  fa"). Sceglieva sempre il primo mostro scoperto trovato (l'avversario
  prima, poi il proprio Terreno) invece di una vera scelta. Corretto
  riusando la STESSA interfaccia già consolidata per una scelta tra
  carte vere (`window.DuelEngineUI.openCardListPicker` — stesso schema
  già usato in actions.js per scegliere quale mostro sacrificare per un
  attacco con Tributo extra): i candidati sul Terreno sono già vere
  `card`, nessuna UI nuova da costruire. **Riusabile per qualunque
  futura carta con lo stesso bisogno** ("scegli 1 mostro vero tra più
  candidati già sul Terreno, proprio e/o dell'avversario"). Il bot
  continua a scegliere da solo il primo candidato, invariato. Bug minore
  scoperto nello stesso punto: il pannello d'anteprima del picker
  (`showCardInfo`, actions.js) leggeva ATK/DEF grezzi invece di quelli
  effettivi — stesso identico bug/fix già applicato a
  `updateCardInfoPanel` in questa sessione.
- ✅ **13 nuovi Duellanti in Duello Libero, tema Forbidden Memories — i
  guardiani del dungeon del Labirinto**, richiesti esplicitamente
  dall'utente e posizionati tra Sacerdotessa Isis ed Heishin: Ocean
  Mage/High Mage Secmeton (Acqua), Forest Mage/High Mage Anubisius
  (Zombie/Guardiani della Tomba), Mountain Mage/High Mage Atenza
  (Roccia/Drago), Desert Mage/High Mage Martis (Bestia Alata/Macchina),
  Meadow Mage/High Mage Kepura (Fata/Bestia), più Labyrinth Mage
  (Incantatore/Trappole Counter), Sebek (Dinosauro/Rettile) e Neku
  (Guerriero/Drago) senza controparte "base". Ogni mazzo: 20 mostri + 11
  Magie + 9 Trappole = 40, stesso criterio di diluizione dei 4 rimozione-
  generiche già applicato al resto del roster in questa sessione (mai
  più di 1 copia di Buco Nero/Cilindro Magico/Buco Trappola/Forza dello
  Specchio). **Metodo per un futuro giro di content-creation simile**:
  delegare la catalogazione dei pool di carte candidate per tema
  (razza/attributo su `data/cards.json`) a un agente Explore dedicato
  PRIMA di assemblare i mazzi a mano — con 13 mazzi da costruire sarebbe
  stato altrimenti troppo lento cercare manualmente ogni razza una per
  volta. Verificare SEMPRE con uno script usa-e-getta che ogni mazzo
  totalizzi davvero 40 (il conteggio a mano di liste lunghe è
  soggetto a errori: 9 dei 13 mazzi di questa sessione sono usciti a 39
  al primo tentativo, per un singolo `{id,qty}` contato male). Rimosso
  "Duel Master K" (nessun altro riferimento nel codice a parte
  characters-db.js/character-decks.js, rimozione pulita).
- ✅ **10 bug da `TODOLIST_BUGS` (file di lavoro dell'utente, ogni punto
  ora smarcato `[x]`), tutti risolti nella stessa sessione**:
  1) **Magie Veloci (subtype `quick-play`) attivabili SOLO in Main Phase,
     mai in Battle Phase**: `actions.js#handleCardClickInner` gate va va
     tutte le interazioni di mano/Terreno a `isMainPhase`, senza
     eccezioni — per testo reale una Magia Veloce si attiva con lo stesso
     timing di una Trappola. Corretto con un'eccezione puntuale (mano E
     già Set sul Terreno) che aggiunge la Battle Phase del proprio turno
     SOLO per `card.subtype === 'quick-play'` — non un vero sistema di
     priorità ad ogni fase (limite strutturale già documentato altrove in
     questo file per l'"Effetto Veloce"), ma copre il caso reale più
     comune. Il turno avversario resta fuori scope (nessuna carta di
     questo motore può rispondere "a piacere" fuori da una Chain già
     aperta).
  2) **Scelte via `openCardListPicker` che non ridisegnavano nulla**
     (es. Maga della Fede id 588: aggiunge una Magia scelta alla mano, ma
     restava invisibile finché non arrivava un render successivo per un
     altro motivo): il picker è asincrono (si apre, il chiamante ha già
     fatto il proprio `updateUI()` PRIMA di aprirlo), quindi la mutazione
     dentro `onSelect` non veniva mai ridisegnata da sola. **Bug
     REALE trovato risolvendo QUESTO**: il primo tentativo chiamava il
     vero `updateUI()` (che richiama anche `recomputeStaticEffects()`) —
     per una carta con una scelta in SEQUENZA (es. Gilford la Leggenda id
     709: equipaggia più Equip una alla volta, ogni scelta riapre subito
     il picker successivo) questo faceva ripulire a metà catena Carte
     Equipaggiamento non ancora del tutto valide, corrompendo lo stato
     (scoperto scrivendo un test mirato, non dall'utente). Corretto con
     un refresh DELIBERATAMENTE leggero (`renderPlayerHand`/
     `renderBotHand`/`renderFields`/`renderEquipLinks`, MAI il vero
     `updateUI()`) applicato in 3 punti (`openCardListPicker`,
     `openPositionPicker`, `openChoicePopover` — tutte le scelte
     asincrone condivise di questo motore) — stesso principio anche per
     il bug #9 qui sotto. **Lezione per un futuro caso simile**: quando
     serve un refresh dopo una scelta asincrona in una possibile
     SEQUENZA di scelte, mai il refresh "completo" — solo i render
     puramente visivi, mai un ricalcolo degli effetti Continui a metà
     catena.
  3) **"Scarta 1 carta [dalla mano]" come costo/effetto di un'altra
     carta non lasciava mai scegliere QUALE**: ~15 carte (Tributo ai
     Dannati 492, Chiron il Mago 150, Notte Meccanica 153, Rottura di
     Raigeki 624, Drago Armato LV5/LV7 641/864, Virus Infetta-Tribù 697,
     Flamberge del Male Infranto 727, Vortice Fulmineo 729, Ninja
     Signora Yae 780, Festa Isterica 790, Scavo Fossile 823, Trapano
     Ingranaggio Antico 842, Ritorno dei Dannati 418, Ala Grigia 1073,
     Confisca 874) scartavano sempre `ctx.hand(ctx.owner)[0]` invece di
     una vera scelta — stessa identica famiglia di "primo candidato
     invece di scelta" già chiusa altrove in questo file per Deck/
     Cimitero/Terreno, qui per la mano. Nuovo helper condiviso
     `offerHandDiscardChoice(ctx, options, onDiscarded)`
     (card-effects.js, accanto a `chooseFieldMonsterTarget`):
     `options.filter` per i costi che vincolano il TIPO di scarto (es.
     "scarta 1 Magia" di Chiron), `options.handOwner` (default
     `ctx.owner`) per le poche carte che fanno scegliere una carta dalla
     mano DELL'AVVERSARIO (Confisca id 874, stesso principio di Amazzone
     Maestra delle Catene id 86 — missingEffectNote rimosso),
     `options.pickForBot` per un'euristica dedicata quando l'auto-scelta
     del bot non deve essere solo "la prima" (Confisca:
     AI_SHARED.scoreCardImpact). **Deliberatamente NON migrate**: le
     carte Trappola Contatore "scarta 1 carta per annullare" (189, 361,
     396, 689, 752) che rispondono DENTRO una Chain già aperta — il loro
     `activate()` legge `gameState.chain.links` assumendo che
     `canActivate()` l'abbia già garantito sincronamente; aprire un
     picker asincrono lì avrebbe richiesto toccare la delicata
     risoluzione della Chain per un guadagno marginale (quelle carte
     hanno comunque quasi sempre un solo candidato reale). **Bug
     correlato ma opposto trovato e corretto nello stesso giro**: Dicelops
     (863) usava `discardChosenFromHand(..., 0)` per il proprio scarto
     "a caso" (dado 1/2-5) — sempre la PRIMA carta, mai davvero casuale;
     corretto con `discardRandomFromHand`, l'esatto contrario del bug
     principale (qui l'imprevedibilità è il comportamento corretto, non
     una scelta).
  4)/7) **"Deck Spellcaster"/"Deck Fiamma" (Structure Deck SD6/SD3,
     `js/data/starter-structure-decks.js`, clonabili da Creazione Deck)
     segnalati "buggati"**: **bug reale grave trovato e chiuso** in
     Ritorno di Fiamma / Backfire (id 690, Trappola Continua del mazzo
     Fiamma): il suo `canActivate` leggeva `ctx.destroyedCard.attribute`
     — un campo che esiste SOLO nel ctx reattivo passato a
     `onOwnMonsterDestroyed`, MAI nel ctx di un'attivazione manuale
     (mettere scoperta la Trappola dal Terreno) — quindi lanciava SEMPRE
     un'eccezione, rendendo la carta impossibile da attivare in
     qualunque momento reale del gioco. Il filtro Attributo FUOCO andava
     dentro `onOwnMonsterDestroyed` stesso (dove ora è), non in
     `canActivate` (che non ha bisogno di alcuna condizione extra: la
     Trappola è sempre attivabile con la normale tempistica). **Metodo
     per un futuro audit di deck simile**: un harness Playwright che
     richiama OGNI hook (`canActivate`/`activate`/`static`/`onSummon`/
     ecc.) di ogni carta del mazzo con un board minimo popolato,
     catturando le eccezioni — individua in pochi secondi bug come
     questo che altrimenti richiederebbero di giocare a mano fino a
     pescare la carta giusta nel momento giusto (falsi positivi vanno
     comunque scartati a mano: `activate()` delle Trappole Contatore
     189/689/752 nell'audit lanciava un errore perché il test non
     allestisce `gameState.chain`, precondizione che `canActivate()`
     garantisce già nel gioco reale). Il mazzo Spellcaster ha ricevuto
     anche il fix del bug #2 (Maga della Fede, id 588, è nel suo pool) e
     del bug #3 (Vortice Fulmineo, id 729).
  5) **Nessuna carta di questo motore "aspettava" un modale/scelta
     aperta**: `phaseTransitionTimeout` (cambi fase, inizio turno del
     bot) usava `setTimeout` puro ovunque, senza alcun controllo se un
     modale o una scelta fosse ancora a schermo — causa concreta della
     "sovrapposizione" del bug #10 qui sotto. Nuovo
     `isBlockingModalOpen()` (game-flow.js): vero se un
     `.modal-backdrop.open` (activateModal/cardListPickerModal/
     surrenderModal), un `#quickPopover` (creato/rimosso da
     openQuickPopover/closeQuickPopover), o una selezione
     "clicca sul campo" (`gameState.pendingTributeSummon`/
     `pendingHandDiscard`) sono presenti — un unico punto invece di
     ripetere la lista a mano ad ogni nuovo controllo futuro. Nuovo
     `schedulePhaseTransition(fn, delay)` sostituisce OGNI
     `phaseTransitionTimeout = setTimeout(...)` di game-flow.js: se al
     momento di scattare c'è ancora una scelta bloccante aperta, si
     riprova dopo 300ms invece di procedere. Il ciclo autonomo del bot
     (bot.js) non è stato toccato (già protetto in gran parte da Promise
     dedicate attorno alle proprie scelte note, vedi il commento in
     `botTurn`) — dato che `changeTurn` stesso ora aspetta, il turno del
     bot non può nemmeno INIZIARE finché il giocatore ha qualcosa aperto.
  6) **Nessun indizio visivo che una Carta Equipaggiamento fosse
     agganciata a un mostro**: nuovo `renderEquipLinks()` (game-flow.js),
     chiamato alla fine di `updateUI()` e nel resize debounced — disegna
     una linea tratteggiata dorata animata (nuovo SVG dedicato
     `#equip-links-svg`, z-index più basso della freccia d'attacco) tra
     ogni Carta Equipaggiamento scoperta (`slot.card.equippedToUid`) e il
     mostro a cui è agganciata, per ENTRAMBI i lati (un equip può restare
     agganciato a un mostro dell'avversario, es. Flamberge del Male
     Infranto id 727). Selettore `[data-uid="..."]` su un attributo già
     scritto da ogni carta renderizzata — nessun nuovo hook di rendering
     necessario.
  8) **`DuelEngine.trySpecialSummonFromHand` forzava SEMPRE Posizione di
     Attacco** per qualunque carta si auto-Special-Summona dalla mano
     (33 carte, es. Guardian Eatos id 523, Il Demone Megacyber id 467) —
     per regolamento reale, se un effetto Special Summona senza
     specificare la Posizione, sceglie chi CONTROLLA quella Summon.
     Nuovo `gameState.pendingSpecialSummonPosition` (consumato
     sincronamente da `trySpecialSummonFromHand`, mai un picker al suo
     interno — stesso principio già in uso per
     `pendingSpecialSummonBanishUids`/`TributeUids`) + nuovo
     `finishSpecialSummonFromHand(card, handIndex)` (actions.js): chiede
     Attacco/Difesa (`DuelEngineUI.openPositionPicker`) PRIMA di
     chiamare `trySpecialSummonFromHand`, a meno che
     `def.specialSummonFixedPosition` non fissi la Posizione per le
     carte il cui testo reale la specifica (es. Gilasaurus id 266:
     sempre scoperto in Attacco, verificato — l'unica marcata finora, le
     altre 32 restano a chiedere per default, il comportamento corretto
     quando non si è certi del testo esatto). **Scope volutamente
     ristretto**: le carte che hanno GIÀ un costo a scelta multipla
     (bandisci/tributa/sacrifica N carte, es. Inferno 677/Fenrir 698/
     Teschio Evocato Toon 486) NON chiedono anche la Posizione — impilare
     una seconda scelta asincrona sopra un costo già a scelta avrebbe
     rotto l'assunzione "il costo appena scelto fa procedere SUBITO la
     Summon" su cui contano diversi test già verificati (scoperto
     rompendo 2 test in un primo tentativo, poi ristretto). Il loro testo
     reale fissa comunque quasi sempre Attacco per questo tipo di Summon
     "di rivincita" — comportamento invariato per loro.
  9) Stessa causa/stessa soluzione del bug #2 — il refresh leggero dopo
     ogni scelta asincrona (picker E popover) risolve anche il sintomo
     più generico "a volte non si refreshano le carte nel campo".
  10) Stessa causa/stessa soluzione del bug #5 — `schedulePhaseTransition`
      impedisce che un cambio fase o l'inizio del turno del bot si
      sovrappongano a un modale/scelta ancora aperti.
  Suite motore 59/59 verde (un test è stato rotto e richiuso 2 volte nel
  corso di questa stessa sessione, vedi il bug #2 sopra per la causa
  reale trovata grazie a quel fallimento).
- ✅ **Audit di sessione successiva su richiesta esplicita dell'utente
  ("controlla se ci sono altri bug negli structure deck")**: esteso
  l'harness Playwright del bug #4/7 qui sopra (nato per SD3/SD6) a TUTTE
  e 10 le Structure Deck (SD1-SD10, `js/data/starter-structure-decks.js`,
  265 carte uniche) — nessun nuovo bug "lancia un'eccezione" trovato
  oltre a id 690 (già chiuso). Raffinato l'harness per eliminare i falsi
  positivi del primo giro: `static()` ora riceve un vero `ctx.slot`
  (come lo passa davvero `recomputeStaticEffects`) e `activate()` viene
  chiamato SOLO se `canActivate()` dice di sì (la garanzia che il motore
  reale offre sempre) — senza questi due accorgimenti, OGNI Carta
  Equipaggiamento del dataset (`def.isEquip`) risulta un falso "bug" nei
  suoi hook `static`/`activate` quando testata isolata senza un vero
  bersaglio agganciato, dato che `recomputeStaticEffects` normalmente
  intercetta e ripulisce un equip non valido PRIMA di chiamare
  `static()` — mai raggiungibile con un bersaglio mancante nel gioco
  reale. **Metodo utile per un futuro audit simile**: se un nuovo giro
  di stress-test su `canActivate` isolato segnala un errore per una
  carta con `def.isEquip: true`/`def.continuous: true`, verificare PRIMA
  se serve solo un `ctx.slot`/una guardia `canActivate` mancante
  nell'harness stesso, non nel motore.
- ✅ **Pila della Catena (Chain) — nuova UI, richiesta esplicita
  dell'utente ("gestisci meglio lato UI le catene di botta e risposta
  di magie/trappola tra i giocatori")**: prima l'unico segnale di una
  Chain in corso era il pulse "carta a centro schermo" (una carta alla
  volta, sparisce subito) più una riga nel log (pannello chiuso per
  default) — niente che facesse capire a colpo d'occhio quanti Link
  fossero già impilati, di chi, o in che ordine si sarebbero risolti.
  Nuovo pannello fisso in alto al centro (`#chainStack`, HTML/CSS in
  duelMonstersCore.html + `renderChainStack()` in game-flow.js): una
  miniatura per ogni Link accumulato (il primo a sinistra, ogni risposta
  successiva a destra), etichetta "Link N" stabile per tutta la vita del
  link (`link.linkNumber`, assegnato una sola volta quando il link viene
  aggiunto — mai ricalcolato dall'indice nell'array, che cambia ad ogni
  pop durante `resolveChain`), quello evidenziato/pulsante è sempre
  l'ULTIMO aggiunto (vera Chain LIFO: si risolve per primo). Popolato da
  3 punti in duel-engine.js (`openActivationWindow` al link iniziale,
  `askNextRound` ad ogni risposta accumulata, `resolveChain` ad ogni
  link rimosso/risolto) — game-flow.js resta senza dipendenze dal motore
  (la funzione è chiamata da duel-engine.js, mai il contrario). Anche il
  modale "🛡️ Rispondere?" (actions.js) ora indica il numero di Link a
  cui si starebbe per rispondere.
  **Bug reale introdotto e corretto nella stessa sessione**: il primo
  tentativo ritardava la rimozione REALE del link da `chain.links` fino
  a DOPO il suo pulse (~2s), per tenerlo visibile/evidenziato nella pila
  più a lungo — questo però allargava la finestra in cui l'array
  condiviso conteneva un link "già in lavorazione", e un
  `resolveChain()` RIENTRANTE scatenato dal ciclo naturale della pagina
  (bot/cambio fase, mai del tutto fermabile da `freezeNaturalGameLoop`
  nei test — vedi tests/README.md) poteva vederlo ancora in cima e
  interferire con la sua risoluzione: un test esistente
  (`chain-resolution.spec.js`, Caso 3) lo ha catturato immediatamente,
  fallendo in modo deterministico. Corretto ripristinando la rimozione
  IMMEDIATA e sincrona di sempre (`chain.links.pop()` in testa a
  `resolveNext`, invariata rispetto a prima di questa sessione) e
  passando il link già rimosso a `renderChainStack(link)` come "voce
  fantasma" SOLO per la visualizzazione (aggiunta in coda all'array
  reale via spread, mai reinserita in `gameState.chain.links`) — stessa
  UI finale, zero rischio sull'architettura di risoluzione. **Lezione
  per una futura modifica alla Chain**: non ritardare MAI la rimozione
  di un link da `gameState.chain.links` per motivi puramente di
  presentazione — se serve mostrarlo ancora un istante, passarlo
  esplicitamente al layer di rendering come dato a parte, mai lasciarlo
  più a lungo del necessario nella struttura dati condivisa e
  potenzialmente rientrante.
- ✅ **Collegamento visivo Equip (bug della sessione precedente)
  segnalato dall'utente come "non sembra funzionare"** — verificato: la
  linea SVG veniva creata correttamente (coordinate giuste, DOM
  presente), ma era di fatto INVISIBILE nel caso più comune (equip e
  mostro nella stessa colonna, slot verticalmente adiacenti): 1) la
  linea centro-a-centro passava esattamente sotto il badge ATK/DEF
  (`.field-stats-badge`, anch'esso centrato) che la copriva quasi del
  tutto, 2) un tratto sottile (2.5px, dash-array fitto) restava
  impercettibile su un segmento di poche decine di px contro uno sfondo
  già affollato — confermato SOLO con uno screenshot Playwright
  ravvicinato (una verifica "esiste nel DOM" da sola non basta per un
  bug di percezione visiva, va guardato per davvero). Corretto in
  `renderEquipLinks()` (game-flow.js): i due punti di aggancio si sono
  spostati dal centro al 28% della larghezza di ciascuna carta (bordo
  sinistro, fuori dal badge), tratto portato a 4px con bagliore doppio,
  e due pallini pieni alle estremità (restano un indizio chiaro anche a
  segmento cortissimo). **Lezione per un futuro effetto visivo simile**:
  non fermarsi a "l'elemento esiste con le coordinate giuste" come prova
  di funzionamento — se l'effetto deve essere notato dall'utente durante
  il gioco normale, verificarlo con uno screenshot ravvicinato della
  scena reale (qui: due carte impilate verticalmente, il caso più
  comune), non solo con un controllo programmatico sul DOM.
- ✅ **Gestione salvataggi Cloud/Locale dal Profilo, ripulita — richiesta
  esplicita dell'utente ("non si capisce bene cosa si può/deve fare...
  è anti UI")**: la sezione "Account Cloud" (profilo.html + la vista
  fusa in index.html) portava ancora un intero form di accesso/
  registrazione/recupero password (`#cloudLoggedOut`, email+password+
  "Password dimenticata?") residuo di QUANDO il cloud era facoltativo —
  da quando un account approvato è diventato OBBLIGATORIO per giocare
  (auth-gate.js blocca ogni pagina prima ancora di arrivarci), quel form
  non poteva più comparire per davvero, ma restava lì a generare
  l'esatta domanda "devo accedere di nuovo?" lamentata dall'utente.
  Rimosso del tutto (HTML + handler + il modale "recupera password"
  dedicato, ormai irraggiungibile — il vero recupero password vive solo
  nel Gate di index.html, PRIMA del menu). La sezione ora mostra solo
  "Connesso come X" + una frase che spiega QUANDO scatta la
  sincronizzazione automatica (all'uscita/cambio account) + "Esci
  dall'account", con "Sincronizzazione manuale (avanzato)" ed "Elimina
  account cloud" chiusi dentro due `<details>` separati (aperti solo se
  servono davvero, invece di un muro di pulsanti sempre visibile). La
  sezione "Salvataggio locale" è stata rinominata "Backup manuale su
  file" con una frase che ne chiarisce lo scopo (copia extra facoltativa,
  non un secondo salvataggio da mantenere aggiornato a mano). **Bug reale
  trovato e corretto nello stesso giro**: "Cambia account" nella pagina
  STANDALONE `profilo.html` non aveva mai ricevuto il fix già applicato
  alla vista Profilo fusa in index.html in una sessione precedente (vero
  `CloudSync.signOut()` prima di ricaricare, non solo pulire
  `sessionStorage`) — le due copie erano andate alla deriva, esattamente
  il rischio "stessa lista di script/markup duplicata a mano in più
  pagine" già documentato altrove in questo file. Applicato lo stesso fix
  a entrambe. Verificato con Playwright (nessun errore JS, elementi morti
  spariti, `<details>` presenti) su entrambe le pagine — nessun test
  Playwright dedicato esiste per il flusso cloud reale (serve un vero
  account Supabase, coerente con la nota già esistente su questo limite).
- ✅ **Audit UI/UX mobile/APK esplicito ("controllo qualità... in ottica
  mobile apk") + 4 correzioni scelte dall'utente ("1 3 e 5" + il pulsante
  Indietro della topbar)**:
  - **Trovato e corretto durante l'audit stesso, prima di qualunque
    richiesta**: `renderEquipLinks()` (game-flow.js, nato la sessione
    precedente) poteva andare in crash se il listener `resize` scattava
    PRIMA che `gameState` fosse popolato dal boot del duello (es. una
    rotazione schermo/tastiera virtuale molto precoce) — aggiunta una
    guardia difensiva (`if (!gameState.playerSTField...) return;`).
  - **1) Tasto Indietro Android durante un duello**: verificato con un
    test dedicato (Capacitor/App plugin mockati) che il meccanismo
    `pushState`/`popstate` già esistente in `setupSurrenderButton()`
    (game-flow.js) COPRE GIÀ il caso comune (Capacitor chiama
    `window.history.back()`, che scatena comunque `popstate`) — l'audit
    iniziale aveva sovrastimato il rischio non avendo ancora letto questo
    meccanismo. Resta un caso limite reale: se `Capacitor.canGoBack`
    risultasse `false` (stato interno della WebView, non sempre garantito
    allineato subito dopo un `pushState`), il default di
    `app-back-button.js` ricadrebbe su `AppPlugin.exitApp()`, uscendo
    dall'app a metà duello senza alcuna conferma. Chiuso registrando ANCHE
    un `NativeBackButton.setHandler()` dedicato: se il modale di conferma
    è già aperto lo chiude (= Annulla), altrimenti lo apre sempre lui,
    mai lasciando scattare il default durante un duello in corso.
    **Multiplayer NON coperto** (il pulsante Abbandona stesso è già
    nascosto lì: abbandonare richiederebbe avvisare l'altro giocatore,
    un vero protocollo di rete mai costruito — segnalato come gap
    separato, più profondo di un semplice fix UI, non affrontato qui).
  - **3) Pulsante "Abbandona" troppo piccolo per il tocco** (fino a
    ~19px di altezza reale sui breakpoint più stretti): area
    CLICCABILE allargata di 10px per lato con uno pseudo-elemento
    invisibile (`::before` assoluto, scoped dentro `@media
    (max-width:900px)`) — non sposta né ridimensiona badge vicini
    (Tempo/Difficoltà, impilati nello stesso angolo con poco spazio
    verticale), solo la zona di tocco vera. Aggiunto anche un vero stato
    `:active` (schiacciato al tocco, prima assente) e un filo di padding
    visivo in più sul breakpoint principale.
  - **5) Pannello "Descrizione carta" troppo ingombrante su schermi
    piccoli** (apriva su ogni tap di una carta, fino a metà larghezza
    schermo e all'82% dell'altezza): `--info-card-w` ridefinita SOLO
    dentro `.card-info-panel` (scoped, mai la variabile globale in
    `:root` usata altrove per la stessa dimensione base) a un valore più
    piccolo, `max-height` portata da 82dvh a 62dvh — lascia visibile
    molto più campo di gioco dietro/intorno mentre il pannello resta
    aperto. Il tap-fuori-per-chiudere esisteva già (non era il problema
    reale, l'audit iniziale l'aveva segnalato per errore).
  - **Pulsante Indietro della topbar condivisa (`js/ui/topbar.js`/
    `.css`, 11+ pagine) — richiesta esplicita dell'utente ("è scomodo...
    fai tutto molto più app telefono, MA SENZA cambiare la versione
    desktop")**: diventava PIÙ PICCOLO su mobile (28px, poi 26px in
    landscape basso) invece che più grande — l'opposto di quanto serve
    per un tocco preciso col dito. Portato a 44px (lo standard
    Material/HIG per un'area di tocco comoda) sul breakpoint principale,
    38px nel solo caso limite di landscape molto basso (spazio verticale
    insufficiente per 44px pieni). Aggiunto anche un vero stato `:active`
    (mai esistito: solo `:hover`, inutile su touchscreen) e un tocco
    "app vera" — `NativeHaptics.light()` (già esistente in
    `js/native/haptics.js`, no-op su web) ad ogni tap sul pulsante.
    **Entrambe le modifiche scoped dentro i due `@media` già dedicati al
    mobile**: la regola desktop (40px, solo `:hover`) resta bit-per-bit
    identica, verificato esplicitamente con Playwright a 1280px.
  Suite motore 59/59 verde (nessun file del motore vero e proprio
  toccato per i punti 3/5/topbar, solo CSS/HTML + il fix del back-button
  in game-flow.js per il punto 1).

## Carte con limiti noti (da riprendere)

Fonte di verità: `grep missingEffectNote data/cards.json` (35 risultati
al 2026-09-04, salito da 13 dopo un audit di sessione mirato: cercate
tutte le occorrenze di "SEMPLIFICAZIONE: manca..."/"manca il/la/l'..."
in card-effects.js e incrociate a mano con cards.json — alcune erano
commenti VECCHI mai ripuliti dopo che una "CORREZIONE di fedeltà" più
sotto aveva già risolto il problema, altre erano gap REALI mai
tracciati prima. **Lezione per un futuro giro simile**: quando si legge
un commento "manca X" per giudicare se è ancora vero, leggere SEMPRE
abbastanza codice DOPO quel commento prima di concludere — in questa
sessione un giudizio troppo affrettato su id 153 ha prodotto un falso
positivo, corretto solo dopo essersi accorti che la clausola "mancante"
era già implementata poco più sotto nello stesso blocco.):
- 9 carte Categoria B "checkpoint di targeting" — 115, 235, 353, 622,
  661, 738, 761, 826, 851;
- 3 carte Categoria B "Effetto Veloce solo in risposta a una Chain già
  aperta" — 192, 396, 459;
- **id 630 (Spirit Ryu), un tempo l'unica Categoria A genuinamente
  aperta di questo gruppo, è stata chiusa in una sessione successiva a
  quella che ha scritto questa lista** (nessun `missingEffectNote`
  residuo su id 630 in `data/cards.json`, testo effetto già allineato
  al reale: `onOwnAttackDeclare`, già esistente da prima per un altro
  bisogno — es. Jirai Gumo id 316 — copriva perfettamente il "questa
  carta ha appena dichiarato un attacco" che la nota originale
  affermava mancante). **Lezione per una futura sessione**: prima di
  fidarsi di una nota "serve nuova infrastruttura, mai esistita", fare
  un `grep` mirato dei nomi di hook plausibili — qui sarebbe bastato
  cercare "AttackDeclare" nel file per trovare `onOwnAttackDeclare` già
  pronto all'uso.
- 22 carte NUOVE trovate in questa sessione (gap reali, sproporzionati
  da chiudere subito: richiedono nuova infrastruttura condivisa, o
  toccano un punto del motore deliberatamente ristretto per evitare
  rischi di re-entrance) — 100, 117, 125, 135, 142, 146, 154, 198, 244,
  282, 301, 392, 420, 423, 434, 469, 496, 511, 512, 523, 594, 772. Ogni
  nota spiega da sola il motivo preciso (infrastruttura mancante vs.
  rischio di toccare un punto delicato) — non serve un riassunto
  aggiuntivo qui, evitare di farlo derivare per non doverlo poi
  ri-sincronizzare a mano.

Ogni carta nell'elenco ha la nota COMPLETA in prima persona sul motore,
questa è solo una mappa per orientarsi prima di rituffarcisi.

**Il backlog "storico" pre-audit risulta ormai completamente esaurito**:
id 630 (Spirit Ryu), l'unica carta rimasta genuinamente aperta di quel
gruppo, è stata chiusa in una sessione successiva (vedi il bullet qui
sopra). Le altre 12 carte di quel gruppo originario sono Categoria B:
già implementate per intero, la nota è solo un promemoria di un limite
strutturale già accettato altrove nel motore. Due famiglie di limite
diverse, non confonderle:

**Limite "checkpoint di targeting condiviso"** (`ctx.declareTarget`,
`duel-engine.js`, nato per id 115) — copre ~68/823 chiamate nel dataset
(conta reale ad ogni sessione con `grep -c '\.declareTarget(' js/engine/card-effects.js`,
il numero cresce quando si aggiungono nuove carte: non fidarsi di una
cifra fissa scritta qui, ricontrollarla), non l'intero dataset. Da
questa sessione esiste anche `ctx.destroyTargetedMonster` (vedi il
bullet dedicato qui sopra) — combina `declareTarget`+`destroyMonster` in
una chiamata sola per il caso "distruggi 1 mostro bersaglio", il più
comune: usarlo SEMPRE per una carta nuova con quell'esatto schema invece
di scrivere le due chiamate a mano, più facile da dimenticare. Un test
guardrail (`targeting-checkpoint-guardrail.spec.js`) impedisce che il
numero di chiamate scenda sotto una soglia nota (regressione silenziosa
= qualcuno ha rimosso una chiamata senza sostituirla). Non serve
tornarci a meno di trovare in futuro una carta specifica non coperta:**

115 (Gran Scudo Gardna), 235 (Specchietto della Fata), 353 (Signore dei
D.), 622 (Spostamento), 661 (Mietitore Spirituale), 738 (Mago Comando
del Caos), 761 (Criosfinge — 19/823 carte "torna in mano" migrate), 826
(Ingegnere Ingranaggio Antico), 851 (Metalmorfosi Rara).

**Limite "Effetto Veloce solo in risposta a una Chain già aperta"**
(`findSpellTrapQuickEffectCandidates`/`findMonsterQuickEffectCandidates`,
`duel-engine.js`) — nessuna carta di questo motore può attivarsi "a
piacere" in un momento del turno avversario in cui non sta succedendo
nulla, solo in risposta a un'attivazione già in corso. Non serve
tornarci a meno di una richiesta esplicita di costruire una vera
finestra di priorità ad ogni cambio fase (grosso cambiamento al game
loop centrale, vedi sopra):**

192 (Santuario Oscuro), 396 (Spada Sigillante di Orichalcos), 459 (Ninja
d'Assalto).

## Test: insidie note

Sotto carico (headless + CPU condivisa) un `page.waitForTimeout(N)`
fisso può far leggere lo stato PRIMA che l'animazione/timeout nel
motore sia davvero completato — trovato e corretto concretamente in
`battle-resolution.spec.js` (ora aspetta il vero callback `onComplete`
di `resolveAttack`, non un tempo indovinato). Se un nuovo test deve
aspettare un'azione asincrona del motore, preferire `waitForFunction`
su un segnale vero (`onComplete`, un cambio di `gameState`) invece di
un `waitForTimeout` fisso.

Un mismatch controllato dal test contro un effetto **genuinamente
casuale** del motore (es. Criosfinge id 761, `Math.random()` in
`discardRandomFromHand`) non è un bug del motore — l'asserzione va
scritta per tollerare l'esito casuale legittimo, non per assumere un
solo esito possibile (vedi il fix in
`return-to-hand-mechanism.spec.js`).

**Playwright e la policy di autoplay audio: l'intera sessione di test
parte già "attivata"**, non solo le chiamate dentro `page.evaluate()`
(limite più stretto già noto e documentato più sopra in questo file, sotto
i giri di sessione sull'audio). Verificato empiricamente in questa
sessione: `navigator.userActivation.isActive`/`.hasBeenActive` risultano
già `true` nel browser Chromium lanciato da Playwright PRIMA di
qualunque input simulato, e un `audio.play()` diretto (nessun gesto,
nessun click, nessun `page.evaluate()` di mezzo) va comunque a buon
fine. Conseguenza pratica: **non è possibile verificare con Playwright,
in questo progetto, se un tipo di evento specifico (es. un semplice
`mousemove`) sblocchi DAVVERO l'autoplay bloccato in un browser reale**
— qualunque test del genere risulterebbe un falso positivo per
costruzione, non una prova. Per una futura richiesta simile
("verifica che X sblocchi l'audio"), fidarsi della documentazione nota
delle policy dei browser (solo interazioni discrete — click/tap/tasto/
rotellina — sbloccano l'autoplay; un mero movimento del mouse non è mai
elencato da nessun browser/libreria nota come evento di sblocco), non di
un test Playwright che sembra "passare".

## Git

Autore singolo, storia pulita. Pattern osservato in sessione: commit
mirati per singolo cambiamento logico, push subito dopo ogni commit
(non accumulare commit locali non pushati) — a meno di istruzione
esplicita diversa dell'utente.
