// @ts-check
/**
 * porta-ui.js — l'unico punto da cui le REGOLE del duello toccano la pagina.
 * =====================================================================
 * Nucleo senza testa (piano di attacco, Priorità 2). I file di regola
 * (duel-engine.js, fasi.js, battaglia.js, evocazioni.js, bot.js) cercavano
 * nella pagina gli elementi a cui appendere un'animazione: la carta che
 * attacca, la casella appena occupata, la mano, il riquadro dei Life
 * Points. Lo facevano chiamando `document` direttamente, e quindi non
 * potevano girare fuori da un browser.
 *
 * Ora chiedono a questa porta. Nel browser fa ESATTAMENTE la stessa
 * ricerca di prima (stesso selettore, stesso risultato: le funzioni sono
 * involucri sottili di querySelector/querySelectorAll/getElementById), in
 * Node — dove `document` non esiste — risponde "nessun elemento", e ogni
 * chiamante già sa cosa fare con un elemento mancante: salta l'animazione
 * (tutti controllano il risultato prima di usarlo, perché anche nel
 * browser una carta può non essere ancora disegnata).
 *
 * Regola per il codice futuro: un file di regola non scrive mai
 * `document.`; usa PortaUI. Lo sorveglia tests/specs/guardrail-nucleo-senza-dom.spec.js.
 */
(function () {
    'use strict';

    const inBrowser = typeof document !== 'undefined';

    /** @type {ReadonlyArray<any>} — risultato vuoto in Node: si può iterare con forEach e indicizzare come una NodeList. */
    const NESSUNO = Object.freeze([]);

    const PortaUI = {
        /** Vero quando c'è una pagina da aggiornare (falso in Node). */
        presente: inBrowser,

        /**
         * document.querySelector, o null senza pagina.
         * @param {string} selettore
         * @returns {any}
         */
        query(selettore) {
            return inBrowser ? document.querySelector(selettore) : null;
        },

        /**
         * document.querySelectorAll, o un elenco vuoto senza pagina.
         * @param {string} selettore
         * @returns {any}
         */
        queryAll(selettore) {
            return inBrowser ? document.querySelectorAll(selettore) : NESSUNO;
        },

        /**
         * document.getElementById, o null senza pagina.
         * @param {string} id
         * @returns {any}
         */
        byId(id) {
            return inBrowser ? document.getElementById(id) : null;
        }
    };

    /** @type {any} */ (globalThis).PortaUI = PortaUI;
})();
