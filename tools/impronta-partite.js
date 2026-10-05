#!/usr/bin/env node
/**
 * impronta-partite.js — 60 partite IA contro IA a seme fisso, in un file.
 * =====================================================================
 * Per i refactor che NON devono cambiare il gioco: si prende l'impronta
 * prima, si fa la modifica, si prende l'impronta dopo, e le due devono
 * coincidere riga per riga. Ogni riga è una partita: esito, turno finale,
 * Life Points, numero di passi dell'orologio virtuale e le ultime righe del
 * registro. Gira sul duello senza testa (tools/duello-senza-testa.js), in
 * Node, in meno di un minuto.
 *
 * È la gemella di tools/impronta-funzioni.js: quella prova che il CODICE
 * spostato è identico, questa che il COMPORTAMENTO non è cambiato.
 *
 * Uso:
 *   node tools/impronta-partite.js prima.txt
 *   ... la modifica ...
 *   node tools/impronta-partite.js dopo.txt
 *   (poi confrontare i due file)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { giocaPartita } = require(path.join(__dirname, 'duello-senza-testa.js'));

// Coppie di personaggi diverse per mazzo e stile, a livelli diversi.
const COPPIE = [
    ['kaiba', 'yamiYugi', 'hard'],
    ['pegasus', 'joey', 'medium'],
    ['marik', 'ishizu', 'hard'],
    ['mai', 'weevil', 'medium'],
    ['bandit_keith', 'bakura', 'hard'],
    ['espaRoba', 'yugiMuto', 'easy']
];
const PARTITE_PER_COPPIA = 10;
const SEME = 4000;

(async () => {
    const destinazione = process.argv[2];
    if (!destinazione) {
        console.error('Uso: node tools/impronta-partite.js <file di uscita>');
        process.exit(1);
    }
    const righe = [];
    for (const [avversario, giocatore, livello] of COPPIE) {
        for (let n = 0; n < PARTITE_PER_COPPIA; n++) {
            const r = await giocaPartita({ avversario, giocatore, livello, seme: SEME, turni: 60 }, n);
            righe.push(`${avversario}/${giocatore}/${livello}#${n}: ${r.esito} t${r.turno} ${r.lpG}/${r.lpB} p${r.passi} | ${r.log.slice(-3).join(' / ')}`);
        }
    }
    fs.writeFileSync(destinazione, righe.join('\n'));
    console.log(`Impronta di ${righe.length} partite scritta in ${destinazione}`);
})();
