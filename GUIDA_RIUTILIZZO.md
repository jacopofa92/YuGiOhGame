# Guida al riutilizzo del motore — è "sandbox"?

## Risposta breve

**Sì, ma con un distinguo preciso.** Il motore (`js/engine/duel-engine.js` + `js/engine/actions.js` + `js/engine/game-flow.js` + il registro `CardEffects` in `js/engine/card-effects.js`) è ben organizzato, coerente e commentato in modo insolitamente accurato per un progetto senza build/framework — ma NON è una libreria "npm install e via": è un insieme di script globali che condividono uno scope, con un ordine di caricamento preciso da rispettare, e uno stato di gioco (`gameState`) modellato esplicitamente sulle regole di Yu-Gi-Oh (5 zone mostro, 5 zone Magia/Trappola, Life Points, Evocazione Tributo, Fusione/Rituale...).

## Come è organizzata `js/` oggi

```
js/
├── engine/     motore di gioco: duel-engine.js, actions.js, game-flow.js,
│               card-effects.js, effect-templates.js — QUESTO è "il gioco"
├── data/       dati carte/mazzi: cards-db.js, cards-data.generated.js,
│               custom-cards.js, characters-db.js, character-decks.js,
│               starter-structure-decks.js
├── ai/         IA a livelli: ai-controller.js (facciata), ai-medium.js,
│               ai-hard.js, ai-shared.js, bot.js (esecutore)
├── audio/      audio-manager.js (musica), audio-library.js (Howler),
│               sfx.js (effetti sintetizzati)
├── ui/         presentazione: card-renderer.js, effects.js,
│               visual-effects-library.js, duel-cinematics.js,
│               icon-library.js, topbar.js (topbar condivisa delle pagine
│               "menu", non del duello vero), + card.css/effects.css/
│               duel-cinematics.css/topbar.css
├── multiplayer/ network.js, mp-lobby.js, multiplayer.js
├── cloud/      cloud-sync.js, supabase-config.js (sync opzionale)
├── vendor/     librerie di terze parti vendorizzate (gsap, howler, pixi,
│               supabase-js) — mai da CDN, vedi il gotcha file:// più sotto
└── save-manager.js, duel-session.js, pwa-register.js
    (collante di pagina, non parte di un sottosistema — restano qui)
```

Per riusare DAVVERO il motore (Caso A più sotto), le cartelle che contano sono `engine/`, `ai/`, `save-manager.js` e `ui/card-renderer.js` — `data/`, `audio/`, `multiplayer/`, `cloud/` sono contenuto/features specifiche di QUESTO gioco, non della macchina.

Il valore di riuso vero cambia molto in base a COSA vuoi costruire:

| Cosa vuoi fare | Valore di riuso |
|---|---|
| Un altro gioco di carte duale a turni con carte "attivabili" e priorità di risposta (stile Yu-Gi-Oh/Magic/Hearthstone) | **Alto** — riusi il 70-80% della macchina (fasi, Chain, registro effetti, IA) cambiando solo dati e implementazioni carta |
| Un gioco di carte con meccaniche/tabellone radicalmente diversi | **Medio** — riusi i PATTERN (registro per-carta, sistema di priorità, ctx come API effetti, IA a livelli), non il codice così com'è |
| "Voglio prendere questo file ed embeddarlo in un altro progetto" | **Basso** — non è pensato per l'import: è pensato per essere LETTO e ADATTATO |

## Cosa è genuinamente riutilizzabile (i pattern, non solo il codice)

