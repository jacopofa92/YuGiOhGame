// @ts-check
/**
 * casuale.js — la casualità di GIOCO (mescolare, scartare a caso, uid).
 * =====================================================================
 * Priorità 3 del piano, Multiplayer "a passo comune": i due telefoni
 * eseguono l'intera partita ciascuno per conto suo e devono arrivare allo
 * stesso stato. Un mescolamento o uno scarto a caso devono quindi uscire
 * UGUALI sui due client — non con Math.random, che ognuno tira a modo suo.
 *
 * Fuori dal Multiplayer non cambia niente: Casuale.random() è
 * Math.random(), con tutte le sue proprietà (imprevedibile, e nel duello
 * senza testa già sostituito da un generatore con seme).
 * In Multiplayer, all'avvio del duello, i due client ricevono lo stesso
 * seme (Casuale.semina) e da lì in poi tirano dallo stesso generatore,
 * nello stesso ordine — l'ordine è garantito dal passo comune stesso.
 *
 * Solo per le REGOLE. Un effetto visivo (particelle, scosse) continua a
 * usare Math.random: se tirasse da qui, un client con più effetti accesi
 * dell'altro consumerebbe numeri in più e le due partite si separerebbero.
 */
(function () {
    'use strict';

    /** @type {null | (() => number)} */
    let generatore = null;

    /** mulberry32: piccolo, veloce, con seme a 32 bit. */
    function mulberry32(seme) {
        let s = seme >>> 0;
        return function () {
            s = (s + 0x6D2B79F5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    const Casuale = {
        /** Un numero in [0, 1): dal seme condiviso se c'è, altrimenti Math.random. */
        random() {
            return generatore ? generatore() : Math.random();
        },

        /**
         * Un intero in [0, n).
         * @param {number} n
         */
        intero(n) {
            return Math.floor(Casuale.random() * n);
        },

        /**
         * Mescola sul posto (Fisher-Yates) e restituisce lo stesso array.
         * @template T
         * @param {T[]} elenco
         * @returns {T[]}
         */
        mescola(elenco) {
            for (let i = elenco.length - 1; i > 0; i--) {
                const j = Casuale.intero(i + 1);
                const t = elenco[i];
                elenco[i] = elenco[j];
                elenco[j] = t;
            }
            return elenco;
        },

        /**
         * Da qui in poi, la casualità di gioco esce dal seme (Multiplayer).
         * @param {number} seme
         */
        semina(seme) {
            generatore = mulberry32(seme);
        },

        /** Torna a Math.random (fine del duello, o duello offline). */
        libera() {
            generatore = null;
        },

        /** Vero mentre la casualità esce da un seme condiviso. */
        condivisa() {
            return generatore !== null;
        }
    };

    /** @type {any} */ (globalThis).Casuale = Casuale;
})();
