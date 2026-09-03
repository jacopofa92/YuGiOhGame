// tests/helpers/harness.js
// =====================================================================
// Piccolo harness condiviso da ogni file *.spec.js in tests/specs/, così
// nessuno di loro deve reimplementare da zero "apri la pagina, salta
// l'intro, aspetta che il motore sia vivo" — lo stesso preambolo che
// prima veniva riscritto a mano in ogni script Playwright temporaneo
// nella cartella scratch (mai versionato, quindi perso a fine sessione).
//
// Un file .spec.js esporta una funzione async che riceve un oggetto `t`
// con: `t.page` (la pagina Playwright già pronta), `t.assert(cond, msg)`
// (lancia un errore leggibile se `cond` è falso — questo È il test:
// fallisce con un messaggio chiaro invece di limitarsi a stampare un
// JSON che va confrontato a occhio), `t.evaluate(fn, ...args)` (scorciatoia
// per `page.evaluate`). Vedi tests/specs/*.spec.js per esempi concreti,
// e tests/run-all.js per come vengono scoperti ed eseguiti.
// =====================================================================
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const GAME_URL = 'file:///' + path.join(PROJECT_ROOT, 'duelMonstersCore.html').split(path.sep).join('/');

/**
 * Apre duelMonstersCore.html su `page`, salta l'eventuale intro, e aspetta che
 * il motore (gameState/DuelEngine/CardEffects) sia realmente pronto —
 * non un timeout fisso indovinato a caso, ma un vero waitForFunction.
 * `urlOverride` (opzionale, es. `?mode=free&character=kaiba`) sostituisce
 * l'URL di default — usato dai test su Duello Libero/altre modalità che
 * si selezionano dalla query string.
 */
async function openDuel(page, urlOverride) {
    await page.goto(urlOverride ? GAME_URL + urlOverride : GAME_URL, { waitUntil: 'load' });
    try {
        await page.click('.di-skip', { timeout: 5000 });
    } catch (e) {
        // Nessun prompt di intro da saltare (o già oltre) — non è un errore.
    }
    await page.waitForFunction(
        () => typeof gameState !== 'undefined' && typeof DuelEngine !== 'undefined' && typeof CardEffects !== 'undefined',
        { timeout: 20000 }
    );
    // NESSUNA attesa qui prima di tornare: ogni millisecondo in più lascia
    // al ciclo di turno naturale della demo (già avviato dalla pagina) il
    // tempo di correre — run-all.js chiama freezeNaturalGameLoop() SUBITO
    // dopo, il prima possibile, non dopo un'attesa. Uno spec che ha
    // davvero bisogno di lasciar completare la sequenza naturale (es.
    // duello-libero-smoke.spec.js, con freeze:false) aspetta lui stesso,
    // esplicitamente, dopo aver disattivato il freeze.
}

/**
 * Ferma il ciclo di turno autonomo della pagina (bot/avanzamento fase)
 * per i test che manipolano gameState direttamente, chiamando funzioni
 * interne del motore fuori dal normale flusso a turni — senza questo,
 * il ciclo naturale della demo può continuare a girare IN PARALLELO
 * (soprattutto ora che la risoluzione della Chain è asincrona, vedi
 * resolveChain in duel-engine.js) e interferire con lo stato che il test
 * sta manipolando. Vedi la correzione reale che questo esatto problema
 * ha richiesto in tests/specs/chain-resolution.spec.js per il perché.
 */
async function freezeNaturalGameLoop(page) {
    await page.evaluate(() => {
        // clearPhaseTransitionTimeout() (game-flow.js) annulla il VERO
        // setTimeout già in coda dalla sequenza di apertura naturale della
        // pagina — ogni passo della cascata (enterDrawPhase -> ... ->
        // changeTurn) lo richiama già da sé all'inizio come primo gesto,
        // quindi interromperla UNA volta qui basta: nessun passo
        // successivo può ripartire da solo.
        if (typeof clearPhaseTransitionTimeout === 'function') clearPhaseTransitionTimeout();
        // Neutralizza SOLO le decisioni AUTONOME del bot (cosa fare di
        // propria iniziativa), MAI le funzioni di transizione fase
        // (enterDrawPhase/enterMainPhase1/ecc. o handlePhaseStepperClick
        // stesso) — quelle sono l'unico modo legittimo con cui i test
        // stessi avanzano fase quando serve davvero. Bug reale trovato
        // proprio scrivendo questa suite: sovrascriverle come no-op faceva
        // sì che handlePhaseStepperClick('main2') superasse ogni controllo
        // ma poi non cambiasse mai davvero gameState.phase, perché la
        // funzione che l'avrebbe fatto era stata resa inerte qui.
        window.botTurn = function () {};
        window.attemptBotSummon = function () { return Promise.resolve(); };
        window.botPerformAttacks = async function () {};
        window.changeTurn = function () {};
        // NIENTE gameState.gameOver = true qui: è un interruttore troppo
        // grezzo — non ferma solo il ciclo naturale, disattiva anche
        // meccaniche vere che molti test devono esercitare (es.
        // resolveAttack in actions.js controlla proprio questo flag e si
        // rifiuta di risolvere una battaglia se true).
    });
}

/** Lanciata da t.assert(...) quando la condizione è falsa — un vero fallimento di test, non solo un log. */
class AssertionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AssertionError';
    }
}

function makeAssert() {
    return function assert(condition, message) {
        if (!condition) {
            throw new AssertionError(message || 'Asserzione fallita');
        }
    };
}

module.exports = { openDuel, freezeNaturalGameLoop, makeAssert, AssertionError, GAME_URL, PROJECT_ROOT };
