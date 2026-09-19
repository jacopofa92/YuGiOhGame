# Test di regressione

Prima di questa cartella, ogni verifica del motore veniva fatta con
script Playwright temporanei scritti in una cartella scratch — utili nel
momento, ma persi a fine sessione: nessuna protezione reale contro una
futura modifica che rompe silenziosamente qualcosa già corretto.

## Uso

```bash
npm install   # una volta sola — riusa i binari Chromium già in cache se presenti
npm test      # esegue tutti i test in tests/specs/*.spec.js
```

Uscita 0 se tutti passano, 1 se anche un solo test fallisce (adatto a un
hook pre-commit o a una pipeline CI in futuro).

## Struttura

- `tests/helpers/harness.js` — apertura pagina/duello condivisa
  (`openDuel`), congelamento del ciclo di turno autonomo per i test che
  manipolano `gameState` direttamente (`freezeNaturalGameLoop`), e
  `assert(condizione, messaggio)` — un test FALLISCE con un messaggio
  chiaro se la condizione è falsa, non si limita a stampare un JSON da
  confrontare a occhio.
- `tests/specs/*.spec.js` — un file per meccanismo/carta testata. Ognuno
  esporta `{ name, run(t), freeze?, url? }` — vedi i file esistenti come
  esempio prima di aggiungerne uno nuovo.
- `tests/helpers/local-servers.js` — un server statico sopra la cartella
  del progetto e il server di stanze (`server/server.js`) come vero
  sottoprocesso, entrambi su porte assegnate dal sistema. Servono ai test
  che non possono girare su `file://`: oggi solo il Multiplayer, perché
  `mp-lobby.js` carica l'arena con `fetch('duelMonstersCore.html')` e una
  fetch su `file://` è bloccata dal browser.
- `tests/run-all.js` — scopre ed esegue ogni spec in una pagina Chromium
  isolata (una per test, così lo stato sporco lasciato da uno non
  contamina il successivo), stampa un riepilogo.

## Scrivere un nuovo test

```js
module.exports = {
    name: 'Descrizione leggibile di cosa verifica',
    // freeze: false,  // solo se il test vuole il ciclo di turno naturale
    // url: '?mode=free&character=kaiba',  // solo per varianti come Duello Libero
    async run(t) {
        const risultato = await t.evaluate(() => {
            // codice eseguito DENTRO la pagina — stesso ambiente di gioco vero
            return qualcosa;
        });
        t.assert(risultato === atteso, 'messaggio chiaro se fallisce');
    }
};
```

### Uno spec che ha bisogno di più di una pagina

`standalone: true` cambia il contratto: lo spec NON riceve una pagina già
aperta sul duello, riceve `{ browser, assert }` e se la costruisce da sé
— e chiude lui ciò che apre. Serve a chi ha bisogno di due client
insieme, o di un server proprio: oggi i tre spec del Multiplayer —
`multiplayer-end-to-end.spec.js`, che avvia il server di stanze vero e fa
giocare due pagine l'una contro l'altra;
`multiplayer-lobby-abbandono.spec.js`, che resta prima del duello e
verifica cosa succede in sala d'attesa quando uno dei due se ne va; e
`multiplayer-tributi.spec.js`, sui tre modi di sacrificare una carta come
Tributo (ognuno vuole un campo preparato a mano e una fase diversa, per
questo sta a parte dal duello end-to-end); e
`multiplayer-mosse-non-trasmesse.spec.js`, sulle mosse che cambiano lo
stato pubblico senza che l'avversario ne sapesse nulla (Magia giocata
dalla mano, Special Summon dalla propria mano, scarto per il limite di 6
carte) più il turno dopo un resync; e `multiplayer-partita-turni.spec.js`,
che fa passare il turno più volte e combattere due mostri — l'unico che
guarda pescate, cambio Posizione, Life Point e la finestra di risposta
del difensore; e `multiplayer-scelte-effetti.spec.js`, che verifica che un
effetto con un bersaglio a scelta colpisca la STESSA carta sui due
schermi.

Negli spec del Multiplayer, oltre all'effetto visibile conviene sempre
misurare anche che chi riceve non chieda un **resync**: il motore si
riallinea da sé quando i due checksum divergono, quindi un bug di
protocollo che si ripara da solo resta invisibile a un test che guarda
solo lo stato finale. Due dei tre bug chiusi da `multiplayer-tributi`
erano esattamente così.

```js
module.exports = {
    name: '...',
    standalone: true,
    async run({ browser, assert }) { /* ... */ }
};
```

## Flakiness nota

Ogni tanto (raro, non ad ogni esecuzione) un singolo test può fallire per
puro timing del browser headless sotto carico, non per un bug reale —
già osservato più volte in questa sessione con la stessa identica
combinazione di test, e sempre passato pulito rilanciando la suite
subito dopo senza toccare nulla. Se un test fallisce da solo, isolato,
la prima cosa da fare è rilanciare `npm test` una volta prima di mettersi
a caccia di un bug vero.

## Un'insidia reale già presa in questa suite

`resolveChain()` (duel-engine.js) è asincrona: ogni link della Chain
aspetta ~2s reali (il pulse di attivazione) prima di risolversi. Questo
dà al ciclo di turno autonomo della pagina (già avviato dal solo
caricamento di `duelMonstersCore.html`) il tempo reale di continuare a girare
IN PARALLELO alle manipolazioni dirette di `gameState` fatte da un test
— può arrivare a "rubare" carte finte lasciate in campi condivisi da un
test precedente, corrompendo lo stack `gameState.chain.links` condiviso.
`freezeNaturalGameLoop()` esiste apposta per questo (chiamata in
automatico da `run-all.js` per ogni test, a meno di `freeze: false`) —
ma **congela solo le DECISIONI autonome del bot** (`botTurn`,
`attemptBotSummon`, `botPerformAttacks`, `changeTurn`), mai le funzioni
di transizione fase (`enterDrawPhase`, `enterMainPhase2`,
`handlePhaseStepperClick`...): quelle sono l'unico modo legittimo con
cui i test stessi avanzano fase quando serve, e sovrascriverle come
no-op le rende inerti anche per un test che le chiama di proposito
(bug reale trovato scrivendo questa stessa suite — vedi il commento in
`tests/helpers/harness.js`).
