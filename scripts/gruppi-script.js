/**
 * gruppi-script.js — l'UNICA lista dei gruppi di <script> che più pagine
 * caricano insieme.
 * =====================================================================
 * Le pagine di questo progetto non hanno bundler: ogni pagina ripete a
 * mano i propri <script src>. Un caricatore a runtime è stato scartato
 * (vedi tests/specs/guardrail-script-delle-pagine.spec.js): gli script
 * iniettati partirebbero DOPO gli <script> inline che li usano subito.
 * Restano quindi tag statici, ma generati: si modifica un gruppo QUI,
 * poi `node scripts/sync-script-groups.js` lo riscrive in ogni pagina fra
 * i due marcatori
 *
 *     <!-- gruppo-script:NOME -->  ...  <!-- /gruppo-script:NOME -->
 *
 * o, dentro un array JavaScript (la vista Cartoteca di index.html, che lo
 * carica a richiesta, e APP_SHELL di sw.js),
 *
 *     // gruppo-script:NOME  ...  // /gruppo-script:NOME
 *
 * Un controllo (pre-commit e tests/specs/guardrail-gruppi-script.spec.js)
 * ferma un commit in cui una pagina non è allineata a questa lista.
 *
 * L'ORDINE conta: è quello in cui i file vengono caricati.
 */
'use strict';

module.exports = {
    // Il motore del duello e gli effetti delle carte. card-effects.js
    // (helper condivisi) va prima delle sue 8 parti, duel-engine.js prima
    // di tutto il resto. Un file nuovo del nucleo si aggiunge qui.
    motore: [
        'js/engine/duel-engine.js',
        'js/engine/effect-templates.js',
        'js/engine/card-effects.js',
        'js/engine/card-effects-1.js',
        'js/engine/card-effects-2.js',
        'js/engine/card-effects-3.js',
        'js/engine/card-effects-4.js',
        'js/engine/card-effects-5.js',
        'js/engine/card-effects-6.js',
        'js/engine/card-effects-7.js',
        'js/engine/card-effects-8.js'
    ]
};
