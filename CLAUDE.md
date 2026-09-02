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
  (16 spec ad oggi) — vedi `tests/README.md` per la struttura e come
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
- 27 carte hanno ancora un `missingEffectNote` in `data/cards.json` — vedi
  la sezione dedicata subito sotto.

## Carte con limiti noti (da riprendere)

Fonte di verità: `grep missingEffectNote data/cards.json` (27 risultati
al 2026-09-02, dopo la chiusura di id 8 Spada Rivelatrice) — ogni carta
lì ha la nota COMPLETA in prima persona sul motore, questa è solo una
mappa per orientarsi prima di rituffarcisi. Due categorie ben diverse,
non confonderle:

**A) Clausola dell'effetto reale ancora mancante (lavoro vero da fare)**

| id | Carta | Cosa manca |
|---|---|---|
| 79 | Un Oceano Leggendario | riduzione di Livello per i mostri ACQUA (solo il bonus ATK/DEF è fatto) |
| 160 | Potere Raccolto | distruzione di sicurezza se l'Equip finisce su un bersaglio non più valido |
| 192 | Santuario Oscuro | interazione con "Destiny Board" — meccanica di vittoria alternativa assente dal motore |
| 285 | Guardiano Kay'est | immunità solo al targeting diretto, non a Magie di massa che non scelgono bersaglio |
| 363 | Cappelli Magici | nessuna vera mescolata delle 3 caselle (valutato: nessun equivalente meccanico utile, coperte già nascoste) |
| 371 | Maschera della Restrizione | copre solo i 2 meccanismi di Sacrificio noti del motore, non un futuro costo scritto a mano |
| 396 | Spada Sigillante di Orichalcos | mancano 2 clausole su 3 (estensione con Field Zone; Effetto Veloce scarta-per-distruggere) |
| 404 | Drago Nero Pece | manca lo stacco volontario (Special Summon sacrificando il bersaglio equipaggiato) |
| 486 | Teschio Evocato Toon | sceglie da solo il Tributo (primo trovato), nessuna scelta UI |
| 498 | Cerchio degli Inferi | manca la clausola ricorrente di Standby Phase (richiede un aggancio "lascia il campo" trasversale non esistente) |
| 600 | Trappola Fasulla | protegge solo il primo bersaglio in un effetto che ne distrugge più di uno insieme |
| 636 | Campo di Riryoku | nega qualunque Magia avversaria, non solo quelle a bersaglio singolo (motore non traccia il conteggio bersagli) |
| 652 | La Perla del Drago | nega qualunque Trappola avversaria, non solo quelle su mostri Drago |
| 689 | Scudo Magico Tipo-8 | manca la prima clausola/la scelta tra le due modalità |
| 737 | Mago Apprendista | Segnalini Magia limitati alle 2 carte che già li usano (734, 751), non generico |
| 770 | Drenaggio Magico | l'avversario non può mai scartare una Magia per annullarla (annulla sempre) |
| 781 | Roc dalla Valle della Foschia | lo scarto-come-costo di altre carte resta scritto a mano singolarmente, nessun aggancio condiviso |
| 808 | Uovo Giurassico Miracoloso | manca "non può essere bandita finché scoperta sul Terreno" |

**B) Già implementate per intero — la nota è solo un promemoria che il
checkpoint di targeting condiviso (`ctx.declareTarget`, `duel-engine.js`,
nato per id 115) copre 64/818 carte, non l'intero dataset. Non serve
tornarci a meno di trovare in futuro una carta specifica non coperta:**
115 (Gran Scudo Gardna), 235 (Specchietto della Fata), 353 (Signore
dei D.), 622 (Spostamento), 661 (Mietitore Spirituale), 738 (Mago
Comando del Caos), 761 (Criosfinge — 19/818 carte "torna in mano"
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