1. **`CardEffects.register(id, {...})` — registro di comportamento per-carta.**
   Ogni carta dichiara solo gli handler che le servono (`activate`, `canActivate`, `static`, `onSummon`, `onAttackDeclare`, `onOpponentSummon`, ecc. — vedi il commento in testa a `js/engine/card-effects.js` per l'elenco completo). Il motore non sa nulla del contenuto di ogni carta: chiede solo "hai questo handler?" e lo chiama. Questo pattern è game-agnostico: funzionerebbe identico per qualunque gioco a carte con "effetti quando succede X".

2. **Il sistema di Chain/priorità (`openTriggerWindow`/`openActivationWindow` in `js/engine/duel-engine.js`).**
   Un evento (Evocazione, Attacco, attivazione manuale) apre una finestra in cui l'avversario (e poi via via chi ha priorità) può incatenare le proprie carte di risposta, una alla volta, finché entrambi passano — poi si risolve in LIFO. È lo stesso principio dello "stack" di Magic: the Gathering o dei trigger di Hearthstone: riusabile per qualunque gioco con carte "istantanee"/di risposta, cambiando solo i nomi dei TRIGGER (oggi molto specifici di Yu-Gi-Oh: `ON_NORMAL_SUMMON`, `ON_ATTACK_DECLARE`...).

3. **`ctx` — l'API che un effetto vede.**
   Ogni handler riceve un contesto con `ctx.owner/opponent`, `ctx.field()/hand()/graveyard()/stField()`, più `ACTIONS` (in `js/engine/duel-engine.js`: `destroyMonster`, `dealDamage`, `drawCards`, `specialSummon`, `grantTemporaryAtkDefBonus`...). È la vera "API pubblica" del motore per chi scrive effetti — pulita, coerente, mai è servito rompere questo contratto in tutta la sessione che ha aggiunto ~300 carte.

4. **`js/ai/ai-controller.js` (facciata) + `ai-medium.js`/`ai-hard.js` (livelli intercambiabili).**
   `js/ai/bot.js` (l'esecutore) parla SOLO con `BotAI.*`, mai con un livello specifico — aggiungere/cambiare un livello di difficoltà non tocca mai l'esecutore. Pattern da strategy/facade, riusabile per qualunque IA a livelli.

5. **`effectTemplate`/`cloneEffectOf` (`js/engine/effect-templates.js`, `js/data/custom-cards.js`) — contenuto "low-code".**
   Una carta può dichiarare un effetto parametrico riusabile o clonare l'effetto di un'altra carta già scritta, invece di richiedere codice nuovo — la base tecnica dietro il Card Maker (`crea-carta.html`). Pattern riusabile per qualunque registro di contenuti espandibile dall'utente.

6. **Persistenza in `localStorage`, zero backend (`js/save-manager.js`, `js/data/custom-cards.js`).**
   Un solo blob JSON per il salvataggio, funzioni `load()/touch()` con retrocompatibilità automatica (un salvataggio vecchio senza un campo nuovo viene "riparato" al volo). Pattern riusabile per qualunque gioco browser offline-first.

## Cosa NON è generico — va riscritto per un gioco diverso

- **`gameState`** è un oggetto piatto con campi Yu-Gi-Oh-specifici cablati ovunque (`playerMonsterField`/`botMonsterField`, 5 slot fissi, `playerSTField`, `playerFieldSpell`, `playerLP`, `phase` con i nomi esatti `draw`/`standby`/`main1`/`battle`/`main2`/`end`). Un gioco con un tabellone diverso richiede toccare praticamente ogni file che legge questi campi.
- **Le regole di Evocazione** (Tributo in base al Livello, Set coperto, Fusione da Extra Deck, Rituale via Magia dedicata) sono scritte a mano in `js/engine/duel-engine.js`/`js/engine/actions.js`, non parametrizzate.
- **Le ~800 implementazioni carta** in `js/engine/card-effects.js` sono ovviamente specifiche di queste carte — zero valore fuori da un progetto Yu-Gi-Oh (attenzione anche ai diritti: sono nomi/testi di carte reali Konami, tenerli fuori da qualunque progetto non-fan/commerciale).
- **Il rendering** (`js/ui/card-renderer.js`, `js/ui/card.css`) replica il layout grafico di una vera carta Yu-Gi-Oh — riusabile solo come RIFERIMENTO per "come strutturare un renderer di carte", non copiabile direttamente per un altro gioco con un layout diverso.

## Se vuoi DAVVERO riusarlo: percorso consigliato

**Caso A — un altro gioco di carte simile (2 giocatori, zone, fasi, effetti attivabili):**
1. Copia le cartelle `js/engine/`, `js/ai/` (incluso `bot.js`), `js/ui/card-renderer.js` + `js/ui/card.css`, e il file `js/save-manager.js` in un nuovo progetto.
2. Svuota `card-effects.js`: tieni solo l'impianto in fondo (`registerLibraryEffects`) e il commento con l'elenco degli handler supportati.
3. Ridisegna `gameState` per il TUO tabellone (numero di zone, nomi di fase) — è l'unico vero refactor strutturale, tutto il resto segue.
4. Ridefinisci `TRIGGER` in `duel-engine.js` con gli eventi del tuo gioco.
5. Scrivi le tue carte con lo stesso schema `{ id, name, type, ... }` + `CardEffects.register`.

**Caso B — un gioco diverso, vuoi solo "ispirarti":**
Leggi (non copiare) `js/engine/duel-engine.js` per il sistema di Chain e il pattern `ctx`, `js/ai/ai-controller.js` per la facciata IA a livelli, `js/data/custom-cards.js`/`js/engine/effect-templates.js` per il pattern "contenuto utente senza codice". Riscrivi da zero il resto sul tuo dominio.

## Gotcha da non riscoprire da capo

- **Nessun bundler**: l'ordine dei `<script>` nell'HTML è l'unica cosa che garantisce che una variabile globale esista quando serve (es. `js/ui/card-renderer.js` deve caricarsi prima di qualunque pagina che chiami `createCardElement`). Cambiare l'ordine rompe silenziosamente qualcosa a runtime, mai a "compile time" — non esiste compile time. Lo stesso vale se sposti ancora dei file: ogni `<script src="js/...">` in tutte le pagine HTML (e la lista di precache in `sw.js`) va aggiornato a mano insieme, altrimenti fallisce silenziosamente (404).
- **`file://` vs `http(s)://`**: `fetch()` e i Service Worker non funzionano aperti come file locale a doppio click — da cui l'uso di `<script>` invece di `import`/`fetch` per i dati (`cards-data.generated.js` invece di leggere `cards.json` via fetch) e `html5: true` su Howler (`audio-library.js`).
- **`ctx.card` cambia significato in base al trigger**: per un'auto-attivazione (`onSummon`) è RISERVATO alla carta di chi RISPONDE, non alla carta evocata (quella è `ctx.summonedCard`) — un bug reale caduto in questa trappola durante la sessione (Tsukuyomi, id 739).
- **Le Trappole non si attivano mai dalla mano**: un invariante di regole che va difeso esplicitamente in ogni nuovo punto che tocca l'attivazione manuale o le finestre di risposta (vedi il commento su `findTriggerCandidates` in `duel-engine.js`) — non è garantito automaticamente dall'architettura, va controllato a mano.
