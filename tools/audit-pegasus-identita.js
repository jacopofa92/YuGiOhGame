#!/usr/bin/env node
/**
 * Misura se Pegasus avversario esegue davvero i suoi due piani narrativi.
 *
 * Il normale audit dei Duellanti misura la forza. Questo conta invece, a
 * parità di semi, l'attivazione di Mondo dei Toon e gli assorbimenti di
 * Abbandonato/Restrizione dai Mille Occhi. Il campione Pegasus è escluso:
 * in uno specchio non potremmo attribuire con certezza gli assorbimenti al
 * bot soltanto leggendo il registro condiviso del duello.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { giocaPartita } = require('./duello-senza-testa.js');

const LIVELLI = ['easy', 'medium', 'hard'];
const CAMPIONI = ['yamiYugi', 'joey', 'mako', 'bakura'];
const SEGNALI = {
    mondoToon: 'Il bot ha attivato Mondo dei Toon',
    abbandonato: 'Abbandonato assorbe',
    milleOcchi: 'Restrizione dai Mille Occhi equipaggia'
};

function argomento(nome, fallback) {
    const indice = process.argv.indexOf('--' + nome);
    return indice >= 0 && process.argv[indice + 1] ? process.argv[indice + 1] : fallback;
}

function percentuale(parte, totale) {
    return totale ? Number((parte * 100 / totale).toFixed(1)) : 0;
}

async function main() {
    const partite = Math.max(1, Number(argomento('partite', '50')) || 50);
    const turni = Math.max(20, Number(argomento('turni', '80')) || 80);
    const semeBase = Number(argomento('seme', '91000')) || 91000;
    const output = argomento('output', 'PEGASUS_OPPONENT_IDENTITY_AUDIT.json');
    const risultati = [];

    for (const livello of LIVELLI) {
        const totale = CAMPIONI.length * partite;
        const duelliConSegnale = Object.fromEntries(Object.keys(SEGNALI).map((chiave) => [chiave, 0]));
        const occorrenze = Object.fromEntries(Object.keys(SEGNALI).map((chiave) => [chiave, 0]));
        process.stdout.write(`${livello}... `);
        for (let indiceCampione = 0; indiceCampione < CAMPIONI.length; indiceCampione++) {
            for (let partita = 0; partita < partite; partita++) {
                const risultato = await giocaPartita({
                    avversario: 'pegasus',
                    livello,
                    giocatore: CAMPIONI[indiceCampione],
                    livelloGiocatore: 'hard',
                    seme: semeBase + indiceCampione * 10000 + partita,
                    turni,
                    cercaTutte: Object.values(SEGNALI)
                }, 0);
                if (risultato.erroriCarte.length || risultato.invarianti.length) {
                    throw new Error(`${livello}/${CAMPIONI[indiceCampione]}/${risultato.seme}: ` +
                        [...risultato.erroriCarte, ...risultato.invarianti].join(' | '));
                }
                for (const [chiave, testo] of Object.entries(SEGNALI)) {
                    const conteggio = risultato.trovatePerTesto[testo] || 0;
                    occorrenze[chiave] += conteggio;
                    if (conteggio > 0) duelliConSegnale[chiave]++;
                }
            }
        }
        const riga = {
            livello,
            duelli: totale,
            duelliConSegnale,
            percentualeDuelli: Object.fromEntries(Object.keys(SEGNALI).map((chiave) => [
                chiave, percentuale(duelliConSegnale[chiave], totale)
            ])),
            occorrenze
        };
        risultati.push(riga);
        console.log(Object.entries(riga.percentualeDuelli).map(([k, v]) => `${k} ${v}%`).join(' | '));
    }

    const report = {
        generatoIl: new Date().toISOString(),
        metodo: 'quattro avversari non-Pegasus con IA Hard; conteggio dei segnali nel registro completo',
        opzioni: { partite, turni, seme: semeBase },
        campioni: CAMPIONI,
        segnali: SEGNALI,
        risultati
    };
    fs.writeFileSync(path.resolve(__dirname, '..', output), JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`Report scritto in ${output}`);
}

if (require.main === module) main().catch((errore) => {
    console.error(errore.stack || errore);
    process.exit(1);
});

