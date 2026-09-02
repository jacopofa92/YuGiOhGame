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
caricamento di `yugioh_game.html`) il tempo reale di continuare a girare
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
