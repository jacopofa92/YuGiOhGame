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
- 1 sola Categoria A genuinamente aperta, id 630;
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

**Il backlog "storico" pre-audit resta quasi esaurito: solo 1 carta,
id 630 (Spirit Ryu)**, una nicchia di timing/durata genuinamente fuori
scala per una carta sola (vedi il bullet qui sopra) — non un errore, una
scelta esplicita e ora documentata. Le altre 12 carte di quel gruppo
originario sono Categoria B: già implementate per intero, la nota è solo
un promemoria di un limite strutturale già accettato altrove nel motore.
Due famiglie di limite diverse, non confonderle:

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

## Git

Autore singolo, storia pulita. Pattern osservato in sessione: commit
mirati per singolo cambiamento logico, push subito dopo ogni commit
(non accumulare commit locali non pushati) — a meno di istruzione
esplicita diversa dell'utente.
