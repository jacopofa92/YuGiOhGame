#!/usr/bin/env node
/**
 * Audit dei deck AVVERSARI della serie anime principale.
 *
 * Lo scopo non è far convergere tutti i personaggi sulla stessa percentuale:
 * Rex deve continuare a sembrare Rex e Ishizu deve continuare a giocare come
 * Ishizu. La matrice serve invece a scoprire tre problemi misurabili:
 *   1. Facile/Medio/Difficile senza una progressione percepibile;
 *   2. un piano caratteristico che l'IA possiede ma non sa eseguire;
 *   3. un deck che funziona solo contro uno specifico avversario campione.
 *
 * Ogni personaggio affronta gli stessi cinque deck, pilotati sempre da Hard,
 * con gli stessi semi ai tre livelli. I quattro audit già conclusi restano
 * fuori dal default (Yami Yugi, Kaiba, Pegasus e Marik), ma si possono
 * richiedere esplicitamente con --duellanti.
 *
 * Esempi:
 *   node tools/audit-duellanti-main.js --gruppo regno --partite 50
 *   node tools/audit-duellanti-main.js --duellanti joey,mai,bakura --partite 20
 *   node tools/audit-duellanti-main.js --gruppo tutti --output report.json
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { giocaPartita } = require('./duello-senza-testa.js');

const RADICE = path.join(__dirname, '..');
const LIVELLI = ['easy', 'medium', 'hard'];
const CAMPIONI = ['yamiYugi', 'joey', 'pegasus', 'mako', 'bakura'];
const GRUPPI = {
    regno: [
        'yugiMuto', 'joey', 'mai', 'bakura', 'mako', 'weevil', 'rex',
        'bandit_keith', 'panik', 'bonz', 'paradoxBrothers'
    ],
    battleCity: [
        'odion', 'ishizu', 'espaRoba', 'arkana', 'seeker', 'strings',
        'lumis', 'umbra', 'duke'
    ],
    virtuale: [
        'noah', 'gozaburo', 'gansley', 'johnson', 'nesbitt', 'crump', 'lector'
    ],
    amici: ['tristan', 'tea', 'serenity', 'solomonMuto']
};
GRUPPI.tutti = [...new Set(Object.values(GRUPPI).flat())];

function valoreArgomento(nome, fallback) {
    const indice = process.argv.indexOf('--' + nome);
    return indice >= 0 && process.argv[indice + 1] ? process.argv[indice + 1] : fallback;
}

function media(numeri) {
    return numeri.length ? numeri.reduce((somma, n) => somma + n, 0) / numeri.length : 0;
}

function percentuale(parte, totale) {
    return totale ? Number((parte * 100 / totale).toFixed(1)) : 0;
}

function leggiOpzioni() {
    const espliciti = valoreArgomento('duellanti', '');
    const gruppo = valoreArgomento('gruppo', 'tutti');
    if (!espliciti && !GRUPPI[gruppo]) {
        throw new Error(`Gruppo sconosciuto "${gruppo}". Valori: ${Object.keys(GRUPPI).join(', ')}`);
    }
    return {
        gruppo,
        duellanti: espliciti ? espliciti.split(',').map((x) => x.trim()).filter(Boolean) : GRUPPI[gruppo],
        partite: Math.max(1, Number(valoreArgomento('partite', '50')) || 50),
        turni: Math.max(20, Number(valoreArgomento('turni', '80')) || 80),
        seme: Number(valoreArgomento('seme', '91000')) || 91000,
        output: valoreArgomento('output', null)
    };
}

async function misuraDuellante(duellante, opzioni) {
    const righe = [];
    for (const livello of LIVELLI) {
        const esiti = [];
        for (let indiceCampione = 0; indiceCampione < CAMPIONI.length; indiceCampione++) {
            const giocatore = CAMPIONI[indiceCampione];
            for (let partita = 0; partita < opzioni.partite; partita++) {
                // Il seme non dipende dal livello: Easy/Medium/Hard ricevono
                // le stesse sequenze, condizione necessaria per confrontarli.
                const seme = opzioni.seme + indiceCampione * 10000 + partita;
                const risultato = await giocaPartita({
                    avversario: duellante,
                    livello,
                    giocatore,
                    livelloGiocatore: 'hard',
                    seme,
                    turni: opzioni.turni
                }, 0);
                if (risultato.erroriCarte.length || risultato.invarianti.length) {
                    throw new Error(`${duellante}/${livello}/${giocatore}/seme ${seme}: ` +
                        [...risultato.erroriCarte, ...risultato.invarianti].join(' | '));
                }
                esiti.push({ giocatore, risultato });
            }
        }
        const vittorie = esiti.filter((x) => x.risultato.esito === false).length;
        const pareggiOLimite = esiti.filter((x) => x.risultato.esito !== true && x.risultato.esito !== false).length;
        righe.push({
            duellante,
            livello,
            partite: esiti.length,
            vittorie,
            vittoriePct: percentuale(vittorie, esiti.length),
            turniMedi: Number(media(esiti.map((x) => x.risultato.turno || opzioni.turni)).toFixed(1)),
            nonFinite: pareggiOLimite,
            perCampione: Object.fromEntries(CAMPIONI.map((id) => {
                const casi = esiti.filter((x) => x.giocatore === id);
                return [id, percentuale(casi.filter((x) => x.risultato.esito === false).length, casi.length)];
            }))
        });
    }
    return righe;
}

async function eseguiAudit(opzioni) {
    const risultati = [];
    for (let i = 0; i < opzioni.duellanti.length; i++) {
        const duellante = opzioni.duellanti[i];
        process.stdout.write(`[${i + 1}/${opzioni.duellanti.length}] ${duellante}... `);
        const righe = await misuraDuellante(duellante, opzioni);
        risultati.push(...righe);
        console.log(righe.map((r) => `${r.livello} ${r.vittoriePct}%`).join(' | '));
    }
    const analisi = opzioni.duellanti.map((duellante) => {
        const righe = risultati.filter((r) => r.duellante === duellante);
        const percentuali = Object.fromEntries(righe.map((r) => [r.livello, r.vittoriePct]));
        return {
            duellante,
            ...percentuali,
            monotono: percentuali.easy <= percentuali.medium && percentuali.medium <= percentuali.hard,
            saltoEasyMedium: Number((percentuali.medium - percentuali.easy).toFixed(1)),
            saltoMediumHard: Number((percentuali.hard - percentuali.medium).toFixed(1))
        };
    });
    return {
        generatoIl: new Date().toISOString(),
        metodo: 'cinque personaggi campione con IA Hard; stessi semi ai tre livelli; vittoria = esito del posto bot',
        opzioni,
        campioni: CAMPIONI,
        risultati,
        analisi
    };
}

async function main() {
    const opzioni = leggiOpzioni();
    const report = await eseguiAudit(opzioni);
    console.table(report.analisi);
    if (opzioni.output) {
        const destinazione = path.resolve(RADICE, opzioni.output);
        fs.writeFileSync(destinazione, JSON.stringify(report, null, 2) + '\n', 'utf8');
        console.log(`Report scritto in ${destinazione}`);
    }
}

if (require.main === module) main().catch((errore) => {
    console.error(errore.stack || errore);
    process.exit(1);
});

module.exports = { GRUPPI, CAMPIONI, misuraDuellante, eseguiAudit };
