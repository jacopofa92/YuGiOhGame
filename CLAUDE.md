# YuGiOhGame — contesto per Claude

Duello Yu-Gi-Oh completo in HTML/JS puro, **nessun build, nessun bundler,
nessun framework**: ogni pagina è un file `.html` apribile anche solo con
doppio click (`file://`), con `<script src="...">` in sequenza fissa.
Autore unico (Jacopo/jacopofa92), repo Git a un solo branch attivo (`main`).

**Rispondi sempre in italiano in chat** in questo progetto (preferenza
esplicita dell'utente, vale per ogni sessione).

## Avvio e test rapidi

- Il gioco stesso non ha comandi di build: si apre direttamente
  `yugioh_game.html` (o le altre pagine) nel browser.
- **"Duello Demo" (`yugioh_game.html`) è il banco di prova standard** per
  ogni modifica alla logica di duello — è dove va verificata a mano
  qualunque modifica prima di considerarla finita. Nota: il suo stato
  iniziale non rispecchia perfettamente un duello vero (vedi
  `js/engine/duel-sandbox.js`) — se un test lì fallisce in un modo strano,
  verifica prima che non sia un limite della sandbox stessa.
- `npm test` esegue la suite di regressione Playwright in `tests/`
  (26 spec ad oggi) — vedi `tests/README.md` per la struttura e come
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
js/data/     cards-data.generated.js (NON editare a mano, vedi sotto), cards-db.js, deck/personaggi
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
  altre no).
- `gameState` è un "God Object" (100+ proprietà top-level, letto/scritto
  da oltre 1000 punti) — nessuna incapsulazione/validazione.
- `actions.js` e `game-flow.js` non usano il pattern IIFE (a differenza
  di `duel-engine.js`/`card-effects.js`): ogni funzione top-level lì è un
  vero global su `window`.
- Nessun linting/formatting configurato, nessun cache-busting sui tag
  `<script>`.
- 13 carte hanno ancora un `missingEffectNote` in `data/cards.json` — vedi
  la sezione dedicata subito sotto.
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
  degli Inferi (id 498). **Chiarisce l'analisi precedente su id 498/808**
  (che sembravano entrambi bloccati dalla stessa "rimozione
  decentralizzata"): id 498 chiedeva di REINDIRIZZARE una rimozione già
  in corso verso il Cimitero — soluzione "correggi SUBITO DOPO" (il
  chiamante ha già spostato la carta, il redirect la sposta di nuovo,
  nessuna intercettazione PRIMA della rimozione necessaria), quindi
  trattabile toccando solo i pochi punti che mandano un MOSTRO al
  Cimitero. id 808 è strutturalmente diverso: deve invece IMPEDIRE una
  rimozione (bando) già PRIMA che avvenga, non correggerla dopo — questo
  stesso pattern "dopo" non si applica, resta il problema reale
  descritto nella sua riga in tabella qui sotto.
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

## Carte con limiti noti (da riprendere)

Fonte di verità: `grep missingEffectNote data/cards.json` (13 risultati
al 2026-09-03, dopo la chiusura di id 8 Spada Rivelatrice, id 79 Un
Oceano Leggendario, id 160 Potere Raccolto, id 285 Guardiano Kay'est,
id 404 Drago Nero Pece, id 486 Teschio Evocato Toon, id 498 Cerchio
degli Inferi, id 600 Trappola Fasulla, id 636 Campo di Riryoku, id 652
La Perla del Drago, id 689 Scudo Magico Tipo-8, id 737 Mago Apprendista
e id 770 Drenaggio Magico, e dopo la rimozione della nota — senza altro
lavoro da fare — su id 363 e id 371) — ogni carta lì ha la nota
COMPLETA in prima persona sul motore, questa è solo una mappa per
orientarsi prima di rituffarcisi.
**id 192 (Santuario Oscuro) e id 396 (Spada Sigillante di Orichalcos)
quasi complete**: entrambe hanno ancora una nota, ma solo per una
SEMPLIFICAZIONE residua onesta, non lavoro vero rimasto di peso
paragonabile al resto della tabella. id 192: implementata l'intera
meccanica Destiny Board (vedi sopra) — manca solo che il Mostro
generato da Santuario Oscuro sia "immune agli effetti Carta eccetto
Destiny Board" (ha comunque l'immunità al targeting d'attacco). id 396:
implementate sia la clausola base sia l'estensione via Field Zone
(repeatableWhileContinuous + store di durata separato, vedi sopra) —
resta scoperta solo la terza clausola (Effetto Veloce
scarta-per-distruggere, utilizzabile durante il turno avversario),
genuinamente fuori scala: nessun meccanismo in questo motore offre
un'abilità attivabile "a piacere" durante il turno altrui fuori da un
trigger specifico (onAttackDeclare, onCardActivated, ecc.). Due
categorie ben diverse, non confonderle:

**A) Clausola dell'effetto reale ancora mancante (lavoro vero da fare)**

| id | Carta | Cosa manca |
|---|---|---|
| 192 | Santuario Oscuro | solo l'immunità agli effetti Carta del Mostro generato (nicchia, vedi sopra) |
| 396 | Spada Sigillante di Orichalcos | manca solo l'Effetto Veloce scarta-per-distruggere (fuori scala, vedi sopra) |
| 781 | Roc dalla Valle della Foschia | lo scarto-come-costo di altre carte resta scritto a mano singolarmente, nessun aggancio condiviso |
| 808 | Uovo Giurassico Miracoloso | manca "non può essere bandita finché scoperta sul Terreno" (rimozione decentralizzata su ~28 chiamanti di ACTIONS.banish, non un solo choke point — vedi sopra) |

**B) Già implementate per intero — la nota è solo un promemoria che il
checkpoint di targeting condiviso (`ctx.declareTarget`, `duel-engine.js`,
nato per id 115) copre 64/823 carte, non l'intero dataset. Non serve
tornarci a meno di trovare in futuro una carta specifica non coperta:**
115 (Gran Scudo Gardna), 235 (Specchietto della Fata), 353 (Signore
dei D.), 622 (Spostamento), 661 (Mietitore Spirituale), 738 (Mago
Comando del Caos), 761 (Criosfinge — 19/823 carte "torna in mano"
migrate), 826 (Ingegnere Ingranaggio Antico), 851 (Metalmorfosi Rara).

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
